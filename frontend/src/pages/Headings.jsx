import React from "react";
import AuditPage from "../components/AuditPage.jsx";

const COLUMNS = [
  {
    key: "url",
    label: "URL",
    render: (v) => (
      <a href={v} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline truncate block max-w-xs">
        {v}
      </a>
    )
  },
  { key: "h1", label: "H1", render: (v) => v ? <span className="text-sm text-gray-200">{v}</span> : <span className="text-red-400 italic text-xs">Missing</span> },
  {
    key: "length",
    label: "H1 Len",
    render: (v) => {
      const n = parseInt(v);
      const color = !n ? "text-red-400" : n > 70 ? "text-yellow-400" : "text-green-400";
      return <span className={`font-mono ${color}`}>{n || "—"}</span>;
    }
  },
  { key: "h2", label: "H2", render: (v) => v ? <span className="text-sm text-gray-300">{v}</span> : <span className="text-gray-500 italic text-xs">Missing</span> },
  {
    key: "h2length",
    label: "H2 Len",
    render: (v) => <span className="font-mono text-gray-400">{parseInt(v) || "—"}</span>
  }
];

export default function Headings() {
  return <AuditPage title="H1 / H2 Headings" section="headings" columns={COLUMNS} />;
}
