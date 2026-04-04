const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { getDb } = require("../db/sqlite");

const router = express.Router();

// GET /api/sites — list all sites
router.get("/", (req, res) => {
  const db = getDb();
  const sites = db.prepare("SELECT * FROM sites ORDER BY created_at").all();
  res.json(sites);
});

// GET /api/sites/:id — single site
router.get("/:id", (req, res) => {
  const db = getDb();
  const site = db.prepare("SELECT * FROM sites WHERE id = ?").get(req.params.id);
  if (!site) return res.status(404).json({ error: "Site not found" });
  res.json(site);
});

// POST /api/sites — create site
router.post("/", (req, res) => {
  const { label, url, gsc_property, ga4_property_id, color, sheets_tab_name, project_id } = req.body;
  if (!label || !url) return res.status(400).json({ error: "label and url are required" });

  const db = getDb();
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  // Ensure unique ID
  const existing = db.prepare("SELECT id FROM sites WHERE id = ?").get(id);
  const finalId = existing ? `${id}-${uuidv4().slice(0, 6)}` : id;

  db.prepare(`
    INSERT INTO sites (id, label, url, gsc_property, ga4_property_id, color, sheets_tab_name, project_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(finalId, label.trim(), url.trim(), gsc_property || null, ga4_property_id || null,
    color || "#6366F1", sheets_tab_name || label.trim(), project_id || null);

  const site = db.prepare("SELECT * FROM sites WHERE id = ?").get(finalId);
  res.status(201).json(site);
});

// PUT /api/sites/:id — update site
router.put("/:id", (req, res) => {
  const { label, url, gsc_property, ga4_property_id, color, sheets_tab_name, project_id } = req.body;
  const db = getDb();
  const site = db.prepare("SELECT id FROM sites WHERE id = ?").get(req.params.id);
  if (!site) return res.status(404).json({ error: "Site not found" });

  db.prepare(`
    UPDATE sites SET
      label = COALESCE(?, label),
      url = COALESCE(?, url),
      gsc_property = COALESCE(?, gsc_property),
      ga4_property_id = COALESCE(?, ga4_property_id),
      color = COALESCE(?, color),
      sheets_tab_name = COALESCE(?, sheets_tab_name),
      project_id = COALESCE(?, project_id)
    WHERE id = ?
  `).run(
    label?.trim() || null, url?.trim() || null, gsc_property || null,
    ga4_property_id || null, color || null, sheets_tab_name || null,
    project_id || null, req.params.id
  );

  res.json(db.prepare("SELECT * FROM sites WHERE id = ?").get(req.params.id));
});

// DELETE /api/sites/:id — delete site
router.delete("/:id", (req, res) => {
  const db = getDb();
  const site = db.prepare("SELECT id FROM sites WHERE id = ?").get(req.params.id);
  if (!site) return res.status(404).json({ error: "Site not found" });
  db.prepare("DELETE FROM sites WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
