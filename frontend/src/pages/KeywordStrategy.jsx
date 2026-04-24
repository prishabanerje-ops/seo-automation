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
    key: "primary_keyword",
    label: "Primary Keyword",
    render: (v) => v
      ? <span className="text-sm text-gray-200">{v}</span>
      : <span className="text-gray-600 italic text-xs">—</span>
  },
  {
    key: "keyword_in_title",
    label: "Keyword in Title",
    render: (v) => {
      if (v === null || v === undefined) return <span className="text-gray-600">—</span>;
      return v
        ? <span className="text-green-400">Yes</span>
        : <span className="text-red-400">No</span>;
    }
  },
  {
    key: "keyword_in_h1",
    label: "Keyword in H1",
    render: (v) => {
      if (v === null || v === undefined) return <span className="text-gray-600">—</span>;
      return v
        ? <span className="text-green-400">Yes</span>
        : <span className="text-red-400">No</span>;
    }
  },
  {
    key: "keyword_density",
    label: "Keyword Density",
    render: (v) => {
      const n = parseFloat(v);
      const color = !n && n !== 0 ? "text-gray-400" : n >= 0.5 && n <= 3 ? "text-green-400" : "text-yellow-400";
      return <span className={`font-mono ${color}`}>{v != null ? `${v}%` : "—"}</span>;
    }
  }
];

export default function KeywordStrategy() {
  return <AuditPage title="Keyword Strategy" section="keyword-strategy" columns={COLUMNS} />;
}
