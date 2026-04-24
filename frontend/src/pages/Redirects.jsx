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
    key: "redirect_to",
    label: "Redirect To",
    render: (v) => v ? <span className="text-xs text-gray-400 truncate block max-w-xs">{v}</span> : <span className="text-gray-600">—</span>
  },
  {
    key: "status_code",
    label: "Status Code",
    render: (v) => {
      const code = parseInt(v);
      const color = code === 301 ? "text-green-400" : code === 302 ? "text-yellow-400" : "text-gray-400";
      return <span className={`font-mono font-bold ${color}`}>{v || "—"}</span>;
    }
  },
  {
    key: "chain_length",
    label: "Redirect Chain Length",
    render: (v) => {
      const n = parseInt(v);
      const color = n > 3 ? "text-red-400" : n > 1 ? "text-yellow-400" : "text-green-400";
      return <span className={`font-mono ${color}`}>{v ?? "—"}</span>;
    }
  }
];

export default function Redirects() {
  return <AuditPage title="Redirects" section="redirects" columns={COLUMNS} />;
}
