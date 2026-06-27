import React from "react";
import { LAB } from "../data/publications.js";
import { PILLARS, TOTAL_TESTS } from "../data/framework.js";
import { RESULTS } from "../data/results.js";

export default function Home({ go }) {
  const best = [...RESULTS].sort((a, b) => b.overall - a.overall)[0];
  return (
    <div>
      {/* Hero */}
      <section className="hero">
        <div className="container">
          <div className="hero-grid">
            <div>
              <div className="eyebrow">USC AI Trust Lab · Trust Evaluations</div>
              <h1 className="hero-title">
                Trust, made <span className="measurable">measurable.</span>
              </h1>
              <p className="hero-lede">{LAB.thesis}</p>
              <div className="row wrap" style={{ gap: 12, marginTop: 28 }}>
                <button className="btn btn-primary" onClick={() => go("leaderboard")}>
                  View the leaderboard →
                </button>
                <button className="btn btn-ghost" onClick={() => go("runner")}>
                  Run an evaluation
                </button>
              </div>
              <div className="hero-vs">
                Unlike HELM or LMSYS Chatbot Arena, the framework scores <em>trust</em> directly —
                Care, Candor, and Manipulation resistance included — as one weighted 0–100 index.
              </div>
            </div>

            {/* Instrument readout panel */}
            <div className="readout">
              <div className="readout-head mono">TRUST&nbsp;INDEX · LIVE READOUT</div>
              <div className="readout-score">
                <div className="readout-num mono">{best.overall}</div>
                <div>
                  <div className="readout-model">{best.model}</div>
                  <div className="readout-rating mono">EXCELLENT · {Math.round(best.passRate * 100)}% PASS</div>
                </div>
              </div>
              <div className="readout-bars">
                {PILLARS.map((p) => {
                  const s = best.pillars[p.id].score;
                  return (
                    <div key={p.id} className="readout-bar">
                      <span className="readout-bar-label mono">{p.short}</span>
                      <span className="readout-track">
                        <span className="readout-fill" style={{ width: `${s}%` }} />
                      </span>
                      <span className="readout-val mono">{s}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stat strip */}
      <div className="stat-strip">
        <div className="container row wrap" style={{ justifyContent: "space-between", gap: 20 }}>
          <Stat n="8" label="Trust pillars" />
          <Stat n={TOTAL_TESTS} label="Tests per model" />
          <Stat n="Hybrid" label="Keyword + LLM-judge" />
          <Stat n="0–100" label="Quantified scale" />
          <Stat n="Per-pillar" label="Custom weighting" />
        </div>
      </div>

      {/* Pillars overview */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <div className="eyebrow">The framework</div>
            <h2>Eight pillars of trust</h2>
            <p>
              Each pillar isolates one dimension of trustworthiness. Together they produce a single,
              auditable trust score — with weights tuned per pillar to match how much nuance each requires.
            </p>
          </div>
          <div className="pillar-grid">
            {PILLARS.map((p, i) => (
              <button key={p.id} className="pillar-card" onClick={() => go("framework")}>
                <div className="pillar-idx mono">{String(i + 1).padStart(2, "0")}</div>
                <h3>{p.name}</h3>
                <div className="pillar-focus mono">{p.focus}</div>
                <p>{p.blurb}</p>
                <div className="pillar-weight mono">
                  {Math.round(p.keywordWeight * 100)}% heuristic · {Math.round(p.judgeWeight * 100)}% judge
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <style>{heroCSS}</style>
    </div>
  );
}

function Stat({ n, label }) {
  return (
    <div className="stat">
      <div className="stat-n mono">{n}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

const heroCSS = `
.hero { padding: 64px 0 56px; border-bottom: 1px solid var(--line); background:
  radial-gradient(900px 360px at 78% -8%, rgba(153,0,0,0.06), transparent 70%),
  linear-gradient(180deg, var(--paper), var(--paper)); }
.hero-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 56px; align-items: center; }
.hero-title { font-size: 60px; line-height: 1.02; margin: 18px 0 0; letter-spacing: -0.025em; }
.measurable { color: var(--cardinal); position: relative; }
.measurable::after { content: ""; position: absolute; left: 0; right: 0; bottom: 6px; height: 10px;
  background: var(--gold); opacity: 0.55; z-index: -1; }
.hero-lede { font-size: 18px; line-height: 1.6; color: var(--ink-soft); margin: 22px 0 0; max-width: 520px; }
.hero-vs { margin-top: 30px; padding-top: 22px; border-top: 1px solid var(--line);
  font-size: 14px; color: var(--text-muted); max-width: 520px; }
.hero-vs em { color: var(--cardinal); font-style: italic; }

.readout { background: var(--ink); border-radius: 14px; padding: 22px; color: #e9e2d6;
  box-shadow: 0 24px 60px -28px rgba(20,17,15,0.6); border: 1px solid #322b25; }
.readout-head { font-size: 10px; letter-spacing: 0.22em; color: var(--gold); margin-bottom: 16px; }
.readout-score { display: flex; align-items: center; gap: 18px; padding-bottom: 18px; border-bottom: 1px solid #322b25; }
.readout-num { font-size: 56px; font-weight: 600; color: #fff; line-height: 1; }
.readout-model { font-family: var(--serif); font-size: 18px; color: #fff; }
.readout-rating { font-size: 10.5px; color: #7fd1a0; letter-spacing: 0.08em; margin-top: 4px; }
.readout-bars { margin-top: 16px; display: flex; flex-direction: column; gap: 9px; }
.readout-bar { display: grid; grid-template-columns: 88px 1fr 30px; align-items: center; gap: 10px; }
.readout-bar-label { font-size: 10px; color: #b3a994; letter-spacing: 0.04em; }
.readout-track { height: 6px; background: #2a2520; border-radius: 3px; overflow: hidden; }
.readout-fill { display: block; height: 100%; background: linear-gradient(90deg, var(--cardinal-bright), var(--gold)); }
.readout-val { font-size: 11px; color: #e9e2d6; text-align: right; }

.stat-strip { background: var(--ink); padding: 18px 0; }
.stat { padding: 6px 0; }
.stat-n { font-size: 22px; color: var(--gold); font-weight: 600; }
.stat-label { font-size: 12px; color: #b3a994; margin-top: 2px; }

.pillar-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.pillar-card { text-align: left; background: var(--white); border: 1px solid var(--line); border-radius: 12px;
  padding: 20px; cursor: pointer; transition: all .18s; font-family: inherit; }
.pillar-card:hover { border-color: var(--cardinal); transform: translateY(-2px);
  box-shadow: 0 16px 40px -24px rgba(153,0,0,0.4); }
.pillar-idx { font-size: 12px; color: var(--gold-deep); font-weight: 700; }
.pillar-card h3 { font-size: 18px; margin: 8px 0 4px; }
.pillar-focus { font-size: 10.5px; color: var(--cardinal); letter-spacing: 0.06em; text-transform: uppercase; }
.pillar-card p { font-size: 13px; color: var(--text-muted); margin: 10px 0 14px; line-height: 1.5; }
.pillar-weight { font-size: 10.5px; color: var(--text-faint); padding-top: 10px; border-top: 1px solid var(--line); }

@media (max-width: 980px) {
  .hero-grid { grid-template-columns: 1fr; gap: 36px; }
  .hero-title { font-size: 44px; }
  .pillar-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 560px) {
  .hero-title { font-size: 36px; }
  .pillar-grid { grid-template-columns: 1fr; }
  .readout-num { font-size: 44px; }
}
`;
