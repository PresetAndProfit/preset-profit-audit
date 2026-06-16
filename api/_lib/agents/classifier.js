// api/_lib/agents/classifier.js — SERVER-ONLY. V2 Phase 2: the BUSINESS
// CLASSIFICATION AGENT (Stage 0 of the agent chain).
//
// PURPOSE: derive the BUSINESS INTELLIGENCE PROFILE (BIP) — the spine — BEFORE
// any analysis runs, so every downstream agent (consultant today; competitor /
// sales / social / synthesis in later phases) reasons from one shared
// understanding of the business MODEL instead of re-deriving it. Per the V2
// diagnostic principle, the profile exists to FOCUS the diagnosis on the leaks
// that cost THIS business model the most — not to describe the business.
//
// DESIGN: the (network) AI call is isolated in classifyBusiness(); the parse →
// validate → enrich pipeline (normalizeProfile) and renderProfileForPrompt() are
// PURE and unit-tested offline (scripts/check-classifier.mjs). Classification
// uncertainty is handled by getBlendedFramework (Phase 1.5): the agent RANKS
// industries with confidence and never forces a single pick.
//
// Uses Claude Haiku (classification/extraction, not prose) to keep cost low.
// Requires ANTHROPIC_API_KEY; any failure → classifyBusiness returns null and
// api/analyze-site.js proceeds on the user's industry hint (never breaks).

import Anthropic from "@anthropic-ai/sdk";
import { compactSignals, ALLOWED_SIGNAL_KEYS } from "../aiFindings.js";
import { INDUSTRY_LEAD_VALUE } from "../../../src/lib/constants.js";
import {
  FRAMEWORK_INDUSTRIES,
  archetypeIdForIndustry,
  getBlendedFramework,
} from "../../../src/lib/frameworks/index.js";

const MODEL = process.env.CLASSIFIER_MODEL || "claude-haiku-4-5";
const rawKey = process.env.ANTHROPIC_API_KEY;
export const classifierEnabled = !!(rawKey && rawKey.trim());

let _client = null;
function client() {
  if (!_client) _client = new Anthropic({ apiKey: (rawKey || "").trim() });
  return _client;
}

// The closed set of industries the classifier may rank (single source of truth:
// the framework registry). Forcing candidates into this set keeps the BIP, the
// framework lookup, and the economics tables aligned.
export const ALLOWED_INDUSTRIES = FRAMEWORK_INDUSTRIES;

const SYSTEM_PROMPT = `You are a business-classification engine for a senior marketing-consulting platform. You are given the REAL signals scraped from ONE business's homepage. Output a BUSINESS INTELLIGENCE PROFILE as a single JSON object — nothing else.

YOUR JOB IS TO RANK, NOT TO FORCE. Classification drives the entire downstream audit, so calibrate honestly:
- Return industryCandidates as a confidence-ranked list (highest first). When the signals clearly identify the business, the top candidate carries high confidence and others are minor. When signals are ambiguous or overlap several verticals (e.g. a med spa vs. a dermatology clinic vs. a salon), spread the confidence and include 2–3 genuine FALLBACKS — do NOT inflate one answer.
- confidence is 0..1 and need not sum to 1. A thin or generic scrape MUST read uncertain.
- Every industry you name MUST be copied EXACTLY from the ALLOWED INDUSTRIES list. Never invent one.

GROUNDING (a violation makes the profile worthless):
- The scraped SIGNALS object is your ONLY source of observed fact. Cite a signal by its EXACT key. The controlled vocabulary is: ${ALLOWED_SIGNAL_KEYS.join(", ")}. The only other allowed evidence token is the literal "Industry best practice".
- Every model field is EITHER an Inference object { "value": <string|string[]>, "confidence": <number 0..1>, "basis": "observed"|"best_practice", "evidence": [<signal keys or "Industry best practice">] } OR null. Returning null when the signals don't support an inference is correct and expected.
- basis "observed" REQUIRES >=1 real signal key in evidence that genuinely supports the claim; basis "best_practice" REQUIRES evidence exactly ["Industry best practice"].
- NEVER invent business attributes, competitors, geography, or numbers. Do not state any dollar value — lead value is computed downstream from benchmarks.

ALLOWED INDUSTRIES (copy exactly):
${ALLOWED_INDUSTRIES.join(", ")}

OUTPUT CONTRACT — return ONLY this JSON object (no markdown, no prose):
{
  "industryCandidates": [ { "industry": <one of ALLOWED INDUSTRIES>, "confidence": <number 0..1> } ],
  "businessType": { "label": <string>, "confidence": <number 0..1>, "reasoning": <one sentence citing concrete signals>, "evidence": [<signal keys>] },
  "revenueModel": Inference|null,            // e.g. "appointment-based", "subscription", "transactional retail", "project / quote-based", "retainer"
  "serviceModel": Inference|null,            // value one of: "service", "product", "hybrid"
  "geoScope": Inference|null,                // value one of: "local", "regional", "national"
  "salesCycle": Inference|null,              // value one of: "short", "medium", "long"
  "competitiveIntensity": Inference|null,    // value one of: "low", "medium", "high"
  "acquisitionChannels": Inference|null,     // value is an array of channel strings; drop any not traceable to a signal, else whole field is best_practice
  "primaryConversion": Inference|null,       // the main action a customer takes (e.g. "book an appointment", "request a quote", "order online")
  "customerJourney": Inference|null          // value: one concise sentence describing how a customer goes from discovery to purchase
}`;

function buildUserMessage({ signals, bizName, industry, city, url }) {
  return [
    `BUSINESS: ${bizName || signals.detectedName || "(unknown)"}`,
    city ? `LOCATION HINT (do not echo as observed geography): ${city}` : null,
    url ? `WEBSITE: ${url}` : null,
    `USER-SELECTED INDUSTRY (a weak hint — trust the signals over it): ${industry || "(none)"}`,
    "",
    "SCRAPED HOMEPAGE SIGNALS (the only facts you may treat as observed):",
    JSON.stringify(compactSignals(signals), null, 2),
  ].filter((p) => p !== null).join("\n");
}

function parseClassifierJson(message) {
  const block = (message.content || []).find((b) => b.type === "text");
  if (!block) throw new Error("no-text-block");
  let txt = block.text.trim();
  const fence = txt.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) txt = fence[1].trim();
  const start = txt.indexOf("{");
  const end = txt.lastIndexOf("}");
  if (start !== -1 && end > start) txt = txt.slice(start, end + 1);
  return JSON.parse(txt);
}

const clamp01 = (n) => Math.max(0, Math.min(1, Number(n) || 0));

// Keep only well-formed Inference objects; everything else becomes null (a
// malformed field must never poison the profile or downstream prompts).
function cleanInference(inf) {
  if (!inf || typeof inf !== "object" || Array.isArray(inf)) return null;
  const { value } = inf;
  const okValue = typeof value === "string" ? value.trim().length > 0
    : Array.isArray(value) ? value.filter((v) => typeof v === "string" && v.trim()).length > 0
    : false;
  if (!okValue) return null;
  const basis = inf.basis === "observed" ? "observed" : "best_practice";
  const evidence = Array.isArray(inf.evidence) ? inf.evidence.filter((e) => typeof e === "string") : [];
  return {
    value: Array.isArray(value) ? value.filter((v) => typeof v === "string" && v.trim()) : value,
    confidence: clamp01(inf.confidence),
    basis,
    evidence,
  };
}

// Lead value is ALWAYS deterministic — composed from the industry economics in
// constants.js, never fabricated by the model. Tiers from the conservative
// per-customer value; archetype fallback for the forward-looking verticals that
// have no economics row yet.
const ARCHETYPE_LEAD_TIER = {
  high_ticket_advisory: "high",
  quote_trades: "medium",
  appointment_services: "medium",
  retail_ecommerce: "low",
  hospitality: "low",
};
function deriveLeadValue(primaryIndustry, archetypeId, confidence) {
  const usd = INDUSTRY_LEAD_VALUE[primaryIndustry];
  if (usd != null) {
    const tier = usd >= 1000 ? "high" : usd >= 300 ? "medium" : "low";
    return { tier, perCustomerValueUsd: usd, basis: "industry_benchmark", confidence: clamp01(confidence) };
  }
  return { tier: ARCHETYPE_LEAD_TIER[archetypeId] || "medium", perCustomerValueUsd: null, basis: "archetype_default", confidence: clamp01(confidence) * 0.6 };
}

// PURE: turn a raw model object into a validated, enriched BIP — or null if the
// classification is unusable (no valid candidate). Deterministic; unit-tested.
export function normalizeProfile(raw, { signals = {}, bizName = null, industry = null } = {}) {
  if (!raw || typeof raw !== "object") return null;

  // 1. Sanitize candidates against the allowed set; drop unknowns; sort desc.
  const candidates = (Array.isArray(raw.industryCandidates) ? raw.industryCandidates : [])
    .map((c) => {
      if (!c || typeof c.industry !== "string") return null;
      const match = ALLOWED_INDUSTRIES.find((a) => a.toLowerCase() === c.industry.toLowerCase());
      return match ? { industry: match, confidence: clamp01(c.confidence) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.confidence - a.confidence);

  if (candidates.length === 0) return null; // unusable → caller falls back to the hint

  // 2. Resolve archetype + the (single OR blended) classification meta via the
  //    Phase-1.5 blending machinery — the SAME meta the framework uses.
  const primaryIndustry = candidates[0].industry;
  const archetype = archetypeIdForIndustry(primaryIndustry);
  const { classification } = getBlendedFramework(candidates);
  const resolvedIndustry = classification.blended
    ? classification.candidates.map((c) => c.industry).join(" / ")
    : primaryIndustry;

  // 3. businessType.
  const bt = raw.businessType && typeof raw.businessType === "object" ? raw.businessType : {};
  const businessType = {
    label: typeof bt.label === "string" && bt.label.trim() ? bt.label.trim() : primaryIndustry,
    archetype,
    confidence: clamp01(bt.confidence ?? candidates[0].confidence),
    reasoning: typeof bt.reasoning === "string" ? bt.reasoning : "",
    evidence: Array.isArray(bt.evidence) ? bt.evidence.filter((e) => typeof e === "string") : [],
  };

  return {
    schemaVersion: 1,
    source: "classifier_ai",
    modelUsed: MODEL,
    businessName: bizName || signals.detectedName || null,
    userIndustryHint: industry || null,

    industryCandidates: candidates,
    industry: resolvedIndustry,
    archetype,
    classification,
    businessType,

    // Business-model spine (Inference|null).
    revenueModel: cleanInference(raw.revenueModel),
    serviceModel: cleanInference(raw.serviceModel),
    geoScope: cleanInference(raw.geoScope),
    salesCycle: cleanInference(raw.salesCycle),
    competitiveIntensity: cleanInference(raw.competitiveIntensity),
    acquisitionChannels: cleanInference(raw.acquisitionChannels),
    primaryConversion: cleanInference(raw.primaryConversion),
    customerJourney: cleanInference(raw.customerJourney),

    // Deterministic economics (composed from constants.js).
    leadValue: deriveLeadValue(primaryIndustry, archetype, candidates[0].confidence),
  };
}

// Run the classifier. Returns a BIP or null (caller falls back to the hint).
export async function classifyBusiness(ctx) {
  if (!classifierEnabled) return null;
  let raw;
  try {
    const message = await client().messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: buildUserMessage(ctx) }],
    });
    raw = parseClassifierJson(message);
  } catch (e) {
    console.error("[classifier] call/parse failed", e?.message || e);
    return null;
  }
  return normalizeProfile(raw, ctx);
}
