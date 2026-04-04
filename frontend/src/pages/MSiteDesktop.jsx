import AuditPage from "../components/AuditPage.jsx";
const COLS = [
  { key: "url", label: "URL", render: v => <a href={v} target="_blank" rel="noreferrer" style={{color:"var(--brand)",fontFamily:"JetBrains Mono,monospace",fontSize:11}}>{v}</a> },
  { key: "mobileUrl", label: "Mobile URL", render: v => v ? <span style={{fontFamily:"monospace",fontSize:11}}>{v}</span> : <span style={{color:"var(--text-muted)"}}>—</span> },
  { key: "viewport", label: "Viewport Meta", render: v => <span style={{color: v ? "var(--pass)" : "var(--critical)"}}>{v ? "✓ Present" : "✗ Missing"}</span> },
  { key: "contentParity", label: "Content Parity", render: v => <span style={{color: v==="true"||v===true ? "var(--pass)" : "var(--warning)"}}>{v==="true"||v===true ? "Match" : "Mismatch"}</span> },
  { key: "mobileRedirect", label: "Mobile Redirect", render: v => <span style={{fontSize:12}}>{v||"—"}</span> },
];
export default function MSiteDesktop() {
  return <AuditPage title="M-Site vs Desktop" section="m-site-desktop" columns={COLS} />;
}
