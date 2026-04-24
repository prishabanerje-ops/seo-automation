const DatabaseSync = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(__dirname, "../seo-automation.db");

let db;

function getDb() {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    db.exec("PRAGMA journal_mode = WAL");
    db.exec("PRAGMA foreign_keys = ON");
  }
  return db;
}

module.exports = { getDb };
