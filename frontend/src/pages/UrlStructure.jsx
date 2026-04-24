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
    key: "url_length",
    label: "URL Length",
    render: (v) => {
      const n = parseInt(v);
      const color = n > 115 ? "text-yellow-400" : n > 0 ? "text-green-400" : "text-gray-400";
      return <span className={`font-mono ${color}`}>{v ?? "—"}</span>;
    }
  },
  {
    key: "parameters",
    label: "Parameters",
    render: (v) => {
      const n = parseInt(v);
      const color = n > 0 ? "text-yellow-400" : "text-green-400";
      return <span className={`font-mono ${color}`}>{v ?? "—"}</span>;
    }
  },
  {
    key: "underscores",
    label: "Underscores",
    render: (v) => {
      if (v === null || v === undefined) return <span className="text-gray-600">—</span>;
      return v
        ? <span className="text-yellow-400 font-medium">Yes</span>
        : <span className="text-green-400">No</span>;
    }
  },
  {
    key: "uppercase",
    label: "Uppercase",
    render: (v) => {
      if (v === null || v === undefined) return <span className="text-gray-600">—</span>;
      return v
        ? <span className="text-yellow-400 font-medium">Yes</span>
        : <span className="text-green-400">No</span>;
    }
  }
];

export default function UrlStructure() {
  return <AuditPage title="URL Structure" section="url-structure" columns={COLUMNS} />;
}
