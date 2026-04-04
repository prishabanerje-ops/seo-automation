import AuditPage from "../components/AuditPage.jsx";
const bool = v => v==="true"||v===true||v==="1"||v===1;
const tick = v => <span style={{color:bool(v)?"var(--pass)":"var(--warning)"}}>{bool(v)?"✓":"✗"}</span>;
const COLS = [
  { key: "url", label: "URL", render: v => <a href={v} target="_blank" rel="noreferrer" style={{color:"var(--brand)",fontFamily:"JetBrains Mono,monospace",fontSize:11}}>{v}</a> },
  { key: "ga4Present", label: "GA4", render: tick },
  { key: "gtmContainer", label: "GTM Container", render: tick },
  { key: "metaPixel", label: "Meta Pixel", render: v => <span style={{color:"var(--text-muted)"}}>{v||"—"}</span> },
  { key: "schemaTracking", label: "Schema Tracking", render: v => <span style={{fontSize:12}}>{v||"—"}</span> },
];
export default function AnalyticsTracking() {
  return <AuditPage title="Analytics & Tracking" section="analytics-tracking" columns={COLS} />;
}
