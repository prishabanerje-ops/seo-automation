/**
 * Seed the audit_checks table from data/audit-checks.csv
 * Idempotent — safe to run multiple times.
 */
const path = require("path");
const fs   = require("fs");
const { getDb } = require("../backend/db/sqlite");

const CSV_PATH = path.join(__dirname, "../data/audit-checks.csv");

if (!fs.existsSync(CSV_PATH)) {
  console.log("data/audit-checks.csv not found — skipping seed");
  process.exit(0);
}

const db = getDb();
const existing = db.prepare("SELECT COUNT(*) as c FROM audit_checks").get().c;
if (existing > 0) {
  console.log(`audit_checks already has ${existing} rows — skipping seed`);
  process.exit(0);
}

const lines = fs.readFileSync(CSV_PATH, "utf8").split("\n").filter(Boolean);
const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));

const insert = db.prepare(`
  INSERT OR IGNORE INTO audit_checks
    (check_number, name, category, detection_method, severity_default, is_automated)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertMany = db.transaction((rows) => {
  for (const row of rows) {
    const cols = row.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
    insert.run(
      parseInt(cols[0]) || 0,
      cols[1] || "",
      cols[2] || "",
      cols[3] || "manual",
      cols[4] || "info",
      cols[5] === "1" ? 1 : 0
    );
  }
});

insertMany(lines.slice(1));
const total = db.prepare("SELECT COUNT(*) as c FROM audit_checks").get().c;
console.log(`Seeded ${total} audit checks`);
