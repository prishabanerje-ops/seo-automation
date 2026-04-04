const { google } = require("googleapis");
const { getSavedTokens, saveTokens, getOAuth2Client } = require("./gsc.service");
const { getDb } = require("../db/sqlite");

// Re-use the same OAuth client from GSC
function getClient() {
  const { google } = require("googleapis");
  const tokens = require("./gsc.service").getSavedTokens
    ? require("./gsc.service").getSavedTokens()
    : null;

  if (!tokens) throw new Error("Not authenticated with Google. Connect GSC first.");

  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || "http://localhost:3001/api/gsc/callback"
  );
  client.setCredentials(tokens);
  return client;
}

async function pushSectionToSheets(siteId, section) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error("GOOGLE_SHEETS_SPREADSHEET_ID not configured");

  const auth = getClient();
  const sheets = google.sheets({ version: "v4", auth });
  const site = getDb().prepare("SELECT * FROM sites WHERE id = ?").get(siteId);
  if (!site) throw new Error("Site not found");

  // Get latest crawl data
  const db = getDb();
  const job = db
    .prepare("SELECT * FROM crawl_jobs WHERE site_id = ? AND status = 'completed' ORDER BY completed_at DESC LIMIT 1")
    .get(siteId);
  if (!job) throw new Error("No completed crawl found for this site");

  const rows = db
    .prepare("SELECT url, severity, issue_type, data FROM audit_results WHERE crawl_job_id = ? AND section = ?")
    .all(job.id, section);

  if (rows.length === 0) throw new Error("No data for this section");

  // Parse first row to get column headers
  const firstData = JSON.parse(rows[0].data || "{}");
  const dataKeys = Object.keys(firstData).filter((k) => k !== "label");
  const headers = ["URL", "Severity", "Issue Type", ...dataKeys.map((k) => k.toUpperCase()), "Issue"];

  const values = [
    headers,
    ...rows.map((r) => {
      let parsed = {};
      try { parsed = JSON.parse(r.data || "{}"); } catch {}
      return [r.url, r.severity, r.issue_type || "", ...dataKeys.map((k) => parsed[k] ?? ""), parsed.label || ""];
    })
  ];

  const tabName = `${site.sheetsTabName} - ${section}`;

  // Ensure tab exists
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const existingSheets = spreadsheet.data.sheets?.map((s) => s.properties.title) || [];

  if (!existingSheets.includes(tabName)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: tabName } } }]
      }
    });
  }

  // Write data
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${tabName}'!A1`,
    valueInputOption: "RAW",
    requestBody: { values }
  });

  return { rows: values.length - 1, tab: tabName };
}

module.exports = { pushSectionToSheets };
