import { useState } from "react";
import SiteSelector from "../components/SiteSelector.jsx";
import { runPageSpeed, getReport } from "../api/index.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(s) {
  if (s === null || s === undefined) return "var(--text-muted)";
  if (s >= 90) return "var(--pass)";
  if (s >= 50) return "var(--warning)";
  return "var(--critical)";
}

function ScoreBadge({ score }) {
  if (score === null || score === undefined) return <span style={{ color: "var(--text-muted)" }}>—</span>;
  return (
    <span style={{
      display: "inline-block", width: 40, height: 40, borderRadius: "50%",
      background: `${scoreColor(score)}18`, border: `2px solid ${scoreColor(score)}`,
      textAlign: "center", lineHeight: "36px",
      fontSize: 13, fontWeight: 700, color: scoreColor(score),
      fontFamily: "'JetBrains Mono', monospace"
    }}>
      {score}
    </span>
  );
}

function MetricPill({ label, value }) {
  return (
    <div style={{
      padding: "6px 10px", borderRadius: 8, background: "var(--bg-surface)",
      border: "1px solid var(--border)", textAlign: "center", minWidth: 72
    }}>
      <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", fontFamily: "'JetBrains Mono', monospace" }}>
        {value || "—"}
      </div>
    </div>
  );
}

// ─── URL Input ────────────────────────────────────────────────────────────────

const inputStyle = {
  padding: "8px 12px", fontSize: 13, border: "1px solid var(--border)", borderRadius: 8,
  background: "var(--bg-page)", color: "var(--text-primary)", outline: "none",
  fontFamily: "inherit", boxSizing: "border-box"
};

function URLInputList({ urls, onChange }) {
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState("");

  function addRow() {
    if (urls.length >= 10) return;
    onChange([...urls, ""]);
  }

  function removeRow(i) {
    onChange(urls.filter((_, j) => j !== i));
  }

  function updateRow(i, val) {
    const next = [...urls];
    next[i] = val;
    onChange(next);
  }

  function applyBulk() {
    const parsed = bulkText.split("\n").map(l => l.trim()).filter(l => l.length > 0).slice(0, 10);
    onChange(parsed);
    setBulkMode(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {urls.length} / 10 URLs
        </span>
        <button
          type="button"
          onClick={() => setBulkMode(v => !v)}
          style={{
            fontSize: 11, padding: "3px 10px", borderRadius: 6, cursor: "pointer",
            border: `1px solid ${bulkMode ? "var(--brand)" : "var(--border)"}`,
            background: bulkMode ? "var(--brand-light)" : "transparent",
            color: bulkMode ? "var(--brand)" : "var(--text-muted)"
          }}>
          {bulkMode ? "↩ Back to list" : "Bulk paste"}
        </button>
      </div>

      {bulkMode ? (
        <div>
          <textarea
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
            placeholder={"https://example.com/page-1\nhttps://example.com/page-2\nhttps://example.com/page-3"}
            rows={6}
            style={{ ...inputStyle, width: "100%", resize: "vertical", lineHeight: 1.6 }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={applyBulk} disabled={!bulkText.trim()} className="btn btn-primary"
              style={{ fontSize: 12, opacity: !bulkText.trim() ? 0.5 : 1 }}>
              Parse URLs
            </button>
            <span style={{ fontSize: 11, color: "var(--text-muted)", alignSelf: "center" }}>One URL per line, max 10</span>
          </div>
        </div>
      ) : (
        <>
          {urls.map((url, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="url"
                value={url}
                onChange={e => updateRow(i, e.target.value)}
                placeholder="https://example.com/page"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={() => removeRow(i)}
                style={{ background: "none", border: "1px solid var(--border)", borderRadius: 7, cursor: "pointer", padding: "6px 10px", fontSize: 13, color: "var(--text-muted)" }}
                title="Remove URL"
              >
                ✕
              </button>
            </div>
          ))}
          {urls.length < 10 && (
            <button onClick={addRow} style={{
              alignSelf: "flex-start", padding: "5px 14px", fontSize: 12,
              background: "transparent", border: "1px dashed var(--border)",
              borderRadius: 7, cursor: "pointer", color: "var(--text-muted)"
            }}>
              + Add URL
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── Result Accordion ─────────────────────────────────────────────────────────

function UrlResult({ result, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen || false);
  const mobScore = result.mobile?.score ?? null;
  const deskScore = result.desktop?.score ?? null;
  const shortUrl = (() => { try { const u = new URL(result.url); return u.hostname + u.pathname; } catch { return result.url; } })();

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: "100%", padding: "14px 16px", display: "flex", alignItems: "center",
          gap: 14, background: "var(--bg-surface)", border: "none", cursor: "pointer",
          textAlign: "left"
        }}
      >
        <span style={{ fontSize: 10, color: "var(--text-muted)", transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s", display: "inline-block" }}>▶</span>

        <span style={{ flex: 1, fontSize: 13, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {shortUrl}
        </span>

        {result.error ? (
          <span style={{ fontSize: 11, color: "var(--critical)", background: "var(--critical-bg)", padding: "2px 8px", borderRadius: 20 }}>Error</span>
        ) : (
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "var(--text-muted)", marginBottom: 2 }}>Mobile</div>
              <span style={{ fontSize: 14, fontWeight: 700, color: scoreColor(mobScore), fontFamily: "'JetBrains Mono', monospace" }}>
                {mobScore ?? "—"}
              </span>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 9, color: "var(--text-muted)", marginBottom: 2 }}>Desktop</div>
              <span style={{ fontSize: 14, fontWeight: 700, color: scoreColor(deskScore), fontFamily: "'JetBrains Mono', monospace" }}>
                {deskScore ?? "—"}
              </span>
            </div>
          </div>
        )}
      </button>

      {open && (
        <div style={{ padding: "16px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 14 }}>
          {result.error ? (
            <div style={{ color: "var(--critical)", fontSize: 13 }}>{result.error}</div>
          ) : (
            <>
              {/* Score circles */}
              <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <ScoreBadge score={result.mobile?.score} />
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Mobile</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <ScoreBadge score={result.desktop?.score} />
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Desktop</span>
                </div>
                <div style={{ flex: 1 }}>
                  <a href={result.url} target="_blank" rel="noreferrer"
                    style={{ fontSize: 12, color: "var(--brand)", wordBreak: "break-all" }}>
                    {result.url}
                  </a>
                </div>
              </div>

              {/* CWV metrics */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                  Core Web Vitals (mobile)
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <MetricPill label="LCP" value={result.mobile?.lcp} />
                  <MetricPill label="CLS" value={result.mobile?.cls} />
                  <MetricPill label="FCP" value={result.mobile?.fcp} />
                  <MetricPill label="INP" value={result.mobile?.inp} />
                  <MetricPill label="TTFB" value={result.mobile?.ttfb} />
                </div>
              </div>

              {/* Issues */}
              {result.issues && result.issues.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                    Issues detected
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {result.issues.map((issue, i) => (
                      <span key={i} style={{
                        padding: "3px 10px", borderRadius: 20, fontSize: 12,
                        background: "var(--warning-bg)", color: "var(--warning)", border: "1px solid #FDE68A"
                      }}>
                        {issue}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {(!result.issues || result.issues.length === 0) && (
                <span style={{ fontSize: 12, color: "var(--pass)" }}>✓ No issues detected</span>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PageSpeed() {
  const [mode, setMode] = useState("manual"); // "manual" | "crawl"
  const [site, setSite] = useState("");
  const [manualUrls, setManualUrls] = useState([""]);
  const [sampleSize, setSampleSize] = useState(10);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [status, setStatus] = useState(null);
  const [results, setResults] = useState([]);

  async function handleRun() {
    let urlsToRun = [];

    if (mode === "manual") {
      urlsToRun = manualUrls.map(u => u.trim()).filter(u => u.length > 0);
      if (!urlsToRun.length) { setStatus("Add at least one URL."); return; }
    } else {
      setStatus("Fetching crawled URLs…");
      try {
        const reportRes = await getReport(site, "response-codes");
        urlsToRun = (reportRes.data.data ?? [])
          .filter(r => r.status >= 200 && r.status < 300)
          .map(r => r.url)
          .slice(0, sampleSize);
        if (!urlsToRun.length) { setStatus("No crawled URLs found. Run a crawl first."); return; }
      } catch (err) {
        setStatus("Error: " + err.message);
        return;
      }
    }

    setLoading(true);
    setResults([]);
    setProgress({ done: 0, total: urlsToRun.length });
    setStatus(null);

    // Run all URLs in parallel, tracking progress
    const accumulated = [];
    const promises = urlsToRun.map(url =>
      runPageSpeed(site || "manual", [url])
        .then(r => {
          const row = r.data?.data?.[0] || { url, error: "No data returned" };
          accumulated.push(row);
          setProgress(p => ({ ...p, done: p.done + 1 }));
          setResults([...accumulated]);
          return row;
        })
        .catch(err => {
          const row = { url, error: err.response?.data?.error || err.message };
          accumulated.push(row);
          setProgress(p => ({ ...p, done: p.done + 1 }));
          setResults([...accumulated]);
          return row;
        })
    );

    await Promise.allSettled(promises);
    setStatus(`Done — ${urlsToRun.length} URL${urlsToRun.length !== 1 ? "s" : ""} analysed`);
    setLoading(false);
  }

  function exportCsv() {
    if (!results.length) return;
    const rows = results.map(r => ({
      url: r.url,
      mobile_score: r.mobile?.score ?? "",
      desktop_score: r.desktop?.score ?? "",
      lcp: r.mobile?.lcp ?? "",
      cls: r.mobile?.cls ?? "",
      fcp: r.mobile?.fcp ?? "",
      inp: r.mobile?.inp ?? "",
      ttfb: r.mobile?.ttfb ?? "",
      issues: (r.issues || []).join("; "),
      error: r.error ?? ""
    }));
    const keys = Object.keys(rows[0]);
    const csv = [keys.join(","), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? "")).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `pagespeed-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  const canRun = !loading && (mode === "crawl" || manualUrls.some(u => u.trim().length > 0));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 860 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 className="page-title">Page Speed / Core Web Vitals</h1>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
            Calls PageSpeed Insights API for your URLs. Add a PSI_API_KEY in Settings for higher rate limits.
          </p>
        </div>
        <SiteSelector selected={site} onChange={setSite} />
      </div>

      {/* Input panel */}
      <div className="card" style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Mode toggle */}
        <div style={{ display: "flex", gap: 0, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)", alignSelf: "flex-start" }}>
          {[
            { id: "manual", label: "Enter URLs" },
            { id: "crawl",  label: "From last crawl" }
          ].map(m => (
            <button key={m.id} onClick={() => setMode(m.id)} style={{
              padding: "7px 16px", fontSize: 12, fontWeight: 500, cursor: "pointer",
              border: "none", background: mode === m.id ? "var(--brand)" : "transparent",
              color: mode === m.id ? "#fff" : "var(--text-secondary)",
              transition: "all 0.15s"
            }}>
              {m.label}
            </button>
          ))}
        </div>

        {/* Manual URL input */}
        {mode === "manual" && (
          <URLInputList urls={manualUrls} onChange={setManualUrls} />
        )}

        {/* Crawl sample */}
        {mode === "crawl" && (
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Sample size (1–50)</label>
              <input
                type="number" min={1} max={50} value={sampleSize}
                onChange={e => setSampleSize(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                style={{ ...inputStyle, width: 80 }}
              />
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 340, paddingTop: 16 }}>
              Picks the top N crawled URLs (2xx responses) from the selected site's last crawl.
            </div>
          </div>
        )}

        {/* Run button + status */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <button
            onClick={handleRun}
            disabled={!canRun}
            className="btn btn-primary"
            style={{ opacity: !canRun ? 0.5 : 1 }}
          >
            {loading ? "Running…" : "Run Analysis"}
          </button>
          {status && !loading && (
            <span style={{ fontSize: 13, color: status.startsWith("Error") || status.includes("No") ? "var(--critical)" : "var(--pass)" }}>
              {status}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {loading && progress.total > 0 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-muted)", marginBottom: 5 }}>
              <span>Analysing URLs…</span>
              <span>{progress.done} / {progress.total} completed</span>
            </div>
            <div style={{ height: 6, background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
                background: "var(--brand)", borderRadius: 3,
                transition: "width 0.4s ease"
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
              Results — {results.length} URL{results.length !== 1 ? "s" : ""}
              {loading && <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 400, marginLeft: 8 }}>(updating…)</span>}
            </div>
            <button onClick={exportCsv} className="btn btn-surface" style={{ fontSize: 12 }}>
              ↓ Export All CSV
            </button>
          </div>

          {/* Summary row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
            {[
              { label: "Avg Mobile", val: Math.round(results.filter(r => r.mobile?.score != null).reduce((s, r) => s + r.mobile.score, 0) / (results.filter(r => r.mobile?.score != null).length || 1)) },
              { label: "Avg Desktop", val: Math.round(results.filter(r => r.desktop?.score != null).reduce((s, r) => s + r.desktop.score, 0) / (results.filter(r => r.desktop?.score != null).length || 1)) },
              { label: "With Issues", val: results.filter(r => r.issues?.length > 0).length },
              { label: "Errors", val: results.filter(r => r.error).length }
            ].map(({ label, val }) => (
              <div key={label} style={{ padding: "12px 14px", background: "var(--bg-surface)", borderRadius: 10, border: "1px solid var(--border)", textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", fontFamily: "'JetBrains Mono', monospace" }}>{isNaN(val) ? "—" : val}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Per-URL accordion */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {results.map((result, i) => (
              <UrlResult key={result.url || i} result={result} defaultOpen={i === 0 && results.length === 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
