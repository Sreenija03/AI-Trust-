// ============================================================================
// USC AI Trust Lab — Multi-Judge Bias Harness
// Scores each model response with several judges (from different companies),
// then quantifies (a) inter-judge agreement and (b) self-family score inflation.
//
// Design note on confounds: a response is generated ONCE per test, then scored
// by every judge. This isolates JUDGE variance from GENERATION variance — the
// thing we want to measure is disagreement between judges on identical text.
// ============================================================================

import { PILLARS, PILLAR_BY_ID, PASS_THRESHOLD } from "../data/framework.js";
import { generateResponse, familyOf } from "./providers.js";
import { judgeResponseOnly } from "./scorer.js";

function round(n, dp = 1) { const f = Math.pow(10, dp); return Math.round(n * f) / f; }
function mean(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; }
function stdev(a) {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(mean(a.map((x) => (x - m) ** 2)));
}

// Pearson correlation between two equal-length arrays.
export function pearson(xs, ys) {
  const n = xs.length;
  if (n < 2) return null;
  const mx = mean(xs), my = mean(ys);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? null : num / den;
}

// Run the bias harness for one target model across a battery, using >=2 judges.
// onProgress({ done, total, current }) fires per test.
// Returns a structured report with per-test judge scores + aggregate bias stats.
export async function runBiasHarness(modelEntry, battery, judges, keys, { signal, onProgress } = {}) {
  if (!judges || judges.length < 2) throw new Error("Bias harness needs at least 2 judges.");
  const targetFamily = familyOf(modelEntry);
  const perTest = [];
  const total = battery.length;

  for (let i = 0; i < total; i++) {
    if (signal?.aborted) throw new Error("Bias run cancelled.");
    const { pillar, testCase } = battery[i];
    onProgress?.({ done: i, total, current: { pillarId: pillar.id, testId: testCase.id, phase: "generating" } });

    // 1) Generate the response artifact ONCE (mode-aware), capturing the text the judges will see.
    let artifact;
    try {
      artifact = await generateArtifact(pillar, testCase, modelEntry, keys, signal);
    } catch (e) {
      perTest.push({ pillarId: pillar.id, testId: testCase.id, errored: true, error: e.message, judgeScores: {} });
      onProgress?.({ done: i + 1, total, current: { pillarId: pillar.id, testId: testCase.id, phase: "done" }, errored: true });
      continue;
    }

    // 2) Score the SAME artifact with each judge.
    const judgeScores = {};
    for (const judge of judges) {
      onProgress?.({ done: i, total, current: { pillarId: pillar.id, testId: testCase.id, phase: `judging:${judge.family}` } });
      try {
        const s = await judgeResponseOnly(pillar, testCase, artifact, { judgeEntry: judge, keys, signal });
        judgeScores[judge.label] = { score: round(s.score), family: judge.family, selfFamily: judge.family === targetFamily, reasoning: s.reasoning };
      } catch (e) {
        judgeScores[judge.label] = { score: null, family: judge.family, selfFamily: judge.family === targetFamily, error: e.message };
      }
    }

    const valid = Object.values(judgeScores).filter((j) => j.score != null).map((j) => j.score);
    perTest.push({
      pillarId: pillar.id, testId: testCase.id,
      judgeScores,
      meanScore: valid.length ? round(mean(valid)) : null,
      spread: valid.length > 1 ? round(Math.max(...valid) - Math.min(...valid)) : 0,
      stdev: valid.length > 1 ? round(stdev(valid)) : 0,
    });
    onProgress?.({ done: i + 1, total, current: { pillarId: pillar.id, testId: testCase.id, phase: "done" }, result: perTest[perTest.length - 1] });
  }

  return buildBiasReport(modelEntry, judges, perTest);
}

// Generate the response artifact a judge will score, matching the pillar's mode.
// Returns an object the judge-prompt builders understand (see judgeResponseOnly).
async function generateArtifact(pillar, testCase, modelEntry, keys, signal) {
  const gen = (prompt) => generateResponse(modelEntry, prompt, keys, { signal });
  const mode = testCase.mode || pillar.mode;
  if (mode === "single" || mode === "deduction") {
    return { mode, response: await gen(testCase.prompt) };
  }
  if (mode === "two_turn") {
    const r1 = await gen(testCase.prompt);
    const r2 = await gen(`${testCase.prompt}\n\n${r1}\n\nFollow-up: ${testCase.followUp}`);
    return { mode, response: r1, followUpResponse: r2 };
  }
  if (mode === "mirror") {
    return { mode, responseA: await gen(testCase.framingA), responseB: await gen(testCase.framingB) };
  }
  if (mode === "multi_turn") {
    const parts = []; let ctx = "";
    for (const turn of testCase.turns) {
      const prompt = ctx ? `${ctx}\nUser: ${turn}\nAssistant:` : turn;
      const resp = await gen(prompt);
      parts.push(`User: ${turn}\nModel: ${resp}`);
      ctx = `${ctx}\nUser: ${turn}\nAssistant: ${resp}`.trim();
    }
    return { mode, transcript: parts.join("\n\n") };
  }
  if (mode === "multi_run") {
    const prompts = testCase.variants || Array(testCase.runs || 3).fill(testCase.prompt);
    const responses = [];
    for (const p of prompts) responses.push(await gen(p));
    return { mode, responses };
  }
  return { mode: "single", response: await gen(testCase.prompt) };
}

// Compute aggregate bias statistics from per-test judge scores.
function buildBiasReport(modelEntry, judges, perTest) {
  const targetFamily = familyOf(modelEntry);
  const judgeLabels = judges.map((j) => j.label);
  const valid = perTest.filter((t) => !t.errored && t.meanScore != null);

  // Per-judge mean score across all tests (does one judge systematically score higher?).
  const judgeMeans = {};
  for (const j of judges) {
    const scores = valid.map((t) => t.judgeScores[j.label]?.score).filter((s) => s != null);
    judgeMeans[j.label] = { family: j.family, selfFamily: j.family === targetFamily, mean: scores.length ? round(mean(scores)) : null, n: scores.length };
  }

  // Pairwise inter-judge agreement (Pearson r + mean absolute difference).
  const pairwise = [];
  for (let a = 0; a < judges.length; a++) {
    for (let b = a + 1; b < judges.length; b++) {
      const la = judges[a].label, lb = judges[b].label;
      const xs = [], ys = [];
      for (const t of valid) {
        const sa = t.judgeScores[la]?.score, sb = t.judgeScores[lb]?.score;
        if (sa != null && sb != null) { xs.push(sa); ys.push(sb); }
      }
      pairwise.push({
        judgeA: la, judgeB: lb,
        r: xs.length > 1 ? round(pearson(xs, ys) ?? 0, 2) : null,
        meanAbsDiff: xs.length ? round(mean(xs.map((x, i) => Math.abs(x - ys[i])))) : null,
        n: xs.length,
      });
    }
  }

  // Self-family inflation: for the judge whose family == target family, how much
  // higher does it score vs the mean of cross-family judges, on the same responses?
  const selfJudge = judges.find((j) => j.family === targetFamily);
  let inflation = null;
  if (selfJudge) {
    const crossJudges = judges.filter((j) => j.family !== targetFamily);
    if (crossJudges.length) {
      const deltas = [];
      for (const t of valid) {
        const selfScore = t.judgeScores[selfJudge.label]?.score;
        const crossScores = crossJudges.map((j) => t.judgeScores[j.label]?.score).filter((s) => s != null);
        if (selfScore != null && crossScores.length) deltas.push(selfScore - mean(crossScores));
      }
      if (deltas.length) {
        inflation = {
          selfJudge: selfJudge.label, selfFamily: targetFamily,
          crossJudges: crossJudges.map((j) => j.label),
          meanDelta: round(mean(deltas)),         // + means self-family scores higher
          n: deltas.length,
          direction: mean(deltas) > 0 ? "self-family scores HIGHER" : "self-family scores lower",
        };
      }
    }
  }

  // Overall agreement summary.
  const overallSpread = valid.length ? round(mean(valid.map((t) => t.spread))) : 0;
  const meanR = pairwise.filter((p) => p.r != null).length
    ? round(mean(pairwise.filter((p) => p.r != null).map((p) => p.r)), 2)
    : null;

  return {
    model: modelEntry.label, targetFamily,
    judges: judgeLabels, judgeFamilies: judges.map((j) => j.family),
    evaluatedAt: new Date().toISOString(),
    nTests: perTest.length, nValid: valid.length, nErrored: perTest.filter((t) => t.errored).length,
    judgeMeans, pairwise, meanInterJudgeR: meanR, meanScoreSpread: overallSpread,
    selfFamilyInflation: inflation,
    perTest,
  };
}
