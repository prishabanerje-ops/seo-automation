import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import api, { compareCrawls } from "../api/index.js";
import { useSites } from "../context/SitesContext.jsx";
import SFDesktopUI from "../components/SFDesktopUI.jsx";

const LOG_COLORS = {
  info:    "var(--info)",
  success: "var(--pass)",
  error:   "var(--critical)",
  stderr:  "var(--warning)",
  stdout:  "var(--text-secondary)"
};

const DEFAULT_CONFIG = {
  checkImages: true, checkCSS: true, checkJavaScript: true,
  checkExternals: false, crawlAllSubdomains: false,
  followInternalNofollow: false, followExternalNofollow: false,
  obeyRobots: true, obeyMetaRobots: true, obeyCanonicalTags: false,
  crawlLinkedXMLSitemaps: false, limitToCrawlFolder: true,
  maxCrawlDepth: -1, maxCrawlUrls: 0,
  maxThreads: 5, crawlDelay: 0, requestTimeout: 30000,
  renderType: "None",
  userAgentPreset: "screamingfrog", userAgent: "",
  authEnabled: false, authUsername: "", authPassword: "",
  respectRobots: true,
  includeSitemap: false, sitemapUrls: [""],
  includePatterns: [], excludePatterns: [],
  extractions: [], customHeaders: [], urlRewriteRules: [],
  exportTabs: [
    "Internal:All","Response Codes:All","Page Titles:All",
    "Meta Description:All","H1:All","H2:All","Images:All",
    "Canonicals:All","Structured Data:All"
  ]
};

const UA_PRESETS = [
  { value: "screamingfrog",    label: "Screaming Frog" },
  { value: "googlebot-desktop",label: "Googlebot Desktop" },
  { value: "googlebot-mobile", label: "Googlebot Mobile" },
  { value: "bingbot",          label: "Bingbot" },
  { value: "custom",           label: "Custom" }
];

const ALL_EXPORT_TABS = [
  "Internal:All","Response Codes:All","Page Titles:All","Meta Description:All",
  "H1:All","H2:All","Images:All","Canonicals:All","Structured Data:All",
  "Custom Extraction:All","External Links:All","Security:All",
  "Hreflang:All","Directives:All","URL:All","SERP Snippets:All"
];

const MODES = [
  { id: "spider",  label: "Spider Mode",  desc: "Follow links from a start URL", icon: "🕷" },
  { id: "list",    label: "List Mode",    desc: "Crawl a specific list of URLs or Sitemap", icon: "≡" },
  { id: "import",  label: "CSV Import",   desc: "Import exported SF CSV files", icon: "⬆" },
  { id: "compare", label: "Compare Mode", desc: "Diff two crawl results", icon: "⇄" }
];

const socket = io("http://localhost:3001", { autoConnect: false });

// ─── Shared input styles ──────────────────────────────────────────────────────
const inputStyle = {
  width: "100%", padding: "7px 12px", fontSize: 13,
  border: "1px solid var(--border)", borderRadius: 8,
  background: "var(--bg-page)", color: "var(--text-primary)",
  outline: "none", fontFamily: "inherit", boxSizing: "border-box"
};

const monoInputStyle = { ...inputStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 };

const selectStyle = {
  padding: "7px 12px", fontSize: 13,
  border: "1px solid var(--border)", borderRadius: 8,
  background: "var(--bg-page)", color: "var(--text-primary)", outline: "none"
};

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 36, height: 20, borderRadius: 10, position: "relative", cursor: "pointer",
          background: checked ? "var(--brand)" : "var(--border-strong)", transition: "background 0.2s"
        }}
      >
        <div style={{
          position: "absolute", top: 2, left: checked ? 18 : 2, width: 16, height: 16,
          borderRadius: "50%", background: "#fff", transition: "left 0.2s"
        }} />
      </div>
      {label && <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{label}</span>}
    </label>
  );
}

// ─── Number Input ─────────────────────────────────────────────────────────────
function NumberInput({ value, onChange, min, max, label, hint, unit }) {
  return (
    <div>
      {label && <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{label}</label>}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="number" value={value} min={min} max={max}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ ...inputStyle, width: 112 }}
        />
        {unit && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{unit}</span>}
      </div>
      {hint && <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{hint}</p>}
    </div>
  );
}

// ─── Collapsible Config Section ───────────────────────────────────────────────
function ConfigSection({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", marginBottom: 8 }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 14px", background: "var(--bg-surface)", border: "none", cursor: "pointer",
          fontSize: 13, fontWeight: 500, color: "var(--text-primary)"
        }}
      >
        {title}
        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ padding: "14px 14px", background: "var(--bg-page)", display: "flex", flexDirection: "column", gap: 12 }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Pattern List ─────────────────────────────────────────────────────────────
function PatternList({ label, items, onChange, placeholder }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <label style={{ fontSize: 11, color: "var(--text-muted)" }}>{label}</label>
        <button type="button" onClick={() => onChange([...items, { pattern: "", isRegex: false }])}
          style={{ fontSize: 12, color: "var(--brand)", background: "none", border: "none", cursor: "pointer" }}>
          + Add
        </button>
      </div>
      {items.length === 0 && <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>No rules</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="text" value={item.pattern}
              onChange={(e) => { const n = [...items]; n[i] = { ...n[i], pattern: e.target.value }; onChange(n); }}
              placeholder={placeholder || "pattern"}
              style={{ ...monoInputStyle, flex: 1 }}
            />
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-secondary)", flexShrink: 0 }}>
              <input type="checkbox" checked={item.isRegex}
                onChange={(e) => { const n = [...items]; n[i] = { ...n[i], isRegex: e.target.checked }; onChange(n); }} />
              Regex
            </label>
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))}
              style={{ fontSize: 12, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: "0 4px" }}>
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Extraction List ──────────────────────────────────────────────────────────
function ExtractionList({ items, onChange }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <label style={{ fontSize: 11, color: "var(--text-muted)" }}>Custom Extractions (max 5)</label>
        <button type="button"
          onClick={() => items.length < 5 && onChange([...items, { name: "", type: "XPath", selector: "", extractFrom: "InnerText" }])}
          disabled={items.length >= 5}
          style={{ fontSize: 12, color: items.length >= 5 ? "var(--text-muted)" : "var(--brand)", background: "none", border: "none", cursor: "pointer" }}>
          + Add
        </button>
      </div>
      {items.length === 0 && <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>No custom extractions</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((ex, i) => (
          <div key={i} style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <input type="text" value={ex.name}
                onChange={(e) => { const n = [...items]; n[i] = { ...n[i], name: e.target.value }; onChange(n); }}
                placeholder="Extraction name"
                style={{ ...inputStyle, width: 160 }}
              />
              <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))}
                style={{ fontSize: 12, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>
                ✕ Remove
              </button>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <select value={ex.type}
                onChange={(e) => { const n = [...items]; n[i] = { ...n[i], type: e.target.value }; onChange(n); }}
                style={selectStyle}>
                <option>XPath</option><option>CSS</option><option>Regex</option>
              </select>
              <select value={ex.extractFrom}
                onChange={(e) => { const n = [...items]; n[i] = { ...n[i], extractFrom: e.target.value }; onChange(n); }}
                style={selectStyle}>
                <option value="InnerText">Inner Text</option>
                <option value="InnerHTML">Inner HTML</option>
                <option value="Attribute">Attribute</option>
                <option value="Href">Href</option>
                <option value="Src">Src</option>
              </select>
            </div>
            <input type="text" value={ex.selector}
              onChange={(e) => { const n = [...items]; n[i] = { ...n[i], selector: e.target.value }; onChange(n); }}
              placeholder={ex.type === "XPath" ? "//meta[@name='robots']/@content" : ex.type === "CSS" ? "meta[name='robots']" : "pattern"}
              style={monoInputStyle}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SF Config Panel ──────────────────────────────────────────────────────────
function SFConfigPanel({ config, onChange }) {
  function set(key, val) { onChange({ ...config, [key]: val }); }
  return (
    <div>
      <ConfigSection title="Spider" defaultOpen>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Toggle checked={config.checkImages} onChange={(v) => set("checkImages", v)} label="Check images" />
          <Toggle checked={config.checkCSS} onChange={(v) => set("checkCSS", v)} label="Check CSS" />
          <Toggle checked={config.checkJavaScript} onChange={(v) => set("checkJavaScript", v)} label="Check JavaScript" />
          <Toggle checked={config.checkExternals} onChange={(v) => set("checkExternals", v)} label="Check external links" />
          <Toggle checked={config.crawlAllSubdomains} onChange={(v) => set("crawlAllSubdomains", v)} label="Crawl all subdomains" />
          <Toggle checked={config.crawlLinkedXMLSitemaps} onChange={(v) => set("crawlLinkedXMLSitemaps", v)} label="Crawl linked sitemaps" />
          <Toggle checked={config.followInternalNofollow} onChange={(v) => set("followInternalNofollow", v)} label="Follow internal nofollow" />
          <Toggle checked={config.followExternalNofollow} onChange={(v) => set("followExternalNofollow", v)} label="Follow external nofollow" />
          <Toggle checked={config.limitToCrawlFolder} onChange={(v) => set("limitToCrawlFolder", v)} label="Limit to start URL subdirectory" />
          <Toggle checked={config.obeyCanonicalTags} onChange={(v) => set("obeyCanonicalTags", v)} label="Obey canonical tags" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 4 }}>
          <NumberInput label="Max crawl depth" value={config.maxCrawlDepth} onChange={(v) => set("maxCrawlDepth", v)} min={-1} hint="-1 = unlimited" />
          <NumberInput label="Max URLs to crawl" value={config.maxCrawlUrls} onChange={(v) => set("maxCrawlUrls", v)} min={0} hint="0 = unlimited" />
        </div>
      </ConfigSection>

      <ConfigSection title="Speed">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <NumberInput label="Crawl delay" value={config.crawlDelay} onChange={(v) => set("crawlDelay", v)} min={0} unit="ms" hint="0 = no delay" />
          <NumberInput label="Request timeout" value={config.requestTimeout} onChange={(v) => set("requestTimeout", v)} min={5000} unit="ms" />
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Thread count is configured in the SF application preferences.</p>
      </ConfigSection>

      <ConfigSection title="Rendering">
        <div style={{ display: "flex", gap: 8 }}>
          {["None", "JavaScript"].map((rt) => (
            <button key={rt} type="button" onClick={() => set("renderType", rt)}
              style={{
                padding: "6px 14px", fontSize: 13, borderRadius: 8, cursor: "pointer",
                border: `1px solid ${config.renderType === rt ? "var(--brand)" : "var(--border)"}`,
                background: config.renderType === rt ? "var(--brand)" : "transparent",
                color: config.renderType === rt ? "#fff" : "var(--text-secondary)",
                transition: "all 0.15s"
              }}>
              {rt === "None" ? "No Rendering" : "JavaScript (Chrome)"}
            </button>
          ))}
        </div>
        {config.renderType === "JavaScript" && (
          <p style={{ fontSize: 12, color: "var(--warning)" }}>Requires Chrome/Chromium — significantly slower.</p>
        )}
      </ConfigSection>

      <ConfigSection title="User Agent">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
          {UA_PRESETS.map((p) => (
            <button key={p.value} type="button" onClick={() => set("userAgentPreset", p.value)}
              style={{
                padding: "5px 12px", fontSize: 12, borderRadius: 8, cursor: "pointer",
                border: `1px solid ${config.userAgentPreset === p.value ? "var(--brand)" : "var(--border)"}`,
                background: config.userAgentPreset === p.value ? "var(--brand)" : "transparent",
                color: config.userAgentPreset === p.value ? "#fff" : "var(--text-secondary)",
                transition: "all 0.15s"
              }}>
              {p.label}
            </button>
          ))}
        </div>
        {config.userAgentPreset === "custom" && (
          <input type="text" value={config.userAgent} onChange={(e) => set("userAgent", e.target.value)}
            placeholder="Mozilla/5.0 ..." style={monoInputStyle} />
        )}
      </ConfigSection>

      <ConfigSection title="Robots.txt & Meta Robots">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Toggle checked={config.obeyRobots} onChange={(v) => set("obeyRobots", v)} label="Respect robots.txt" />
          <Toggle checked={config.obeyMetaRobots} onChange={(v) => set("obeyMetaRobots", v)} label="Respect meta robots" />
        </div>
      </ConfigSection>

      <ConfigSection title="Crawl Rules — Include / Exclude">
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Include rules restrict crawl to matching URLs; exclude rules skip them.</p>
        <PatternList label="Include patterns (empty = all)" items={config.includePatterns}
          onChange={(v) => set("includePatterns", v)} placeholder="/new-cars/" />
        <PatternList label="Exclude patterns" items={config.excludePatterns}
          onChange={(v) => set("excludePatterns", v)} placeholder="/login|/cart|\.pdf$" />
      </ConfigSection>

      <ConfigSection title="Custom Extraction">
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Extract data using XPath, CSS, or Regex. Up to 5 extractions.</p>
        <ExtractionList items={config.extractions} onChange={(v) => set("extractions", v)} />
      </ConfigSection>

      <ConfigSection title="Authentication (Basic Auth)">
        <Toggle checked={config.authEnabled} onChange={(v) => set("authEnabled", v)} label="Enable basic auth" />
        {config.authEnabled && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Username</label>
              <input type="text" value={config.authUsername} onChange={(e) => set("authUsername", e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Password</label>
              <input type="password" value={config.authPassword} onChange={(e) => set("authPassword", e.target.value)} style={inputStyle} />
            </div>
          </div>
        )}
      </ConfigSection>

      <ConfigSection title="HTTP Headers">
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <label style={{ fontSize: 11, color: "var(--text-muted)" }}>Custom HTTP Headers</label>
            <button type="button" onClick={() => set("customHeaders", [...config.customHeaders, { name: "", value: "" }])}
              style={{ fontSize: 12, color: "var(--brand)", background: "none", border: "none", cursor: "pointer" }}>
              + Add
            </button>
          </div>
          {config.customHeaders.length === 0 && <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>No custom headers</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {config.customHeaders.map((h, i) => (
              <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <input type="text" value={h.name}
                  onChange={(e) => { const n = [...config.customHeaders]; n[i] = { ...n[i], name: e.target.value }; set("customHeaders", n); }}
                  placeholder="Header-Name"
                  style={{ ...monoInputStyle, width: 160, flex: "none" }}
                />
                <input type="text" value={h.value}
                  onChange={(e) => { const n = [...config.customHeaders]; n[i] = { ...n[i], value: e.target.value }; set("customHeaders", n); }}
                  placeholder="value"
                  style={{ ...monoInputStyle, flex: 1 }}
                />
                <button type="button" onClick={() => set("customHeaders", config.customHeaders.filter((_, j) => j !== i))}
                  style={{ fontSize: 12, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      </ConfigSection>

      <ConfigSection title="URL Rewriting">
        <PatternList label="Rewrite rules (find → replace)" items={config.urlRewriteRules}
          onChange={(v) => set("urlRewriteRules", v)} placeholder="\?utm_.*" />
      </ConfigSection>

      <ConfigSection title="Sitemaps">
        <Toggle checked={config.includeSitemap} onChange={(v) => set("includeSitemap", v)} label="Include sitemap URLs in crawl" />
        {config.includeSitemap && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
            {(config.sitemapUrls || [""]).map((url, i) => (
              <div key={i} style={{ display: "flex", gap: 6 }}>
                <input type="url" value={url}
                  onChange={(e) => { const n = [...(config.sitemapUrls || [""])]; n[i] = e.target.value; set("sitemapUrls", n); }}
                  placeholder="https://example.com/sitemap.xml"
                  style={{ ...monoInputStyle, flex: 1 }}
                />
                <button type="button"
                  onClick={() => set("sitemapUrls", (config.sitemapUrls || [""]).filter((_, j) => j !== i))}
                  style={{ fontSize: 12, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>
                  ✕
                </button>
              </div>
            ))}
            <button type="button" onClick={() => set("sitemapUrls", [...(config.sitemapUrls || [""]), ""])}
              style={{ fontSize: 12, color: "var(--brand)", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
              + Add sitemap URL
            </button>
          </div>
        )}
      </ConfigSection>

      <ConfigSection title="Export Tabs">
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Which data tabs SF exports after the crawl.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {ALL_EXPORT_TABS.map((tab) => (
            <label key={tab} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)", cursor: "pointer" }}>
              <input type="checkbox" checked={(config.exportTabs || []).includes(tab)}
                onChange={(e) => {
                  const curr = config.exportTabs || [];
                  set("exportTabs", e.target.checked ? [...curr, tab] : curr.filter((t) => t !== tab));
                }} />
              {tab}
            </label>
          ))}
        </div>
      </ConfigSection>
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadgeJob({ status }) {
  const map = {
    running:   { bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE" },
    completed: { bg: "#F0FDF4", color: "#15803D", border: "#BBF7D0" },
    failed:    { bg: "#FEF2F2", color: "#B91C1C", border: "#FECACA" },
    cancelled: { bg: "#FFFBEB", color: "#B45309", border: "#FDE68A" },
  };
  const s = map[status] ?? { bg: "var(--bg-surface)", color: "var(--text-muted)", border: "var(--border)" };
  return (
    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: s.bg, color: s.color, border: `1px solid ${s.border}`, fontWeight: 600 }}>
      {status}
    </span>
  );
}

// ─── Severity badge ───────────────────────────────────────────────────────────
function SeverityBadge({ severity }) {
  const map = {
    critical: { bg: "var(--critical-bg)", color: "var(--critical-text)" },
    warning:  { bg: "var(--warning-bg)",  color: "var(--warning-text)" },
    info:     { bg: "#EFF6FF",            color: "#1D4ED8" },
    ok:       { bg: "#F0FDF4",            color: "#15803D" },
  };
  const s = map[severity] ?? { bg: "var(--bg-surface)", color: "var(--text-muted)" };
  return (
    <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: s.bg, color: s.color, fontWeight: 600 }}>
      {severity}
    </span>
  );
}

function worstSev(issues) {
  const order = { critical: 3, warning: 2, info: 1, ok: 0 };
  return [...issues].sort((a, b) => (order[b.severity] || 0) - (order[a.severity] || 0))[0]?.severity || "ok";
}

// ─── Compare Mode ─────────────────────────────────────────────────────────────
function CompareMode() {
  const [history, setHistory] = useState([]);
  const [jobA, setJobA] = useState("");
  const [jobB, setJobB] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("newIssues");

  function fmtDate(d) { return d ? new Date(d).toLocaleString() : "—"; }

  useEffect(() => {
    api.get("/crawl/history").then((r) => {
      const jobs = r.data.filter((j) => j.status === "completed");
      setHistory(jobs);
      setJobA(jobs[0]?.id || "");
      setJobB(jobs[1]?.id || "");
    }).catch(() => {});
  }, []);

  async function compare() {
    if (!jobA || !jobB || jobA === jobB) return;
    setLoading(true);
    try {
      const job = history.find((j) => j.id === jobA);
      const r = await compareCrawls(job?.site_id || "", jobA, jobB);
      setResult(r.data);
    } catch (err) {
      setResult({ error: err.response?.data?.error ?? err.message });
    } finally {
      setLoading(false);
    }
  }

  const DIFF_TABS = [
    { key: "newIssues", label: "New Issues",  color: "var(--critical)" },
    { key: "regressed", label: "Regressed",   color: "var(--warning)" },
    { key: "fixed",     label: "Fixed",       color: "var(--pass)" },
    { key: "unchanged", label: "Still Issues",color: "var(--text-muted)" }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Pick two completed crawls to see what changed between them.</p>

      <div className="card" style={{ padding: "16px 20px" }}>
        {history.length < 2 ? (
          <div style={{ fontSize: 13, color: "var(--warning)" }}>Need at least 2 completed crawls. Run more crawls first.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[{ label: "Crawl A (newer)", val: jobA, set: setJobA }, { label: "Crawl B (baseline)", val: jobB, set: setJobB }].map(({ label, val, set }) => (
                <div key={label}>
                  <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{label}</label>
                  <select value={val} onChange={(e) => set(e.target.value)} style={{ ...selectStyle, width: "100%" }}>
                    {history.map((j) => (
                      <option key={j.id} value={j.id}>{fmtDate(j.completed_at)} — {j.site_id} — {j.total_urls ?? "?"} URLs</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <button onClick={compare} disabled={loading || !jobA || !jobB || jobA === jobB}
              className="btn btn-primary" style={{ alignSelf: "flex-start", opacity: loading || !jobA || !jobB || jobA === jobB ? 0.5 : 1 }}>
              {loading ? "Comparing…" : "Compare Crawls"}
            </button>
          </div>
        )}
      </div>

      {result?.error && <div style={{ fontSize: 13, color: "var(--critical)" }}>{result.error}</div>}

      {result && !result.error && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {[
              { key: "newIssues", label: "New Issues",   color: "var(--critical)", bg: "var(--critical-bg)" },
              { key: "regressed", label: "Regressed",    color: "var(--warning)",  bg: "var(--warning-bg)" },
              { key: "fixed",     label: "Fixed",        color: "var(--pass)",     bg: "#F0FDF4" },
              { key: "unchanged", label: "Still Issues", color: "var(--text-secondary)", bg: "var(--bg-surface)" },
            ].map(({ key, label, color, bg }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                style={{
                  padding: "14px 18px", borderRadius: 10, border: `1px solid ${activeTab === key ? color : "var(--border)"}`,
                  background: bg, cursor: "pointer", textAlign: "left",
                  boxShadow: activeTab === key ? `0 0 0 2px ${color}30` : "none"
                }}>
                <div style={{ fontSize: 26, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>
                  {result.diff.totals[key]}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>{label}</div>
              </button>
            ))}
          </div>

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
              {DIFF_TABS.map((t) => (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  style={{
                    padding: "10px 16px", fontSize: 12, fontWeight: 500, cursor: "pointer",
                    background: "none", border: "none",
                    borderBottom: `2px solid ${activeTab === t.key ? "var(--brand)" : "transparent"}`,
                    color: activeTab === t.key ? t.color : "var(--text-muted)"
                  }}>
                  {t.label} ({result.diff.totals[t.key]})
                </button>
              ))}
            </div>
            <div style={{ overflowX: "auto", maxHeight: 384, overflowY: "auto" }}>
              {result.diff[activeTab].length === 0 ? (
                <div style={{ padding: 32, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No URLs in this category.</div>
              ) : (
                <table className="data-table" style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th>URL</th>
                      <th>Section</th>
                      <th>Issue</th>
                      {activeTab === "regressed" && <th>Was → Now</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {result.diff[activeTab].map((row, i) => {
                      const issues = activeTab === "regressed" ? row.newIssues : row.issues;
                      return issues.map((iss, j) => (
                        <tr key={`${i}-${j}`}>
                          {j === 0 && (
                            <td rowSpan={issues.length}>
                              <a href={row.url} target="_blank" rel="noreferrer"
                                style={{ color: "var(--brand)", textDecoration: "none", fontSize: 12, display: "block", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {row.url}
                              </a>
                            </td>
                          )}
                          <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{iss.section}</td>
                          <td>
                            <SeverityBadge severity={iss.severity} />
                            <span style={{ marginLeft: 6, fontSize: 12, color: "var(--text-secondary)" }}>{iss.issue_type}</span>
                          </td>
                          {activeTab === "regressed" && j === 0 && (
                            <td rowSpan={issues.length}>
                              <SeverityBadge severity={worstSev(row.oldIssues)} />
                              <span style={{ color: "var(--text-muted)", margin: "0 4px" }}>→</span>
                              <SeverityBadge severity={worstSev(row.newIssues)} />
                            </td>
                          )}
                        </tr>
                      ));
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main CrawlRunner ─────────────────────────────────────────────────────────
export default function CrawlRunner() {
  const { sites, activeSiteId } = useSites();
  const [mode, setMode] = useState("spider");
  const [targetUrl, setTargetUrl] = useState("");
  const [crawlName, setCrawlName] = useState("");
  const [assignedSiteId, setAssignedSiteId] = useState("");
  const [listSubMode, setListSubMode] = useState("urls");
  const [urlListText, setUrlListText] = useState("");
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [sfConfig, setSfConfig] = useState(DEFAULT_CONFIG);
  const [jobs, setJobs] = useState({});
  const [running, setRunning] = useState(false);
  const [importSite, setImportSite] = useState("");
  const [importFiles, setImportFiles] = useState([]);
  const [importStatus, setImportStatus] = useState(null);
  const activeJobIds = useRef([]);
  const logsEndRef = useRef(null);
  const [sfViewJobs, setSfViewJobs] = useState({});  // jobId → boolean

  // Pre-select the active site when sites load
  useEffect(() => {
    if (activeSiteId && !assignedSiteId) setAssignedSiteId(activeSiteId);
  }, [activeSiteId]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [jobs]);

  useEffect(() => {
    socket.connect();

    // On connect, reload any jobs still running in the backend
    socket.on("connect", async () => {
      try {
        const res = await api.get("/crawl/active");
        if (res.data.jobs?.length) {
          const recovered = {};
          for (const j of res.data.jobs) {
            recovered[j.jobId] = { jobId: j.jobId, siteId: j.siteId, label: j.label, url: j.url, progress: j.progress ?? 0, status: j.status ?? "running", logs: [] };
            subscribeToJob(j.jobId);
            activeJobIds.current.push(j.jobId);
            // Fetch buffered logs
            api.get(`/crawl/logs/${j.jobId}`).then(r => {
              if (r.data.logs?.length) {
                setJobs(prev => ({ ...prev, [j.jobId]: { ...prev[j.jobId], logs: r.data.logs } }));
              }
            }).catch(() => {});
          }
          setJobs(prev => ({ ...recovered, ...prev }));
          setRunning(true);
        }
      } catch {}
    });

    return () => { socket.off("connect"); socket.disconnect(); };
  }, []);

  function deriveNameFromUrl(url) {
    try { return new URL(url).hostname; } catch { return ""; }
  }

  function handleTargetUrlChange(val) {
    setTargetUrl(val);
    if (!crawlName || crawlName === deriveNameFromUrl(targetUrl)) {
      setCrawlName(deriveNameFromUrl(val));
    }
  }

  function subscribeToJob(jobId) {
    socket.on(`crawl:log:${jobId}`, (data) => {
      setJobs((prev) => ({ ...prev, [jobId]: { ...prev[jobId], logs: [...(prev[jobId]?.logs ?? []), data] } }));
    });
    socket.on(`crawl:progress:${jobId}`, ({ progress }) => {
      setJobs((prev) => ({ ...prev, [jobId]: { ...prev[jobId], progress } }));
    });
    socket.on(`crawl:complete:${jobId}`, ({ status }) => {
      setJobs((prev) => ({ ...prev, [jobId]: { ...prev[jobId], status } }));
      activeJobIds.current = activeJobIds.current.filter((id) => id !== jobId);
      if (activeJobIds.current.length === 0) setRunning(false);
    });
  }

  async function handleStartCrawl() {
    const isSitemapSubMode = mode === "list" && listSubMode === "sitemap";
    const isUrlListMode = mode === "list" && listSubMode === "urls";

    let effectiveTargetUrl;
    if (isSitemapSubMode) effectiveTargetUrl = sitemapUrl;
    else if (isUrlListMode) effectiveTargetUrl = urlListText.split("\n").map((u) => u.trim()).find(Boolean) || "";
    else effectiveTargetUrl = targetUrl;

    if (!effectiveTargetUrl) return;
    setRunning(true);

    const backendMode = isSitemapSubMode ? "sitemap" : mode;
    const urlList = mode === "list" && listSubMode === "urls"
      ? urlListText.split("\n").map((u) => u.trim()).filter(Boolean)
      : [];

    try {
      const res = await api.post("/crawl/start", {
        targetUrl: effectiveTargetUrl,
        crawlName: crawlName || deriveNameFromUrl(effectiveTargetUrl),
        mode: backendMode,
        sfConfig,
        urlList,
        ...(assignedSiteId ? { siteIds: [assignedSiteId] } : {})
      });
      const newJobs = {};
      for (const { jobId, siteId, label } of res.data.jobs) {
        newJobs[jobId] = { jobId, siteId, label, url: effectiveTargetUrl, progress: 0, status: "running", logs: [] };
        subscribeToJob(jobId);
        activeJobIds.current.push(jobId);
        // Fetch any logs emitted before we subscribed (race condition on start)
        setTimeout(() => {
          api.get(`/crawl/logs/${jobId}`).then(r => {
            if (r.data.logs?.length) {
              setJobs(prev => ({ ...prev, [jobId]: { ...prev[jobId], logs: r.data.logs } }));
            }
          }).catch(() => {});
        }, 300);
      }
      setJobs((prev) => ({ ...prev, ...newJobs }));
    } catch (err) {
      setRunning(false);
      alert("Failed to start crawl: " + (err.response?.data?.error ?? err.message));
    }
  }

  async function handleCancel(jobId) {
    await api.delete(`/crawl/cancel/${jobId}`).catch(() => {});
    setJobs((prev) => ({ ...prev, [jobId]: { ...prev[jobId], status: "cancelled" } }));
    activeJobIds.current = activeJobIds.current.filter((id) => id !== jobId);
    if (activeJobIds.current.length === 0) setRunning(false);
  }

  async function handleImport(e) {
    e.preventDefault();
    if (!importFiles.length || !importSite) return;
    setImportStatus("uploading");
    const form = new FormData();
    form.append("siteId", importSite.replace(/[^a-z0-9]/gi, "-").toLowerCase());
    form.append("siteName", importSite);
    for (const f of importFiles) form.append("csvFiles", f);
    try {
      const res = await api.post("/crawl/import", form, { headers: { "Content-Type": "multipart/form-data" } });
      setImportStatus(`Done — ${res.data.parsed} rows imported (job ${res.data.jobId.slice(0, 8)})`);
    } catch (err) {
      setImportStatus("Error: " + (err.response?.data?.error ?? err.message));
    }
  }

  const jobList = Object.values(jobs);
  const canStartSpider = mode === "spider" && targetUrl.trim().length > 0;
  const canStartList = mode === "list" && (
    listSubMode === "urls" ? urlListText.trim().length > 0 : sitemapUrl.trim().length > 0
  );

  const progressBarColor = (status) =>
    status === "completed" ? "var(--pass)"
    : status === "failed"  ? "var(--critical)"
    : status === "cancelled" ? "var(--warning)"
    : "var(--brand)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div>
        <h1 className="page-title">Crawl Runner</h1>
        <p className="page-desc">Configure and trigger Screaming Frog crawls with full control.</p>
      </div>

      {/* Mode cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {MODES.map((m) => (
          <button key={m.id} onClick={() => setMode(m.id)}
            style={{
              padding: "16px", borderRadius: 12, border: `1px solid ${mode === m.id ? "var(--brand)" : "var(--border)"}`,
              background: mode === m.id ? "var(--brand-subtle)" : "var(--bg-raised)",
              cursor: "pointer", textAlign: "left",
              boxShadow: mode === m.id ? "0 0 0 2px var(--brand-light)" : "none",
              transition: "all 0.15s"
            }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}>{m.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: mode === m.id ? "var(--brand)" : "var(--text-primary)" }}>{m.label}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{m.desc}</div>
          </button>
        ))}
      </div>

      {/* Compare mode */}
      {mode === "compare" && (
        <div className="card" style={{ padding: "20px 24px" }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>Compare Two Crawls</h2>
          <CompareMode />
        </div>
      )}

      {/* CSV Import mode */}
      {mode === "import" && (
        <div className="card" style={{ padding: "20px 24px" }}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Import Screaming Frog CSV Exports</h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>In SF Desktop: Bulk Export → All Tabs → CSV. Upload all CSV files here.</p>
          </div>
          <form onSubmit={handleImport} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Site / Label</label>
              <input type="text" value={importSite} onChange={(e) => setImportSite(e.target.value)}
                placeholder="e.g. www.cars24.com" style={{ ...inputStyle, width: 256 }} />
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Used to group results — can be any name</p>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>CSV Files</label>
              <input type="file" accept=".csv" multiple onChange={(e) => setImportFiles(Array.from(e.target.files))}
                style={{ fontSize: 13, color: "var(--text-secondary)" }} />
              {importFiles.length > 0 && (
                <div style={{ marginTop: 4, fontSize: 11, color: "var(--text-muted)" }}>
                  {importFiles.length} file(s): {importFiles.map(f => f.name).join(", ")}
                </div>
              )}
            </div>
            <div>
              <button type="submit" disabled={!importFiles.length || !importSite || importStatus === "uploading"}
                className="btn btn-primary" style={{ opacity: !importFiles.length || !importSite || importStatus === "uploading" ? 0.5 : 1 }}>
                {importStatus === "uploading" ? "Importing…" : "Import CSVs"}
              </button>
              {importStatus && importStatus !== "uploading" && (
                <span style={{ marginLeft: 12, fontSize: 13, color: importStatus.startsWith("Error") ? "var(--critical)" : "var(--pass)" }}>
                  {importStatus}
                </span>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Spider mode */}
      {mode === "spider" && (
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="card" style={{ padding: "16px 18px" }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>Target</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Assign to Site</label>
                  <select value={assignedSiteId} onChange={(e) => setAssignedSiteId(e.target.value)} style={{ ...inputStyle, width: "100%" }}>
                    <option value="">— Unassigned —</option>
                    {sites.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Links this crawl to a registered site</p>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Start URL</label>
                  <input type="url" value={targetUrl} onChange={(e) => handleTargetUrlChange(e.target.value)}
                    placeholder="https://www.example.com/" style={monoInputStyle} />
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>SF will follow links from this URL</p>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Crawl Name</label>
                  <input type="text" value={crawlName} onChange={(e) => setCrawlName(e.target.value)}
                    placeholder="Auto-derived from URL" style={inputStyle} />
                </div>
              </div>
            </div>
            <button onClick={handleStartCrawl} disabled={running || !canStartSpider}
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center", opacity: running || !canStartSpider ? 0.5 : 1, cursor: running || !canStartSpider ? "not-allowed" : "pointer" }}>
              {running ? "Crawling…" : "Start Spider Crawl"}
            </button>
          </div>

          <div className="card" style={{ padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Screaming Frog Configuration</h2>
              <button type="button" onClick={() => setSfConfig(DEFAULT_CONFIG)}
                style={{ fontSize: 12, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>
                Reset defaults
              </button>
            </div>
            <SFConfigPanel config={sfConfig} onChange={setSfConfig} />
          </div>
        </div>
      )}

      {/* List mode */}
      {mode === "list" && (
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="card" style={{ padding: "16px 18px" }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>Target</h2>

              {/* Sub-mode toggle */}
              <div style={{ display: "flex", gap: 4, background: "var(--bg-surface)", borderRadius: 8, padding: 4, marginBottom: 12 }}>
                {[{ key: "urls", label: "URL List" }, { key: "sitemap", label: "Sitemap" }].map(({ key, label }) => (
                  <button key={key} onClick={() => setListSubMode(key)}
                    style={{
                      flex: 1, padding: "6px 0", fontSize: 12, fontWeight: 500, borderRadius: 6, cursor: "pointer",
                      background: listSubMode === key ? "var(--bg-raised)" : "transparent",
                      color: listSubMode === key ? "var(--text-primary)" : "var(--text-muted)",
                      border: listSubMode === key ? "1px solid var(--border)" : "1px solid transparent",
                      transition: "all 0.15s"
                    }}>
                    {label}
                  </button>
                ))}
              </div>

              {listSubMode === "urls" ? (
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>URLs (one per line)</label>
                  <textarea value={urlListText} onChange={(e) => setUrlListText(e.target.value)}
                    placeholder={"https://www.example.com/page-1\nhttps://www.example.com/page-2"}
                    rows={8}
                    style={{ ...monoInputStyle, resize: "none", lineHeight: 1.6 }}
                  />
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {urlListText.split("\n").filter((u) => u.trim()).length} URLs
                  </div>
                </div>
              ) : (
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Sitemap URL</label>
                  <input type="url" value={sitemapUrl} onChange={(e) => setSitemapUrl(e.target.value)}
                    placeholder="https://www.example.com/sitemap.xml" style={monoInputStyle} />
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>SF will fetch and crawl all URLs in the sitemap</p>
                </div>
              )}

              <div style={{ marginTop: 10 }}>
                <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Assign to Site</label>
                <select value={assignedSiteId} onChange={(e) => setAssignedSiteId(e.target.value)} style={{ ...inputStyle, width: "100%" }}>
                  <option value="">— Unassigned —</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              <div style={{ marginTop: 10 }}>
                <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Crawl Name</label>
                <input type="text" value={crawlName} onChange={(e) => setCrawlName(e.target.value)}
                  placeholder="e.g. cars24-sitemap-audit" style={inputStyle} />
              </div>
            </div>

            <button onClick={handleStartCrawl} disabled={running || !canStartList}
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center", opacity: running || !canStartList ? 0.5 : 1, cursor: running || !canStartList ? "not-allowed" : "pointer" }}>
              {running ? "Crawling…" : `Start ${listSubMode === "sitemap" ? "Sitemap" : "List"} Crawl`}
            </button>
          </div>

          <div className="card" style={{ padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Screaming Frog Configuration</h2>
              <button type="button" onClick={() => setSfConfig(DEFAULT_CONFIG)}
                style={{ fontSize: 12, color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>
                Reset defaults
              </button>
            </div>
            <SFConfigPanel config={sfConfig} onChange={setSfConfig} />
          </div>
        </div>
      )}

      {/* Active jobs */}
      {jobList.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Active Jobs</h2>
          {jobList.map((job) => (
            <div key={job.jobId} className="card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 18px", borderBottom: "1px solid var(--border)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {job.status === "running" && <span className="crawl-dot" />}
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{job.label}</span>
                  <StatusBadgeJob status={job.status} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}>{job.progress}%</span>
                  {job.status === "running" && (
                    <button onClick={() => handleCancel(job.jobId)} className="btn btn-danger" style={{ fontSize: 12 }}>
                      Cancel
                    </button>
                  )}
                </div>
              </div>
              {/* Progress bar */}
              <div style={{ width: "100%", height: 3, background: "var(--bg-surface)" }}>
                <div style={{
                  height: 3, transition: "width 0.4s ease",
                  width: `${job.progress}%`, background: progressBarColor(job.status)
                }} />
              </div>
              {/* SF View toggle */}
              <div style={{ padding: "6px 18px", background: "var(--bg-surface)", borderBottom: "1px solid var(--border)", display: "flex", gap: 6 }}>
                {["Logs", "SF Desktop"].map(v => (
                  <button key={v}
                    onClick={() => setSfViewJobs(prev => ({ ...prev, [job.jobId]: v === "SF Desktop" }))}
                    style={{
                      fontSize: 11, padding: "3px 10px", borderRadius: 6, cursor: "pointer",
                      border: "1px solid var(--border)",
                      background: (sfViewJobs[job.jobId] ? v === "SF Desktop" : v === "Logs") ? "var(--brand)" : "var(--bg-surface)",
                      color:      (sfViewJobs[job.jobId] ? v === "SF Desktop" : v === "Logs") ? "#fff" : "var(--text-secondary)",
                      fontWeight: (sfViewJobs[job.jobId] ? v === "SF Desktop" : v === "Logs") ? 600 : 400,
                    }}>{v}</button>
                ))}
              </div>

              {sfViewJobs[job.jobId] ? (
                <SFDesktopUI job={job} onCancel={() => handleCancel(job.jobId)} />
              ) : (
                /* Log viewer */
                <div style={{
                  background: "var(--bg-surface)", fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 12, padding: "10px 14px", height: 200, overflowY: "auto",
                  display: "flex", flexDirection: "column", gap: 2
                }}>
                  {job.logs.map((entry, i) => (
                    <div key={i} style={{ color: LOG_COLORS[entry.type] ?? "var(--text-secondary)" }}>{entry.message}</div>
                  ))}
                  {job.logs.length === 0 && <div style={{ color: "var(--text-muted)" }}>Waiting for output…</div>}
                  <div ref={logsEndRef} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
