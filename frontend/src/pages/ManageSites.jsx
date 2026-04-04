import { useState } from "react";
import api from "../api/index.js";
import { useSites } from "../context/SitesContext.jsx";

const COLOR_PRESETS = [
  "#E63946", "#2D6A4F", "#F4A261", "#4836FE", "#0EA5E9",
  "#8B5CF6", "#EC4899", "#10B981", "#F59E0B", "#EF4444",
  "#6366F1", "#14B8A6", "#F97316", "#84CC16", "#06B6D4",
];

const inputStyle = {
  width: "100%", padding: "8px 12px", fontSize: 13,
  border: "1px solid var(--border)", borderRadius: 8,
  background: "var(--bg-page)", color: "var(--text-primary)",
  outline: "none", boxSizing: "border-box", fontFamily: "inherit"
};

const EMPTY_FORM = { label: "", url: "", gsc_property: "", ga4_property_id: "", color: "#4836FE", sheets_tab_name: "" };

function SiteForm({ initial = EMPTY_FORM, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial);
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Site Name *</label>
          <input type="text" value={form.label} onChange={e => set("label", e.target.value)}
            placeholder="e.g. CARS24 New Cars" style={inputStyle} required />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Site URL *</label>
          <input type="url" value={form.url} onChange={e => set("url", e.target.value)}
            placeholder="https://www.example.com/" style={inputStyle} required />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>GSC Property URL</label>
          <input type="text" value={form.gsc_property} onChange={e => set("gsc_property", e.target.value)}
            placeholder="https://www.example.com" style={inputStyle} />
          <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>As it appears in Google Search Console</p>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>GA4 Property ID</label>
          <input type="text" value={form.ga4_property_id} onChange={e => set("ga4_property_id", e.target.value)}
            placeholder="123456789" style={inputStyle} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Google Sheets Tab Name</label>
          <input type="text" value={form.sheets_tab_name} onChange={e => set("sheets_tab_name", e.target.value)}
            placeholder="Auto-filled from site name" style={inputStyle} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Color</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {COLOR_PRESETS.map(c => (
              <button key={c} type="button" onClick={() => set("color", c)}
                style={{
                  width: 22, height: 22, borderRadius: "50%", background: c, border: "none",
                  cursor: "pointer", outline: form.color === c ? `3px solid ${c}` : "none",
                  outlineOffset: 2, transition: "outline 0.1s"
                }} />
            ))}
            <input type="color" value={form.color} onChange={e => set("color", e.target.value)}
              style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid var(--border)", cursor: "pointer", padding: 2 }} />
          </div>
        </div>
      </div>

      {/* Preview pill */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Preview:</span>
        <span style={{
          display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20,
          fontSize: 12, fontWeight: 600, border: `1px solid ${form.color}`,
          color: form.color, background: form.color + "15"
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: form.color, flexShrink: 0 }} />
          {form.label || "Site Name"}
        </span>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={() => onSave(form)}
          disabled={saving || !form.label || !form.url}
          className="btn btn-primary"
          style={{ opacity: saving || !form.label || !form.url ? 0.5 : 1 }}
        >
          {saving ? "Saving…" : "Save Site"}
        </button>
        <button onClick={onCancel} className="btn btn-surface">Cancel</button>
      </div>
    </div>
  );
}

export default function ManageSites() {
  const { sites, refetch } = useSites();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleAdd(form) {
    setSaving(true);
    setError(null);
    try {
      await api.post("/sites", form);
      refetch();
      setShowAdd(false);
      showToast("Site added successfully.");
    } catch (err) {
      setError(err.response?.data?.error ?? err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(id, form) {
    setSaving(true);
    setError(null);
    try {
      await api.put(`/sites/${id}`, form);
      refetch();
      setEditId(null);
      showToast("Site updated.");
    } catch (err) {
      setError(err.response?.data?.error ?? err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this site? All associated crawl data will remain but the site will be removed.")) return;
    setDeletingId(id);
    try {
      await api.delete(`/sites/${id}`);
      refetch();
      showToast("Site deleted.");
    } catch (err) {
      setError(err.response?.data?.error ?? err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div style={{ maxWidth: 900, display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24,
          background: "var(--text-primary)", color: "#fff",
          fontSize: 13, padding: "10px 18px", borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.15)", zIndex: 50
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 className="page-title">Manage Sites</h1>
          <p className="page-desc">Add, edit or remove sites. Each site maps to a crawl target and appears in the header.</p>
        </div>
        {!showAdd && (
          <button onClick={() => { setShowAdd(true); setEditId(null); setError(null); }} className="btn btn-primary">
            + Add Site
          </button>
        )}
      </div>

      {error && (
        <div style={{ padding: "10px 14px", background: "var(--critical-bg)", color: "var(--critical-text)", borderRadius: 8, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="card" style={{ padding: "20px 24px" }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>New Site</h2>
          <SiteForm onSave={handleAdd} onCancel={() => { setShowAdd(false); setError(null); }} saving={saving} />
        </div>
      )}

      {/* Empty state */}
      {sites.length === 0 && !showAdd && (
        <div className="card" style={{ padding: "60px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12, color: "var(--text-muted)" }}>⊡</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>No sites yet</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
            Add your first site to start crawling and tracking SEO issues.
          </div>
          <button onClick={() => setShowAdd(true)} className="btn btn-primary">+ Add Your First Site</button>
        </div>
      )}

      {/* Site list */}
      {sites.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sites.map((site) => {
            const color = site.color || "#6366F1";
            const isEditing = editId === site.id;
            return (
              <div key={site.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                {/* Site header row */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "16px 20px",
                  borderBottom: isEditing ? "1px solid var(--border)" : "none"
                }}>
                  {/* Color swatch */}
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: color, flexShrink: 0 }} />

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{site.label}</span>
                      <span style={{
                        fontSize: 10, padding: "1px 6px", borderRadius: 4,
                        background: "var(--bg-surface)", color: "var(--text-muted)",
                        fontFamily: "'JetBrains Mono', monospace"
                      }}>
                        {site.id}
                      </span>
                    </div>
                    <a href={site.url} target="_blank" rel="noreferrer"
                      style={{ fontSize: 12, color: "var(--brand)", textDecoration: "none" }}>
                      {site.url}
                    </a>
                    <div style={{ display: "flex", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
                      {site.gsc_property && (
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>GSC: {site.gsc_property}</span>
                      )}
                      {site.ga4_property_id && (
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>GA4: {site.ga4_property_id}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => { setEditId(isEditing ? null : site.id); setShowAdd(false); setError(null); }}
                      className="btn btn-surface" style={{ fontSize: 12 }}
                    >
                      {isEditing ? "Cancel" : "Edit"}
                    </button>
                    <button
                      onClick={() => handleDelete(site.id)}
                      disabled={deletingId === site.id}
                      className="btn btn-danger"
                      style={{ fontSize: 12, opacity: deletingId === site.id ? 0.6 : 1 }}
                    >
                      {deletingId === site.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>

                {/* Inline edit form */}
                {isEditing && (
                  <div style={{ padding: "16px 20px", background: "var(--bg-surface)" }}>
                    <SiteForm
                      initial={{
                        label: site.label ?? "",
                        url: site.url ?? "",
                        gsc_property: site.gsc_property ?? "",
                        ga4_property_id: site.ga4_property_id ?? "",
                        color: site.color ?? "#4836FE",
                        sheets_tab_name: site.sheets_tab_name ?? "",
                      }}
                      onSave={(form) => handleEdit(site.id, form)}
                      onCancel={() => { setEditId(null); setError(null); }}
                      saving={saving}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info box */}
      <div style={{ padding: "14px 18px", background: "var(--bg-surface)", borderRadius: 10, border: "1px solid var(--border)" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>How sites work</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.7 }}>
          Each site appears as a pill in the header. Clicking a pill switches the active site context for audit pages, GSC Overlay, and GA4. You can add unlimited sites — they are stored in the local SQLite database and seeded from your config on startup.
        </div>
      </div>
    </div>
  );
}
