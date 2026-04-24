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
    key: "word_count",
    label: "Word Count",
    render: (v) => {
      const n = parseInt(v);
      const color = !n ? "text-gray-400" : n < 300 ? "text-red-400" : "text-green-400";
      return <span className={`font-mono ${color}`}>{v ?? "—"}</span>;
    }
  },
  {
    key: "near_duplicate",
    label: "Near Duplicate",
    render: (v) => {
      if (v === null || v === undefined) return <span className="text-gray-600">—</span>;
      return v
        ? <span className="text-red-400 font-medium">Yes</span>
        : <span className="text-green-400">No</span>;
    }
  },
  {
    key: "thin_content",
    label: "Thin Content",
    render: (v) => {
      if (v === null || v === undefined) return <span className="text-gray-600">—</span>;
      return v
        ? <span className="text-red-400 font-medium">Yes</span>
        : <span className="text-green-400">No</span>;
    }
  },
  {
    key: "flesch_score",
    label: "Flesch Score",
    render: (v) => {
      const n = parseFloat(v);
      const color = !n && n !== 0 ? "text-gray-400" : n >= 60 ? "text-green-400" : n >= 30 ? "text-yellow-400" : "text-red-400";
      return <span className={`font-mono ${color}`}>{v ?? "—"}</span>;
    }
  }
];

export default function ContentQuality() {
  return <AuditPage title="Content Quality & Duplicates" section="content-quality" columns={COLUMNS} />;
}
