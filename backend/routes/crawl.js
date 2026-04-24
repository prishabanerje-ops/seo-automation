const express = require("express");
const path = require("path");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const { getDb } = require("../db/sqlite");
const { parseAndStore } = require("../services/sf-parser.service");

const router = express.Router();

function getIo(req) { return req.app.locals.io; }

// POST /api/crawl/start
router.post("/start", (req, res) => {
  let { siteIds, targetUrl, crawlName, mode = "spider", sfConfig = {}, urlList = [] } = req.body;

  // Free-form URL input: derive a siteId from the hostname
  if (targetUrl && !siteIds) {
    try {
      const hostname = new URL(targetUrl).hostname.replace(/[^a-z0-9]/gi, "-").toLowerCase();
      siteIds = [hostname];
    } catch {
      return res.status(400).json({ error: "Invalid targetUrl" });
    }
  }

  if (!Array.isArray(siteIds) || siteIds.length === 0) {
    return res.status(400).json({ error: "targetUrl or siteIds required" });
  }

  const { startCrawl } = require("../services/sf-cli.service");
  const io = getIo(req);
  const jobs = startCrawl(siteIds, io, { mode, sfConfig, urlList, targetUrl, crawlName });
  res.json({ jobs });
});

// GET /api/crawl/active — returns all in-memory running jobs (for page-refresh recovery)
router.get("/active", (req, res) => {
  const { getJobMeta } = require("../services/sf-cli.service");
  const meta = getJobMeta();
  const jobs = [];
  for (const [jobId, m] of meta.entries()) {
    const row = getDb().prepare("SELECT status, progress FROM crawl_jobs WHERE id = ?").get(jobId);
    jobs.push({ jobId, siteId: m.siteId, label: m.label, url: m.url, status: row?.status ?? "running", progress: row?.progress ?? 0 });
  }
  res.json({ jobs });
});

// GET /api/crawl/logs/:jobId — replay buffered logs for a job
router.get("/logs/:jobId", (req, res) => {
  const { getJobMeta } = require("../services/sf-cli.service");
  const meta = getJobMeta().get(req.params.jobId);
  if (!meta) return res.json({ logs: [] });
  res.json({ logs: meta.logs });
});

// GET /api/crawl/urls/:jobId — return parsed rows from internal_all.csv for SF Desktop display
router.get("/urls/:jobId", (req, res) => {
  const fs = require("fs");
  const { parse } = require("csv-parse/sync");
  const db = getDb();
  const job = db.prepare("SELECT site_id FROM crawl_jobs WHERE id = ?").get(req.params.jobId);
  if (!job) return res.json({ rows: [] });

  const outputDir = path.resolve(__dirname, "../exports", job.site_id);
  const csvPath = path.join(outputDir, "internal_all.csv");
  if (!fs.existsSync(csvPath)) return res.json({ rows: [] });

  let raw;
  try { raw = fs.readFileSync(csvPath, "utf8"); } catch { return res.json({ rows: [] }); }

  let parsed;
  try { parsed = parse(raw, { columns: true, skip_empty_lines: true, bom: true }); } catch { return res.json({ rows: [] }); }

  const rows = parsed.map(r => ({
    url:          r["Address"]                   ?? "",
    contentType:  (r["Content Type"] ?? "").split(";")[0].trim(),
    status:       parseInt(r["Status Code"])     || 0,
    statusText:   r["Status"]                    ?? "",
    indexability: r["Indexability"]              ?? "",
    title:        r["Title 1"]                   ?? "",
    titleLen:     parseInt(r["Title 1 Length"])  || 0,
    metaDesc:     r["Meta Description 1"]        ?? "",
    metaDescLen:  parseInt(r["Meta Description 1 Length"]) || 0,
    h1:           r["H1-1"]                      ?? "",
    h1Len:        parseInt(r["H1-1 Length"])     || 0,
    h2:           r["H2-1"]                      ?? "",
    wordCount:    parseInt(r["Word Count"])      || 0,
    depth:        parseInt(r["Crawl Depth"])     || 0,
    inlinks:      parseInt(r["Unique Links In"]) || parseInt(r["Links In"]) || 0,
    outlinks:     parseInt(r["Unique Links Out"])|| parseInt(r["Links Out"])|| 0,
    responseTime: parseInt(r["Response Time"])   || 0,
    size:         parseInt(r["Size"])            || 0,
  }));

  res.json({ rows });
});

// GET /api/crawl/status/:jobId
router.get("/status/:jobId", (req, res) => {
  const job = getDb().prepare("SELECT * FROM crawl_jobs WHERE id = ?").get(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json(job);
});

// DELETE /api/crawl/cancel/:jobId
router.delete("/cancel/:jobId", (req, res) => {
  const { cancelCrawl } = require("../services/sf-cli.service");
  const cancelled = cancelCrawl(req.params.jobId);
  if (!cancelled) return res.status(404).json({ error: "Job not found or already finished" });
  res.json({ ok: true });
});

// POST /api/crawl/import
const upload = multer({ dest: path.resolve(__dirname, "../exports/uploads") });
router.post("/import", upload.fields([{ name: "csvFiles", maxCount: 20 }]), async (req, res) => {
  const { siteId } = req.body;
  if (!siteId) return res.status(400).json({ error: "siteId required" });

  const files = req.files?.csvFiles || [];
  if (files.length === 0) return res.status(400).json({ error: "No CSV files uploaded" });

  const jobId = uuidv4();
  const db = getDb();
  db.prepare(
    "INSERT INTO crawl_jobs (id, site_id, started_at, status, mode) VALUES (?, ?, datetime('now'), 'running', 'import')"
  ).run(jobId, siteId);

  const fs = require("fs");
  const outputDir = path.resolve(__dirname, "../exports", siteId + "-import-" + jobId.slice(0, 8));
  fs.mkdirSync(outputDir, { recursive: true });

  for (const file of files) {
    fs.renameSync(file.path, path.join(outputDir, file.originalname));
  }

  try {
    const count = await parseAndStore(jobId, siteId, outputDir);
    db.prepare("UPDATE crawl_jobs SET status = 'completed', completed_at = datetime('now'), total_urls = ? WHERE id = ?")
      .run(count, jobId);
    res.json({ jobId, parsed: count });
  } catch (err) {
    db.prepare("UPDATE crawl_jobs SET status = 'failed', completed_at = datetime('now') WHERE id = ?").run(jobId);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/crawl/:jobId — delete a crawl job and all its audit results
router.delete("/:jobId", (req, res) => {
  const db = getDb();
  const job = db.prepare("SELECT id, status FROM crawl_jobs WHERE id = ?").get(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });
  if (job.status === "running")
    return res.status(400).json({ error: "Cannot delete a running job. Cancel it first." });

  db.prepare("DELETE FROM audit_results WHERE crawl_job_id = ?").run(job.id);
  db.prepare("DELETE FROM ai_suggestions WHERE crawl_job_id = ?").run(job.id);
  db.prepare("DELETE FROM crawl_jobs WHERE id = ?").run(job.id);

  res.json({ ok: true });
});

// GET /api/crawl/history
router.get("/history", (req, res) => {
  const jobs = getDb()
    .prepare("SELECT * FROM crawl_jobs ORDER BY started_at DESC LIMIT 20")
    .all();
  res.json(jobs);
});

// GET /api/crawl/history/:siteId — history for one site
router.get("/history/:siteId", (req, res) => {
  const jobs = getDb()
    .prepare("SELECT * FROM crawl_jobs WHERE site_id = ? ORDER BY started_at DESC LIMIT 10")
    .all(req.params.siteId);
  res.json(jobs);
});

module.exports = router;
