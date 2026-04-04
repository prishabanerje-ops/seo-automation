const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { getDb } = require("../db/sqlite");
const { registerSchedule, removeSchedule } = require("../services/scheduler.service");

const router = express.Router();

router.get("/", (req, res) => {
  const schedules = getDb().prepare("SELECT * FROM schedules ORDER BY next_run ASC").all();
  res.json(schedules.map((s) => ({
    ...s,
    site_ids: typeof s.site_ids === "string" ? JSON.parse(s.site_ids) : s.site_ids
  })));
});

router.post("/", (req, res) => {
  const { site_ids, cron_expression, notify_slack = 0, notify_email = 0, enabled = 1 } = req.body;
  if (!site_ids?.length || !cron_expression) {
    return res.status(400).json({ error: "site_ids and cron_expression required" });
  }

  const id = uuidv4();
  const db = getDb();
  db.prepare(
    "INSERT INTO schedules (id, site_ids, cron_expression, notify_slack, notify_email, enabled) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, JSON.stringify(site_ids), cron_expression, notify_slack ? 1 : 0, notify_email ? 1 : 0, enabled ? 1 : 0);

  const schedule = db.prepare("SELECT * FROM schedules WHERE id = ?").get(id);
  try { registerSchedule(schedule); } catch (err) { /* log but don't fail */ }

  res.json({ ...schedule, site_ids });
});

router.put("/:id", (req, res) => {
  const { site_ids, cron_expression, notify_slack, notify_email, enabled } = req.body;
  const db = getDb();

  const existing = db.prepare("SELECT * FROM schedules WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Schedule not found" });

  db.prepare(
    "UPDATE schedules SET site_ids = ?, cron_expression = ?, notify_slack = ?, notify_email = ?, enabled = ? WHERE id = ?"
  ).run(
    JSON.stringify(site_ids ?? JSON.parse(existing.site_ids)),
    cron_expression ?? existing.cron_expression,
    notify_slack !== undefined ? (notify_slack ? 1 : 0) : existing.notify_slack,
    notify_email !== undefined ? (notify_email ? 1 : 0) : existing.notify_email,
    enabled !== undefined ? (enabled ? 1 : 0) : existing.enabled,
    req.params.id
  );

  const updated = db.prepare("SELECT * FROM schedules WHERE id = ?").get(req.params.id);
  removeSchedule(req.params.id);
  try { registerSchedule(updated); } catch {}

  res.json({ ...updated, site_ids: JSON.parse(updated.site_ids) });
});

router.delete("/:id", (req, res) => {
  removeSchedule(req.params.id);
  getDb().prepare("DELETE FROM schedules WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

router.post("/:id/run", (req, res) => {
  const schedule = getDb().prepare("SELECT * FROM schedules WHERE id = ?").get(req.params.id);
  if (!schedule) return res.status(404).json({ error: "Schedule not found" });

  const io = req.app.locals.io;
  const { startCrawl } = require("../services/sf-cli.service");
  const siteIds = typeof schedule.site_ids === "string" ? JSON.parse(schedule.site_ids) : schedule.site_ids;
  const jobs = startCrawl(siteIds, io);

  res.json({ jobs });
});

module.exports = router;
