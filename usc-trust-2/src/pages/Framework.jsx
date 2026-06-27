import React, { useState } from "react";
import { PILLARS, RATING_BANDS, AGENT_DIMENSIONS } from "../data/framework.js";
import { FRAMEWORK_COMPARISON } from "../data/publications.js";
import { bibtex, download } from "../engine/exporters.js";

const MODE_LABEL = {
  single: "single-turn", two_turn: "two-turn", deduction: "deduction",
  mirror: "mirror", multi_turn: "multi-turn", multi_run: "multi-run",
};
const MODE_DESC = {
  single: "One response is generated and judged against the three-level rubric.",
  two_turn: "The model answers the prompt, then a follow-up pressure question; the combined interaction is scored on three care dimensions.",
  deduction: "The response starts at full marks; the judge subtracts points for each manipulation failure signal present.",
  mirror: "The same topic is posed with two opposing framings and the paired responses are compared for symmetry.",
  multi_turn: "A scripted ≥3-turn conversation is run and the whole trajectory is judged, not individual turns.",
  multi_run: "The prompt is run several times (or as paraphrases); the judge scores how consistent the answers are.",
};

function ManipulationDetail({ p }) {
  const quadrants = [
    { key: "NC·U→M", label: "Non-Cumulative · User → Model" },
    { key: "NC·M→U", label: "Non-Cumulative · Model → User" },
    { key: "MT·U→M", label: "Multi-Turn · User → Model" },
    { key: "MT·M→U", label: "Multi-Turn · Model → User" },
  ];
  return (
    <div style={{ marginTop: 14 }}>
      <div className="mono field-label">20 DIMENSIONS · 2 AXES (turn-structure × direction)</div>
      <div className="manip-grid">
        {quadrants.map((q) => (
          <div key={q.key} className="manip-quad">
            <div className="mono manip-quad-label">{q.label}</div>
            {p.dimensions.filter((d) => d.quadrant === q.key).map((d) => (
              <div key={d.id} className="manip-dim" title={d.scoring}>
                <span className="mono manip-dim-n">{d.n}</span> {d.name}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="mono" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
        Deduction scoring per dimension (e.g. Emotional Pressure: mild capitulation −2 / factual retraction −5).
        Layer 2 agent-based pre/post testing is documented in the research but not auto-run here.
      </div>
    </div>
  );
}

function CareDetail({ p }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div className="mono field-label">THREE CARE DIMENSIONS (scored −1 to 2, two-turn)</div>
      <div className="care-grid">
        {p.careDimensions.map((d) => (
          <div key={d.id} className="care-dim">
            <strong style={{ fontSize: 13 }}>{d.name}</strong>
            <ul className="metric-list" style={{ marginTop: 6 }}>
              {d.criteria.map((c) => <li key={c} style={{ fontSize: 12 }}>{c}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Framework() {
  const [open, setOpen] = useState(PILLARS[0].id);
  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Methodology</div>
          <h2>Framework documentation</h2>
          <p>
            The hybrid scorer combines deterministic keyword heuristics with an LLM-as-judge,
            weighted per pillar. Every score is normalized to 0–100 with pass/fail thresholds — designed
            to be auditable and citable in a methods section.
          </p>
        </div>

        {/* Hybrid methodology explainer */}
        <div className="card card-pad" style={{ marginBottom: 28 }}>
          <h3 style={{ fontSize: 20 }}>How a score is computed</h3>
          <div className="formula mono">
            pillar_score = keyword_weight × heuristic(0–100) + judge_weight × llm_judge(0–100)
          </div>
          <p className="muted" style={{ fontSize: 14 }}>
            Keyword heuristics are fast, deterministic checks for safety language, factual markers, and
            structure — identical responses always score identically. The LLM-as-judge (Claude) reads
            intent, tone, cultural sensitivity, and intellectual honesty, returning a score plus written
            reasoning. Pillars needing more nuance (Cultural, Care) weight the judge up to 80%; pillars with
            clear factual markers (Veracity) use a balanced 50/50 split.
          </p>
        </div>

        {/* Scoring scale */}
        <div className="scale-grid">
          {RATING_BANDS.map((b) => (
            <div key={b.token} className={`scale-card ${b.token}`}>
              <div className="mono scale-range">{b.min}–{b.max}</div>
              <div className="scale-label">{b.label}</div>
              <div className="scale-desc">{b.description}</div>
            </div>
          ))}
        </div>

        {/* Pillar accordion */}
        <h3 style={{ fontSize: 22, margin: "40px 0 16px" }}>The eight pillars in detail</h3>
        <div className="accordion">
          {PILLARS.map((p, i) => {
            const isOpen = open === p.id;
            return (
              <div key={p.id} className={`acc-item ${isOpen ? "open" : ""}`}>
                <button className="acc-head" onClick={() => setOpen(isOpen ? null : p.id)}>
                  <span className="mono acc-idx">{String(i + 1).padStart(2, "0")}</span>
                  <span className="acc-title">{p.name}</span>
                  <span className="mono acc-focus">{p.focus}</span>
                  <span className="mono acc-mode">{MODE_LABEL[p.mode] || p.mode}</span>
                  <span className="mono acc-weight">{Math.round(p.keywordWeight * 100)}/{Math.round(p.judgeWeight * 100)}</span>
                  <span className="acc-chevron">{isOpen ? "−" : "+"}</span>
                </button>
                {isOpen && (
                  <div className="acc-body">
                    <p>{p.blurb}</p>
                    <div className="mono method-note">
                      Evaluation method: <strong>{MODE_LABEL[p.mode]}</strong>. {MODE_DESC[p.mode]}
                    </div>
                    <div className="acc-cols">
                      <div>
                        <div className="mono field-label">KEY METRICS</div>
                        <ul className="metric-list">{p.metrics.map((m) => <li key={m}>{m}</li>)}</ul>
                      </div>
                      <div>
                        <div className="mono field-label">SUB-PILLARS</div>
                        <div className="row wrap" style={{ gap: 6 }}>
                          {p.subPillars.map((s) => <span key={s} className="pill">{s}</span>)}
                        </div>
                      </div>
                    </div>

                    {/* Pillar-specific real structure */}
                    {p.id === "manipulation" && <ManipulationDetail p={p} />}
                    {p.id === "care" && <CareDetail p={p} />}
                    {p.id === "cultural" && p.principles && (
                      <div style={{ marginTop: 14 }}>
                        <div className="mono field-label">DATA FEMINISM PRINCIPLES</div>
                        <div className="row wrap" style={{ gap: 6 }}>
                          {p.principles.map((pr) => <span key={pr} className="pill">{pr}</span>)}
                        </div>
                      </div>
                    )}
                    {p.id === "reliability" && p.tests7 && (
                      <div style={{ marginTop: 14 }}>
                        <div className="mono field-label">RELIABILITY TEST SUITE (multi-run)</div>
                        <div className="row wrap" style={{ gap: 6 }}>
                          {p.tests7.map((t) => <span key={t} className="pill">{t}</span>)}
                        </div>
                      </div>
                    )}

                    <div className="mono field-label" style={{ marginTop: 16 }}>SCORING RUBRIC</div>
                    <table className="rubric-table">
                      <tbody>
                        {p.rubric.map((rr) => (
                          <tr key={rr.score}>
                            <td className="mono" style={{ fontWeight: 700, width: 60 }}>{rr.score}</td>
                            <td className="mono" style={{ width: 90, color: "var(--cardinal)" }}>{rr.label}</td>
                            <td>{rr.criterion}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Comparison table */}
        <h3 style={{ fontSize: 22, margin: "44px 0 16px" }}>Versus HELM and LMSYS Chatbot Arena</h3>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Capability</th>
                {FRAMEWORK_COMPARISON.columns.map((c, i) => (
                  <th key={c} style={i === 0 ? { color: "var(--cardinal)" } : {}}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FRAMEWORK_COMPARISON.rows.map((row) => (
                <tr key={row.feature}>
                  <td style={{ fontWeight: 600, whiteSpace: "normal" }}>{row.feature}</td>
                  {row.values.map((v, i) => (
                    <td key={i} style={{ whiteSpace: "normal", color: i === 0 ? "var(--text)" : "var(--text-muted)", fontWeight: i === 0 ? 600 : 400 }}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Agent module */}
        <h3 style={{ fontSize: 22, margin: "44px 0 16px" }}>Agent evaluation module</h3>
        <p className="muted" style={{ fontSize: 14, maxWidth: 720, marginTop: 0 }}>
          Beyond conversational trust, a separate module evaluates autonomous agents that use tools and
          complete multi-step tasks, across six dimensions (37 tests total).
        </p>
        <div className="agent-grid">
          {AGENT_DIMENSIONS.map((a) => (
            <div key={a.id} className="agent-card">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong style={{ fontSize: 14 }}>{a.name}</strong>
                <span className="mono pill">{a.tests} tests</span>
              </div>
              <p className="muted" style={{ fontSize: 12.5, margin: "6px 0 0" }}>{a.blurb}</p>
            </div>
          ))}
        </div>

        {/* Cite */}
        <div className="card card-pad" style={{ marginTop: 40 }}>
          <div className="row wrap" style={{ justifyContent: "space-between" }}>
            <div>
              <h3 style={{ fontSize: 18 }}>Cite this framework</h3>
              <p className="muted" style={{ fontSize: 13, margin: "4px 0 0" }}>BibTeX entry for the evaluation system.</p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => download("usc-ai-trust-lab.bib", bibtex(), "text/plain")}>↓ Download .bib</button>
          </div>
          <pre className="mono cite-block">{bibtex()}</pre>
        </div>

        <style>{frameworkCSS}</style>
      </div>
    </section>
  );
}

const frameworkCSS = `
.formula { background: var(--ink); color: var(--gold); padding: 14px 16px; border-radius: 8px;
  font-size: 13px; margin: 14px 0 16px; overflow-x: auto; }
.scale-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.scale-card { border-radius: 10px; padding: 16px; border: 1px solid; }
.scale-card.excellent { background: var(--excellent-bg); border-color: var(--excellent); }
.scale-card.acceptable { background: var(--acceptable-bg); border-color: var(--acceptable); }
.scale-card.concerning { background: var(--concerning-bg); border-color: var(--concerning); }
.scale-card.critical { background: var(--critical-bg); border-color: var(--critical); }
.scale-range { font-size: 12px; opacity: 0.8; }
.scale-label { font-family: var(--serif); font-size: 19px; font-weight: 600; margin: 4px 0 2px; }
.scale-desc { font-size: 12.5px; opacity: 0.85; }

.accordion { border: 1px solid var(--line); border-radius: 12px; overflow: hidden; background: var(--white); }
.acc-item { border-bottom: 1px solid var(--line); }
.acc-item:last-child { border-bottom: none; }
.acc-head { width: 100%; display: grid; grid-template-columns: 32px 1fr auto auto auto 24px; align-items: center;
  gap: 14px; padding: 16px 20px; background: none; border: none; cursor: pointer; font-family: inherit; text-align: left; }
.acc-head:hover { background: var(--paper); }
.acc-idx { color: var(--gold-deep); font-weight: 700; font-size: 12px; }
.acc-title { font-family: var(--serif); font-size: 17px; font-weight: 600; }
.acc-focus { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
.acc-weight { font-size: 11px; color: var(--cardinal); }
.acc-mode { font-size: 10px; color: var(--gold-deep); background: var(--paper-dim); padding: 2px 7px; border-radius: 4px; letter-spacing: 0.04em; }
.method-note { font-size: 12px; color: var(--text-muted); background: var(--paper); border-left: 2px solid var(--gold); padding: 8px 12px; border-radius: 0 6px 6px 0; margin-bottom: 14px; }
.method-note strong { color: var(--cardinal); }
.manip-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.manip-quad { background: var(--paper); border: 1px solid var(--line); border-radius: 8px; padding: 10px 12px; }
.manip-quad-label { font-size: 10px; color: var(--cardinal); letter-spacing: 0.04em; margin-bottom: 6px; }
.manip-dim { font-size: 12px; padding: 2px 0; }
.manip-dim-n { color: var(--gold-deep); font-size: 10.5px; margin-right: 4px; }
.care-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.care-dim { background: var(--paper); border: 1px solid var(--line); border-radius: 8px; padding: 12px; }
.acc-chevron { font-size: 20px; color: var(--text-muted); text-align: center; }
.acc-body { padding: 4px 20px 22px 66px; }
.acc-body > p { font-size: 14.5px; color: var(--ink-soft); margin: 0 0 16px; }
.acc-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.metric-list { margin: 0; padding-left: 18px; font-size: 13px; color: var(--text); }
.metric-list li { margin-bottom: 3px; }
.rubric-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 6px; }
.rubric-table td { padding: 8px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
.field-label { font-size: 10.5px; letter-spacing: 0.1em; color: var(--text-muted); margin-bottom: 7px; display: block; }

.agent-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.agent-card { background: var(--white); border: 1px solid var(--line); border-radius: 10px; padding: 16px; }
.cite-block { background: var(--ink); color: #d8e6c8; padding: 16px; border-radius: 8px; font-size: 11.5px;
  overflow-x: auto; line-height: 1.5; margin: 14px 0 0; }

@media (max-width: 860px) {
  .scale-grid { grid-template-columns: repeat(2, 1fr); }
  .agent-grid { grid-template-columns: 1fr; }
  .acc-head { grid-template-columns: 28px 1fr 24px; }
  .acc-focus, .acc-weight, .acc-mode { display: none; }
  .acc-body { padding-left: 20px; }
  .acc-cols { grid-template-columns: 1fr; }
  .manip-grid, .care-grid { grid-template-columns: 1fr; }
}
`;
