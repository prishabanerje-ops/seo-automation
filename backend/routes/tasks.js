const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { getDb } = require("../db/sqlite");

const router = express.Router();

// GET /api/tasks?siteId=<id>  — list all tasks (optionally filtered by site)
router.get("/", (req, res) => {
  const { siteId } = req.query;
  const db = getDb();

  let sql = `
    SELECT
      ts.id, ts.audit_result_id, ts.site_id, ts.status,
      ts.assignee_id, ts.linear_ticket_id, ts.linear_url,
      ts.created_at, ts.updated_at,
      ar.url, ar.severity, ar.issue_type, ar.section,
      s.label as site_label, s.color as site_color
    FROM task_status ts
    LEFT JOIN audit_results ar ON ar.id = ts.audit_result_id
    LEFT JOIN sites s ON s.id = ts.site_id
  `;
  const params = [];
  if (siteId) { sql += " WHERE ts.site_id = ?"; params.push(siteId); }
  sql += " ORDER BY CASE ts.status WHEN 'in_progress' THEN 0 WHEN 'review' THEN 1 WHEN 'backlog' THEN 2 ELSE 3 END, ts.created_at DESC";

  const rows = db.prepare(sql).all(...params);
  res.json({ tasks: rows });
});

// POST /api/tasks — create task from audit result
router.post("/", (req, res) => {
  const { audit_result_id, site_id, status = "backlog" } = req.body;
  if (!site_id) return res.status(400).json({ error: "site_id required" });

  const db = getDb();
  const id = uuidv4();
  db.prepare(
    "INSERT INTO task_status (id, audit_result_id, site_id, status) VALUES (?, ?, ?, ?)"
  ).run(id, audit_result_id || null, site_id, status);

  res.status(201).json({ ok: true, id });
});

// PATCH /api/tasks/:id — update status (and optionally assignee)
router.patch("/:id", (req, res) => {
  const { status, assignee_id } = req.body;
  const db = getDb();

  const valid = ["backlog", "in_progress", "review", "done"];
  if (status && !valid.includes(status))
    return res.status(400).json({ error: "Invalid status" });

  const sets = [];
  const params = [];
  if (status)      { sets.push("status = ?");      params.push(status); }
  if (assignee_id !== undefined) { sets.push("assignee_id = ?"); params.push(assignee_id); }
  if (!sets.length) return res.status(400).json({ error: "Nothing to update" });

  sets.push("updated_at = datetime('now')");
  params.push(req.params.id);

  const result = db.prepare(`UPDATE task_status SET ${sets.join(", ")} WHERE id = ?`).run(...params);
  if (result.changes === 0) return res.status(404).json({ error: "Task not found" });
  res.json({ ok: true });
});

// DELETE /api/tasks/:id
router.delete("/:id", (req, res) => {
  const db = getDb();
  const result = db.prepare("DELETE FROM task_status WHERE id = ?").run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: "Task not found" });
  res.json({ ok: true });
});

module.exports = router;
