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
    key: "status_code",
    label: "Status Code",
    render: (v) => {
      const code = parseInt(v);
      const color = code >= 500 ? "text-red-400" : code >= 400 ? "text-orange-400" : "text-gray-400";
      return <span className={`font-mono font-bold ${color}`}>{v || "—"}</span>;
    }
  },
  {
    key: "inlinks",
    label: "Inlinks",
    render: (v) => {
      const n = parseInt(v);
      const color = n > 0 ? "text-red-400" : "text-gray-400";
      return <span className={`font-mono ${color}`}>{v ?? "—"}</span>;
    }
  },
  {
    key: "first_found",
    label: "First Found",
    render: (v) => <span className="text-xs text-gray-400">{v || "—"}</span>
  }
];

export default function Errors404() {
  return <AuditPage title="404 & Status Errors" section="error-404" columns={COLUMNS} />;
}
