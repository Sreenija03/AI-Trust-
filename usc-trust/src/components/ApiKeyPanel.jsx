import React, { useState } from "react";
import { PROVIDERS } from "../engine/providers.js";
import { useAppState } from "../state/AppState.jsx";

// In-page key entry. Keys live in memory only (cleared on refresh) and are sent
// directly to each provider's API from the browser. A note makes that explicit.
export default function ApiKeyPanel({ compact = false }) {
  const { keys, setKey } = useAppState();
  const [show, setShow] = useState({});

  return (
    <div className="card card-pad keypanel">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
        <h3 style={{ fontSize: compact ? 15 : 18 }}>API keys</h3>
        <span className="pill">in-memory only</span>
      </div>
      <p className="muted" style={{ fontSize: 12.5, margin: "0 0 14px" }}>
        Keys stay in this browser tab, are never saved, and clear on refresh. Add the key for whichever
        provider you want to test — one key (e.g. OpenAI) is enough to evaluate that company's models and
        judge them. Add a second provider's key to judge across companies (less bias).
      </p>
      <div className="key-grid">
        {PROVIDERS.map((p) => (
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
          </div>
        ))}
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
