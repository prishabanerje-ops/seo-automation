import { useState, useEffect, useMemo } from "react";
import api from "../api/index.js";
import { useSites } from "../context/SitesContext.jsx";
import SiteSelector from "../components/SiteSelector.jsx";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n, type = "num") => {
  if (n == null || n === "") return "—";
  const v = parseFloat(n);
  if (isNaN(v)) return "—";
  if (type === "pct") return (v * 100).toFixed(1) + "%";
  if (type === "dur") {
    const s = Math.round(v);
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  }
  if (type === "money") return "$" + v.toLocaleString("en", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return v.toLocaleString();
};

const inputStyle = {
  padding: "7px 12px", fontSize: 13, border: "1px solid var(--border)", borderRadius: 8,
  background: "var(--bg-page)", color: "var(--text-primary)", outline: "none", fontFamily: "inherit"
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, type = "num", color }) {
  return (
    <div className="card" style={{ padding: "16px 20px" }}>
      <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: color || "var(--text-primary)" }}>
        {fmt(value, type)}
      </div>
    </div>
  );
}

// ─── Engagement bar ───────────────────────────────────────────────────────────
function EngBar({ value }) {
  const pct = Math.min(100, Math.max(0, parseFloat(value || 0) * 100));
  const color = pct >= 70 ? "var(--pass)" : pct >= 40 ? "var(--warning)" : "var(--critical)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: "var(--bg-surface)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.3s" }} />
      </div>
      <span style={{ fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color, minWidth: 36, textAlign: "right" }}>
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

// ─── Connect screen ───────────────────────────────────────────────────────────
function ConnectScreen() {
  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 24px", gap: 16, textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: 12, background: "var(--brand-light)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/>
          </svg>
        </div>
        <div>
          <div style={{ fontFamily: "Plus Jakarta Sans,sans-serif", fontWeight: 700, fontSize: 17, marginBottom: 6 }}>Connect Google Analytics 4</div>
          <div style={{ color: "var(--text-secondary)", fontSize: 13.5, lineHeight: 1.6, maxWidth: 380 }}>
            Connect GA4 to overlay sessions, engagement rate, bounce rate, and revenue data per page alongside your audit results.
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 320 }}>
          <a href="/api/ga4/auth" className="btn btn-primary" style={{ justifyContent: "center" }}>
            Connect Google Analytics 4
          </a>
          <a href="/settings" className="btn btn-surface" style={{ justifyContent: "center" }}>
            Configure in Settings
          </a>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 380 }}>
          Requires Google OAuth. Same GCP project as GSC. Scope:{" "}
          <code style={{ fontFamily: "JetBrains Mono,monospace", background: "var(--bg-surface)", padding: "1px 5px", borderRadius: 4 }}>
            analytics.readonly
          </code>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function GA4Overlay() {
  const { activeSiteId, sites } = useSites();
  const defaultSite = activeSiteId || sites[0]?.id || "";

  const [connected, setConnected] = useState(null); // null=loading, false=not, true=yes
  const [site, setSite] = useState(defaultSite);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [error, setError] = useState(null);
  const [filterText, setFilterText] = useState("");
  const [sortKey, setSortKey] = useState("sessions");
  const [sortDir, setSortDir] = useState("desc");
  const [toast, setToast] = useState(null);

  // Sync site with global context
  useEffect(() => { if (activeSiteId) setSite(activeSiteId); }, [activeSiteId]);

  // Check connection status
  useEffect(() => {
    api.get("/ga4/status")
      .then(r => setConnected(r.data?.connected === true))
      .catch(() => setConnected(false));
  }, []);

  // Load cached data when site changes
  useEffect(() => {
    if (!site || connected !== true) return;
    setLoading(true);
    setRows([]);
    api.get(`/ga4/data/${site}`)
      .then(r => {
        setRows(r.data || []);
        if ((r.data || []).length > 0) setFetchedAt(r.data[0]?.fetched_at || null);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [site, connected]);

  async function handleFetch() {
    if (!site) return;
    const activeSite = sites.find(s => s.id === site);
    const propertyId = activeSite?.ga4_property_id;
    if (!propertyId) {
      setError("No GA4 Property ID set for this site. Add it in Manage Sites.");
      return;
    }
    setFetching(true);
    setError(null);
    try {
      await api.post(`/ga4/fetch/${site}`, { propertyId });
      const r = await api.get(`/ga4/data/${site}`);
      setRows(r.data || []);
      if ((r.data || []).length > 0) setFetchedAt(r.data[0]?.fetched_at || null);
      showToast(`Fetched ${(r.data || []).length.toLocaleString()} pages from GA4.`);
    } catch (err) {
      setError(err.response?.data?.error || "Fetch failed");
    } finally {
      setFetching(false);
    }
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir(d => d === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const filtered = useMemo(() => {
    let data = [...rows];
    if (filterText) {
      const q = filterText.toLowerCase();
      data = data.filter(r => (r.url || "").toLowerCase().includes(q));
    }
    data.sort((a, b) => {
      const av = parseFloat(a[sortKey]) || 0;
      const bv = parseFloat(b[sortKey]) || 0;
      return sortDir === "desc" ? bv - av : av - bv;
    });
    return data;
  }, [rows, filterText, sortKey, sortDir]);

  // Summary totals
  const totals = useMemo(() => ({
    sessions: filtered.reduce((s, r) => s + (parseInt(r.sessions) || 0), 0),
    engaged: filtered.reduce((s, r) => s + (parseInt(r.engaged_sessions) || 0), 0),
    revenue: filtered.reduce((s, r) => s + (parseFloat(r.total_revenue) || 0), 0),
    conversions: filtered.reduce((s, r) => s + (parseInt(r.conversions) || 0), 0),
  }), [filtered]);

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <span style={{ color: "var(--border-strong)", fontSize: 10 }}> ⇅</span>;
    return <span style={{ color: "var(--brand)", fontSize: 10 }}> {sortDir === "desc" ? "↓" : "↑"}</span>;
  };

  const thStyle = {
    padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600,
    letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--text-secondary)",
    whiteSpace: "nowrap", cursor: "pointer", userSelect: "none"
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24,
          background: "var(--text-primary)", color: "#fff",
          fontSize: 13, padding: "10px 18px", borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.15)", zIndex: 999
        }}>
          {toast}
        </div>
      )}

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 className="page-title">GA4 Overlay</h1>
          <p className="page-desc">
            Session, engagement, bounce rate and revenue per page — last 28 days.
            {fetchedAt && (
              <span style={{ marginLeft: 10, color: "var(--text-muted)" }}>
                Cached: {new Date(fetchedAt).toLocaleString()}
              </span>
            )}
          </p>
        </div>
        {connected === true && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <SiteSelector selected={site} onChange={setSite} />
            <button
              onClick={handleFetch}
              disabled={fetching}
              className="btn btn-primary"
              style={{ opacity: fetching ? 0.6 : 1 }}
            >
              {fetching ? "Fetching…" : "↻ Refresh"}
            </button>
          </div>
        )}
      </div>

      {/* Connection loading */}
      {connected === null && (
        <div style={{ padding: "40px 0", textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>
          Checking GA4 connection…
        </div>
      )}

      {/* Not connected */}
      {connected === false && <ConnectScreen />}

      {/* Connected + data */}
      {connected === true && (
        <>
          {error && (
            <div style={{ padding: "10px 14px", background: "var(--critical-bg)", color: "var(--critical-text)", borderRadius: 8, fontSize: 13, border: "1px solid #FECACA" }}>
              {error}
            </div>
          )}

          {/* KPI row */}
          {rows.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              <KpiCard label="Total Sessions" value={totals.sessions} />
              <KpiCard label="Engaged Sessions" value={totals.engaged} color="var(--pass)" />
              <KpiCard label="Total Revenue" value={totals.revenue} type="money" color="var(--brand)" />
              <KpiCard label="Conversions" value={totals.conversions} color="var(--info)" />
            </div>
          )}

          {/* Filter bar */}
          {rows.length > 0 && (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input
                type="text"
                placeholder="Filter by URL…"
                value={filterText}
                onChange={e => setFilterText(e.target.value)}
                style={{ ...inputStyle, width: 280 }}
              />
              <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: "auto" }}>
                {filtered.length.toLocaleString()} pages
              </span>
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div style={{ padding: "40px 0", textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>
              Loading cached data…
            </div>
          ) : rows.length === 0 ? (
            <div className="card">
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 24px", gap: 12, textAlign: "center" }}>
                <div style={{ fontSize: 36, color: "var(--text-muted)" }}>📊</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>No GA4 data yet</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 340, lineHeight: 1.6 }}>
                  Click <strong>↻ Refresh</strong> to fetch the latest 28 days of page-level data from your GA4 property.
                </div>
                {!sites.find(s => s.id === site)?.ga4_property_id && (
                  <div style={{ fontSize: 12, color: "var(--warning)", padding: "8px 12px", background: "var(--warning-bg)", borderRadius: 8 }}>
                    No GA4 Property ID set for this site. Add it in{" "}
                    <a href="/sites" style={{ color: "var(--warning-text)", fontWeight: 600 }}>Manage Sites</a>.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={thStyle}>Page URL</th>
                    <th style={thStyle} onClick={() => toggleSort("sessions")}>
                      Sessions <SortIcon col="sessions" />
                    </th>
                    <th style={thStyle} onClick={() => toggleSort("engaged_sessions")}>
                      Engaged <SortIcon col="engaged_sessions" />
                    </th>
                    <th style={thStyle} onClick={() => toggleSort("engagement_rate")}>
                      Eng. Rate <SortIcon col="engagement_rate" />
                    </th>
                    <th style={thStyle} onClick={() => toggleSort("bounce_rate")}>
                      Bounce <SortIcon col="bounce_rate" />
                    </th>
                    <th style={thStyle} onClick={() => toggleSort("avg_session_duration")}>
                      Avg Duration <SortIcon col="avg_session_duration" />
                    </th>
                    <th style={thStyle} onClick={() => toggleSort("total_revenue")}>
                      Revenue <SortIcon col="total_revenue" />
                    </th>
                    <th style={thStyle} onClick={() => toggleSort("conversions")}>
                      Conv. <SortIcon col="conversions" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, i) => (
                    <tr key={i}>
                      <td>
                        <a
                          href={row.url}
                          target="_blank"
                          rel="noreferrer"
                          className="url-cell"
                          style={{ display: "block", maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--brand)", textDecoration: "none" }}
                          title={row.url}
                        >
                          {row.url}
                        </a>
                      </td>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600 }}>
                        {parseInt(row.sessions || 0).toLocaleString()}
                      </td>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                        {parseInt(row.engaged_sessions || 0).toLocaleString()}
                      </td>
                      <td style={{ minWidth: 120 }}>
                        <EngBar value={row.engagement_rate} />
                      </td>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                        {fmt(row.bounce_rate, "pct")}
                      </td>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                        {fmt(row.avg_session_duration, "dur")}
                      </td>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: parseFloat(row.total_revenue) > 0 ? "var(--pass)" : "var(--text-muted)" }}>
                        {fmt(row.total_revenue, "money")}
                      </td>
                      <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600 }}>
                        {parseInt(row.conversions || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
