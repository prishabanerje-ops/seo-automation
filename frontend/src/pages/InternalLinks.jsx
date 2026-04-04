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
    key: "status",
    label: "Status",
    render: (v) => {
      const code = parseInt(v);
      const color = code >= 400 ? "text-red-400" : code >= 300 ? "text-yellow-400" : "text-green-400";
      return <span className={`font-mono font-bold ${color}`}>{v || "—"}</span>;
    }
  },
  {
    key: "inlinks",
    label: "Inlinks",
    render: (v) => {
      const n = parseInt(v);
      const color = n === 0 ? "text-red-400" : n > 100 ? "text-yellow-400" : "text-gray-200";
      return <span className={`font-mono ${color}`}>{n}</span>;
    }
  },
  {
    key: "outlinks",
    label: "Outlinks",
    render: (v) => <span className="font-mono text-gray-300">{parseInt(v) || 0}</span>
  }
];

export default function InternalLinks() {
  return <AuditPage title="Internal Links" section="internal-links" columns={COLUMNS} />;
}
