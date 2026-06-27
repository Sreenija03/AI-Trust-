// ============================================================================
// USC AI Trust Lab — Publications, Team, and Lab Identity
// Source: Drive research corpus (per-pillar papers, org chart, 2-pager).
// ============================================================================

export const LAB = {
  name: "USC AI Trust Lab",
  longName: "USC AI Trust Center",
  tagline: "Defining AI trust, together.",
  thesis:
    "Existing frameworks measure model performance. They overlook trust. The USC AI Trust Lab evaluates trust itself — as a unified, quantified, multi-dimensional score across eight pillars.",
  affiliation: "University of Southern California",
  intersection:
    "Built at the intersection of USC's #1-ranked Communication School and a Top-10 Engineering School.",
  facultyLead: { name: "Prof. Shub Agarwal", role: "Faculty Lead & Founder", email: "shub.a@usc.edu" },
  pillars3: [
    { title: "AI Trust Scoring", body: "Define and develop industry-standard trust metrics for AI models and agentic AI systems." },
    { title: "Systematic AI Product Frameworks", body: "Build structured frameworks for trust-centered AI product development." },
    { title: "Global Cultural Trust", body: "Localize trust metrics for global languages; address cultural risk and bias in agentic AI." },
  ],
};

export const TEAM = [
  { name: "Prof. Shub Agarwal", role: "Faculty Lead & Founder" },
  { name: "Antonia Cartoni", role: "Project Manager" },
  { name: "Yuling Song", role: "Pillar Lead — Manipulation" },
  { name: "Harshita Sharma", role: "Pillar Lead — Care" },
  { name: "Karina Khan", role: "Pillar Lead — Cultural & Reliability" },
  { name: "Arya Verma", role: "Head Researcher" },
  { name: "Coco Xiong", role: "Head Researcher" },
  { name: "Rollie Chen", role: "Head Researcher" },
];

// Cards for each paper / preprint in the Drive's Academic Papers folders.
export const PUBLICATIONS = [
  {
    title: "AI Trust Evaluations — Comprehensive Methodology & Work Report",
    authors: "USC AI Trust Lab",
    year: 2026,
    pillar: "Index",
    abstract:
      "Documents the methodology and results of the 8-pillar AI Trust Evaluations platform. Introduces a hybrid scorer combining keyword heuristics with LLM-as-judge, per-pillar weighting, and a 0–100 trust scale. Reports measured results for Claude Sonnet 4 (90.33) and GPT-4o (59.14) across 93 tests.",
    type: "Internal report",
  },
  {
    title: "USC AI Trust Lab's 8-Pillar Framework: Competitive Landscape Analysis",
    authors: "USC AI Trust Lab",
    year: 2026,
    pillar: "Index",
    abstract:
      "Positions the 8-pillar framework against HELM, OpenAI Evals, Patronus AI, Giskard, Arthur AI, and MLCommons. Identifies three high-novelty contributions: Care/crisis response evaluation, Candor/limitation acknowledgment, and hybrid scoring with customizable per-pillar weighting.",
    type: "Analysis",
  },
  {
    title: "Veracity: An Open-Source AI Fact-Checking System",
    authors: "Veracity Research Group",
    year: 2025,
    pillar: "Veracity",
    abstract:
      "An LLM + retrieval + evidence pipeline for automated fact-checking. Foundational reference for the Veracity Index's hallucination-detection and misleading-premise sub-pillars.",
    type: "System paper",
  },
  {
    title: "AI Trust Index — Manipulation Testing Framework (v7)",
    authors: "Manipulation Research Group",
    year: 2026,
    pillar: "Manipulation",
    abstract:
      "Defines manipulation as covert influence that exploits cognitive, emotional, or informational vulnerabilities. Organizes 20 dimensions across two axes (turn-structure × direction) with deduction-based scoring and a two-layer testing methodology.",
    type: "Framework",
  },
  {
    title: "AI Care Research Design (RQ + Standard + Methodology)",
    authors: "Care Research Group",
    year: 2026,
    pillar: "Care",
    abstract:
      "Operationalizes AI Care across Relational, Epistemic, and Agency dimensions. Defines a 60-case benchmark with follow-up pressure tests and a 3-dimensional score vector per case.",
    type: "Methodology",
  },
  {
    title: "Reliability Evaluation Framework and Test Suite",
    authors: "Reliability Research Group",
    year: 2026,
    pillar: "Reliability",
    abstract:
      "Proposes a six-test reliability suite — output consistency, prompt robustness, reasoning stability, long-context retrieval, edge-case handling, and response variance — unifying scattered industry practice into a single framework.",
    type: "Framework",
  },
  {
    title: "A Comprehensive Survey of Hallucination Mitigation Techniques in LLMs",
    authors: "Survey (external reference)",
    year: 2024,
    pillar: "Veracity",
    abstract:
      "Surveys hallucination mitigation techniques across retrieval, decoding, and training interventions. Grounds the Veracity Index hallucination sub-pillar.",
    type: "Survey",
  },
  {
    title: "DarkBench: Benchmarking Manipulative Design in LLMs",
    authors: "External reference",
    year: 2025,
    pillar: "Manipulation",
    abstract:
      "Benchmarks dark patterns and manipulative tendencies in LLMs; reports a ~13% sycophancy rate. Empirical anchor for the Manipulation Index's sycophancy-resistance sub-pillar.",
    type: "Benchmark",
  },
];

// Comparison table: USC vs HELM vs LMSYS Chatbot Arena (Framework Documentation page).
export const FRAMEWORK_COMPARISON = {
  columns: ["USC AI Trust Lab", "Stanford HELM", "LMSYS Chatbot Arena"],
  rows: [
    { feature: "Scoring method", values: ["Hybrid (keyword + LLM-judge)", "Standardized metrics", "Human pairwise votes (Elo)"] },
    { feature: "Unified trust score", values: ["Yes (0–100)", "Per-metric only", "Single quality Elo"] },
    { feature: "Sycophancy / Candor", values: ["Yes (Candor pillar)", "No", "Indirect"] },
    { feature: "Crisis / Care response", values: ["Yes (Care pillar)", "No", "No"] },
    { feature: "Manipulation resistance", values: ["Yes (20 dimensions)", "Basic disinformation", "No"] },
    { feature: "Custom per-pillar weighting", values: ["Yes", "No", "No"] },
    { feature: "Pass/fail thresholds", values: ["Yes", "No", "No"] },
    { feature: "Public leaderboard scale", values: ["Emerging (93 tests)", "Large (42 scenarios)", "Very large (crowd votes)"] },
  ],
};
