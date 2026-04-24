import React from "react";

const severityStyles = {
  critical: "border-red-800 bg-red-950/30 text-red-400",
  warning: "border-yellow-800 bg-yellow-950/30 text-yellow-400",
  info: "border-blue-800 bg-blue-950/30 text-blue-400"
};

export default function IssueCard({ label, count, severity = "info" }) {
  return (
    <div className={`border rounded-lg px-4 py-3 flex items-center justify-between ${severityStyles[severity]}`}>
      <span className="text-sm font-medium">{label}</span>
      <span className="text-2xl font-bold">{count ?? 0}</span>
    </div>
  );
}
