import AuditPage from "../components/AuditPage.jsx";
const COLS = [
  { key: "url", label: "Page URL", render: v => <a href={v} target="_blank" rel="noreferrer" style={{color:"var(--brand)",fontFamily:"JetBrains Mono,monospace",fontSize:11}}>{v}</a> },
  { key: "src", label: "Image Src", render: v => <span style={{fontFamily:"monospace",fontSize:11,color:"var(--text-secondary)"}}>{v||"—"}</span> },
  { key: "altText", label: "Alt Text", render: v => v ? <span>{v}</span> : <span style={{color:"var(--critical)"}}>Missing</span> },
  { key: "altLength", label: "Alt Length", render: v => {
    const n = parseInt(v)||0;
    return <span style={{color: n===0 ? "var(--critical)" : n>125 ? "var(--warning)" : "var(--pass)"}}>{v||"—"}</span>;
  }},
  { key: "fileSize", label: "File Size", render: v => {
    const kb = parseInt(v)||0;
    return <span style={{color: kb>200 ? "var(--critical)" : kb>100 ? "var(--warning)" : "var(--text-primary)"}}>{v ? `${v} KB` : "—"}</span>;
  }},
  { key: "format", label: "Format", render: v => <span style={{fontFamily:"monospace",fontSize:12}}>{v||"—"}</span> },
];
export default function ImagesMedia() {
  return <AuditPage title="Images & Media" section="images-media" columns={COLS} />;
}
