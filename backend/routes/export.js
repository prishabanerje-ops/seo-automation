const express = require("express");
const { getDb } = require("../db/sqlite");
const { pushSectionToSheets } = require("../services/sheets.service");

const router = express.Router();

// POST /api/export/sheets/:siteId — push all sections to Sheets
router.post("/sheets/:siteId", async (req, res) => {
  const { section } = req.body;
  const sections = section
    ? [section]
    : ["response-codes", "meta-tags", "headings", "images", "canonicals", "internal-links", "structured-data"];

  const results = [];
  for (const s of sections) {
    try {
      const r = await pushSectionToSheets(req.params.siteId, s);
      results.push({ section: s, ...r });
    } catch (err) {
      results.push({ section: s, error: err.message });
    }
  }

  res.json({ results });
});

// GET /api/export/csv/:siteId/:section
router.get("/csv/:siteId/:section", (req, res) => {
  const { siteId, section } = req.params;
  const db = getDb();

  const job = db
    .prepare("SELECT * FROM crawl_jobs WHERE site_id = ? AND status = 'completed' ORDER BY completed_at DESC LIMIT 1")
    .get(siteId);

  if (!job) return res.status(404).json({ error: "No completed crawl found" });

  const rows = db
    .prepare("SELECT url, severity, issue_type, data FROM audit_results WHERE crawl_job_id = ? AND section = ?")
    .all(job.id, section);

  if (rows.length === 0) return res.status(404).json({ error: "No data for this section" });

  // Build CSV
  const firstData = (() => { try { return JSON.parse(rows[0].data || "{}"); } catch { return {}; } })();
  const dataKeys = Object.keys(firstData).filter((k) => k !== "label");
  const headers = ["url", "severity", "issue_type", ...dataKeys, "issue"];

  const csvLines = [
    headers.join(","),
    ...rows.map((r) => {
      let parsed = {};
      try { parsed = JSON.parse(r.data || "{}"); } catch {}
      const vals = [r.url, r.severity, r.issue_type || "", ...dataKeys.map((k) => parsed[k] ?? ""), parsed.label || ""];
      return vals.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    })
  ];

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${siteId}-${section}-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csvLines.join("\n"));
});

module.exports = router;
