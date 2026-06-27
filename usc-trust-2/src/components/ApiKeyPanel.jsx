import React, { useState } from "react";
import { PROVIDERS, listModels } from "../engine/providers.js";
import { useAppState } from "../state/AppState.jsx";

// Providers that support live model discovery via listModels().
const DISCOVERABLE = new Set(["openai", "anthropic", "google", "openai_compat"]);

// In-page key entry. Keys live in memory only (cleared on refresh) and are sent
// directly to each provider's API from the browser.
export default function ApiKeyPanel({ compact = false }) {
  const { keys, setKey, discoveredModels, setDiscovered } = useAppState();
  const [show, setShow] = useState({});
  const [fetching, setFetching] = useState({});
  const [fetchMsg, setFetchMsg] = useState({});

  async function fetchModels(providerId) {
    setFetchMsg((m) => ({ ...m, [providerId]: "" }));
    setFetching((f) => ({ ...f, [providerId]: true }));
    try {
      const models = await listModels(providerId, keys, {});
      setDiscovered(providerId, models);
      setFetchMsg((m) => ({ ...m, [providerId]: `✓ ${models.length} models loaded` }));
    } catch (e) {
      setFetchMsg((m) => ({ ...m, [providerId]: `⚠ ${e.message.slice(0, 90)}` }));
    } finally {
      setFetching((f) => ({ ...f, [providerId]: false }));
    }
  }

  return (
    <div className="card card-pad keypanel">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
        <h3 style={{ fontSize: compact ? 15 : 18 }}>API keys</h3>
        <span className="pill">in-memory only</span>
      </div>
      <p className="muted" style={{ fontSize: 12.5, margin: "0 0 14px" }}>
        Keys stay in this browser tab, are never saved, and clear on refresh. Add the key for whichever
        provider you want to test. Then hit <strong>Fetch models</strong> to load the exact models your key
        can use — this avoids "model not found" errors when providers rename things.
      </p>
      <div className="key-grid">
        {PROVIDERS.map((p) => {
          const count = (discoveredModels[p.id] || []).length;
          return (
            <div key={p.id} className="key-row">
              <label className="field-label mono" style={{ margin: 0 }}>
                {p.name}{p.id === "openai" ? " · recommended" : ""}
              </label>
              <div className="row" style={{ gap: 6 }}>
                <input
                  className="select key-input"
                  type={show[p.id] ? "text" : "password"}
                  placeholder={p.keyHint}
                  value={keys[p.id]}
                  onChange={(e) => setKey(p.id, e.target.value)}
                  autoComplete="off" spellCheck={false}
                />
                <button className="btn btn-ghost btn-sm" onClick={() => setShow((s) => ({ ...s, [p.id]: !s[p.id] }))}>
                  {show[p.id] ? "Hide" : "Show"}
                </button>
              </div>
              {p.needsBaseUrl && (
                <input
                  className="select key-input" style={{ marginTop: 6 }}
                  placeholder="Base URL (e.g. https://api.groq.com/openai/v1)"
                  value={keys.openai_compat_base}
                  onChange={(e) => setKey("openai_compat_base", e.target.value)}
                  autoComplete="off" spellCheck={false}
                />
              )}
              {DISCOVERABLE.has(p.id) && (
                <div className="row" style={{ gap: 8, marginTop: 2 }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    disabled={!keys[p.id] || fetching[p.id]}
                    onClick={() => fetchModels(p.id)}
                  >
                    {fetching[p.id] ? "Fetching…" : count ? `Refresh models (${count})` : "Fetch models"}
                  </button>
                  {fetchMsg[p.id] && (
                    <span className="mono" style={{ fontSize: 10.5, color: fetchMsg[p.id].startsWith("✓") ? "var(--excellent)" : "var(--critical)" }}>
                      {fetchMsg[p.id]}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <style>{`
        .key-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .key-row { display: flex; flex-direction: column; gap: 6px; }
        .key-input { font-family: var(--mono); font-size: 12.5px; }
        @media (max-width: 700px) { .key-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
}
