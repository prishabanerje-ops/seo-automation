import { useState, useEffect } from "react";

export default function DataTable({ columns = [], data = [], pageSize = 100 }) {
  const [page, setPage] = useState(0);
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  useEffect(() => { setPage(0); }, [data]);

  const sorted = sortCol
    ? [...data].sort((a, b) => {
        const v1 = a[sortCol] ?? "";
        const v2 = b[sortCol] ?? "";
        return sortDir === "asc" ? (v1 > v2 ? 1 : -1) : (v1 < v2 ? 1 : -1);
      })
    : data;

  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(data.length / pageSize);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  return (
    <div>
      <div className="data-table-wrap">
        <table className="data-table" style={{ width: "100%" }}>
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key} onClick={() => handleSort(col.key)} style={{ cursor: "pointer", userSelect: "none" }}>
                  {col.label}
                  {sortCol === col.key && <span style={{ marginLeft: 4, opacity: 0.6 }}>{sortDir === "asc" ? "↑" : "↓"}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                  No data available
                </td>
              </tr>
            ) : (
              paged.map((row, i) => (
                <tr key={i}>
                  {columns.map(col => (
                    <td key={col.key} style={{ maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, fontSize: 12, color: "var(--text-muted)" }}>
          <span>{data.length} rows</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="btn btn-surface" style={{ fontSize: 12, opacity: page === 0 ? 0.4 : 1 }}>Prev</button>
            <span style={{ padding: "6px 10px" }}>{page + 1} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="btn btn-surface" style={{ fontSize: 12, opacity: page >= totalPages - 1 ? 0.4 : 1 }}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
