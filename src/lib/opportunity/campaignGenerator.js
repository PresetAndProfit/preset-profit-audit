// src/lib/opportunity/campaignGenerator.js — V6 Phase 3: the CAMPAIGN GENERATION
// ENGINE. For a high-value opportunity it produces a launch-ready campaign
// package — specific copy a business owner could ship today, never generic
// marketing fluff. PURE. Keyed by opportunity.recommendedCampaign with a strong
// generic builder so every opportunity yields a complete package.

const BUDGET = { low: { low: 150, high: 500 }, medium: { low: 400, high: 1500 }, high: { low: 1200, high: 4000 } };

function ctxOf(opportunity, audit) {
  return {
    biz: audit?.businessName || "your business",
    city: audit?.city || "your area",
    opp: opportunity,
    offer: opportunity.offerHint || opportunity.title,
    window: opportunity.timeWindow || "this week",
  };
}

// Generic, opportunity-grounded package — specific because it reuses the real
// opportunity title, why, and window rather than inventing filler.
function baseCampaign(opportunity, audit) {
  const c = ctxOf(opportunity, audit);
  const budget = BUDGET[opportunity.implementationComplexity] || BUDGET.medium;
  return {
    campaignName: opportunity.title,
    offer: `${opportunity.title} — limited to ${c.window}`,
    positioningAngle: opportunity.whyItMatters,
    targetAudience: `Local customers near ${c.city} most likely to act on: ${opportunity.title.toLowerCase()}`,
    recommendedChannel: opportunity.category === "Social Content" ? "Instagram + Facebook" : opportunity.departmentOwner === "Business Development" ? "LinkedIn + Email" : "Facebook + SMS",
    facebookAd: `${c.biz}: ${opportunity.title}. ${opportunity.whyItMatters.split(".")[0]}. Book now — offer ends ${c.window}.`,
    googleHeadlines: [`${opportunity.title}`, `${c.biz} — Book ${c.window}`, `Limited ${c.window} offer`],
    instagramCaption: `📍 ${opportunity.title} at ${c.biz}. ${opportunity.recommendedActions?.[0] || "Don't miss it"} — ${c.window}. Link in bio.`,
    smsBlast: `${c.biz}: ${opportunity.title} is on — only ${c.window}. Reply YES to claim your spot.`,
    emailCampaign: { subject: `${opportunity.title} — ${c.window} only`, body: `${opportunity.whyItMatters} Here's how to take advantage at ${c.biz}: ${(opportunity.recommendedActions || []).join("; ")}. Book before ${c.window} ends.` },
    landingHeadline: opportunity.title,
    landingSubheadline: opportunity.whyItMatters.split(".")[0] + ".",
    commercialScript: `[0–5s] Something's happening near ${c.city}. [5–15s] ${opportunity.whyItMatters.split(".")[0]}. [15–25s] ${c.biz} has you covered — ${opportunity.title.toLowerCase()}. [25–30s] Call or book now. Offer ends ${c.window}.`,
    reelScript: `Hook: "${opportunity.title}" (text on screen). Show the offer. CTA: "Book before ${c.window} ends — link in bio."`,
    cta: opportunity.departmentOwner === "Sales" ? "Request your spot" : "Book now",
    budgetRange: budget,
    launchTimeline: opportunity.urgencyBias >= 0.8 ? "Launch within 48 hours" : "Launch within 1 week",
    successMetrics: ["bookings/leads attributed", "cost per lead", "offer redemptions", "revenue vs. modeled range"],
    recommendedWorkflowPairing: opportunity.recommendedWorkflow,
  };
}

// Marquee overrides — match the spec's flagship examples precisely.
const OVERRIDES = {
  storm_inspection: (c) => ({
    campaignName: "Storm Damage Inspection Campaign",
    offer: "FREE no-obligation storm damage roof inspection",
    facebookAd: `Storm just hit ${c.city}? Hidden roof damage gets worse — and costs more — every week you wait. ${c.biz} offers a FREE storm inspection and handles your insurance paperwork. Book before your claim window closes.`,
    googleHeadlines: ["Free Storm Roof Inspection", `${c.biz} — Insurance Claim Help`, "Storm Damage? Book Today"],
    smsBlast: `${c.biz}: storms hit ${c.city}. Free roof inspection + insurance claim help. Reply ROOF to book before damage spreads.`,
    landingHeadline: "Storm Damage? Get a Free Roof Inspection — We Handle the Insurance Claim",
    commercialScript: `[0–5s] Did the storm damage your roof? [5–15s] Most damage is invisible from the ground — and insurers have deadlines. [15–25s] ${c.biz} inspects free and files your claim for you. [25–30s] Call now — don't miss your claim window.`,
    cta: "Book my free inspection",
  }),
  rider_stop: (c) => ({
    campaignName: "Rider Stop Food & Drink Special",
    offer: "Rider's Plate: entrée + draft for a flat price, this weekend only",
    facebookAd: `🏍️ Riders rolling through ${c.city} this weekend — ${c.biz} is your stop. Rider's Plate: hearty entrée + cold draft, flat price. Plenty of parking. See you on the road.`,
    instagramCaption: `🏍️ Calling all riders passing through ${c.city} this weekend — pull in at ${c.biz}. Rider's Plate special on now. #${(c.city || "local").replace(/\\s/g, "")}eats`,
    smsBlast: `${c.biz}: riders welcome this weekend 🏍️ Rider's Plate special — entrée + draft, flat price. Show this text.`,
    commercialScript: `[0–5s] Big ride through ${c.city} this weekend? [5–15s] ${c.biz} is the stop — hot food, cold drafts, easy parking. [15–25s] Ask for the Rider's Plate special. [25–30s] This weekend only. See you here.`,
    cta: "Get the Rider's Plate",
  }),
  game_day: (c) => ({
    campaignName: "Game-Day Special", offer: "Game-Day bucket + wings deal during every game this week",
    facebookAd: `🏈 Big game near ${c.city}? Watch it at ${c.biz}. Game-Day bucket + wings deal, every screen on the action. Grab your table before kickoff.`,
    smsBlast: `${c.biz}: Game day! Bucket + wings deal during the game. Reply for a table before kickoff.`,
    cta: "Reserve a game-day table",
  }),
  year_end_insurance: (c) => ({
    campaignName: "Year-End Insurance Benefits Recall",
    offer: "Use-it-or-lose-it: book before Dec 31 to use your remaining dental benefits",
    smsBlast: `${c.biz}: your dental benefits reset Jan 1 — don't lose what you've paid for. Reply BOOK to grab a spot before Dec 31.`,
    emailCampaign: { subject: "Your dental benefits expire Dec 31 — don't lose them", body: `Most insurance benefits reset January 1, and unused coverage is gone for good. If you're due for a visit, now is the time. Reply or call ${c.biz} to book before Dec 31.` },
    landingHeadline: "Your Dental Benefits Reset Jan 1 — Use Them Before They're Gone",
    cta: "Book before Dec 31",
  }),
  review_engine: (c) => ({
    campaignName: "Review Acceleration Engine", offer: "Automated 5-star review requests after every visit",
    facebookAd: `${c.biz} is raising the bar in ${c.city}. See why our customers leave 5 stars — and book with confidence.`,
    cta: "See our reviews",
  }),
  reactivation: (c) => ({
    campaignName: "We Miss You Reactivation", offer: "Welcome-back offer for past customers",
    smsBlast: `${c.biz}: we miss you! Here's a welcome-back offer just for past customers. Reply to claim it.`,
    cta: "Claim my welcome-back offer",
  }),
};

export function generateCampaign({ opportunity, audit }) {
  const base = baseCampaign(opportunity, audit);
  const override = OVERRIDES[opportunity.recommendedCampaign];
  return override ? { ...base, ...override(ctxOf(opportunity, audit)) } : base;
}
