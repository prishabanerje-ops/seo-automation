const { getDb } = require("../sqlite");

function migrate() {
  const db = getDb();
  const cols = db.pragma("table_info(task_status)").map(c => c.name);
  if (!cols.includes("severity")) {
    db.prepare("ALTER TABLE task_status ADD COLUMN severity TEXT").run();
  }
}

module.exports = { migrate };
