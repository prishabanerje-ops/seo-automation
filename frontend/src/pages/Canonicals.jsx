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
  {
    key: "canonical",
    label: "Canonical URL",
    render: (v, row) => {
      if (!v) return <span className="text-yellow-400 italic text-xs">Missing</span>;
      const isSelf = v === row.url;
      return (
        <span className={`text-xs truncate block max-w-xs ${isSelf ? "text-green-400" : "text-orange-400"}`}>
          {isSelf ? "Self-referencing ✓" : v}
        </span>
      );
    }
  },
  {
    key: "match",
    label: "Match",
    render: (v) => {
      const color = v === "Yes" ? "text-green-400" : v ? "text-yellow-400" : "text-gray-500";
      return <span className={`text-xs ${color}`}>{v || "—"}</span>;
    }
  }
];

export default function Canonicals() {
  return <AuditPage title="Canonical Tags" section="canonicals" columns={COLUMNS} />;
}
