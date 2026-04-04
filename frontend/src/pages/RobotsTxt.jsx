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
    key: "blocked_by_robots",
    label: "Blocked by Robots",
    render: (v) => {
      if (v === null || v === undefined) return <span className="text-gray-600">—</span>;
      return v
        ? <span className="text-red-400 font-medium">Blocked</span>
        : <span className="text-green-400">Allowed</span>;
    }
  },
  {
    key: "user_agent",
    label: "User Agent",
    render: (v) => <span className="text-xs text-gray-400 font-mono">{v || "—"}</span>
  },
  {
    key: "directive",
    label: "Directive",
    render: (v) => <span className="text-xs text-gray-300 font-mono">{v || "—"}</span>
  }
];

export default function RobotsTxt() {
  return <AuditPage title="Robots.txt" section="robots-txt" columns={COLUMNS} />;
}
