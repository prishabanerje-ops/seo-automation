import { useEffect, useState } from "react";
import api from "../api/index.js";
import { useSites } from "../context/SitesContext.jsx";

const PRESETS = [
  { label: "Daily 2am",   desc: "Every day at 2:00 AM",    cron: "0 2 * * *" },
  { label: "Daily 6am",   desc: "Every day at 6:00 AM",    cron: "0 6 * * *" },
  { label: "Mon 3am",     desc: "Every Monday at 3:00 AM", cron: "0 3 * * 1" },
  { label: "Sun 2am",     desc: "Every Sunday at 2:00 AM", cron: "0 2 * * 0" },
  { label: "Custom",      desc: "Set your own cron",       cron: "" },
];

const CRON_LABELS = {
  "0 2 * * *": "Daily at 2:00 AM",
  "0 6 * * *": "Daily at 6:00 AM",
  "0 3 * * 1": "Every Monday at 3:00 AM",
  "0 2 * * 0": "Every Sunday at 2:00 AM",
};

function humanCron(expr) {
  return CRON_LABELS[expr] || expr;
}

function formatDate(ts) {
  if (!ts) return null;
  return new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// Inline toggle switch
function ToggleSwitch({ checked, onChange, label }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
      <span onClick={() => onChange(!checked)} style={{
        position: "relative", width: 36, height: 20, flexShrink: 0,
        background: checked ? "var(--brand)" : "var(--border)",
        borderRadius: 10, transition: "background 0.15s", display: "inline-block"
      }}>
        <span style={{
          position: "absolute", top: 3, left: checked ? 19 : 3,
          width: 14, height: 14, borderRadius: "50%", background: "#fff",
          transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
        }} />
      </span>
      {label && <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{label}</span>}
    </label>
  );
}

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

  function setField(key, value) { setFormState(f => ({ ...f, [key]: value })); }

  function toggleSite(id) {
    setFormState(f => ({
      ...f,
      site_ids: f.site_ids.includes(id) ? f.site_ids.filter(s => s !== id) : [...f.site_ids, id]
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
    setSchedules(prev => prev.map(s => s.id === schedule.id ? { ...s, enabled: !s.enabled } : s));
  }

  async function handleDelete(id) {
    if (!confirm("Delete this schedule?")) return;
    await api.delete(`/schedules/${id}`).catch(() => {});
    setSchedules(prev => prev.filter(s => s.id !== id));
    toast("Schedule deleted.");
  }

  async function handleRunNow(schedule) {
    setRunningId(schedule.id);
    try {
      await api.post(`/schedules/${schedule.id}/run`);
      toast("Crawl started.");
    } catch (err) {
      toast("Error: " + (err.response?.data?.error ?? err.message));
    } finally {
      setRunningId(null);
    }
  }

  function getSiteObjects(siteIds) {
    const ids = typeof siteIds === "string" ? JSON.parse(siteIds) : siteIds;
    return ids.map(id => SITES.find(s => s.id === id)).filter(Boolean);
  }

  const isCustom = !PRESETS.find(p => p.cron && p.cron === form.preset);

  return (
    <div style={{ maxWidth: 700, display: "flex", flexDirection: "column", gap: 20 }}>
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
        <button
          onClick={() => setShowForm(v => !v)}
          className={showForm ? "btn btn-surface" : "btn btn-primary"}
        >
          {showForm ? "Cancel" : "+ New Schedule"}
        </button>
      </div>

      {/* ── Create form ── */}
      {showForm && (
        <div className="card" style={{ padding: "22px 24px" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 20 }}>New Schedule</div>
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Sites */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
                Sites to crawl
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {SITES.map(site => {
                  const active = form.site_ids.includes(site.id);
                  return (
                    <button key={site.id} type="button" onClick={() => toggleSite(site.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "5px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500,
                        cursor: "pointer", transition: "all 0.15s",
                        border: `1px solid ${active ? site.color : "var(--border)"}`,
                        background: active ? (site.color + "18") : "transparent",
                        color: active ? site.color : "var(--text-muted)"
                      }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: active ? site.color : "var(--border)", flexShrink: 0 }} />
                      {site.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Frequency */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
                Frequency
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                {PRESETS.map(p => {
                  const active = p.cron ? form.preset === p.cron : isCustom || form.preset === "";
                  return (
                    <button key={p.label} type="button"
                      onClick={() => {
                        setField("preset", p.cron || "custom");
                        if (p.cron) setField("cron_expression", p.cron);
                        else setField("cron_expression", "");
                      }}
                      style={{
                        padding: "10px 8px", borderRadius: 10, cursor: "pointer",
                        border: `1px solid ${active ? "var(--brand)" : "var(--border)"}`,
                        background: active ? "var(--brand)" : "var(--bg-surface)",
                        color: active ? "#fff" : "var(--text-secondary)",
                        transition: "all 0.15s", textAlign: "center"
                      }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{p.label}</div>
                      <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>{p.desc}</div>
                    </button>
                  );
                })}
              </div>

              {/* Custom cron input */}
              {(isCustom || form.preset === "custom" || form.preset === "") && (
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                  <input
                    type="text"
                    value={form.cron_expression}
                    onChange={e => { setField("cron_expression", e.target.value); setField("preset", "custom"); }}
                    placeholder="0 2 * * *"
                    style={{
                      padding: "7px 12px", fontSize: 13, width: 160,
                      border: "1px solid var(--border)", borderRadius: 8,
                      background: "var(--bg-page)", color: "var(--text-primary)",
                      outline: "none", fontFamily: "'JetBrains Mono', monospace"
                    }}
                  />
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>min · hour · day · month · weekday</span>
                </div>
              )}
            </div>

            {/* Notifications */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10 }}>
                Notify on completion
              </div>
              <div style={{ display: "flex", gap: 20 }}>
                <ToggleSwitch checked={form.notify_slack} onChange={v => setField("notify_slack", v)} label="Slack" />
                <ToggleSwitch checked={form.notify_email} onChange={v => setField("notify_email", v)} label="Email" />
              </div>
            </div>

            <div>
              <button type="submit" disabled={submitting} className="btn btn-primary"
                style={{ opacity: submitting ? 0.6 : 1 }}>
                {submitting ? "Creating…" : "Create Schedule"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Schedule list ── */}
      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>Loading…</div>
      ) : schedules.length === 0 ? (
        <div className="card" style={{ padding: "48px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 10, color: "var(--text-muted)" }}>⏱</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>No schedules yet</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Create one to automate your audits.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {schedules.map(s => {
            const sitesInSchedule = getSiteObjects(s.site_ids);
            return (
              <div key={s.id} className="card" style={{ padding: "16px 20px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  {/* Left: info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Title row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                        {humanCron(s.cron_expression)}
                      </span>
                      <span style={{
                        fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600,
                        background: s.enabled ? "#F0FDF4" : "var(--bg-surface)",
                        color: s.enabled ? "#15803D" : "var(--text-muted)",
                        border: `1px solid ${s.enabled ? "#BBF7D0" : "var(--border)"}`
                      }}>
                        {s.enabled ? "Active" : "Paused"}
                      </span>
                      {s.notify_slack && (
                        <span style={{ fontSize: 11, color: "var(--text-muted)", padding: "2px 7px", borderRadius: 20, border: "1px solid var(--border)" }}>Slack</span>
                      )}
                      {s.notify_email && (
                        <span style={{ fontSize: 11, color: "var(--text-muted)", padding: "2px 7px", borderRadius: 20, border: "1px solid var(--border)" }}>Email</span>
                      )}
                    </div>

                    {/* Site pills */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                      {sitesInSchedule.map(site => (
                        <span key={site.id} style={{
                          display: "flex", alignItems: "center", gap: 5,
                          padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 500,
                          border: `1px solid ${site.color}30`,
                          background: site.color + "12", color: site.color
                        }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: site.color }} />
                          {site.label}
                        </span>
                      ))}
                      {sitesInSchedule.length === 0 && (
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>No sites</span>
                      )}
                    </div>

                    {/* Meta */}
                    <div style={{ display: "flex", gap: 16 }}>
                      {s.last_run && (
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          Last run: {formatDate(s.last_run)}
                        </span>
                      )}
                      <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>
                        {s.cron_expression}
                      </span>
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, paddingTop: 2 }}>
                    {/* Enabled toggle */}
                    <ToggleSwitch checked={!!s.enabled} onChange={() => toggleEnabled(s)} />

                    <button onClick={() => handleRunNow(s)} disabled={runningId === s.id}
                      className="btn btn-surface"
                      style={{ fontSize: 12, opacity: runningId === s.id ? 0.6 : 1, padding: "5px 12px" }}>
                      {runningId === s.id ? "…" : "▶ Run"}
                    </button>

                    <button onClick={() => handleDelete(s.id)} className="btn btn-danger"
                      style={{ fontSize: 12, padding: "5px 10px" }}>
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
