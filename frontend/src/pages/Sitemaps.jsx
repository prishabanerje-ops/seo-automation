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
    key: "in_sitemap",
    label: "In Sitemap",
    render: (v) => {
      if (v === null || v === undefined) return <span className="text-gray-600">—</span>;
      return v
        ? <span className="text-green-400">Yes</span>
        : <span className="text-red-400">No</span>;
    }
  },
  {
    key: "http_status",
    label: "HTTP Status",
    render: (v) => {
      const code = parseInt(v);
      const color = code >= 500 ? "text-red-400" : code >= 400 ? "text-orange-400" : code >= 300 ? "text-yellow-400" : "text-green-400";
      return <span className={`font-mono font-bold ${color}`}>{v || "—"}</span>;
    }
  },
  {
    key: "last_modified",
    label: "Last Modified",
    render: (v) => <span className="text-xs text-gray-400">{v || "—"}</span>
  },
  {
    key: "priority",
    label: "Priority",
    render: (v) => <span className="font-mono text-gray-300">{v ?? "—"}</span>
  }
];

export default function Sitemaps() {
  return <AuditPage title="Sitemaps" section="sitemaps" columns={COLUMNS} />;
}
