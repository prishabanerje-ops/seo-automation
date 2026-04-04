import AuditPage from "../components/AuditPage.jsx";
const COLS = [
  { key: "url", label: "URL", render: v => <a href={v} target="_blank" rel="noreferrer" style={{color:"var(--brand)",fontFamily:"JetBrains Mono,monospace",fontSize:11}}>{v}</a> },
  { key: "hreflangCount", label: "Hreflang Tags", render: v => <span style={{fontWeight:600}}>{v||0}</span> },
  { key: "languages", label: "Languages", render: v => <span style={{fontFamily:"monospace",fontSize:12}}>{v||"—"}</span> },
  { key: "returnLinks", label: "Return Links", render: v => <span style={{color: v==="true"||v===true?"var(--pass)":"var(--critical)"}}>{v==="true"||v===true?"✓ Present":"✗ Missing"}</span> },
  { key: "errors", label: "Errors", render: v => {
    const n = parseInt(v)||0;
    return <span style={{color: n>0?"var(--critical)":"var(--pass)"}}>{n>0?`${n} error(s)`:"None"}</span>;
  }},
];
export default function Hreflang() {
  return <AuditPage title="Hreflang" section="hreflang" columns={COLS} />;
}
