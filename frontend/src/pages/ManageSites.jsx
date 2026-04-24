import { useState } from "react";
import api from "../api/index.js";
import { useSites } from "../context/SitesContext.jsx";

const COLOR_PRESETS = [
  "#E63946", "#2D6A4F", "#F4A261", "#4836FE", "#0EA5E9",
  "#8B5CF6", "#EC4899", "#10B981", "#F59E0B", "#EF4444",
  "#6366F1", "#14B8A6", "#F97316", "#84CC16", "#06B6D4",
];

const inputStyle = {
  width: "100%", padding: "8px 12px", fontSize: 13,
  border: "1px solid var(--border)", borderRadius: 8,
  background: "var(--bg-page)", color: "var(--text-primary)",
  outline: "none", boxSizing: "border-box", fontFamily: "inherit"
};

const SF_DEFAULTS = {
  checkImages: true,
  checkCSS: true,
  checkJavaScript: true,
  checkExternals: false,
  crawlAllSubdomains: false,
  followInternalNofollow: false,
  followExternalNofollow: false,
  obeyRobots: true,
  obeyMetaRobots: true,
  obeyCanonicalTags: false,
  crawlLinkedXMLSitemaps: false,
  limitToCrawlFolder: true,
  maxCrawlDepth: -1,
  maxCrawlUrls: 0,
  maxThreads: 5,
  crawlDelay: 0,
  requestTimeout: 30000,
  renderType: "None",
  userAgentPreset: "screamingfrog",
  userAgent: "",
  authEnabled: false,
  authUsername: "",
  authPassword: "",
  includePatterns: [],
  excludePatterns: [],
  extractions: [],
  customHeaders: [],
  includeSitemap: false,
  sitemapUrls: [],
  urlRewriteRules: [],
  exportTabs: [
    "Internal:All", "Response Codes:All", "Page Titles:All",
    "Meta Description:All", "H1:All", "H2:All", "Images:All",
    "Canonicals:All", "Structured Data:All"
  ]
};

const ALL_EXPORT_TABS = [
  "Internal:All", "External:All", "Response Codes:All",
  "Page Titles:All", "Meta Description:All", "H1:All", "H2:All",
  "Images:All", "Canonicals:All", "Pagination:All",
  "Directives:All", "hreflang:All", "Structured Data:All",
  "Page Speed:All", "Links:All", "Custom Extraction:All"
];

const EMPTY_FORM = {
  label: "", url: "", gsc_property: "", ga4_property_id: "",
  color: "#4836FE", sheets_tab_name: "",
  sf_config: { ...SF_DEFAULTS }
};

// ─── Small helpers ────────────────────────────────────────────────────────────

function Toggle({ label, checked, onChange }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", userSelect: "none" }}>
      <span onClick={() => onChange(!checked)} style={{
        position: "relative", width: 32, height: 18, flexShrink: 0,
        background: checked ? "var(--brand)" : "var(--border)",
        borderRadius: 10, transition: "background 0.15s", display: "inline-block"
      }}>
        <span style={{
          position: "absolute", top: 2, left: checked ? 16 : 2,
          width: 14, height: 14, borderRadius: "50%", background: "#fff",
          transition: "left 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.25)"
        }} />
      </span>
      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{label}</span>
    </label>
  );
}

function SubSection({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderRadius: 8, border: "1px solid var(--border)", overflow: "hidden" }}>
      <button type="button" onClick={() => setOpen(v => !v)} style={{
        width: "100%", padding: "9px 14px", display: "flex", alignItems: "center",
        justifyContent: "space-between", background: "var(--bg-surface)",
        border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
        color: "var(--text-secondary)", textAlign: "left"
      }}>
        <span>{title}</span>
        <span style={{ fontSize: 10, color: "var(--text-muted)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▼</span>
      </button>
      {open && (
        <div style={{ padding: 14, borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 12 }}>
          {children}
        </div>
      )}
    </div>
  );
}

function PatternList({ patterns, onChange, placeholder }) {
  function add() { onChange([...patterns, { pattern: "", isRegex: false }]); }
  function remove(i) { onChange(patterns.filter((_, j) => j !== i)); }
  function update(i, field, val) {
    const next = [...patterns];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {patterns.map((p, i) => (
        <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input value={p.pattern} onChange={e => update(i, "pattern", e.target.value)}
            placeholder={placeholder} style={{ ...inputStyle, flex: 1 }} />
          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-muted)", cursor: "pointer", whiteSpace: "nowrap" }}>
            <input type="checkbox" checked={p.isRegex} onChange={e => update(i, "isRegex", e.target.checked)} />
            Regex
          </label>
          <button type="button" onClick={() => remove(i)} style={{
            padding: "4px 8px", fontSize: 12, background: "var(--bg-surface)",
            border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", color: "var(--text-muted)"
          }}>✕</button>
        </div>
      ))}
      <button type="button" onClick={add} style={{
        alignSelf: "flex-start", padding: "4px 12px", fontSize: 12,
        background: "transparent", border: "1px dashed var(--border)",
        borderRadius: 6, cursor: "pointer", color: "var(--text-muted)"
      }}>+ Add pattern</button>
    </div>
  );
}

// ─── SF Config Panel ──────────────────────────────────────────────────────────

function SFConfigPanel({ config, onChange }) {
  const [open, setOpen] = useState(false);
  const c = { ...SF_DEFAULTS, ...(config || {}) };
  function set(key, val) { onChange({ ...c, [key]: val }); }

  return (
    <div>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
          background: "var(--bg-surface)", border: "1px solid var(--border)",
          borderRadius: 8, cursor: "pointer", fontSize: 13, color: "var(--text-secondary)",
          width: "100%", textAlign: "left"
        }}>
          <span style={{ fontSize: 15 }}>⚙</span>
          <span style={{ fontWeight: 500 }}>Default Crawl Configuration</span>
          <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)" }}>Configure Screaming Frog defaults ▾</span>
        </button>
      ) : (
        <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
          {/* Panel header */}
          <button type="button" onClick={() => setOpen(false)} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "12px 16px",
            background: "var(--bg-surface)", border: "none", borderBottom: "1px solid var(--border)",
            cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)",
            width: "100%"
          }}>
            <span>⚙ Default Crawl Configuration</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)" }}>▲ Collapse</span>
          </button>

          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 18 }}>

            {/* ── Spider ── */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 10 }}>
                Spider
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px 20px" }}>
                <Toggle label="Check Images"           checked={c.checkImages}            onChange={v => set("checkImages", v)} />
                <Toggle label="Check CSS"              checked={c.checkCSS}               onChange={v => set("checkCSS", v)} />
                <Toggle label="Check JavaScript"       checked={c.checkJavaScript}        onChange={v => set("checkJavaScript", v)} />
                <Toggle label="Check Externals"        checked={c.checkExternals}         onChange={v => set("checkExternals", v)} />
                <Toggle label="Crawl Subdomains"       checked={c.crawlAllSubdomains}     onChange={v => set("crawlAllSubdomains", v)} />
                <Toggle label="Follow Int. Nofollow"   checked={c.followInternalNofollow} onChange={v => set("followInternalNofollow", v)} />
                <Toggle label="Follow Ext. Nofollow"   checked={c.followExternalNofollow} onChange={v => set("followExternalNofollow", v)} />
                <Toggle label="Obey Robots.txt"        checked={c.obeyRobots}             onChange={v => set("obeyRobots", v)} />
                <Toggle label="Obey Meta Robots"       checked={c.obeyMetaRobots}         onChange={v => set("obeyMetaRobots", v)} />
                <Toggle label="Obey Canonical Tags"    checked={c.obeyCanonicalTags}      onChange={v => set("obeyCanonicalTags", v)} />
                <Toggle label="Crawl XML Sitemaps"     checked={c.crawlLinkedXMLSitemaps} onChange={v => set("crawlLinkedXMLSitemaps", v)} />
                <Toggle label="Limit to Crawl Folder"  checked={c.limitToCrawlFolder}     onChange={v => set("limitToCrawlFolder", v)} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
                    Max Crawl Depth <span style={{ fontWeight: 400 }}>(-1 = unlimited)</span>
                  </label>
                  <input type="number" value={c.maxCrawlDepth}
                    onChange={e => set("maxCrawlDepth", parseInt(e.target.value) || -1)}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>
                    Max URLs <span style={{ fontWeight: 400 }}>(0 = unlimited)</span>
                  </label>
                  <input type="number" min={0} value={c.maxCrawlUrls}
                    onChange={e => set("maxCrawlUrls", parseInt(e.target.value) || 0)}
                    style={inputStyle} />
                </div>
              </div>
            </div>

            {/* ── Speed ── */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 10 }}>
                Speed
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Threads (1–50)</label>
                  <input type="number" min={1} max={50} value={c.maxThreads}
                    onChange={e => set("maxThreads", Math.min(50, Math.max(1, parseInt(e.target.value) || 5)))}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Crawl Delay (ms)</label>
                  <input type="number" min={0} value={c.crawlDelay}
                    onChange={e => set("crawlDelay", Math.max(0, parseInt(e.target.value) || 0))}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Request Timeout (ms)</label>
                  <input type="number" min={1000} value={c.requestTimeout}
                    onChange={e => set("requestTimeout", Math.max(1000, parseInt(e.target.value) || 30000))}
                    style={inputStyle} />
                </div>
              </div>
            </div>

            {/* ── Rendering & User Agent ── */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 10 }}>
                Rendering & User Agent
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Render Type</label>
                  <select value={c.renderType} onChange={e => set("renderType", e.target.value)} style={inputStyle}>
                    <option value="None">None (Static HTML)</option>
                    <option value="JavaScript">JavaScript</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>User Agent</label>
                  <select value={c.userAgentPreset} onChange={e => set("userAgentPreset", e.target.value)} style={inputStyle}>
                    <option value="screamingfrog">Screaming Frog</option>
                    <option value="googlebot-desktop">Googlebot Desktop</option>
                    <option value="googlebot-mobile">Googlebot Mobile</option>
                    <option value="bingbot">Bingbot</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                {c.userAgentPreset === "custom" && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Custom UA String</label>
                    <input type="text" value={c.userAgent} onChange={e => set("userAgent", e.target.value)}
                      placeholder="Mozilla/5.0 ..." style={inputStyle} />
                  </div>
                )}
              </div>
            </div>

            {/* ── Advanced sub-sections ── */}
            <SubSection title="Crawl Rules — Include / Exclude Patterns">
              <div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>Include patterns</div>
                <PatternList patterns={c.includePatterns} onChange={v => set("includePatterns", v)} placeholder="/path/to/include" />
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>Exclude patterns</div>
                <PatternList patterns={c.excludePatterns} onChange={v => set("excludePatterns", v)} placeholder="/path/to/exclude" />
              </div>
            </SubSection>

            <SubSection title="Custom Extractions (max 5)">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(c.extractions || []).map((ex, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 80px 1fr 110px 28px", gap: 6, alignItems: "center" }}>
                    <input value={ex.name}
                      onChange={e => { const n = [...c.extractions]; n[i] = { ...n[i], name: e.target.value }; set("extractions", n); }}
                      placeholder="Name" style={inputStyle} />
                    <select value={ex.type}
                      onChange={e => { const n = [...c.extractions]; n[i] = { ...n[i], type: e.target.value }; set("extractions", n); }}
                      style={inputStyle}>
                      <option>XPath</option><option>CSS</option><option>Regex</option>
                    </select>
                    <input value={ex.selector}
                      onChange={e => { const n = [...c.extractions]; n[i] = { ...n[i], selector: e.target.value }; set("extractions", n); }}
                      placeholder="Selector / expression" style={inputStyle} />
                    <select value={ex.extractFrom}
                      onChange={e => { const n = [...c.extractions]; n[i] = { ...n[i], extractFrom: e.target.value }; set("extractions", n); }}
                      style={inputStyle}>
                      <option>InnerText</option><option>InnerHTML</option>
                      <option>Attribute</option><option>Href</option><option>Src</option>
                    </select>
                    <button type="button" onClick={() => set("extractions", c.extractions.filter((_, j) => j !== i))}
                      style={{ padding: "4px 6px", fontSize: 12, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
                  </div>
                ))}
                {(c.extractions || []).length < 5 && (
                  <button type="button"
                    onClick={() => set("extractions", [...(c.extractions || []), { name: "", type: "XPath", selector: "", extractFrom: "InnerText" }])}
                    style={{ alignSelf: "flex-start", padding: "4px 12px", fontSize: 12, background: "transparent", border: "1px dashed var(--border)", borderRadius: 6, cursor: "pointer", color: "var(--text-muted)" }}>
                    + Add extraction
                  </button>
                )}
              </div>
            </SubSection>

            <SubSection title="Authentication & HTTP Headers">
              <Toggle label="Enable Basic Auth" checked={c.authEnabled} onChange={v => set("authEnabled", v)} />
              {c.authEnabled && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Username</label>
                    <input type="text" value={c.authUsername} onChange={e => set("authUsername", e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Password</label>
                    <input type="password" value={c.authPassword} onChange={e => set("authPassword", e.target.value)} style={inputStyle} />
                  </div>
                </div>
              )}
              <div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>Custom HTTP Headers</div>
                {(c.customHeaders || []).map((h, i) => (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 28px", gap: 6, marginBottom: 6 }}>
                    <input value={h.name}
                      onChange={e => { const n = [...c.customHeaders]; n[i] = { ...n[i], name: e.target.value }; set("customHeaders", n); }}
                      placeholder="Header name" style={inputStyle} />
                    <input value={h.value}
                      onChange={e => { const n = [...c.customHeaders]; n[i] = { ...n[i], value: e.target.value }; set("customHeaders", n); }}
                      placeholder="Value" style={inputStyle} />
                    <button type="button" onClick={() => set("customHeaders", c.customHeaders.filter((_, j) => j !== i))}
                      style={{ padding: "4px 6px", fontSize: 12, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
                  </div>
                ))}
                <button type="button" onClick={() => set("customHeaders", [...(c.customHeaders || []), { name: "", value: "" }])}
                  style={{ padding: "4px 12px", fontSize: 12, background: "transparent", border: "1px dashed var(--border)", borderRadius: 6, cursor: "pointer", color: "var(--text-muted)" }}>
                  + Add header
                </button>
              </div>
            </SubSection>

            <SubSection title="Export Tabs">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px 16px" }}>
                {ALL_EXPORT_TABS.map(tab => {
                  const active = (c.exportTabs || []).includes(tab);
                  return (
                    <label key={tab} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: "var(--text-secondary)" }}>
                      <input type="checkbox" checked={active} onChange={e => {
                        const tabs = e.target.checked
                          ? [...(c.exportTabs || []), tab]
                          : (c.exportTabs || []).filter(t => t !== tab);
                        set("exportTabs", tabs);
                      }} />
                      {tab.replace(/:All$/, "")}
                    </label>
                  );
                })}
              </div>
            </SubSection>

            <SubSection title="Sitemaps">
              <Toggle label="Include Sitemap in Crawl" checked={c.includeSitemap} onChange={v => set("includeSitemap", v)} />
              {c.includeSitemap && (
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>Sitemap URLs</div>
                  {(c.sitemapUrls || []).map((url, i) => (
                    <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                      <input value={url}
                        onChange={e => { const n = [...c.sitemapUrls]; n[i] = e.target.value; set("sitemapUrls", n); }}
                        placeholder="https://example.com/sitemap.xml" style={{ ...inputStyle, flex: 1 }} />
                      <button type="button" onClick={() => set("sitemapUrls", c.sitemapUrls.filter((_, j) => j !== i))}
                        style={{ padding: "4px 8px", fontSize: 12, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => set("sitemapUrls", [...(c.sitemapUrls || []), ""])}
                    style={{ padding: "4px 12px", fontSize: 12, background: "transparent", border: "1px dashed var(--border)", borderRadius: 6, cursor: "pointer", color: "var(--text-muted)" }}>
                    + Add URL
                  </button>
                </div>
              )}
            </SubSection>

          </div>
        </div>
      )}
    </div>
  );
}

// ─── Site Form ────────────────────────────────────────────────────────────────

function SiteForm({ initial = EMPTY_FORM, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    ...initial,
    sf_config: { ...SF_DEFAULTS, ...(initial.sf_config || {}) }
  });
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Site Name *</label>
          <input type="text" value={form.label} onChange={e => set("label", e.target.value)}
            placeholder="e.g. CARS24 New Cars" style={inputStyle} required />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Site URL *</label>
          <input type="url" value={form.url} onChange={e => set("url", e.target.value)}
            placeholder="https://www.example.com/" style={inputStyle} required />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>GSC Property URL</label>
          <input type="text" value={form.gsc_property} onChange={e => set("gsc_property", e.target.value)}
            placeholder="https://www.example.com" style={inputStyle} />
          <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>As it appears in Google Search Console</p>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>GA4 Property ID</label>
          <input type="text" value={form.ga4_property_id} onChange={e => set("ga4_property_id", e.target.value)}
            placeholder="123456789" style={inputStyle} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Google Sheets Tab Name</label>
          <input type="text" value={form.sheets_tab_name} onChange={e => set("sheets_tab_name", e.target.value)}
            placeholder="Auto-filled from site name" style={inputStyle} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Color</label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {COLOR_PRESETS.map(c => (
              <button key={c} type="button" onClick={() => set("color", c)}
                style={{
                  width: 22, height: 22, borderRadius: "50%", background: c, border: "none",
                  cursor: "pointer", outline: form.color === c ? `3px solid ${c}` : "none",
                  outlineOffset: 2, transition: "outline 0.1s"
                }} />
            ))}
            <input type="color" value={form.color} onChange={e => set("color", e.target.value)}
              style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid var(--border)", cursor: "pointer", padding: 2 }} />
          </div>
        </div>
      </div>

      {/* Preview pill */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Preview:</span>
        <span style={{
          display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20,
          fontSize: 12, fontWeight: 600, border: `1px solid ${form.color}`,
          color: form.color, background: form.color + "15"
        }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: form.color, flexShrink: 0 }} />
          {form.label || "Site Name"}
        </span>
      </div>

      {/* SF Config Panel */}
      <SFConfigPanel config={form.sf_config} onChange={v => set("sf_config", v)} />

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={() => onSave(form)}
          disabled={saving || !form.label || !form.url}
          className="btn btn-primary"
          style={{ opacity: saving || !form.label || !form.url ? 0.5 : 1 }}
        >
          {saving ? "Saving…" : "Save Site"}
        </button>
        <button onClick={onCancel} className="btn btn-surface">Cancel</button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ManageSites() {
  const { sites, refetch } = useSites();
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleAdd(form) {
    setSaving(true);
    setError(null);
    try {
      await api.post("/sites", form);
      refetch();
      setShowAdd(false);
      showToast("Site added successfully.");
    } catch (err) {
      setError(err.response?.data?.error ?? err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(id, form) {
    setSaving(true);
    setError(null);
    try {
      await api.put(`/sites/${id}`, form);
      refetch();
      setEditId(null);
      showToast("Site updated.");
    } catch (err) {
      setError(err.response?.data?.error ?? err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this site? All associated crawl data will remain but the site will be removed.")) return;
    setDeletingId(id);
    try {
      await api.delete(`/sites/${id}`);
      refetch();
      showToast("Site deleted.");
    } catch (err) {
      setError(err.response?.data?.error ?? err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div style={{ maxWidth: 900, display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24,
          background: "var(--text-primary)", color: "#fff",
          fontSize: 13, padding: "10px 18px", borderRadius: 10,
          boxShadow: "0 8px 24px rgba(0,0,0,0.15)", zIndex: 50
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 className="page-title">Manage Sites</h1>
          <p className="page-desc">Add, edit or remove sites. Each site maps to a crawl target and appears in the header.</p>
        </div>
        {!showAdd && (
          <button onClick={() => { setShowAdd(true); setEditId(null); setError(null); }} className="btn btn-primary">
            + Add Site
          </button>
        )}
      </div>

      {error && (
        <div style={{ padding: "10px 14px", background: "var(--critical-bg)", color: "var(--critical-text)", borderRadius: 8, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="card" style={{ padding: "20px 24px" }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 16 }}>New Site</h2>
          <SiteForm onSave={handleAdd} onCancel={() => { setShowAdd(false); setError(null); }} saving={saving} />
        </div>
      )}

      {/* Empty state */}
      {sites.length === 0 && !showAdd && (
        <div className="card" style={{ padding: "60px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12, color: "var(--text-muted)" }}>⊡</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>No sites yet</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>
            Add your first site to start crawling and tracking SEO issues.
          </div>
          <button onClick={() => setShowAdd(true)} className="btn btn-primary">+ Add Your First Site</button>
        </div>
      )}

      {/* Site list */}
      {sites.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sites.map((site) => {
            const color = site.color || "#6366F1";
            const isEditing = editId === site.id;
            return (
              <div key={site.id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 14, padding: "16px 20px",
                  borderBottom: isEditing ? "1px solid var(--border)" : "none"
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{site.label}</span>
                      <span style={{
                        fontSize: 10, padding: "1px 6px", borderRadius: 4,
                        background: "var(--bg-surface)", color: "var(--text-muted)",
                        fontFamily: "'JetBrains Mono', monospace"
                      }}>{site.id}</span>
                      {site.sf_config && (
                        <span style={{
                          fontSize: 10, padding: "1px 6px", borderRadius: 4,
                          background: "var(--brand)15", color: "var(--brand)", border: "1px solid var(--brand)40"
                        }}>SF configured</span>
                      )}
                    </div>
                    <a href={site.url} target="_blank" rel="noreferrer"
                      style={{ fontSize: 12, color: "var(--brand)", textDecoration: "none" }}>
                      {site.url}
                    </a>
                    <div style={{ display: "flex", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
                      {site.gsc_property && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>GSC: {site.gsc_property}</span>}
                      {site.ga4_property_id && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>GA4: {site.ga4_property_id}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => { setEditId(isEditing ? null : site.id); setShowAdd(false); setError(null); }}
                      className="btn btn-surface" style={{ fontSize: 12 }}>
                      {isEditing ? "Cancel" : "Edit"}
                    </button>
                    <button
                      onClick={() => handleDelete(site.id)}
                      disabled={deletingId === site.id}
                      className="btn btn-danger"
                      style={{ fontSize: 12, opacity: deletingId === site.id ? 0.6 : 1 }}>
                      {deletingId === site.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>

                {isEditing && (
                  <div style={{ padding: "16px 20px", background: "var(--bg-surface)" }}>
                    <SiteForm
                      initial={{
                        label: site.label ?? "",
                        url: site.url ?? "",
                        gsc_property: site.gsc_property ?? "",
                        ga4_property_id: site.ga4_property_id ?? "",
                        color: site.color ?? "#4836FE",
                        sheets_tab_name: site.sheets_tab_name ?? "",
                        sf_config: site.sf_config ?? { ...SF_DEFAULTS }
                      }}
                      onSave={(form) => handleEdit(site.id, form)}
                      onCancel={() => { setEditId(null); setError(null); }}
                      saving={saving}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info box */}
      <div style={{ padding: "14px 18px", background: "var(--bg-surface)", borderRadius: 10, border: "1px solid var(--border)" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>How sites work</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.7 }}>
          Each site appears as a pill in the header. Clicking a pill switches the active site context for audit pages, GSC Overlay, and GA4.
          The <strong>Default Crawl Configuration</strong> stores Screaming Frog settings per site — so every crawl starts with your preferred config without manual setup.
        </div>
      </div>
    </div>
  );
}
