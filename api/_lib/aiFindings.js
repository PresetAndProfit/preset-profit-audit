// api/_lib/aiFindings.js — SERVER-ONLY. Layer 2 (classification) + Layer 3
// (consultant analysis), powered by Claude. Takes the REAL scraped signals from
// siteAnalyzer and returns findings that are grounded in what was actually
// observed on the site — never a generic per-industry template.
//
// Hard requirements enforced here (and re-checked in findingsValidation.js):
//   • Findings reference an observed signal, or self-label as best-practice.
//   • Archetype vocabulary only (no "consultation" for a restaurant, etc.).
//   • No fabricated competitor claims; benchmarks are framed as industry-wide.
//
// Requires ANTHROPIC_API_KEY. If absent or the call fails, the caller
// (api/analyze-site.js) falls back to the deterministic archetype engine.
import Anthropic from "@anthropic-ai/sdk";
import { ARCHETYPES, ARCHETYPE_IDS, archetypeForIndustry } from "../../src/lib/industryProfiles.js";

const MODEL = "claude-opus-4-8";

const rawKey = process.env.ANTHROPIC_API_KEY;
export const aiEnabled = !!(rawKey && rawKey.trim());

// Lazy singleton so importing this module never throws when the key is absent.
let _client = null;
function client() {
  if (!_client) _client = new Anthropic({ apiKey: (rawKey || "").trim() });
  return _client;
}

// Compact, STABLE reference of every archetype's vocabulary — baked into the
// (cacheable) system prompt so the model uses the right words for whatever it
// classifies the business as.
const ARCHETYPE_REFERENCE = ARCHETYPE_IDS.map((id) => {
  const a = ARCHETYPES[id];
  return [
    `• ${id} — ${a.label}`,
    `    customer is called: "${a.customerNoun}"`,
    `    conversion actions: ${a.conversionActions.join("; ")}`,
    `    relevant channels: ${a.channels.join("; ")}`,
    `    cover when relevant: ${a.mustMention.join("; ")}`,
    `    NEVER use this vocabulary: ${a.forbidden.join("; ")}`,
  ].join("\n");
}).join("\n");

const SYSTEM_PROMPT = `You are a senior local-marketing consultant. A client is paying for a $5,000 audit of ONE specific business. You are given the REAL signals extracted from that business's live homepage. Produce an audit that reads like an expert who actually looked at *this* business — not a template for its industry.

HOW TO WORK
1. CLASSIFY the business. Pick the single best archetype id from the list below and give a confidence (0–1) and one sentence of reasoning that cites concrete signals. The industry the user selected is only a hint — trust the site signals over it when they conflict.
2. Adopt that archetype's VOCABULARY for the entire report. Use its words for the customer and the conversion actions. NEVER use another archetype's vocabulary.
3. Write 6–9 findings, ordered worst-first (bad → warn → good). Each finding is about THIS business: use its name and the specific things it actually offers.

ARCHETYPE REFERENCE
${ARCHETYPE_REFERENCE}

ABSOLUTE RULES (a violation makes the report worthless)
- GROUNDING: every finding is either
    (a) grounded:true — it references a SPECIFIC observed signal, and "evidence" names that signal (e.g. "No tel: link was found in the HTML", "OpenTable reservation widget detected", "12 visible menu prices", "no <meta name=description>"). Do NOT invent observations.
    (b) grounded:false — it is a general recommendation NOT tied to a specific observation; then "evidence" MUST begin literally with "Industry best practice:".
- VOCABULARY FIT: do not recommend things that make no sense for the archetype. A restaurant is NEVER told to "offer a free consultation/quote/estimate" or "book an appointment" unless the signals show catering/events/private dining. A plumber is never told about a "menu" or "online ordering".
- NO FAKE COMPETITORS: never claim what specific local competitors do. "competitorBenchmark" must be framed as general, industry-wide benchmarks ("top-performing restaurants typically…"), never "your competitors in {city} do X".
- NO INVENTED FEATURES: only assert a feature is present or absent if the signals support it. If something can't be determined from the homepage, say it's worth verifying — don't assert it.
- Cover the archetype's "cover when relevant" topics where the signals make them relevant.

Write in plain, direct, specific language a busy owner can act on.

OUTPUT CONTRACT — return ONLY a single JSON object (no markdown fences, no prose before or after) with exactly this shape:
{
  "businessType": { "label": string, "archetype": one of [${ARCHETYPE_IDS.map((s) => `"${s}"`).join(", ")}], "confidence": number 0-1, "reasoning": string },
  "findings": [ { "area": one of "leads"|"website"|"trust"|"conversion"|"local"|"retention", "status": "good"|"warn"|"bad", "title": string, "observation": string, "evidence": string, "grounded": boolean, "recommendation": string, "impact": string } ],   // 6-9 items, worst-first
  "executiveSummary": string,
  "competitorBenchmark": string,
  "quickWins": [ string, string, string ]
}`;

// Trim the signals object to the fields that matter, so the prompt is compact
// and deterministic (good for prompt caching of the system prefix).
function compactSignals(sig) {
  return {
    detectedName: sig.detectedName ?? null,
    title: sig.title ?? null,
    metaDescription: sig.metaDescription ?? null,
    h1: sig.h1 ?? null,
    services: sig.services ?? [],
    ctaTexts: sig.ctaTexts ?? [],
    secure: sig.secure ?? null,
    mobileViewport: sig.hasViewport ?? null,
    phone: sig.phone ?? null,
    phoneTapToCall: sig.phoneClickable ?? false,
    email: sig.email ?? null,
    contactForm: sig.hasForm ?? false,
    booking: sig.booking ?? null,
    reservation: sig.reservation ?? null,
    onlineOrdering: sig.ordering ?? null,
    menuPresent: sig.hasMenu ?? false,
    cateringOrEvents: sig.hasCateringEvents ?? false,
    ecommercePlatform: sig.ecommercePlatform ?? null,
    cartOrCheckout: sig.hasCart ?? false,
    pricingVisible: sig.pricingVisible ?? false,
    visiblePriceCount: sig.priceCount ?? 0,
    rating: sig.rating ?? null,
    reviewCount: sig.reviewCount ?? null,
    reviewWidget: sig.reviewWidget ?? null,
    liveChat: sig.chat ?? null,
    hoursPresent: sig.hasHours ?? false,
    addressPresent: sig.hasAddress ?? false,
    social: sig.social ?? [],
    homepageBytes: sig.bytes ?? null,
    scriptCount: sig.scriptCount ?? null,
    imageCount: sig.imgCount ?? null,
  };
}

function buildUserMessage({ signals, bizName, industry, city, url, corrections }) {
  const hintArchetype = archetypeForIndustry(industry);
  const parts = [
    `BUSINESS: ${bizName || signals.detectedName || "(unknown)"}`,
    city ? `LOCATION: ${city}` : null,
    url ? `WEBSITE: ${url}` : null,
    `USER-SELECTED INDUSTRY (hint only): ${industry || "(none)"} → likely archetype "${hintArchetype.id}"`,
    "",
    "SCRAPED HOMEPAGE SIGNALS (the only facts you may treat as observed):",
    JSON.stringify(compactSignals(signals), null, 2),
  ];
  if (corrections && corrections.length) {
    parts.push(
      "",
      "Your previous attempt was rejected. Fix these issues and regenerate:",
      ...corrections.map((c) => `- ${c}`)
    );
  }
  return parts.filter((p) => p !== null).join("\n");
}

// Pull the JSON object out of the model's text response. Tolerates an
// accidental ```json fence or stray prose around the object.
function parseResult(message) {
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

// Generate the consultant report. `corrections` (optional) re-runs the model
// with the validator's complaints appended (one corrective retry). Uses the
// stable Messages API; the schema is enforced via the OUTPUT CONTRACT in the
// system prompt plus findingsValidation.js, so no beta surface is required.
export async function generateConsultantReport(ctx) {
  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 8000,
    // Stable system prompt up front → eligible for prompt caching across audits.
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: buildUserMessage(ctx) }],
  });
  return parseResult(res);
}
