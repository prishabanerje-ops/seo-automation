/**
 * Migration 004 — sf_config column on sites
 * Adds a JSON text column to store per-site Screaming Frog defaults.
 * Safe to run multiple times.
 */

const { getDb } = require("../sqlite");

function migrate() {
  const db = getDb();
  try {
    db.exec(`ALTER TABLE sites ADD COLUMN sf_config TEXT`);
  } catch (_) {
    // Column already exists — ignore
  }
}

module.exports = { migrate };
