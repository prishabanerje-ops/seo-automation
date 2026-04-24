const express = require("express");
const { getDb } = require("../db/sqlite");

const router = express.Router();

function latestJob(siteId) {
  return getDb()
    .prepare("SELECT * FROM crawl_jobs WHERE site_id = ? AND status = 'completed' ORDER BY completed_at DESC LIMIT 1")
    .get(siteId);
}

function worstSeverity(issues) {
  const ranks = issues.map((i) => severityRank(i.severity));
  return ["ok", "info", "warning", "critical"][Math.max(...ranks)];
}

function severityRank(s) {
  return { ok: 0, info: 1, warning: 2, critical: 3 }[s] ?? 0;
}

// GET /api/reports/top-issues?limit=10 — top critical issues across all sites
router.get("/top-issues", (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const db = getDb();

  // Get latest completed job per site
  const latestJobs = db.prepare(`
    SELECT cj.id, cj.site_id, s.label as site_label, s.color as site_color
    FROM crawl_jobs cj
    JOIN sites s ON s.id = cj.site_id
    WHERE cj.status = 'completed'
    AND cj.id IN (
      SELECT id FROM crawl_jobs cj2
      WHERE cj2.site_id = cj.site_id AND cj2.status = 'completed'
      ORDER BY completed_at DESC LIMIT 1
    )
  `).all();

  if (!latestJobs.length) return res.json({ issues: [] });

  const jobIds = latestJobs.map(j => j.id);
  const jobMap = {};
  for (const j of latestJobs) jobMap[j.id] = j;

  const placeholders = jobIds.map(() => "?").join(",");
  const rows = db.prepare(`
    SELECT ar.url, ar.severity, ar.issue_type, ar.section, ar.data, ar.crawl_job_id
    FROM audit_results ar
    WHERE ar.crawl_job_id IN (${placeholders})
      AND ar.severity = 'critical'
    ORDER BY ar.section, ar.url
    LIMIT ?
  `).all(...jobIds, limit);

  const issues = rows.map(r => {
    const job = jobMap[r.crawl_job_id];
    let data = {};
    try { data = JSON.parse(r.data || "{}"); } catch {}
    return {
      url: r.url,
      severity: r.severity,
      issue_type: r.issue_type,
      section: r.section,
      site_label: job?.site_label,
      site_color: job?.site_color,
      site_id: job?.site_id,
      ...data
    };
  });

  res.json({ issues });
});

// ── IMPORTANT: Specific literal-prefix routes must come before /:siteId/:section ──

// GET /api/reports/job/:jobId — unified audit view with filters
router.get("/job/:jobId", (req, res) => {
  const { jobId } = req.params;
  const { severity, section, issue_type, q, limit = "500", offset = "0" } = req.query;
  const db = getDb();

  const job = db.prepare("SELECT * FROM crawl_jobs WHERE id = ?").get(jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });

  let sql = "SELECT url, data, severity, issue_type, section FROM audit_results WHERE crawl_job_id = ?";
  const params = [jobId];
  if (severity && severity !== "all") { sql += " AND severity = ?"; params.push(severity); }
  if (section && section !== "all")   { sql += " AND section = ?";  params.push(section); }
  if (issue_type && issue_type !== "all") { sql += " AND issue_type = ?"; params.push(issue_type); }
  if (q) { sql += " AND url LIKE ?"; params.push(`%${q}%`); }

  const countSql = sql.replace(
    "SELECT url, data, severity, issue_type, section",
    "SELECT COUNT(*) as total"
  );
  const countRow = db.prepare(countSql).get(...params);
  const total = countRow ? countRow.total : 0;

  sql += " ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 WHEN 'info' THEN 2 ELSE 3 END, section ASC, url ASC";
  sql += ` LIMIT ${Math.min(Number(limit), 1000)} OFFSET ${Math.max(Number(offset), 0)}`;

  const rows = db.prepare(sql).all(...params);
  const data = rows.map((r) => {
    let parsed = {};
    try { parsed = JSON.parse(r.data || "{}"); } catch {}
    return { url: r.url, severity: r.severity, issue_type: r.issue_type, section: r.section, ...parsed };
  });

  const summary = db
    .prepare("SELECT section, severity, COUNT(*) as count FROM audit_results WHERE crawl_job_id = ? GROUP BY section, severity")
    .all(jobId);

  const issueTypes = db
    .prepare("SELECT DISTINCT issue_type FROM audit_results WHERE crawl_job_id = ? AND issue_type IS NOT NULL AND issue_type != '' ORDER BY issue_type")
    .all(jobId)
    .map((r) => r.issue_type);

  res.json({ job, data, total, summary, issueTypes });
});

// GET /api/reports/compare-crawls/:siteId?jobA=<id>&jobB=<id>
router.get("/compare-crawls/:siteId", (req, res) => {
  const { siteId } = req.params;
  const { jobA, jobB } = req.query;
  const db = getDb();

  let jobs;
  if (jobA && jobB) {
    const a = db.prepare("SELECT * FROM crawl_jobs WHERE id = ?").get(jobA);
    const b = db.prepare("SELECT * FROM crawl_jobs WHERE id = ?").get(jobB);
    if (!a || !b) return res.status(404).json({ error: "One or both jobs not found" });
    jobs = [a, b];
  } else {
    jobs = db
      .prepare("SELECT * FROM crawl_jobs WHERE site_id = ? AND status = 'completed' ORDER BY completed_at DESC LIMIT 2")
      .all(siteId);
  }

  if (jobs.length < 2) return res.json({ error: "Need at least 2 completed crawls to compare", jobs });

  const [jobNew, jobOld] = jobs;

  function urlSeverityMap(jobId) {
    const rows = db
      .prepare("SELECT url, severity, issue_type, section FROM audit_results WHERE crawl_job_id = ? AND severity != 'ok'")
      .all(jobId);
    const map = {};
    for (const r of rows) {
      if (!map[r.url]) map[r.url] = [];
      map[r.url].push({ severity: r.severity, issue_type: r.issue_type, section: r.section });
    }
    return map;
  }

  const mapNew = urlSeverityMap(jobNew.id);
  const mapOld = urlSeverityMap(jobOld.id);
  const allUrls = new Set([...Object.keys(mapNew), ...Object.keys(mapOld)]);

  const newIssues = [], fixed = [], regressed = [], unchanged = [];

  for (const url of allUrls) {
    const inNew = mapNew[url] || [];
    const inOld = mapOld[url] || [];

    if (inOld.length === 0 && inNew.length > 0) {
      newIssues.push({ url, issues: inNew });
    } else if (inOld.length > 0 && inNew.length === 0) {
      fixed.push({ url, issues: inOld });
    } else if (inNew.length > 0 && inOld.length > 0) {
      const oldWorst = worstSeverity(inOld);
      const newWorst = worstSeverity(inNew);
      if (severityRank(newWorst) > severityRank(oldWorst)) {
        regressed.push({ url, oldIssues: inOld, newIssues: inNew });
      } else {
        unchanged.push({ url, issues: inNew });
      }
    }
  }

  function countsBySeverity(jobId) {
    return db
      .prepare("SELECT severity, COUNT(*) as c FROM audit_results WHERE crawl_job_id = ? AND severity != 'ok' GROUP BY severity")
      .all(jobId)
      .reduce((acc, r) => { acc[r.severity] = r.c; return acc; }, {});
  }

  res.json({
    jobNew, jobOld,
    summary: { new: countsBySeverity(jobNew.id), old: countsBySeverity(jobOld.id) },
    diff: {
      newIssues: newIssues.slice(0, 200),
      fixed: fixed.slice(0, 200),
      regressed: regressed.slice(0, 200),
      unchanged: unchanged.slice(0, 200),
      totals: {
        newIssues: newIssues.length,
        fixed: fixed.length,
        regressed: regressed.length,
        unchanged: unchanged.length
      }
    }
  });
});

// GET /api/reports/:siteId/summary  — must come before /:siteId/:section
router.get("/:siteId/summary", (req, res) => {
  const job = latestJob(req.params.siteId);
  if (!job) return res.json({ crawlJob: null, sections: {} });

  const rows = getDb()
    .prepare("SELECT section, severity, COUNT(*) as count FROM audit_results WHERE crawl_job_id = ? GROUP BY section, severity")
    .all(job.id);

  const sections = {};
  for (const r of rows) {
    if (!sections[r.section]) sections[r.section] = { critical: 0, warning: 0, info: 0, ok: 0 };
    sections[r.section][r.severity] = (sections[r.section][r.severity] || 0) + r.count;
  }

  const totalUrls = job.total_urls || 1;
  let weightedIssues = 0;
  for (const s of Object.values(sections)) {
    weightedIssues += (s.critical || 0) * 3 + (s.warning || 0) * 2 + (s.info || 0) * 1;
  }
  const health = Math.max(0, Math.round(100 - (weightedIssues / totalUrls) * 10));

  res.json({ crawlJob: job, sections, health });
});

// GET /api/reports/:siteId/:section  — catch-all, keep last
router.get("/:siteId/:section", (req, res) => {
  const { siteId, section } = req.params;
  const job = latestJob(siteId);
  if (!job) return res.json({ data: [], crawlJob: null });

  const rows = getDb()
    .prepare("SELECT url, data, severity, issue_type FROM audit_results WHERE crawl_job_id = ? AND section = ? ORDER BY severity ASC, url ASC")
    .all(job.id, section);

  const data = rows.map((r) => {
    let parsed = {};
    try { parsed = JSON.parse(r.data || "{}"); } catch {}
    return { url: r.url, severity: r.severity, issue_type: r.issue_type, ...parsed };
  });

  res.json({ data, crawlJob: job });
});

module.exports = router;
