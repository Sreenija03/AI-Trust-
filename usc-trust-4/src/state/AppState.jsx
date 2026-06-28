import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

// Holds API keys (in memory only, never persisted) and measured results.
// Results and discovered models persist to localStorage so the leaderboard
// keeps your runs across refreshes and reopening the site. API keys are
// deliberately NOT persisted, for security.
const AppStateContext = createContext(null);

const LS_RESULTS = "usc_trust_live_results_v1";
const LS_BIAS = "usc_trust_bias_reports_v1";

// Safe localStorage read/write (no-ops if storage is unavailable, e.g. private mode).
function loadLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function saveLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable; keep working in-memory */
  }
}

export function AppStateProvider({ children }) {
  const [keys, setKeys] = useState({
    anthropic: "", openai: "", google: "", xai: "", openai_compat: "", openai_compat_base: "",
  });
  // Measured records, restored from localStorage on first load.
  const [liveResults, setLiveResults] = useState(() => loadLS(LS_RESULTS, []));
  const [discoveredModels, setDiscoveredModels] = useState({}); // session-only
  const [biasReports, setBiasReports] = useState(() => loadLS(LS_BIAS, []));

  // Persist results and bias reports whenever they change.
  useEffect(() => { saveLS(LS_RESULTS, liveResults); }, [liveResults]);
  useEffect(() => { saveLS(LS_BIAS, biasReports); }, [biasReports]);

  const addBiasReport = useCallback((report) => {
    setBiasReports((rs) => [report, ...rs].slice(0, 10));
  }, []);

  const setKey = useCallback((provider, value) => {
    setKeys((k) => ({ ...k, [provider]: value }));
  }, []);

  const setDiscovered = useCallback((provider, models) => {
    setDiscoveredModels((d) => ({ ...d, [provider]: models }));
  }, []);

  // Add or replace a measured result. Re-running the same model NAME updates the
  // existing leaderboard row in place (latest run wins), regardless of judge.
  const addResult = useCallback((record) => {
    setLiveResults((rs) => {
      const without = rs.filter((r) => r.model !== record.model);
      return [...without, record];
    });
  }, []);

  const removeResult = useCallback((model) => {
    setLiveResults((rs) => rs.filter((r) => r.model !== model));
  }, []);

  const clearResults = useCallback(() => {
    setLiveResults([]);
    saveLS(LS_RESULTS, []);
  }, []);

  return (
    <AppStateContext.Provider value={{
      keys, setKey,
      liveResults, addResult, removeResult, clearResults,
      discoveredModels, setDiscovered,
      biasReports, addBiasReport,
    }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
