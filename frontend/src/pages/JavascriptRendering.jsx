import React from "react";
import AuditPage from "../components/AuditPage.jsx";

const COLUMNS = [
  {
    key: "url",
    label: "URL",
    render: (v) => (
      <a href={v} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline truncate block max-w-sm">
        {v}
      </a>
    )
  },
  {
    key: "js_rendered",
    label: "JS Rendered",
    render: (v) => {
      if (v === null || v === undefined) return <span className="text-gray-600">—</span>;
      return v
        ? <span className="text-green-400">Yes</span>
        : <span className="text-yellow-400">No</span>;
    }
  },
  {
    key: "render_blocking_resources",
    label: "Render Blocking Resources",
    render: (v) => {
      const n = parseInt(v);
      const color = n > 3 ? "text-red-400" : n > 0 ? "text-yellow-400" : "text-green-400";
      return <span className={`font-mono ${color}`}>{v ?? "—"}</span>;
    }
  },
  {
    key: "rendered_word_count",
    label: "Rendered Word Count",
    render: (v) => <span className="font-mono text-gray-300">{v ?? "—"}</span>
  },
  {
    key: "raw_word_count",
    label: "Raw Word Count",
    render: (v) => <span className="font-mono text-gray-300">{v ?? "—"}</span>
  }
];

export default function JavascriptRendering() {
  return <AuditPage title="JavaScript & Rendering" section="js-rendering" columns={COLUMNS} />;
}
