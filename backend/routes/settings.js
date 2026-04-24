const express = require("express");
const { getDb } = require("../db/sqlite");

const router = express.Router();

// Public settings keys (non-secret, safe to return to frontend)
const PUBLIC_KEYS = ["gsc_connected_email"];

router.get("/", (req, res) => {
  const rows = getDb().prepare("SELECT key, value FROM settings").all();
  const settings = {};
  for (const r of rows) {
    // Never expose tokens to frontend
    if (r.key === "gsc_tokens") continue;
    settings[r.key] = r.value;
  }
  res.json(settings);
});

router.post("/", (req, res) => {
  const allowed = ["slack_webhook_url", "psi_api_key", "sheets_spreadsheet_id", "smtp_host", "smtp_port", "smtp_user", "smtp_pass", "email_from", "email_to", "sf_license_key"];
  const db = getDb();
  const upsert = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");

  const saved = [];
  for (const [key, value] of Object.entries(req.body)) {
    if (!allowed.includes(key)) continue;
    upsert.run(key, value);
    process.env[key.toUpperCase()] = value;
    saved.push(key);
  }
  res.json({ saved });
});

// GET /api/settings/status — full system health check (live tests)
router.get("/status", async (req, res) => {
  const results = {};
  const db = getDb();

  // 1. Database
  try {
    const count = db.prepare("SELECT COUNT(*) as n FROM audit_checks").get();
    const jobCount = db.prepare("SELECT COUNT(*) as n FROM crawl_jobs WHERE status = 'completed'").get();
    results.database = "pass";
    results.database_detail = `${count.n} checks seeded · ${jobCount.n} completed crawl jobs`;
  } catch (e) {
    results.database = "fail";
    results.database_detail = e.message;
  }

  // 2. Screaming Frog CLI
  try {
    const { execSync } = require("child_process");
    const sfPath = process.env.SF_BINARY_PATH || "/Users/a39326/.local/bin/ScreamingFrogSEOSpider";
    const ver = execSync(`"${sfPath}" --version 2>&1`, { timeout: 8000 }).toString().trim();
    results.sf_cli = ver.length > 0 ? "pass" : "fail";
    results.sf_cli_detail = ver.slice(0, 80) || "No version output";
  } catch (e) {
    results.sf_cli = "fail";
    results.sf_cli_detail = e.message?.slice(0, 100) || "Not found or not executable";
  }

  // 3. GSC OAuth (token presence + live validation)
  try {
    const tok = db.prepare("SELECT value FROM settings WHERE key = 'gsc_tokens'").get();
    if (tok?.value) {
      const tokens = JSON.parse(tok.value);
      // Check if access token exists and try a lightweight API call
      if (tokens.access_token || tokens.refresh_token) {
        try {
          const { google } = require("googleapis");
          const oauth2 = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI || "http://localhost:3001/api/gsc/callback"
          );
          oauth2.setCredentials(tokens);
          const sc = google.searchconsole({ version: "v1", auth: oauth2 });
          const r = await sc.sites.list();
          const siteCount = r.data.siteEntry?.length || 0;
          results.gsc = "pass";
          results.gsc_detail = `Connected · ${siteCount} propert${siteCount === 1 ? "y" : "ies"} accessible`;
        } catch (apiErr) {
          results.gsc = "warn";
          results.gsc_detail = `Tokens present but API call failed: ${apiErr.message?.slice(0, 60)}`;
        }
      } else {
        results.gsc = "warn";
        results.gsc_detail = "Token record exists but missing credentials";
      }
    } else {
      results.gsc = "skip";
      results.gsc_detail = "Not connected — click Connect in Search Console";
    }
  } catch (e) {
    results.gsc = "fail";
    results.gsc_detail = e.message?.slice(0, 80);
  }

  // 4. GA4
  try {
    const conn = db.prepare("SELECT * FROM ga4_connections WHERE status = 'connected' LIMIT 1").get();
    results.ga4 = conn ? "pass" : "skip";
    results.ga4_detail = conn ? `Connected (property: ${conn.property_id || "unknown"})` : "Not connected";
  } catch {
    results.ga4 = "skip";
    results.ga4_detail = "Table not found";
  }

  // 5. Claude / Anthropic API (live test)
  try {
    const key = process.env.ANTHROPIC_API_KEY ||
      db.prepare("SELECT value FROM settings WHERE key = 'anthropic_api_key'").get()?.value;
    if (key) {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 1, messages: [{ role: "user", content: "hi" }] }),
      });
      results.claude = r.ok ? "pass" : "fail";
      results.claude_detail = r.ok ? "API key valid · model reachable" : `HTTP ${r.status}`;
    } else {
      results.claude = "skip";
      results.claude_detail = "API key not set — add in Settings → API Keys";
    }
  } catch (e) {
    results.claude = "fail";
    results.claude_detail = e.message?.slice(0, 80);
  }

  // 6. PageSpeed Insights API
  try {
    const psiKey = process.env.PSI_API_KEY ||
      db.prepare("SELECT value FROM settings WHERE key = 'psi_api_key'").get()?.value;
    if (psiKey) {
      const r = await fetch(
        `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://example.com&key=${psiKey}&strategy=mobile`,
        { signal: AbortSignal.timeout(8000) }
      );
      results.psi = r.ok ? "pass" : "fail";
      results.psi_detail = r.ok ? "API key valid · PSI reachable" : `HTTP ${r.status}`;
    } else {
      results.psi = "skip";
      results.psi_detail = "API key not set — add in Settings";
    }
  } catch (e) {
    results.psi = "fail";
    results.psi_detail = e.message?.slice(0, 80);
  }

  // 7. Linear
  try {
    const conn = db.prepare("SELECT * FROM linear_connections LIMIT 1").get();
    if (conn?.api_key) {
      const r = await fetch("https://api.linear.app/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": conn.api_key },
        body: JSON.stringify({ query: "{ viewer { id name } }" }),
        signal: AbortSignal.timeout(5000),
      });
      const data = await r.json();
      results.linear = data.data?.viewer ? "pass" : "fail";
      results.linear_detail = data.data?.viewer
        ? `Connected as ${data.data.viewer.name}`
        : "API key invalid";
    } else {
      results.linear = "skip";
      results.linear_detail = "Not configured";
    }
  } catch (e) {
    results.linear = "fail";
    results.linear_detail = e.message?.slice(0, 80);
  }

  // 8. Slack Webhook (live ping)
  try {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL ||
      db.prepare("SELECT value FROM settings WHERE key = 'slack_webhook_url'").get()?.value;
    if (webhookUrl) {
      const r = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "🔍 SEO Automation — data source ping (ignore)" }),
        signal: AbortSignal.timeout(5000),
      });
      results.slack = r.ok ? "pass" : "fail";
      results.slack_detail = r.ok ? "Webhook reachable · ping sent" : `HTTP ${r.status}`;
    } else {
      results.slack = "skip";
      results.slack_detail = "Webhook URL not configured";
    }
  } catch (e) {
    results.slack = "fail";
    results.slack_detail = e.message?.slice(0, 80);
  }

  // 9. SMTP
  const smtpHost = process.env.SMTP_HOST ||
    db.prepare("SELECT value FROM settings WHERE key = 'smtp_host'").get()?.value;
  results.smtp = smtpHost ? "pass" : "skip";
  results.smtp_detail = smtpHost ? `Host: ${smtpHost}` : "Not configured";

  // Summary counts
  const counts = { pass: 0, warn: 0, fail: 0, skip: 0 };
  for (const key of ["database", "sf_cli", "gsc", "ga4", "claude", "psi", "linear", "slack", "smtp"]) {
    counts[results[key]] = (counts[results[key]] || 0) + 1;
  }
  results._summary = counts;
  results._tested_at = new Date().toISOString();

  res.json(results);
});

module.exports = router;
