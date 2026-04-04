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
    key: "protocol",
    label: "Protocol",
    render: (v) => {
      const proto = (v || "").toUpperCase();
      const color = proto === "HTTPS" ? "text-green-400" : proto === "HTTP" ? "text-red-400" : "text-gray-400";
      return <span className={`font-mono font-bold ${color}`}>{proto || "—"}</span>;
    }
  },
  {
    key: "mixed_content",
    label: "Mixed Content",
    render: (v) => {
      if (v === null || v === undefined) return <span className="text-gray-600">—</span>;
      return v
        ? <span className="text-red-400 font-medium">Yes</span>
        : <span className="text-green-400">No</span>;
    }
  },
  {
    key: "hsts_enabled",
    label: "HSTS Enabled",
    render: (v) => {
      if (v === null || v === undefined) return <span className="text-gray-600">—</span>;
      return v
        ? <span className="text-green-400">Yes</span>
        : <span className="text-yellow-400">No</span>;
    }
  }
];

export default function HttpsSecurity() {
  return <AuditPage title="HTTPS & Security" section="https-security" columns={COLUMNS} />;
}
