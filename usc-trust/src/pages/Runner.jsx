import React, { useState, useRef, useMemo } from "react";
import { PILLARS, PILLAR_BY_ID, ratingFor, TOTAL_TESTS } from "../data/framework.js";
import { TEST_CASES } from "../data/testCases.js";
import { scoreOne, scoreCase, aggregate, buildBattery, runFullEvaluation } from "../engine/scorer.js";
import { MODEL_REGISTRY, isModelRunnable, generateResponse, JUDGE_REGISTRY, DEFAULT_JUDGE, familyOf, readyProviders } from "../engine/providers.js";
import { download } from "../engine/exporters.js";
import { useAppState } from "../state/AppState.jsx";
import ApiKeyPanel from "../components/ApiKeyPanel.jsx";

export default function Runner({ go }) {
  const { keys, addResult } = useAppState();
  const [modelLabel, setModelLabel] = useState("GPT-4o");
  const [judgeLabel, setJudgeLabel] = useState("GPT-4o mini");
  const [mode, setMode] = useState("full"); // "full" | "single"
  const modelEntry = MODEL_REGISTRY.find((m) => m.label === modelLabel);
  const judgeEntry = JUDGE_REGISTRY.find((j) => j.label === judgeLabel) || DEFAULT_JUDGE;
  const runnable = isModelRunnable(modelEntry, keys, judgeEntry);
  const ready = readyProviders(keys);
  const selfFamily = familyOf(judgeEntry) === familyOf(modelEntry);

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Evaluation Runner · live</div>
          <h2>Run real evaluations</h2>
          <p>
            Add your API keys, pick a target model and a judge, then run the full {TOTAL_TESTS}-test battery.
            The app calls the target model to generate each response, then calls your chosen judge to score it
            against the framework's rubric — producing genuine measured scores that populate the leaderboard.
          </p>
        </div>

        <div style={{ marginBottom: 20 }}>
          <ApiKeyPanel />
        </div>

        {/* Judge configuration + bias controls */}
        <JudgePanel judgeLabel={judgeLabel} setJudgeLabel={setJudgeLabel} judgeEntry={judgeEntry}
          ready={ready} selfFamily={selfFamily} modelEntry={modelEntry} />

        <div className="row wrap" style={{ gap: 10, margin: "20px 0" }}>
          <div className="row" style={{ gap: 6 }}>
            <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>MODE</span>
            <button className={`btn btn-sm ${mode === "full" ? "btn-primary" : "btn-ghost"}`} onClick={() => setMode("full")}>Full battery (93)</button>
            <button className={`btn btn-sm ${mode === "single" ? "btn-primary" : "btn-ghost"}`} onClick={() => setMode("single")}>Single test</button>
          </div>
        </div>

        {mode === "full"
          ? <FullRunner modelEntry={modelEntry} modelLabel={modelLabel} setModelLabel={setModelLabel} keys={keys} runnable={runnable} addResult={addResult} go={go} judgeEntry={judgeEntry} selfFamily={selfFamily} />
          : <SingleRunner modelEntry={modelEntry} modelLabel={modelLabel} setModelLabel={setModelLabel} keys={keys} runnable={runnable} judgeEntry={judgeEntry} selfFamily={selfFamily} />}

        <style>{runnerCSS}</style>
      </div>
    </section>
  );
}

// Judge selector + fairness controls.
function JudgePanel({ judgeLabel, setJudgeLabel, judgeEntry, ready, selfFamily, modelEntry }) {
  return (
    <div className="card card-pad">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
        <h3 style={{ fontSize: 16 }}>Judge configuration</h3>
        <span className="pill">bias controls</span>
      </div>
      <p className="muted" style={{ fontSize: 12.5, margin: "0 0 12px" }}>
        The judge scores responses <strong>blind</strong> — it never sees which model or company produced the
        text, runs at temperature 0, and must map every score to a named rubric level. Pick a judge from a
        different company than your target to avoid same-family conflicts.
      </p>
      <div className="row wrap" style={{ gap: 12, alignItems: "flex-end" }}>
        <div style={{ flex: "1 1 240px" }}>
          <label className="field-label mono">JUDGE MODEL</label>
          <select className="select" value={judgeLabel} onChange={(e) => setJudgeLabel(e.target.value)}>
            {JUDGE_REGISTRY.map((j) => (
              <option key={j.label} value={j.label}>{j.label} ({j.family}){ready[j.provider] ? "" : " — add key"}</option>
            ))}
          </select>
        </div>
        <div className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>
          Judge family: <strong style={{ color: "var(--cardinal)" }}>{judgeEntry.family}</strong> ·
          Target family: <strong style={{ color: "var(--cardinal)" }}>{familyOf(modelEntry)}</strong>
        </div>
      </div>
      {selfFamily && (
        <div className="self-family-warn">
          ⚠ Same-family judging: <strong>{judgeEntry.family}</strong> is judging its own model. Results will be
          run and scored, but flagged on the leaderboard so this conflict is visible. For the most defensible
          numbers, switch to a judge from a different company.
        </div>
      )}
    </div>
  );
}

function ModelPicker({ modelLabel, setModelLabel, keys }) {
  return (
    <div>
      <label className="field-label mono">EVALUATED MODEL</label>
      <select className="select" value={modelLabel} onChange={(e) => setModelLabel(e.target.value)}>
        {MODEL_REGISTRY.map((m) => {
          const ok = isModelRunnable(m, keys);
          return <option key={m.label} value={m.label}>{m.label}{ok ? "" : "  — add key"}</option>;
        })}
      </select>
    </div>
  );
}

// ---- Full battery runner ------------------------------------------------
function FullRunner({ modelEntry, modelLabel, setModelLabel, keys, runnable, addResult, go, judgeEntry, selfFamily }) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [liveRows, setLiveRows] = useState([]);
  const abortRef = useRef(null);

  const battery = useMemo(() => buildBattery(TEST_CASES), []);

  async function start() {
    setError(""); setResult(null); setLiveRows([]);
    if (!runnable) {
      setError(`Add both the Anthropic judge key and the ${modelEntry.provider} key to run ${modelLabel}.`);
      return;
    }
    setRunning(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const record = await runFullEvaluation(modelEntry, battery, keys, {
        signal: ctrl.signal,
        judgeEntry,
        onProgress: (pr) => {
          setProgress(pr);
          if (pr.result) setLiveRows((rows) => [...rows, pr.result]);
        },
      });
      setResult(record);
      addResult(record); // populate leaderboard
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  }
  function stop() { abortRef.current?.abort(); }

  const pct = progress ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="runner-grid">
      <div className="card card-pad">
        <ModelPicker modelLabel={modelLabel} setModelLabel={setModelLabel} keys={keys} />
        <div className="run-note mono">
          {runnable ? `${modelEntry.provider} → generate · ${judgeEntry.family} judge${selfFamily ? " · ⚠ same-family" : ""}` : "Missing key for this model or the judge"}
        </div>

        {!running ? (
          <button className="btn btn-primary" style={{ marginTop: 14, width: "100%", justifyContent: "center" }} onClick={start} disabled={!runnable}>
            Run full evaluation ({battery.length} tests)
          </button>
        ) : (
          <button className="btn btn-ghost" style={{ marginTop: 14, width: "100%", justifyContent: "center" }} onClick={stop}>
            Stop
          </button>
        )}

        {error && <div className="err">{error}</div>}

        {progress && (
          <div style={{ marginTop: 18 }}>
            <div className="row" style={{ justifyContent: "space-between", fontSize: 12 }}>
              <span className="mono">{progress.done}/{progress.total}</span>
              <span className="mono muted">
                {progress.current?.phase === "generating" && `generating · ${progress.current.testId}`}
                {progress.current?.phase === "judging" && `judging · ${progress.current.testId}`}
                {progress.current?.phase === "done" && `done · ${progress.current.testId}`}
              </span>
            </div>
            <div className="prog-track"><div className="prog-fill" style={{ width: `${pct}%` }} /></div>
          </div>
        )}

        {result && (
          <div className="final-score" style={{ marginTop: 20 }}>
            <div className="mono result-num" style={{ color: `var(--${ratingFor(result.overall).token})` }}>{result.overall}</div>
            <div>
              <span className={`rating ${ratingFor(result.overall).token}`}>{result.rating}</span>
              <div className="muted mono" style={{ fontSize: 11, marginTop: 6 }}>
                {result.testsPassed}/{result.testsTotal} passed · {Math.round(result.passRate * 100)}%
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="row wrap" style={{ gap: 8, marginTop: 16 }}>
            <button className="btn btn-primary btn-sm" onClick={() => go("leaderboard")}>View on leaderboard →</button>
            <button className="btn btn-ghost btn-sm" onClick={() => download(`eval-${result.model}.json`, JSON.stringify(result, null, 2), "application/json")}>↓ Full JSON</button>
          </div>
        )}
      </div>

      {/* live per-test feed */}
      <div className="card card-pad">
        <label className="field-label mono">LIVE TEST FEED</label>
        {liveRows.length === 0 && !running && (
          <div className="result-empty">
            <div className="mono" style={{ fontSize: 40, color: "var(--line-strong)" }}>—</div>
            <p className="muted" style={{ fontSize: 13 }}>Each test appears here as it's generated and judged.</p>
          </div>
        )}
        <div className="feed">
          {liveRows.slice().reverse().map((r, i) => (
            <div key={liveRows.length - i} className={`feed-row ${r.errored ? "feed-err" : ""}`}>
              <span className="mono feed-id">{r.testId}</span>
              <span className="mono feed-pillar">{PILLAR_BY_ID[r.pillarId]?.short}</span>
              <span className="mono feed-mode">{r.mode}</span>
              <span className="mono feed-score" style={{ color: `var(--${ratingFor(r.hybridScore).token})` }}>
                {r.errored ? "ERR" : r.hybridScore}
              </span>
              <span className={`feed-dot ${r.pass ? "ok" : "no"}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- Single test runner (auto-generate + judge one prompt) --------------
function SingleRunner({ modelEntry, modelLabel, setModelLabel, keys, runnable, judgeEntry, selfFamily }) {
  const [pillarId, setPillarId] = useState("veracity");
  const cases = TEST_CASES[pillarId] || [];
  const [tc, setTc] = useState(cases[6] || cases[0]);
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState(null);
  const [error, setError] = useState("");

  async function run() {
    setError(""); setOut(null);
    if (!runnable) { setError(`Add the Anthropic judge key and the ${modelEntry.provider} key first.`); return; }
    setBusy(true);
    try {
      const scored = await scoreCase(pillar, tc, modelEntry, keys, { judgeEntry });
      setOut({ scored, response: scored.response || scored.transcript || (scored.responses ? scored.responses.join("\n\n---\n\n") : "") });
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  const pillar = PILLAR_BY_ID[pillarId];
  return (
    <div className="runner-grid">
      <div className="card card-pad">
        <ModelPicker modelLabel={modelLabel} setModelLabel={setModelLabel} keys={keys} />
        <label className="field-label mono">PILLAR</label>
        <div className="row wrap" style={{ gap: 6 }}>
          {PILLARS.map((p) => (
            <button key={p.id} className={`btn btn-sm ${pillarId === p.id ? "btn-primary" : "btn-ghost"}`}
              onClick={() => { setPillarId(p.id); setTc(TEST_CASES[p.id][0]); setOut(null); }}>{p.short}</button>
          ))}
        </div>
        <label className="field-label mono" style={{ marginTop: 16 }}>TEST CASE</label>
        <div className="case-list">
          {cases.map((c) => (
            <button key={c.id} className={`case-chip ${tc?.id === c.id ? "sel" : ""}`} onClick={() => { setTc(c); setOut(null); }} title={c.expected}>
              <span className="mono case-id">{c.id}</span> {c.prompt.slice(0, 50)}{c.prompt.length > 50 ? "…" : ""}
            </button>
          ))}
        </div>
        <label className="field-label mono" style={{ marginTop: 14 }}>PROMPT</label>
        <div className="prompt-box">{tc?.prompt}</div>
        {error && <div className="err">{error}</div>}
        <button className="btn btn-primary" style={{ marginTop: 14, width: "100%", justifyContent: "center" }} onClick={run} disabled={busy || !runnable}>
          {busy ? "Generating + judging…" : "Generate & score"}
        </button>
      </div>

      <div className="card card-pad">
        <label className="field-label mono">RESULT</label>
        {!out ? (
          <div className="result-empty">
            <div className="mono" style={{ fontSize: 40, color: "var(--line-strong)" }}>—</div>
            <p className="muted" style={{ fontSize: 13 }}>The model's real response and its judged score appear here.</p>
          </div>
        ) : (
          <div>
            <div className="result-score">
              <div className="mono result-num" style={{ color: `var(--${ratingFor(out.scored.hybridScore).token})` }}>{out.scored.hybridScore}</div>
              <div>
                <span className={`rating ${ratingFor(out.scored.hybridScore).token}`}>{ratingFor(out.scored.hybridScore).label}</span>
                <div className="muted mono" style={{ fontSize: 11, marginTop: 6 }}>{pillar.name}</div>
              </div>
            </div>
            <div className="component-row">
              <div className="component"><div className="mono" style={{ fontSize: 10.5, color: "var(--text-muted)" }}>Keyword</div><div className="mono component-val">{out.scored.heuristicScore}</div></div>
              <div className="component"><div className="mono" style={{ fontSize: 10.5, color: "var(--text-muted)" }}>LLM judge</div><div className="mono component-val">{out.scored.judgeScore}</div></div>
            </div>
            <div className="reasoning"><div className="mono field-label">JUDGE REASONING</div><p>{out.scored.judgeReasoning}</p></div>
            <div className="reasoning" style={{ marginTop: 10 }}><div className="mono field-label">{modelLabel} RESPONSE</div><p style={{ whiteSpace: "pre-wrap" }}>{out.response}</p></div>
          </div>
        )}
      </div>
    </div>
  );
}

const runnerCSS = `
.runner-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
.field-label { display: block; font-size: 10.5px; letter-spacing: 0.1em; color: var(--text-muted); margin: 16px 0 7px; }
.select { width: 100%; font-family: var(--sans); font-size: 14px; padding: 9px 11px; border: 1px solid var(--line-strong); border-radius: 8px; background: var(--paper); color: var(--text); }
.run-note { font-size: 11px; color: var(--text-muted); margin-top: 10px; }
.self-family-warn { margin-top: 12px; padding: 10px 13px; background: var(--acceptable-bg); color: #7a5a00; border-radius: 8px; font-size: 12.5px; line-height: 1.5; border-left: 3px solid var(--gold-deep); }
.err { margin-top: 12px; padding: 10px 12px; background: var(--critical-bg); color: var(--critical); border-radius: 8px; font-size: 13px; }
.prog-track { height: 8px; background: var(--paper-dim); border-radius: 4px; overflow: hidden; margin-top: 8px; }
.prog-fill { height: 100%; background: linear-gradient(90deg, var(--cardinal), var(--gold)); transition: width .2s; }
.final-score, .result-score { display: flex; align-items: center; gap: 18px; padding: 14px 0; border-top: 1px solid var(--line); }
.result-num { font-size: 52px; font-weight: 700; line-height: 1; }
.result-empty { text-align: center; padding: 44px 20px; }
.feed { display: flex; flex-direction: column; gap: 4px; max-height: 520px; overflow-y: auto; }
.feed-row { display: grid; grid-template-columns: 54px 64px 64px 1fr 12px; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 6px; background: var(--paper); font-size: 12px; }
.feed-err { background: var(--critical-bg); }
.feed-id { color: var(--cardinal); font-size: 11px; }
.feed-pillar { color: var(--text-muted); font-size: 10.5px; }
.feed-mode { color: var(--gold-deep); font-size: 9.5px; }
.feed-score { font-weight: 700; text-align: right; }
.feed-dot { width: 9px; height: 9px; border-radius: 50%; }
.feed-dot.ok { background: var(--excellent); }
.feed-dot.no { background: var(--critical); }
.case-list { display: flex; flex-direction: column; gap: 5px; max-height: 150px; overflow-y: auto; }
.case-chip { text-align: left; background: var(--paper); border: 1px solid var(--line); border-radius: 6px; padding: 7px 9px; font-size: 12px; cursor: pointer; font-family: inherit; color: var(--text); }
.case-chip.sel, .case-chip:hover { border-color: var(--cardinal); }
.case-id { color: var(--cardinal); font-size: 10.5px; margin-right: 4px; }
.prompt-box { background: var(--paper); border: 1px solid var(--line); border-radius: 8px; padding: 11px; font-size: 13.5px; }
.component-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 18px 0; }
.component-val { font-size: 24px; font-weight: 600; margin: 2px 0; }
.reasoning { background: var(--paper); border-radius: 8px; padding: 12px 14px; }
.reasoning p { margin: 4px 0 0; font-size: 13px; line-height: 1.55; color: var(--ink-soft); }
@media (max-width: 860px) { .runner-grid { grid-template-columns: 1fr; } }
`;
