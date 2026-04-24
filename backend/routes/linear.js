const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { getDb } = require("../db/sqlite");

const router = express.Router();

function getLinearKey(projectId) {
  const db = getDb();
  // Try site-specific first, then global (""), then env
  let conn = db.prepare("SELECT api_key_enc FROM linear_connections WHERE project_id = ? LIMIT 1").get(projectId || "");
  if (!conn && projectId) {
    conn = db.prepare("SELECT api_key_enc FROM linear_connections WHERE project_id = '' LIMIT 1").get();
  }
  return conn?.api_key_enc || process.env.LINEAR_API_KEY || null;
}

// POST /api/linear/connect
router.post("/connect", async (req, res) => {
  const { apiKey, teamId, linearProjectId, defaultAssignee, projectId } = req.body;
  if (!apiKey || !teamId) return res.status(400).json({ error: "apiKey and teamId required" });

  // Verify key works
  try {
    const resp = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": apiKey },
      body: JSON.stringify({ query: "{ team(id: \"" + teamId + "\") { name } }" })
    });
    const data = await resp.json();
    if (data.errors) return res.status(400).json({ error: data.errors[0].message });

    const db = getDb();
    const id = uuidv4();
    db.prepare(`INSERT OR REPLACE INTO linear_connections
      (id, project_id, api_key_enc, team_id, linear_project_id, default_assignee)
      VALUES (?, ?, ?, ?, ?, ?)`)
      .run(id, projectId || "", apiKey, teamId, linearProjectId || "", defaultAssignee || "");

    res.json({ ok: true, team: data.data?.team?.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/linear/status/:projectId
router.get("/status/:projectId", (req, res) => {
  const db = getDb();
  const conn = db.prepare("SELECT * FROM linear_connections WHERE project_id = ?").get(req.params.projectId);
  if (!conn) return res.json({ connected: false });
  res.json({ connected: true, teamId: conn.team_id });
});

// POST /api/linear/ticket  — create ticket from issue
router.post("/ticket", async (req, res) => {
  const { projectId, auditResultId, title, description, priority = 2 } = req.body;
  if (!title) return res.status(400).json({ error: "title required" });

  const apiKey = getLinearKey(projectId);
  if (!apiKey) return res.status(400).json({ error: "Linear not connected" });

  const db = getDb();
  const conn = db.prepare("SELECT * FROM linear_connections WHERE project_id = ?").get(projectId || "");
  if (!conn) return res.status(400).json({ error: "Linear not connected for this project" });

  // Priority map: PRD Critical→Urgent(1), Warning→High(2), Info→Medium(3)
  const priorityMap = { 0: 1, 1: 2, 2: 3, 3: 4 };

  try {
    const mutation = `
      mutation CreateIssue($title: String!, $description: String, $teamId: String!, $priority: Int) {
        issueCreate(input: { title: $title, description: $description, teamId: $teamId, priority: $priority }) {
          issue { id url identifier title }
        }
      }
    `;

    const resp = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": conn.api_key_enc },
      body: JSON.stringify({ query: mutation, variables: { title, description: description || "", teamId: conn.team_id, priority } })
    });

    const data = await resp.json();
    if (data.errors) return res.status(400).json({ error: data.errors[0].message });

    const issue = data.data?.issueCreate?.issue;
    if (!issue) return res.status(500).json({ error: "Failed to create issue" });

    // Save to DB
    if (auditResultId) {
      db.prepare("INSERT INTO linear_tickets (id, audit_result_id, linear_issue_id, linear_url, created_by) VALUES (?, ?, ?, ?, ?)")
        .run(uuidv4(), auditResultId, issue.id, issue.url, req.user?.sub || "anon");
    }

    res.json({ ok: true, issue });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/linear/disconnect/:projectId
router.delete("/disconnect/:projectId", (req, res) => {
  const db = getDb();
  db.prepare("DELETE FROM linear_connections WHERE project_id = ?").run(req.params.projectId);
  res.json({ ok: true });
});

// GET /api/linear/ticket/:auditResultId
router.get("/ticket/:auditResultId", (req, res) => {
  const db = getDb();
  const ticket = db.prepare("SELECT * FROM linear_tickets WHERE audit_result_id = ?").get(req.params.auditResultId);
  if (!ticket) return res.status(404).json({ error: "No ticket for this issue" });
  res.json(ticket);
});

module.exports = router;
