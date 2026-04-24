import React from "react";
import AuditPage from "../components/AuditPage.jsx";

const COLUMNS = [
  {
    key: "url",
    label: "Page / Image URL",
    render: (v) => (
      <a href={v} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline truncate block max-w-xs">
        {v}
      </a>
    )
  },
  { key: "src", label: "Image Src", render: (v) => v ? <span className="text-xs text-gray-400 truncate block max-w-xs">{v}</span> : <span className="text-red-400 italic text-xs">Missing src</span> },
  { key: "alt", label: "Alt Text", render: (v) => v ? <span className="text-sm text-gray-200">{v}</span> : <span className="text-yellow-400 italic text-xs">Missing</span> },
  {
    key: "altLength",
    label: "Alt Len",
    render: (v) => {
      const n = parseInt(v);
      const color = !n ? "text-yellow-400" : n > 125 ? "text-yellow-400" : "text-green-400";
      return <span className={`font-mono ${color}`}>{n || "—"}</span>;
    }
  }
];

export default function Images() {
  return <AuditPage title="Images & Alt Text" section="images" columns={COLUMNS} />;
}
