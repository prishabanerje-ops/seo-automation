import { useState, useEffect, useRef } from "react";
import api from "../api/index.js";

// ─── Simple markdown renderer ─────────────────────────────────────────────────

function renderInline(text) {
  const parts = [];
  const rx = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let last = 0, key = 0, m;
  while ((m = rx.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const s = m[0];
    if (s.startsWith("**")) parts.push(<strong key={key++}>{s.slice(2, -2)}</strong>);
    else if (s.startsWith("`")) parts.push(<code key={key++} style={{ background: "var(--bg-surface)", padding: "1px 5px", borderRadius: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{s.slice(1, -1)}</code>);
    else if (s.startsWith("*")) parts.push(<em key={key++}>{s.slice(1, -1)}</em>);
    last = m.index + m.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function SimpleMarkdown({ text }) {
  if (!text) return null;
  const lines = text.split("\n");
  const out = [];
  let i = 0, k = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("## ")) {
      out.push(<h3 key={k++} style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", margin: "14px 0 5px" }}>{renderInline(line.slice(3))}</h3>);
      i++;
    } else if (line.startsWith("### ")) {
      out.push(<h4 key={k++} style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", margin: "10px 0 3px" }}>{renderInline(line.slice(4))}</h4>);
      i++;
    } else if (/^[-*] /.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        items.push(<li key={i} style={{ marginBottom: 3 }}>{renderInline(lines[i].slice(2))}</li>);
        i++;
      }
      out.push(<ul key={k++} style={{ paddingLeft: 18, margin: "6px 0", lineHeight: 1.7 }}>{items}</ul>);
    } else if (/^\d+\. /.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(<li key={i} style={{ marginBottom: 3 }}>{renderInline(lines[i].replace(/^\d+\. /, ""))}</li>);
        i++;
      }
      out.push(<ol key={k++} style={{ paddingLeft: 18, margin: "6px 0", lineHeight: 1.7 }}>{items}</ol>);
    } else if (line.trim() === "") {
      i++;
    } else {
      out.push(<p key={k++} style={{ margin: "4px 0", lineHeight: 1.65 }}>{renderInline(line)}</p>);
      i++;
    }
  }
  return <div style={{ fontSize: 13, color: "var(--text-primary)" }}>{out}</div>;
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {[100, 80, 90, 60, 85].map((w, i) => (
        <div key={i} style={{
          height: 12, borderRadius: 6, width: `${w}%`,
          background: "var(--border)", animation: "pulse 1.4s ease-in-out infinite",
          animationDelay: `${i * 0.1}s`
        }} />
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}

// ─── Claude Drawer ────────────────────────────────────────────────────────────

const SEV_COLOR = {
  critical: "#EF4444",
  warning: "#F59E0B",
  info: "#3B82F6",
  ok: "#10B981"
};

export default function ClaudeDrawer({ task, siteId, onClose }) {
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);
  const [suggestionId, setSuggestionId] = useState(null);

  // Linear form state
  const [showLinear, setShowLinear] = useState(false);
  const [linearTitle, setLinearTitle] = useState("");
  const [linearDesc, setLinearDesc] = useState("");
  const [linearLoading, setLinearLoading] = useState(false);
  const [linearResult, setLinearResult] = useState(null);

  // Slack state
  const [slackLoading, setSlackLoading] = useState(false);
  const [slackResult, setSlackResult] = useState(null);

  const abortRef = useRef(null);
  const bodyRef = useRef(null);

  // Auto-scroll as text streams in
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [streamText]);

  // Start stream when drawer opens with a task
  useEffect(() => {
    if (task) {
      setStreamText("");
      setDone(false);
      setError(null);
      setLinearResult(null);
      setSlackResult(null);
      setShowLinear(false);
      startStream(task, siteId);
    }
    return () => abortRef.current?.abort();
  }, [task]);

  async function startStream(row, sid) {
    setStreaming(true);
    setStreamText("");
    setDone(false);
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/ai/task-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ row, siteId: sid }),
        credentials: "include",
        signal: controller.signal
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done: readerDone } = await reader.read();
        if (readerDone) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.text) setStreamText(prev => prev + data.text);
            if (data.done) { setDone(true); setSuggestionId(data.id || null); }
            if (data.error) { setError(data.error); setDone(true); }
          } catch {}
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") setError(err.message);
    } finally {
      setStreaming(false);
    }
  }

  function handleRegenerate() {
    if (!task) return;
    setLinearResult(null);
    setSlackResult(null);
    setShowLinear(false);
    startStream(task, siteId);
  }

  function openLinearForm() {
    // Pre-fill title from first non-empty line of response, desc from full text
    const firstLine = streamText.split("\n").find(l => l.trim()) || task?.issue_type || "SEO Issue";
    const cleanTitle = `[SEO] ${task?.issue_type || "Issue"} — ${task?.url ? new URL(task.url).pathname : ""}`.slice(0, 120);
    setLinearTitle(cleanTitle);
    setLinearDesc(streamText);
    setShowLinear(true);
  }

  async function submitLinear() {
    setLinearLoading(true);
    setLinearResult(null);
    try {
      const r = await api.post("/linear/ticket", {
        projectId: siteId,
        auditResultId: task?.id,
        title: linearTitle,
        description: linearDesc,
        priority: task?.severity === "critical" ? 1 : task?.severity === "warning" ? 2 : 3
      });
      setLinearResult({ ok: true, issue: r.data.issue });
      if (r.data.issue?.url) window.open(r.data.issue.url, "_blank", "noopener");
    } catch (err) {
      setLinearResult({ ok: false, error: err.response?.data?.error || err.message });
    } finally {
      setLinearLoading(false);
    }
  }

  async function postToSlack() {
    setSlackLoading(true);
    setSlackResult(null);
    try {
      await api.post("/notify/slack/task", {
        issueType: task?.issue_type,
        url: task?.url,
        severity: task?.severity,
        suggestion: streamText
      });
      setSlackResult({ ok: true });
    } catch (err) {
      setSlackResult({ ok: false, error: err.response?.data?.error || err.message });
    } finally {
      setSlackLoading(false);
    }
  }

  const sevColor = SEV_COLOR[task?.severity] || "#9CA3AF";

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)",
        zIndex: 198, backdropFilter: "blur(1px)"
      }} />

      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, width: 500,
        maxWidth: "95vw", background: "var(--bg-raised)",
        borderLeft: "1px solid var(--border)",
        boxShadow: "-8px 0 40px rgba(0,0,0,0.12)",
        zIndex: 199, display: "flex", flexDirection: "column",
        animation: "slideInRight 0.2s ease-out"
      }}>
        <style>{`@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>

        {/* ── Header ── */}
        <div style={{
          padding: "16px 20px", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "flex-start", gap: 12, flexShrink: 0
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: "var(--brand-light)", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 16
          }}>✦</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Ask Claude</div>
            {task && (
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ color: sevColor, fontWeight: 600, textTransform: "capitalize" }}>{task.severity}</span>
                <span>·</span>
                <span style={{ fontWeight: 500, color: "var(--text-secondary)" }}>{task.issue_type}</span>
                {task.url && (
                  <>
                    <span>·</span>
                    <a href={task.url} target="_blank" rel="noreferrer"
                      style={{ color: "var(--brand)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
                      {task.url}
                    </a>
                  </>
                )}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 18, color: "var(--text-muted)", lineHeight: 1, padding: 4, flexShrink: 0
          }}>✕</button>
        </div>

        {/* ── Body (scrollable) ── */}
        <div ref={bodyRef} style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          {error ? (
            <div style={{
              padding: "12px 14px", background: "var(--critical-bg)", color: "var(--critical-text)",
              borderRadius: 8, fontSize: 13, border: "1px solid #FECACA"
            }}>
              {error}
            </div>
          ) : streaming && !streamText ? (
            <Skeleton />
          ) : (
            <SimpleMarkdown text={streamText} />
          )}
        </div>

        {/* ── Footer ── */}
        <div style={{
          borderTop: "1px solid var(--border)", padding: "14px 20px",
          display: "flex", flexDirection: "column", gap: 12, flexShrink: 0,
          background: "var(--bg-surface)"
        }}>
          {/* Regenerate row */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={handleRegenerate}
              disabled={streaming}
              className="btn btn-surface"
              style={{ fontSize: 12, opacity: streaming ? 0.5 : 1 }}
            >
              {streaming ? "Generating…" : "↺ Regenerate"}
            </button>
            {done && !showLinear && (
              <button onClick={openLinearForm} className="btn btn-secondary" style={{ fontSize: 12 }}>
                ＋ Create Linear Issue
              </button>
            )}
            {done && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={postToSlack}
                  disabled={slackLoading}
                  className="btn btn-surface"
                  style={{ fontSize: 12, opacity: slackLoading ? 0.5 : 1 }}
                >
                  {slackLoading ? "Posting…" : "⬆ Share via Slack"}
                </button>
                {slackResult && (
                  <span style={{ fontSize: 11, fontWeight: 500, color: slackResult.ok ? "var(--pass)" : "var(--critical)" }}>
                    {slackResult.ok ? "✓ Posted" : `✗ ${slackResult.error}`}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Linear form */}
          {showLinear && (
            <div style={{
              background: "var(--bg-page)", border: "1px solid var(--border)",
              borderRadius: 10, padding: "14px", display: "flex", flexDirection: "column", gap: 10
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 2 }}>
                Create Linear Issue
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 3 }}>Title</label>
                <input
                  type="text"
                  value={linearTitle}
                  onChange={e => setLinearTitle(e.target.value)}
                  style={{
                    width: "100%", padding: "7px 10px", fontSize: 12,
                    border: "1px solid var(--border)", borderRadius: 7,
                    background: "var(--bg-page)", color: "var(--text-primary)",
                    outline: "none", boxSizing: "border-box", fontFamily: "inherit"
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginBottom: 3 }}>Description</label>
                <textarea
                  value={linearDesc}
                  onChange={e => setLinearDesc(e.target.value)}
                  rows={6}
                  style={{
                    width: "100%", padding: "7px 10px", fontSize: 12,
                    border: "1px solid var(--border)", borderRadius: 7,
                    background: "var(--bg-page)", color: "var(--text-primary)",
                    outline: "none", boxSizing: "border-box", fontFamily: "inherit",
                    resize: "vertical", lineHeight: 1.5
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  onClick={submitLinear}
                  disabled={linearLoading || !linearTitle.trim()}
                  className="btn btn-primary"
                  style={{ fontSize: 12, opacity: (linearLoading || !linearTitle.trim()) ? 0.5 : 1 }}
                >
                  {linearLoading ? "Creating…" : "Create Issue"}
                </button>
                <button onClick={() => setShowLinear(false)} className="btn btn-surface" style={{ fontSize: 12 }}>
                  Cancel
                </button>
                {linearResult && (
                  <span style={{ fontSize: 11, fontWeight: 500, color: linearResult.ok ? "var(--pass)" : "var(--critical)" }}>
                    {linearResult.ok
                      ? `✓ ${linearResult.issue?.identifier || "Created"}`
                      : `✗ ${linearResult.error}`}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
