import AuditPage from "../components/AuditPage.jsx";
const COLS = [
  { key: "url", label: "URL", render: v => <a href={v} target="_blank" rel="noreferrer" style={{color:"var(--brand)",fontFamily:"JetBrains Mono,monospace",fontSize:11}}>{v}</a> },
  { key: "externalBacklinks", label: "External Backlinks", render: v => <span style={{fontWeight:600}}>{v||0}</span> },
  { key: "referringDomains", label: "Referring Domains", render: v => <span style={{fontWeight:600}}>{v||0}</span> },
  { key: "domainAuthority", label: "Domain Authority", render: v => {
    const n = parseInt(v)||0;
    return <span style={{fontWeight:700,color: n>=70?"var(--pass)":n>=40?"var(--warning)":"var(--critical)"}}>{v||"—"}</span>;
  }},
  { key: "trustFlow", label: "Trust Flow", render: v => <span style={{fontFamily:"monospace"}}>{v||"—"}</span> },
];
export default function Backlinks() {
  return <AuditPage title="Backlinks & Authority" section="backlinks" columns={COLS} />;
}
