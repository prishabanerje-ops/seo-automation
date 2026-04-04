import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, Legend
} from "recharts";
import {
  getGscStatus, getGscSummary, getGscQueries, getGscTrend,
  getGscPages, fetchGscData
} from "../api/index.js";
import { useSites } from "../context/SitesContext.jsx";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n, type = "num") => {
  if (n == null) return "—";
  if (type === "pct") return (n * 100).toFixed(1) + "%";
  if (type === "pos") return parseFloat(n).toFixed(1);
  return Number(n).toLocaleString();
};

function delta(curr, prev) {
  if (!prev || !curr) return null;
  return ((curr - prev) / (prev || 1)) * 100;
}

function DeltaBadge({ curr, prev, invert = false }) {
  const d = delta(curr, prev);
  if (d == null || isNaN(d)) return null;
  const up = invert ? d < 0 : d > 0;
  const color = up ? "var(--pass)" : "var(--critical)";
  const sign = d > 0 ? "+" : "";
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color, marginLeft: 6 }}>
      {sign}{d.toFixed(1)}%
    </span>
  );
}

function KpiCard({ label, value, prev, type = "num", invert = false }) {
  return (
    <div className="card" style={{ padding: "16px 20px" }}>
      <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontSize: 26, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-primary)" }}>
          {fmt(value, type)}
        </span>
        <DeltaBadge curr={value} prev={prev} invert={invert} />
      </div>
      {prev != null && (
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
          prev: {fmt(prev, type)}
        </div>
      )}
    </div>
  );
}

function Sparkline({ data, color = "#6366F1" }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d.clicks), 1);
  const w = 120, h = 32;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - (d.clicks / max) * h;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const inputStyle = {
  padding: "7px 12px", fontSize: 13, border: "1px solid var(--border)", borderRadius: 8,
  background: "var(--bg-page)", color: "var(--text-primary)", outline: "none", fontFamily: "inherit"
};

// ─── Custom tooltip ───────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--text-primary)" }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: {typeof p.value === "number" && p.name === "CTR" ? (p.value * 100).toFixed(2) + "%" : p.value?.toLocaleString()}
        </div>
      ))}
    </div>
  );
}

// ─── Index Coverage (derived from page data) ──────────────────────────────────
function IndexCoverage({ pages }) {
  if (!pages?.length) return null;
  const indexed = pages.filter(p => (p.impressions ?? 0) > 0).length;
  const notIndexed = pages.length - indexed;
  const total = pages.length;
  const segments = [
    { label: "Indexed (has impressions)", count: indexed, color: "#10B981" },
    { label: "No impressions", count: notIndexed, color: "#94A3B8" },
  ];
  return (
    <div>
      <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", marginBottom: 12, gap: 2 }}>
        {segments.map(s => (
          <div key={s.label} style={{ flex: s.count, background: s.color, minWidth: s.count > 0 ? 4 : 0 }} />
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {segments.map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{s.label}</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{s.count.toLocaleString()}</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{total > 0 ? ((s.count / total) * 100).toFixed(1) : 0}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function GSCOverlay() {
  const { sites } = useSites();
  const [searchParams] = useSearchParams();

  const gscSites = useMemo(() => sites.filter(s => s.gsc_property), [sites]);
  const [activeTab, setActiveTab] = useState("all");

  const [authStatus, setAuthStatus] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [fetchMsg, setFetchMsg] = useState(null);

  // Per-tab data
  const [summary, setSummary] = useState(null);
  const [queries, setQueries] = useState([]);
  const [trend, setTrend] = useState([]);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(false);

  // Query filter
  const [queryFilter, setQueryFilter] = useState("");
  const [pageFilter, setPageFilter] = useState("");

  // Check auth
  useEffect(() => {
    getGscStatus().then(r => setAuthStatus(r.data)).catch(() => setAuthStatus({ authenticated: false }));
    const p = searchParams.get("gsc");
    if (p === "connected") setFetchMsg("Connected successfully!");
    if (p === "error") setFetchMsg("Connection error: " + (searchParams.get("msg") || "unknown"));
  }, []);

  // Load data when tab changes
  useEffect(() => {
    if (!authStatus?.authenticated) return;
    const siteId = activeTab === "all" ? (gscSites[0]?.id || null) : activeTab;
    if (!siteId) return;

    setLoading(true);
    Promise.all([
      getGscSummary(siteId).then(r => setSummary(r.data)).catch(() => setSummary(null)),
      getGscQueries(siteId).then(r => setQueries(r.data.queries ?? [])).catch(() => setQueries([])),
      getGscTrend(siteId).then(r => setTrend(r.data.trend ?? [])).catch(() => setTrend([])),
      getGscPages(siteId).then(r => setPages(r.data.data ?? [])).catch(() => setPages([])),
    ]).finally(() => setLoading(false));
  }, [activeTab, authStatus, gscSites.length]);

  async function handleFetch() {
    const siteId = activeTab === "all" ? (gscSites[0]?.id || null) : activeTab;
    if (!siteId) return;
    setFetching(true);
    setFetchMsg("Fetching from Google Search Console…");
    try {
      const r = await fetchGscData(siteId);
      setFetchMsg(`Done — ${r.data.pages} pages, ${r.data.queries} queries`);
      // Reload data
      const [s, q, t, p] = await Promise.all([
        getGscSummary(siteId), getGscQueries(siteId), getGscTrend(siteId), getGscPages(siteId)
      ]);
      setSummary(s.data); setQueries(q.data.queries ?? []); setTrend(t.data.trend ?? []); setPages(p.data.data ?? []);
    } catch (err) {
      setFetchMsg("Error: " + (err.response?.data?.error ?? err.message));
    } finally {
      setFetching(false);
    }
  }

  const curr = summary?.current || {};
  const prev = summary?.previous || {};
  const sparkData = summary?.daily || [];

  const filteredQueries = useMemo(() =>
    queries.filter(q => !queryFilter || q.query?.toLowerCase().includes(queryFilter.toLowerCase())),
    [queries, queryFilter]
  );
  const filteredPages = useMemo(() =>
    pages.filter(p => !pageFilter || p.url?.toLowerCase().includes(pageFilter.toLowerCase())),
    [pages, pageFilter]
  );

  // Chart data — format date labels
  const trendChart = trend.map(d => ({
    date: d.date?.slice(5), // "MM-DD"
    Clicks: d.clicks,
    Impressions: d.impressions,
    CTR: d.ctr,
  }));

  const activeSite = gscSites.find(s => s.id === activeTab);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title">Search Console</h1>
          <p className="page-desc">Clicks, impressions, CTR and position from Google Search Console (last 28 days vs prev 28 days).</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {authStatus?.authenticated && (
            <button onClick={handleFetch} disabled={fetching} className="btn btn-primary" style={{ opacity: fetching ? 0.6 : 1 }}>
              {fetching ? "Fetching…" : "↻ Refresh Data"}
            </button>
          )}
          {!authStatus?.authenticated && authStatus !== null && (
            <a href="/api/gsc/auth" className="btn btn-primary" style={{ textDecoration: "none" }}>
              Connect Google Account
            </a>
          )}
        </div>
      </div>

      {/* Connection status */}
      <div className="card" style={{ padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 9, height: 9, borderRadius: "50%", background: authStatus?.authenticated ? "#10B981" : "var(--border-strong)", flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>
            {authStatus?.authenticated ? `Connected — ${authStatus.email || "Google Account"}` : "Not connected to Google Search Console"}
          </span>
        </div>
        {authStatus?.authenticated && (
          <button onClick={() => { fetch("/api/gsc/revoke", { method: "POST", credentials: "include" }); setAuthStatus({ authenticated: false }); }}
            className="btn btn-surface" style={{ fontSize: 12 }}>
            Disconnect
          </button>
        )}
      </div>

      {fetchMsg && (
        <div style={{ fontSize: 13, color: fetchMsg.startsWith("Error") ? "var(--critical)" : "var(--pass)", fontWeight: 500 }}>
          {fetchMsg}
        </div>
      )}

      {!authStatus?.authenticated && (
        <div className="card" style={{ padding: "48px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Connect Google Search Console</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
            Authenticate with Google to pull clicks, impressions, CTR and keyword data for your sites.
          </div>
          <a href="/api/gsc/auth" className="btn btn-primary" style={{ textDecoration: "none" }}>
            Connect Google Account
          </a>
        </div>
      )}

      {authStatus?.authenticated && (
        <>
          {/* Property tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--border)", gap: 0 }}>
            <button
              onClick={() => setActiveTab("all")}
              style={{
                padding: "10px 18px", fontSize: 13, fontWeight: 500, cursor: "pointer",
                background: "none", border: "none",
                borderBottom: `2px solid ${activeTab === "all" ? "var(--brand)" : "transparent"}`,
                color: activeTab === "all" ? "var(--brand)" : "var(--text-muted)"
              }}
            >
              All Properties
            </button>
            {gscSites.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveTab(s.id)}
                style={{
                  padding: "10px 18px", fontSize: 13, fontWeight: 500, cursor: "pointer",
                  background: "none", border: "none",
                  borderBottom: `2px solid ${activeTab === s.id ? (s.color || "var(--brand)") : "transparent"}`,
                  color: activeTab === s.id ? (s.color || "var(--brand)") : "var(--text-muted)"
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: s.color || "var(--brand)", display: "inline-block" }} />
                  {s.label}
                </span>
              </button>
            ))}
            {gscSites.length === 0 && (
              <span style={{ padding: "10px 18px", fontSize: 12, color: "var(--text-muted)" }}>
                No sites with GSC property configured. Set it in Manage Sites.
              </span>
            )}
          </div>

          {loading ? (
            <div style={{ padding: "48px 0", textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>Loading…</div>
          ) : (
            <>
              {/* 4 KPI cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
                <KpiCard label="Total Clicks" value={curr.clicks} prev={prev.clicks} />
                <KpiCard label="Impressions" value={curr.impressions} prev={prev.impressions} />
                <KpiCard label="Avg CTR" value={curr.ctr} prev={prev.ctr} type="pct" />
                <KpiCard label="Avg Position" value={curr.position} prev={prev.position} type="pos" invert />
              </div>

              {/* Per-property comparison (when All tab) */}
              {activeTab === "all" && gscSites.length > 1 && (
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(gscSites.length, 3)}, 1fr)`, gap: 14 }}>
                  {gscSites.map(s => (
                    <PropertyMiniCard key={s.id} site={s} />
                  ))}
                </div>
              )}

              {/* Charts */}
              {trendChart.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 16 }}>
                  {/* Dual bar chart — Clicks & Impressions */}
                  <div className="card" style={{ padding: "16px 20px" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: "var(--text-primary)" }}>
                      Clicks & Impressions (28-day)
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={trendChart} barGap={2} barCategoryGap="30%">
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--text-muted)" }} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="Clicks" fill="#6366F1" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="Impressions" fill="#A5B4FC" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* CTR trend line */}
                  <div className="card" style={{ padding: "16px 20px" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: "var(--text-primary)" }}>
                      CTR Trend (28-day)
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={trendChart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--text-muted)" }} tickLine={false} />
                        <YAxis tickFormatter={v => (v * 100).toFixed(1) + "%"} tick={{ fontSize: 10, fill: "var(--text-muted)" }} tickLine={false} axisLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Line type="monotone" dataKey="CTR" stroke="#10B981" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Top Queries + Index Coverage */}
              <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 16 }}>
                {/* Top Queries table */}
                <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                  <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Top Queries</span>
                    <input
                      type="text" placeholder="Filter queries…" value={queryFilter}
                      onChange={e => setQueryFilter(e.target.value)}
                      style={{ ...inputStyle, fontSize: 12, padding: "5px 10px", width: 160 }}
                    />
                  </div>
                  {filteredQueries.length === 0 ? (
                    <div style={{ padding: "32px", textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>
                      {queries.length === 0 ? "No query data. Click Refresh Data." : "No matches."}
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto", maxHeight: 420, overflowY: "auto" }}>
                      <table className="data-table" style={{ width: "100%" }}>
                        <thead>
                          <tr>
                            <th>Query</th>
                            <th style={{ textAlign: "right" }}>Clicks</th>
                            <th style={{ textAlign: "right" }}>Impr.</th>
                            <th style={{ textAlign: "right" }}>CTR</th>
                            <th style={{ textAlign: "right" }}>Pos.</th>
                            <th style={{ textAlign: "right" }}>Δ Clicks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredQueries.slice(0, 100).map((q, i) => {
                            const d = delta(q.clicks, q.prev_clicks);
                            const dColor = d > 0 ? "var(--pass)" : d < 0 ? "var(--critical)" : "var(--text-muted)";
                            return (
                              <tr key={i}>
                                <td style={{ fontSize: 12, maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{q.query}</td>
                                <td style={{ textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{fmt(q.clicks)}</td>
                                <td style={{ textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "var(--text-muted)" }}>{fmt(q.impressions)}</td>
                                <td style={{ textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{fmt(q.ctr, "pct")}</td>
                                <td style={{ textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: q.position <= 10 ? "var(--pass)" : "var(--text-muted)" }}>
                                  {fmt(q.position, "pos")}
                                </td>
                                <td style={{ textAlign: "right", fontSize: 11, fontWeight: 600, color: dColor }}>
                                  {d != null && !isNaN(d) ? (d > 0 ? "+" : "") + d.toFixed(1) + "%" : "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Index Coverage */}
                <div className="card" style={{ padding: "16px 20px" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: "var(--text-primary)" }}>
                    Index Coverage
                    <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400, marginLeft: 8 }}>
                      (based on impressions)
                    </span>
                  </div>
                  <IndexCoverage pages={pages} />
                  {pages.length > 0 && (
                    <div style={{ marginTop: 16, fontSize: 12, color: "var(--text-muted)", borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                      {pages.length.toLocaleString()} total pages · last 28 days
                    </div>
                  )}
                </div>
              </div>

              {/* Top Pages table */}
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Top Pages</span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="text" placeholder="Filter by URL…" value={pageFilter}
                      onChange={e => setPageFilter(e.target.value)}
                      style={{ ...inputStyle, fontSize: 12, padding: "5px 10px", width: 200 }}
                    />
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{filteredPages.length} pages</span>
                  </div>
                </div>
                {filteredPages.length === 0 ? (
                  <div style={{ padding: "32px", textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>
                    {pages.length === 0 ? "No page data. Click Refresh Data to fetch from GSC." : "No matches."}
                  </div>
                ) : (
                  <div style={{ overflowX: "auto", maxHeight: 480, overflowY: "auto" }}>
                    <table className="data-table" style={{ width: "100%" }}>
                      <thead>
                        <tr>
                          <th>URL</th>
                          <th style={{ textAlign: "right" }}>Clicks</th>
                          <th style={{ textAlign: "right" }}>Impressions</th>
                          <th style={{ textAlign: "right" }}>CTR</th>
                          <th style={{ textAlign: "right" }}>Avg Position</th>
                          <th>Signal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPages.slice(0, 200).map((p, i) => (
                          <tr key={i}>
                            <td>
                              <a href={p.url} target="_blank" rel="noreferrer"
                                style={{ color: "var(--brand)", textDecoration: "none", fontSize: 12, display: "block", maxWidth: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {p.url}
                              </a>
                            </td>
                            <td style={{ textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>{fmt(p.clicks)}</td>
                            <td style={{ textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "var(--text-muted)" }}>{fmt(p.impressions)}</td>
                            <td style={{ textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: (p.ctr ?? 0) < 0.02 ? "var(--warning)" : "var(--pass)" }}>
                              {fmt(p.ctr, "pct")}
                            </td>
                            <td style={{ textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: (p.position ?? 99) <= 10 ? "var(--pass)" : "var(--text-muted)" }}>
                              {fmt(p.position, "pos")}
                            </td>
                            <td>
                              {(p.impressions ?? 0) > 500 && (p.ctr ?? 0) < 0.02 && (
                                <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: "var(--warning-bg)", color: "var(--warning-text)", fontWeight: 600 }}>Low CTR</span>
                              )}
                              {(p.clicks ?? 0) === 0 && (p.impressions ?? 0) > 100 && (
                                <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, background: "#EFF6FF", color: "#1D4ED8", fontWeight: 600 }}>0 clicks</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── Per-property mini card (used in All tab) ─────────────────────────────────
function PropertyMiniCard({ site }) {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    getGscSummary(site.id).then(r => setSummary(r.data)).catch(() => {});
  }, [site.id]);

  const curr = summary?.current || {};
  const prev = summary?.previous || {};
  const sparkData = summary?.daily || [];

  return (
    <div className="card" style={{ padding: "16px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div style={{ width: 9, height: 9, borderRadius: "50%", background: site.color, flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{site.label}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        {[
          { label: "Clicks", value: curr.clicks, prev: prev.clicks },
          { label: "Impressions", value: curr.impressions, prev: prev.impressions },
          { label: "CTR", value: curr.ctr, prev: prev.ctr, type: "pct" },
          { label: "Position", value: curr.position, prev: prev.position, type: "pos", invert: true },
        ].map(({ label, value, prev: p, type = "num", invert = false }) => (
          <div key={label}>
            <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginTop: 2 }}>
              <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                {value != null ? (type === "pct" ? (value * 100).toFixed(1) + "%" : type === "pos" ? parseFloat(value).toFixed(1) : Number(value).toLocaleString()) : "—"}
              </span>
              <DeltaBadge curr={value} prev={p} invert={invert} />
            </div>
          </div>
        ))}
      </div>
      <Sparkline data={sparkData} color={site.color || "#6366F1"} />
    </div>
  );
}
