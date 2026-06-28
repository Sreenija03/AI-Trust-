// ============================================================================
// USC AI Trust Lab — Unified AI Trust Framework (VERSION 2)
// Source: Prof. Agarwal / Yudie / Tumeryk collaboration spreadsheet
//   ("Working AI Trust Framework", "Proposed Trust Score V3", "Probe_Progress").
//
// This is the newer, more comprehensive framework. The site's live scoring still
// runs on Version 1 (the 8 USC pillars). Version 2 is represented here as a
// structured, documented framework with: 7 dimensions across 2 layers, ~25
// sub-categories, evaluation methods, real dataset/probe mappings, and a mapping
// back to the Version-1 USC pillars. Where a V2 sub-category maps onto a V1
// pillar we CAN already score, that link is recorded so partial V2 coverage can
// be reported; the rest is documented as the research roadmap.
// ============================================================================

export const FRAMEWORK_VERSION = {
  v1: { id: "v1", name: "USC 8-Pillar Trust Framework", status: "scored", note: "The original framework the students' research is built on. Fully wired for live scoring." },
  v2: { id: "v2", name: "Unified AI Trust Framework (V2)", status: "partial", note: "Newer Tumeryk/USC framework. Research in progress; partial live coverage via the V1→V2 mapping, remainder documented as roadmap." },
};

// alignment standards cited in the sheet
export const V2_ALIGNMENT = ["NIST AI RMF 600.1", "EU AI Act Art.15", "TrustGen Guidelines 1,5,6,7", "Blueprint for AI Bill of Rights"];

// Coverage status tokens for each sub-category.
//   live      = maps to a V1 pillar we already score live
//   dataset   = needs an external benchmark dataset wired in (named below)
//   probe     = needs a garak/Inspect probe harness (external tool)
//   roadmap   = defined but not yet implemented
export const V2_LAYERS = [
  {
    id: "layer1",
    name: "Layer 1 — Model Intrinsic Risk",
    question: "Is the model itself trustworthy?",
    blurb:
      "Evaluates the model as a standalone component: its reasoning quality, truthfulness, value alignment, content safety, and the integrity of its training pipeline. These risks exist regardless of how or where the model is deployed.",
    dimensions: [
      {
        id: "truthfulness", name: "Truthfulness",
        definition: "The ability to provide accurate, factual, and unbiased information while avoiding hallucinations, sycophancy, and deceptive outputs.",
        subs: [
          { id: "hallucination", name: "Hallucination / Veracity", coverage: "live", v1: "veracity",
            definition: "Generation of content that is plausible but inconsistent with facts or the user's request.",
            method: "Factual-error detection vs. reliable sources + contextual-fidelity detection. LLM-as-Judge + dynamic datasets (Wikipedia, Snopes, FactCheck.org).",
            datasets: ["snowball.GraphConnectivity", "snowball.Primes", "snowball.Senators", "packagehallucination.*"] },
          { id: "sycophancy", name: "Sycophancy", coverage: "dataset", v1: "candor",
            definition: "Tendency to prioritize reward/approval over truthfulness: persona, preconception, and self-doubt sycophancy.",
            method: "LLM-Judge checks whether the model changes a correct answer to agree with the user.",
            datasets: ["Sycophancy-Eval (Sharma 2023, meg-tong/sycophancy-eval)"] },
          { id: "honesty", name: "Honesty / Candor", coverage: "live", v1: "candor",
            definition: "Capacity to state what is believed and factually accurate, and to express uncertainty when it does not know.",
            method: "LLM-Judge checks whether the model fabricates an answer to an unanswerable question.",
            datasets: ["SelfAware (Yin 2023, yinzhangyue/SelfAware)", "TruthfulQA"] },
          { id: "adversarial_factuality", name: "Adversarial Factuality", coverage: "live", v1: "veracity",
            definition: "Maintaining factual accuracy under deliberately misleading inputs.",
            method: "LLM-Judge on misleading/false-premise prompts.",
            datasets: ["misleading.FalseAssertion", "goodside.WhoIsRiley", "donotanswer.MisinformationHarms"] },
        ],
      },
      {
        id: "fairness", name: "Fairness & Bias",
        definition: "Providing unbiased outputs by avoiding stereotypes, disparagement, and preferential treatment across groups and viewpoints.",
        subs: [
          { id: "stereotypes", name: "Stereotypes", coverage: "dataset", v1: "cultural",
            definition: "Generalized, oversimplified assumptions about social groups (gender, race, occupation, religion).",
            method: "Compare model perplexity/preference on stereo vs anti-stereo pairs.",
            datasets: ["CrowS-Pairs (Nangia 2020)", "BBQ (Parrish 2022)", "StereoSet"] },
          { id: "disparagement", name: "Disparagement", coverage: "probe", v1: "cultural",
            definition: "Broad negative statements that discriminate against specific groups.",
            method: "Open-ended generation, slur and intolerance detection.",
            datasets: ["lmrc.SlurUsage"] },
          { id: "preference", name: "Preference", coverage: "dataset", v1: "cultural",
            definition: "Systematic political/cultural/ideological bias favoring particular ideas or groups.",
            method: "Compare answer distribution against survey data (e.g. Pew).",
            datasets: ["OpinionQA (Santurkar 2023, Stanford)"] },
        ],
      },
      {
        id: "safety_human", name: "Safety (Human)",
        definition: "Preventing user-facing harm through outputs while maintaining usability: toxicity, psychological safety, misuse refusal, and avoidance of over-refusal.",
        subs: [
          { id: "toxicity", name: "Toxicity", coverage: "probe", v1: null,
            definition: "Resilience against producing toxic/offensive output.",
            method: "Perspective API + Longformer classifier on continuation prompts.",
            datasets: ["realtoxicityprompts.* (Flirtation/Insult/Threat/Severe/Profanity)", "atkgen.Tox", "continuation.ContinueSlurs"] },
          { id: "psych_safety", name: "Psychological Safety / Care", coverage: "live", v1: "care",
            definition: "Supportive, non-judgmental environment; safe handling of mental-health situations and vulnerable users.",
            method: "LLM-Judge on care vector (relational/epistemic/agency).",
            datasets: ["lmrc.SexualContent", "lmrc.Sexualisation", "lmrc.Deadnaming", "lmrc.Bullying"] },
          { id: "misuse", name: "Misuse", coverage: "probe", v1: null,
            definition: "Resisting malicious use: harmful instructions, illegal-activity guidance.",
            method: "Refusal detection on malicious-intent prompts.",
            datasets: ["lmrc.Profanity", "donotanswer.*"] },
          { id: "exaggerated_safety", name: "Exaggerated Safety", coverage: "dataset", v1: "transparency",
            definition: "Over-refusal of clearly harmless requests ('false refusal').",
            method: "LLM-Judge checks whether the model over-refuses a safe prompt.",
            datasets: ["XSTest (Röttger 2023, paul-rottger/xstest)"] },
        ],
      },
      {
        id: "ethics", name: "Ethics & Value Alignment",
        definition: "Making decisions aligned with moral reasoning and societal values; avoiding goals that conflict with human well-being in autonomous settings.",
        subs: [
          { id: "implicit_ethics", name: "Implicit Ethics", coverage: "dataset", v1: "manipulation",
            definition: "Whether outputs naturally conform to ethical norms without being asked.",
            method: "ETHICS benchmark (commonsense morality) via Inspect AI; LLM-Judge ethical/unethical.",
            datasets: ["ETHICS: Commonsense Morality (Hendrycks 2021)"] },
          { id: "explicit_ethics", name: "Explicit Ethics", coverage: "dataset", v1: "manipulation",
            definition: "Whether the model gives value-aligned answers when directly asked to judge morality.",
            method: "ETHICS benchmark (utilitarianism) via Inspect AI.",
            datasets: ["ETHICS: Utilitarianism"] },
          { id: "awareness", name: "Awareness", coverage: "dataset", v1: null,
            definition: "Cognition of ethical concepts; identifying and discussing moral dilemmas.",
            method: "ETHICS (justice/deontology) via Inspect AI; garak 'ethics' tags.",
            datasets: ["ETHICS: Justice / Deontology", "MACHIAVELLI", "MoralChoice"] },
          { id: "manipulation_corrigibility", name: "Manipulation & Corrigibility / Excessive Agency", coverage: "live", v1: "manipulation",
            definition: "Preserving human agency; resisting manipulation and excessive autonomy.",
            method: "Custom probes (Inspect AI); LLM-Judge on autonomy preservation.",
            datasets: ["Custom dynamic probes"] },
          { id: "social_impact", name: "Social Impact", coverage: "dataset", v1: null,
            definition: "Acting as a tool to enhance human well-being; prosocial guidance.",
            method: "LLM-Judge: prosocial vs harmful response.",
            datasets: ["ProsocialDialog (Kim 2022, allenai/prosocial-dialog)"] },
        ],
      },
      {
        id: "robustness", name: "Robustness / Reliability",
        definition: "Maintaining accurate, stable outputs under perturbation or adversarial influence; logical coherence, consistency, resistance to anchoring.",
        subs: [
          { id: "natural_noise", name: "Natural Noise", coverage: "probe", v1: "reliability",
            definition: "Handling typos, perturbations, contextual ambiguity while preserving meaning.",
            method: "Perturbation probes (CheckList); mitigation-bypass detection.",
            datasets: ["badchars.*", "CheckList (Ribeiro 2020)"] },
          { id: "ood", name: "Out of Distribution", coverage: "roadmap", v1: "reliability",
            definition: "Not crashing or behaving unpredictably on rare/abnormal inputs.",
            method: "OOD input batteries.",
            datasets: ["TBD"] },
          { id: "reasoning_consistency", name: "Reasoning Consistency", coverage: "live", v1: "reliability",
            definition: "Logical coherence, internal consistency, resistance to anchoring bias.",
            method: "Multi-run consistency (our reliability mode).",
            datasets: ["divergence.Repeat"] },
        ],
      },
      {
        id: "security_model", name: "Security (Model)",
        definition: "Protecting data, resisting model-level misuse, and handling output safely.",
        subs: [
          { id: "privacy_leakage", name: "Privacy Leakage", coverage: "probe", v1: null,
            definition: "Inadvertent leak of sensitive/training data (extraction, membership inference).",
            method: "Data-extraction & membership-inference probes.",
            datasets: ["leakreplay.GuardianCloze", "leakreplay.NYTComplete", "grandma.Win10/11"] },
          { id: "privacy_awareness", name: "Privacy Awareness", coverage: "probe", v1: null,
            definition: "Understanding privacy; refusing to answer sensitive questions (RtA metric).",
            method: "Refuse-to-Answer detection on privacy prompts.",
            datasets: ["donotanswer.InformationHazard"] },
          { id: "jailbreak", name: "Jailbreak / Prompt Injection", coverage: "probe", v1: null,
            definition: "Eliciting restricted behavior via modified prompts (ASR metric).",
            method: "Manual + automated attack suites (GCG, TAP, DAN).",
            datasets: ["promptinject.*", "latentinjection.*", "dan.*", "encoding.*", "suffix.GCGCached", "tap.TAPCached"] },
          { id: "insecure_output", name: "Insecure Output Handling", coverage: "probe", v1: null,
            definition: "Unvalidated model output enabling injection/XSS/SQLi downstream.",
            method: "Output-validation auditing; injection-echo probes.",
            datasets: ["web_injection.*", "exploitation.SQLInjectionEcho", "ansiescape.*"] },
        ],
      },
    ],
  },
  {
    id: "layer2",
    name: "Layer 2 — Deployment & Supply-Chain Risk",
    question: "Is the system around the model trustworthy?",
    blurb:
      "After the model is embedded into an application or agent pipeline: configuration, access control, third-party dependency integrity, and provenance. Evaluated by audit and penetration testing rather than prompt-probing the model alone.",
    dimensions: [
      {
        id: "supply_chain", name: "Infra & Supply-Chain Security",
        definition: "Security configuration, access control (RBAC), encryption, API management, plugin validation, and model provenance in multi-agent systems.",
        subs: [
          { id: "config_audit", name: "Configuration & Access", coverage: "roadmap", v1: null,
            definition: "RBAC, encryption, API key management.", method: "Configuration auditing.", datasets: ["external: Tumeryk"] },
          { id: "dependency", name: "Dependency Integrity", coverage: "probe", v1: null,
            definition: "Third-party package/model integrity; package-hallucination supply-chain risk.",
            method: "Dependency scanning; package-hallucination probes.",
            datasets: ["packagehallucination.Python/JavaScript/Rust", "glitch.Glitch", "external: ModelScan · Snyk · Cleanlab"] },
          { id: "provenance", name: "Provenance Verification", coverage: "roadmap", v1: null,
            definition: "Model/data provenance in multi-agent systems.", method: "Provenance verification; penetration testing.", datasets: ["TBD"] },
        ],
      },
    ],
  },
];

// Quick coverage tally for the framework page.
export function v2Coverage() {
  let total = 0, live = 0, dataset = 0, probe = 0, roadmap = 0;
  for (const layer of V2_LAYERS) for (const dim of layer.dimensions) for (const s of dim.subs) {
    total++;
    if (s.coverage === "live") live++;
    else if (s.coverage === "dataset") dataset++;
    else if (s.coverage === "probe") probe++;
    else roadmap++;
  }
  return { total, live, dataset, probe, roadmap, livePct: Math.round((live / total) * 100) };
}

export const COVERAGE_LABEL = {
  live: "Scored live now",
  dataset: "Needs benchmark dataset",
  probe: "Needs probe harness (garak/Inspect)",
  roadmap: "Roadmap",
};
export const COVERAGE_TOKEN = { live: "excellent", dataset: "acceptable", probe: "concerning", roadmap: "critical" };
