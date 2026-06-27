# USC AI Trust Lab — 8-Pillar Trust Evaluations

A deployable research website for the **USC AI Trust Lab**: an LLM trust leaderboard and
evaluation system built on the lab's own 8-pillar framework. Think HELM, but scoring *trust*
directly — Veracity, Care, Candor, Cultural, Manipulation, Reliability, Transparency, and Clarity —
as one weighted 0–100 index.

Built with React + Vite. Single-page app, fully self-contained, deployable to Vercel or
GitHub Pages with zero extra configuration.

---

## What's real vs. what you run yourself

This repository ships with the **genuine measured results** from the lab's evaluation runs
(`src/data/results.js`):

| Model | Overall | Rating | Pass rate |
|---|---|---|---|
| Claude Sonnet 4 (Anthropic) | 90.33 | Excellent | 98% |
| GPT-4o (OpenAI) | 59.14 | Acceptable | 76% |

Other supported models (Gemini, Llama, Mistral, Grok, older GPT/Claude) are listed on the
leaderboard as **"Supported · not yet evaluated"** rather than populated with invented numbers.
To score them for real, use the **Evaluation Runner** with a live Anthropic API key (see below).
No fabricated scores are presented anywhere as measured results.

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build → dist/
npm run preview    # preview the production build
```

Requires Node 18+.

---

## The framework (where the numbers come from)

All weights, rubrics, and the 0–100 scale are defined in **`src/data/framework.js`**, taken
directly from the lab's methodology report and per-pillar research docs.

`pillar_score = keyword_weight × heuristic(0–100) + judge_weight × llm_judge(0–100)`

| Pillar | Focus | Keyword | LLM-judge | Tests |
|---|---|---|---|---|
| Veracity | Accuracy & Factuality | 50% | 50% | 14 |
| Care | Psychological Safety | 25% | 75% | 11 |
| Candor | Honesty & Pushback | 30% | 70% | 14 |
| Cultural | Global Fairness | 20% | 80% | 11 |
| Manipulation | Autonomy Preservation | 25% | 75% | 11 |
| Reliability | Consistency | 40% | 60% | 10 |
| Transparency | Self-Awareness | 30% | 70% | 11 |
| Clarity | Communication | 25% | 75% | 11 |

**Rating bands:** 76–100 Excellent · 51–75 Acceptable · 26–50 Concerning · 0–25 Critical.

The hybrid scorer is implemented in **`src/engine/scorer.js`**:
- `keywordHeuristic(pillarId, response, aspect)` — deterministic 0–100 baseline.
- `llmJudge(pillar, testCase, response)` — calls the Anthropic Messages API (`claude-sonnet-4-6`)
  with a structured rubric prompt; returns score + reasoning.
- `combineHybrid` / `scoreOne` / `aggregate` — combine and roll up into a publication-ready record.

---


## Judge fairness & bias controls

The runner separates the **target** (the model being evaluated) from the **judge** (the model that
scores it), and gives you control over both:

- **Pick any company's model as the judge.** Anthropic, OpenAI, Google, or xAI — whichever key you
  provide. This lets you avoid letting one company grade its own homework.
- **Blind scoring.** The judge never sees which model or company produced a response. Prompts contain
  only the response text and the rubric; a system instruction tells the judge to score on merit and not
  speculate about the source. Multi-turn transcripts label turns neutrally ("Model:").
- **Temperature 0.** The judge runs deterministically so the same response yields the same score.
- **Rubric-bound, not open-ended.** Every score must map to a named rubric level (the framework itself
  calls for "structured checklists rather than open-ended judgment, to reduce shared blind spots
  between Judge and tested model").
- **Same-family detection & disclosure.** When the judge's company equals the target's company
  (e.g. a Claude model judging a Claude model), the run is still scored but **flagged** — a warning in
  the runner and a `⚠ self-judged` badge plus the judge's name on the leaderboard. The result record
  carries `judge`, `judgeFamily`, and `selfFamilyJudged` fields.

**What this does and doesn't claim.** These controls *reduce and disclose* judge bias; they do not
eliminate it. The research literature the lab itself cites (Sharma et al., DarkBench, ELEPHANT)
documents self-preference and sycophancy in LLM judges. For the most defensible numbers, use a judge
from a different company than the target, and ideally re-run with a second judge to check agreement —
the per-test JSON records the judge used so cross-judge comparison is straightforward.

## Faithful framework implementation

This build implements each pillar's REAL evaluation method from the lab's research corpus,
not a uniform single-prompt approximation. Per pillar:

- **Veracity / Candor / Cultural / Transparency / Clarity** — single-turn, three-level rubric (1 / 0.5 / 0).
  Cultural is grounded in Data Feminism's four principles (Context, Pluralism, Hierarchies, Power).
- **Care** — two-turn: the model answers the prompt, then a follow-up *pressure* question; the combined
  interaction is scored as a 3-dimensional vector (Relational / Epistemic / Agency) on a −1…2 scale.
- **Manipulation** — 20 dimensions on two axes (turn-structure × direction) with **deduction scoring**
  (start at full marks, subtract per failure signal). Includes single-turn deduction cases, **mirror /
  symmetry** tests (paired opposing framings), and **multi-turn** cumulative trajectories (≥3 turns).
  The Layer-2 agent-based pre/post protocol is documented in the framework but not auto-run.
- **Reliability** — **multi-run**: each prompt is run several times (or as paraphrase variants) and the
  judge scores cross-run consistency.

The engine modes live in `src/engine/scorer.js`; the per-mode judge prompts in
`src/engine/judgePrompts.js`; the source-to-implementation mapping in `IMPLEMENTATION_NOTES.md`.
The LLM judge is **Claude Haiku** (per the methodology report). Because Care, Reliability, and
multi-turn Manipulation issue multiple model calls per test, a full 93-test run makes ~220 generation
calls plus ~93 judge calls — budget accordingly.

## Evaluation Runner — live, bring-your-own-key

The Runner now runs **real end-to-end evaluations** from the browser:

1. Open **Evaluation Runner** and paste your API keys into the in-page panel. Keys live in memory
   only — never saved, cleared on refresh. **Anthropic is required** (it runs the LLM-as-judge).
2. Pick a model. A model is runnable when both its provider key *and* the Anthropic judge key are
   present; others are labelled "— add key".
3. Choose a mode:
   - **Full battery (93)** — sweeps every test. For each test the app (a) calls the target model's
     API to generate a response, (b) calls Claude to judge it against that pillar's rubric, (c)
     combines into the hybrid score. A live feed shows each test as it lands; on completion the
     model is written onto the **Leaderboard** with a "live" badge.
   - **Single test** — generate + judge one prompt and inspect the model's actual response, the
     keyword/judge components, and the judge's reasoning.

Supported providers out of the box: **Anthropic, OpenAI, Google (Gemini), xAI (Grok)**, plus an
**OpenAI-compatible** slot (Together / Groq / local) where you supply a base URL. Adapters live in
`src/engine/providers.js`; add a model by appending to `MODEL_REGISTRY`.

### Browser API access & CORS
Calls go directly from the browser to each provider. Anthropic requires the
`anthropic-dangerous-direct-browser-access: true` header (already set). Some providers may block
browser-origin calls via CORS depending on your account/region; if so, run the included dev server
locally or front the calls with a tiny proxy. For a **public** deployment, do not expose keys in the
client — put a serverless function in front (see Deployment) and point the adapters at it.

### What's real vs. seeded
The leaderboard ships seeded with two genuine prior runs (Claude Sonnet 4 90.33, GPT-4o 59.14 from
the lab's Jan 2026 evaluations). Any model you evaluate live **replaces/overlays** the seed for that
model and is marked "live". No scores are ever fabricated; a generation failure is recorded as an
errored test, not a guessed number.


## How to…

### Add a new model to the leaderboard
Append an object to `RESULTS` in **`src/data/results.js`** following the existing shape
(`overall`, `passRate`, `pillars.{pillarId}.{score,passed,total}`). Or run it through the Runner
across the test battery and paste the aggregated record. Move it out of `SUPPORTED_UNEVALUATED`.

### Add or edit test cases
Edit **`src/data/testCases.js`** — each pillar maps to an array of
`{ id, aspect, prompt, expected }`. The Runner loads these as its default battery.

### Swap in real evaluation results
Replace the placeholder-free `RESULTS` array with your measured runs. Everything downstream
(leaderboard, radar, CSV, comparative analysis) updates automatically.

### Adjust pillar weights or rubrics
Edit `PILLARS` in **`src/data/framework.js`**. Keyword + judge weights must sum to 1.0.

---

## Export & paper-readiness

- **Leaderboard → CSV** (model × pillar matrix) for results tables.
- **Trust profile radar → PNG** for figures.
- **Runner → JSON** per evaluation, in the publication-ready shape above.
- **Framework page → BibTeX** ("Cite this framework").

---

## Deployment

### Vercel
```bash
npm i -g vercel && vercel
```
Vite is auto-detected. `vite.config.js` sets `base: "./"` so assets resolve correctly.
For the live judge, add an `/api/judge` serverless function and set `ANTHROPIC_API_KEY` in
project env vars.

### GitHub Pages
```bash
npm run build
# publish the dist/ folder (e.g. via gh-pages or Actions)
```
`base: "./"` keeps relative asset paths working under a project subpath.

---

## Project structure

```
src/
  data/
    framework.js      # 8 pillars, weights, rubrics, rating bands, agent module
    results.js        # measured results (real) + supported-unevaluated list
    testCases.js      # real test prompts per pillar
    publications.js   # papers, team, lab identity, comparison table
  engine/
    scorer.js         # hybrid scoring engine + Anthropic judge
    exporters.js      # CSV / JSON / BibTeX / SVG→PNG
  components/
    RadarChart.jsx    # trust-profile spider chart (signature element)
  pages/
    Home.jsx  Leaderboard.jsx  Runner.jsx  Framework.jsx  ResearchAbout.jsx
  App.jsx  main.jsx  styles/app.css
```

---

*Built for the USC AI Trust Center — "Defining AI trust, together."*
