import AuditPage from "../components/AuditPage.jsx";
const COLS = [
  { key: "url", label: "URL", render: v => <a href={v} target="_blank" rel="noreferrer" style={{color:"var(--brand)",fontFamily:"JetBrains Mono,monospace",fontSize:11}}>{v}</a> },
  { key: "charset", label: "Charset", render: v => <span style={{fontFamily:"monospace",fontSize:12}}>{v||"—"}</span> },
  { key: "langAttr", label: "Lang Attr", render: v => v ? <span style={{color:"var(--pass)"}}>{v}</span> : <span style={{color:"var(--critical)"}}>Missing</span> },
  { key: "html5Doctype", label: "HTML5 Doctype", render: v => <span style={{color: v==="true"||v===true ? "var(--pass)" : "var(--warning)"}}>{v==="true"||v===true ? "✓" : "✗"}</span> },
  { key: "multipleBody", label: "Multiple Body", render: v => <span style={{color: v==="true"||v===true ? "var(--critical)" : "var(--text-muted)"}}>{v==="true"||v===true ? "Yes" : "No"}</span> },
];
export default function HtmlStructure() {
  return <AuditPage title="HTML Structure" section="html-structure" columns={COLS} />;
}
