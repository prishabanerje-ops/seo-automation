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
