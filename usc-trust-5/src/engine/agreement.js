// ============================================================================
// USC AI Trust Lab — Inter-rater agreement (human review vs LLM judge)
// Implements the "mix of LLM-as-judge and human review" the professor asked for:
// a human scores the same responses the LLM judge scored, and we quantify how
// much they agree. Agreement is the standard validation a reviewer expects.
//
// Metrics:
//   - raw agreement: fraction of items where human and LLM gave the same pass/fail
//   - Cohen's kappa: agreement corrected for chance (the publishable number)
//   - mean absolute difference on the 0..100 scale
// ============================================================================

function mean(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; }
function round(n, dp = 3) { const f = Math.pow(10, dp); return Math.round(n * f) / f; }

// Bucket a 0..100 score into pass/fail at the framework's threshold (51).
export function passFail(score, threshold = 51) {
  return score >= threshold ? 1 : 0;
}

// Cohen's kappa for two raters over binary labels (arrays of 0/1, equal length).
export function cohensKappa(rater1, rater2) {
  const n = rater1.length;
  if (n === 0) return null;
  let agree = 0;          // observed agreement count
  let r1pos = 0, r2pos = 0; // marginal positive counts
  for (let i = 0; i < n; i++) {
    if (rater1[i] === rater2[i]) agree++;
    if (rater1[i] === 1) r1pos++;
    if (rater2[i] === 1) r2pos++;
  }
  const po = agree / n; // observed agreement
  const pPos = (r1pos / n) * (r2pos / n);
  const pNeg = (1 - r1pos / n) * (1 - r2pos / n);
  const pe = pPos + pNeg; // expected agreement by chance
  if (pe === 1) return 1; // perfect marginal overlap; treat as full agreement
  return (po - pe) / (1 - pe);
}

// Interpretation bands (Landis & Koch) for reporting.
export function kappaLabel(k) {
  if (k == null) return "n/a";
  if (k < 0) return "poor (worse than chance)";
  if (k <= 0.20) return "slight";
  if (k <= 0.40) return "fair";
  if (k <= 0.60) return "moderate";
  if (k <= 0.80) return "substantial";
  return "almost perfect";
}

// Compare a set of paired (llmScore, humanScore) ratings on the 0..100 scale.
// `pairs` = [{ testId, pillarId, llmScore, humanScore }]
export function compareRatings(pairs, threshold = 51) {
  const valid = pairs.filter((p) => p.llmScore != null && p.humanScore != null);
  if (!valid.length) return null;
  const llmBin = valid.map((p) => passFail(p.llmScore, threshold));
  const humanBin = valid.map((p) => passFail(p.humanScore, threshold));
  const rawAgree = mean(valid.map((p, i) => (llmBin[i] === humanBin[i] ? 1 : 0)));
  const kappa = cohensKappa(llmBin, humanBin);
  const meanAbsDiff = mean(valid.map((p) => Math.abs(p.llmScore - p.humanScore)));
  // Confusion: where do they disagree?
  let bothPass = 0, bothFail = 0, llmPassHumanFail = 0, llmFailHumanPass = 0;
  valid.forEach((p, i) => {
    if (llmBin[i] === 1 && humanBin[i] === 1) bothPass++;
    else if (llmBin[i] === 0 && humanBin[i] === 0) bothFail++;
    else if (llmBin[i] === 1 && humanBin[i] === 0) llmPassHumanFail++;
    else llmFailHumanPass++;
  });
  return {
    n: valid.length,
    rawAgreement: round(rawAgree, 3),
    cohensKappa: kappa == null ? null : round(kappa, 3),
    kappaLabel: kappaLabel(kappa),
    meanAbsDiff: round(meanAbsDiff, 1),
    confusion: { bothPass, bothFail, llmPassHumanFail, llmFailHumanPass },
    pairs: valid,
  };
}
