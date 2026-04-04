import { useState, useEffect } from "react";
import api from "../api/index.js";

export default function GA4Overlay() {
  const [status, setStatus] = useState("checking");

  useEffect(() => {
    api.get("/ga4/status").catch(() => setStatus("not_connected"));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="page-title">GA4 Overlay</h1>
        <p className="page-desc">Session, engagement, and revenue data per page from Google Analytics 4.</p>
      </div>
      <div className="card" style={{ maxWidth: 560 }}>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:"40px 24px", gap:16, textAlign:"center" }}>
          <div style={{ width:56, height:56, borderRadius:12, background:"var(--brand-light)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/>
            </svg>
          </div>
          <div>
            <div style={{ fontFamily:"Plus Jakarta Sans,sans-serif", fontWeight:700, fontSize:17, marginBottom:6 }}>Connect Google Analytics 4</div>
            <div style={{ color:"var(--text-secondary)", fontSize:13.5, lineHeight:1.6, maxWidth:380 }}>
              Connect GA4 to overlay sessions, engagement rate, bounce rate, and revenue data per page alongside your audit results.
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8, width:"100%", maxWidth:320 }}>
            <a href="/api/ga4/auth" className="btn btn-primary" style={{ justifyContent:"center" }}>Connect Google Analytics 4</a>
            <a href="/settings" className="btn btn-surface" style={{ justifyContent:"center" }}>Configure in Settings</a>
          </div>
          <div style={{ fontSize:12, color:"var(--text-muted)", maxWidth:380 }}>
            Requires Google OAuth. Same GCP project as GSC. Scope: <code style={{ fontFamily:"JetBrains Mono,monospace", background:"var(--bg-surface)", padding:"1px 5px", borderRadius:4 }}>analytics.readonly</code>
          </div>
        </div>
      </div>
    </div>
  );
}
