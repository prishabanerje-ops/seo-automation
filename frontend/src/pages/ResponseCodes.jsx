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
    label: "Status Code",
    render: (v) => {
      const code = parseInt(v);
      const color = code >= 500 ? "text-red-400" : code >= 400 ? "text-orange-400" : code >= 300 ? "text-yellow-400" : "text-green-400";
      return <span className={`font-mono font-bold ${color}`}>{v || "—"}</span>;
    }
  },
  { key: "dest", label: "Redirect To", render: (v) => v ? <span className="text-xs text-gray-400 truncate block max-w-xs">{v}</span> : "—" },
  { key: "contentType", label: "Content Type", render: (v) => <span className="text-xs text-gray-400">{v || "—"}</span> }
];

export default function ResponseCodes() {
  return <AuditPage title="Response Codes" section="response-codes" columns={COLUMNS} />;
}
