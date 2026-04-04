import AuditPage from "../components/AuditPage.jsx";
const COLS = [
  { key: "url", label: "URL", render: v => <a href={v} target="_blank" rel="noreferrer" style={{color:"var(--brand)",fontFamily:"JetBrains Mono,monospace",fontSize:11}}>{v}</a> },
  { key: "napConsistency", label: "NAP Consistency", render: v => <span style={{color: v==="true"||v===true?"var(--pass)":"var(--critical)"}}>{v==="true"||v===true?"✓ Consistent":"✗ Inconsistent"}</span> },
  { key: "localBusinessSchema", label: "LocalBusiness Schema", render: v => <span style={{color: v?"var(--pass)":"var(--warning)"}}>{v?"✓":"Missing"}</span> },
  { key: "gmbListed", label: "GMB Listed", render: v => <span style={{color: v==="true"||v===true?"var(--pass)":"var(--text-muted)"}}>{v==="true"||v===true?"✓ Listed":"Not Found"}</span> },
  { key: "localKeyword", label: "Local Keyword", render: v => <span style={{fontSize:12}}>{v||"—"}</span> },
];
export default function LocalSeo() {
  return <AuditPage title="Local SEO" section="local-seo" columns={COLS} />;
}
