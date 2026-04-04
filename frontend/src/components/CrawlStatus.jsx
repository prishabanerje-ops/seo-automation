import React from "react";

export default function CrawlStatus({ site, progress = 0, status = "idle" }) {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium">{site}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          status === "running" ? "bg-blue-900 text-blue-300" :
          status === "completed" ? "bg-green-900 text-green-300" :
          status === "failed" ? "bg-red-900 text-red-300" :
          "bg-gray-700 text-gray-400"
        }`}>{status}</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full bg-blue-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="text-xs text-gray-500 mt-1">{progress}%</div>
    </div>
  );
}
