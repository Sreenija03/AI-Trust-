import React, { useState } from "react";
import { V2_LAYERS, V2_ALIGNMENT, v2Coverage, COVERAGE_LABEL, COVERAGE_TOKEN, FRAMEWORK_VERSION } from "../data/frameworkV2.js";
import { PILLAR_BY_ID } from "../data/framework.js";

export default function FrameworkV2() {
  const cov = v2Coverage();
  const [openDim, setOpenDim] = useState(null);

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Framework · Version 2</div>
          <h2>Unified AI Trust Framework</h2>
          <p>
            The newer framework from the USC and Tumeryk collaboration. It expands the original eight pillars
            into seven dimensions across two layers, aligns each sub-category to established benchmarks, and maps
            them to real evaluation datasets and probes. Research on Version 2 is in progress; this page shows
            what the platform can already score live versus what is on the roadmap.
          </p>
        </div>

        {/* Version banner */}
        <div className="v2-banner">
          <div>
            <strong>Live scoring still runs on Version 1</strong> (the eight USC pillars). Version 2 below is the
            target framework. Sub-categories tagged <span className="cov-chip excellent">Scored live now</span> are
            already covered through the Version 1 to Version 2 mapping; the rest are documented as the research roadmap.
          </div>
        </div>

        {/* Coverage summary */}
        <div className="cov-summary">
          <CovStat n={cov.total} label="Sub-categories" />
          <CovStat n={cov.live} label="Scored live now" token="excellent" />
          <CovStat n={cov.dataset} label="Need a dataset" token="acceptable" />
          <CovStat n={cov.probe} label="Need a probe harness" token="concerning" />
          <CovStat n={cov.roadmap} label="Roadmap" token="critical" />
        </div>
        <div className="cov-bar" title={`${cov.livePct}% scored live`}>
          <div className="cov-bar-fill" style={{ width: `${cov.livePct}%` }} />
          <span className="cov-bar-label mono">{cov.livePct}% of V2 sub-categories scored live today</span>
        </div>

        {/* Alignment */}
        <div className="mono v2-align">
          ALIGNED WITH: {V2_ALIGNMENT.join("  ·  ")}
        </div>

        {/* Layers */}
        {V2_LAYERS.map((layer) => (
          <div key={layer.id} className="v2-layer">
            <div className="v2-layer-head">
              <h3>{layer.name}</h3>
              <span className="mono v2-layer-q">{layer.question}</span>
            </div>
            <p className="muted" style={{ fontSize: 13.5, marginTop: 0 }}>{layer.blurb}</p>

            {layer.dimensions.map((dim) => {
              const isOpen = openDim === dim.id;
              const liveSubs = dim.subs.filter((s) => s.coverage === "live").length;
              return (
                <div key={dim.id} className={`v2-dim ${isOpen ? "open" : ""}`}>
                  <button className="v2-dim-head" onClick={() => setOpenDim(isOpen ? null : dim.id)}>
                    <span className="v2-dim-name">{dim.name}</span>
                    <span className="mono v2-dim-meta">{liveSubs}/{dim.subs.length} live</span>
                    <span className="v2-chevron">{isOpen ? "−" : "+"}</span>
                  </button>
                  {isOpen && (
                    <div className="v2-dim-body">
                      <p className="muted" style={{ fontSize: 13 }}>{dim.definition}</p>
                      <div className="v2-sub-table">
                        {dim.subs.map((s) => (
                          <div key={s.id} className="v2-sub">
                            <div className="v2-sub-top">
                              <span className="v2-sub-name">{s.name}</span>
                              <span className={`cov-chip ${COVERAGE_TOKEN[s.coverage]}`}>{COVERAGE_LABEL[s.coverage]}</span>
                              {s.v1 && <span className="v2-map mono" title="Maps to Version 1 pillar">↔ {PILLAR_BY_ID[s.v1]?.short || s.v1}</span>}
                            </div>
                            <p className="v2-sub-def">{s.definition}</p>
                            <p className="v2-sub-method mono">METHOD: {s.method}</p>
                            {s.datasets && s.datasets.length > 0 && (
                              <div className="v2-ds">
                                {s.datasets.map((d) => <span key={d} className="v2-ds-chip mono">{d}</span>)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Roadmap note */}
        <div className="v2-roadmap">
          <h3 style={{ fontSize: 18, marginTop: 0 }}>Reading this as a research roadmap</h3>
          <p style={{ fontSize: 14, lineHeight: 1.6 }}>
            The {cov.live} live sub-categories are scored today through the Version 1 engine. The {cov.dataset}{" "}
            dataset-backed sub-categories become scoreable by wiring in their named public benchmarks (CrowS-Pairs,
            BBQ, XSTest, OpinionQA, the ETHICS benchmark, and similar). The {cov.probe} probe-backed sub-categories
            (toxicity, jailbreak, privacy leakage, insecure output, supply chain) need an external probe harness
            such as garak or Inspect AI, since they test attack surfaces rather than single prompts. The {cov.roadmap}{" "}
            roadmap items are defined but not yet specified. This ordering is a natural outline for the next phase
            of the paper: validated-dataset coverage first, then the probe-harness integration, then Layer 2
            deployment and supply-chain auditing.
          </p>
        </div>

        <style>{v2CSS}</style>
      </div>
    </section>
  );
}

function CovStat({ n, label, token }) {
  return (
    <div className="cov-stat">
      <div className={`cov-stat-n ${token ? "tok-" + token : ""}`}>{n}</div>
      <div className="cov-stat-label">{label}</div>
    </div>
  );
}

const v2CSS = `
.v2-banner { background: var(--paper); border: 1px solid var(--line); border-left: 3px solid var(--gold); border-radius: 0 10px 10px 0; padding: 14px 18px; font-size: 13.5px; line-height: 1.55; margin-bottom: 20px; }
.cov-summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 14px; }
.cov-stat { background: var(--paper); border: 1px solid var(--line); border-radius: 10px; padding: 14px; text-align: center; }
.cov-stat-n { font-family: var(--mono); font-size: 30px; font-weight: 700; line-height: 1; }
.cov-stat-n.tok-excellent { color: var(--excellent); }
.cov-stat-n.tok-acceptable { color: var(--acceptable); }
.cov-stat-n.tok-concerning { color: var(--concerning); }
.cov-stat-n.tok-critical { color: var(--critical); }
.cov-stat-label { font-size: 11px; color: var(--text-muted); margin-top: 6px; }
.cov-bar { position: relative; height: 26px; background: var(--paper-dim); border-radius: 8px; overflow: hidden; margin-bottom: 18px; }
.cov-bar-fill { height: 100%; background: linear-gradient(90deg, var(--excellent), var(--gold)); }
.cov-bar-label { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 11px; color: var(--ink); }
.v2-align { font-size: 11px; color: var(--text-muted); letter-spacing: 0.04em; margin-bottom: 26px; }
.v2-layer { margin-bottom: 30px; }
.v2-layer-head { display: flex; align-items: baseline; gap: 14px; border-bottom: 2px solid var(--cardinal); padding-bottom: 6px; }
.v2-layer-head h3 { font-size: 20px; margin: 0; }
.v2-layer-q { font-size: 12px; color: var(--cardinal); }
.v2-dim { border: 1px solid var(--line); border-radius: 10px; margin-top: 10px; overflow: hidden; }
.v2-dim.open { border-color: var(--line-strong); }
.v2-dim-head { width: 100%; display: grid; grid-template-columns: 1fr auto 24px; align-items: center; gap: 12px; padding: 13px 16px; background: none; border: none; cursor: pointer; font-family: inherit; text-align: left; }
.v2-dim-name { font-weight: 600; font-size: 15px; }
.v2-dim-meta { font-size: 11px; color: var(--excellent); }
.v2-chevron { font-size: 18px; color: var(--text-muted); }
.v2-dim-body { padding: 0 16px 16px; }
.v2-sub-table { display: flex; flex-direction: column; gap: 10px; }
.v2-sub { background: var(--paper); border: 1px solid var(--line); border-radius: 8px; padding: 12px 14px; }
.v2-sub-top { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.v2-sub-name { font-weight: 600; font-size: 13.5px; }
.v2-sub-def { font-size: 12.5px; color: var(--text-muted); margin: 6px 0 4px; }
.v2-sub-method { font-size: 11px; color: var(--text-faint); margin: 4px 0; }
.v2-map { font-size: 10.5px; color: var(--cardinal); background: var(--cardinal-bg, #f5e6e6); padding: 2px 7px; border-radius: 4px; }
.cov-chip { font-size: 10px; font-family: var(--mono); padding: 2px 8px; border-radius: 10px; }
.cov-chip.excellent { background: var(--excellent-bg); color: var(--excellent); }
.cov-chip.acceptable { background: var(--acceptable-bg); color: #7a5a00; }
.cov-chip.concerning { background: var(--concerning-bg, #fbeadf); color: var(--concerning); }
.cov-chip.critical { background: var(--critical-bg); color: var(--critical); }
.v2-ds { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
.v2-ds-chip { font-size: 10px; background: var(--paper-dim); color: var(--text-muted); padding: 2px 7px; border-radius: 4px; }
.v2-roadmap { background: var(--paper); border: 1px solid var(--line); border-radius: 12px; padding: 20px 22px; margin-top: 14px; }
@media (max-width: 760px) {
  .cov-summary { grid-template-columns: repeat(2, 1fr); }
  .v2-sub-top { gap: 6px; }
}
`;
