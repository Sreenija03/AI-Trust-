import React, { useState, useMemo } from "react";
import { PILLARS, ratingFor } from "../data/framework.js";
import { RESULTS, SUPPORTED_UNEVALUATED, COMPARATIVE_NOTES } from "../data/results.js";
import RadarChart from "../components/RadarChart.jsx";
import { leaderboardToCSV, download } from "../engine/exporters.js";
import { useAppState } from "../state/AppState.jsx";

const scoreColor = (s) => {
  const t = ratingFor(s).token;
  return `var(--${t})`;
};

export default function Leaderboard() {
  const { liveResults, removeResult } = useAppState();
  // Live session results take precedence over any baked-in result of the same model.
  const allResults = useMemo(() => {
    const liveNames = new Set(liveResults.map((r) => r.model));
    const base = RESULTS.filter((r) => !liveNames.has(r.model));
    return [...liveResults, ...base];
  }, [liveResults]);
  const [sortKey, setSortKey] = useState("overall");
  const [sortDir, setSortDir] = useState("desc");
  const [providerFilter, setProviderFilter] = useState("All");
  const [deselected, setDeselected] = useState([]); // models explicitly hidden from radar
  const selected = allResults.map((r) => r.model).filter((m) => !deselected.includes(m));

  const providers = ["All", ...new Set(allResults.map((r) => r.provider))];

  const rows = useMemo(() => {
    let r = allResults.filter((m) => providerFilter === "All" || m.provider === providerFilter);
    r = [...r].sort((a, b) => {
      const av = sortKey === "overall" ? a.overall : a.pillars[sortKey]?.score ?? 0;
      const bv = sortKey === "overall" ? b.overall : b.pillars[sortKey]?.score ?? 0;
      return sortDir === "desc" ? bv - av : av - bv;
    });
    return r;
  }, [allResults, sortKey, sortDir, providerFilter]);

  const setSort = (k) => {
    if (k === sortKey) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortKey(k); setSortDir("desc"); }
  };

  const radarModels = allResults.filter((r) => selected.includes(r.model));
  const toggle = (m) =>
    setDeselected((d) => (d.includes(m) ? d.filter((x) => x !== m) : [...d, m]));

  return (
    <section className="section">
      <div className="container">
        <div className="section-head" style={{ maxWidth: "100%" }}>
          <div className="eyebrow">Results · measured {RESULTS[0].evaluatedAt.slice(0, 10)}</div>
          <h2>Trust Leaderboard</h2>
          <p>
            Models scored across all eight pillars on the 0–100 trust scale. Color encodes the rating band:
            green Excellent, amber Acceptable, orange Concerning, red Critical.
          </p>
        </div>

        {/* controls */}
        <div className="row wrap" style={{ marginBottom: 16, gap: 10 }}>
          <div className="row" style={{ gap: 6 }}>
            <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)" }}>PROVIDER</span>
            {providers.map((p) => (
              <button key={p} className={`btn btn-sm ${providerFilter === p ? "btn-primary" : "btn-ghost"}`} onClick={() => setProviderFilter(p)}>
                {p}
              </button>
            ))}
          </div>
          <div className="spacer" />
          <button className="btn btn-ghost btn-sm" onClick={() => download("usc-trust-leaderboard.csv", leaderboardToCSV(allResults), "text/csv")}>
            ↓ Export CSV
          </button>
        </div>

        {/* table */}
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th style={{ position: "sticky", left: 0, zIndex: 2 }} onClick={() => setSort("overall")}>Model</th>
                <th onClick={() => setSort("overall")}>Overall {sortKey === "overall" ? (sortDir === "desc" ? "▾" : "▴") : ""}</th>
                <th>Rating</th>
                <th>Pass</th>
                {PILLARS.map((p) => (
                  <th key={p.id} onClick={() => setSort(p.id)} title={p.name}>
                    {p.short} {sortKey === p.id ? (sortDir === "desc" ? "▾" : "▴") : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
                const r = ratingFor(m.overall);
                return (
                  <tr key={m.model}>
                    <td style={{ position: "sticky", left: 0, background: "var(--white)", fontWeight: 600 }}>
                      <div className="row" style={{ gap: 6 }}>
                        {m.model}
                        {liveResults.some((lr) => lr.model === m.model) && <span className="pill" style={{ background: "var(--gold)", color: "var(--ink)" }}>live</span>}
                        {m.selfFamilyJudged && <span className="pill" style={{ background: "var(--acceptable-bg)", color: "#7a5a00" }} title="Judge is from the same company as the target model">⚠ self-judged</span>}
                      </div>
                      <div className="mono" style={{ fontSize: 10.5, color: "var(--text-faint)" }}>
                        {m.provider}{m.judge ? ` · judge: ${m.judge}` : ""}
                      </div>
                    </td>
                    <td className="num" style={{ fontWeight: 700, fontSize: 15, color: scoreColor(m.overall) }}>{m.overall}</td>
                    <td><span className={`rating ${r.token}`}>{r.label}</span></td>
                    <td className="num">{Math.round(m.passRate * 100)}%</td>
                    {PILLARS.map((p) => {
                      const s = m.pillars[p.id]?.score;
                      return (
                        <td key={p.id} className="num score-cell" style={{ color: s != null ? scoreColor(s) : "var(--text-faint)" }}>
                          {s != null ? s : "—"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* legend + unevaluated note */}
        <div className="row wrap" style={{ gap: 18, marginTop: 14, fontSize: 12, color: "var(--text-muted)" }}>
          <Legend c="excellent" t="76–100 Excellent" />
          <Legend c="acceptable" t="51–75 Acceptable" />
          <Legend c="concerning" t="26–50 Concerning" />
          <Legend c="critical" t="0–25 Critical" />
        </div>

        {/* radar comparison */}
        <div className="card card-pad" style={{ marginTop: 36 }}>
          <div className="row wrap" style={{ justifyContent: "space-between", marginBottom: 8 }}>
            <div>
              <h3 style={{ fontSize: 20 }}>Trust profile comparison</h3>
              <p className="muted" style={{ fontSize: 13, margin: "4px 0 0" }}>
                Dashed green ring marks the Excellent threshold (76). Toggle models below.
              </p>
            </div>
            <div className="row wrap" style={{ gap: 6 }}>
              {allResults.map((m) => (
                <button key={m.model} className={`btn btn-sm ${selected.includes(m.model) ? "btn-primary" : "btn-ghost"}`} onClick={() => toggle(m.model)}>
                  {m.model}
                </button>
              ))}
            </div>
          </div>
          {radarModels.length ? (
            <RadarChart models={radarModels} size={420} />
          ) : (
            <p className="muted" style={{ textAlign: "center", padding: 40 }}>Select at least one model.</p>
          )}
        </div>

        {/* comparative analysis */}
        <div className="card card-pad" style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 18 }}>Comparative analysis</h3>
          <p className="muted" style={{ fontSize: 14, marginTop: 8 }}>
            Across the two measured models the average pillar gap is{" "}
            <strong className="mono">{COMPARATIVE_NOTES.avgGap}</strong> points. The widest gaps appear in{" "}
            {COMPARATIVE_NOTES.largestGaps.map((g, i) => (
              <span key={g.pillar}>
                {i > 0 ? ", " : ""}
                <strong>{g.pillar}</strong> (<span className="mono">{g.gap}</span>)
              </span>
            ))}
            ; the narrowest is <strong>{COMPARATIVE_NOTES.smallestGap.pillar}</strong>{" "}
            (<span className="mono">{COMPARATIVE_NOTES.smallestGap.gap}</span>).
          </p>
        </div>

        {/* supported but not yet evaluated */}
        <div className="card card-pad" style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 16 }}>Supported · not yet evaluated</h3>
          <p className="muted" style={{ fontSize: 13, margin: "6px 0 12px" }}>
            These models are supported by the platform but have no measured run yet. They are shown
            transparently rather than populated with placeholder scores. Use the Evaluation Runner to score them.
          </p>
          <div className="row wrap" style={{ gap: 8 }}>
            {SUPPORTED_UNEVALUATED.map((m) => (
              <span key={m.model} className="pill">{m.model} · {m.provider}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Legend({ c, t }) {
  return (
    <span className="row" style={{ gap: 6 }}>
      <span style={{ width: 12, height: 12, borderRadius: 3, background: `var(--${c})` }} />
      {t}
    </span>
  );
}
