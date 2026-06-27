import React, { createContext, useContext, useState, useCallback } from "react";

// Holds API keys (in memory only — never persisted) and any live results
// produced this session. Results here merge into the leaderboard.
const AppStateContext = createContext(null);

export function AppStateProvider({ children }) {
  const [keys, setKeys] = useState({
    anthropic: "", openai: "", google: "", xai: "", openai_compat: "", openai_compat_base: "",
  });
  const [liveResults, setLiveResults] = useState([]); // measured records from this session

  const setKey = useCallback((provider, value) => {
    setKeys((k) => ({ ...k, [provider]: value }));
  }, []);

  // Add or replace a measured result (keyed by model name).
  const addResult = useCallback((record) => {
    setLiveResults((rs) => {
      const without = rs.filter((r) => r.model !== record.model);
      return [...without, record];
    });
  }, []);

  const removeResult = useCallback((model) => {
    setLiveResults((rs) => rs.filter((r) => r.model !== model));
  }, []);

  return (
    <AppStateContext.Provider value={{ keys, setKey, liveResults, addResult, removeResult }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
