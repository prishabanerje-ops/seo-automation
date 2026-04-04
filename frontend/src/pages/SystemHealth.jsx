import { useState, useEffect } from "react";
import api from "../api/index.js";

const CHECKS = [
  { key: "sf_cli",   label: "Screaming Frog CLI",    desc: "ScreamingFrogSEOSpider --version" },
  { key: "database", label: "SQLite Database",        desc: "Row count on audit_checks table" },
  { key: "gsc",      label: "GSC OAuth",              desc: "Token refresh attempt" },
  { key: "ga4",      label: "GA4 OAuth",              desc: "Token refresh attempt" },
  { key: "claude",   label: "Anthropic (Claude API)", desc: "1-token ping" },
  { key: "linear",   label: "Linear API",             desc: "Fetch team info" },
  { key: "slack",    label: "Slack Webhook",           desc: "Test POST" },
  { key: "smtp",     label: "SMTP Email",             desc: "Verify connection" },
  { key: "sheets",   label: "Google Sheets",          desc: "List spreadsheet metadata" },
  { key: "psi",      label: "PageSpeed Insights API", desc: "Run PSI on homepage" },
];

function StatusBadge({ status }) {
  if (status === "pass")    return <span className="badge badge-pass">✓ Pass</span>;
  if (status === "fail")    return <span className="badge badge-critical">✗ Fail</span>;
  if (status === "skip")    return <span className="badge badge-gray">— Skip</span>;
  return <span className="badge badge-gray">⏳ Checking…</span>;
}

export default function SystemHealth() {
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(false);

  async function runChecks() {
    setRunning(true);
    setResults({});
    try {
      const r = await api.get("/settings/status");
      setResults(r.data || {});
    } catch (err) {
      setResults({ error: err.message });
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => { runChecks(); }, []);

  const passing = CHECKS.filter(c => results[c.key] === "pass").length;
  const failing = CHECKS.filter(c => results[c.key] === "fail").length;

  return (
    <div className="space-y-5">
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 className="page-title">System Health</h1>
          <p className="page-desc">Real-time status of all integrated services. Auto-runs on page load.</p>
        </div>
        <button onClick={runChecks} disabled={running} className="btn btn-primary">
          {running ? "Checking…" : "↻ Re-run All"}
        </button>
      </div>

      {/* Summary bar */}
      {!running && Object.keys(results).length > 0 && (
        <div className="card-sm" style={{ display:"flex", gap:20, alignItems:"center" }}>
          <div><span style={{ fontFamily:"Plus Jakarta Sans,sans-serif", fontWeight:800, fontSize:24, color:"var(--pass)" }}>{passing}</span> <span style={{ color:"var(--text-secondary)", fontSize:13 }}>passing</span></div>
          <div><span style={{ fontFamily:"Plus Jakarta Sans,sans-serif", fontWeight:800, fontSize:24, color: failing>0?"var(--critical)":"var(--text-muted)" }}>{failing}</span> <span style={{ color:"var(--text-secondary)", fontSize:13 }}>failing</span></div>
          <div style={{ flex:1 }}>
            <div className="progress-bar">
              <div className="progress-fill success" style={{ width:`${(passing/CHECKS.length)*100}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Checks table */}
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Service</th>
              <th>Test Method</th>
              <th>Status</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {CHECKS.map((c, i) => (
              <tr key={c.key}>
                <td style={{ color:"var(--text-muted)", fontFamily:"JetBrains Mono,monospace", fontSize:12 }}>{String(i+1).padStart(2,"0")}</td>
                <td style={{ fontWeight:600 }}>{c.label}</td>
                <td style={{ color:"var(--text-secondary)", fontSize:12, fontFamily:"JetBrains Mono,monospace" }}>{c.desc}</td>
                <td><StatusBadge status={running ? "checking" : (results[c.key] || "checking")} /></td>
                <td style={{ fontSize:12, color:"var(--text-muted)" }}>{results[`${c.key}_detail`] || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
