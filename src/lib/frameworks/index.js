// src/lib/frameworks/index.js — INDUSTRY FRAMEWORK REGISTRY (V2, Phase 1).
//
// PURPOSE (read this before editing): the audit's job is NOT to describe the
// business — it is to identify *why it is not growing faster* and *which fixes
// produce the highest ROI*. So every framework entry leads with DIAGNOSIS:
// leakPoints (where revenue silently escapes for this vertical), growthLevers
// (the highest-ROI moves), and redFlags. Benchmarks/KPIs exist only to EXPOSE
// gaps against industry norms — never to be reported for their own sake.
//
// This file is the single place that knows a dentist leaks revenue through a
// dead recall system while a roofer leaks it through slow storm-response and no
// financing. It composes with — never duplicates — the existing economics in
// src/lib/constants.js (INDUSTRY_LEAD_VALUE / CLOSE_RATE / MISSED_CALL_RATE /
// NO_SHOW_RATE / JOB_VALUE) and the canonical automation names. automationPriors
// MUST be exact canonical service strings so roadmapEngine can compose them.
//
// Consumed by:
//   • the AI consultant prompt (api/_lib/aiFindings.js → buildUserMessage),
//     injected as industry best-practice CONTEXT (not observed fact), and
//   • (later phases) the Classifier / Social / Competitor / Synthesis agents and
//     the deterministic fallback engine.
//
// Resolution: getFramework(industry) merges ARCHETYPE_FRAMEWORK_DEFAULTS (the
// baseline for the business's archetype) with INDUSTRY_FRAMEWORK[industry] (the
// vertical-specific overrides/additions). Unknown industry → archetype default.

import {
  archetypeForIndustry,
  getArchetype,
  INDUSTRY_ARCHETYPE,
} from "../industryProfiles.js";

// The ONLY allowed automation names (must match constants.js AUTOMATION_POOL /
// the canonical services in the AI prompt). Kept here so a typo in a framework
// entry is caught by checkFrameworks() rather than silently breaking roadmaps.
export const CANONICAL_AUTOMATIONS = [
  "Missed Call Text Back",
  "Appointment Reminder Messages",
  "Automatic Review Requests",
  "Automatic Customer Follow-Up",
  "24/7 Website Chat",
  "Customer Enquiry Tracker",
  "Monthly Customer Emails",
  "Win-Back Messages",
  "Online Booking",
  "Online Ordering",
];

// ── Archetype baselines ──────────────────────────────────────────────────────
// Generic per-archetype diagnosis. Industry entries below sharpen these with
// vertical-specific leaks, numbers, and KPIs.
export const ARCHETYPE_FRAMEWORK_DEFAULTS = {
  appointment_services: {
    kpis: ["new bookings / mo", "no-show rate", "rebook / recall rate", "cost per booked appointment"],
    benchmarks: { reviewCount: 120, rating: 4.6, postsPerWeek: 3, leadResponseMins: 5 },
    criticalChannels: ["Google Business Profile + Maps", "online reviews", "online booking", "referrals"],
    leakPoints: [
      "missed calls during and after hours are never recovered",
      "phone-only booking loses after-hours intent (most searches happen off-hours)",
      "no automated reminders → no-shows burn paid-for capacity",
      "one-and-done visits — no recall/rebook system to bring clients back",
    ],
    growthLevers: [
      "capture after-hours demand with website chat + missed-call text-back",
      "remove booking friction with self-serve online scheduling",
      "reactivate lapsed clients with win-back messages",
      "compound reviews to climb the local Map Pack",
    ],
    redFlags: ["phone-only booking", "fewer than 50 reviews", "no appointment reminders", "no recall / win-back"],
    automationPriors: ["Missed Call Text Back", "Online Booking", "Appointment Reminder Messages", "Automatic Review Requests", "Win-Back Messages"],
  },
  quote_trades: {
    kpis: ["quote requests / mo", "speed-to-lead (mins)", "quote → job close rate", "average job value"],
    benchmarks: { reviewCount: 80, rating: 4.7, postsPerWeek: 2, leadResponseMins: 5 },
    criticalChannels: ["Google Local Services Ads", "Maps + reviews", "quote / estimate form", "emergency tap-to-call"],
    leakPoints: [
      "slow or after-hours response — the job goes to whoever answers first",
      "no instant quote path on the site → high-intent visitors drop off",
      "missed emergency calls are lost to a competitor immediately",
      "unsold estimates are never followed up",
    ],
    growthLevers: [
      "win the speed-to-lead race with missed-call text-back + instant reply",
      "capture emergency intent 24/7 with website chat",
      "follow up every unsold estimate automatically",
      "offer financing to lift close rate on high-ticket jobs",
    ],
    redFlags: ["no online quote request", "slow / no after-hours response", "fewer than 40 reviews", "no financing offered"],
    automationPriors: ["Missed Call Text Back", "Automatic Customer Follow-Up", "24/7 Website Chat", "Automatic Review Requests", "Customer Enquiry Tracker"],
  },
  hospitality: {
    kpis: ["covers / reservations", "online order volume", "repeat-visit rate", "review velocity / mo"],
    benchmarks: { reviewCount: 300, rating: 4.4, postsPerWeek: 5, leadResponseMins: 60 },
    criticalChannels: ["Google + Yelp reviews", "Instagram", "reservations / waitlist", "online ordering / delivery"],
    leakPoints: [
      "no online ordering → off-premise (delivery/takeout) revenue is left on the table",
      "no reservations or waitlist → walk-offs at peak times",
      "stale, image-only, or hidden menu kills discovery and intent",
      "weak/inactive social presence → no top-of-funnel discovery",
    ],
    growthLevers: [
      "capture off-premise demand with online ordering / delivery",
      "build a repeat-visit engine via an email/SMS list",
      "drive review velocity to win the Map Pack",
      "use Instagram content for discovery and reservations",
    ],
    redFlags: ["no online menu", "no online ordering", "stale reviews", "inactive Instagram"],
    automationPriors: ["Automatic Review Requests", "Online Ordering", "Monthly Customer Emails", "Win-Back Messages", "24/7 Website Chat"],
  },
  retail_ecommerce: {
    kpis: ["site conversion rate", "average order value", "cart abandonment rate", "repeat-purchase rate"],
    benchmarks: { reviewCount: 200, rating: 4.5, postsPerWeek: 4, leadResponseMins: 30 },
    criticalChannels: ["product SEO", "paid social", "email / SMS list", "marketplace + product reviews"],
    leakPoints: [
      "checkout friction silently kills conversions",
      "no abandoned-cart recovery → paid-for traffic walks away",
      "no email/SMS capture → no owned audience to remarket to",
      "thin product trust (few reviews, unclear shipping/returns) stalls first purchase",
    ],
    growthLevers: [
      "recover abandoned carts with email/SMS flows",
      "grow and monetize an owned email/SMS list",
      "raise AOV with bundles and post-purchase upsells",
      "stack product reviews for trust and SEO",
    ],
    redFlags: ["no abandoned-cart flow", "no email capture", "weak product reviews", "unclear shipping / returns"],
    automationPriors: ["Automatic Customer Follow-Up", "Monthly Customer Emails", "Win-Back Messages", "Automatic Review Requests"],
  },
  high_ticket_advisory: {
    kpis: ["qualified consults booked", "lead → client close rate", "sales-cycle length", "client lifetime value"],
    benchmarks: { reviewCount: 60, rating: 4.7, postsPerWeek: 2, leadResponseMins: 5 },
    criticalChannels: ["Google + reviews", "consultation booking", "long-term nurture", "referrals + case studies"],
    leakPoints: [
      "slow response on high-value inquiries — these clients buy from whoever engages first",
      "no nurture for a long consideration cycle → leads go cold",
      "weak proof (thin case studies / testimonials) stalls high-trust decisions",
      "no clear consultation booking path",
    ],
    growthLevers: [
      "win speed-to-lead on high-value inquiries",
      "run long-term nurture sequences across the consideration window",
      "lead with social proof to shorten the sales cycle",
      "systematize referrals from past clients",
    ],
    redFlags: ["contact-form only, no booking", "no lead nurture", "thin testimonials / case studies", "fewer than 30 reviews"],
    automationPriors: ["Missed Call Text Back", "Automatic Customer Follow-Up", "Customer Enquiry Tracker", "Automatic Review Requests", "Monthly Customer Emails"],
  },
};

// ── Growth-driver WEIGHTING (the consultant's ranking mechanism) ─────────────
// Not every flaw matters. These weights (sum ~100) tell every agent which growth
// drivers actually move revenue for the vertical, so findings/leaks are ranked
// by business impact — a high-weight gap (e.g. a review deficit) ALWAYS outranks
// a low-weight one (e.g. a missing SSL). Archetype baselines here; industries
// that need a distinct profile override via `growthDrivers` below. Each entry's
// weights should sum to ~100 (enforced by scripts/check-frameworks.mjs).
export const GROWTH_DRIVER_DEFAULTS = {
  appointment_services: [
    { driver: "Trust & Reviews", weight: 25 },
    { driver: "Website & Booking Conversion", weight: 25 },
    { driver: "Local SEO / Maps Visibility", weight: 20 },
    { driver: "New Customer Acquisition", weight: 15 },
    { driver: "Retention & Recall", weight: 10 },
    { driver: "Social Media", weight: 5 },
  ],
  quote_trades: [
    { driver: "Estimate / Quote Conversion", weight: 20 },
    { driver: "Reviews & Reputation", weight: 20 },
    { driver: "Service-Area Visibility", weight: 20 },
    { driver: "Trust Signals", weight: 15 },
    { driver: "Proof / Portfolio", weight: 15 },
    { driver: "Speed-to-Lead & Phone Handling", weight: 10 },
  ],
  hospitality: [
    { driver: "Reviews", weight: 25 },
    { driver: "Google Maps Visibility", weight: 25 },
    { driver: "Repeat Customers", weight: 20 },
    { driver: "Social Media", weight: 15 },
    { driver: "Website & Ordering", weight: 10 },
    { driver: "Phone Handling", weight: 5 },
  ],
  retail_ecommerce: [
    { driver: "Conversion Rate", weight: 25 },
    { driver: "Reviews & Trust", weight: 20 },
    { driver: "Email / SMS Retention", weight: 20 },
    { driver: "Traffic & SEO", weight: 15 },
    { driver: "AOV / Merchandising", weight: 15 },
    { driver: "Social Media", weight: 5 },
  ],
  high_ticket_advisory: [
    { driver: "Trust & Authority", weight: 25 },
    { driver: "Lead Response Speed", weight: 20 },
    { driver: "Reviews & Reputation", weight: 20 },
    { driver: "Consultation Conversion", weight: 20 },
    { driver: "Nurture & Follow-up", weight: 10 },
    { driver: "Social Media", weight: 5 },
  ],
};

// ── Per-industry sharpening ──────────────────────────────────────────────────
// Only the vertical-specific deltas. Anything omitted inherits the archetype
// default. `archetype` is optional — set it only for verticals NOT in
// INDUSTRY_ARCHETYPE (the forward-looking Agency / SaaS / E-commerce entries).
export const INDUSTRY_FRAMEWORK = {
  Dental: {
    kpis: ["new patients / mo", "hygiene recall reactivation rate", "treatment plan acceptance", "no-show rate"],
    benchmarks: { reviewCount: 150, rating: 4.7 },
    leakPoints: [
      "no hygiene recall system → recurring patients quietly lapse",
      "high-value treatment plans presented once, never followed up",
    ],
    growthLevers: ["reactivate lapsed hygiene patients", "follow up unaccepted treatment plans"],
    redFlags: ["no recall reminders", "no treatment-plan follow-up"],
    automationPriors: ["Appointment Reminder Messages", "Win-Back Messages", "Automatic Review Requests"],
    growthDrivers: [
      { driver: "Trust", weight: 25 },
      { driver: "Reviews", weight: 20 },
      { driver: "Website Conversion", weight: 20 },
      { driver: "Local SEO", weight: 15 },
      { driver: "Appointment Conversion", weight: 15 },
      { driver: "Social Media", weight: 5 },
    ],
  },
  Chiropractic: {
    kpis: ["new patients / mo", "care-plan retention rate", "missed-visit recovery", "reactivation rate"],
    benchmarks: { reviewCount: 120, rating: 4.8 },
    leakPoints: [
      "patients drop off mid care-plan with no automated re-engagement",
      "no reactivation of inactive patients",
    ],
    growthLevers: ["protect care-plan retention with reminders", "reactivate dormant patients"],
    redFlags: ["no missed-visit follow-up", "no reactivation campaign"],
  },
  Plumbing: {
    benchmarks: { reviewCount: 90, rating: 4.7 },
    leakPoints: [
      "after-hours emergency calls go unanswered and are lost instantly",
      "no online booking for non-emergency jobs",
    ],
    growthLevers: ["capture 24/7 emergency intent", "let routine jobs self-book"],
    redFlags: ["no after-hours capture", "no emergency CTA"],
  },
  Roofing: {
    kpis: ["inspection requests / mo", "estimate → job close rate", "financed-job share", "average job value"],
    benchmarks: { reviewCount: 60, rating: 4.7 },
    leakPoints: [
      "no storm-response / inspection landing path during demand spikes",
      "no financing offer → high-ticket jobs lost on price",
      "expensive estimates never followed up",
    ],
    growthLevers: ["spin up storm-response inspection capture", "surface financing to lift close rate", "follow up every estimate"],
    redFlags: ["no financing mention", "no inspection request form", "no estimate follow-up"],
    growthDrivers: [
      { driver: "Estimate Conversion", weight: 20 },
      { driver: "Reviews", weight: 20 },
      { driver: "Service-Area Visibility", weight: 20 },
      { driver: "Trust Signals", weight: 15 },
      { driver: "Portfolio / Proof", weight: 15 },
      { driver: "Social Media", weight: 5 },
      { driver: "Phone Handling", weight: 5 },
    ],
  },
  HVAC: {
    kpis: ["service calls / mo", "maintenance-plan members", "emergency capture rate", "average ticket"],
    benchmarks: { reviewCount: 90, rating: 4.7 },
    leakPoints: [
      "no recurring maintenance-plan engine → lumpy, seasonal revenue",
      "missed emergency calls during peak heat/cold lost to competitors",
    ],
    growthLevers: ["sell and renew maintenance plans automatically", "capture seasonal emergency demand 24/7"],
    redFlags: ["no maintenance plan", "no after-hours capture"],
  },
  Electrician: {
    benchmarks: { reviewCount: 70, rating: 4.7 },
    leakPoints: ["quote requests answered slowly", "no follow-up on unsold estimates"],
    growthLevers: ["instant quote acknowledgement", "automated estimate follow-up"],
    redFlags: ["slow quote response", "no estimate follow-up"],
  },
  "Home Services": {
    benchmarks: { reviewCount: 70, rating: 4.7 },
    leakPoints: ["fragmented contact methods with no central tracking", "no follow-up on unbooked inquiries"],
    growthLevers: ["centralize and track every inquiry", "automate unbooked-lead follow-up"],
  },
  Barbershop: {
    kpis: ["bookings / week", "chair utilization", "rebook rate", "no-show rate"],
    benchmarks: { reviewCount: 100, rating: 4.8, postsPerWeek: 4 },
    leakPoints: [
      "no online booking → clients can't self-schedule, walk to a competitor app",
      "no rebook prompt → irregular visit cadence",
      "underused Instagram for a visual, discovery-driven business",
    ],
    growthLevers: ["self-serve booking (Booksy/Square style)", "automated rebook reminders", "Instagram content for discovery"],
    redFlags: ["no online booking app", "inactive Instagram", "no rebook reminders"],
  },
  "Med Spa": {
    kpis: ["consults booked / mo", "treatment package uptake", "membership retention", "rebook rate"],
    benchmarks: { reviewCount: 120, rating: 4.8, postsPerWeek: 4 },
    leakPoints: [
      "high-value consults not nurtured before/after booking",
      "no membership or package program → low repeat value",
      "before/after social proof underused",
    ],
    growthLevers: ["nurture consults to package purchase", "drive membership retention", "leverage before/after content"],
    redFlags: ["no consult nurture", "no membership program", "weak before/after proof"],
  },
  Healthcare: {
    kpis: ["new patients / mo", "no-show rate", "recall / follow-up rate", "online-booking share"],
    benchmarks: { reviewCount: 100, rating: 4.6 },
    leakPoints: ["phone-only intake bottlenecks new patients", "no automated recall/follow-up"],
    growthLevers: ["enable online intake/booking", "automate recall and follow-up"],
  },
  Legal: {
    kpis: ["qualified consults / mo", "intake → signed-case rate", "speed-to-lead", "case value"],
    benchmarks: { reviewCount: 50, rating: 4.8, leadResponseMins: 5 },
    leakPoints: [
      "slow intake response — the first firm to call back usually signs the case",
      "no nurture for longer-consideration matters",
      "thin case results / testimonials reduce trust on high-stakes decisions",
    ],
    growthLevers: ["instant intake response + callback", "nurture undecided prospects", "lead with verifiable results / testimonials"],
    redFlags: ["slow intake callback", "no nurture", "thin proof"],
    growthDrivers: [
      { driver: "Trust & Authority", weight: 25 },
      { driver: "Reputation / Reviews", weight: 20 },
      { driver: "Lead Response Speed", weight: 20 },
      { driver: "Consultation Conversion", weight: 20 },
      { driver: "Content Authority", weight: 10 },
      { driver: "Social Media", weight: 5 },
    ],
  },
  "Real Estate": {
    kpis: ["buyer/seller leads / mo", "lead → appointment rate", "speed-to-lead", "deals closed / yr"],
    benchmarks: { reviewCount: 50, rating: 4.8, leadResponseMins: 5 },
    leakPoints: [
      "online leads not contacted within minutes go cold fast",
      "no long-term nurture for a months-long buying cycle",
      "no listing/home-value capture path",
    ],
    growthLevers: ["sub-5-minute lead response", "long-horizon nurture across the buying cycle", "home-value lead magnets"],
    redFlags: ["slow lead response", "no nurture", "no lead capture offer"],
  },
  Finance: {
    kpis: ["qualified consults / mo", "lead → client rate", "AUM / client value", "sales-cycle length"],
    benchmarks: { reviewCount: 40, rating: 4.8 },
    leakPoints: ["high-trust decisions stall without nurture and proof", "no clear consultation booking path"],
    growthLevers: ["nurture across the trust-building window", "make booking a consult frictionless"],
  },
  Education: {
    kpis: ["enrollment inquiries / mo", "inquiry → enrolled rate", "tour/booking rate", "retention"],
    benchmarks: { reviewCount: 60, rating: 4.6 },
    leakPoints: ["inquiries not nurtured to enrollment", "no tour/booking path"],
    growthLevers: ["nurture inquiries to enrollment", "enable tour/consult booking"],
  },
  Childcare: {
    kpis: ["enrollment inquiries / mo", "tour → enrolled rate", "waitlist conversion", "retention"],
    benchmarks: { reviewCount: 50, rating: 4.7 },
    leakPoints: ["tours not followed up to enrollment", "no waitlist nurture"],
    growthLevers: ["follow up every tour", "nurture the waitlist to enrollment"],
  },
  "Beauty & Salon": {
    kpis: ["bookings / week", "chair/room utilization", "rebook rate", "no-show rate"],
    benchmarks: { reviewCount: 100, rating: 4.8, postsPerWeek: 4 },
    leakPoints: ["no self-serve booking", "no rebook cadence", "underused visual social proof"],
    growthLevers: ["self-serve booking", "automated rebook prompts", "Instagram-led discovery"],
    redFlags: ["no online booking", "no rebook reminders", "inactive Instagram"],
  },
  Fitness: {
    kpis: ["trials / mo", "trial → member conversion", "member retention / churn", "referral rate"],
    benchmarks: { reviewCount: 90, rating: 4.7, postsPerWeek: 4 },
    leakPoints: [
      "free trials and intros not nurtured to membership",
      "churned/expired members never won back",
      "no referral engine for a community-driven business",
    ],
    growthLevers: ["convert trials with structured follow-up", "win back lapsed members", "systematize member referrals"],
    redFlags: ["no trial follow-up", "no win-back", "no referral program"],
  },
  Restaurant: {
    // Inherits the hospitality archetype defaults; sharpen the numbers.
    benchmarks: { reviewCount: 350, rating: 4.4, postsPerWeek: 5 },
    leakPoints: [
      "no first-party online ordering → margin lost to third-party delivery apps",
      "no email/SMS list → no way to drive a slow night",
    ],
    growthLevers: ["own the online-ordering relationship", "build a list to fill slow shifts"],
    growthDrivers: [
      { driver: "Reviews", weight: 25 },
      { driver: "Maps Visibility", weight: 25 },
      { driver: "Repeat Customers", weight: 20 },
      { driver: "Social Media", weight: 15 },
      { driver: "Website", weight: 10 },
      { driver: "Phone Handling", weight: 5 },
    ],
  },
  Automotive: {
    // retail_ecommerce archetype; sharpen for service+sales.
    kpis: ["leads / mo", "lead → appointment rate", "service retention", "review velocity"],
    benchmarks: { reviewCount: 150, rating: 4.5 },
    leakPoints: ["service customers not retained with reminders", "sales leads not followed up"],
    growthLevers: ["service-reminder retention engine", "structured sales-lead follow-up"],
  },
  Retail: {
    // retail_ecommerce archetype default fits closely.
    benchmarks: { reviewCount: 150, rating: 4.5 },
    leakPoints: ["no email/SMS capture in-store or online", "no win-back for lapsed shoppers"],
    growthLevers: ["capture and monetize a customer list", "win back lapsed shoppers"],
  },

  // ── Forward-looking verticals (spec-required; not yet in INDUSTRIES) ──────
  "E-commerce": {
    archetype: "retail_ecommerce",
    // Pure-play online — the retail_ecommerce defaults are the framework.
    benchmarks: { reviewCount: 250, rating: 4.5, postsPerWeek: 5 },
  },
  SaaS: {
    archetype: "high_ticket_advisory",
    kpis: ["trial / demo signups / mo", "trial → paid conversion", "activation rate", "net revenue retention / churn"],
    benchmarks: { reviewCount: 40, rating: 4.6, postsPerWeek: 4, leadResponseMins: 5 },
    criticalChannels: ["content / SEO", "product-led trial or demo", "lifecycle email", "LinkedIn"],
    leakPoints: [
      "weak onboarding/activation → trials churn before seeing value",
      "no self-serve trial or demo path → PLG signups lost",
      "no lifecycle email → low expansion and high churn",
      "no pricing transparency → high-intent buyers bounce",
    ],
    growthLevers: ["fix activation in the first session", "open a self-serve trial/demo path", "run lifecycle + expansion email", "make pricing legible"],
    redFlags: ["no trial / demo CTA", "no pricing page", "no onboarding emails", "no lifecycle nurture"],
    automationPriors: ["Automatic Customer Follow-Up", "Monthly Customer Emails", "Win-Back Messages"],
    growthDrivers: [
      { driver: "Activation", weight: 25 },
      { driver: "Retention", weight: 20 },
      { driver: "Trial → Paid Conversion", weight: 20 },
      { driver: "Onboarding", weight: 20 },
      { driver: "Product Adoption", weight: 15 },
    ],
  },
  Agency: {
    archetype: "high_ticket_advisory",
    kpis: ["qualified leads / mo", "proposal → close rate", "retainer lifetime value", "pipeline from content/referrals"],
    benchmarks: { reviewCount: 30, rating: 4.8, postsPerWeek: 3, leadResponseMins: 10 },
    criticalChannels: ["referrals", "content / LinkedIn", "case studies", "booked discovery calls"],
    leakPoints: [
      "no sharp niche/offer → weak, undifferentiated inbound",
      "slow response on discovery-call requests",
      "thin case studies → low trust on high-retainer decisions",
      "no nurture for slow-deciding prospects",
    ],
    growthLevers: ["sharpen niche and offer", "instant discovery-call booking + response", "lead with case-study proof", "nurture the pipeline"],
    redFlags: ["no clear niche/offer", "no case studies", "no discovery-call booking", "no nurture"],
  },
};

// All industries this registry can resolve (existing INDUSTRIES + forward-looking).
export const FRAMEWORK_INDUSTRIES = Object.keys(INDUSTRY_FRAMEWORK);

// Merge helper: archetype-default list + industry-specific list, industry items
// first (more specific), deduped case-insensitively, capped to keep prompts lean.
function mergeList(industryList, defaultList, cap = 6) {
  const out = [];
  const seen = new Set();
  for (const item of [...(industryList || []), ...(defaultList || [])]) {
    const key = String(item).toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= cap) break;
  }
  return out;
}

// Resolve the archetype id for an industry, honoring an explicit override on the
// framework entry (used by the forward-looking verticals not in INDUSTRY_ARCHETYPE).
export function archetypeIdForIndustry(industry) {
  const entry = INDUSTRY_FRAMEWORK[industry];
  if (entry?.archetype) return entry.archetype;
  if (INDUSTRY_ARCHETYPE[industry]) return INDUSTRY_ARCHETYPE[industry];
  return archetypeForIndustry(industry).id;
}

// THE resolver. Returns a complete, diagnosis-first framework for any industry,
// merging the archetype baseline with the vertical's specific sharpening.
export function getFramework(industry) {
  const archetypeId = archetypeIdForIndustry(industry);
  const base = ARCHETYPE_FRAMEWORK_DEFAULTS[archetypeId] || ARCHETYPE_FRAMEWORK_DEFAULTS.appointment_services;
  const ind = INDUSTRY_FRAMEWORK[industry] || {};
  const archetype = getArchetype(archetypeId);

  return {
    industry: industry || "(unspecified)",
    archetype: archetypeId,
    customerNoun: archetype.customerNoun,
    kpis: mergeList(ind.kpis, base.kpis, 5),
    benchmarks: { ...base.benchmarks, ...(ind.benchmarks || {}) },
    criticalChannels: mergeList(ind.criticalChannels, base.criticalChannels, 5),
    leakPoints: mergeList(ind.leakPoints, base.leakPoints, 6),
    growthLevers: mergeList(ind.growthLevers, base.growthLevers, 6),
    redFlags: mergeList(ind.redFlags, base.redFlags, 5),
    automationPriors: mergeList(ind.automationPriors, base.automationPriors, 6),
    // Growth-driver weights are a COHERENT set that must sum to ~100, so the
    // industry override REPLACES the archetype default (never merged/concatenated).
    growthDrivers: ind.growthDrivers || GROWTH_DRIVER_DEFAULTS[archetypeId] || GROWTH_DRIVER_DEFAULTS.appointment_services,
  };
}

// ── Classification under uncertainty: confidence + fallback + blending ───────
//
// CLASSIFIER OUTPUT CONTRACT (Phase 2's ClassifierAgent must emit this shape).
// getBlendedFramework() consumes `candidates` directly, so the agent's job is to
// rank, not to pick a single forced answer:
//   {
//     candidates: [ { industry: "Med Spa", confidence: 0.55 },   // sorted desc
//                   { industry: "Healthcare", confidence: 0.30 }, // fallbacks
//                   { industry: "Beauty & Salon", confidence: 0.15 } ],
//     reasoning: "cites concrete signals"
//   }
// confidence is 0..1 (need not sum to 1 — getBlendedFramework renormalizes).
//
// THE RULE Justin set: if the top candidate is weak (< blendThreshold), DO NOT
// force it — blend the top matching frameworks, weighted by confidence, so a
// borderline med-spa/derm/salon site gets guidance covering all three rather
// than a confidently-wrong single pick.

export const DEFAULT_BLEND_OPTS = {
  blendThreshold: 0.6, // top confidence must clear this to use a single framework
  maxBlend: 3,         // never blend more than this many candidates
  minConfidence: 0.15, // candidates below this are dropped from the blend
};

function roundBenchmark(key, val) {
  if (val == null || Number.isNaN(val)) return val;
  if (key === "rating") return Math.round(val * 10) / 10;
  if (key === "reviewCount") return Math.round(val / 10) * 10;
  if (key === "leadResponseMins") return Math.max(5, Math.round(val / 5) * 5);
  return Math.round(val);
}

// Confidence-weighted average of each benchmark across the blended frameworks
// (renormalizing over only the frameworks that actually carry that key).
function blendBenchmarks(weighted) {
  const keys = new Set();
  for (const { framework } of weighted) for (const k of Object.keys(framework.benchmarks || {})) keys.add(k);
  const out = {};
  for (const k of keys) {
    let sum = 0, wsum = 0;
    for (const { framework, weight } of weighted) {
      const v = framework.benchmarks?.[k];
      if (v == null) continue;
      sum += v * weight; wsum += weight;
    }
    if (wsum > 0) out[k] = roundBenchmark(k, sum / wsum);
  }
  return out;
}

// Weighted-order union of a list field: the dominant framework's items lead,
// secondary verticals' distinct items follow, deduped and capped.
function blendList(weighted, field, cap) {
  const concat = weighted.flatMap((w) => w.framework[field] || []);
  return mergeList(concat, [], cap);
}

// Resolve a complete framework from a RANKED candidate list. Returns the single
// best framework when the top pick is confident; otherwise a blended framework
// spanning the top matches. The returned object carries a `classification` meta
// block so callers (and the prompt) know whether/why blending happened.
export function getBlendedFramework(candidates, opts = {}) {
  const o = { ...DEFAULT_BLEND_OPTS, ...opts };
  const cleaned = (Array.isArray(candidates) ? candidates : [])
    .map((c) => (typeof c === "string" ? { industry: c, confidence: 1 } : c))
    .filter((c) => c && c.industry)
    .map((c) => ({ industry: c.industry, confidence: Math.max(0, Number(c.confidence) || 0) }))
    .sort((a, b) => b.confidence - a.confidence);

  // No usable classification → safe archetype-default fallback, never a throw.
  if (cleaned.length === 0) {
    return { ...getFramework(undefined), classification: { blended: false, primary: null, primaryConfidence: 0, lowConfidence: true, candidates: [] } };
  }

  const primary = cleaned[0];
  const shouldBlend = cleaned.length >= 2 && primary.confidence < o.blendThreshold;

  if (!shouldBlend) {
    return {
      ...getFramework(primary.industry),
      classification: { blended: false, primary: primary.industry, primaryConfidence: primary.confidence, lowConfidence: primary.confidence < o.blendThreshold, candidates: cleaned },
    };
  }

  // Blend the top matches, weighted by (renormalized) confidence.
  let set = cleaned.filter((c) => c.confidence >= o.minConfidence);
  if (set.length < 2) set = cleaned.slice(0, 2);
  set = set.slice(0, o.maxBlend);
  const total = set.reduce((s, c) => s + c.confidence, 0) || 1;
  const weighted = set
    .map((c) => ({ candidate: c, weight: c.confidence / total, framework: getFramework(c.industry) }))
    .sort((a, b) => b.weight - a.weight);
  const dominant = weighted[0].framework;

  return {
    industry: set.map((c) => c.industry).join(" / "),
    archetype: dominant.archetype,
    customerNoun: dominant.customerNoun,
    kpis: blendList(weighted, "kpis", 6),
    benchmarks: blendBenchmarks(weighted),
    criticalChannels: blendList(weighted, "criticalChannels", 6),
    leakPoints: blendList(weighted, "leakPoints", 7),
    growthLevers: blendList(weighted, "growthLevers", 7),
    redFlags: blendList(weighted, "redFlags", 6),
    automationPriors: blendList(weighted, "automationPriors", 6),
    // Weights can't be averaged into a coherent set across verticals — use the
    // dominant candidate's growth-driver profile.
    growthDrivers: dominant.growthDrivers,
    classification: {
      blended: true,
      primary: primary.industry,
      primaryConfidence: primary.confidence,
      lowConfidence: true,
      candidates: weighted.map((w) => ({ industry: w.candidate.industry, confidence: w.candidate.confidence, weight: Math.round(w.weight * 100) / 100 })),
    },
  };
}

// Render a (single OR blended) framework as a compact, clearly-labeled prompt
// block. CRITICAL: this is best-practice CONTEXT to prioritize and benchmark the
// diagnosis — NOT observed fact. When the classification is uncertain, the header
// tells the model NOT to force a label and to trust the scraped signals.
function renderFramework(f) {
  const c = f.classification || {};
  const b = f.benchmarks || {};
  const benchParts = [
    b.reviewCount != null ? `~${b.reviewCount}+ Google reviews` : null,
    b.rating != null ? `rating ≥ ${b.rating}` : null,
    b.postsPerWeek != null ? `~${b.postsPerWeek} social posts/wk` : null,
    b.leadResponseMins != null ? `lead response < ${b.leadResponseMins} min` : null,
  ].filter(Boolean);

  let header, intro;
  if (c.blended) {
    const list = (c.candidates || []).map((x) => `${x.industry} (≈${Math.round((x.weight ?? x.confidence) * 100)}%)`).join(", ");
    header = `INDUSTRY GROWTH FRAMEWORK — UNCERTAIN CLASSIFICATION (blended across overlapping verticals)`;
    intro = `The signals do not clearly pin one industry. Most likely: ${list}. CLASSIFY the business yourself from the scraped signals and do NOT force one of these if the evidence points elsewhere. The guidance below BLENDS these candidates — apply only the leaks/levers the signals actually support. This is best-practice CONTEXT, never observed fact; cite a scraped signal key or label a claim "Industry best practice:". Your job is to surface WHY this ${f.customerNoun}-driven business is not growing faster and the highest-ROI fixes.`;
  } else {
    header = `INDUSTRY GROWTH FRAMEWORK — ${f.industry} (archetype: ${f.archetype})`;
    intro = `These are INDUSTRY-WIDE norms and the KNOWN GROWTH BLOCKERS for this vertical. Use them only as best-practice CONTEXT to PRIORITIZE the diagnosis and to BENCHMARK the observed signals against typical performance. They are NOT observed facts about this specific business — never cite them as observed; cite a scraped signal key or label a claim "Industry best practice:". Your job is to surface WHY this ${f.customerNoun}-driven business is not growing faster and the highest-ROI fixes.`;
    if (c.lowConfidence) intro += ` (Classification confidence is modest — trust the scraped signals over this label if they conflict.)`;
  }

  const leakLabel = c.blended ? "WHERE THESE VERTICALS MOST OFTEN LEAK REVENUE" : `WHERE ${String(f.industry).toUpperCase()} BUSINESSES MOST OFTEN LEAK REVENUE`;
  const drivers = (f.growthDrivers || []).map((d) => `${d.driver} ${d.weight}%`).join(", ");
  return [
    header,
    intro,
    // The ranking mechanism: think like the owner, rank by impact, not by what's
    // easy to spot. A low-weight flaw must never outrank a high-weight leak.
    "CONSULTANT MINDSET: think like the OWNER, not an SEO/web/social specialist. Explain CONSEQUENCES, not observations (say \"a 374-review deficit suppresses local ranking and erodes trust before a prospect ever makes contact\", never \"has 38 reviews\"). Most businesses have hundreds of flaws; only a handful move revenue. Rank every finding and revenue leak by the growth-driver weighting below — a high-weight gap ALWAYS outranks a low-weight one (a review deficit outranks a missing SSL), and low-weight issues are deprioritized even when technically valid.",
    drivers ? `GROWTH-DRIVER WEIGHTING for ${c.blended ? "this business" : f.industry} (rank by these): ${drivers}` : null,
    `KPIs that decide growth here: ${f.kpis.join("; ")}`,
    benchParts.length ? `Healthy industry benchmarks: ${benchParts.join(", ")}` : null,
    `Channels that drive this business: ${f.criticalChannels.join("; ")}`,
    `${leakLabel} (look hard for these): ${f.leakPoints.join("; ")}`,
    `Highest-ROI growth levers: ${f.growthLevers.join("; ")}`,
    `Common red flags: ${f.redFlags.join("; ")}`,
    `Automations that typically fit (canonical names): ${f.automationPriors.join("; ")}`,
  ].filter(Boolean).join("\n");
}

// Public entry. Accepts either a single industry string (back-compat) OR a
// ranked candidate list `[{industry, confidence}, ...]` from the classifier.
export function renderFrameworkForPrompt(industryOrCandidates, opts) {
  const framework = Array.isArray(industryOrCandidates)
    ? getBlendedFramework(industryOrCandidates, opts)
    : getFramework(industryOrCandidates);
  return renderFramework(framework);
}
