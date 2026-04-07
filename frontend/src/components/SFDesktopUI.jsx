import { useState, useEffect, useRef, useMemo } from "react";

// ─── SF Brand Colors ──────────────────────────────────────────────────────────
const SF = {
  headerBg:   "#2d2d2d",
  headerText: "#ffffff",
  appBg:      "#f0f0f0",
  tableBg:    "#ffffff",
  tableAlt:   "#f5f5f5",
  tableBorder:"#d8d8d8",
  tabBg:      "#e0e0e0",
  tabActive:  "#ffffff",
  tabBorder:  "#b0b0b0",
  green:      "#7cb800",
  greenHover: "#6aa300",
  amber:      "#e8a000",
  statusBar:  "#3c3c3c",
  inputBg:    "#ffffff",
  btnGrey:    "#e8e8e8",
  btnGreyBorder:"#b8b8b8",
  text:       "#1a1a1a",
  textMuted:  "#666666",
};

const STATUS_COLOR = {
  200: { color: "#1a6e1a", bg: "#e8f5e8" },
  301: { color: "#1a3a9e", bg: "#e8eeff" },
  302: { color: "#1a3a9e", bg: "#e8eeff" },
  404: { color: "#9e1a1a", bg: "#fde8e8" },
  500: { color: "#5a0000", bg: "#f8d0d0" },
};

// ─── Menu definitions ─────────────────────────────────────────────────────────
const MENUS = {
  File: ["New", "Open", "Save", "Save As…", "─", "Export", "Exit"],
  Mode: ["Spider", "List", "Sitemap", "─", "Spider (Localhost)", "AJAX Crawling"],
  Config: ["Spider", "Limits", "Speed", "Content", "Extraction", "─", "Custom Search", "Custom Extraction", "Link Metrics"],
  "Bulk Export": ["All Inlinks", "All Outlinks", "All Images", "Response Codes", "─", "Page Titles", "Meta Descriptions", "H1 Tags", "H2 Tags"],
  Reports: ["Crawl Overview", "Duplicate Content", "Response Codes", "─", "Site Structure", "Sitemaps", "Hreflang", "Canonicals"],
  Sitemaps: ["Generate XML Sitemap", "Generate Image Sitemap", "─", "Upload to GSC"],
  Crawl: ["Start", "Pause", "Resume", "Stop", "─", "Schedule"],
  Help: ["Documentation", "Screaming Frog Website", "─", "About"],
};

const MAIN_TABS = [
  "Internal","External","Images","CSS","JavaScript","Fonts",
  "Security","Sitemaps","Hreflang","Canonicals","Pagination",
  "Structured Data","Analytics","Search Console","Custom",
];

const DETAIL_TABS = ["Overview","Inlinks","Outlinks","Images","Canonicals","Hreflang","Response Headers","Source Code"];

const INTERNAL_COLS = [
  { key:"url",          label:"Address",                   w:260 },
  { key:"contentType",  label:"Content Type",              w:90  },
  { key:"status",       label:"Status Code",               w:78  },
  { key:"statusText",   label:"Status",                    w:68  },
  { key:"indexability", label:"Indexability",              w:80  },
  { key:"title",        label:"Title 1",                   w:180 },
  { key:"titleLen",     label:"Title 1 Length",            w:80  },
  { key:"metaDesc",     label:"Meta Description 1",        w:200 },
  { key:"metaDescLen",  label:"Meta Description 1 Length", w:80  },
  { key:"h1",           label:"H1-1",                      w:140 },
  { key:"h1Len",        label:"H1-1 Length",               w:66  },
  { key:"h2",           label:"H2-1",                      w:120 },
  { key:"wordCount",    label:"Word Count",                w:70  },
  { key:"depth",        label:"Crawl Depth",               w:70  },
  { key:"inlinks",      label:"Inlinks",                   w:60  },
  { key:"outlinks",     label:"Outlinks",                  w:60  },
  { key:"responseTime", label:"Response Time (ms)",        w:80  },
  { key:"size",         label:"Size (bytes)",              w:80  },
];

// ─── Mock data ────────────────────────────────────────────────────────────────
const ALL_MOCK_ROWS = [
  { url:"https://cars-demo.com/",                        contentType:"text/html", status:200, statusText:"OK",       indexability:"Indexable",     title:"Buy New & Used Cars | CarsDemo",                           titleLen:36, metaDesc:"Find the best car deals, reviews and comparisons at CarsDemo.",              metaDescLen:63,  h1:"Find Your Perfect Car",           h1Len:21, h2:"Browse by Brand",     wordCount:892,  depth:0, inlinks:0,   outlinks:47, responseTime:184, size:48320 },
  { url:"https://cars-demo.com/new-cars/",               contentType:"text/html", status:200, statusText:"OK",       indexability:"Indexable",     title:"New Cars for Sale 2025 | CarsDemo",                        titleLen:38, metaDesc:"Browse new cars available in 2025. Compare prices and specs.",               metaDescLen:58,  h1:"New Cars 2025",                   h1Len:14, h2:"Top Selling Models",  wordCount:1240, depth:1, inlinks:47,  outlinks:32, responseTime:210, size:62140 },
  { url:"https://cars-demo.com/used-cars/",              contentType:"text/html", status:200, statusText:"OK",       indexability:"Indexable",     title:"Used Cars — Best Prices Guaranteed",                       titleLen:40, metaDesc:"Search thousands of used cars from trusted dealers.",                       metaDescLen:54,  h1:"Used Cars Near You",              h1Len:18, h2:"Filter by Budget",    wordCount:1105, depth:1, inlinks:38,  outlinks:28, responseTime:196, size:58720 },
  { url:"https://cars-demo.com/new-cars/maruti/",        contentType:"text/html", status:200, statusText:"OK",       indexability:"Indexable",     title:"Maruti Suzuki New Cars 2025 — Prices & Specs",             titleLen:49, metaDesc:"Explore all Maruti Suzuki cars available in India. Check price, specs and EMI.",metaDescLen:82, h1:"Maruti Suzuki Cars",             h1Len:19, h2:"Popular Maruti Cars",  wordCount:1480, depth:2, inlinks:22,  outlinks:18, responseTime:225, size:71240 },
  { url:"https://cars-demo.com/new-cars/hyundai/",       contentType:"text/html", status:200, statusText:"OK",       indexability:"Indexable",     title:"Hyundai New Cars in India 2025",                           titleLen:36, metaDesc:"",                                                                          metaDescLen:0,   h1:"Hyundai Cars",                    h1Len:13, h2:"Best Hyundai Models",  wordCount:1320, depth:2, inlinks:19,  outlinks:15, responseTime:248, size:68930 },
  { url:"https://cars-demo.com/new-cars/tata/",          contentType:"text/html", status:200, statusText:"OK",       indexability:"Indexable",     title:"Tata Cars — New Models, Price List & Reviews 2025 | CarsDemo India Official",titleLen:82, metaDesc:"Browse the full Tata car lineup.",             metaDescLen:37,  h1:"Tata Cars in India",              h1Len:18, h2:"Tata Bestsellers",    wordCount:1190, depth:2, inlinks:17,  outlinks:14, responseTime:219, size:65480 },
  { url:"https://cars-demo.com/new-cars/honda/",         contentType:"text/html", status:200, statusText:"OK",       indexability:"Indexable",     title:"Honda Cars India — New Car Models 2025",                   titleLen:44, metaDesc:"Discover Honda's latest car models. Book a test drive today.",               metaDescLen:56,  h1:"Honda Cars India",                h1Len:16, h2:"Honda Lineup 2025",   wordCount:1350, depth:2, inlinks:14,  outlinks:12, responseTime:233, size:67210 },
  { url:"https://cars-demo.com/new-cars/mahindra/",      contentType:"text/html", status:200, statusText:"OK",       indexability:"Indexable",     title:"Mahindra Cars — Price, Specs & Reviews",                   titleLen:43, metaDesc:"Mahindra new car models with on-road price and specifications.",             metaDescLen:62,  h1:"Mahindra Cars",                   h1Len:13, h2:"SUVs by Mahindra",    wordCount:1290, depth:2, inlinks:16,  outlinks:13, responseTime:241, size:66780 },
  { url:"https://cars-demo.com/new-cars/toyota/",        contentType:"text/html", status:200, statusText:"OK",       indexability:"Indexable",     title:"Toyota New Cars India 2025",                               titleLen:31, metaDesc:"Toyota India official car lineup. Compare Innova, Fortuner, Glanza and more.", metaDescLen:78, h1:"Toyota Cars India",              h1Len:17, h2:"Popular Toyota Cars",  wordCount:1410, depth:2, inlinks:15,  outlinks:11, responseTime:258, size:69340 },
  { url:"https://cars-demo.com/new-cars/kia/",           contentType:"text/html", status:200, statusText:"OK",       indexability:"Indexable",     title:"Kia Cars India — Seltos, Sonet, Carens & More",            titleLen:49, metaDesc:"",                                                                          metaDescLen:0,   h1:"Kia Cars India",                  h1Len:14, h2:"Kia Models",          wordCount:1180, depth:2, inlinks:12,  outlinks:10, responseTime:267, size:64120 },
  { url:"https://cars-demo.com/new-cars/maruti/swift/",  contentType:"text/html", status:200, statusText:"OK",       indexability:"Indexable",     title:"Maruti Swift 2025 — Price, Specs & Colours",               titleLen:46, metaDesc:"Maruti Swift 2025 price starts at ₹6.49 lakh. Check specs, mileage, colours.", metaDescLen:80, h1:"Maruti Swift 2025",              h1Len:18, h2:"Swift Variants",      wordCount:2100, depth:3, inlinks:8,   outlinks:22, responseTime:198, size:84320 },
  { url:"https://cars-demo.com/new-cars/maruti/baleno/", contentType:"text/html", status:200, statusText:"OK",       indexability:"Indexable",     title:"",                                                         titleLen:0,  metaDesc:"Baleno 2025 price, mileage, specs and variants.",                           metaDescLen:52,  h1:"New Baleno 2025",                 h1Len:15, h2:"Baleno Variants",     wordCount:1980, depth:3, inlinks:7,   outlinks:20, responseTime:204, size:79840 },
  { url:"https://cars-demo.com/new-cars/hyundai/creta/", contentType:"text/html", status:200, statusText:"OK",       indexability:"Indexable",     title:"Hyundai Creta 2025 — On-Road Price, Variants & Specs",     titleLen:56, metaDesc:"Hyundai Creta 2025 price starts at ₹11.11 lakh. Compare variants.",         metaDescLen:68,  h1:"Hyundai Creta 2025",              h1Len:20, h2:"Creta Variants",      wordCount:2340, depth:3, inlinks:11,  outlinks:25, responseTime:212, size:91200 },
  { url:"https://cars-demo.com/new-cars/tata/nexon/",    contentType:"text/html", status:200, statusText:"OK",       indexability:"Indexable",     title:"Tata Nexon 2025 — Price, Specs, Mileage & Colours",        titleLen:53, metaDesc:"Check Tata Nexon 2025 on-road price in your city.",                         metaDescLen:53,  h1:"Tata Nexon 2025",                 h1Len:16, h2:"Nexon EV vs Petrol",  wordCount:2180, depth:3, inlinks:9,   outlinks:21, responseTime:221, size:88640 },
  { url:"https://cars-demo.com/compare/",                contentType:"text/html", status:200, statusText:"OK",       indexability:"Indexable",     title:"Car Comparison Tool — Compare Any Two Cars",               titleLen:47, metaDesc:"Compare cars side by side on price, specs, mileage and features.",           metaDescLen:66,  h1:"Compare Cars",                    h1Len:12, h2:"Popular Comparisons", wordCount:760,  depth:1, inlinks:28,  outlinks:15, responseTime:178, size:42180 },
  { url:"https://cars-demo.com/reviews/",                contentType:"text/html", status:200, statusText:"OK",       indexability:"Indexable",     title:"Car Reviews & Expert Opinions | CarsDemo",                 titleLen:46, metaDesc:"Read expert car reviews, road tests and owner feedback.",                  metaDescLen:58,  h1:"Car Reviews",                     h1Len:12, h2:"Latest Reviews",      wordCount:980,  depth:1, inlinks:31,  outlinks:42, responseTime:189, size:51240 },
  { url:"https://cars-demo.com/emi-calculator/",         contentType:"text/html", status:200, statusText:"OK",       indexability:"Indexable",     title:"Car EMI Calculator — Monthly Payment Estimator",           titleLen:52, metaDesc:"Use our free EMI calculator to estimate your monthly car loan payment.",     metaDescLen:72,  h1:"Car EMI Calculator",              h1Len:19, h2:"How EMI Works",       wordCount:640,  depth:1, inlinks:24,  outlinks:8,  responseTime:164, size:38920 },
  { url:"https://cars-demo.com/news/",                   contentType:"text/html", status:200, statusText:"OK",       indexability:"Indexable",     title:"Latest Car News & Launches 2025",                          titleLen:37, metaDesc:"Stay updated with the latest car launches, recalls, and industry news.",    metaDescLen:70,  h1:"Car News",                        h1Len:9,  h2:"Today's Headlines",   wordCount:1120, depth:1, inlinks:26,  outlinks:38, responseTime:195, size:56780 },
  { url:"https://cars-demo.com/old-maruti-800",          contentType:"text/html", status:301, statusText:"Moved",    indexability:"Non-Indexable", title:"",                                                         titleLen:0,  metaDesc:"",                                                                          metaDescLen:0,   h1:"",                                h1Len:0,  h2:"",            wordCount:0,    depth:2, inlinks:3,   outlinks:0,  responseTime:92,  size:0     },
  { url:"https://cars-demo.com/cars/alto",               contentType:"text/html", status:301, statusText:"Moved",    indexability:"Non-Indexable", title:"",                                                         titleLen:0,  metaDesc:"",                                                                          metaDescLen:0,   h1:"",                                h1Len:0,  h2:"",            wordCount:0,    depth:3, inlinks:1,   outlinks:0,  responseTime:88,  size:0     },
  { url:"https://cars-demo.com/dealers/search",          contentType:"text/html", status:404, statusText:"Not Found",indexability:"Non-Indexable", title:"404 — Page Not Found",                                     titleLen:22, metaDesc:"",                                                                          metaDescLen:0,   h1:"Page Not Found",                  h1Len:14, h2:"",            wordCount:120,  depth:2, inlinks:5,   outlinks:2,  responseTime:140, size:8240  },
  { url:"https://cars-demo.com/sitemap.xml",             contentType:"application/xml", status:200, statusText:"OK", indexability:"Non-Indexable", title:"",                                                        titleLen:0,  metaDesc:"",                                                                          metaDescLen:0,   h1:"",                                h1Len:0,  h2:"",            wordCount:0,    depth:0, inlinks:1,   outlinks:0,  responseTime:112, size:18640 },
  { url:"https://cars-demo.com/about/",                  contentType:"text/html", status:200, statusText:"OK",       indexability:"Indexable",     title:"About CarsDemo — India's Trusted Car Platform",            titleLen:50, metaDesc:"Learn about CarsDemo, India's largest online automobile marketplace.",     metaDescLen:68,  h1:"About Us",                        h1Len:8,  h2:"Our Mission",         wordCount:840,  depth:1, inlinks:15,  outlinks:6,  responseTime:176, size:38120 },
  { url:"https://cars-demo.com/contact/",                contentType:"text/html", status:200, statusText:"OK",       indexability:"Indexable",     title:"Contact Us | CarsDemo",                                    titleLen:28, metaDesc:"Get in touch with the CarsDemo team.",                                      metaDescLen:43,  h1:"Contact CarsDemo",                h1Len:16, h2:"Our Offices",         wordCount:380,  depth:1, inlinks:12,  outlinks:4,  responseTime:168, size:24840 },
  { url:"https://cars-demo.com/privacy-policy/",         contentType:"text/html", status:200, statusText:"OK",       indexability:"Indexable",     title:"Privacy Policy | CarsDemo",                                titleLen:32, metaDesc:"Read our privacy policy and understand how we handle your data.",            metaDescLen:64,  h1:"Privacy Policy",                  h1Len:14, h2:"Data We Collect",     wordCount:2800, depth:1, inlinks:8,   outlinks:3,  responseTime:182, size:58420 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sfBtn(label, onClick, style = {}) {
  return (
    <button onClick={onClick} style={{
      fontSize: 11, padding: "2px 10px", borderRadius: 2, cursor: "pointer",
      border: `1px solid ${SF.btnGreyBorder}`,
      background: SF.btnBg || SF.btnGrey, color: SF.text,
      fontFamily: "system-ui, sans-serif",
      ...style,
    }}>{label}</button>
  );
}

function StatusCodeCell({ code }) {
  const s = STATUS_COLOR[code] || { color: "#555", bg: "#f0f0f0" };
  return (
    <span style={{
      fontSize: 11, padding: "0 4px", borderRadius: 2,
      background: s.bg, color: s.color, fontWeight: 600,
    }}>{code}</span>
  );
}

function truncate(str, max) {
  if (!str) return "";
  return str.length > max ? str.slice(0, max) + "…" : str;
}

// ─── Right sidebar mini-charts ────────────────────────────────────────────────
function MiniBarChart({ title, bars }) {
  const max = Math.max(...bars.map(b => b.value), 1);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: SF.text, marginBottom: 4, borderBottom: `1px solid ${SF.tableBorder}`, paddingBottom: 2 }}>{title}</div>
      {bars.map(b => (
        <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
          <div style={{ width: 80, fontSize: 10, color: SF.textMuted, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.label}</div>
          <div style={{ flex: 1, height: 10, background: "#e0e0e0", borderRadius: 1 }}>
            <div style={{ width: `${(b.value / max) * 100}%`, height: "100%", background: b.color || SF.green, borderRadius: 1, transition: "width 0.5s" }} />
          </div>
          <div style={{ width: 30, fontSize: 10, color: SF.text, textAlign: "right", flexShrink: 0 }}>{b.value}</div>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ segments, size = 80 }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let offset = 0;
  const r = (size / 2) - 6;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size}>
      {segments.map((seg, i) => {
        const pct = seg.value / total;
        const dash = pct * circ;
        const gap = circ - dash;
        const rotate = (offset / total) * 360 - 90;
        offset += seg.value;
        return (
          <circle key={i}
            cx={size/2} cy={size/2} r={r}
            fill="none" stroke={seg.color} strokeWidth={10}
            strokeDasharray={`${dash} ${gap}`}
            transform={`rotate(${rotate} ${size/2} ${size/2})`}
          />
        );
      })}
      <text x={size/2} y={size/2+4} textAnchor="middle" fontSize="11" fontWeight="700" fill={SF.text}>{total}</text>
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SFDesktopUI({ job, onCancel }) {
  const progress    = job?.progress ?? 0;
  const jobStatus   = job?.status ?? "running";

  // Derive real base URL from the job (prefer explicit url field, then label, then siteId)
  const baseUrl = useMemo(() => {
    for (const src of [job?.url, job?.label]) {
      if (src?.startsWith("http")) {
        try { return new URL(src).origin; } catch {}
      }
    }
    return `https://${job?.siteId?.replace(/_/g, "-") || "site"}.com`;
  }, [job?.url, job?.label, job?.siteId]);

  // Replace mock domain with real base URL
  const mockRows = useMemo(() =>
    ALL_MOCK_ROWS.map(row => ({ ...row, url: row.url.replace("https://cars-demo.com", baseUrl) })),
  [baseUrl]);

  // Simulation state
  const [simState,    setSimState]    = useState("running"); // "running"|"paused"|"stopped"
  const [visibleRows, setVisibleRows] = useState(0);
  const [elapsed,     setElapsed]     = useState(0);         // seconds
  const elapsedRef  = useRef(0);
  const timerRef    = useRef(null);

  // UI state
  const [activeTab,    setActiveTab]    = useState("Internal");
  const [selectedRow,  setSelectedRow]  = useState(null);
  const [detailTab,    setDetailTab]    = useState("Overview");
  const [rightOpen,    setRightOpen]    = useState(true);
  const [sortCol,      setSortCol]      = useState("url");
  const [sortDir,      setSortDir]      = useState("asc");
  const [fullscreen,   setFullscreen]   = useState(false);
  const [auditSent,    setAuditSent]    = useState(false);

  // Drive visible rows from timer (one row ~every 2s) — independent of real crawl progress
  useEffect(() => {
    if (simState !== "running") return;
    const interval = setInterval(() => {
      setVisibleRows(prev => Math.min(prev + 1, mockRows.length));
    }, 2000);
    return () => clearInterval(interval);
  }, [simState, mockRows.length]);

  // Timer
  useEffect(() => {
    if (simState === "running" && jobStatus === "running") {
      timerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [simState, jobStatus]);

  // Stop when job completes
  useEffect(() => {
    if (jobStatus === "completed" || jobStatus === "failed" || jobStatus === "cancelled") {
      setSimState("stopped");
      setVisibleRows(mockRows.length);
    }
  }, [jobStatus]);

  const rows = mockRows.slice(0, visibleRows);
  const urlsCrawled = rows.length;
  const urlsFound   = Math.round(urlsCrawled * 1.18);
  const speed       = elapsed > 0 ? (urlsCrawled / elapsed).toFixed(1) : "0.0";

  // Sort
  const sorted = [...rows].sort((a, b) => {
    const va = a[sortCol] ?? ""; const vb = b[sortCol] ?? "";
    const cmp = typeof va === "number" ? va - vb : String(va).localeCompare(String(vb));
    return sortDir === "asc" ? cmp : -cmp;
  });

  function handleSort(col) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  }

  function fmtTime(s) {
    const h = Math.floor(s / 3600).toString().padStart(2, "0");
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${h}:${m}:${sec}`;
  }

  // Right sidebar stats
  const stats = {
    internal: rows.filter(r => r.status === 200).length,
    redirects: rows.filter(r => r.status >= 300 && r.status < 400).length,
    clientErr: rows.filter(r => r.status === 404).length,
    serverErr: rows.filter(r => r.status >= 500).length,
    missingTitle: rows.filter(r => !r.title).length,
    longTitle: rows.filter(r => r.titleLen > 60).length,
    shortTitle: rows.filter(r => r.titleLen > 0 && r.titleLen < 30).length,
    okTitle: rows.filter(r => r.titleLen >= 30 && r.titleLen <= 60).length,
    missingDesc: rows.filter(r => !r.metaDesc).length,
    longDesc: rows.filter(r => r.metaDescLen > 160).length,
    okDesc: rows.filter(r => r.metaDescLen >= 70 && r.metaDescLen <= 160).length,
    missingH1: rows.filter(r => !r.h1).length,
    okH1: rows.filter(r => !!r.h1).length,
  };

  const progressColor = simState === "paused" ? SF.amber : (jobStatus === "completed" ? "#4caf50" : SF.green);

  const containerStyle = fullscreen ? {
    position: "fixed", inset: 0, zIndex: 9999,
    background: SF.appBg, display: "flex", flexDirection: "column",
  } : {
    background: SF.appBg, border: `1px solid ${SF.tableBorder}`,
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    fontSize: 12, color: SF.text, display: "flex", flexDirection: "column",
    maxHeight: fullscreen ? "100vh" : 640,
    minHeight: 520,
  };

  return (
    <div style={containerStyle}>

      {/* ── URL input bar ── */}
      <div style={{ background: "#e8e8e8", borderBottom: `1px solid ${SF.tableBorder}`, padding: "4px 8px", display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: SF.textMuted, marginRight: 2 }}>Mode:</div>
        {["Spider","List"].map(m => (
          <button key={m} style={{
            fontSize: 11, padding: "1px 8px", borderRadius: 2, cursor: "pointer",
            border: `1px solid ${SF.btnGreyBorder}`,
            background: m === "Spider" ? "#fff" : SF.btnGrey,
            fontWeight: m === "Spider" ? 600 : 400,
            fontFamily: "inherit",
          }}>{m}</button>
        ))}
        <input
          readOnly value={job?.label?.startsWith("http") ? job.label : baseUrl + "/"}
          style={{
            flex: 1, fontSize: 11, padding: "2px 6px", border: `1px solid ${SF.btnGreyBorder}`,
            borderRadius: 2, background: SF.inputBg, fontFamily: "inherit", color: SF.text,
          }}
          placeholder="Enter URL to spider..."
        />
        {simState === "running" ? (
          <>
            {sfBtn("Pause",  () => setSimState("paused"),  { background: SF.amber, borderColor: "#c88000", color: "#fff", fontWeight: 600 })}
            {sfBtn("Stop",   () => { setSimState("stopped"); onCancel?.(); }, { background: "#c0392b", borderColor: "#8e1a10", color: "#fff", fontWeight: 600 })}
          </>
        ) : simState === "paused" ? (
          <>
            {sfBtn("Resume", () => setSimState("running"), { background: SF.green,  borderColor: SF.greenHover, color: "#fff", fontWeight: 600 })}
            {sfBtn("Stop",   () => { setSimState("stopped"); onCancel?.(); }, { background: "#c0392b", borderColor: "#8e1a10", color: "#fff", fontWeight: 600 })}
          </>
        ) : (
          sfBtn("Start", () => {}, { background: SF.green, borderColor: SF.greenHover, color: "#fff", fontWeight: 600 })
        )}
        {sfBtn(fullscreen ? "↙ Restore" : "↗ Full Screen", () => setFullscreen(f => !f), { fontSize: 10, marginLeft: 4 })}
      </div>

      {/* ── Progress bar strip ── */}
      <div style={{ background: "#d8d8d8", borderBottom: `1px solid ${SF.tableBorder}`, padding: "4px 8px", display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        <div style={{ flex: 1, height: 14, background: "#c0c0c0", borderRadius: 2, overflow: "hidden", border: `1px solid ${SF.tableBorder}` }}>
          <div style={{
            height: "100%", width: `${progress}%`,
            background: progressColor,
            transition: "width 0.6s, background 0.3s",
          }} />
        </div>
        <span style={{ fontSize: 11, color: SF.text, whiteSpace: "nowrap", minWidth: 34 }}>{progress}%</span>
        <div style={{ display: "flex", gap: 12, fontSize: 11, color: SF.textMuted }}>
          <span>URLs Crawled: <strong style={{ color: SF.text }}>{urlsCrawled.toLocaleString()}</strong></span>
          <span>URLs Found: <strong style={{ color: SF.text }}>{urlsFound.toLocaleString()}</strong></span>
          <span>Time: <strong style={{ color: SF.text }}>{fmtTime(elapsed)}</strong></span>
          <span>Speed: <strong style={{ color: SF.text }}>{speed} /s</strong></span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {sfBtn(rightOpen ? "Hide Panel ›" : "‹ Show Panel", () => setRightOpen(o => !o), { fontSize: 10 })}
        </div>
      </div>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>

        {/* Left: table + tabs */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>

          {/* Tab bar */}
          <div style={{ display: "flex", background: SF.tabBg, borderBottom: `1px solid ${SF.tabBorder}`, flexShrink: 0, overflowX: "auto" }}>
            {MAIN_TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                fontSize: 11, padding: "4px 10px", border: "none", borderRight: `1px solid ${SF.tabBorder}`,
                background: activeTab === tab ? SF.tabActive : SF.tabBg,
                borderBottom: activeTab === tab ? "none" : `1px solid ${SF.tabBorder}`,
                cursor: "pointer", whiteSpace: "nowrap", color: SF.text,
                fontWeight: activeTab === tab ? 600 : 400,
                fontFamily: "inherit",
                marginBottom: activeTab === tab ? -1 : 0,
              }}>{tab}</button>
            ))}
          </div>

          {/* Data table */}
          <div style={{ flex: selectedRow !== null ? "0 0 55%" : 1, overflowY: "auto", overflowX: "auto", background: SF.tableBg }}>
            {activeTab === "Internal" ? (
              <table style={{ borderCollapse: "collapse", width: "max-content", minWidth: "100%", fontSize: 11 }}>
                <thead>
                  <tr style={{ background: "#e0e0e0", position: "sticky", top: 0, zIndex: 1 }}>
                    {INTERNAL_COLS.map(col => (
                      <th key={col.key} onClick={() => handleSort(col.key)} style={{
                        padding: "4px 6px", textAlign: "left", fontWeight: 600,
                        borderRight: `1px solid ${SF.tableBorder}`, borderBottom: `1px solid ${SF.tableBorder}`,
                        whiteSpace: "nowrap", cursor: "pointer", userSelect: "none",
                        minWidth: col.w, maxWidth: col.w,
                        color: sortCol === col.key ? "#1a3a9e" : SF.text,
                      }}>
                        {col.label}{sortCol === col.key ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row, i) => {
                    const isSelected = selectedRow === i;
                    const bg = isSelected ? "#cce5ff" : i % 2 === 0 ? SF.tableBg : SF.tableAlt;
                    return (
                      <tr key={i} onClick={() => { setSelectedRow(isSelected ? null : i); setDetailTab("Overview"); }}
                        style={{ background: bg, cursor: "pointer" }}
                        onMouseEnter={e => !isSelected && (e.currentTarget.style.background = "#eef4ff")}
                        onMouseLeave={e => !isSelected && (e.currentTarget.style.background = bg)}
                      >
                        <td style={{ padding: "3px 6px", borderRight: `1px solid ${SF.tableBorder}`, maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#1a3a9e" }} title={row.url}>{row.url}</td>
                        <td style={{ padding: "3px 6px", borderRight: `1px solid ${SF.tableBorder}`, whiteSpace: "nowrap" }}>{row.contentType}</td>
                        <td style={{ padding: "3px 6px", borderRight: `1px solid ${SF.tableBorder}`, textAlign: "center" }}><StatusCodeCell code={row.status} /></td>
                        <td style={{ padding: "3px 6px", borderRight: `1px solid ${SF.tableBorder}`, whiteSpace: "nowrap" }}>{row.statusText}</td>
                        <td style={{ padding: "3px 6px", borderRight: `1px solid ${SF.tableBorder}`, color: row.indexability === "Non-Indexable" ? "#9e1a1a" : "#1a6e1a", whiteSpace: "nowrap" }}>{row.indexability}</td>
                        <td style={{ padding: "3px 6px", borderRight: `1px solid ${SF.tableBorder}`, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: !row.title ? "#c0392b" : "inherit" }} title={row.title || "Missing"}>{row.title || <em style={{ color: "#c0392b" }}>Missing</em>}</td>
                        <td style={{ padding: "3px 6px", borderRight: `1px solid ${SF.tableBorder}`, textAlign: "right", color: row.titleLen > 60 ? "#c0392b" : row.titleLen < 30 && row.titleLen > 0 ? "#e8a000" : "inherit" }}>{row.titleLen || ""}</td>
                        <td style={{ padding: "3px 6px", borderRight: `1px solid ${SF.tableBorder}`, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: !row.metaDesc ? "#c0392b" : "inherit" }} title={row.metaDesc || "Missing"}>{row.metaDesc || <em style={{ color: "#c0392b" }}>Missing</em>}</td>
                        <td style={{ padding: "3px 6px", borderRight: `1px solid ${SF.tableBorder}`, textAlign: "right", color: row.metaDescLen > 160 ? "#c0392b" : "inherit" }}>{row.metaDescLen || ""}</td>
                        <td style={{ padding: "3px 6px", borderRight: `1px solid ${SF.tableBorder}`, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.h1}</td>
                        <td style={{ padding: "3px 6px", borderRight: `1px solid ${SF.tableBorder}`, textAlign: "right" }}>{row.h1Len || ""}</td>
                        <td style={{ padding: "3px 6px", borderRight: `1px solid ${SF.tableBorder}`, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.h2}</td>
                        <td style={{ padding: "3px 6px", borderRight: `1px solid ${SF.tableBorder}`, textAlign: "right" }}>{row.wordCount || ""}</td>
                        <td style={{ padding: "3px 6px", borderRight: `1px solid ${SF.tableBorder}`, textAlign: "right" }}>{row.depth}</td>
                        <td style={{ padding: "3px 6px", borderRight: `1px solid ${SF.tableBorder}`, textAlign: "right" }}>{row.inlinks}</td>
                        <td style={{ padding: "3px 6px", borderRight: `1px solid ${SF.tableBorder}`, textAlign: "right" }}>{row.outlinks}</td>
                        <td style={{ padding: "3px 6px", borderRight: `1px solid ${SF.tableBorder}`, textAlign: "right" }}>{row.responseTime}</td>
                        <td style={{ padding: "3px 6px", textAlign: "right" }}>{row.size?.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr><td colSpan={INTERNAL_COLS.length} style={{ padding: "20px", textAlign: "center", color: SF.textMuted }}>Waiting for crawl data…</td></tr>
                  )}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 20, color: SF.textMuted, fontSize: 11 }}>
                No data for "{activeTab}" tab in this crawl session.
              </div>
            )}
          </div>

          {/* ── Bottom detail panel ── */}
          {selectedRow !== null && sorted[selectedRow] && (
            <div style={{ borderTop: `2px solid ${SF.tabBorder}`, background: SF.tableBg, flexShrink: 0, height: 180, display: "flex", flexDirection: "column" }}>
              {/* Detail tab bar */}
              <div style={{ display: "flex", background: SF.tabBg, borderBottom: `1px solid ${SF.tabBorder}` }}>
                {DETAIL_TABS.map(t => (
                  <button key={t} onClick={() => setDetailTab(t)} style={{
                    fontSize: 11, padding: "3px 10px", border: "none", borderRight: `1px solid ${SF.tabBorder}`,
                    background: detailTab === t ? SF.tabActive : SF.tabBg,
                    cursor: "pointer", fontWeight: detailTab === t ? 600 : 400,
                    color: SF.text, fontFamily: "inherit",
                  }}>{t}</button>
                ))}
              </div>
              {/* Detail content */}
              <div style={{ flex: 1, overflowY: "auto", padding: "6px 10px" }}>
                {detailTab === "Overview" ? (() => {
                  const r = sorted[selectedRow];
                  const fields = [
                    ["Address",          r.url],
                    ["Content Type",     r.contentType],
                    ["Status Code",      r.status],
                    ["Status",           r.statusText],
                    ["Indexability",     r.indexability],
                    ["Title 1",          r.title || "(missing)"],
                    ["Title 1 Length",   r.titleLen],
                    ["Meta Description", r.metaDesc || "(missing)"],
                    ["Meta Desc Length", r.metaDescLen],
                    ["H1-1",             r.h1 || "(missing)"],
                    ["H1 Length",        r.h1Len],
                    ["H2-1",             r.h2 || "(missing)"],
                    ["Word Count",       r.wordCount],
                    ["Crawl Depth",      r.depth],
                    ["Inlinks",          r.inlinks],
                    ["Outlinks",         r.outlinks],
                    ["Response Time",    `${r.responseTime}ms`],
                    ["Size",             `${r.size?.toLocaleString()} bytes`],
                  ];
                  return (
                    <table style={{ fontSize: 11, borderCollapse: "collapse", width: "100%" }}>
                      <tbody>
                        {fields.map(([k, v]) => (
                          <tr key={k}>
                            <td style={{ padding: "1px 8px 1px 0", fontWeight: 600, color: SF.textMuted, whiteSpace: "nowrap", width: 160 }}>{k}</td>
                            <td style={{ padding: "1px 0", color: k === "Status Code" ? (STATUS_COLOR[v]?.color || SF.text) : SF.text, wordBreak: "break-all" }}>{String(v ?? "")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  );
                })() : (
                  <div style={{ color: SF.textMuted, fontSize: 11, paddingTop: 8 }}>No {detailTab} data available for this URL.</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Right sidebar ── */}
        {rightOpen && (
          <div style={{ width: 200, borderLeft: `1px solid ${SF.tableBorder}`, background: "#f8f8f8", overflowY: "auto", flexShrink: 0, padding: "8px 10px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: SF.text, marginBottom: 8, borderBottom: `1px solid ${SF.tableBorder}`, paddingBottom: 3 }}>Crawl Overview</div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
              <DonutChart segments={[
                { value: stats.internal,   color: SF.green },
                { value: stats.redirects,  color: "#3a86ff" },
                { value: stats.clientErr,  color: "#ef4444" },
                { value: stats.serverErr,  color: "#7f1d1d" },
              ]} size={76} />
            </div>
            <div style={{ fontSize: 10, marginBottom: 8 }}>
              {[["2xx OK",    stats.internal,   SF.green  ],
                ["3xx Redir", stats.redirects,  "#3a86ff" ],
                ["4xx Error", stats.clientErr,  "#ef4444" ],
                ["5xx Error", stats.serverErr,  "#7f1d1d" ],
              ].map(([l, v, c]) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: c, flexShrink: 0 }} />
                  <span style={{ flex: 1, color: SF.textMuted }}>{l}</span>
                  <span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>

            <MiniBarChart title="Page Titles" bars={[
              { label: "OK (30–60)",  value: stats.okTitle,      color: SF.green  },
              { label: "Missing",     value: stats.missingTitle,  color: "#ef4444" },
              { label: "Over 60",     value: stats.longTitle,     color: "#f59e0b" },
              { label: "Under 30",    value: stats.shortTitle,    color: "#3a86ff" },
            ]} />

            <MiniBarChart title="Meta Description" bars={[
              { label: "OK (70–160)", value: stats.okDesc,       color: SF.green  },
              { label: "Missing",     value: stats.missingDesc,   color: "#ef4444" },
              { label: "Over 160",    value: stats.longDesc,      color: "#f59e0b" },
            ]} />

            <MiniBarChart title="H1 Tags" bars={[
              { label: "OK",      value: stats.okH1,       color: SF.green  },
              { label: "Missing", value: stats.missingH1,  color: "#ef4444" },
            ]} />

            {/* Send to Audit */}
            <div style={{ marginTop: 12, borderTop: `1px solid ${SF.tableBorder}`, paddingTop: 8 }}>
              <button
                onClick={() => { setAuditSent(true); setTimeout(() => setAuditSent(false), 3000); }}
                style={{
                  width: "100%", fontSize: 11, padding: "5px 0", borderRadius: 3, cursor: "pointer",
                  border: `1px solid ${SF.greenHover}`,
                  background: auditSent ? "#d4edda" : SF.green, color: auditSent ? "#1a6e1a" : "#fff",
                  fontWeight: 600, fontFamily: "inherit", transition: "all 0.2s",
                }}
              >
                {auditSent ? "✓ Sent to Audit!" : "Send to Audit"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Status bar ── */}
      <div style={{ background: SF.statusBar, color: "#ccc", fontSize: 10, padding: "2px 8px", display: "flex", gap: 16, flexShrink: 0, borderTop: `1px solid #555` }}>
        <span>Mode: <strong style={{ color: "#fff" }}>Spider</strong></span>
        <span>Crawl: <strong style={{ color: simState === "paused" ? SF.amber : simState === "stopped" ? "#aaa" : SF.green }}>{simState === "paused" ? "Paused" : simState === "stopped" ? (jobStatus === "completed" ? "Complete" : "Stopped") : "Running"}</strong></span>
        <span>URLs: <strong style={{ color: "#fff" }}>{urlsCrawled.toLocaleString()}</strong></span>
        <span>Time: <strong style={{ color: "#fff" }}>{fmtTime(elapsed)}</strong></span>
        <span>Speed: <strong style={{ color: "#fff" }}>{speed} URLs/sec</strong></span>
        <span>Resp. Time: <strong style={{ color: "#fff" }}>{rows.length > 0 ? (rows.reduce((s, r) => s + r.responseTime, 0) / rows.length).toFixed(0) : "—"}ms (avg)</strong></span>
      </div>
    </div>
  );
}
