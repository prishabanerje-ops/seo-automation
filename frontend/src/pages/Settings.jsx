import { useEffect, useState } from "react";
import api from "../api/index.js";

const inputStyle = {
  width: "100%", padding: "8px 12px", fontSize: 13,
  border: "1px solid var(--border)", borderRadius: 8,
  background: "var(--bg-page)", color: "var(--text-primary)",
  outline: "none", boxSizing: "border-box", fontFamily: "inherit"
};

function Field({ label, type = "text", value, onChange, placeholder, hint }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 4 }}>{label}</label>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} autoComplete="off" style={inputStyle}
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

export default function Settings() {
  const [tab, setTab] = useState("gsc");
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [gscStatus, setGscStatus] = useState(null);
  const [testing, setTesting] = useState({});
  const [testResults, setTestResults] = useState({});

  useEffect(() => {
    api.get("/settings").then((r) => setForm(r.data)).catch(() => {});
    api.get("/gsc/status").then((r) => setGscStatus(r.data)).catch(() => {});
  }, []);

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

  const TABS = [
    { id: "gsc",    label: "GSC Auth" },
    { id: "sheets", label: "Sheets" },
    { id: "slack",  label: "Slack" },
    { id: "email",  label: "Email" },
    { id: "sf",     label: "SF License" },
    { id: "psi",    label: "PSI API" },
  ];

  return (
    <div style={{ maxWidth: 640, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-desc">Configure integrations and credentials.</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "8px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer",
              background: "none", border: "none",
              borderBottom: `2px solid ${tab === t.id ? "var(--brand)" : "transparent"}`,
              color: tab === t.id ? "var(--brand)" : "var(--text-muted)",
              transition: "all 0.15s"
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: "24px 24px", display: "flex", flexDirection: "column", gap: 18 }}>

        {/* GSC Auth */}
        {tab === "gsc" && (
          <>
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>Google Search Console OAuth</h2>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Required for GSC Overlay. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file, then connect below.
              </p>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
              background: "var(--bg-surface)", borderRadius: 10, border: "1px solid var(--border)"
            }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: gscStatus?.authenticated ? "var(--pass)" : "var(--border-strong)", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
                  {gscStatus?.authenticated ? "Connected" : "Not connected"}
                </div>
                {gscStatus?.email && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{gscStatus.email}</div>}
              </div>
              {gscStatus?.authenticated ? (
                <button onClick={revokeGsc} className="btn btn-danger" style={{ fontSize: 12 }}>Disconnect</button>
              ) : (
                <a href="/api/gsc/auth" className="btn btn-primary" style={{ textDecoration: "none", fontSize: 13 }}>
                  Connect Google Account
                </a>
              )}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", background: "var(--bg-surface)", borderRadius: 8, padding: "12px 14px", lineHeight: 1.8 }}>
              <div style={{ fontWeight: 500, color: "var(--text-secondary)", marginBottom: 4 }}>Setup steps:</div>
              <div>1. Go to Google Cloud Console → Create OAuth 2.0 credentials</div>
              <div>2. Add <code style={{ color: "var(--text-primary)", background: "var(--bg-raised)", padding: "1px 4px", borderRadius: 4 }}>http://localhost:3001/api/gsc/callback</code> as authorised redirect URI</div>
              <div>3. Copy Client ID and Secret to your .env file</div>
              <div>4. Restart the backend, then click Connect</div>
            </div>
          </>
        )}

        {/* Sheets */}
        {tab === "sheets" && (
          <>
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>Google Sheets Export</h2>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Uses the same Google account as GSC. Connect GSC first.</p>
            </div>
            <Field
              label="Spreadsheet ID"
              value={form.sheets_spreadsheet_id ?? ""}
              onChange={(v) => set("sheets_spreadsheet_id", v)}
              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
              hint="Found in the spreadsheet URL: docs.google.com/spreadsheets/d/[ID]/edit"
            />
            <div><SaveButton onClick={() => save(["sheets_spreadsheet_id"])} saving={saving} saved={saved} /></div>
          </>
        )}

        {/* Slack */}
        {tab === "slack" && (
          <>
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>Slack Webhook</h2>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Sends a summary message after each completed crawl.</p>
            </div>
            <Field
              label="Webhook URL"
              value={form.slack_webhook_url ?? ""}
              onChange={(v) => set("slack_webhook_url", v)}
              placeholder="https://hooks.slack.com/services/..."
              hint="Create an Incoming Webhook in your Slack App settings."
            />
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <SaveButton onClick={() => save(["slack_webhook_url"])} saving={saving} saved={saved} />
              <TestButton label="Send test message" onClick={() => test("slack", "/notify/slack/test")} testing={testing.slack} result={testResults.slack} />
            </div>
          </>
        )}

        {/* Email */}
        {tab === "email" && (
          <>
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
          </>
        )}

        {/* SF License */}
        {tab === "sf" && (
          <>
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>Screaming Frog License Key</h2>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Optional. Removes the 500 URL crawl limit.</p>
            </div>
            <Field
              label="License Key" type="password"
              value={form.sf_license_key ?? ""}
              onChange={(v) => set("sf_license_key", v)}
              placeholder="XXXX-XXXX-XXXX-XXXX"
            />
            <div style={{ fontSize: 12, color: "var(--text-muted)", background: "var(--bg-surface)", borderRadius: 8, padding: "10px 14px" }}>
              SF CLI path (Mac): <code style={{ color: "var(--text-primary)", background: "var(--bg-raised)", padding: "1px 4px", borderRadius: 4, fontSize: 11 }}>~/.local/bin/ScreamingFrogSEOSpider</code>
            </div>
            <div><SaveButton onClick={() => save(["sf_license_key"])} saving={saving} saved={saved} /></div>
          </>
        )}

        {/* PSI */}
        {tab === "psi" && (
          <>
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>PageSpeed Insights API Key</h2>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Free API key from Google Cloud Console. Without a key, rate limits are very low.</p>
            </div>
            <Field
              label="API Key" type="password"
              value={form.psi_api_key ?? ""}
              onChange={(v) => set("psi_api_key", v)}
              placeholder="AIza..."
              hint="Enable the PageSpeed Insights API in your Google Cloud project."
            />
            <div><SaveButton onClick={() => save(["psi_api_key"])} saving={saving} saved={saved} /></div>
          </>
        )}

      </div>
    </div>
  );
}
