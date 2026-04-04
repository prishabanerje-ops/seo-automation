import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSummary, getHistory, getTopIssues, getTasks, updateTask, deleteCrawlJob, getGscSummaryAll } from "../api/index.js";
import { useSites } from "../context/SitesContext.jsx";

// ─── Health Ring SVG ──────────────────────────────────────────────────────────
function HealthRing({ score, color, size = 88 }) {
  const r = (size / 2) - 8;
  const circ = 2 * Math.PI * r;
  const pct = score != null ? Math.max(0, Math.min(100, score)) : 0;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color + "20"} strokeWidth="8" />
      {score != null && (
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      )}
      <text x={size/2} y={size/2 + 5} textAnchor="middle"
        fill={score != null ? color : "var(--text-muted)"}
        fontSize="15" fontWeight="700" fontFamily="'JetBrains Mono', monospace">
        {score ?? "—"}
      </text>
    </svg>
  );
}

// ─── Kanban ───────────────────────────────────────────────────────────────────
const KANBAN_COLS = [
  { key: "backlog",     label: "Backlog",     color: "var(--text-muted)" },
  { key: "in_progress", label: "In Progress", color: "var(--brand)" },
  { key: "review",      label: "In Review",   color: "var(--warning)" },
  { key: "done",        label: "Done",        color: "var(--pass)" },
];

const SEV_PILL = {
  critical: { bg: "var(--critical-bg)", color: "var(--critical-text)" },
  warning:  { bg: "var(--warning-bg)",  color: "var(--warning-text)" },
  info:     { bg: "#EFF6FF",            color: "#1D4ED8" },
};

function KanbanCard({ task, onMove }) {
  const s = SEV_PILL[task.severity] ?? SEV_PILL.info;
  const title = task.issue_type || task.url || "Untitled issue";
  return (
    <div style={{
      background: "var(--bg-raised)", border: "1px solid var(--border)", borderRadius: 8,
      padding: "10px 12px", marginBottom: 8
    }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.4, marginBottom: 6 }}>
        {title}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          {task.severity && (
            <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 10, background: s.bg, color: s.color, fontWeight: 600 }}>
              {task.severity}
            </span>
          )}
          {task.site_label && (
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{task.site_label}</span>
          )}
        </div>
        <select
          value={task.status}
          onChange={(e) => onMove(task.id, e.target.value)}
          style={{
            fontSize: 10, padding: "2px 4px", border: "1px solid var(--border)",
            borderRadius: 4, background: "var(--bg-surface)", color: "var(--text-muted)", outline: "none"
          }}
        >
          {KANBAN_COLS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </div>
    </div>
  );
}

function KanbanBoard({ tasks, onMove }) {
  if (!tasks.length) {
    return (
      <div style={{ padding: "32px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
        No tasks yet. Issues from crawl results can be tracked here.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
      {KANBAN_COLS.map(col => {
        const colTasks = tasks.filter(t => t.status === col.key);
        return (
          <div key={col.key}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: col.color }}>{col.label}</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--bg-surface)", padding: "1px 6px", borderRadius: 10 }}>
                {colTasks.length}
              </span>
            </div>
            <div style={{ minHeight: 80 }}>
              {colTasks.map(t => (
                <KanbanCard key={t.id} task={t} onMove={onMove} />
              ))}
              {colTasks.length === 0 && (
                <div style={{
                  border: "2px dashed var(--border)", borderRadius: 8, height: 80,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, color: "var(--text-muted)"
                }}>
                  Empty
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Founder View ────────────────────────────────────────────────────────
export default function FounderView() {
  const { sites: SITES } = useSites();
  const [summaries, setSummaries]     = useState({});
  const [history, setHistory]         = useState([]);
  const [topIssues, setTopIssues]     = useState([]);
  const [tasks, setTasks]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [gscAll, setGscAll]           = useState(null);

  useEffect(() => {
    // Fetch top issues + tasks regardless of sites
    getTopIssues(10).then(r => setTopIssues(r.data.issues ?? [])).catch(() => {});
    getTasks().then(r => setTasks(r.data.tasks ?? [])).catch(() => {});
    getHistory().then(r => setHistory((r.data ?? []).slice(0, 8))).catch(() => {});
    getGscSummaryAll().then(r => setGscAll(r.data)).catch(() => {});

    if (!SITES.length) { setLoading(false); return; }

    Promise.all(
      SITES.map((s) =>
        getSummary(s.id)
          .then((r) => ({ id: s.id, data: r.data }))
          .catch(() => ({ id: s.id, data: null }))
      )
    ).then((results) => {
      const map = {};
      for (const { id, data } of results) map[id] = data;
      setSummaries(map);
      setLoading(false);
    });
  }, [SITES.length]);

  async function handleDeleteJob(jobId) {
    if (!window.confirm("Delete this crawl and all its audit results? This cannot be undone.")) return;
    try {
      await deleteCrawlJob(jobId);
      setHistory(prev => prev.filter(j => j.id !== jobId));
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete crawl");
    }
  }

  async function moveTask(id, status) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    try { await updateTask(id, { status }); }
    catch { getTasks().then(r => setTasks(r.data.tasks ?? [])).catch(() => {}); }
  }

  // Aggregate metrics
  const activeSites = SITES.filter(s => summaries[s.id]?.crawlJob);
  const avgHealth = activeSites.length
    ? Math.round(activeSites.reduce((a, s) => a + (summaries[s.id]?.health ?? 0), 0) / activeSites.length)
    : null;
  const totalCritical = activeSites.reduce((sum, s) => {
    const secs = summaries[s.id]?.sections ?? {};
    return sum + Object.values(secs).reduce((a, v) => a + (v.critical || 0), 0);
  }, 0);
  const totalUrls = activeSites.reduce((sum, s) => sum + (summaries[s.id]?.crawlJob?.total_urls ?? 0), 0);

  const healthColor = (score) =>
    score == null ? "var(--text-muted)"
    : score >= 80 ? "var(--pass)"
    : score >= 50 ? "var(--warning)"
    : "var(--critical)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 className="page-title">Founder Dashboard</h1>
          <p className="page-desc">Executive overview — health scores, issues, team kanban, and activity log.</p>
        </div>
        <Link to="/crawl" className="btn btn-primary" style={{ textDecoration: "none" }}>+ New Crawl</Link>
      </div>

      {/* Top KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {[
          { label: "Avg Health Score", value: loading ? "—" : (avgHealth ?? "No data"), color: healthColor(avgHealth) },
          { label: "Sites Crawled",    value: `${activeSites.length} / ${SITES.length}`, color: "var(--text-primary)" },
          { label: "Total URLs",       value: totalUrls.toLocaleString(),                color: "var(--info)" },
          { label: "Critical Issues",  value: totalCritical.toLocaleString(),            color: "var(--critical)" },
        ].map(({ label, value, color }) => (
          <div key={label} className="card" style={{ padding: "18px 20px" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Site health rings */}
      {SITES.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {SITES.map((site) => {
            const sum = summaries[site.id];
            const health = sum?.health ?? null;
            const crawlJob = sum?.crawlJob;
            const secs = sum?.sections ?? {};
            const critical = Object.values(secs).reduce((a, v) => a + (v.critical || 0), 0);
            const warning = Object.values(secs).reduce((a, v) => a + (v.warning || 0), 0);
            const color = healthColor(health);

            return (
              <div key={site.id} className="card" style={{ padding: "20px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: site.color }} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{site.label}</span>
                  </div>
                  {crawlJob && (
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {new Date(crawlJob.completed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  <div>
                    <HealthRing score={health} color={color} size={88} />
                    <div style={{ textAlign: "center", fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Health</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    {crawlJob ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>URLs crawled</span>
                          <span style={{ fontSize: 13, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
                            {crawlJob.total_urls?.toLocaleString() ?? "—"}
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Critical</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--critical)", fontFamily: "'JetBrains Mono', monospace" }}>
                            {critical.toLocaleString()}
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Warnings</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--warning)", fontFamily: "'JetBrains Mono', monospace" }}>
                            {warning.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No crawl data yet</div>
                    )}
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <Link to="/crawl" style={{
                        flex: 1, textAlign: "center", padding: "6px 0", borderRadius: 7, fontSize: 12,
                        fontWeight: 600, color: "#fff", background: site.color, textDecoration: "none"
                      }}>
                        {crawlJob ? "Re-crawl" : "Run Audit"}
                      </Link>
                      {crawlJob && (
                        <Link to="/audit" style={{
                          padding: "6px 10px", borderRadius: 7, fontSize: 12,
                          color: "var(--brand)", background: "var(--brand-subtle)", textDecoration: "none"
                        }}>
                          Issues →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Priority issues + recent crawls */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Top critical issues from real audit_results */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Top Priority Issues</span>
            <Link to="/audit" style={{ fontSize: 12, color: "var(--brand)", textDecoration: "none" }}>View all →</Link>
          </div>
          {topIssues.length === 0 ? (
            <div style={{ padding: "32px 18px", textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>
              No critical issues found. Run a crawl to populate issues.
            </div>
          ) : (
            <div>
              {topIssues.map((issue, i) => {
                const s = SEV_PILL[issue.severity] ?? SEV_PILL.info;
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    padding: "10px 18px", borderBottom: "1px solid var(--border)"
                  }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace", paddingTop: 1, flexShrink: 0 }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: "var(--text-primary)", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {issue.issue_type || issue.url}
                      </div>
                      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                        <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, background: s.bg, color: s.color, fontWeight: 600 }}>
                          {issue.severity}
                        </span>
                        {issue.site_label && (
                          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{issue.site_label}</span>
                        )}
                        {issue.section && (
                          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{issue.section}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent crawls from real history */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Recent Crawls</span>
          </div>
          {history.length === 0 ? (
            <div style={{ padding: "32px 18px", textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>
              No crawls yet.
            </div>
          ) : (
            <div>
              {history.map((job) => {
                const site = SITES.find(s => s.id === job.site_id);
                const durMs = job.completed_at && job.started_at
                  ? new Date(job.completed_at) - new Date(job.started_at) : null;
                const dur = durMs == null ? "—" : durMs < 60000 ? `${Math.round(durMs/1000)}s` : `${Math.round(durMs/60000)}m`;
                const statusColor = job.status === "completed" ? "var(--pass)" : job.status === "failed" ? "var(--critical)" : "var(--warning)";
                return (
                  <div key={job.id} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 18px",
                    borderBottom: "1px solid var(--border)"
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: site?.color ?? "var(--text-muted)", flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-primary)" }}>{site?.label ?? job.site_id}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {new Date(job.started_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {job.total_urls?.toLocaleString() ?? "?"} URLs · {dur}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, color: statusColor, fontWeight: 600, textTransform: "capitalize" }}>{job.status}</span>
                      <button
                        onClick={() => handleDeleteJob(job.id)}
                        title="Delete crawl"
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          fontSize: 12, color: "var(--text-muted)", padding: "2px 4px", borderRadius: 4,
                          transition: "color 0.15s"
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = "var(--critical)"}
                        onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
                      >✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Kanban board — wired to task_status table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Team Kanban — Issue Tracking</span>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Use dropdowns to move issues between columns</span>
        </div>
        <div style={{ padding: "16px 20px" }}>
          <KanbanBoard tasks={tasks} onMove={moveTask} />
        </div>
      </div>

      {/* GSC Summary block — always visible */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Search Console Overview</span>
          <Link to="/gsc" style={{ fontSize: 12, color: "var(--brand)", textDecoration: "none" }}>Open Console →</Link>
        </div>
        {gscAll && (gscAll.totals?.impressions > 0 || gscAll.sites?.length > 0) ? (
          <div style={{ padding: "16px 20px" }}>
            {/* 4 KPIs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
              {[
                { label: "Impressions", curr: gscAll.totals?.impressions, prev: gscAll.prevTotals?.impressions },
                { label: "Clicks",      curr: gscAll.totals?.clicks,      prev: gscAll.prevTotals?.clicks },
                { label: "Avg CTR",     curr: gscAll.totals?.ctr,         prev: gscAll.prevTotals?.ctr,   type: "pct" },
                { label: "Avg Position",curr: gscAll.totals?.position,    prev: gscAll.prevTotals?.position, type: "pos", invert: true },
              ].map(({ label, curr: c, prev: p, type = "num", invert = false }) => {
                const d = p && c ? ((c - p) / (p || 1)) * 100 : null;
                const up = invert ? d < 0 : d > 0;
                const dColor = d == null ? "var(--text-muted)" : up ? "var(--pass)" : "var(--critical)";
                const fmtVal = (v) => {
                  if (v == null) return "—";
                  if (type === "pct") return (v * 100).toFixed(1) + "%";
                  if (type === "pos") return parseFloat(v).toFixed(1);
                  return Number(v).toLocaleString();
                };
                return (
                  <div key={label} style={{ background: "var(--bg-surface)", borderRadius: 10, padding: "12px 14px" }}>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{fmtVal(c)}</div>
                    {d != null && !isNaN(d) && (
                      <div style={{ fontSize: 11, color: dColor, marginTop: 4, fontWeight: 600 }}>
                        {d > 0 ? "+" : ""}{d.toFixed(1)}% vs prev 28d
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Sparkline + per-site breakdown */}
            <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
              {gscAll.daily?.length > 0 && (() => {
                const data = gscAll.daily;
                const max = Math.max(...data.map(d => d.clicks), 1);
                const w = 200, h = 40;
                const pts = data.map((d, i) => {
                  const x = (i / Math.max(data.length - 1, 1)) * w;
                  const y = h - (d.clicks / max) * h;
                  return `${x},${y}`;
                }).join(" ");
                return (
                  <div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>Clicks (14d)</div>
                    <svg width={w} height={h}>
                      <polyline points={pts} fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                );
              })()}
              {gscAll.sites?.length > 0 && (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {gscAll.sites.map(s => (
                    <div key={s.site_id} style={{ background: "var(--bg-surface)", borderRadius: 8, padding: "8px 12px", minWidth: 120 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: s.color }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>{s.label}</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                        {(s.current?.clicks ?? 0).toLocaleString()} <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 400 }}>clicks</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ padding: "32px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>
              Search Console not connected
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16, maxWidth: 320, margin: "0 auto 16px" }}>
              Connect Google Search Console to see impressions, clicks, CTR, and ranking data across all your sites.
            </div>
            <Link
              to="/gsc"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: "var(--brand)", color: "#fff", textDecoration: "none",
                transition: "opacity 0.15s"
              }}
            >
              Connect Search Console →
            </Link>
          </div>
        )}
      </div>

      {/* Activity log — from real crawl history */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Activity Log</span>
        </div>
        {history.length === 0 ? (
          <div style={{ padding: "32px 20px", textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>
            No activity yet. Run a crawl to start.
          </div>
        ) : (
          <div>
            {history.map((job, i) => {
              const site = SITES.find(s => s.id === job.site_id);
              const icon = job.status === "completed" ? "⟳" : job.status === "failed" ? "✗" : "⏱";
              const color = job.status === "completed" ? "var(--brand)" : job.status === "failed" ? "var(--critical)" : "var(--text-muted)";
              const when = new Date(job.started_at);
              const now = new Date();
              const diffH = Math.round((now - when) / 3600000);
              const timeAgo = diffH < 1 ? "Just now" : diffH < 24 ? `${diffH}h ago` : `${Math.round(diffH/24)}d ago`;
              return (
                <div key={job.id} style={{
                  display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 20px",
                  borderBottom: i < history.length - 1 ? "1px solid var(--border)" : "none"
                }}>
                  <span style={{ fontSize: 14, color, flexShrink: 0, paddingTop: 1 }}>{icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.4 }}>
                      Crawl {job.status} — {site?.label ?? job.site_id}
                      {job.total_urls ? ` · ${job.total_urls.toLocaleString()} URLs` : ""}
                      {job.mode ? ` · ${job.mode} mode` : ""}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>{timeAgo}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
