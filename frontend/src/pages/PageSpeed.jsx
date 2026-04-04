import React, { useState } from "react";
import SiteSelector from "../components/SiteSelector.jsx";
import DataTable from "../components/DataTable.jsx";
import { runPageSpeed, getReport } from "../api/index.js";

const SITE_URLS = {
  "cars24-newcars": "https://www.cars24.com/new-cars/",
  "teambhp-newcars": "https://www.team-bhp.com/new-cars/",
  "bikes24": "https://www.bikes24.com/"
};

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
    key: "mobile",
    label: "Mobile Score",
    render: (v) => {
      const s = v?.score ?? null;
      if (s === null) return "—";
      const color = s >= 90 ? "text-green-400" : s >= 50 ? "text-yellow-400" : "text-red-400";
      return <span className={`font-mono font-bold ${color}`}>{s}</span>;
    }
  },
  {
    key: "desktop",
    label: "Desktop Score",
    render: (v) => {
      const s = v?.score ?? null;
      if (s === null) return "—";
      const color = s >= 90 ? "text-green-400" : s >= 50 ? "text-yellow-400" : "text-red-400";
      return <span className={`font-mono font-bold ${color}`}>{s}</span>;
    }
  },
  { key: "mobile_lcp", label: "LCP", render: (_, row) => <span className="font-mono text-xs text-gray-300">{row.mobile?.lcp ?? "—"}</span> },
  { key: "mobile_cls", label: "CLS", render: (_, row) => <span className="font-mono text-xs text-gray-300">{row.mobile?.cls ?? "—"}</span> },
  { key: "mobile_fcp", label: "FCP", render: (_, row) => <span className="font-mono text-xs text-gray-300">{row.mobile?.fcp ?? "—"}</span> },
  {
    key: "issues",
    label: "Issues",
    render: (v) => v?.length ? (
      <div className="space-y-0.5">
        {v.map((issue, i) => <div key={i} className="text-xs text-yellow-400">{issue}</div>)}
      </div>
    ) : <span className="text-green-400 text-xs">OK</span>
  },
  {
    key: "error",
    label: "Error",
    render: (v) => v ? <span className="text-xs text-red-400">{v}</span> : null
  }
];

export default function PageSpeed() {
  const [site, setSite] = useState("cars24-newcars");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sampleSize, setSampleSize] = useState(10);
  const [status, setStatus] = useState(null);

  async function handleRun() {
    setLoading(true);
    setStatus("Fetching crawled URLs...");
    setRows([]);

    try {
      // Get crawled URLs from the last crawl for this site
      const reportRes = await getReport(site, "response-codes");
      const allUrls = (reportRes.data.data ?? [])
        .filter((r) => r.status >= 200 && r.status < 300)
        .map((r) => r.url)
        .slice(0, sampleSize);

      if (allUrls.length === 0) {
        setStatus("No crawled URLs found. Run a crawl first.");
        setLoading(false);
        return;
      }

      setStatus(`Running PSI for ${allUrls.length} URLs... (this may take a few minutes)`);
      const res = await runPageSpeed(site, allUrls);
      setRows(res.data.data ?? []);
      setStatus(`Done — ${res.data.data.length} URLs analysed`);
    } catch (err) {
      setStatus("Error: " + (err.response?.data?.error ?? err.message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">Page Speed / Core Web Vitals</h1>
          <p className="text-xs text-gray-500 mt-1">
            Calls PageSpeed Insights API for a sample of crawled URLs. Add PSI_API_KEY to .env for higher rate limits.
          </p>
        </div>
        <SiteSelector selected={site} onChange={setSite} />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Sample size (max 50)</label>
          <input
            type="number"
            min={1}
            max={50}
            value={sampleSize}
            onChange={(e) => setSampleSize(Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200 w-24"
          />
        </div>
        <button
          onClick={handleRun}
          disabled={loading}
          className="mt-5 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? "Running..." : "Run Page Speed"}
        </button>
        {status && (
          <span className={`text-sm mt-5 ${status.startsWith("Error") ? "text-red-400" : "text-gray-400"}`}>
            {status}
          </span>
        )}
      </div>

      {rows.length > 0 && <DataTable columns={COLUMNS} data={rows} />}
    </div>
  );
}
