const express = require("express");
const {
  getAuthUrl, handleCallback, revokeTokens, getAuthStatus,
  fetchAndCacheGsc, getCachedGsc,
  getGscSummary, getGscSummaryAll, getGscQueries, getGscDailyTrend
} = require("../services/gsc.service");
const { getDb } = require("../db/sqlite");

const router = express.Router();

router.get("/auth", (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID)
    return res.status(400).json({ error: "GOOGLE_CLIENT_ID not configured in .env" });
  res.redirect(getAuthUrl());
});

router.get("/callback", async (req, res) => {
  const { code, error } = req.query;
  const base = process.env.FRONTEND_URL || "http://localhost:5173";
  if (error) return res.redirect(`${base}/gsc?gsc=error&msg=${encodeURIComponent(error)}`);
  if (!code) return res.redirect(`${base}/gsc?gsc=error&msg=no_code`);
  try {
    await handleCallback(code);
    res.redirect(`${base}/gsc?gsc=connected`);
  } catch (err) {
    res.redirect(`${base}/gsc?gsc=error&msg=${encodeURIComponent(err.message)}`);
  }
});

router.get("/status", (req, res) => res.json(getAuthStatus()));

router.post("/revoke", (req, res) => { revokeTokens(); res.json({ ok: true }); });

// ── Fetch + cache all data for a site ─────────────────────────────────────────
router.post("/fetch/:siteId", async (req, res) => {
  const { siteId } = req.params;
  const site = getDb().prepare("SELECT * FROM sites WHERE id = ?").get(siteId);
  if (!site) return res.status(404).json({ error: "Site not found" });
  if (!site.gsc_property) return res.status(400).json({ error: "No GSC property configured for this site" });

  try {
    const result = await fetchAndCacheGsc(siteId, site.gsc_property);
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Summary: all sites (for FounderView block) ────────────────────────────────
router.get("/summary/all", (req, res) => {
  try { res.json(getGscSummaryAll()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Summary: one site with period comparison ──────────────────────────────────
router.get("/summary/:siteId", (req, res) => {
  try { res.json(getGscSummary(req.params.siteId)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Top queries ───────────────────────────────────────────────────────────────
router.get("/queries/:siteId", (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  res.json({ queries: getGscQueries(req.params.siteId, limit) });
});

// ── Daily trend ───────────────────────────────────────────────────────────────
router.get("/trend/:siteId", (req, res) => {
  res.json({ trend: getGscDailyTrend(req.params.siteId) });
});

// ── Page-level data (legacy + full view table) ────────────────────────────────
router.get("/data/:siteId", (req, res) => {
  res.json({ data: getCachedGsc(req.params.siteId) });
});

module.exports = router;
