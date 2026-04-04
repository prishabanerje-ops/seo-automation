import AuditPage from "../components/AuditPage.jsx";
const COLS = [
  { key: "url", label: "URL", render: v => <a href={v} target="_blank" rel="noreferrer" style={{color:"var(--brand)",fontFamily:"JetBrains Mono,monospace",fontSize:11}}>{v}</a> },
  { key: "botCrawls", label: "Bot Crawls", render: v => <span style={{fontWeight:600}}>{v||0}</span> },
  { key: "userCrawls", label: "User Sessions", render: v => <span style={{fontWeight:600}}>{v||0}</span> },
  { key: "responseCode", label: "Resp. Code", render: v => {
    const code = parseInt(v);
    const color = code>=500?"var(--critical)":code>=400?"var(--warning)":code>=300?"var(--info)":"var(--pass)";
    return <span style={{fontFamily:"monospace",fontWeight:700,color}}>{v||"—"}</span>;
  }},
  { key: "crawlFrequency", label: "Crawl Frequency", render: v => <span style={{fontSize:12}}>{v||"—"}</span> },
];
export default function LogFileAnalysis() {
  return <AuditPage title="Log File & Crawl Analysis" section="log-file-analysis" columns={COLS} />;
}
