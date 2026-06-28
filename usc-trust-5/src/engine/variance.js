// ============================================================================
// USC AI Trust Lab — Multi-run variance & confidence intervals
// Runs the same evaluation N times and aggregates into mean ± 95% CI, so
// results carry error bars (a reviewer requirement) instead of single points.
//
// CI method: normal-approximation 95% CI = mean ± 1.96 * (sd / sqrt(n)).
// For small n (the usual case, n=3..5) we also report the raw min/max range,
// since a 3-sample CI is wide and should be read as indicative.
// ============================================================================

import { runFullEvaluation } from "./scorer.js";

function mean(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; }
function sd(a) {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); // sample sd
}
function round(n, dp = 1) { const f = Math.pow(10, dp); return Math.round(n * f) / f; }

function ci95(values) {
  const n = values.length;
  const m = mean(values);
  if (n < 2) return { mean: round(m), sd: 0, ci: 0, lo: round(m), hi: round(m), n, min: round(m), max: round(m) };
  const s = sd(values);
  const margin = 1.96 * (s / Math.sqrt(n));
  return {
    mean: round(m), sd: round(s, 2), ci: round(margin),
    lo: round(Math.max(0, m - margin)), hi: round(Math.min(100, m + margin)),
    n, min: round(Math.min(...values)), max: round(Math.max(...values)),
  };
}

// Run the full evaluation `runs` times and aggregate with CIs.
// onProgress({ run, runs, inner }) where inner is the per-test progress.
export async function runWithVariance(modelEntry, battery, keys, { runs = 3, judgeEntry, signal, onProgress } = {}) {
  const records = [];
  for (let r = 0; r < runs; r++) {
    if (signal?.aborted) throw new Error("Cancelled.");
    const rec = await runFullEvaluation(modelEntry, battery, keys, {
      signal, judgeEntry,
      onProgress: (inner) => onProgress?.({ run: r + 1, runs, inner }),
    });
    records.push(rec);
  }

  // Overall CI across runs.
  const overalls = records.map((r) => r.overall);
  const overall = ci95(overalls);

  // Per-pillar CI across runs.
  const pillarIds = Object.keys(records[0].pillars || {});
  const pillars = {};
  for (const pid of pillarIds) {
    const vals = records.map((r) => r.pillars[pid]?.score).filter((v) => v != null);
    pillars[pid] = ci95(vals);
  }

  return {
    model: modelEntry.label,
    runs,
    evaluatedAt: new Date().toISOString(),
    judge: records[0].judge, judgeFamily: records[0].judgeFamily, selfFamilyJudged: records[0].selfFamilyJudged,
    overall, pillars,
    perRunOveralls: overalls.map((v) => round(v)),
    records, // full per-run records for export
  };
}
