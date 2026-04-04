const { getDb } = require("../sqlite");

function migrate() {
  const db = getDb();

  // ─── Original tables (keep, add columns safely) ──────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS sites (
      id            TEXT PRIMARY KEY,
      project_id    TEXT,
      label         TEXT,
      url           TEXT,
      gsc_property  TEXT,
      ga4_property_id TEXT,
      color         TEXT,
      sheets_tab_name TEXT,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS crawl_jobs (
      id           TEXT PRIMARY KEY,
      site_id      TEXT,
      started_at   DATETIME,
      completed_at DATETIME,
      status       TEXT,
      mode         TEXT,
      total_urls   INTEGER,
      error_message TEXT
    );

    CREATE TABLE IF NOT EXISTS audit_results (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      crawl_job_id TEXT,
      site_id      TEXT,
      section      TEXT,
      url          TEXT,
      data         JSON,
      severity     TEXT,
      issue_type   TEXT
    );

    CREATE TABLE IF NOT EXISTS gsc_cache (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id     TEXT,
      url         TEXT,
      clicks      INTEGER,
      impressions INTEGER,
      ctr         REAL,
      position    REAL,
      top_query   TEXT,
      fetched_at  DATETIME
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id              TEXT PRIMARY KEY,
      site_ids        JSON,
      cron_expression TEXT,
      notify_slack    INTEGER,
      notify_email    INTEGER,
      enabled         INTEGER,
      last_run        DATETIME,
      next_run        DATETIME
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // ─── v2 tables ────────────────────────────────────────────────────────────────
  db.exec(`
    -- Workspaces
    CREATE TABLE IF NOT EXISTS workspaces (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      slug       TEXT UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Users
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name          TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'seo',
      avatar_url    TEXT,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Sessions (JWT refresh tokens)
    CREATE TABLE IF NOT EXISTS sessions (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Invite tokens
    CREATE TABLE IF NOT EXISTS invites (
      id           TEXT PRIMARY KEY,
      workspace_id TEXT,
      email        TEXT NOT NULL,
      role         TEXT NOT NULL DEFAULT 'seo',
      token        TEXT UNIQUE NOT NULL,
      expires_at   TIMESTAMP NOT NULL,
      accepted_at  TIMESTAMP
    );

    -- Projects
    CREATE TABLE IF NOT EXISTS projects (
      id           TEXT PRIMARY KEY,
      workspace_id TEXT,
      name         TEXT NOT NULL,
      slug         TEXT NOT NULL,
      description  TEXT,
      created_by   TEXT,
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- GSC connections (encrypted tokens)
    CREATE TABLE IF NOT EXISTS gsc_connections (
      id                TEXT PRIMARY KEY,
      project_id        TEXT,
      site_id           TEXT,
      access_token_enc  TEXT,
      refresh_token_enc TEXT,
      token_expiry      TIMESTAMP,
      property_url      TEXT,
      status            TEXT DEFAULT 'connected',
      connected_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- GA4 connections (encrypted tokens)
    CREATE TABLE IF NOT EXISTS ga4_connections (
      id                TEXT PRIMARY KEY,
      project_id        TEXT,
      site_id           TEXT,
      access_token_enc  TEXT,
      refresh_token_enc TEXT,
      token_expiry      TIMESTAMP,
      ga4_property_id   TEXT,
      status            TEXT DEFAULT 'connected',
      connected_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- GA4 data cache
    CREATE TABLE IF NOT EXISTS ga4_cache (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      site_id               TEXT,
      url                   TEXT,
      sessions              INTEGER DEFAULT 0,
      engaged_sessions      INTEGER DEFAULT 0,
      engagement_rate       REAL DEFAULT 0,
      bounce_rate           REAL DEFAULT 0,
      avg_session_duration  REAL DEFAULT 0,
      total_revenue         REAL DEFAULT 0,
      conversions           INTEGER DEFAULT 0,
      fetched_at            DATETIME
    );

    -- Linear integration
    CREATE TABLE IF NOT EXISTS linear_connections (
      id                TEXT PRIMARY KEY,
      project_id        TEXT,
      api_key_enc       TEXT,
      team_id           TEXT,
      linear_project_id TEXT,
      default_assignee  TEXT,
      connected_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Linear tickets created from issues
    CREATE TABLE IF NOT EXISTS linear_tickets (
      id              TEXT PRIMARY KEY,
      audit_result_id TEXT,
      linear_issue_id TEXT NOT NULL,
      linear_url      TEXT NOT NULL,
      created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_by      TEXT
    );

    -- 477-check audit registry (seeded from CSV)
    CREATE TABLE IF NOT EXISTS audit_checks (
      id               INTEGER PRIMARY KEY,
      check_number     INTEGER NOT NULL,
      name             TEXT NOT NULL,
      category         TEXT NOT NULL,
      detection_method TEXT,
      tool_source      TEXT,
      severity_default TEXT DEFAULT 'warning',
      is_automated     INTEGER DEFAULT 0,
      created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- AI suggestions (Claude responses cached per check+job)
    CREATE TABLE IF NOT EXISTS ai_suggestions (
      id            TEXT PRIMARY KEY,
      check_id      INTEGER,
      job_id        TEXT,
      site_id       TEXT,
      type          TEXT DEFAULT 'issue',
      response_text TEXT NOT NULL,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- AI suggestion feedback (thumbs up/down)
    CREATE TABLE IF NOT EXISTS ai_suggestion_feedback (
      id            TEXT PRIMARY KEY,
      suggestion_id TEXT NOT NULL,
      user_id       TEXT,
      rating        INTEGER NOT NULL,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- In-app notifications
    CREATE TABLE IF NOT EXISTS notifications (
      id           TEXT PRIMARY KEY,
      workspace_id TEXT,
      user_id      TEXT,
      type         TEXT NOT NULL,
      title        TEXT NOT NULL,
      body         TEXT,
      link         TEXT,
      is_read      INTEGER DEFAULT 0,
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Project-level settings (encrypted for secrets)
    CREATE TABLE IF NOT EXISTS project_settings (
      project_id TEXT NOT NULL,
      key        TEXT NOT NULL,
      value_enc  TEXT,
      is_secret  INTEGER DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (project_id, key)
    );

    -- Saved crawl configurations
    CREATE TABLE IF NOT EXISTS crawl_configs (
      id         TEXT PRIMARY KEY,
      project_id TEXT,
      site_id    TEXT,
      name       TEXT NOT NULL,
      config     TEXT NOT NULL,
      created_by TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Kanban task status per issue
    CREATE TABLE IF NOT EXISTS task_status (
      audit_result_id TEXT PRIMARY KEY,
      status          TEXT DEFAULT 'backlog',
      assignee_id     TEXT,
      updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_by      TEXT
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_audit_results_job     ON audit_results(crawl_job_id);
    CREATE INDEX IF NOT EXISTS idx_audit_results_section ON audit_results(section);
    CREATE INDEX IF NOT EXISTS idx_audit_results_severity ON audit_results(severity);
    CREATE INDEX IF NOT EXISTS idx_audit_results_site    ON audit_results(site_id);
    CREATE INDEX IF NOT EXISTS idx_gsc_cache_site        ON gsc_cache(site_id);
    CREATE INDEX IF NOT EXISTS idx_ga4_cache_site        ON ga4_cache(site_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user    ON notifications(user_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_sessions_user         ON sessions(user_id);
  `);

  // Add missing columns to existing tables (safe ALTER)
  const alterSafely = (table, col, def) => {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
    } catch {}
  };

  alterSafely("sites", "project_id", "TEXT");
  alterSafely("sites", "ga4_property_id", "TEXT");
  alterSafely("sites", "sheets_tab_name", "TEXT");
  alterSafely("sites", "created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
  alterSafely("crawl_jobs", "project_id", "TEXT");

  console.log("Database migrations complete.");
}

module.exports = { migrate };
