import { useEffect, useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getHealth } from "../api/index.js";
import { useSites } from "../context/SitesContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

// Route → breadcrumb + page title
const ROUTE_META = {
  "/":                      { trail: ["Projects"], title: "Dashboard" },
  "/founder":               { trail: ["Projects", "Founder View"], title: "Founder View" },
  "/sites":                 { trail: ["Projects"], title: "Manage Sites" },
  "/crawl":                 { trail: ["SEO"], title: "Crawl Runner" },
  "/audit":                 { trail: ["SEO"], title: "All Issues" },
  "/audit-health":          { trail: ["SEO"], title: "Audit Health (477 Checks)" },
  "/response-codes":        { trail: ["SEO", "Audit"], title: "Response Codes" },
  "/redirects":             { trail: ["SEO", "Audit"], title: "Redirects" },
  "/404-errors":            { trail: ["SEO", "Audit"], title: "404 & Status Errors" },
  "/https-security":        { trail: ["SEO", "Audit"], title: "HTTPS & Security" },
  "/canonical-tags":        { trail: ["SEO", "Audit"], title: "Canonical Tags" },
  "/robots-txt":            { trail: ["SEO", "Audit"], title: "Robots.txt" },
  "/meta-robots":           { trail: ["SEO", "Audit"], title: "Meta Robots & Indexation" },
  "/url-structure":         { trail: ["SEO", "Audit"], title: "URL Structure" },
  "/title-tags":            { trail: ["SEO", "Audit"], title: "Title Tags" },
  "/meta-descriptions":     { trail: ["SEO", "Audit"], title: "Meta Descriptions" },
  "/headings":              { trail: ["SEO", "Audit"], title: "Headings" },
  "/content-quality":       { trail: ["SEO", "Audit"], title: "Content Quality & Duplicates" },
  "/keyword-strategy":      { trail: ["SEO", "Audit"], title: "Keyword Strategy" },
  "/sitemaps":              { trail: ["SEO", "Audit"], title: "Sitemaps" },
  "/javascript-rendering":  { trail: ["SEO", "Audit"], title: "JavaScript & Rendering" },
  "/html-structure":        { trail: ["SEO", "Audit"], title: "HTML Structure" },
  "/m-site-desktop":        { trail: ["SEO", "Audit"], title: "M-Site vs Desktop" },
  "/schema":                { trail: ["SEO", "Audit"], title: "Schema & Structured Data" },
  "/images-media":          { trail: ["SEO", "Audit"], title: "Images & Media" },
  "/core-web-vitals":       { trail: ["SEO", "Audit"], title: "Core Web Vitals & Page Speed" },
  "/internal-linking":      { trail: ["SEO", "Audit"], title: "Internal Linking & Architecture" },
  "/local-seo":             { trail: ["SEO", "Audit"], title: "Local SEO" },
  "/backlinks":             { trail: ["SEO", "Audit"], title: "Backlinks & Authority" },
  "/hreflang":              { trail: ["SEO", "Audit"], title: "Hreflang" },
  "/analytics-tracking":    { trail: ["SEO", "Audit"], title: "Analytics & Tracking" },
  "/log-file-analysis":     { trail: ["SEO", "Audit"], title: "Log File & Crawl Analysis" },
  "/gsc":                   { trail: ["SEO"], title: "Search Console" },
  "/ga4":                   { trail: ["SEO"], title: "GA4 Overlay" },
  "/page-speed":            { trail: ["SEO"], title: "PageSpeed Insights" },
  "/scheduler":             { trail: ["Config"], title: "Scheduler" },
  "/settings":              { trail: ["Config"], title: "Settings" },
  "/settings/status":       { trail: ["Config", "Settings"], title: "System Health" },
  "/custom-extraction":     { trail: ["SEO", "Audit"], title: "Custom Extraction" },
};

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
    </svg>
  );
}

const ROLE_COLORS = { founder: "#10B981", seo: "#6366F1", readonly: "#94A3B8" };
const ROLE_LABELS = { founder: "Founder", seo: "SEO", readonly: "Read-only" };

function UserMenu({ user, logout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = (user.name || user.email || "?")
    .split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 7, background: "none",
          border: "1.5px solid var(--border)", borderRadius: 8, padding: "4px 10px 4px 6px",
          cursor: "pointer", color: "var(--text)", fontSize: 13, fontWeight: 500,
          transition: "border-color 0.15s"
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = "var(--brand)"}
        onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
      >
        <div style={{
          width: 24, height: 24, borderRadius: 6, background: "var(--brand)",
          color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700, flexShrink: 0
        }}>{initials}</div>
        <span style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {user.name || user.email}
        </span>
        <span style={{
          fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4,
          background: ROLE_COLORS[user.role] + "20", color: ROLE_COLORS[user.role]
        }}>
          {ROLE_LABELS[user.role] || user.role}
        </span>
      </button>

      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 6px)", minWidth: 180,
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", zIndex: 999,
          overflow: "hidden"
        }}>
          <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{user.name}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{user.email}</div>
          </div>
          {user.role === "founder" && (
            <button
              onClick={() => { setOpen(false); navigate("/settings/users"); }}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "9px 14px", background: "none", border: "none",
                cursor: "pointer", fontSize: 13, color: "var(--text)",
                transition: "background 0.1s"
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
            >
              Manage Users
            </button>
          )}
          <button
            onClick={() => { setOpen(false); logout(); navigate("/login"); }}
            style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "9px 14px", background: "none", border: "none",
              cursor: "pointer", fontSize: 13, color: "#EF4444",
              transition: "background 0.1s"
            }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--bg)"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function Header({ notifCount = 0 }) {
  const location = useLocation();
  const [apiStatus, setApiStatus] = useState("connecting");
  const { sites, activeSiteId, setActiveSiteId, loading: sitesLoading } = useSites();
  const { user, logout } = useAuth();
  const meta = ROUTE_META[location.pathname] || { trail: [], title: location.pathname.replace("/", "") };

  useEffect(() => {
    getHealth()
      .then(() => setApiStatus("ok"))
      .catch(() => setApiStatus("error"));
  }, []);

  const statusColor = apiStatus === "ok" ? "#10B981" : apiStatus === "error" ? "#EF4444" : "#F59E0B";
  const statusLabel = apiStatus === "ok" ? "API OK" : apiStatus === "error" ? "API OFFLINE" : "CONNECTING";

  return (
    <header className="app-header">
      {/* Left — breadcrumb */}
      <div className="breadcrumb">
        <span className="breadcrumb-item">
          <Link to="/">Projects</Link>
        </span>
        {meta.trail.map((seg) => (
          <span key={seg} style={{ display: "contents" }}>
            <span className="breadcrumb-sep">›</span>
            <span className="breadcrumb-item">{seg}</span>
          </span>
        ))}
        <span className="breadcrumb-sep">›</span>
        <span className="breadcrumb-item current">{meta.title}</span>
      </div>

      {/* Right — site pills + controls */}
      <div className="header-right">
        {/* Dynamic site pills from API */}
        {!sitesLoading && sites.map((s) => {
          const active = activeSiteId === s.id;
          const color = s.color || "#6366F1";
          return (
            <button
              key={s.id}
              className={`site-pill${active ? " active" : ""}`}
              style={active ? { color, borderColor: color, background: color + "15" } : {}}
              onClick={() => setActiveSiteId(s.id)}
              title={s.url}
            >
              <span className="site-dot" style={{ background: color }} />
              {s.label}
            </button>
          );
        })}

        {/* Add site shortcut */}
        <Link
          to="/sites"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 26, height: 26, borderRadius: 6, border: "1.5px dashed var(--border-strong)",
            color: "var(--text-muted)", textDecoration: "none", fontSize: 16, fontWeight: 600,
            transition: "all 0.15s"
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--brand)"; e.currentTarget.style.color = "var(--brand)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.color = "var(--text-muted)"; }}
          title="Manage sites"
        >
          +
        </Link>

        {/* Notification bell */}
        <button className="header-btn" title="Notifications">
          <BellIcon />
          {notifCount > 0 && <span className="notif-badge">{notifCount}</span>}
        </button>

        {/* API status */}
        <div className="api-status">
          <span className="api-dot" style={{ background: statusColor }} />
          {statusLabel}
        </div>

        {/* User menu */}
        {user && <UserMenu user={user} logout={logout} />}
      </div>
    </header>
  );
}
