import { useSites } from "../context/SitesContext.jsx";

export default function SiteSelector({ selected, onChange }) {
  const { sites } = useSites();

  if (!sites.length) return null;

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {sites.map((site) => {
        const active = selected === site.id;
        const color = site.color || "#6366F1";
        return (
          <button
            key={site.id}
            onClick={() => onChange(site.id)}
            style={{
              padding: "6px 14px", fontSize: 12, fontWeight: 600, borderRadius: 8, cursor: "pointer",
              border: `1px solid ${active ? color : "var(--border)"}`,
              background: active ? color : "transparent",
              color: active ? "#fff" : "var(--text-secondary)",
              transition: "all 0.15s"
            }}
          >
            {site.label}
          </button>
        );
      })}
    </div>
  );
}
