// api/_lib/agents/salesIntel.js — V2 Phase 4: the SALES PROCESS AGENT.
//
// It does NOT just detect sales issues. It determines which capture → response →
// conversion → retention bottlenecks MATERIALLY affect growth in THIS industry
// and ranks them by likely revenue impact, using the same growth-driver
// weighting that governs the whole consultant:
//
//   impactScore = growthDriverWeight(for the driver this bottleneck serves)
//               × leadValueMultiplier(from the BIP)
//               × severity(how damaging when present)
//
// So a missed-call gap ranks near the top for a high-lead-value roofer (Estimate
// Conversion 20% × 1.4) but far lower for a walk-in restaurant (Phone 5% × 0.7).
// Bottlenecks are GATED by archetype (no "online ordering" finding for a
// dentist). Reasoning is pure (no external data); the Haiku narrative only
// explains the deterministic ranking, with a template fallback.
import Anthropic from "@anthropic-ai/sdk";
import { compactSignals } from "../aiFindings.js";
import { renderProfileForPrompt } from "./profile.js";
import { getBlendedFramework, getFramework } from "../../../src/lib/frameworks/index.js";

const MODEL = process.env.SALES_MODEL || "claude-haiku-4-5";
const rawKey = process.env.ANTHROPIC_API_KEY;
const aiOn = !!(rawKey && rawKey.trim());
let _client = null;
const client = () => (_client || (_client = new Anthropic({ apiKey: (rawKey || "").trim() })));

const STAGE_ORDER = { capture: 0, response: 1, conversion: 2, retention: 3 };
const LEAD_MULT = { high: 1.4, medium: 1.0, low: 0.7 };
const realBooking = (s) => !!(s.booking && s.booking !== "booking link");

// The bottleneck catalog. `driverKeywords` are matched (substring) against the
// industry's growth drivers so each bottleneck inherits the WEIGHT of the driver
// it actually serves (matchDriver picks the highest-weight match). `appliesTo`
// gates by archetype; null = all.
const BOTTLENECKS = [
  {
    id: "no_online_booking", stage: "capture", label: "No self-serve online booking",
    appliesTo: new Set(["appointment_services", "quote_trades", "high_ticket_advisory"]),
    driverKeywords: ["booking", "appointment conversion", "website conversion", "estimate conversion", "consultation conversion", "conversion"],
    baseSeverity: 3, canonical: "Online Booking",
    detect: (s) => !realBooking(s),
    consequence: "Visitors can't book themselves, so after-hours and high-intent demand leaks to competitors who let customers schedule instantly.",
  },
  {
    id: "no_online_ordering", stage: "capture", label: "No first-party online ordering",
    appliesTo: new Set(["hospitality"]),
    driverKeywords: ["ordering", "website & ordering", "website"],
    baseSeverity: 3, canonical: "Online Ordering",
    detect: (s) => !s.onlineOrdering,
    consequence: "Off-premise revenue is lost or surrendered to third-party delivery apps at a steep margin.",
  },
  {
    id: "no_after_hours_capture", stage: "capture", label: "No after-hours capture (chat)",
    appliesTo: null,
    driverKeywords: ["website conversion", "website", "conversion", "lead response"],
    baseSeverity: 2, canonical: "24/7 Website Chat",
    detect: (s) => !s.liveChat,
    consequence: "Nothing engages visitors after hours — when most local searches happen — so they bounce to whoever answers first.",
  },
  {
    id: "phone_not_tappable", stage: "response", label: "Phone number not tap-to-call",
    appliesTo: null,
    driverKeywords: ["phone"],
    baseSeverity: 1, canonical: null,
    detect: (s) => !!s.phone && !s.phoneTapToCall,
    consequence: "The phone number isn't tap-to-call on mobile, adding friction for the highest-intent visitors.",
  },
  {
    id: "no_missed_call_recovery", stage: "response", label: "No missed-call recovery",
    appliesTo: null,
    driverKeywords: ["estimate conversion", "appointment conversion", "lead response speed", "lead response", "website conversion", "conversion", "phone"],
    baseSeverity: 2, severityBump: (a) => (a === "quote_trades" ? 1 : 0), canonical: "Missed Call Text Back",
    detect: (s) => !!s.phone,
    consequence: "Missed and after-hours calls aren't recovered — every unanswered call is a customer free to dial the next business.",
  },
  {
    id: "no_lead_followup", stage: "response", label: "No automated lead follow-up",
    appliesTo: null,
    driverKeywords: ["lead response speed", "lead response", "consultation conversion", "estimate conversion", "appointment conversion", "nurture", "repeat", "conversion"],
    baseSeverity: 3, canonical: "Automatic Customer Follow-Up",
    detect: (s) => !!(s.contactForm || s.phone),
    consequence: "Leads who don't buy on first contact get no systematic follow-up, though most convert only after several touches — so they quietly go cold.",
  },
  {
    id: "weak_trust_signals", stage: "conversion", label: "Weak on-site trust signals",
    appliesTo: null,
    driverKeywords: ["trust", "reviews", "reputation"],
    baseSeverity: 2, canonical: "Automatic Review Requests",
    detect: (s) => !s.reviewWidget && s.rating == null,
    consequence: "No visible reviews or rating at the point of decision, so prospects can't validate trust and convert at a lower rate.",
  },
  {
    id: "no_repeat_retention", stage: "retention", label: "No repeat / reactivation engine",
    appliesTo: new Set(["appointment_services", "hospitality", "retail_ecommerce"]),
    driverKeywords: ["repeat", "retention", "recall"],
    baseSeverity: 2, canonical: "Monthly Customer Emails",
    detect: () => true,
    consequence: "No system brings past customers back — repeat revenue, the cheapest growth there is, is left on the table.",
  },
];

function matchDriver(growthDrivers, keywords) {
  let best = null;
  for (const d of growthDrivers || []) {
    const name = d.driver.toLowerCase();
    if (keywords.some((k) => name.includes(k))) {
      if (!best || d.weight > best.weight) best = d;
    }
  }
  return best;
}

// Resolve the industry framework (single or blended) for a profile.
export function resolveSalesFramework(profile) {
  if (profile?.industryCandidates?.length) return getBlendedFramework(profile.industryCandidates);
  return getFramework(profile?.userIndustryHint || profile?.industry);
}

// PURE: detect → weight → rank the sales bottlenecks. Tested offline.
export function computeSalesBottlenecks({ signals, profile, framework }) {
  const s = compactSignals(signals || {});
  const archetype = framework.archetype;
  const tier = profile?.leadValue?.tier || "medium";
  const leadMult = LEAD_MULT[tier] ?? 1.0;
  const drivers = framework.growthDrivers || [];
  const avgWeight = drivers.length ? drivers.reduce((a, d) => a + d.weight, 0) / drivers.length : 15;

  const found = [];
  for (const b of BOTTLENECKS) {
    if (b.appliesTo && !b.appliesTo.has(archetype)) continue;
    if (!b.detect(s)) continue;
    const md = matchDriver(drivers, b.driverKeywords);
    const driverWeight = md ? md.weight : avgWeight;
    const severity = b.baseSeverity + (b.severityBump ? b.severityBump(archetype) : 0);
    const impactScore = Math.round(driverWeight * leadMult * severity);
    found.push({
      id: b.id, stage: b.stage, label: b.label,
      driver: md?.driver || "general sales", driverWeight: Math.round(driverWeight),
      severity, leadValueTier: tier, impactScore, canonical: b.canonical, consequence: b.consequence,
    });
  }
  found.sort((a, b) => b.impactScore - a.impactScore || b.severity - a.severity || STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage]);
  return found.map((x, i) => ({ ...x, rank: i + 1 }));
}

export function assembleSalesSection({ bottlenecks, profile }) {
  const byStage = { capture: [], response: [], conversion: [], retention: [] };
  for (const b of bottlenecks) byStage[b.stage].push(b.id);
  return {
    available: true,
    method: "Bottlenecks ranked by industry growth-driver weight × lead value × severity.",
    leadValueTier: profile?.leadValue?.tier || "medium",
    bottlenecks,
    topPriority: bottlenecks[0] || null,
    byStage,
  };
}

export function templateNarrative(bottlenecks) {
  if (!bottlenecks.length) return { narrative: "No material sales-process bottlenecks were detected from the available signals.", opportunities: [] };
  const top = bottlenecks.slice(0, 3);
  const narrative = `The highest-impact sales gap is ${top[0].label.toLowerCase()}: ${top[0].consequence} ` +
    top.slice(1).map((b) => `${b.label} also weighs on growth — ${b.consequence}`).join(" ");
  const opportunities = top.filter((b) => b.canonical).map((b) => `${b.canonical} — addresses "${b.label}" (${b.driver}, impact ${b.impactScore}).`);
  return { narrative, opportunities };
}

async function narrate(bottlenecks, profile) {
  const ranked = bottlenecks.map((b) => `  #${b.rank} [${b.stage}] ${b.label} — serves "${b.driver}" (weight ${b.driverWeight}%), severity ${b.severity}, impact ${b.impactScore}. ${b.consequence}`).join("\n");
  const system = `You are a senior business consultant writing the SALES PROCESS ANALYSIS of a Growth Diagnosis. You are given the business's bottlenecks ALREADY RANKED by revenue impact (growth-driver weight × lead value × severity).

RULES:
- RESPECT the given ranking — it reflects what materially affects growth in THIS industry. Lead with the #1 priority; do not elevate a low-impact item.
- Explain CONSEQUENCES, not observations. Tie each bottleneck to lost revenue and the growth driver it harms. Think like the owner: "what would I fix first to make more money?"
- Use ONLY the bottlenecks provided. Do not invent mechanisms or claim systems exist/are absent beyond what is listed. No hype, no emoji. Address the owner as "you".
Return ONLY JSON: { "narrative": <2-4 sentences, worst-first>, "opportunities": [<1-3 ROI-first next actions>] }`;
  const user = [renderProfileForPrompt(profile), "", "RANKED SALES BOTTLENECKS (already prioritized — respect this order):", ranked].join("\n");

  const message = await client().messages.create({
    model: MODEL, max_tokens: 700,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: user }],
  });
  const block = (message.content || []).find((b) => b.type === "text");
  let txt = (block?.text || "").trim();
  const fence = txt.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) txt = fence[1].trim();
  const a = txt.indexOf("{"), z = txt.lastIndexOf("}");
  if (a !== -1 && z > a) txt = txt.slice(a, z + 1);
  const parsed = JSON.parse(txt);
  return {
    narrative: typeof parsed.narrative === "string" ? parsed.narrative : null,
    opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities.filter((x) => typeof x === "string") : [],
  };
}

// Orchestrate: framework → ranked bottlenecks → (AI narrative | template) → section.
export async function runSalesAgent({ signals, profile }) {
  const framework = resolveSalesFramework(profile);
  const bottlenecks = computeSalesBottlenecks({ signals, profile, framework });
  const section = assembleSalesSection({ bottlenecks, profile });
  if (!bottlenecks.length) return { ...section, narrative: "No material sales-process bottlenecks were detected.", opportunities: [] };

  let narrative = null, opportunities = null;
  if (aiOn) {
    try { ({ narrative, opportunities } = await narrate(bottlenecks, profile)); }
    catch (e) { console.error("[salesIntel] narrate failed", e?.message || e); }
  }
  if (!narrative) ({ narrative, opportunities } = templateNarrative(bottlenecks));
  return { ...section, narrative, opportunities };
}
