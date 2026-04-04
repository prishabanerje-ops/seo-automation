/**
 * Migration 002 — v3 additions
 * Adds performance indexes and verifies all required tables exist.
 * Safe to run multiple times.
 */

const { getDb } = require("../sqlite");

function migrate() {
  const db = getDb();

  // ─── Performance indexes ───────────────────────────────────────────────
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_audit_results_site_job
      ON audit_results(site_id, crawl_job_id);

    CREATE INDEX IF NOT EXISTS idx_audit_results_url
      ON audit_results(url);

    CREATE INDEX IF NOT EXISTS idx_gsc_cache_site_url
      ON gsc_cache(site_id, url);
  `);

  // ga4_cache index (table may not exist yet — create safely)
  try {
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_ga4_cache_site_url
        ON ga4_cache(site_id, url);
    `);
  } catch (_) {}

  // ─── Ensure ai_suggestions has type + section columns ─────────────────
  const aiCols = db.prepare("PRAGMA table_info(ai_suggestions)").all().map(c => c.name);
  if (!aiCols.includes("type")) {
    db.exec("ALTER TABLE ai_suggestions ADD COLUMN type TEXT DEFAULT 'issue'");
  }
  if (!aiCols.includes("section")) {
    db.exec("ALTER TABLE ai_suggestions ADD COLUMN section TEXT");
  }

  // ─── Ensure users table has all required columns ───────────────────────
  const userCols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
  if (!userCols.includes("last_active_at")) {
    db.exec("ALTER TABLE users ADD COLUMN last_active_at TEXT");
  }
  if (!userCols.includes("status")) {
    db.exec("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'");
  }

  // ─── Ensure invites table exists ──────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS invites (
      id         TEXT PRIMARY KEY,
      email      TEXT NOT NULL,
      role       TEXT NOT NULL DEFAULT 'readonly',
      token      TEXT NOT NULL UNIQUE,
      invited_by TEXT,
      expires_at TEXT NOT NULL,
      accepted   INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // ─── Ensure task_status table exists ──────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_status (
      id              TEXT PRIMARY KEY,
      audit_result_id TEXT,
      site_id         TEXT,
      status          TEXT DEFAULT 'backlog',
      assignee_id     TEXT,
      linear_ticket_id TEXT,
      linear_url      TEXT,
      created_at      TEXT DEFAULT (datetime('now')),
      updated_at      TEXT DEFAULT (datetime('now'))
    )
  `);

  // ─── Ensure ga4_cache table exists ────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS ga4_cache (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id         TEXT NOT NULL,
      url             TEXT NOT NULL,
      sessions        INTEGER DEFAULT 0,
      engagement_rate REAL DEFAULT 0,
      bounce_rate     REAL DEFAULT 0,
      revenue         REAL DEFAULT 0,
      conversions     INTEGER DEFAULT 0,
      fetched_at      TEXT DEFAULT (datetime('now')),
      UNIQUE(site_id, url)
    )
  `);

  console.log("[Migration 002] v3 additions applied");
}

module.exports = { migrate };
