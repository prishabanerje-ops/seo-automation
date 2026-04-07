import { useEffect, useState } from "react";
import api from "../api/index.js";
import { useSites } from "../context/SitesContext.jsx";
import { useIntentionalRules } from "../context/IntentionalRulesContext.jsx";
import IntentionalRuleModal from "../components/IntentionalRuleModal.jsx";

const inputStyle = {
  width: "100%", padding: "8px 12px", fontSize: 13,
  border: "1px solid var(--border)", borderRadius: 8,
  background: "var(--bg-page)", color: "var(--text-primary)",
  outline: "none", boxSizing: "border-box", fontFamily: "inherit"
};

function Field({ label, type = "text", value, onChange, placeholder, hint, readOnly }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 4 }}>{label}</label>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} autoComplete="off" style={inputStyle}
        readOnly={readOnly}
      />
      {hint && <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{hint}</p>}
    </div>
  );
}

function SaveButton({ onClick, saving, saved }) {
  return (
    <button onClick={onClick} disabled={saving} className="btn btn-primary" style={{ opacity: saving ? 0.6 : 1 }}>
      {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
    </button>
  );
}

function TestButton({ onClick, label = "Test", testing, result }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <button onClick={onClick} disabled={testing} className="btn btn-surface" style={{ opacity: testing ? 0.6 : 1 }}>
        {testing ? "Testing…" : label}
      </button>
      {result && (
        <span style={{ fontSize: 12, color: result.ok ? "var(--pass)" : "var(--critical)", fontWeight: 500 }}>
          {result.ok ? "✓ Success" : "✗ " + result.error}
        </span>
      )}
    </div>
  );
}

function ConnectedBadge({ connected }) {
  return (
    <span style={{
      fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600,
      background: connected ? "#F0FDF4" : "var(--bg-surface)",
      color: connected ? "#15803D" : "var(--text-muted)",
      border: `1px solid ${connected ? "#BBF7D0" : "var(--border)"}`
    }}>
      {connected ? "Connected" : "Not connected"}
    </span>
  );
}

export default function Settings() {
  const { activeSiteId } = useSites();
  const { allRules, getRulesForSite, removeRule, updateRule, addRule } = useIntentionalRules();

  const [tab, setTab] = useState("gsc");
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [gscStatus, setGscStatus] = useState(null);
  const [testing, setTesting] = useState({});
  const [testResults, setTestResults] = useState({});

  // Linear tab state
  const [linearForm, setLinearForm] = useState({ apiKey: "", teamId: "", projectId: "" });
  const [linearStatus, setLinearStatus] = useState(null);
  const [linearSaving, setLinearSaving] = useState(false);
  const [linearSaved, setLinearSaved] = useState(false);
  const [linearDisconnecting, setLinearDisconnecting] = useState(false);

  // Rules tab state
  const [rulesSiteId, setRulesSiteId] = useState(activeSiteId || "");
  const [editRuleId, setEditRuleId] = useState(null);
  const [editRulePatch, setEditRulePatch] = useState({});
  const [addRuleOpen, setAddRuleOpen] = useState(false);
  const { sites } = useSites();

  useEffect(() => {
    api.get("/settings").then((r) => setForm(r.data)).catch(() => {});
    api.get("/gsc/status").then((r) => setGscStatus(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === "linear") {
      const sid = activeSiteId || "";
      api.get(`/linear/status/${sid}`).then(r => setLinearStatus(r.data)).catch(() => setLinearStatus({ connected: false }));
    }
  }, [tab, activeSiteId]);

  useEffect(() => {
    if (activeSiteId) setRulesSiteId(activeSiteId);
  }, [activeSiteId]);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function save(keys) {
    setSaving(true);
    const payload = {};
    for (const k of keys) payload[k] = form[k] ?? "";
    try {
      await api.post("/settings", payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert("Save failed: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function test(key, endpoint) {
    setTesting((t) => ({ ...t, [key]: true }));
    setTestResults((r) => ({ ...r, [key]: null }));
    try {
      await api.post(endpoint);
      setTestResults((r) => ({ ...r, [key]: { ok: true } }));
    } catch (err) {
      setTestResults((r) => ({ ...r, [key]: { ok: false, error: err.response?.data?.error ?? err.message } }));
    } finally {
      setTesting((t) => ({ ...t, [key]: false }));
    }
  }

  async function revokeGsc() {
    await api.post("/gsc/revoke").catch(() => {});
    setGscStatus({ authenticated: false });
  }

  // Linear
  async function saveLinear() {
    if (!linearForm.apiKey || !linearForm.teamId) return;
    setLinearSaving(true);
    try {
      const r = await api.post("/linear/connect", {
        apiKey: linearForm.apiKey,
        teamId: linearForm.teamId,
        linearProjectId: linearForm.projectId,
        projectId: activeSiteId || ""
      });
      setLinearStatus({ connected: true, teamId: linearForm.teamId, teamName: r.data?.team });
      setLinearSaved(true);
      setTimeout(() => setLinearSaved(false), 2000);
    } catch (err) {
      alert("Linear connection failed: " + (err.response?.data?.error || err.message));
    } finally {
      setLinearSaving(false);
    }
  }

  async function disconnectLinear() {
    setLinearDisconnecting(true);
    try {
      await api.delete(`/linear/disconnect/${activeSiteId || ""}`);
      setLinearStatus({ connected: false });
      setLinearForm({ apiKey: "", teamId: "", projectId: "" });
    } catch {}
    setLinearDisconnecting(false);
  }

  // Rules tab helpers
  const currentRules = getRulesForSite(rulesSiteId);

  function startEdit(rule) {
    setEditRuleId(rule.id);
    setEditRulePatch({ reason: rule.reason, scope: rule.scope, pattern: rule.pattern });
  }

  function saveEdit(siteId, id) {
    updateRule(siteId, id, editRulePatch);
    setEditRuleId(null);
  }

  const TABS = [
    { id: "gsc",    label: "GSC Auth" },
    { id: "sheets", label: "Sheets" },
    { id: "slack",  label: "Slack" },
    { id: "email",  label: "Email" },
    { id: "sf",     label: "SF License" },
    { id: "psi",    label: "PSI API" },
    { id: "linear", label: "Linear" },
    { id: "rules",  label: "Intentional Rules" },
  ];

  return (
    <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-desc">Configure integrations and credentials.</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "8px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer",
            background: "none", border: "none",
            borderBottom: `2px solid ${tab === t.id ? "var(--brand)" : "transparent"}`,
            color: tab === t.id ? "var(--brand)" : "var(--text-muted)",
            transition: "all 0.15s", whiteSpace: "nowrap"
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── GSC Auth ── */}
      {tab === "gsc" && (
        <div className="card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>Google Search Console OAuth</h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Required for GSC Overlay. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "var(--bg-surface)", borderRadius: 10, border: "1px solid var(--border)" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: gscStatus?.authenticated ? "var(--pass)" : "var(--border-strong)", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{gscStatus?.authenticated ? "Connected" : "Not connected"}</div>
              {gscStatus?.email && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{gscStatus.email}</div>}
            </div>
            {gscStatus?.authenticated ? (
              <button onClick={revokeGsc} className="btn btn-danger" style={{ fontSize: 12 }}>Disconnect</button>
            ) : (
              <a href="/api/gsc/auth" className="btn btn-primary" style={{ textDecoration: "none", fontSize: 13 }}>Connect Google Account</a>
            )}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", background: "var(--bg-surface)", borderRadius: 8, padding: "12px 14px", lineHeight: 1.8 }}>
            <div style={{ fontWeight: 500, color: "var(--text-secondary)", marginBottom: 4 }}>Setup steps:</div>
            <div>1. Go to Google Cloud Console → Create OAuth 2.0 credentials</div>
            <div>2. Add <code style={{ color: "var(--text-primary)", background: "var(--bg-raised)", padding: "1px 4px", borderRadius: 4 }}>http://localhost:3001/api/gsc/callback</code> as authorised redirect URI</div>
            <div>3. Copy Client ID and Secret to your .env file</div>
            <div>4. Restart the backend, then click Connect</div>
          </div>
        </div>
      )}

      {/* ── Sheets ── */}
      {tab === "sheets" && (
        <div className="card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>Google Sheets Export</h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Uses the same Google account as GSC. Connect GSC first.</p>
          </div>
          <Field label="Spreadsheet ID" value={form.sheets_spreadsheet_id ?? ""} onChange={(v) => set("sheets_spreadsheet_id", v)}
            placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
            hint="Found in the spreadsheet URL: docs.google.com/spreadsheets/d/[ID]/edit" />
          <div><SaveButton onClick={() => save(["sheets_spreadsheet_id"])} saving={saving} saved={saved} /></div>
        </div>
      )}

      {/* ── Slack ── */}
      {tab === "slack" && (
        <div className="card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>Slack Webhook</h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Sends a summary after each completed crawl, and allows sharing Claude suggestions.</p>
          </div>
          <Field label="Webhook URL" value={form.slack_webhook_url ?? ""} onChange={(v) => set("slack_webhook_url", v)}
            placeholder="https://hooks.slack.com/services/..."
            hint="Create an Incoming Webhook in your Slack App settings." />
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <SaveButton onClick={() => save(["slack_webhook_url"])} saving={saving} saved={saved} />
            <TestButton label="Send test message" onClick={() => test("slack", "/notify/slack/test")} testing={testing.slack} result={testResults.slack} />
          </div>
        </div>
      )}

      {/* ── Email ── */}
      {tab === "email" && (
        <div className="card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>Email Reports (SMTP)</h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Sends an HTML report after each completed crawl.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="SMTP Host" value={form.smtp_host ?? ""} onChange={(v) => set("smtp_host", v)} placeholder="smtp.gmail.com" />
            <Field label="SMTP Port" value={form.smtp_port ?? ""} onChange={(v) => set("smtp_port", v)} placeholder="587" />
            <Field label="SMTP User" value={form.smtp_user ?? ""} onChange={(v) => set("smtp_user", v)} placeholder="you@gmail.com" />
            <Field label="SMTP Password" type="password" value={form.smtp_pass ?? ""} onChange={(v) => set("smtp_pass", v)} placeholder="••••••••" />
            <Field label="From Address" value={form.email_from ?? ""} onChange={(v) => set("email_from", v)} placeholder="seo@yourcompany.com" />
            <Field label="To Address" value={form.email_to ?? ""} onChange={(v) => set("email_to", v)} placeholder="team@yourcompany.com" />
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <SaveButton onClick={() => save(["smtp_host","smtp_port","smtp_user","smtp_pass","email_from","email_to"])} saving={saving} saved={saved} />
            <TestButton label="Test connection" onClick={() => test("email", "/notify/email/test")} testing={testing.email} result={testResults.email} />
          </div>
        </div>
      )}

      {/* ── SF License ── */}
      {tab === "sf" && (
        <div className="card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>Screaming Frog License Key</h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Optional. Removes the 500 URL crawl limit.</p>
          </div>
          <Field label="License Key" type="password" value={form.sf_license_key ?? ""} onChange={(v) => set("sf_license_key", v)} placeholder="XXXX-XXXX-XXXX-XXXX" />
          <div><SaveButton onClick={() => save(["sf_license_key"])} saving={saving} saved={saved} /></div>
        </div>
      )}

      {/* ── PSI ── */}
      {tab === "psi" && (
        <div className="card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>PageSpeed Insights API Key</h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Free API key from Google Cloud Console. Without a key, rate limits are very low.</p>
          </div>
          <Field label="API Key" type="password" value={form.psi_api_key ?? ""} onChange={(v) => set("psi_api_key", v)}
            placeholder="AIza..." hint="Enable the PageSpeed Insights API in your Google Cloud project." />
          <div><SaveButton onClick={() => save(["psi_api_key"])} saving={saving} saved={saved} /></div>
        </div>
      )}

      {/* ── Linear ── */}
      {tab === "linear" && (
        <div className="card" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>Linear Integration</h2>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Connect Linear to create issues directly from audit findings and Claude suggestions.
              </p>
            </div>
            {linearStatus && <ConnectedBadge connected={linearStatus.connected} />}
          </div>

          {linearStatus?.connected ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{
                padding: "14px 16px", background: "#F0FDF4", border: "1px solid #BBF7D0",
                borderRadius: 10, display: "flex", alignItems: "center", gap: 12
              }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22C55E", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#15803D" }}>Connected to Linear</div>
                  {linearStatus.teamId && <div style={{ fontSize: 12, color: "#16A34A" }}>Team: {linearStatus.teamId}</div>}
                </div>
                <button
                  onClick={disconnectLinear}
                  disabled={linearDisconnecting}
                  className="btn btn-danger"
                  style={{ fontSize: 12 }}
                >
                  {linearDisconnecting ? "Disconnecting…" : "Disconnect"}
                </button>
              </div>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Linear is connected. You can create issues from any audit row using the ✦ Ask Claude button, or from the filter bar with ＋ Linear.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field
                label="API Key"
                type="password"
                value={linearForm.apiKey}
                onChange={v => setLinearForm(f => ({ ...f, apiKey: v }))}
                placeholder="lin_api_..."
                hint="Generate a personal API key in Linear → Settings → API."
              />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Field
                  label="Default Team ID"
                  value={linearForm.teamId}
                  onChange={v => setLinearForm(f => ({ ...f, teamId: v }))}
                  placeholder="TEAM_ID"
                  hint="Found in your team's Linear URL."
                />
                <Field
                  label="Default Project ID (optional)"
                  value={linearForm.projectId}
                  onChange={v => setLinearForm(f => ({ ...f, projectId: v }))}
                  placeholder="PROJECT_ID"
                />
              </div>
              {activeSiteId && (
                <p style={{ fontSize: 11, color: "var(--text-muted)", padding: "8px 12px", background: "var(--bg-surface)", borderRadius: 7 }}>
                  This connection will apply to site: <strong>{activeSiteId}</strong>. Switch the active site in the header to configure Linear for other sites.
                </p>
              )}
              <div>
                <button
                  onClick={saveLinear}
                  disabled={linearSaving || !linearForm.apiKey || !linearForm.teamId}
                  className="btn btn-primary"
                  style={{ opacity: (linearSaving || !linearForm.apiKey || !linearForm.teamId) ? 0.5 : 1 }}
                >
                  {linearSaving ? "Connecting…" : linearSaved ? "Connected ✓" : "Connect Linear"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Intentional Rules ── */}
      {tab === "rules" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Intentional Rules</h2>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                Issues matching these rules are auto-suppressed from error counts and moved to a separate section.
              </p>
            </div>
            <button onClick={() => setAddRuleOpen(true)} className="btn btn-primary" style={{ fontSize: 13 }}>
              + Add Custom Rule
            </button>
          </div>

          {/* Site selector for rules */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Viewing rules for:</span>
            <select
              value={rulesSiteId}
              onChange={e => setRulesSiteId(e.target.value)}
              style={{ padding: "6px 10px", fontSize: 13, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-page)", color: "var(--text-primary)", outline: "none" }}
            >
              {sites.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>

          {currentRules.length === 0 ? (
            <div className="card" style={{ padding: "40px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 10, color: "var(--text-muted)" }}>⚑</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>No rules yet</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Rules are created from audit rows (⚑ button) or manually here.
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "var(--bg-surface)" }}>
                    {["Issue Type", "Scope", "Pattern", "Reason", "Date Added", "Actions"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {currentRules.map(rule => (
                    <tr key={rule.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 14px", fontWeight: 500, color: "var(--text-primary)" }}>{rule.issue_type}</td>
                      <td style={{ padding: "10px 14px", color: "var(--text-secondary)", textTransform: "capitalize" }}>{rule.scope}</td>
                      <td style={{ padding: "10px 14px", color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                        {rule.scope === "all" ? "—" : rule.pattern || "—"}
                      </td>
                      <td style={{ padding: "10px 14px", color: "var(--text-secondary)", maxWidth: 200 }}>
                        {editRuleId === rule.id ? (
                          <input
                            value={editRulePatch.reason || ""}
                            onChange={e => setEditRulePatch(p => ({ ...p, reason: e.target.value }))}
                            style={{ padding: "4px 8px", fontSize: 12, border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg-page)", color: "var(--text-primary)", outline: "none", width: "100%" }}
                          />
                        ) : (
                          <span style={{ fontSize: 12 }}>{rule.reason || <em style={{ color: "var(--text-muted)" }}>No reason</em>}</span>
                        )}
                      </td>
                      <td style={{ padding: "10px 14px", color: "var(--text-muted)", fontSize: 11, whiteSpace: "nowrap" }}>
                        {new Date(rule.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          {editRuleId === rule.id ? (
                            <>
                              <button onClick={() => saveEdit(rulesSiteId, rule.id)} className="btn btn-primary" style={{ fontSize: 11, padding: "3px 10px" }}>Save</button>
                              <button onClick={() => setEditRuleId(null)} className="btn btn-surface" style={{ fontSize: 11, padding: "3px 10px" }}>Cancel</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => startEdit(rule)} className="btn btn-surface" style={{ fontSize: 11, padding: "3px 10px" }}>Edit</button>
                              <button onClick={() => removeRule(rulesSiteId, rule.id)} className="btn btn-danger" style={{ fontSize: 11, padding: "3px 10px" }}>Remove</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Custom Rule Modal */}
      {addRuleOpen && (
        <IntentionalRuleModal
          row={null}
          onSave={(rule) => { addRule(rulesSiteId, rule); setAddRuleOpen(false); }}
          onClose={() => setAddRuleOpen(false)}
        />
      )}
    </div>
  );
}
