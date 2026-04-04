import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getSummary, getHistory, deleteCrawlJob } from "../api/index.js";
import { useSites } from "../context/SitesContext.jsx";

const SECTION_LINKS = {
  "response-codes": "/response-codes",
  "meta-tags": "/meta-descriptions",
  "headings": "/headings",
  "images": "/images-media",
  "canonicals": "/canonical-tags",
  "internal-links": "/internal-linking",
  "structured-data": "/schema",
  "custom-extraction": "/custom-extraction"
};

const SECTION_LABELS = {
  "response-codes": "Response Codes",
  "meta-tags": "Meta Descriptions",
  "headings": "Headings",
  "images": "Images & Media",
  "canonicals": "Canonical Tags",
  "internal-links": "Internal Linking",
  "structured-data": "Schema & Struct. Data",
  "custom-extraction": "Custom Extraction"
};

function HealthRing({ score, size = 72 }) {
  const r = (size / 2) - 7;
  const circ = 2 * Math.PI * r;
  const color = score == null ? "var(--border-strong)"
    : score >= 80 ? "var(--pass)"
    : score >= 50 ? "var(--warning)"
    : "var(--critical)";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-surface)" strokeWidth="7" />
        {score != null && (
          <circle
            cx={size/2} cy={size/2} r={r} fill="none"
            stroke={color} strokeWidth="7"
            strokeDasharray={`${(score / 100) * circ} ${circ}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${size/2} ${size/2})`}
          />
        )}
        <text
          x={size/2} y={size/2 + 5}
          textAnchor="middle"
          fill={score != null ? color : "var(--text-muted)"}
          fontSize="14" fontWeight="700"
          fontFamily="'JetBrains Mono', monospace"
        >
          {score ?? "—"}
        </text>
      </svg>
      <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Health</span>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    completed: { bg: "#F0FDF4", color: "#15803D", border: "#BBF7D0" },
    running:   { bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE" },
    failed:    { bg: "#FEF2F2", color: "#B91C1C", border: "#FECACA" },
    cancelled: { bg: "#FFFBEB", color: "#B45309", border: "#FDE68A" },
  };
  const s = map[status] ?? { bg: "var(--bg-surface)", color: "var(--text-muted)", border: "var(--border)" };
  return (
    <span style={{
      fontSize: 11, padding: "2px 8px", borderRadius: 20,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      fontWeight: 600, textTransform: "capitalize"
    }}>
      {status}
    </span>
  );
}

function MetricBox({ label, value, color }) {
  return (
    <div style={{
      background: "var(--bg-surface)", borderRadius: 10, padding: "10px 4px",
      textAlign: "center", flex: 1
    }}>
      <div style={{ fontSize: 17, fontWeight: 700, color: color ?? "var(--text-primary)", fontFamily: "'JetBrains Mono', monospace" }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function SiteCard({ site, summary }) {
  const crawlJob = summary?.crawlJob;
  const health = summary?.health ?? null;
  const sections = summary?.sections ?? {};

  const totalCritical = Object.values(sections).reduce((s, v) => s + (v.critical || 0), 0);
  const totalWarning = Object.values(sections).reduce((s, v) => s + (v.warning || 0), 0);
  const totalUrls = crawlJob?.total_urls ?? null;

  const topSections = Object.entries(sections)
    .map(([sec, counts]) => ({ sec, issues: (counts.critical || 0) + (counts.warning || 0), critical: counts.critical || 0, warning: counts.warning || 0 }))
    .filter((s) => s.issues > 0)
    .sort((a, b) => b.critical - a.critical || b.warning - a.warning)
    .slice(0, 4);

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{
        padding: "14px 18px 12px",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: site.color, flexShrink: 0 }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{site.label}</span>
        </div>
        {crawlJob ? (
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {new Date(crawlJob.completed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </span>
        ) : (
          <span style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--bg-surface)", padding: "2px 8px", borderRadius: 6 }}>
            No crawl yet
          </span>
        )}
      </div>

      {/* Metrics */}
      <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
        <HealthRing score={health} size={64} />
        <div style={{ display: "flex", gap: 6, flex: 1 }}>
          <MetricBox label="URLs" value={totalUrls?.toLocaleString() ?? "—"} />
          <MetricBox label="Critical" value={crawlJob ? totalCritical.toLocaleString() : "—"} color="var(--critical)" />
          <MetricBox label="Warnings" value={crawlJob ? totalWarning.toLocaleString() : "—"} color="var(--warning)" />
        </div>
      </div>

      {/* Top sections */}
      {topSections.length > 0 && (
        <div style={{ padding: "0 18px 10px" }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
            Top Issues
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {topSections.map(({ sec, critical, warning }) => (
              <Link
                key={sec}
                to={SECTION_LINKS[sec] ?? "/audit"}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "6px 10px", borderRadius: 8, background: "var(--bg-surface)",
                  textDecoration: "none", transition: "background 0.15s"
                }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--brand-subtle)"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--bg-surface)"}
              >
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {SECTION_LABELS[sec] ?? sec}
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  {critical > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: "var(--critical)" }}>{critical.toLocaleString()} crit</span>}
                  {warning > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: "var(--warning)" }}>{warning.toLocaleString()} warn</span>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!crawlJob && (
        <div style={{ padding: "12px 18px", flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>No audit data — run a crawl to start.</span>
        </div>
      )}

      {/* Actions */}
      <div style={{ padding: "12px 18px 16px", display: "flex", gap: 8, marginTop: "auto" }}>
        <Link
          to="/crawl"
          style={{
            flex: 1, textAlign: "center", padding: "8px 0", borderRadius: 8,
            fontSize: 12, fontWeight: 600, color: "#fff", background: site.color,
            textDecoration: "none", transition: "opacity 0.15s"
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.85"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          {crawlJob ? "Re-run Audit" : "Run Audit"}
        </Link>
        {crawlJob && (
          <Link
            to="/audit"
            className="btn btn-surface"
            style={{ fontSize: 12, textDecoration: "none" }}
          >
            Issues →
          </Link>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="card" style={{ padding: "18px 20px" }}>
      <div style={{ fontSize: 26, fontWeight: 700, color: color ?? "var(--text-primary)", fontFamily: "'JetBrains Mono', monospace" }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

const QUICK_LINKS = [
  { label: "Response Codes", to: "/response-codes", icon: "↻", desc: "4xx / 5xx errors" },
  { label: "Title Tags", to: "/title-tags", icon: "T", desc: "Missing & duplicates" },
  { label: "Internal Linking", to: "/internal-linking", icon: "⟷", desc: "Orphans & depth" },
  { label: "Core Web Vitals", to: "/core-web-vitals", icon: "⚡", desc: "LCP · CLS · FID" },
  { label: "GSC Overlay", to: "/gsc", icon: "G", desc: "Clicks & impressions" },
  { label: "Scheduler", to: "/scheduler", icon: "⏱", desc: "Automate crawls" },
];

export default function Dashboard() {
  const { sites: SITES } = useSites();
  const [summaries, setSummaries] = useState({});
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingSummaries, setLoadingSummaries] = useState(true);

  useEffect(() => {
    if (!SITES.length) { setLoadingSummaries(false); return; }
    setLoadingSummaries(true);
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
      setLoadingSummaries(false);
    });

    getHistory()
      .then((r) => setHistory(r.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
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

  const activeSites = SITES.filter((s) => summaries[s.id]?.crawlJob);
  const avgHealth = activeSites.length
    ? Math.round(activeSites.reduce((s, site) => s + (summaries[site.id]?.health ?? 0), 0) / activeSites.length)
    : null;

  const totalUrls = activeSites.reduce((s, site) => s + (summaries[site.id]?.crawlJob?.total_urls ?? 0), 0);
  const totalCritical = activeSites.reduce((s, site) => {
    const secs = summaries[site.id]?.sections ?? {};
    return s + Object.values(secs).reduce((a, v) => a + (v.critical || 0), 0);
  }, 0);
  const totalWarning = activeSites.reduce((s, site) => {
    const secs = summaries[site.id]?.sections ?? {};
    return s + Object.values(secs).reduce((a, v) => a + (v.warning || 0), 0);
  }, 0);

  const healthColor = avgHealth == null ? "var(--text-muted)"
    : avgHealth >= 80 ? "var(--pass)"
    : avgHealth >= 50 ? "var(--warning)"
    : "var(--critical)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-desc">Multi-site SEO audit platform — {SITES.map(s => s.label).join(" · ") || "No sites yet"}</p>
        </div>
        <Link to="/crawl" className="btn btn-primary" style={{ textDecoration: "none" }}>
          + New Crawl
        </Link>
      </div>

      {/* Aggregate stats */}
      {!loadingSummaries && activeSites.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          <StatCard
            label="Avg Health Score"
            value={avgHealth ?? "—"}
            sub={`across ${activeSites.length} site${activeSites.length !== 1 ? "s" : ""}`}
            color={healthColor}
          />
          <StatCard label="Total URLs Crawled" value={totalUrls.toLocaleString()} sub="latest crawl per site" />
          <StatCard label="Critical Issues" value={totalCritical.toLocaleString()} color="var(--critical)" />
          <StatCard label="Warnings" value={totalWarning.toLocaleString()} color="var(--warning)" />
        </div>
      )}

      {/* Loading shimmer */}
      {loadingSummaries && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[1,2,3,4].map(i => (
            <div key={i} className="card" style={{ padding: "18px 20px" }}>
              <div style={{ height: 26, background: "var(--bg-surface)", borderRadius: 6, width: 64, marginBottom: 8 }} />
              <div style={{ height: 12, background: "var(--bg-surface)", borderRadius: 4, width: 96 }} />
            </div>
          ))}
        </div>
      )}

      {/* Site cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {SITES.map((site) => (
          <SiteCard key={site.id} site={site} summary={summaries[site.id]} />
        ))}
      </div>

      {/* Quick links */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
          Quick Navigation
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
          {QUICK_LINKS.map(({ label, to, icon, desc }) => (
            <Link
              key={to}
              to={to}
              style={{ textDecoration: "none" }}
            >
              <div
                className="card"
                style={{ padding: "12px 14px", cursor: "pointer", transition: "border-color 0.15s, box-shadow 0.15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.boxShadow = "0 0 0 2px var(--brand-light)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <div style={{ fontSize: 18, color: "var(--text-muted)", marginBottom: 4 }}>{icon}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{label}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Crawl history */}
      <div className="card" style={{ overflow: "hidden", padding: 0 }}>
        <div style={{
          padding: "14px 20px", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between"
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Crawl History</span>
          <Link to="/crawl" style={{ fontSize: 12, color: "var(--brand)", textDecoration: "none" }}>New crawl →</Link>
        </div>

        {loadingHistory ? (
          <div style={{ padding: 32, textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>Loading…</div>
        ) : history.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12, color: "var(--text-muted)" }}>⊡</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 4 }}>No crawls yet</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>Run your first audit to start collecting data.</div>
            <Link to="/crawl" className="btn btn-primary" style={{ textDecoration: "none" }}>Run Audit</Link>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>Site</th>
                  <th>Mode</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>URLs</th>
                  <th>Started</th>
                  <th>Duration</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {history.map((job) => {
                  const site = SITES.find((s) => s.id === job.site_id);
                  const durMs = job.completed_at && job.started_at
                    ? new Date(job.completed_at) - new Date(job.started_at)
                    : null;
                  const dur = durMs == null ? "—" : durMs < 60000 ? `${Math.round(durMs / 1000)}s` : `${Math.round(durMs / 60000)}m`;
                  return (
                    <tr key={job.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: site?.color ?? "var(--text-muted)", flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: "var(--text-primary)" }}>{site?.label ?? job.site_id}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: "var(--text-secondary)", textTransform: "capitalize" }}>{job.mode}</td>
                      <td><StatusBadge status={job.status} /></td>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "var(--text-secondary)", textAlign: "right" }}>
                        {job.total_urls?.toLocaleString() ?? "—"}
                      </td>
                      <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>{new Date(job.started_at).toLocaleString()}</td>
                      <td style={{ fontSize: 12, color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace" }}>{dur}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {job.status === "completed" && (
                            <Link to="/audit" style={{ fontSize: 12, color: "var(--brand)", textDecoration: "none" }}>View →</Link>
                          )}
                          <button
                            onClick={() => handleDeleteJob(job.id)}
                            title="Delete this crawl report"
                            style={{
                              background: "none", border: "none", cursor: "pointer",
                              fontSize: 13, color: "var(--text-muted)", padding: "2px 4px", borderRadius: 4,
                              transition: "color 0.15s"
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = "var(--critical)"}
                            onMouseLeave={e => e.currentTarget.style.color = "var(--text-muted)"}
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
