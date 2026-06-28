import React, { useState, useMemo } from "react";
import { PILLAR_BY_ID } from "../data/framework.js";
import { criterionFor, renderCriterion } from "../engine/judgeCriteria.js";
import { compareRatings } from "../engine/agreement.js";
import { download } from "../engine/exporters.js";
import { useAppState } from "../state/AppState.jsx";

// Human-review layer: a reviewer scores the same responses the LLM judge scored,
// using the SAME explicit criteria, then we compute human vs LLM agreement (kappa).
export default function HumanReview() {
  const { liveResults } = useAppState();
  const reviewable = liveResults.filter((r) => Array.isArray(r.perTest) && r.perTest.some((t) => t.response || t.transcript || t.responses));
  const [modelLabel, setModelLabel] = useState(reviewable[0]?.model || "");
  const record = reviewable.find((r) => r.model === modelLabel) || reviewable[0];

  // human scores keyed by testId: { [testId]: 0 | 100 | null }  (Fail=0, Pass=100)
  const [scores, setScores] = useState({});
  const [report, setReport] = useState(null);

  const cases = useMemo(() => {
    if (!record) return [];
    return record.perTest.filter((t) => !t.errored && (t.response || t.transcript || (t.responses && t.responses.length)));
  }, [record]);

  function setScore(testId, val) {
    setScores((s) => ({ ...s, [testId]: val }));
    setReport(null);
  }

  function computeAgreement() {
    const pairs = cases
      .filter((t) => scores[t.testId] != null)
      .map((t) => ({ testId: t.testId, pillarId: t.pillarId, llmScore: t.judgeScore ?? t.hybridScore, humanScore: scores[t.testId] }));
    setReport(compareRatings(pairs));
  }

  function exportForRaters() {
    // CSV a human rater can fill offline, with the criteria column included.
    const rows = [["testId", "pillar", "subcategory", "criterion_check", "prompt", "model_response", "llm_score", "human_score_0to100"]];
    for (const t of cases) {
      const pillar = PILLAR_BY_ID[t.pillarId];
      const crit = criterionFor(t.pillarId, t.aspect);
      const text = t.response || t.transcript || (t.responses ? t.responses.join(" || ") : "");
      rows.push([
        t.testId, pillar?.short || t.pillarId, crit?.subcategory || "", crit?.check || "",
        (t.prompt || "").replace(/\n/g, " "), text.replace(/\n/g, " ").slice(0, 1000),
        t.judgeScore ?? "", "",
      ]);
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    download(`human-review-${record.model}.csv`, csv, "text/csv");
  }

  const scoredCount = cases.filter((t) => scores[t.testId] != null).length;

  if (!reviewable.length) {
    return (
      <section className="section"><div className="container">
        <div className="section-head">
          <div className="eyebrow">Human review</div>
          <h2>Human + LLM agreement</h2>
          <p>
            Run a full evaluation first (Evaluation Runner). Once a run has stored its responses, you can score
            the same responses here as a human reviewer, and the platform will compute how closely the human and
            the LLM judge agree (Cohen's kappa). That agreement is the validation step the framework needs.
          </p>
        </div>
      </div></section>
    );
  }

  return (
    <section className="section"><div className="container">
      <div className="section-head">
        <div className="eyebrow">Human review · LLM + human</div>
        <h2>Human vs LLM-judge agreement</h2>
        <p>
          Score each response yourself using the same explicit criterion the LLM judge used. The platform then
          computes raw agreement and Cohen's kappa between you and the judge. High agreement validates the LLM
          judge; systematic gaps (especially the judge passing what a human fails) reveal where it is unreliable.
        </p>
      </div>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="row wrap" style={{ gap: 14, alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ flex: "1 1 240px" }}>
            <label className="field-label mono">RUN TO REVIEW</label>
            <select className="select" value={modelLabel} onChange={(e) => { setModelLabel(e.target.value); setScores({}); setReport(null); }}>
              {reviewable.map((r) => <option key={r.model} value={r.model}>{r.model} · judge {r.judge || "default"} ({r.perTest.length} tests)</option>)}
            </select>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={exportForRaters}>↓ CSV for offline raters</button>
            <button className="btn btn-primary btn-sm" disabled={scoredCount < 2} onClick={computeAgreement}>
              Compute agreement ({scoredCount} scored)
            </button>
          </div>
        </div>
      </div>

      {report && <AgreementReport report={report} model={record.model} judge={record.judge} />}

      <div className="hr-list">
        {cases.map((t) => {
          const pillar = PILLAR_BY_ID[t.pillarId];
          const crit = criterionFor(t.pillarId, t.aspect);
          const text = t.response || t.transcript || (t.responses ? t.responses.join("\n\n--- run ---\n\n") : "");
          const human = scores[t.testId];
          const llmPass = (t.judgeScore ?? t.hybridScore) >= 51;
          return (
            <div key={t.testId} className="hr-card">
              <div className="hr-head">
                <span className="mono hr-id">{t.testId}</span>
                <span className="mono hr-pillar">{pillar?.short}</span>
                {crit && <span className="mono hr-sub">{crit.subcategory}</span>}
                <span className="mono hr-llm" style={{ color: `var(--${llmPass ? "excellent" : "critical"})` }}>
                  LLM: {t.judgeScore ?? t.hybridScore} ({llmPass ? "pass" : "fail"})
                </span>
              </div>
              {crit && <div className="hr-crit mono">CHECK: {crit.check}</div>}
              <div className="hr-prompt"><strong>Prompt:</strong> {t.prompt || "(multi-turn / see response)"}</div>
              <div className="hr-resp">{text.slice(0, 1200)}{text.length > 1200 ? "…" : ""}</div>
              <div className="hr-actions">
                <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>YOUR VERDICT:</span>
                <button className={`btn btn-sm ${human === 100 ? "btn-primary" : "btn-ghost"}`} onClick={() => setScore(t.testId, 100)}>Pass</button>
                <button className={`btn btn-sm ${human === 0 ? "btn-primary" : "btn-ghost"}`} onClick={() => setScore(t.testId, 0)}>Fail</button>
                {human != null && <button className="btn btn-ghost btn-sm" onClick={() => setScore(t.testId, null)}>clear</button>}
                {human != null && llmPass !== (human === 100) && <span className="hr-disagree mono">disagrees with LLM</span>}
              </div>
            </div>
          );
        })}
      </div>

      <style>{hrCSS}</style>
    </div></section>
  );
}

function AgreementReport({ report, model, judge }) {
  if (!report) return null;
  const k = report.cohensKappa;
  const kColor = k == null ? "var(--text-muted)" : k >= 0.6 ? "var(--excellent)" : k >= 0.4 ? "var(--acceptable)" : "var(--critical)";
  const c = report.confusion;
  return (
    <div className="card card-pad" style={{ marginBottom: 18 }}>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <h3 style={{ fontSize: 18 }}>Agreement: human vs {judge || "LLM judge"}</h3>
        <button className="btn btn-ghost btn-sm" onClick={() => download(`agreement-${model}.json`, JSON.stringify(report, null, 2), "application/json")}>↓ JSON</button>
      </div>
      <div className="agree-grid">
        <div className="agree-stat"><div className="agree-num" style={{ color: kColor }}>{k == null ? "n/a" : k}</div><div className="agree-label">Cohen's κ<br /><span className="mono">{report.kappaLabel}</span></div></div>
        <div className="agree-stat"><div className="agree-num">{Math.round(report.rawAgreement * 100)}%</div><div className="agree-label">Raw agreement</div></div>
        <div className="agree-stat"><div className="agree-num">{report.meanAbsDiff}</div><div className="agree-label">Mean abs. diff (0-100)</div></div>
        <div className="agree-stat"><div className="agree-num">{report.n}</div><div className="agree-label">Items scored</div></div>
      </div>
      <div className="agree-confusion mono">
        Both pass: {c.bothPass} · Both fail: {c.bothFail} ·
        <span style={{ color: "var(--critical)" }}> LLM pass / human fail: {c.llmPassHumanFail}</span> ·
        LLM fail / human pass: {c.llmFailHumanPass}
      </div>
      {c.llmPassHumanFail > c.llmFailHumanPass && (
        <p className="muted" style={{ fontSize: 12.5, marginTop: 8 }}>
          The LLM judge passed more items than the human did. If this pattern holds at scale, it indicates the
          judge is more lenient than human reviewers, which is exactly the kind of finding to report.
        </p>
      )}
    </div>
  );
}

const hrCSS = `
.hr-list { display: flex; flex-direction: column; gap: 12px; }
.hr-card { background: var(--paper); border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; }
.hr-head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 6px; }
.hr-id { color: var(--cardinal); font-size: 12px; }
.hr-pillar { font-size: 10.5px; color: var(--text-muted); }
.hr-sub { font-size: 10px; color: var(--gold-deep); background: var(--paper-dim); padding: 1px 6px; border-radius: 4px; }
.hr-llm { font-size: 11px; margin-left: auto; }
.hr-crit { font-size: 11px; color: var(--text-muted); margin-bottom: 6px; }
.hr-prompt { font-size: 13px; margin-bottom: 6px; }
.hr-resp { font-size: 12.5px; color: var(--ink-soft, #333); background: var(--white, #fff); border: 1px solid var(--line); border-radius: 6px; padding: 9px 11px; white-space: pre-wrap; max-height: 220px; overflow-y: auto; }
.hr-actions { display: flex; align-items: center; gap: 8px; margin-top: 10px; }
.hr-disagree { font-size: 10.5px; color: var(--critical); }
.agree-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 12px; }
.agree-stat { background: var(--paper); border: 1px solid var(--line); border-radius: 10px; padding: 14px; text-align: center; }
.agree-num { font-family: var(--mono); font-size: 28px; font-weight: 700; line-height: 1.1; }
.agree-label { font-size: 11px; color: var(--text-muted); margin-top: 6px; }
.agree-confusion { font-size: 11.5px; color: var(--text-muted); padding: 8px 10px; background: var(--paper); border-radius: 6px; }
@media (max-width: 760px) { .agree-grid { grid-template-columns: repeat(2, 1fr); } }
`;
