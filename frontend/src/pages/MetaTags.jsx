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
  { key: "title", label: "Title", render: (v) => v ? <span className="text-sm text-gray-200">{v}</span> : <span className="text-red-400 italic text-xs">Missing</span> },
  {
    key: "length",
    label: "Title Len",
    render: (v) => {
      const n = parseInt(v);
      const color = !n ? "text-red-400" : (n < 30 || n > 60) ? "text-yellow-400" : "text-green-400";
      return <span className={`font-mono ${color}`}>{n || "—"}</span>;
    }
  },
  { key: "desc", label: "Meta Description", render: (v) => v ? <span className="text-xs text-gray-400 truncate block max-w-xs">{v}</span> : <span className="text-yellow-400 italic text-xs">Missing</span> },
  {
    key: "descLength",
    label: "Desc Len",
    render: (v) => {
      const n = parseInt(v);
      const color = !n ? "text-yellow-400" : (n < 70 || n > 160) ? "text-yellow-400" : "text-green-400";
      return <span className={`font-mono ${color}`}>{n || "—"}</span>;
    }
  }
];

export default function MetaTags() {
  return <AuditPage title="Meta Titles & Descriptions" section="meta-tags" columns={COLUMNS} />;
}
