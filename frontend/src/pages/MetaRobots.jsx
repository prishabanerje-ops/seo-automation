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
    key: "robots_meta",
    label: "Robots Meta",
    render: (v) => <span className="text-xs text-gray-300 font-mono">{v || "—"}</span>
  },
  {
    key: "noindex",
    label: "Noindex",
    render: (v) => {
      if (v === null || v === undefined) return <span className="text-gray-600">—</span>;
      return v
        ? <span className="text-red-400 font-medium">Yes</span>
        : <span className="text-green-400">No</span>;
    }
  },
  {
    key: "nofollow",
    label: "Nofollow",
    render: (v) => {
      if (v === null || v === undefined) return <span className="text-gray-600">—</span>;
      return v
        ? <span className="text-yellow-400 font-medium">Yes</span>
        : <span className="text-green-400">No</span>;
    }
  },
  {
    key: "x_robots_tag",
    label: "X-Robots-Tag",
    render: (v) => <span className="text-xs text-gray-400 font-mono">{v || "—"}</span>
  }
];

export default function MetaRobots() {
  return <AuditPage title="Meta Robots & Indexation" section="meta-robots" columns={COLUMNS} />;
}
