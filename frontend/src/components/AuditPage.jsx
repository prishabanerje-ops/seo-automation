import { useEffect, useState, useMemo } from "react";
import SiteSelector from "./SiteSelector.jsx";
import DataTable from "./DataTable.jsx";
import { getReport } from "../api/index.js";
import { useSites } from "../context/SitesContext.jsx";

const SEV_COLOR = {
  critical: { color: "var(--critical)", bg: "var(--critical-bg)", border: "#FECACA" },
  warning:  { color: "var(--warning)",  bg: "var(--warning-bg)",  border: "#FDE68A" },
  info:     { color: "var(--info)",     bg: "#EFF6FF",            border: "#BFDBFE" },
  ok:       { color: "var(--pass)",     bg: "#F0FDF4",            border: "#BBF7D0" },
};

function SeverityBadge({ value }) {
  const s = SEV_COLOR[value] ?? SEV_COLOR.ok;
  return (
    <span style={{
      fontSize: 11, padding: "2px 8px", borderRadius: 20,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      fontWeight: 600, textTransform: "capitalize"
    }}>
      {value}
    </span>
  );
}

const inputStyle = {
  padding: "7px 12px", fontSize: 13, border: "1px solid var(--border)", borderRadius: 8,
  background: "var(--bg-page)", color: "var(--text-primary)", outline: "none", fontFamily: "inherit"
};

export default function AuditPage({ title, section, columns }) {
  const { activeSiteId, sites } = useSites();
  const defaultSite = activeSiteId || sites[0]?.id || "";
  const [site, setSite] = useState(defaultSite);

  // Sync when global active site changes
  useEffect(() => {
    if (activeSiteId) setSite(activeSiteId);
  }, [activeSiteId]);
  const [rows, setRows] = useState([]);
  const [crawlJob, setCrawlJob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterIssue, setFilterIssue] = useState("all");

  useEffect(() => {
    setLoading(true);
    setRows([]);
    getReport(site, section)
      .then((res) => {
        setRows(res.data.data ?? []);
        setCrawlJob(res.data.crawlJob);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [site, section]);

  const issueTypes = useMemo(() => {
    const types = new Set(rows.map((r) => r.issue_type).filter(Boolean));
    return ["all", ...Array.from(types)];
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filterSeverity !== "all" && r.severity !== filterSeverity) return false;
      if (filterIssue !== "all" && r.issue_type !== filterIssue) return false;
      if (filterText && !r.url?.toLowerCase().includes(filterText.toLowerCase())) return false;
      return true;
    });
  }, [rows, filterSeverity, filterIssue, filterText]);

  const counts = useMemo(() => {
    const c = { critical: 0, warning: 0, info: 0, ok: 0 };
    for (const r of rows) c[r.severity] = (c[r.severity] || 0) + 1;
    return c;
  }, [rows]);

  function exportCsv() {
    if (!filtered.length) return;
    const allKeys = Object.keys(filtered[0]);
    const header = allKeys.join(",");
    const body = filtered.map((r) => allKeys.map((k) => JSON.stringify(r[k] ?? "")).join(",")).join("\n");
    const blob = new Blob([header + "\n" + body], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${section}-${site}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  const allColumns = [
    ...columns,
    { key: "severity", label: "Status",  render: (v) => <SeverityBadge value={v} /> },
    { key: "label",    label: "Issue",   render: (v) => v
      ? <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{v}</span>
      : <span style={{ color: "var(--text-muted)" }}>—</span>
    }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title">{title}</h1>
          {crawlJob && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              Last crawl: {new Date(crawlJob.completed_at).toLocaleString()} · {crawlJob.total_urls ?? "?"} URLs
            </p>
          )}
          {!crawlJob && !loading && (
            <p style={{ fontSize: 12, color: "var(--warning)", marginTop: 2 }}>No crawl data yet — run a crawl first.</p>
          )}
        </div>
        <SiteSelector selected={site} onChange={setSite} />
      </div>

      {/* Severity summary cards */}
      {rows.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          {[
            { key: "critical", label: "Critical" },
            { key: "warning",  label: "Warnings" },
            { key: "info",     label: "Info" },
            { key: "ok",       label: "Pass" }
          ].map(({ key, label }) => {
            const s = SEV_COLOR[key];
            const active = filterSeverity === key;
            return (
              <button
                key={key}
                onClick={() => setFilterSeverity(active ? "all" : key)}
                style={{
                  padding: "12px 16px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                  border: `1px solid ${active ? s.color : s.border}`,
                  background: s.bg,
                  boxShadow: active ? `0 0 0 2px ${s.color}30` : "none",
                  transition: "all 0.15s"
                }}
              >
                <div style={{ fontSize: 24, fontWeight: 700, color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>
                  {counts[key] ?? 0}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>{label}</div>
              </button>
            );
          })}
        </div>
      )}

      {/* Filter bar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <input
          type="text"
          placeholder="Filter by URL…"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          style={{ ...inputStyle, width: 240 }}
        />
        <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} style={inputStyle}>
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
          <option value="ok">OK</option>
        </select>
        {issueTypes.length > 1 && (
          <select value={filterIssue} onChange={(e) => setFilterIssue(e.target.value)} style={inputStyle}>
            {issueTypes.map((t) => (
              <option key={t} value={t}>{t === "all" ? "All Issues" : t}</option>
            ))}
          </select>
        )}
        <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: "auto" }}>{filtered.length} rows</span>
        <button onClick={exportCsv} disabled={filtered.length === 0} className="btn btn-surface"
          style={{ fontSize: 12, opacity: filtered.length === 0 ? 0.4 : 1 }}>
          Export CSV
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>Loading…</div>
      ) : (
        <DataTable columns={allColumns} data={filtered} />
      )}
    </div>
  );
}
