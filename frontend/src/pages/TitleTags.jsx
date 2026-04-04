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
    key: "title",
    label: "Title",
    render: (v) => v
      ? <span className="text-sm text-gray-200">{v}</span>
      : <span className="text-red-400 italic text-xs">Missing</span>
  },
  {
    key: "title_length",
    label: "Title Length",
    render: (v) => {
      const n = parseInt(v);
      const color = !n ? "text-red-400" : n < 30 ? "text-red-400" : n <= 60 ? "text-green-400" : "text-yellow-400";
      return <span className={`font-mono ${color}`}>{n || "—"}</span>;
    }
  },
  {
    key: "pixel_width",
    label: "Pixel Width",
    render: (v) => {
      const n = parseInt(v);
      const color = !n ? "text-gray-400" : n < 200 ? "text-red-400" : n <= 580 ? "text-green-400" : "text-yellow-400";
      return <span className={`font-mono ${color}`}>{v ?? "—"}</span>;
    }
  }
];

export default function TitleTags() {
  return <AuditPage title="Title Tags" section="title-tags" columns={COLUMNS} />;
}
