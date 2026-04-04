import AuditPage from "../components/AuditPage.jsx";
const COLS = [
  { key: "url", label: "URL", render: v => <a href={v} target="_blank" rel="noreferrer" style={{color:"var(--brand)",fontFamily:"JetBrains Mono,monospace",fontSize:11}}>{v}</a> },
  { key: "inlinks", label: "Inlinks", render: v => {
    const n = parseInt(v)||0;
    return <span style={{fontWeight:700,color: n===0?"var(--critical)":n>100?"var(--warning)":"var(--text-primary)"}}>{n}</span>;
  }},
  { key: "outlinks", label: "Outlinks", render: v => <span>{v||0}</span> },
  { key: "isOrphan", label: "Orphan Page", render: v => {
    const yes = v==="true"||v===true||v==="1"||v===1;
    return <span style={{color: yes?"var(--critical)":"var(--text-muted)"}}>{yes ? "✗ Orphan" : "✓ Linked"}</span>;
  }},
  { key: "crawlDepth", label: "Crawl Depth", render: v => <span style={{fontFamily:"monospace"}}>{v||"—"}</span> },
];
export default function InternalLinking() {
  return <AuditPage title="Internal Linking & Architecture" section="internal-linking" columns={COLS} />;
}
