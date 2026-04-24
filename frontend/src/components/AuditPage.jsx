import { useEffect, useState, useMemo, useCallback } from "react";
import SiteSelector from "./SiteSelector.jsx";
import DataTable from "./DataTable.jsx";
import ClaudeDrawer from "./ClaudeDrawer.jsx";
import IntentionalRuleModal from "./IntentionalRuleModal.jsx";
import { getReport } from "../api/index.js";
import { useSites } from "../context/SitesContext.jsx";
import { useIntentionalRules } from "../context/IntentionalRulesContext.jsx";
import api from "../api/index.js";

const SEV_COLOR = {
  critical: { color: "var(--critical)", bg: "var(--critical-bg)", border: "#FECACA" },
  warning:  { color: "var(--warning)",  bg: "var(--warning-bg)",  border: "#FDE68A" },
  info:     { color: "var(--info)",     bg: "#EFF6FF",            border: "#BFDBFE" },
  ok:       { color: "var(--pass)",     bg: "#F0FDF4",            border: "#BBF7D0" },
};

const INTENTIONAL_STYLE = { color: "#0D9488", bg: "#F0FDFA", border: "#99F6E4" };

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

function IntentionalBadge({ rule }) {
  const [hover, setHover] = useState(false);
  const s = INTENTIONAL_STYLE;
  const scopeLabel = rule?.scope === "all" ? "All URLs" : rule?.scope === "url" ? "This URL" : `Pattern: ${rule?.pattern}`;
  return (
    <span
      style={{ position: "relative", display: "inline-block" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span style={{
        fontSize: 11, padding: "2px 8px", borderRadius: 20,
        background: s.bg, color: s.color, border: `1px solid ${s.border}`,
        fontWeight: 600, cursor: "default"
      }}>
        Intentional ✓
      </span>
      {hover && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: 0,
          background: "#1F2937", color: "#fff",
          padding: "8px 12px", borderRadius: 8, fontSize: 11,
          whiteSpace: "nowrap", zIndex: 200, maxWidth: 300, wordBreak: "break-word",
          boxShadow: "0 4px 16px rgba(0,0,0,0.25)", lineHeight: 1.6
        }}>
          <div style={{ fontWeight: 600, marginBottom: rule?.reason ? 3 : 0 }}>{scopeLabel}</div>
          {rule?.reason && <div style={{ opacity: 0.85 }}>{rule.reason}</div>}
        </div>
      )}
    </span>
  );
}

function SuppressedSection({ rows, columns }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 8 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 8, padding: "10px 16px",
          background: INTENTIONAL_STYLE.bg, border: `1px solid ${INTENTIONAL_STYLE.border}`,
          borderRadius: open ? "10px 10px 0 0" : 10, cursor: "pointer", width: "100%",
          fontSize: 13, fontWeight: 600, color: INTENTIONAL_STYLE.color, textAlign: "left"
        }}
      >
        <span style={{ fontSize: 10, transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s", display: "inline-block" }}>▶</span>
        Intentional Issues ({rows.length})
        <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 4, color: "#0D9488", opacity: 0.75 }}>
          — suppressed from error counts
        </span>
      </button>
      {open && (
        <div style={{ border: `1px solid ${INTENTIONAL_STYLE.border}`, borderTop: "none", borderRadius: "0 0 10px 10px", overflow: "hidden" }}>
          <DataTable columns={columns} data={rows} />
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  padding: "7px 12px", fontSize: 13, border: "1px solid var(--border)", borderRadius: 8,
  background: "var(--bg-page)", color: "var(--text-primary)", outline: "none", fontFamily: "inherit"
};

const iconBtnStyle = {
  background: "none", border: "none", cursor: "pointer",
  fontSize: 13, padding: "3px 6px", borderRadius: 6,
  color: "var(--text-muted)", transition: "all 0.12s"
};

export default function AuditPage({ title, section, columns }) {
  const { activeSiteId, sites } = useSites();
  const defaultSite = activeSiteId || sites[0]?.id || "";
  const [site, setSite] = useState(defaultSite);

  useEffect(() => { if (activeSiteId) setSite(activeSiteId); }, [activeSiteId]);

  const [rows, setRows] = useState([]);
  const [crawlJob, setCrawlJob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterIssue, setFilterIssue] = useState("all");

  // Feature 1 — Ask Claude
  const [claudeTask, setClaudeTask] = useState(null);

  // Feature 4 — Intentional rules
  const [intentionalRow, setIntentionalRow] = useState(null);
  const { getMatchingRule, addRule } = useIntentionalRules();

  // Toast
  const [sheetsToast, setSheetsToast] = useState(null);
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [linearLoading, setLinearLoading] = useState(false);

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

  function showToast(msg, isError = false) {
    setSheetsToast({ msg, isError });
    setTimeout(() => setSheetsToast(null), 4000);
  }

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

  // Row → rule map (computed from full rows set)
  const rowRuleMap = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      const rule = getMatchingRule(r, site);
      if (rule) map.set(r.id ?? `${r.url}:${r.issue_type}`, rule);
    }
    return map;
  }, [rows, getMatchingRule, site]);

  // Split filtered into actionable vs suppressed
  const { actionable, suppressed } = useMemo(() => {
    const actionable = [], suppressed = [];
    for (const r of filtered) {
      if (rowRuleMap.has(r.id ?? `${r.url}:${r.issue_type}`)) suppressed.push(r);
      else actionable.push(r);
    }
    return { actionable, suppressed };
  }, [filtered, rowRuleMap]);

  // Counts exclude suppressed rows
  const counts = useMemo(() => {
    const c = { critical: 0, warning: 0, info: 0, ok: 0 };
    for (const r of rows) {
      if (!rowRuleMap.has(r.id ?? `${r.url}:${r.issue_type}`)) {
        c[r.severity] = (c[r.severity] || 0) + 1;
      }
    }
    return c;
  }, [rows, rowRuleMap]);

  function exportCsv() {
    if (!actionable.length) return;
    const allKeys = Object.keys(actionable[0]);
    const header = allKeys.join(",");
    const body = actionable.map((r) => allKeys.map((k) => JSON.stringify(r[k] ?? "")).join(",")).join("\n");
    const blob = new Blob([header + "\n" + body], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${section}-${site}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  async function pushToSheets() {
    if (!site) return;
    setSheetsLoading(true);
    try {
      const r = await api.post(`/export/sheets/${site}`);
      showToast(r.data?.message || "Pushed to Google Sheets.");
    } catch (err) {
      showToast(err.response?.data?.error || "Sheets export failed.", true);
    } finally {
      setSheetsLoading(false);
    }
  }

  async function createLinearTicket() {
    if (!actionable.length) return;
    setLinearLoading(true);
    const topIssue = actionable[0];
    const severityPriority = { critical: 1, warning: 2, info: 3 };
    const priority = severityPriority[topIssue.severity] ?? 2;
    const sampleUrls = actionable.slice(0, 5).map(r => `- ${r.url}`).join("\n");
    const title = `[SEO] ${topIssue.issue_type || section} — ${actionable.length} affected URLs`;
    const description = `**Section:** ${section}\n**Severity:** ${topIssue.severity}\n**Affected URLs (${actionable.length} total):**\n${sampleUrls}`;
    try {
      const r = await api.post("/linear/ticket", {
        projectId: site,
        auditResultId: topIssue.id,
        title, description, priority
      });
      const url = r.data?.issue?.url;
      showToast(url ? `Linear ticket created: ${r.data.issue.identifier}` : "Linear ticket created.");
      if (url) window.open(url, "_blank", "noopener");
    } catch (err) {
      showToast(err.response?.data?.error || "Linear ticket creation failed.", true);
    } finally {
      setLinearLoading(false);
    }
  }

  // ── Columns ──

  const actionsColumn = {
    key: "_actions",
    label: "",
    render: (_, row) => (
      <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
        <button
          onClick={(e) => { e.stopPropagation(); setClaudeTask(row); }}
          style={{ ...iconBtnStyle, color: "var(--brand)" }}
          title="Ask Claude for a fix recommendation"
        >
          ✦
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setIntentionalRow(row); }}
          style={iconBtnStyle}
          title="Mark as intentional — suppress from error counts"
        >
          ⚑
        </button>
      </div>
    )
  };

  const allColumns = [
    ...columns,
    { key: "severity", label: "Status", render: (v) => <SeverityBadge value={v} /> },
    { key: "label", label: "Issue", render: (v) => v
      ? <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{v}</span>
      : <span style={{ color: "var(--text-muted)" }}>—</span>
    },
    actionsColumn
  ];

  const suppressedColumns = [
    ...columns,
    {
      key: "severity",
      label: "Status",
      render: (_, row) => <IntentionalBadge rule={rowRuleMap.get(row.id ?? `${row.url}:${row.issue_type}`)} />
    },
    { key: "label", label: "Issue", render: (v) => v
      ? <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{v}</span>
      : <span style={{ color: "var(--text-muted)" }}>—</span>
    }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Toast */}
      {sheetsToast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 999,
          background: sheetsToast.isError ? "#991B1B" : "var(--text-primary)",
          color: "#fff", fontSize: 13, padding: "10px 18px",
          borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.15)"
        }}>
          {sheetsToast.msg}
        </div>
      )}

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

      {/* Suppressed banner */}
      {suppressed.length > 0 && (
        <div style={{
          padding: "10px 14px", borderRadius: 8,
          background: INTENTIONAL_STYLE.bg, border: `1px solid ${INTENTIONAL_STYLE.border}`,
          fontSize: 13, color: INTENTIONAL_STYLE.color, display: "flex", alignItems: "center", gap: 8
        }}>
          <span>⚑</span>
          <span>
            <strong>{suppressed.length}</strong> issue{suppressed.length !== 1 ? "s" : ""} suppressed by intentional rules.
          </span>
          <a href="/settings" style={{ color: INTENTIONAL_STYLE.color, fontWeight: 600, marginLeft: 4 }}>
            View Rules →
          </a>
        </div>
      )}

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
              <button key={key} onClick={() => setFilterSeverity(active ? "all" : key)} style={{
                padding: "12px 16px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                border: `1px solid ${active ? s.color : s.border}`,
                background: s.bg,
                boxShadow: active ? `0 0 0 2px ${s.color}30` : "none",
                transition: "all 0.15s"
              }}>
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
        <input type="text" placeholder="Filter by URL…" value={filterText}
          onChange={(e) => setFilterText(e.target.value)} style={{ ...inputStyle, width: 240 }} />
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
        <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: "auto" }}>
          {actionable.length} rows{suppressed.length > 0 ? ` · ${suppressed.length} suppressed` : ""}
        </span>
        <button onClick={exportCsv} disabled={actionable.length === 0} className="btn btn-surface"
          style={{ fontSize: 12, opacity: actionable.length === 0 ? 0.4 : 1 }}>
          CSV
        </button>
        <button onClick={pushToSheets} disabled={sheetsLoading || actionable.length === 0}
          className="btn btn-surface"
          style={{ fontSize: 12, opacity: (sheetsLoading || actionable.length === 0) ? 0.4 : 1 }}>
          {sheetsLoading ? "Pushing…" : "→ Sheets"}
        </button>
        <button onClick={createLinearTicket} disabled={linearLoading || actionable.length === 0}
          className="btn btn-secondary"
          style={{ fontSize: 12, opacity: (linearLoading || actionable.length === 0) ? 0.4 : 1 }}>
          {linearLoading ? "Creating…" : "＋ Linear"}
        </button>
      </div>

      {/* Main table */}
      {loading ? (
        <div style={{ padding: "40px 0", textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>Loading…</div>
      ) : (
        <DataTable columns={allColumns} data={actionable} />
      )}

      {/* Suppressed section */}
      {!loading && suppressed.length > 0 && (
        <SuppressedSection rows={suppressed} columns={suppressedColumns} />
      )}

      {/* Claude Drawer */}
      {claudeTask && (
        <ClaudeDrawer
          task={claudeTask}
          siteId={site}
          onClose={() => setClaudeTask(null)}
        />
      )}

      {/* Intentional Rule Modal */}
      {intentionalRow && (
        <IntentionalRuleModal
          row={intentionalRow}
          onSave={(rule) => { addRule(site, rule); setIntentionalRow(null); showToast("Rule saved — issue suppressed."); }}
          onClose={() => setIntentionalRow(null)}
        />
      )}
    </div>
  );
}
