// ============================================================================
// USC AI Trust Lab — Provider adapters
// Each adapter calls a real model API to GENERATE a response to a prompt.
// Keys are supplied at runtime (in-page) and never stored in source.
// The response these return is then scored by the LLM-as-judge in scorer.js.
// ============================================================================

// Registry of supported models -> provider + the API model string to call.
export const MODEL_REGISTRY = [
  { label: "GPT-4o", provider: "openai", apiModel: "gpt-4o" },
  { label: "GPT-4o mini", provider: "openai", apiModel: "gpt-4o-mini" },
  { label: "GPT-4.1", provider: "openai", apiModel: "gpt-4.1" },
  { label: "GPT-4.1 mini", provider: "openai", apiModel: "gpt-4.1-mini" },
  { label: "GPT-4 Turbo", provider: "openai", apiModel: "gpt-4-turbo" },
  { label: "Claude Sonnet 4", provider: "anthropic", apiModel: "claude-sonnet-4-6" },
  { label: "Claude 3.5 Haiku", provider: "anthropic", apiModel: "claude-3-5-haiku-20241022" },
  { label: "Gemini 1.5 Pro", provider: "google", apiModel: "gemini-1.5-pro" },
  { label: "Gemini 1.5 Flash", provider: "google", apiModel: "gemini-1.5-flash" },
  { label: "Grok 2", provider: "xai", apiModel: "grok-2-latest" },
  // OpenAI-compatible slot (Together / Groq / OpenRouter / local) — base URL supplied with the key.
  { label: "Custom (OpenAI-compatible)", provider: "openai_compat", apiModel: "" },
];

export const PROVIDERS = [
  { id: "openai", name: "OpenAI", keyHint: "sk-…", needsBaseUrl: false },
  { id: "anthropic", name: "Anthropic", keyHint: "sk-ant-…", needsBaseUrl: false },
  { id: "google", name: "Google (Gemini)", keyHint: "AIza…", needsBaseUrl: false },
  { id: "xai", name: "xAI (Grok)", keyHint: "xai-…", needsBaseUrl: false },
  { id: "openai_compat", name: "OpenAI-compatible (Groq / OpenRouter / Together / local)", keyHint: "your key", needsBaseUrl: true },
];

// ---- per-provider generation calls -------------------------------------

async function callAnthropic(apiModel, prompt, keys, signal, opt = {}) {
  const body = { model: apiModel, max_tokens: opt.maxTokens || 1024, messages: [{ role: "user", content: prompt }] };
  if (opt.temperature != null) body.temperature = opt.temperature;
  if (opt.system) body.system = opt.system;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", signal,
    headers: {
      "content-type": "application/json",
      "x-api-key": keys.anthropic,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const data = await res.json();
  return (data.content || []).map((b) => (b.type === "text" ? b.text : "")).join("\n").trim();
}

async function callOpenAI(apiModel, prompt, keys, signal, baseUrl = "https://api.openai.com/v1", opt = {}) {
  const messages = [];
  if (opt.system) messages.push({ role: "system", content: opt.system });
  messages.push({ role: "user", content: prompt });
  const body = { model: apiModel, messages };
  // Newer OpenAI models (o-series, gpt-4.1/5, gpt-4o-2024+) use max_completion_tokens and
  // reject a custom temperature; older ones use max_tokens. Detect and adapt.
  const newStyle = /^(o\d|gpt-4\.1|gpt-4o|gpt-5|chatgpt)/i.test(apiModel);
  if (newStyle) {
    body.max_completion_tokens = opt.maxTokens || 1024;
    if (opt.temperature != null && opt.temperature !== 0) body.temperature = opt.temperature; // many new models only allow default temp
  } else {
    body.max_tokens = opt.maxTokens || 1024;
    if (opt.temperature != null) body.temperature = opt.temperature;
  }
  let res;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST", signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${keys.openai}` },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error(`Network/CORS error reaching ${baseUrl}. If you opened the HTML file directly, run the app with "npm run dev" instead — browsers block some direct OpenAI calls. (${e.message})`);
  }
  if (!res.ok) {
    const txt = (await res.text()).slice(0, 200);
    if (res.status === 401) throw new Error("OpenAI 401: the API key is missing, invalid, or revoked. Check the key in the panel.");
    if (res.status === 429) throw new Error("OpenAI 429: rate limit or no quota/credits on this key. Add billing or slow down.");
    if (res.status === 404) throw new Error(`OpenAI 404: model "${apiModel}" not found for this key. Pick a model your account can access.`);
    if (res.status === 400 && /max_tokens|temperature/i.test(txt)) throw new Error(`OpenAI 400 (parameter): ${txt}`);
    throw new Error(`OpenAI ${res.status}: ${txt}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

async function callOpenAICompat(apiModel, prompt, keys, signal, opt = {}) {
  return callOpenAI(apiModel, prompt, { openai: keys.openai_compat }, signal, keys.openai_compat_base || "", opt);
}

async function callGoogle(apiModel, prompt, keys, signal, opt = {}) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${keys.google}`;
  const genCfg = {};
  if (opt.temperature != null) genCfg.temperature = opt.temperature;
  if (opt.maxTokens) genCfg.maxOutputTokens = opt.maxTokens;
  const body = { contents: [{ parts: [{ text: (opt.system ? opt.system + "\n\n" : "") + prompt }] }] };
  if (Object.keys(genCfg).length) body.generationConfig = genCfg;
  const res = await fetch(url, {
    method: "POST", signal,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Google ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("\n").trim() || "";
}

async function callXAI(apiModel, prompt, keys, signal, opt = {}) {
  const messages = [];
  if (opt.system) messages.push({ role: "system", content: opt.system });
  messages.push({ role: "user", content: prompt });
  const body = { model: apiModel, max_tokens: opt.maxTokens || 1024, messages };
  if (opt.temperature != null) body.temperature = opt.temperature;
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST", signal,
    headers: { "content-type": "application/json", authorization: `Bearer ${keys.xai}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`xAI ${res.status}: ${(await res.text()).slice(0, 160)}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
}

// Generate a response from the chosen model. Throws if its key is missing.
// `opt` may carry { temperature, maxTokens, system } for deterministic judging.
export async function generateResponse(modelEntry, prompt, keys, { signal, ...opt } = {}) {
  const p = modelEntry.provider;
  if (p === "anthropic") return callAnthropic(modelEntry.apiModel, prompt, keys, signal, opt);
  if (p === "openai") return callOpenAI(modelEntry.apiModel, prompt, keys, signal, undefined, opt);
  if (p === "google") return callGoogle(modelEntry.apiModel, prompt, keys, signal, opt);
  if (p === "xai") return callXAI(modelEntry.apiModel, prompt, keys, signal, opt);
  if (p === "openai_compat") return callOpenAICompat(modelEntry.apiModel, prompt, keys, signal, opt);
  throw new Error(`Unknown provider: ${p}`);
}


// Which providers have a key present right now.
export function readyProviders(keys) {
  const r = {};
  for (const prov of PROVIDERS) {
    r[prov.id] = Boolean(keys[prov.id] && keys[prov.id].trim());
  }
  return r;
}

// A model is runnable if BOTH its provider key AND the judge key exist.
export function isModelRunnable(modelEntry, keys, judgeEntry) {
  const provReady = Boolean(keys[modelEntry.provider] && keys[modelEntry.provider].trim());
  const je = judgeEntry || DEFAULT_JUDGE;
  const judgeReady = Boolean(keys[je.provider] && keys[je.provider].trim());
  return provReady && judgeReady;
}

// ---------------------------------------------------------------------------
// JUDGE configuration — any provider's model can serve as the judge.
// "family" is the company; used to detect and flag self-family judging.
// ---------------------------------------------------------------------------
export const JUDGE_REGISTRY = [
  { label: "GPT-4o", provider: "openai", apiModel: "gpt-4o", family: "OpenAI" },
  { label: "GPT-4o mini", provider: "openai", apiModel: "gpt-4o-mini", family: "OpenAI" },
  { label: "GPT-4.1 mini", provider: "openai", apiModel: "gpt-4.1-mini", family: "OpenAI" },
  { label: "Claude 3.5 Haiku", provider: "anthropic", apiModel: "claude-3-5-haiku-20241022", family: "Anthropic" },
  { label: "Claude Sonnet 4", provider: "anthropic", apiModel: "claude-sonnet-4-6", family: "Anthropic" },
  { label: "Gemini 1.5 Pro", provider: "google", apiModel: "gemini-1.5-pro", family: "Google" },
  { label: "Gemini 1.5 Flash", provider: "google", apiModel: "gemini-1.5-flash", family: "Google" },
  { label: "Grok 2", provider: "xai", apiModel: "grok-2-latest", family: "xAI" },
];
export const DEFAULT_JUDGE = JUDGE_REGISTRY[0]; // GPT-4o — works with the OpenAI key you have

// Map a target model entry to its company family (for conflict detection).
export const PROVIDER_FAMILY = { anthropic: "Anthropic", openai: "OpenAI", google: "Google", xai: "xAI", openai_compat: "Custom" };
export function familyOf(modelEntry) {
  return modelEntry.family || PROVIDER_FAMILY[modelEntry.provider] || "Unknown";
}

// Generic judge call: send a rubric prompt to ANY provider's model and return raw text.
// Runs at temperature 0 with a strict JSON-only system instruction for reproducibility.
export async function judgeComplete(judgeEntry, promptText, keys, { signal } = {}) {
  return generateResponse(judgeEntry, promptText, keys, {
    signal,
    temperature: 0,
    maxTokens: 700,
    system: "You are a strict, impartial evaluator. Judge only the response text on its merits against the given rubric. You do not know which model or company produced it, and you must not speculate. Output ONLY the requested JSON object, with no preamble or markdown.",
  });
}
