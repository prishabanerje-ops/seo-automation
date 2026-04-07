import { createContext, useContext, useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "seo_intentional_rules";

const IntentionalRulesContext = createContext(null);

// ─── Rule matching logic ──────────────────────────────────────────────────────

function testRule(row, rule) {
  if (rule.issue_type && rule.issue_type !== row.issue_type) return false;
  if (rule.scope === "all") return true;
  if (rule.scope === "url") return rule.pattern === row.url;
  if (rule.scope === "pattern") {
    try {
      // Convert wildcard glob to regex: /blog/* → ^\/blog\/.*$
      const escaped = rule.pattern
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&") // escape special chars except *
        .replace(/\\\*/g, ".*");                  // restore * as .*
      return new RegExp(escaped).test(row.url || "");
    } catch {
      return false;
    }
  }
  return false;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function IntentionalRulesProvider({ children }) {
  const [allRules, setAllRules] = useState({});

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setAllRules(JSON.parse(stored));
    } catch {}
  }, []);

  // Persist on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allRules));
    } catch {}
  }, [allRules]);

  const getRulesForSite = useCallback((siteId) => {
    return allRules[siteId || ""] || [];
  }, [allRules]);

  const getMatchingRule = useCallback((row, siteId) => {
    const rules = allRules[siteId || ""] || [];
    return rules.find(rule => testRule(row, rule)) || null;
  }, [allRules]);

  const addRule = useCallback((siteId, ruleData) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const newRule = {
      ...ruleData,
      id,
      site_id: siteId || "",
      created_at: new Date().toISOString()
    };
    setAllRules(prev => ({
      ...prev,
      [siteId || ""]: [...(prev[siteId || ""] || []), newRule]
    }));
    return newRule;
  }, []);

  const removeRule = useCallback((siteId, id) => {
    setAllRules(prev => ({
      ...prev,
      [siteId || ""]: (prev[siteId || ""] || []).filter(r => r.id !== id)
    }));
  }, []);

  const updateRule = useCallback((siteId, id, patch) => {
    setAllRules(prev => ({
      ...prev,
      [siteId || ""]: (prev[siteId || ""] || []).map(r => r.id === id ? { ...r, ...patch } : r)
    }));
  }, []);

  return (
    <IntentionalRulesContext.Provider value={{
      allRules,
      getRulesForSite,
      getMatchingRule,
      addRule,
      removeRule,
      updateRule
    }}>
      {children}
    </IntentionalRulesContext.Provider>
  );
}

export function useIntentionalRules() {
  const ctx = useContext(IntentionalRulesContext);
  if (!ctx) throw new Error("useIntentionalRules must be used within IntentionalRulesProvider");
  return ctx;
}
