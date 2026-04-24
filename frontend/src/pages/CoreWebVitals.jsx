import AuditPage from "../components/AuditPage.jsx";

function cwvColor(val, good, poor) {
  const n = parseFloat(val);
  if (isNaN(n)) return "var(--text-muted)";
  if (n <= good) return "var(--pass)";
  if (n >= poor) return "var(--critical)";
  return "var(--warning)";
}

const COLS = [
  { key: "url", label: "URL", render: v => <a href={v} target="_blank" rel="noreferrer" style={{color:"var(--brand)",fontFamily:"JetBrains Mono,monospace",fontSize:11}}>{v}</a> },
  { key: "lcp",  label: "LCP",   render: v => <span style={{fontFamily:"monospace",fontWeight:600,color:cwvColor(v,2.5,4)}}>{v ? `${v}s` : "—"}</span> },
  { key: "cls",  label: "CLS",   render: v => <span style={{fontFamily:"monospace",fontWeight:600,color:cwvColor(v,0.1,0.25)}}>{v||"—"}</span> },
  { key: "inp",  label: "INP",   render: v => <span style={{fontFamily:"monospace",fontWeight:600,color:cwvColor(v,200,500)}}>{v ? `${v}ms` : "—"}</span> },
  { key: "fcp",  label: "FCP",   render: v => <span style={{fontFamily:"monospace",fontWeight:600,color:cwvColor(v,1.8,3)}}>{v ? `${v}s` : "—"}</span> },
  { key: "ttfb", label: "TTFB",  render: v => <span style={{fontFamily:"monospace",fontWeight:600,color:cwvColor(v,0.8,1.8)}}>{v ? `${v}s` : "—"}</span> },
  { key: "score",label: "Score", render: v => {
    const n = parseInt(v)||0;
    return <span style={{fontFamily:"monospace",fontWeight:700,color: n>=90?"var(--pass)":n>=50?"var(--warning)":"var(--critical)"}}>{v||"—"}</span>;
  }},
];
export default function CoreWebVitals() {
  return <AuditPage title="Core Web Vitals & Page Speed" section="core-web-vitals" columns={COLS} />;
}
