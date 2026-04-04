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
  { key: "extraction1", label: "Extraction 1", render: (v) => <span className="text-xs text-gray-300 truncate block max-w-xs">{v || "—"}</span> },
  { key: "extraction2", label: "Extraction 2", render: (v) => <span className="text-xs text-gray-300 truncate block max-w-xs">{v || "—"}</span> },
  { key: "extraction3", label: "Extraction 3", render: (v) => <span className="text-xs text-gray-300 truncate block max-w-xs">{v || "—"}</span> }
];

export default function CustomExtraction() {
  return <AuditPage title="Custom Extraction" section="custom-extraction" columns={COLUMNS} />;
}
