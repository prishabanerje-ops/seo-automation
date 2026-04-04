const express = require("express");
const { sendSlack, buildCrawlSummaryMessage } = require("../services/slack.service");
const { sendReport, testEmail } = require("../services/email.service");
const { getDb } = require("../db/sqlite");

const router = express.Router();

// POST /api/notify/slack/test
router.post("/slack/test", async (req, res) => {
  try {
    await sendSlack("SEO Automation Dashboard: test notification ✓");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notify/slack/:siteId — send crawl summary
router.post("/slack/:siteId", async (req, res) => {
  const db = getDb();
  const site = db.prepare("SELECT * FROM sites WHERE id = ?").get(req.params.siteId);
  if (!site) return res.status(404).json({ error: "Site not found" });
  const job = db
    .prepare("SELECT * FROM crawl_jobs WHERE site_id = ? AND status = 'completed' ORDER BY completed_at DESC LIMIT 1")
    .get(req.params.siteId);
  if (!job) return res.status(404).json({ error: "No completed crawl found" });

  const countRows = db
    .prepare("SELECT severity, COUNT(*) as c FROM audit_results WHERE crawl_job_id = ? AND severity != 'ok' GROUP BY severity")
    .all(job.id);
  const issueCounts = countRows.reduce((acc, r) => { acc[r.severity] = r.c; return acc; }, {});

  try {
    await sendSlack(buildCrawlSummaryMessage(site, job, issueCounts));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notify/email/test
router.post("/email/test", async (req, res) => {
  try {
    await testEmail();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notify/email/:siteId
router.post("/email/:siteId", async (req, res) => {
  const db = getDb();
  const site = db.prepare("SELECT * FROM sites WHERE id = ?").get(req.params.siteId);
  if (!site) return res.status(404).json({ error: "Site not found" });

  const job = db
    .prepare("SELECT * FROM crawl_jobs WHERE site_id = ? AND status = 'completed' ORDER BY completed_at DESC LIMIT 1")
    .get(req.params.siteId);
  if (!job) return res.status(404).json({ error: "No completed crawl found" });

  const countRows = db
    .prepare("SELECT severity, COUNT(*) as c FROM audit_results WHERE crawl_job_id = ? AND severity != 'ok' GROUP BY severity")
    .all(job.id);
  const issueCounts = countRows.reduce((acc, r) => { acc[r.severity] = r.c; return acc; }, {});

  try {
    await sendReport(site, job, issueCounts);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
