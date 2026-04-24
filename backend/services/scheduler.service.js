const cron = require("node-cron");
const { getDb } = require("../db/sqlite");

// scheduleId -> cron task
const activeTasks = new Map();

let ioRef = null;

function setIo(io) {
  ioRef = io;
}

function registerSchedule(schedule) {
  if (!cron.validate(schedule.cron_expression)) {
    throw new Error(`Invalid cron expression: ${schedule.cron_expression}`);
  }

  // Cancel existing task if re-registering
  if (activeTasks.has(schedule.id)) {
    activeTasks.get(schedule.id).stop();
    activeTasks.delete(schedule.id);
  }

  if (!schedule.enabled) return;

  const task = cron.schedule(schedule.cron_expression, async () => {
    console.log(`[Scheduler] Running schedule ${schedule.id}`);

    const db = getDb();
    db.prepare("UPDATE schedules SET last_run = datetime('now') WHERE id = ?").run(schedule.id);

    const siteIds = typeof schedule.site_ids === "string"
      ? JSON.parse(schedule.site_ids)
      : schedule.site_ids;

    try {
      const { startCrawl } = require("./sf-cli.service");
      const jobs = startCrawl(siteIds, ioRef || { emit: () => {} });
      console.log(`[Scheduler] Started jobs:`, jobs.map((j) => j.jobId));
    } catch (err) {
      console.error(`[Scheduler] Error starting crawl:`, err.message);
    }
  });

  activeTasks.set(schedule.id, task);
  console.log(`[Scheduler] Registered schedule ${schedule.id}: ${schedule.cron_expression}`);
}

function removeSchedule(scheduleId) {
  if (activeTasks.has(scheduleId)) {
    activeTasks.get(scheduleId).stop();
    activeTasks.delete(scheduleId);
  }
}

function loadAllSchedules(io) {
  if (io) setIo(io);
  const schedules = getDb().prepare("SELECT * FROM schedules WHERE enabled = 1").all();
  for (const s of schedules) {
    try { registerSchedule(s); }
    catch (err) { console.error(`[Scheduler] Failed to register ${s.id}:`, err.message); }
  }
  console.log(`[Scheduler] Loaded ${schedules.length} schedule(s)`);
}

module.exports = { registerSchedule, removeSchedule, loadAllSchedules, setIo };
