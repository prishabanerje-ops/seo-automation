const express = require("express");
const { google } = require("googleapis");
const { v4: uuidv4 } = require("uuid");
const { getDb } = require("../db/sqlite");

const router = express.Router();

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI?.replace("/gsc/callback", "/ga4/callback") || "http://localhost:3001/api/ga4/callback"
  );
}

// GET /api/ga4/status
router.get("/status", (req, res) => {
  const db = getDb();
  const conn = db.prepare("SELECT * FROM ga4_connections WHERE status = 'connected' LIMIT 1").get();
  if (!conn) return res.json({ connected: false });
  res.json({ connected: true, propertyId: conn.ga4_property_id });
});

// GET /api/ga4/auth  — redirect to Google OAuth
router.get("/auth", (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(400).json({ error: "Google OAuth not configured" });
  }
  const oauth2 = getOAuth2Client();
  const url = oauth2.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/analytics.readonly",
      "openid", "email"
    ],
    prompt: "consent"
  });
  res.redirect(url);
});

// GET /api/ga4/callback
router.get("/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: "No auth code" });

  try {
    const oauth2 = getOAuth2Client();
    const { tokens } = await oauth2.getToken(code);
    const db = getDb();

    const id = uuidv4();
    db.prepare(`INSERT OR REPLACE INTO ga4_connections
      (id, access_token_enc, refresh_token_enc, token_expiry, status)
      VALUES (?, ?, ?, ?, 'connected')`)
      .run(id, tokens.access_token, tokens.refresh_token || "", new Date(tokens.expiry_date).toISOString());

    res.redirect("/?ga4=connected");
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ga4/fetch/:siteId
router.post("/fetch/:siteId", async (req, res) => {
  const { siteId } = req.params;
  const db = getDb();

  const conn = db.prepare("SELECT * FROM ga4_connections WHERE status = 'connected' LIMIT 1").get();
  if (!conn) return res.status(400).json({ error: "GA4 not connected" });

  const site = db.prepare("SELECT * FROM sites WHERE id = ?").get(siteId);
  const propertyId = conn.ga4_property_id || req.body.propertyId;
  if (!propertyId) return res.status(400).json({ error: "GA4 property ID required" });

  try {
    const oauth2 = getOAuth2Client();
    oauth2.setCredentials({
      access_token: conn.access_token_enc,
      refresh_token: conn.refresh_token_enc,
    });

    const analyticsData = google.analyticsdata({ version: "v1beta", auth: oauth2 });

    const response = await analyticsData.properties.runReport({
      property: `properties/${propertyId}`,
      requestBody: {
        dateRanges: [{ startDate: "28daysAgo", endDate: "today" }],
        dimensions: [{ name: "pagePath" }],
        metrics: [
          { name: "sessions" },
          { name: "engagedSessions" },
          { name: "engagementRate" },
          { name: "bounceRate" },
          { name: "averageSessionDuration" },
          { name: "totalRevenue" },
          { name: "conversions" },
        ],
        limit: 25000,
      },
    });

    const rows = response.data.rows || [];

    // Clear old cache
    db.prepare("DELETE FROM ga4_cache WHERE site_id = ?").run(siteId);

    const insert = db.prepare(`INSERT INTO ga4_cache
      (site_id, url, sessions, engaged_sessions, engagement_rate, bounce_rate, avg_session_duration, total_revenue, conversions, fetched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`);

    const baseUrl = site?.url || "";
    for (const row of rows) {
      const path = row.dimensionValues?.[0]?.value || "/";
      const vals = row.metricValues || [];
      insert.run(
        siteId,
        baseUrl + path,
        parseInt(vals[0]?.value || 0),
        parseInt(vals[1]?.value || 0),
        parseFloat(vals[2]?.value || 0),
        parseFloat(vals[3]?.value || 0),
        parseFloat(vals[4]?.value || 0),
        parseFloat(vals[5]?.value || 0),
        parseInt(vals[6]?.value || 0),
      );
    }

    res.json({ ok: true, rows: rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ga4/data/:siteId
router.get("/data/:siteId", (req, res) => {
  const db = getDb();
  const rows = db.prepare(
    "SELECT * FROM ga4_cache WHERE site_id = ? ORDER BY sessions DESC LIMIT 1000"
  ).all(req.params.siteId);
  res.json(rows);
});

module.exports = router;
