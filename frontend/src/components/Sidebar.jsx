import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useSites } from "../context/SitesContext.jsx";
import api from "../api/index.js";

// ─── Nav icon (24px viewBox Heroicons-style) ─────────────────────────────────
function NavIcon({ path, path2 }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
         className="sidebar-icon">
      <path d={path} />
      {path2 && <path d={path2} />}
    </svg>
  );
}

// ─── Paths lookup ─────────────────────────────────────────────────────────────
const P = {
  home:       "M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z",
  crawl:      "M12 22a10 10 0 100-20 10 10 0 000 20zm0-10V6m0 6l3 3",
  issues:     "M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  health:     "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
  response:   "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  redirect:   "M8 7l4-4m0 0l4 4m-4-4v18",
  error404:   "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z",
  https:      "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  canonical:  "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.1-1.1m-.757-4.9a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
  robots:     "M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V8l-5-5H9z M13 3v5h5",
  meta_robots:"M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  meta_robots2:"M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
  url:        "M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71 M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71",
  title:      "M4 6h16M4 12h16M4 18h7",
  meta_desc:  "M4 6h16M4 10h16M4 14h12",
  headings:   "M4 6h16M4 10h10M4 14h14",
  content:    "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l2 2h2a2 2 0 012 2v10a2 2 0 01-2 2z",
  keyword:    "M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z",
  sitemap:    "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7",
  js:         "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4",
  html:       "M7 8l-4 4 4 4M17 8l4 4-4 4M14 4l-4 16",
  mobile:     "M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z",
  schema:     "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4",
  images:     "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
  cwv:        "M13 10V3L4 14h7v7l9-11h-7z",
  internal:   "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10",
  local:      "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z",
  backlinks:  "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.1-1.1m-.757-4.9a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1",
  hreflang:   "M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129",
  analytics:  "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
  logfile:    "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  gsc:        "M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z",
  ga4:        "M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z",
  pagespeed:  "M13 10V3L4 14h7v7l9-11h-7z",
  schedule:   "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  settings:   "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
  settings2:  "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  founder:    "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
};

// ─── Single Nav Item ──────────────────────────────────────────────────────────
function SideItem({ to, icon, label, criticalCount }) {
  const p  = P[icon]  || P.issues;
  const p2 = icon === "meta_robots" ? P.meta_robots2
           : icon === "settings"    ? P.settings2
           : null;
  return (
    <NavLink to={to} className={({ isActive }) => `sidebar-item${isActive ? " active" : ""}`}>
      <NavIcon path={p} path2={p2} />
      <span className="sidebar-label">{label}</span>
      {criticalCount > 0 && (
        <span style={{
          marginLeft: "auto",
          background: "#EF4444",
          color: "#fff",
          borderRadius: 10,
          fontSize: 10,
          fontWeight: 700,
          padding: "1px 6px",
          flexShrink: 0,
          minWidth: 18,
          textAlign: "center",
          lineHeight: "16px",
        }}>
          {criticalCount > 99 ? "99+" : criticalCount}
        </span>
      )}
    </NavLink>
  );
}

// ─── Section Group ────────────────────────────────────────────────────────────
function Group({ label, children }) {
  return (
    <div style={{ paddingBottom: 2 }}>
      {label && <div className="sidebar-group-label">{label}</div>}
      {children}
    </div>
  );
}

const ROLE_LABELS = { founder: "Founder", seo: "SEO Manager", readonly: "Read-only" };

// ─── Main Sidebar ─────────────────────────────────────────────────────────────
export default function Sidebar() {
  const { user } = useAuth();
  const { activeSiteId } = useSites();
  const [gscConnected, setGscConnected] = useState(false);
  const [criticals, setCriticals] = useState({});

  useEffect(() => {
    api.get("/gsc/status")
      .then(r => setGscConnected(r.data?.authenticated === true))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeSiteId) return;
    api.get(`/reports/${activeSiteId}/summary`)
      .then(r => {
        const sections = r.data?.sections || {};
        const map = {};
        for (const [section, counts] of Object.entries(sections)) {
          if (counts.critical > 0) map[section] = counts.critical;
        }
        setCriticals(map);
      })
      .catch(() => {});
  }, [activeSiteId]);

  const c = (section) => criticals[section] || 0;

  return (
    <nav className="sidebar">
      {/* Logomark */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">SA</div>
        <span className="sidebar-logo-text">SEO Automation</span>
      </div>

      <div className="sidebar-nav">
        <Group>
          <SideItem to="/"        icon="home"    label="Dashboard" />
          <SideItem to="/founder" icon="founder" label="Founder View" />
        </Group>

        <Group label="Crawl">
          <SideItem to="/crawl"        icon="crawl"  label="Crawl Runner" />
          <SideItem to="/audit"        icon="issues" label="All Issues" />
          <SideItem to="/audit-health" icon="health" label="Audit Health (477)" />
        </Group>

        <Group label="Audit Categories">
          <SideItem to="/response-codes"       icon="response"    label="Response Codes"        criticalCount={c("response-codes")} />
          <SideItem to="/redirects"            icon="redirect"    label="Redirects"              criticalCount={c("redirects")} />
          <SideItem to="/404-errors"           icon="error404"    label="404 & Status Errors"    criticalCount={c("404-errors")} />
          <SideItem to="/https-security"       icon="https"       label="HTTPS & Security"       criticalCount={c("https-security")} />
          <SideItem to="/canonical-tags"       icon="canonical"   label="Canonical Tags"         criticalCount={c("canonical-tags")} />
          <SideItem to="/robots-txt"           icon="robots"      label="Robots.txt"             criticalCount={c("robots-txt")} />
          <SideItem to="/meta-robots"          icon="meta_robots" label="Meta Robots"            criticalCount={c("meta-robots")} />
          <SideItem to="/url-structure"        icon="url"         label="URL Structure"          criticalCount={c("url-structure")} />
          <SideItem to="/title-tags"           icon="title"       label="Title Tags"             criticalCount={c("title-tags")} />
          <SideItem to="/meta-descriptions"    icon="meta_desc"   label="Meta Descriptions"      criticalCount={c("meta-descriptions")} />
          <SideItem to="/headings"             icon="headings"    label="Headings"               criticalCount={c("headings")} />
          <SideItem to="/content-quality"      icon="content"     label="Content Quality"        criticalCount={c("content-quality")} />
          <SideItem to="/keyword-strategy"     icon="keyword"     label="Keyword Strategy"       criticalCount={c("keyword-strategy")} />
          <SideItem to="/sitemaps"             icon="sitemap"     label="Sitemaps"               criticalCount={c("sitemaps")} />
          <SideItem to="/javascript-rendering" icon="js"          label="JS & Rendering"         criticalCount={c("javascript-rendering")} />
          <SideItem to="/html-structure"       icon="html"        label="HTML Structure"         criticalCount={c("html-structure")} />
          <SideItem to="/m-site-desktop"       icon="mobile"      label="M-Site vs Desktop"      criticalCount={c("m-site-desktop")} />
          <SideItem to="/schema"               icon="schema"      label="Schema & Struct. Data"  criticalCount={c("schema")} />
          <SideItem to="/images-media"         icon="images"      label="Images & Media"         criticalCount={c("images-media")} />
          <SideItem to="/core-web-vitals"      icon="cwv"         label="Core Web Vitals"        criticalCount={c("core-web-vitals")} />
          <SideItem to="/internal-linking"     icon="internal"    label="Internal Linking"       criticalCount={c("internal-linking")} />
          <SideItem to="/local-seo"            icon="local"       label="Local SEO"              criticalCount={c("local-seo")} />
          <SideItem to="/backlinks"            icon="backlinks"   label="Backlinks & Authority"  criticalCount={c("backlinks")} />
          <SideItem to="/hreflang"             icon="hreflang"    label="Hreflang"               criticalCount={c("hreflang")} />
          <SideItem to="/analytics-tracking"   icon="analytics"   label="Analytics & Tracking"   criticalCount={c("analytics-tracking")} />
          <SideItem to="/log-file-analysis"    icon="logfile"     label="Log File Analysis"      criticalCount={c("log-file-analysis")} />
        </Group>

        <Group label="Data Sources">
          <NavLink to="/gsc" className={({ isActive }) => `sidebar-item${isActive ? " active" : ""}`}>
            <NavIcon path={P.gsc} />
            <span className="sidebar-label">Search Console</span>
            {gscConnected && (
              <span style={{
                marginLeft: "auto", width: 7, height: 7, borderRadius: "50%",
                background: "#10B981", flexShrink: 0
              }} />
            )}
          </NavLink>
          <SideItem to="/ga4"        icon="ga4"       label="GA4 Overlay" />
          <SideItem to="/page-speed" icon="pagespeed" label="Page Speed" />
        </Group>

        <Group label="Config">
          <SideItem to="/sites"           icon="settings" label="Manage Sites" />
          <SideItem to="/scheduler"       icon="schedule" label="Scheduler" />
          <SideItem to="/settings"        icon="settings" label="Settings" />
          <SideItem to="/settings/status" icon="health"   label="System Health" />
          {user?.role === "founder" && (
            <SideItem to="/settings/users" icon="founder" label="Manage Users" />
          )}
        </Group>
      </div>

      {/* User footer */}
      <div className="sidebar-footer">
        <div className="sidebar-avatar">
          {user ? (user.name || user.email || "?")[0].toUpperCase() : "?"}
        </div>
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">{user?.name || user?.email || "—"}</div>
          <div className="sidebar-user-role">{ROLE_LABELS[user?.role] || user?.role || ""}</div>
        </div>
      </div>
    </nav>
  );
}
