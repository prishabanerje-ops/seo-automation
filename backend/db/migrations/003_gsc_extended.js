/**
 * Migration 003 — GSC extended tables
 * Adds query-level and daily-trend tables for the full Search Console view.
 * Safe to run multiple times.
 */
const { getDb } = require("../sqlite");

function migrate() {
  const db = getDb();

  // Add period column to gsc_cache (current | previous)
  const cols = db.prepare("PRAGMA table_info(gsc_cache)").all().map(c => c.name);
  if (!cols.includes("period")) {
    db.exec("ALTER TABLE gsc_cache ADD COLUMN period TEXT DEFAULT 'current'");
  }

  // Top queries per site
  db.exec(`
    CREATE TABLE IF NOT EXISTS gsc_queries (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id         TEXT NOT NULL,
      query           TEXT NOT NULL,
      clicks          INTEGER DEFAULT 0,
      impressions     INTEGER DEFAULT 0,
      ctr             REAL DEFAULT 0,
      position        REAL DEFAULT 0,
      prev_clicks     INTEGER DEFAULT 0,
      prev_impressions INTEGER DEFAULT 0,
      fetched_at      DATETIME DEFAULT (datetime('now')),
      UNIQUE(site_id, query)
    )
  `);

  // Daily aggregates for trend charts and sparklines
  db.exec(`
    CREATE TABLE IF NOT EXISTS gsc_daily (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id     TEXT NOT NULL,
      date        TEXT NOT NULL,
      clicks      INTEGER DEFAULT 0,
      impressions INTEGER DEFAULT 0,
      ctr         REAL DEFAULT 0,
      position    REAL DEFAULT 0,
      fetched_at  DATETIME DEFAULT (datetime('now')),
      UNIQUE(site_id, date)
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_gsc_queries_site ON gsc_queries(site_id, clicks DESC);
    CREATE INDEX IF NOT EXISTS idx_gsc_daily_site_date ON gsc_daily(site_id, date);
  `);

  console.log("[Migration 003] GSC extended tables applied");
}

module.exports = { migrate };
