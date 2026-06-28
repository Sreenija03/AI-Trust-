// ============================================================================
// USC AI Trust Lab — Export utilities (paper-readiness)
// ============================================================================

import { PILLARS } from "../data/framework.js";

export function download(filename, content, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Leaderboard → CSV (model rows × pillar columns).
export function leaderboardToCSV(results) {
  const header = ["Model", "Provider", "Overall", "Rating", "Pass Rate", ...PILLARS.map((p) => p.short)];
  const lines = [header.join(",")];
  for (const r of results) {
    const row = [
      csv(r.model),
      csv(r.provider),
      r.overall,
      rating(r.overall),
      `${Math.round(r.passRate * 100)}%`,
      ...PILLARS.map((p) => r.pillars[p.id]?.score ?? ""),
    ];
    lines.push(row.join(","));
  }
  return lines.join("\n");
}

// Single evaluation run → publication-ready JSON.
export function runToJSON(run) {
  return JSON.stringify(run, null, 2);
}

// BibTeX entry for citing the evaluation system.
export function bibtex() {
  return `@misc{usc_ai_trust_lab_2026,
  title        = {USC AI Trust Lab: An 8-Pillar Hybrid Framework for Evaluating LLM Trustworthiness},
  author       = {{USC AI Trust Lab}},
  year         = {2026},
  institution  = {University of Southern California},
  note         = {Hybrid keyword + LLM-as-judge scoring across Veracity, Care, Candor,
                  Cultural, Manipulation, Reliability, Transparency, and Clarity indices.
                  0--100 trust scale; per-pillar weighting.},
  howpublished = {AI Trust Evaluations platform}
}`;
}

function csv(s) {
  const v = String(s ?? "");
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}
function rating(score) {
  if (score >= 76) return "Excellent";
  if (score >= 51) return "Acceptable";
  if (score >= 26) return "Concerning";
  return "Critical";
}

// Export an SVG node to PNG (for radar charts / tables rendered as SVG).
export function svgToPNG(svgEl, filename, scale = 2) {
  const xml = new XMLSerializer().serializeToString(svgEl);
  const svg64 = btoa(unescape(encodeURIComponent(xml)));
  const img = new Image();
  const w = svgEl.viewBox.baseVal.width || svgEl.clientWidth || 600;
  const h = svgEl.viewBox.baseVal.height || svgEl.clientHeight || 400;
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    });
  };
  img.src = "data:image/svg+xml;base64," + svg64;
}

// ============================================================================
// Paper-ready statistical exports (CSV). Variance runs, bias reports, agreement.
// ============================================================================

function csvEscape(v) { return `"${String(v ?? "").replace(/"/g, '""')}"`; }
function toCSV(rows) { return rows.map((r) => r.map(csvEscape).join(",")).join("\n"); }

// Variance run -> table of mean ± 95% CI per pillar (and overall).
export function varianceToCSV(v) {
  const rows = [["metric", "mean", "sd", "ci95_margin", "ci_low", "ci_high", "min", "max", "n_runs"]];
  rows.push(["OVERALL", v.overall.mean, v.overall.sd, v.overall.ci, v.overall.lo, v.overall.hi, v.overall.min, v.overall.max, v.overall.n]);
  for (const [pid, s] of Object.entries(v.pillars)) {
    rows.push([pid, s.mean, s.sd, s.ci, s.lo, s.hi, s.min, s.max, s.n]);
  }
  rows.push([]);
  rows.push(["per-run overalls", ...v.perRunOveralls]);
  rows.push(["judge", v.judge || "", "self-family", v.selfFamilyJudged ? "yes" : "no"]);
  return toCSV(rows);
}

// Bias report -> judge-by-judge means + inflation + pairwise agreement.
export function biasToCSV(report) {
  const rows = [["BIAS REPORT", report.model, "target family", report.targetFamily]];
  rows.push([]);
  rows.push(["judge", "family", "self_family", "mean_score", "n"]);
  for (const [label, m] of Object.entries(report.judgeMeans)) {
    rows.push([label, m.family, m.selfFamily ? "yes" : "no", m.mean, m.n]);
  }
  rows.push([]);
  if (report.selfFamilyInflation) {
    const inf = report.selfFamilyInflation;
    rows.push(["self_family_inflation_points", inf.meanDelta, "self_judge", inf.selfJudge, "n", inf.n]);
  }
  rows.push(["mean_inter_judge_r", report.meanInterJudgeR ?? "", "mean_score_spread", report.meanScoreSpread]);
  rows.push([]);
  rows.push(["judge_A", "judge_B", "pearson_r", "mean_abs_diff", "n"]);
  for (const p of report.pairwise) rows.push([p.judgeA, p.judgeB, p.r ?? "", p.meanAbsDiff ?? "", p.n]);
  return toCSV(rows);
}

// Agreement (human vs LLM) -> single-row summary + confusion.
export function agreementToCSV(report, model, judge) {
  const c = report.confusion;
  const rows = [
    ["model", "judge", "n", "cohens_kappa", "kappa_label", "raw_agreement", "mean_abs_diff", "both_pass", "both_fail", "llm_pass_human_fail", "llm_fail_human_pass"],
    [model || "", judge || "", report.n, report.cohensKappa ?? "", report.kappaLabel, report.rawAgreement, report.meanAbsDiff, c.bothPass, c.bothFail, c.llmPassHumanFail, c.llmFailHumanPass],
  ];
  return toCSV(rows);
}
