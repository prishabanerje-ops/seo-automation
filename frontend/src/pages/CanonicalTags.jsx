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
    key: "canonical_url",
    label: "Canonical URL",
    render: (v, row) => {
      if (!v) return <span className="text-red-400 italic text-xs">Missing</span>;
      const isSelf = v === row?.url;
      return isSelf
        ? <span className="text-gray-400 text-xs italic">Self-referencing</span>
        : <span className="text-xs text-gray-300 truncate block max-w-xs">{v}</span>;
    }
  },
  {
    key: "canonical_match",
    label: "Canonical Match",
    render: (v) => {
      if (v === null || v === undefined) return <span className="text-gray-600">—</span>;
      return v
        ? <span className="text-green-400">Yes</span>
        : <span className="text-red-400">No</span>;
    }
  },
  {
    key: "cross_domain",
    label: "Cross Domain",
    render: (v) => {
      if (v === null || v === undefined) return <span className="text-gray-600">—</span>;
      return v
        ? <span className="text-yellow-400">Yes</span>
        : <span className="text-green-400">No</span>;
    }
  }
];

export default function CanonicalTags() {
  return <AuditPage title="Canonical Tags" section="canonicals" columns={COLUMNS} />;
}
