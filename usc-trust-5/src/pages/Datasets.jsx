import React, { useState, useRef, useMemo } from "react";
import { PILLAR_BY_ID } from "../data/framework.js";
import { DATASET_META, ALL_DATASETS, datasetCases, parseUploadedDataset, DATASET_SCHEMA } from "../data/datasets.js";
import { scoreCase, aggregate } from "../engine/scorer.js";
import { MODEL_REGISTRY, JUDGE_REGISTRY, DEFAULT_JUDGE, isModelRunnable, familyOf, readyProviders, PROVIDER_FAMILY } from "../engine/providers.js";
import { download } from "../engine/exporters.js";
import { useAppState } from "../state/AppState.jsx";
import ApiKeyPanel from "./../components/ApiKeyPanel.jsx";

function mergeRegistry(base, discovered) {
  const out = [...base];
  const seen = new Set(base.map((m) => `${m.provider}:${m.apiModel}`));
  for (const [provider, models] of Object.entries(discovered || {})) {
    for (const m of models) {
      const key = `${provider}:${m.apiModel}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ label: m.label, provider, apiModel: m.apiModel, family: PROVIDER_FAMILY[provider] });
    }
  }
  return out;
}

export default function Datasets() {
  const { keys, discoveredModels, addResult } = useAppState();
  const models = useMemo(() => mergeRegistry(MODEL_REGISTRY, discoveredModels), [discoveredModels]);
  const judges = useMemo(() => mergeRegistry(JUDGE_REGISTRY, discoveredModels), [discoveredModels]);
  const ready = readyProviders(keys);
  const [modelLabel, setModelLabel] = useState("GPT-4o");
  const [judgeLabel, setJudgeLabel] = useState("Claude 3.5 Haiku");
  const [selected, setSelected] = useState(["xstest", "truthfulqa"]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  // Full datasets uploaded by the user: { datasetId: { cases, count, fileName } }
  const [uploaded, setUploaded] = useState({});
  const abortRef = useRef(null);

  const modelEntry = models.find((m) => m.label === modelLabel) || models[0];
  const judgeEntry = judges.find((j) => j.label === judgeLabel) || DEFAULT_JUDGE;
  const runnable = isModelRunnable(modelEntry, keys, judgeEntry);
  const selfFamily = familyOf(judgeEntry) === familyOf(modelEntry);

  // Use uploaded full set if present, else the built-in sample.
  function casesFor(dsid) {
    return uploaded[dsid]?.cases?.length ? uploaded[dsid].cases : datasetCases(dsid);
  }

  const battery = useMemo(() => {
    const out = [];
    for (const dsid of selected) {
      const meta = DATASET_META[dsid];
      const pillar = PILLAR_BY_ID[meta.mapsTo.pillar];
      for (const tc of casesFor(dsid)) out.push({ pillar, testCase: tc, datasetId: dsid });
    }
    return out;
  }, [selected, uploaded]);

  function downloadTemplate(dsid) {
    const schema = DATASET_SCHEMA[dsid];
    download(`${dsid}-template.csv`, schema.template, "text/csv");
  }

  function handleUpload(dsid, file) {
    setError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const { cases, count, errors } = parseUploadedDataset(dsid, e.target.result);
        if (errors.length) { setError(`${DATASET_META[dsid].name}: ${errors[0]}`); return; }
        setUploaded((u) => ({ ...u, [dsid]: { cases, count, fileName: file.name } }));
        setResults(null);
      } catch (err) { setError(`Could not parse ${file.name}: ${err.message}`); }
    };
    reader.onerror = () => setError(`Could not read ${file.name}.`);
    reader.readAsText(file);
  }

  function clearUpload(dsid) {
    setUploaded((u) => { const n = { ...u }; delete n[dsid]; return n; });
    setResults(null);
  }

  function toggle(dsid) {
    setSelected((s) => (s.includes(dsid) ? s.filter((x) => x !== dsid) : [...s, dsid]));
    setResults(null);
  }

  async function start() {
    setError(""); setResults(null);
    if (!runnable) { setError("Add the target and judge provider keys first."); return; }
    if (!battery.length) { setError("Select at least one dataset."); return; }
    setRunning(true);
    const ctrl = new AbortController(); abortRef.current = ctrl;
    const perTest = [];
    try {
      for (let i = 0; i < battery.length; i++) {
        if (ctrl.signal.aborted) throw new Error("Cancelled.");
        const { pillar, testCase, datasetId } = battery[i];
        setProgress({ done: i, total: battery.length, current: testCase.id });
        let row;
        try {
          row = await scoreCase(pillar, testCase, modelEntry, keys, { judgeEntry, signal: ctrl.signal });
          row.datasetId = datasetId;
        } catch (e) {
          row = { pillarId: pillar.id, testId: testCase.id, hybridScore: 0, judgeScore: 0, heuristicScore: 0, pass: false, errored: true, judgeReasoning: e.message, datasetId };
        }
        perTest.push(row);
      }
      setProgress({ done: battery.length, total: battery.length });
      // Aggregate per dataset
      const byDataset = {};
      for (const r of perTest) (byDataset[r.datasetId] ||= []).push(r);
      const summary = {};
      for (const [dsid, rows] of Object.entries(byDataset)) {
        const valid = rows.filter((r) => !r.errored);
        const mean = valid.length ? valid.reduce((a, r) => a + r.hybridScore, 0) / valid.length : 0;
        summary[dsid] = { mean: Math.round(mean * 10) / 10, passed: valid.filter((r) => r.pass).length, total: rows.length };
      }
      const record = aggregate(`${modelEntry.label} (validated datasets)`, PROVIDER_FAMILY[modelEntry.provider], perTest);
      setResults({ perTest, summary, record });
      addResult(record);
    } catch (e) { setError(e.message); }
    finally { setRunning(false); }
  }
  function stop() { abortRef.current?.abort(); }

  const pct = progress ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <section className="section"><div className="container">
      <div className="section-head">
        <div className="eyebrow">Validated benchmarks</div>
        <h2>Published-dataset evaluation</h2>
        <p>
          Run the model against real, peer-reviewed safety and trust benchmarks instead of reconstructed
          prompts. Each dataset uses its own published criterion. These are curated samples of the full
          datasets (cited below); the complete sets can be loaded from the linked repositories for a full study.
        </p>
      </div>

      <div style={{ marginBottom: 16 }}><ApiKeyPanel /></div>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="ds-config">
          <div>
            <label className="field-label mono">TARGET MODEL</label>
            <select className="select" value={modelLabel} onChange={(e) => setModelLabel(e.target.value)}>
              {models.map((m) => <option key={m.label} value={m.label}>{m.label}{ready[m.provider] ? "" : " (add key)"}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label mono">JUDGE (cross-family recommended)</label>
            <select className="select" value={judgeLabel} onChange={(e) => setJudgeLabel(e.target.value)}>
              {judges.map((j) => <option key={j.label} value={j.label}>{j.label} ({j.family}){ready[j.provider] ? "" : " (add key)"}</option>)}
            </select>
          </div>
        </div>
        {selfFamily && <div className="ds-warn">Judge shares the target's family. Cross-family is recommended for validated benchmarks.</div>}
      </div>

      <div className="ds-cards">
        {ALL_DATASETS.map((dsid) => {
          const m = DATASET_META[dsid];
          const on = selected.includes(dsid);
          const up = uploaded[dsid];
          const n = casesFor(dsid).length;
          return (
            <div key={dsid} className={`ds-card ${on ? "on" : ""}`}>
              <div className="ds-card-click" onClick={() => toggle(dsid)} role="button" tabIndex={0}>
                <div className="ds-card-top">
                  <span className="ds-name">{m.name}</span>
                  <span className="ds-check">{on ? "✓" : ""}</span>
                </div>
                <div className="ds-measures">{m.measures}</div>
                <div className="mono ds-meta">{m.paper}</div>
                <div className="mono ds-meta">
                  {up
                    ? <span style={{ color: "var(--excellent)" }}>{n} items · FULL set uploaded ({up.fileName})</span>
                    : <span>{n} items (of {m.fullSize}) · sample · {m.license}</span>}
                </div>
                <div className="mono ds-map">→ {PILLAR_BY_ID[m.mapsTo.pillar]?.short} / V2: {m.mapsTo.v2}</div>
              </div>
              <div className="ds-upload">
                <button className="btn btn-ghost btn-xs" onClick={() => downloadTemplate(dsid)} title="Download a CSV template with the exact columns">↓ template</button>
                <label className="btn btn-ghost btn-xs" style={{ cursor: "pointer" }}>
                  ↑ upload full CSV
                  <input type="file" accept=".csv,text/csv" style={{ display: "none" }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(dsid, f); e.target.value = ""; }} />
                </label>
                {up && <button className="btn btn-ghost btn-xs" onClick={() => clearUpload(dsid)} title="Revert to the built-in sample">↺ sample</button>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="ds-upload-help mono">
        To run the full benchmarks: download a dataset from its repo (XSTest: paul-rottger/xstest · CrowS-Pairs: nyu-mll/crows-pairs · TruthfulQA: truthfulqa/truthful_qa), then upload its CSV here. Use "↓ template" to see the exact columns expected. Uploaded data stays in your browser for this session.
      </div>

      {error && <div className="ds-err">{error}</div>}

      <div style={{ marginTop: 16 }}>
        {!running ? (
          <button className="btn btn-primary" onClick={start} disabled={!runnable || !battery.length}>
            Run {battery.length} items{Object.keys(uploaded).length ? " (incl. full uploaded sets)" : ""}
          </button>
        ) : (
          <button className="btn btn-ghost" onClick={stop}>Stop</button>
        )}
        {progress && (
          <div style={{ marginTop: 12 }}>
            <div className="row" style={{ justifyContent: "space-between", fontSize: 12 }}>
              <span className="mono">{progress.done}/{progress.total}</span>
              <span className="mono muted">{progress.current}</span>
            </div>
            <div className="prog-track"><div className="prog-fill" style={{ width: `${pct}%` }} /></div>
          </div>
        )}
      </div>

      {results && (
        <div className="card card-pad" style={{ marginTop: 18 }}>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
            <h3 style={{ fontSize: 18 }}>Results on validated benchmarks</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => download(`validated-${modelEntry.label}.json`, JSON.stringify(results, null, 2), "application/json")}>↓ JSON</button>
          </div>
          <div className="ds-results">
            {Object.entries(results.summary).map(([dsid, s]) => (
              <div key={dsid} className="ds-result">
                <div className="ds-result-name">{DATASET_META[dsid].name}</div>
                <div className="ds-result-score">{s.mean}</div>
                <div className="mono ds-result-pass">{s.passed}/{s.total} pass</div>
              </div>
            ))}
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
            Added to the leaderboard as "{modelEntry.label} (validated datasets)". These scores rest on
            published items, so they are the most defensible numbers the platform produces.
          </p>
        </div>
      )}

      <style>{dsCSS}</style>
    </div></section>
  );
}

const dsCSS = `
.ds-config { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.ds-warn { margin-top: 10px; font-size: 12px; color: #7a5a00; background: var(--acceptable-bg); padding: 8px 11px; border-radius: 6px; }
.ds-err { margin-top: 12px; font-size: 13px; color: var(--critical); background: var(--critical-bg); padding: 10px 12px; border-radius: 8px; }
.ds-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.ds-card { text-align: left; background: var(--paper); border: 1.5px solid var(--line); border-radius: 10px; padding: 14px; font-family: inherit; transition: border-color .15s; }
.ds-card.on { border-color: var(--cardinal); background: var(--white, #fff); }
.ds-card-click { cursor: pointer; }
.ds-upload { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--line); }
.btn-xs { font-size: 10.5px; padding: 3px 8px; }
.ds-upload-help { font-size: 10.5px; color: var(--text-muted); margin-top: 12px; line-height: 1.5; }
.ds-card-top { display: flex; justify-content: space-between; align-items: center; }
.ds-name { font-weight: 700; font-size: 15px; }
.ds-check { color: var(--cardinal); font-weight: 700; }
.ds-measures { font-size: 12.5px; color: var(--ink-soft, #444); margin: 6px 0; }
.ds-meta { font-size: 10.5px; color: var(--text-muted); }
.ds-map { font-size: 10.5px; color: var(--cardinal); margin-top: 4px; }
.prog-track { height: 8px; background: var(--paper-dim); border-radius: 4px; overflow: hidden; }
.prog-fill { height: 100%; background: linear-gradient(90deg, var(--cardinal), var(--gold)); transition: width .2s; }
.ds-results { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.ds-result { background: var(--paper); border: 1px solid var(--line); border-radius: 10px; padding: 14px; text-align: center; }
.ds-result-name { font-size: 12px; color: var(--text-muted); }
.ds-result-score { font-family: var(--mono); font-size: 30px; font-weight: 700; margin: 4px 0; }
.ds-result-pass { font-size: 11px; color: var(--text-muted); }
@media (max-width: 760px) { .ds-config, .ds-cards, .ds-results { grid-template-columns: 1fr; } }
`;
