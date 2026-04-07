import { useState } from "react";

const inputStyle = {
  width: "100%", padding: "8px 12px", fontSize: 13,
  border: "1px solid var(--border)", borderRadius: 8,
  background: "var(--bg-page)", color: "var(--text-primary)",
  outline: "none", boxSizing: "border-box", fontFamily: "inherit"
};

const SCOPE_OPTIONS = [
  { value: "url",     label: "This URL only",              hint: "Suppresses this specific page" },
  { value: "pattern", label: "URLs matching a pattern",    hint: "e.g. /blog/* or /cars/*" },
  { value: "all",     label: "All URLs (site-wide)",       hint: "Suppresses this issue type everywhere" }
];

export default function IntentionalRuleModal({ row, onSave, onClose }) {
  const [issueType, setIssueType] = useState(row?.issue_type || "");
  const [scope, setScope] = useState(row ? "url" : "all");
  const [pattern, setPattern] = useState(row?.url || "");
  const [reason, setReason] = useState("");

  function handleSave() {
    if (!issueType.trim()) return;
    onSave({
      issue_type: issueType.trim(),
      scope,
      pattern: scope === "url" || scope === "pattern" ? pattern.trim() : "",
      reason: reason.trim()
    });
  }

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)",
        zIndex: 400, backdropFilter: "blur(2px)"
      }} />

      {/* Modal */}
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 401, width: 460, maxWidth: "calc(100vw - 32px)",
        background: "var(--bg-raised)", border: "1px solid var(--border)",
        borderRadius: 14, boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{
          padding: "18px 20px", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between"
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Mark as Intentional</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              This issue will be suppressed from active error counts.
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 18, color: "var(--text-muted)", lineHeight: 1, padding: 4
          }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Issue Type */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.4px" }}>
              Issue Type
            </label>
            <input
              type="text"
              value={issueType}
              onChange={e => setIssueType(e.target.value)}
              placeholder="e.g. Title Tag Too Long"
              readOnly={!!row?.issue_type}
              style={{ ...inputStyle, background: row?.issue_type ? "var(--bg-surface)" : "var(--bg-page)", color: row?.issue_type ? "var(--text-secondary)" : "var(--text-primary)" }}
            />
          </div>

          {/* Scope */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.4px" }}>
              Apply rule to
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {SCOPE_OPTIONS.map(opt => (
                <label key={opt.value} style={{
                  display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer",
                  padding: "10px 12px", borderRadius: 8,
                  border: `1px solid ${scope === opt.value ? "var(--brand)" : "var(--border)"}`,
                  background: scope === opt.value ? "var(--brand-subtle)" : "transparent",
                  transition: "all 0.15s"
                }}>
                  <input
                    type="radio"
                    name="scope"
                    value={opt.value}
                    checked={scope === opt.value}
                    onChange={() => {
                      setScope(opt.value);
                      if (opt.value === "url") setPattern(row?.url || "");
                      else if (opt.value === "pattern") setPattern("");
                    }}
                    style={{ marginTop: 2, flexShrink: 0 }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{opt.hint}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Pattern / URL */}
          {(scope === "url" || scope === "pattern") && (
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                {scope === "url" ? "URL" : "Pattern"}
              </label>
              <input
                type="text"
                value={pattern}
                onChange={e => setPattern(e.target.value)}
                placeholder={scope === "url" ? "https://example.com/page" : "/blog/* or /cars/*/"}
                readOnly={scope === "url" && !!row?.url}
                style={{ ...inputStyle, background: scope === "url" && row?.url ? "var(--bg-surface)" : "var(--bg-page)" }}
              />
              {scope === "pattern" && (
                <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                  Use <code style={{ fontFamily: "monospace" }}>*</code> as wildcard. Matched against full URL.
                </p>
              )}
            </div>
          )}

          {/* Reason */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.4px" }}>
              Reason <span style={{ fontWeight: 400, textTransform: "none" }}>(optional)</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Full model name required for brand search — approved by head of SEO"
              rows={2}
              style={{ ...inputStyle, resize: "vertical", minHeight: 60, lineHeight: 1.5 }}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: "14px 20px", borderTop: "1px solid var(--border)",
          display: "flex", gap: 10, justifyContent: "flex-end",
          background: "var(--bg-surface)"
        }}>
          <button onClick={onClose} className="btn btn-surface" style={{ fontSize: 13 }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!issueType.trim() || ((scope === "url" || scope === "pattern") && !pattern.trim())}
            className="btn btn-primary"
            style={{ fontSize: 13, opacity: (!issueType.trim() || ((scope === "url" || scope === "pattern") && !pattern.trim())) ? 0.5 : 1 }}
          >
            Confirm Rule
          </button>
        </div>
      </div>
    </>
  );
}
