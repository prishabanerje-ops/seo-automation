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
  { key: "types", label: "Schema Types", render: (v) => v ? <span className="text-xs text-gray-200">{v}</span> : <span className="text-gray-500 italic text-xs">None found</span> },
  {
    key: "errors",
    label: "Errors",
    render: (v) => {
      const n = parseInt(v);
      return <span className={`font-mono ${n > 0 ? "text-red-400" : "text-gray-500"}`}>{n || 0}</span>;
    }
  },
  {
    key: "warnings",
    label: "Warnings",
    render: (v) => {
      const n = parseInt(v);
      return <span className={`font-mono ${n > 0 ? "text-yellow-400" : "text-gray-500"}`}>{n || 0}</span>;
    }
  }
];

export default function StructuredData() {
  return <AuditPage title="Structured Data / Schema" section="structured-data" columns={COLUMNS} />;
}
