import React, { useState, useRef, useMemo } from "react";
import { PILLARS, PILLAR_BY_ID, ratingFor } from "../data/framework.js";
import { TEST_CASES } from "../data/testCases.js";
import { buildBattery } from "../engine/scorer.js";
import { runBiasHarness } from "../engine/biasHarness.js";
import { download } from "../engine/exporters.js";
import { useAppState } from "../state/AppState.jsx";

// Multi-judge panel: pick a target + 2-3 judges, run, see agreement + inflation.
export default function BiasHarness({ models, judges: allJudges, keys, ready }) {
  const { addBiasReport } = useAppState();
  const [modelLabel, setModelLabel] = useState(models[0]?.label || "");
  const [selectedJudges, setSelectedJudges] = useState([]);
  const [scope, setScope] = useState("sample"); // "sample" (12) | "full" (93)
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(null);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const abortRef = useRef(null);

  const modelEntry = models.find((m) => m.label === modelLabel) || models[0];
  // Judges available are those whose provider key is present.
  const judgeOptions = useMemo(() => allJudges.filter((j) => ready[j.provider]), [allJudges, ready]);
  const judges = useMemo(() => allJudges.filter((j) => selectedJudges.includes(j.label)), [allJudges, selectedJudges]);

  // A representative sample: ~1-2 tests per pillar for a fast, cheap bias check.
  const battery = useMemo(() => {
    const full = buildBattery(TEST_CASES);
    if (scope === "full") return full;
    const perPillar = {};
    const sample = [];
    for (const item of full) {
      const c = perPillar[item.pillar.id] || 0;
      if (c < 2) { sample.push(item); perPillar[item.pillar.id] = c + 1; }
    }
    return sample;
  }, [scope]);

  const toggleJudge = (label) =>
    setSelectedJudges((s) => (s.includes(label) ? s.filter((x) => x !== label) : [...s, label]));

  const canRun = modelEntry && ready[modelEntry.provider] && judges.length >= 2;

  async function start() {
    setError(""); setReport(null);
    if (!canRun) { setError("Pick a target model (key present) and at least 2 judges from different keys."); return; }
    setRunning(true);
    const ctrl = new AbortController(); abortRef.current = ctrl;
    try {
      const rep = await runBiasHarness(modelEntry, battery, judges, keys, {
        signal: ctrl.signal,
        onProgress: setProgress,
      });
      setReport(rep);
      addBiasReport(rep);
    } catch (e) { setError(e.message); }
    finally { setRunning(false); }
  }
  function stop() { abortRef.current?.abort(); }

  const pct = progress ? Math.round((progress.done / progress.total) * 100) : 0;
  const families = new Set(judges.map((j) => j.family));
  const hasCrossFamily = families.size >= 2;
  const hasSelfFamily = judges.some((j) => j.family === modelEntry?.family);

  return (
    <div>
      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
          <h3 style={{ fontSize: 16 }}>Multi-judge bias harness</h3>
          <span className="pill">research mode</span>
        </div>
        <p className="muted" style={{ fontSize: 12.5, margin: "0 0 14px" }}>
          Each response is generated <strong>once</strong>, then scored by every selected judge. This isolates
          judge disagreement on identical text, and measures whether a model's <strong>own-family</strong> judge
          inflates its score versus independent judges. Select 2–3 judges, ideally from different companies.
        </p>

        <div className="bias-cfg">
          <div>
            <label className="field-label mono">TARGET MODEL</label>
            <select className="select" value={modelLabel} onChange={(e) => setModelLabel(e.target.value)}>
              {models.map((m) => <option key={m.label} value={m.label}>{m.label}{ready[m.provider] ? "" : " (add key)"}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label mono">SCOPE</label>
            <div className="row" style={{ gap: 6 }}>
              <button className={`btn btn-sm ${scope === "sample" ? "btn-primary" : "btn-ghost"}`} onClick={() => setScope("sample")}>Sample (~16)</button>
              <button className={`btn btn-sm ${scope === "full" ? "btn-primary" : "btn-ghost"}`} onClick={() => setScope("full")}>Full (93)</button>
            </div>
          </div>
        </div>

        <label className="field-label mono" style={{ marginTop: 14 }}>JUDGES (pick 2–3, from different companies for the cleanest result)</label>
        {judgeOptions.length < 2 && (
          <div className="bias-warn">Add keys for at least two providers to compare judges across companies. With one key you can only select same-company judges.</div>
        )}
        <div className="row wrap" style={{ gap: 6 }}>
          {allJudges.map((j) => {
            const enabled = ready[j.provider];
            const on = selectedJudges.includes(j.label);
            return (
              <button key={j.label} disabled={!enabled}
                className={`btn btn-sm ${on ? "btn-primary" : "btn-ghost"}`}
                style={!enabled ? { opacity: 0.4, cursor: "not-allowed" } : {}}
                onClick={() => toggleJudge(j.label)}>
                {j.label} ({j.family}){enabled ? "" : " (add key)"}
              </button>
            );
          })}
        </div>

        {judges.length > 0 && (
          <div className="mono" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 10 }}>
            {judges.length} judge{judges.length > 1 ? "s" : ""} · families: {[...families].join(", ")}
            {hasSelfFamily && <span style={{ color: "var(--acceptable)" }}> · includes same-family judge (needed to measure inflation)</span>}
            {!hasCrossFamily && judges.length >= 2 && <span style={{ color: "var(--critical)" }}> · all same family, add a different company to measure bias</span>}
          </div>
        )}

        {error && <div className="bias-err">{error}</div>}

        {!running ? (
          <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={start} disabled={!canRun}>
            Run bias harness ({battery.length} tests × {judges.length || 0} judges = {battery.length * (judges.length || 0)} judge calls)
          </button>
        ) : (
          <button className="btn btn-ghost" style={{ marginTop: 14 }} onClick={stop}>Stop</button>
        )}

        {progress && (
          <div style={{ marginTop: 14 }}>
            <div className="row" style={{ justifyContent: "space-between", fontSize: 12 }}>
              <span className="mono">{progress.done}/{progress.total}</span>
              <span className="mono muted">{progress.current?.testId} · {progress.current?.phase}</span>
            </div>
            <div className="prog-track"><div className="prog-fill" style={{ width: `${pct}%` }} /></div>
          </div>
        )}
      </div>

      {report && <BiasReport report={report} />}

      <style>{biasCSS}</style>
    </div>
  );
}

function BiasReport({ report }) {
  const inf = report.selfFamilyInflation;
  return (
    <div className="card card-pad">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
        <h3 style={{ fontSize: 18 }}>Bias report · {report.model}</h3>
        <button className="btn btn-ghost btn-sm" onClick={() => download(`bias-${report.model}.json`, JSON.stringify(report, null, 2), "application/json")}>↓ JSON</button>
      </div>

      {/* Headline: self-family inflation */}
      {inf ? (
        <div className={`inflation-card ${inf.meanDelta > 0 ? "high" : "low"}`}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: "0.1em", opacity: 0.8 }}>SELF-FAMILY INFLATION</div>
          <div className="row" style={{ alignItems: "baseline", gap: 10, marginTop: 4 }}>
            <span className="mono inflation-num">{inf.meanDelta > 0 ? "+" : ""}{inf.meanDelta}</span>
            <span style={{ fontSize: 13 }}>points</span>
          </div>
          <p style={{ fontSize: 13, margin: "8px 0 0", lineHeight: 1.5 }}>
            <strong>{inf.selfJudge}</strong> ({inf.selfFamily}), which shares the target's family, scored it{" "}
            <strong>{inf.meanDelta > 0 ? `${inf.meanDelta} points higher` : `${Math.abs(inf.meanDelta)} points lower`}</strong>{" "}
            on average than the independent judges ({inf.crossJudges.join(", ")}), on identical responses (n={inf.n}).
            {inf.meanDelta > 3 && " This is the self-preference effect the framework's bias controls are designed to surface."}
          </p>
        </div>
      ) : (
        <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
          No same-family judge was included, so self-family inflation can't be measured. Add a judge from the
          target's own company alongside the cross-family judges to quantify it.
        </div>
      )}

      {/* Per-judge means */}
      <div className="mono field-label" style={{ marginTop: 18 }}>PER-JUDGE MEAN SCORE (same responses)</div>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>Judge</th><th>Family</th><th>Mean score</th><th>Tests</th><th></th></tr></thead>
          <tbody>
            {Object.entries(report.judgeMeans).map(([label, m]) => (
              <tr key={label}>
                <td style={{ fontWeight: 600 }}>{label}</td>
                <td className="mono">{m.family}</td>
                <td className="num score-cell" style={{ color: m.mean != null ? `var(--${ratingFor(m.mean).token})` : "var(--text-faint)" }}>{m.mean ?? "–"}</td>
                <td className="num">{m.n}</td>
                <td>{m.selfFamily && <span className="pill" style={{ background: "var(--acceptable-bg)", color: "#7a5a00" }}>self-family</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Inter-judge agreement */}
      <div className="mono field-label" style={{ marginTop: 18 }}>INTER-JUDGE AGREEMENT</div>
      <p className="muted" style={{ fontSize: 12.5, margin: "0 0 8px" }}>
        Mean pairwise correlation r = <strong>{report.meanInterJudgeR ?? "n/a"}</strong> ·
        mean score spread across judges = <strong>{report.meanScoreSpread}</strong> points.
        Lower spread / higher r = judges agree more. A judge that diverges only when it shares the target's
        family is the fingerprint of bias.
      </p>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>Judge A</th><th>Judge B</th><th>Correlation r</th><th>Mean abs. diff</th><th>n</th></tr></thead>
          <tbody>
            {report.pairwise.map((p, i) => (
              <tr key={i}>
                <td>{p.judgeA}</td><td>{p.judgeB}</td>
                <td className="num">{p.r ?? "–"}</td>
                <td className="num">{p.meanAbsDiff ?? "–"}</td>
                <td className="num">{p.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="muted" style={{ fontSize: 11.5, marginTop: 14 }}>
        {report.nValid}/{report.nTests} tests scored{report.nErrored ? ` · ${report.nErrored} errored` : ""}.
        Method: each response generated once, scored blind by every judge at temperature 0. Export the JSON for
        the full per-test judge-by-judge breakdown.
      </p>
    </div>
  );
}

const biasCSS = `
.bias-cfg { display: grid; grid-template-columns: 1fr auto; gap: 16px; align-items: start; }
.field-label { display: block; font-size: 10.5px; letter-spacing: 0.1em; color: var(--text-muted); margin: 0 0 7px; }
.select { width: 100%; font-family: var(--sans); font-size: 14px; padding: 9px 11px; border: 1px solid var(--line-strong); border-radius: 8px; background: var(--paper); color: var(--text); }
.bias-warn { background: var(--acceptable-bg); color: #7a5a00; font-size: 12.5px; padding: 9px 12px; border-radius: 8px; margin-bottom: 10px; }
.bias-err { margin-top: 12px; padding: 10px 12px; background: var(--critical-bg); color: var(--critical); border-radius: 8px; font-size: 13px; }
.prog-track { height: 8px; background: var(--paper-dim); border-radius: 4px; overflow: hidden; margin-top: 8px; }
.prog-fill { height: 100%; background: linear-gradient(90deg, var(--cardinal), var(--gold)); transition: width .2s; }
.inflation-card { border-radius: 12px; padding: 18px; border: 1px solid; }
.inflation-card.high { background: var(--acceptable-bg); border-color: var(--acceptable); color: #6b4e00; }
.inflation-card.low { background: var(--excellent-bg); border-color: var(--excellent); color: #145239; }
.inflation-num { font-size: 40px; font-weight: 700; font-family: var(--mono); line-height: 1; }
@media (max-width: 700px) { .bias-cfg { grid-template-columns: 1fr; } }
`;
