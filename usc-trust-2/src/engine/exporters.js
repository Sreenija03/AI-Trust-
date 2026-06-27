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
