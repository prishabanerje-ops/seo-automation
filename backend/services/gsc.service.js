const { google } = require("googleapis");
const { getDb } = require("../db/sqlite");

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || "http://localhost:3001/api/gsc/callback"
  );
}

function getSavedTokens() {
  const row = getDb().prepare("SELECT value FROM settings WHERE key = 'gsc_tokens'").get();
  if (!row) return null;
  try { return JSON.parse(row.value); } catch { return null; }
}

function saveTokens(tokens) {
  getDb()
    .prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('gsc_tokens', ?)")
    .run(JSON.stringify(tokens));
}

function getAuthUrl() {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/webmasters.readonly"]
  });
}

async function handleCallback(code) {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);
  saveTokens(tokens);
  return tokens;
}

function revokeTokens() {
  getDb().prepare("DELETE FROM settings WHERE key = 'gsc_tokens'").run();
}

function getAuthStatus() {
  const tokens = getSavedTokens();
  if (!tokens) return { authenticated: false };
  let email = null;
  if (tokens.id_token) {
    try {
      const payload = JSON.parse(Buffer.from(tokens.id_token.split(".")[1], "base64").toString());
      email = payload.email;
    } catch {}
  }
  return { authenticated: true, email };
}

// ─── Core search analytics fetch ──────────────────────────────────────────────
async function fetchSearchAnalytics(gscProperty, startDate, endDate, dimensions, rowLimit = 25000) {
  const tokens = getSavedTokens();
  if (!tokens) throw new Error("Not authenticated with Google");

  const client = getOAuth2Client();
  client.setCredentials(tokens);
  client.on("tokens", (newTokens) => saveTokens({ ...tokens, ...newTokens }));

  const webmasters = google.webmasters({ version: "v3", auth: client });
  const res = await webmasters.searchanalytics.query({
    siteUrl: gscProperty,
    requestBody: { startDate, endDate, dimensions, rowLimit, dataState: "all" }
  });
  return res.data.rows || [];
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
function fmt(d) { return d.toISOString().slice(0, 10); }

function getPeriodDates(daysBack = 28, offset = 0) {
  const end = new Date();
  end.setDate(end.getDate() - offset);
  const start = new Date(end);
  start.setDate(start.getDate() - daysBack);
  return { start: fmt(start), end: fmt(end) };
}

// ─── Full fetch: pages (current + prev), queries, daily ──────────────────────
async function fetchAndCacheGsc(siteId, gscProperty) {
  const db = getDb();

  const curr = getPeriodDates(28, 0);
  const prev = getPeriodDates(28, 28);

  // 1. Current period — page dimension
  const currPages = await fetchSearchAnalytics(gscProperty, curr.start, curr.end, ["page"]);

  // 2. Previous period — page dimension
  const prevPages = await fetchSearchAnalytics(gscProperty, prev.start, prev.end, ["page"]);

  // 3. Query dimension — current period
  const queryRows = await fetchSearchAnalytics(gscProperty, curr.start, curr.end, ["query"], 1000);

  // 4. Previous period — query dimension (for delta)
  const prevQueryRows = await fetchSearchAnalytics(gscProperty, prev.start, prev.end, ["query"], 1000);

  // 5. Daily aggregates — current 28 days
  const dailyRows = await fetchSearchAnalytics(gscProperty, curr.start, curr.end, ["date"], 28);

  // ── Store page-level data ──────────────────────────────────────────────────
  db.prepare("DELETE FROM gsc_cache WHERE site_id = ?").run(siteId);
  const insertPage = db.prepare(
    "INSERT INTO gsc_cache (site_id, url, clicks, impressions, ctr, position, top_query, period, fetched_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))"
  );
  const insertPageTx = db.transaction((rows, period) => {
    for (const row of rows) {
      const url = row.keys?.[0];
      if (!url) continue;
      insertPage.run(siteId, url, row.clicks ?? 0, row.impressions ?? 0, row.ctr ?? 0, row.position ?? 0, null, period);
    }
  });
  insertPageTx(currPages, "current");
  insertPageTx(prevPages, "previous");

  // ── Store query data ───────────────────────────────────────────────────────
  db.prepare("DELETE FROM gsc_queries WHERE site_id = ?").run(siteId);

  // Build prev query map for delta
  const prevQueryMap = {};
  for (const r of prevQueryRows) {
    const q = r.keys?.[0];
    if (q) prevQueryMap[q] = { clicks: r.clicks ?? 0, impressions: r.impressions ?? 0 };
  }

  const insertQuery = db.prepare(`
    INSERT OR REPLACE INTO gsc_queries
      (site_id, query, clicks, impressions, ctr, position, prev_clicks, prev_impressions, fetched_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);
  const insertQueryTx = db.transaction(() => {
    for (const row of queryRows) {
      const q = row.keys?.[0];
      if (!q) continue;
      const p = prevQueryMap[q] || { clicks: 0, impressions: 0 };
      insertQuery.run(siteId, q, row.clicks ?? 0, row.impressions ?? 0, row.ctr ?? 0, row.position ?? 0, p.clicks, p.impressions);
    }
  });
  insertQueryTx();

  // ── Store daily data ───────────────────────────────────────────────────────
  db.prepare("DELETE FROM gsc_daily WHERE site_id = ?").run(siteId);
  const insertDaily = db.prepare(`
    INSERT OR REPLACE INTO gsc_daily (site_id, date, clicks, impressions, ctr, position, fetched_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `);
  const insertDailyTx = db.transaction(() => {
    for (const row of dailyRows) {
      const date = row.keys?.[0];
      if (!date) continue;
      insertDaily.run(siteId, date, row.clicks ?? 0, row.impressions ?? 0, row.ctr ?? 0, row.position ?? 0);
    }
  });
  insertDailyTx();

  return { pages: currPages.length, queries: queryRows.length, daily: dailyRows.length };
}

// ─── Getters ──────────────────────────────────────────────────────────────────
function getCachedGsc(siteId) {
  return getDb()
    .prepare("SELECT * FROM gsc_cache WHERE site_id = ? AND period = 'current' ORDER BY impressions DESC")
    .all(siteId);
}

function getGscSummary(siteId) {
  const db = getDb();

  const agg = (period) => db.prepare(`
    SELECT
      SUM(clicks) as clicks,
      SUM(impressions) as impressions,
      CASE WHEN SUM(impressions) > 0 THEN ROUND(SUM(clicks)*1.0/SUM(impressions), 4) ELSE 0 END as ctr,
      ROUND(AVG(position), 1) as position,
      COUNT(*) as pages
    FROM gsc_cache WHERE site_id = ? AND period = ?
  `).get(siteId, period);

  const curr = agg("current") || {};
  const prev = agg("previous") || {};

  const daily = db.prepare(
    "SELECT date, clicks, impressions FROM gsc_daily WHERE site_id = ? ORDER BY date ASC LIMIT 14"
  ).all(siteId);

  return { current: curr, previous: prev, daily };
}

function getGscSummaryAll() {
  const db = getDb();
  const sites = db.prepare("SELECT id, label, color, gsc_property FROM sites WHERE gsc_property IS NOT NULL AND gsc_property != ''").all();

  const results = [];
  for (const site of sites) {
    const hasData = db.prepare("SELECT COUNT(*) as c FROM gsc_cache WHERE site_id = ? AND period = 'current'").get(site.id);
    if (!hasData?.c) continue;
    const summary = getGscSummary(site.id);
    results.push({ site_id: site.id, label: site.label, color: site.color, ...summary });
  }

  // Also compute cross-site totals
  const totals = db.prepare(`
    SELECT
      SUM(clicks) as clicks, SUM(impressions) as impressions,
      CASE WHEN SUM(impressions)>0 THEN ROUND(SUM(clicks)*1.0/SUM(impressions),4) ELSE 0 END as ctr,
      ROUND(AVG(position),1) as position
    FROM gsc_cache WHERE period = 'current'
  `).get() || {};

  const prevTotals = db.prepare(`
    SELECT
      SUM(clicks) as clicks, SUM(impressions) as impressions,
      CASE WHEN SUM(impressions)>0 THEN ROUND(SUM(clicks)*1.0/SUM(impressions),4) ELSE 0 END as ctr,
      ROUND(AVG(position),1) as position
    FROM gsc_cache WHERE period = 'previous'
  `).get() || {};

  // Cross-site daily for sparkline
  const daily = db.prepare(`
    SELECT date, SUM(clicks) as clicks, SUM(impressions) as impressions
    FROM gsc_daily GROUP BY date ORDER BY date ASC LIMIT 14
  `).all();

  return { sites: results, totals, prevTotals, daily };
}

function getGscQueries(siteId, limit = 100) {
  return getDb()
    .prepare("SELECT * FROM gsc_queries WHERE site_id = ? ORDER BY impressions DESC LIMIT ?")
    .all(siteId, limit);
}

function getGscDailyTrend(siteId) {
  return getDb()
    .prepare("SELECT date, clicks, impressions, ctr, position FROM gsc_daily WHERE site_id = ? ORDER BY date ASC")
    .all(siteId);
}

module.exports = {
  getAuthUrl, handleCallback, revokeTokens, getAuthStatus,
  fetchAndCacheGsc, getCachedGsc,
  getGscSummary, getGscSummaryAll, getGscQueries, getGscDailyTrend
};
