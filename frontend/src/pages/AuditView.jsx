import React, { useEffect, useState } from "react";
import { getHistory, getJobAudit } from "../api/index.js";

const SECTIONS = [
  { value: "all", label: "All Sections" },
  { value: "internal-links", label: "Internal Links" },
  { value: "response-codes", label: "Response Codes" },
  { value: "meta-tags", label: "Meta Tags" },
  { value: "headings", label: "Headings" },
  { value: "images", label: "Images" },
  { value: "canonicals", label: "Canonicals" },
  { value: "structured-data", label: "Structured Data" }
];

const SEVERITIES = [
  { value: "all", label: "All Severities" },
  { value: "critical", label: "Critical" },
  { value: "warning", label: "Warning" },
  { value: "info", label: "Info" },
  { value: "ok", label: "OK" }
];

const SEV_STYLE = {
  critical: { bg: "var(--critical-bg)", color: "var(--critical-text)", border: "#FECACA" },
  warning:  { bg: "var(--warning-bg)",  color: "var(--warning-text)",  border: "#FDE68A" },
  info:     { bg: "#EFF6FF",            color: "#1D4ED8",              border: "#BFDBFE" },
  ok:       { bg: "#F0FDF4",            color: "#15803D",              border: "#BBF7D0" },
};

const SUBSECTION_MAP = {
  // meta-tags
  "missing-title":        "Title Tags",
  "title-too-short":      "Title Tags",
  "title-too-long":       "Title Tags",
  "duplicate-title":      "Title Tags",
  "missing-meta-desc":    "Meta Descriptions",
  "meta-desc-too-short":  "Meta Descriptions",
  "meta-desc-too-long":   "Meta Descriptions",
  "duplicate-meta-desc":  "Meta Descriptions",
  // headings
  "missing-h1":           "H1 Tags",
  "h1-too-long":          "H1 Tags",
  "h1-matches-title":     "H1 Tags",
  "multiple-h1":          "H1 Tags",
  "missing-h2":           "H2 Tags",
  // response-codes
  "404":                  "4xx Errors",
  "5xx":                  "5xx Errors",
  "302-redirect":         "Redirects",
  "redirect-chain":       "Redirects",
  // internal-links
  "orphan-page":          "Orphan Pages",
  "over-linked":          "Link Distribution",
  "broken-link":          "Broken Links",
  // images
  "large-image":          "Image Size",
  "unused-image":         "Image Usage",
  "non-indexable-image":  "Image Indexability",
  // canonicals
  "missing-canonical":    "Canonical Tags",
  "canonical-cross-domain": "Canonical Tags",
  // structured-data
  "no-schema":            "Schema Markup",
  "schema-errors":        "Schema Markup",
};

const PAGE_SIZE = 100;

function fmtDate(d) { return d ? new Date(d).toLocaleString() : "—"; }

function SeverityPill({ severity }) {
  const s = SEV_STYLE[severity] ?? { bg: "var(--bg-surface)", color: "var(--text-muted)", border: "var(--border)" };
  return (
    <span style={{
      fontSize: 11, padding: "2px 8px", borderRadius: 20,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      fontWeight: 600, textTransform: "capitalize", whiteSpace: "nowrap"
    }}>
      {severity}
    </span>
  );
}

function SectionBadge({ section }) {
  return (
    <span style={{
      fontSize: 11, padding: "2px 8px", borderRadius: 6,
      background: "var(--brand-subtle)", color: "var(--brand)",
      fontWeight: 500, whiteSpace: "nowrap"
    }}>
      {section}
    </span>
  );
}

function SubsectionBadge({ issueType }) {
  const label = SUBSECTION_MAP[issueType];
  if (!label) return null;
  return (
    <span style={{
      fontSize: 11, padding: "2px 8px", borderRadius: 6,
      background: "#F3F4F6", color: "#374151",
      fontWeight: 500, whiteSpace: "nowrap"
    }}>
      {label}
    </span>
  );
}

export default function AuditView() {
  const [history, setHistory] = useState([]);
  const [selectedJob, setSelectedJob] = useState("");
  const [filters, setFilters] = useState({ severity: "all", section: "all", issue_type: "", q: "" });
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState([]);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [expandedRow, setExpandedRow] = useState(null);
  const [issueTypes, setIssueTypes] = useState([]);

  useEffect(() => {
    getHistory().then((r) => {
      const completed = r.data.filter((j) => j.status === "completed");
      setHistory(completed);
      if (completed.length > 0) setSelectedJob(completed[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedJob) return;
    setLoading(true);
    const params = {
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      ...(filters.severity !== "all" && { severity: filters.severity }),
      ...(filters.section !== "all" && { section: filters.section }),
      ...(filters.issue_type && { issue_type: filters.issue_type }),
      ...(filters.q && { q: filters.q })
    };
    getJobAudit(selectedJob, params)
      .then((r) => {
        setData(r.data.data);
        setTotal(r.data.total);
        setSummary(r.data.summary || []);
        setJob(r.data.job);
        setExpandedRow(null);
        if (r.data.issueTypes) setIssueTypes(r.data.issueTypes);
      })
      .catch(() => { setData([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [selectedJob, filters, page]);

  function setFilter(key, val) {
    setPage(0);
    setFilters((f) => ({ ...f, [key]: val }));
  }

  const sevCounts = { critical: 0, warning: 0, info: 0, ok: 0 };
  for (const s of summary) sevCounts[s.severity] = (sevCounts[s.severity] || 0) + s.count;

  const sectionMap = {};
  for (const s of summary) {
    if (!sectionMap[s.section]) sectionMap[s.section] = { critical: 0, warning: 0, info: 0, ok: 0 };
    sectionMap[s.section][s.severity] = (sectionMap[s.section][s.severity] || 0) + s.count;
  }

  function exportCSV() {
    if (!data.length) return;
    const header = ["URL", "Section", "Severity", "Issue Type", "Details"];
    const rows = data.map((r) => {
      const details = r.label || Object.entries(r)
        .filter(([k]) => !["url", "section", "severity", "issue_type", "label"].includes(k))
        .map(([k, v]) => `${k}: ${v}`).join(" | ");
      return [r.url, r.section, r.severity, r.issue_type || "", details].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });
    const blob = new Blob([[header.join(","), ...rows].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `audit-${selectedJob?.slice(0, 8)}-${Date.now()}.csv`;
    a.click();
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const hasFilters = filters.severity !== "all" || filters.section !== "all" || filters.issue_type || filters.q;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1 className="page-title">All Issues</h1>
          <p className="page-desc">Filter and explore every audit finding in one place.</p>
        </div>
        <button onClick={exportCSV} disabled={!data.length} className="btn btn-surface" style={{ opacity: data.length ? 1 : 0.4 }}>
          Export CSV
        </button>
      </div>

      {/* Job selector */}
      <div className="card" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Crawl Job</label>
            <select
              value={selectedJob}
              onChange={(e) => { setPage(0); setSelectedJob(e.target.value); }}
              style={{
                width: "100%", padding: "7px 12px", fontSize: 13,
                border: "1px solid var(--border)", borderRadius: 8,
                background: "var(--bg-page)", color: "var(--text-primary)", outline: "none"
              }}
            >
              <option value="">— select a crawl —</option>
              {history.map((j) => (
                <option key={j.id} value={j.id}>
                  {fmtDate(j.completed_at)} · {j.site_id} · {j.total_urls ?? "?"} URLs · {j.mode}
                </option>
              ))}
            </select>
          </div>
          {job && (
            <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              <div>Site: <strong style={{ color: "var(--text-primary)" }}>{job.site_id}</strong></div>
              <div>Crawled: <strong style={{ color: "var(--text-primary)" }}>{fmtDate(job.completed_at)}</strong></div>
              <div>Mode: <strong style={{ color: "var(--text-primary)" }}>{job.mode}</strong></div>
            </div>
          )}
        </div>
      </div>

      {selectedJob && (
        <>
          {/* Severity cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[
              { key: "critical", label: "Critical", color: "var(--critical)", bg: "var(--critical-bg)", border: "#FECACA" },
              { key: "warning",  label: "Warning",  color: "var(--warning)",  bg: "var(--warning-bg)",  border: "#FDE68A" },
              { key: "info",     label: "Info",     color: "var(--info)",     bg: "#EFF6FF",            border: "#BFDBFE" },
              { key: "ok",       label: "Pass",     color: "var(--pass)",     bg: "#F0FDF4",            border: "#BBF7D0" },
            ].map(({ key, label, color, bg, border }) => (
              <button
                key={key}
                onClick={() => setFilter("severity", filters.severity === key ? "all" : key)}
                style={{
                  padding: "16px 20px", borderRadius: 12, border: `1px solid ${filters.severity === key ? color : border}`,
                  background: bg, cursor: "pointer", textAlign: "left",
                  boxShadow: filters.severity === key ? `0 0 0 2px ${color}40` : "none",
                  transition: "all 0.15s"
                }}
              >
                <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>
                  {sevCounts[key] || 0}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>{label}</div>
              </button>
            ))}
          </div>

          {/* Section breakdown */}
          {Object.keys(sectionMap).length > 0 && (
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>By Section</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Click to filter</span>
              </div>
              <div>
                {Object.entries(sectionMap)
                  .sort(([, a], [, b]) => (b.critical || 0) - (a.critical || 0))
                  .map(([sec, counts]) => (
                    <button
                      key={sec}
                      onClick={() => setFilter("section", filters.section === sec ? "all" : sec)}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 16,
                        padding: "10px 20px", textAlign: "left", cursor: "pointer",
                        background: filters.section === sec ? "var(--brand-subtle)" : "transparent",
                        borderBottom: "1px solid var(--border)", transition: "background 0.15s",
                        border: "none"
                      }}
                      onMouseEnter={e => { if (filters.section !== sec) e.currentTarget.style.background = "var(--bg-surface)"; }}
                      onMouseLeave={e => { if (filters.section !== sec) e.currentTarget.style.background = "transparent"; }}
                    >
                      <div style={{ width: 160, flexShrink: 0 }}>
                        <SectionBadge section={sec} />
                      </div>
                      <div style={{ display: "flex", gap: 12, flex: 1 }}>
                        {counts.critical > 0 && <span style={{ fontSize: 12, fontWeight: 600, color: "var(--critical)" }}>{counts.critical} critical</span>}
                        {counts.warning > 0 && <span style={{ fontSize: 12, color: "var(--warning)" }}>{counts.warning} warning</span>}
                        {counts.info > 0 && <span style={{ fontSize: 12, color: "var(--info)" }}>{counts.info} info</span>}
                        {counts.ok > 0 && <span style={{ fontSize: 12, color: "var(--pass)" }}>{counts.ok} ok</span>}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {Object.values(counts).reduce((a, b) => a + b, 0)} total
                      </div>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Filters row */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
            {[
              { label: "Severity", key: "severity", opts: SEVERITIES },
              { label: "Section", key: "section", opts: SECTIONS },
            ].map(({ label, key, opts }) => (
              <div key={key}>
                <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{label}</label>
                <select
                  value={filters[key]}
                  onChange={(e) => setFilter(key, e.target.value)}
                  style={{ padding: "7px 12px", fontSize: 13, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-page)", color: "var(--text-primary)", outline: "none" }}
                >
                  {opts.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            ))}

            <div>
              <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Issue Type</label>
              <select
                value={filters.issue_type}
                onChange={(e) => setFilter("issue_type", e.target.value)}
                style={{ padding: "7px 12px", fontSize: 13, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-page)", color: "var(--text-primary)", outline: "none" }}
              >
                <option value="">All Issue Types</option>
                {issueTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>URL Search</label>
              <input
                type="text"
                value={filters.q}
                onChange={(e) => setFilter("q", e.target.value)}
                placeholder="Filter by URL..."
                style={{
                  width: "100%", padding: "7px 12px", fontSize: 13,
                  border: "1px solid var(--border)", borderRadius: 8,
                  background: "var(--bg-page)", color: "var(--text-primary)", outline: "none",
                  boxSizing: "border-box"
                }}
              />
            </div>

            {hasFilters && (
              <button
                onClick={() => setFilters({ severity: "all", section: "all", issue_type: "", q: "" })}
                className="btn btn-ghost"
                style={{ fontSize: 12 }}
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Results table */}
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 20px", borderBottom: "1px solid var(--border)"
            }}>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                {loading ? "Loading…" : `${total.toLocaleString()} results`}
                {!loading && total > PAGE_SIZE && ` — page ${page + 1} of ${totalPages}`}
              </span>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                  className="btn btn-surface" style={{ fontSize: 12, opacity: page === 0 ? 0.4 : 1 }}
                >← Prev</button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                  className="btn btn-surface" style={{ fontSize: 12, opacity: page >= totalPages - 1 ? 0.4 : 1 }}
                >Next →</button>
              </div>
            </div>

            {data.length === 0 && !loading ? (
              <div style={{ padding: "64px 24px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                {selectedJob ? "No results match your filters." : "Select a crawl job above."}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="data-table" style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th>URL</th>
                      <th style={{ width: 140 }}>Section</th>
                      <th style={{ width: 120 }}>Subsection</th>
                      <th style={{ width: 100 }}>Severity</th>
                      <th style={{ width: 160 }}>Issue Type</th>
                      <th style={{ width: 32 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, i) => {
                      const detailKeys = Object.keys(row).filter((k) =>
                        !["url", "section", "severity", "issue_type", "label"].includes(k) && row[k] !== "" && row[k] !== 0 && row[k] != null
                      );
                      const isExpanded = expandedRow === i;
                      return (
                        <React.Fragment key={i}>
                          <tr
                            style={{ background: isExpanded ? "var(--brand-subtle)" : undefined }}
                          >
                            <td>
                              <a
                                href={row.url} target="_blank" rel="noreferrer"
                                style={{
                                  color: "var(--brand)", textDecoration: "none", fontSize: 12,
                                  display: "block", overflow: "hidden", textOverflow: "ellipsis",
                                  whiteSpace: "nowrap", maxWidth: 480
                                }}
                                title={row.url}
                              >
                                {row.url}
                              </a>
                              {row.label && <span style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginTop: 2 }}>{row.label}</span>}
                            </td>
                            <td><SectionBadge section={row.section} /></td>
                            <td><SubsectionBadge issueType={row.issue_type} /></td>
                            <td><SeverityPill severity={row.severity} /></td>
                            <td style={{ fontSize: 12, color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}>
                              {row.issue_type || "—"}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              {detailKeys.length > 0 && (
                                <button
                                  onClick={() => setExpandedRow(isExpanded ? null : i)}
                                  style={{ fontSize: 10, color: "var(--text-muted)", cursor: "pointer", background: "none", border: "none", padding: 4 }}
                                >
                                  {isExpanded ? "▲" : "▼"}
                                </button>
                              )}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr>
                              <td colSpan={6} style={{ background: "var(--bg-surface)", padding: "12px 20px" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                                  {detailKeys.map((k) => (
                                    <div key={k} style={{ background: "var(--bg-raised)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px" }}>
                                      <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                        {k.replace(/_/g, " ")}
                                      </div>
                                      <div style={{ fontSize: 12, color: "var(--text-primary)", marginTop: 2, fontFamily: "'JetBrains Mono', monospace", wordBreak: "break-all" }}>
                                        {String(row[k])}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "var(--text-muted)" }}>
              <span>Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total.toLocaleString()}</span>
              <div style={{ display: "flex", gap: 4 }}>
                {[
                  { label: "«", action: () => setPage(0), disabled: page === 0 },
                  { label: "Prev", action: () => setPage(p => Math.max(0, p - 1)), disabled: page === 0 },
                ].map(({ label, action, disabled }) => (
                  <button key={label} onClick={action} disabled={disabled} className="btn btn-surface"
                    style={{ fontSize: 12, opacity: disabled ? 0.4 : 1 }}>{label}</button>
                ))}
                {Array.from({ length: Math.min(7, totalPages) }, (_, idx) => {
                  const p = Math.max(0, Math.min(page - 3, totalPages - 7)) + idx;
                  return (
                    <button key={p} onClick={() => setPage(p)} className="btn btn-surface"
                      style={{
                        fontSize: 12,
                        background: p === page ? "var(--brand)" : undefined,
                        color: p === page ? "#fff" : undefined,
                        borderColor: p === page ? "var(--brand)" : undefined
                      }}>
                      {p + 1}
                    </button>
                  );
                })}
                {[
                  { label: "Next", action: () => setPage(p => Math.min(totalPages - 1, p + 1)), disabled: page >= totalPages - 1 },
                  { label: "»", action: () => setPage(totalPages - 1), disabled: page >= totalPages - 1 },
                ].map(({ label, action, disabled }) => (
                  <button key={label} onClick={action} disabled={disabled} className="btn btn-surface"
                    style={{ fontSize: 12, opacity: disabled ? 0.4 : 1 }}>{label}</button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!selectedJob && history.length === 0 && (
        <div style={{ padding: "80px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 40, color: "var(--text-muted)", marginBottom: 12 }}>⊡</div>
          <div style={{ fontSize: 14, color: "var(--text-secondary)" }}>No completed crawls yet. Run a crawl first.</div>
        </div>
      )}
    </div>
  );
}
