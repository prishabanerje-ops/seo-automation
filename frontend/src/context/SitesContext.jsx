import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../api/index.js";

const SitesContext = createContext({
  sites: [],
  loading: true,
  activeSiteId: null,
  setActiveSiteId: () => {},
  refetch: () => {},
});

export function SitesProvider({ children }) {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSiteId, setActiveSiteId] = useState(null);

  const fetchSites = useCallback(() => {
    setLoading(true);
    api.get("/sites")
      .then((r) => {
        const list = r.data ?? [];
        setSites(list);
        // Set first site as active if none selected or current is gone
        setActiveSiteId((prev) => {
          if (prev && list.find((s) => s.id === prev)) return prev;
          return list[0]?.id ?? null;
        });
      })
      .catch(() => setSites([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchSites(); }, [fetchSites]);

  return (
    <SitesContext.Provider value={{ sites, loading, activeSiteId, setActiveSiteId, refetch: fetchSites }}>
      {children}
    </SitesContext.Provider>
  );
}

export function useSites() {
  return useContext(SitesContext);
}
