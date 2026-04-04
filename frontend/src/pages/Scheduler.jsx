import { useEffect, useState } from "react";
import api from "../api/index.js";
import { useSites } from "../context/SitesContext.jsx";

const PRESETS = [
  { label: "Daily at 2am",   cron: "0 2 * * *" },
  { label: "Daily at 6am",   cron: "0 6 * * *" },
  { label: "Weekly Mon 3am", cron: "0 3 * * 1" },
  { label: "Weekly Sun 2am", cron: "0 2 * * 0" },
  { label: "Custom",         cron: "" }
];

const inputStyle = {
  padding: "7px 12px", fontSize: 13, border: "1px solid var(--border)", borderRadius: 8,
  background: "var(--bg-page)", color: "var(--text-primary)", outline: "none", fontFamily: "inherit"
};

export default function Scheduler() {
  const { sites: SITES } = useSites();
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setFormState] = useState({
    site_ids: [],
    preset: "0 2 * * *",
    cron_expression: "0 2 * * *",
    notify_slack: false,
    notify_email: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [runningId, setRunningId] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);

  // Pre-select all sites when they load
  useEffect(() => {
    if (SITES.length) setFormState(f => ({ ...f, site_ids: SITES.map(s => s.id) }));
  }, [SITES.length]);

  useEffect(() => { loadSchedules(); }, []);

  async function loadSchedules() {
    setLoading(true);
    try {
      const r = await api.get("/schedules");
      setSchedules(r.data);
    } catch {}
    setLoading(false);
  }

  function toast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  }

  function setField(key, value) { setFormState((f) => ({ ...f, [key]: value })); }

  function toggleSite(id) {
    setFormState((f) => ({
      ...f,
      site_ids: f.site_ids.includes(id) ? f.site_ids.filter((s) => s !== id) : [...f.site_ids, id]
    }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.site_ids.length) return toast("Select at least one site.");
    if (!form.cron_expression) return toast("Enter a cron expression.");
    setSubmitting(true);
    try {
      await api.post("/schedules", {
        site_ids: form.site_ids,
        cron_expression: form.cron_expression,
        notify_slack: form.notify_slack,
        notify_email: form.notify_email,
        enabled: 1
      });
      setShowForm(false);
      toast("Schedule created.");
      loadSchedules();
    } catch (err) {
      toast("Error: " + (err.response?.data?.error ?? err.message));
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleEnabled(schedule) {
    await api.put(`/schedules/${schedule.id}`, { enabled: !schedule.enabled }).catch(() => {});
    setSchedules((prev) => prev.map((s) => (s.id === schedule.id ? { ...s, enabled: !s.enabled } : s)));
  }

  async function handleDelete(id) {
    if (!confirm("Delete this schedule?")) return;
    await api.delete(`/schedules/${id}`).catch(() => {});
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    toast("Schedule deleted.");
  }

  async function handleRunNow(schedule) {
    setRunningId(schedule.id);
    try {
      await api.post(`/schedules/${schedule.id}/run`);
      toast("Crawl started for schedule.");
    } catch (err) {
      toast("Error: " + (err.response?.data?.error ?? err.message));
    } finally {
      setRunningId(null);
    }
  }

  function describeSites(siteIds) {
    const ids = typeof siteIds === "string" ? JSON.parse(siteIds) : siteIds;
    return ids.map((id) => SITES.find((s) => s.id === id)?.label ?? id).join(", ");
  }

  return (
    <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Toast */}
      {toastMsg && (
        <div style={{
          position: "fixed", bottom: 24, right: 24,
          background: "var(--text-primary)", color: "#fff",
          fontSize: 13, padding: "10px 18px", borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.15)", zIndex: 50
        }}>
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 className="page-title">Scheduler</h1>
          <p className="page-desc">Automate recurring crawls with cron schedules.</p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className={showForm ? "btn btn-surface" : "btn btn-primary"}>
          {showForm ? "Cancel" : "+ New Schedule"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card" style={{ padding: "20px 24px" }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>New Schedule</h2>
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Sites */}
            <div>
              <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>Sites to crawl</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
                {SITES.map((site) => (
                  <label key={site.id} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", userSelect: "none" }}>
                    <input type="checkbox" checked={form.site_ids.includes(site.id)} onChange={() => toggleSite(site.id)} />
                    <span style={{ fontSize: 13, color: site.color, fontWeight: 500 }}>{site.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Frequency */}
            <div>
              <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>Frequency</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {PRESETS.map((p) => {
                  const active = form.preset === (p.cron || "custom");
                  return (
                    <button key={p.label} type="button"
                      onClick={() => { setField("preset", p.cron || "custom"); if (p.cron) setField("cron_expression", p.cron); }}
                      style={{
                        padding: "5px 12px", fontSize: 12, borderRadius: 8, cursor: "pointer",
                        border: `1px solid ${active ? "var(--brand)" : "var(--border)"}`,
                        background: active ? "var(--brand)" : "transparent",
                        color: active ? "#fff" : "var(--text-secondary)", transition: "all 0.15s"
                      }}>
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cron expression */}
            <div>
              <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Cron expression</label>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="text" value={form.cron_expression}
                  onChange={(e) => { setField("cron_expression", e.target.value); setField("preset", "custom"); }}
                  placeholder="0 2 * * *"
                  style={{ ...inputStyle, width: 160, fontFamily: "'JetBrains Mono', monospace" }}
                />
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>min hour day month weekday</span>
              </div>
            </div>

            {/* Notifications */}
            <div>
              <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>Notify on completion</label>
              <div style={{ display: "flex", gap: 16 }}>
                {[{ key: "notify_slack", label: "Slack" }, { key: "notify_email", label: "Email" }].map(({ key, label }) => (
                  <label key={key} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, color: "var(--text-secondary)" }}>
                    <input type="checkbox" checked={form[key]} onChange={(e) => setField(key, e.target.checked)} />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <button type="submit" disabled={submitting} className="btn btn-primary" style={{ opacity: submitting ? 0.6 : 1 }}>
                {submitting ? "Creating…" : "Create Schedule"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Schedule list */}
      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>Loading…</div>
      ) : schedules.length === 0 ? (
        <div className="card" style={{ padding: "40px 24px", textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>
          No schedules yet. Create one to automate your audits.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {schedules.map((s) => (
            <div key={s.id} className="card" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>
                    {s.cron_expression}
                  </span>
                  <span style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600,
                    background: s.enabled ? "#F0FDF4" : "var(--bg-surface)",
                    color: s.enabled ? "#15803D" : "var(--text-muted)",
                    border: `1px solid ${s.enabled ? "#BBF7D0" : "var(--border)"}`
                  }}>
                    {s.enabled ? "Active" : "Paused"}
                  </span>
                  {s.notify_slack && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Slack</span>}
                  {s.notify_email && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Email</span>}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {describeSites(s.site_ids)}
                </div>
                {s.last_run && (
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    Last run: {new Date(s.last_run).toLocaleString()}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <button onClick={() => handleRunNow(s)} disabled={runningId === s.id}
                  className="btn btn-surface" style={{ fontSize: 12, opacity: runningId === s.id ? 0.6 : 1 }}>
                  {runningId === s.id ? "Starting…" : "Run now"}
                </button>
                <button onClick={() => toggleEnabled(s)} className="btn btn-surface" style={{ fontSize: 12 }}>
                  {s.enabled ? "Pause" : "Enable"}
                </button>
                <button onClick={() => handleDelete(s.id)} className="btn btn-danger" style={{ fontSize: 12 }}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
