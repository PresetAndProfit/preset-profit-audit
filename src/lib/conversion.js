// ─────────────────────────────────────────────────────────────────────────────
// conversion.js
// The conversion brain. Pure, deterministic logic that reads the user's REAL
// pipeline (their audits/deals) and answers two product questions:
//   1. "What's the single best next action to get this user to value?" (activation)
//   2. "Why — anchored to value they've already built — should they upgrade?" (conversion)
//
// No mock data: every number comes from the user's own audits. No network.
// Drives the Dashboard activation card + the value-anchored upgrade CTAs, so the
// free→paid moment is sold on the dollars the user has personally generated.
// ─────────────────────────────────────────────────────────────────────────────

import { pipelineAggregates, deriveStage, flowIndex } from "./dealEngine.js";

const usd = n => `$${Math.round(Number(n) || 0).toLocaleString()}`;

// The end-to-end play a user runs per deal: audit → roadmap → proposal → outreach.
// Activation = has the account completed each step at least once?
function activation(audits) {
  const ran = audits.length > 0;
  const maxFlow = audits.reduce((mx, a) => Math.max(mx, flowIndex(deriveStage(a))), 0);
  return {
    ran,
    roadmap: maxFlow >= flowIndex("roadmap"),
    proposal: maxFlow >= flowIndex("proposal"),
    outreach: audits.some(a => a.crm?.outreach) || maxFlow >= flowIndex("outreach"),
  };
}

// The single highest-leverage next step, plus the deal it applies to so the UI
// can deep-link. Ordered along the value path; ends on "scale → upgrade".
function nextAction(audits, act, isPaid) {
  if (!act.ran) {
    return { key: "scan", label: "Run your first audit", cta: "Run an audit", why: "See exactly where a business is leaking revenue — in 30 seconds." };
  }
  // Advance the furthest-along deal (closest to a sale).
  const deal = [...audits].sort((a, b) => flowIndex(deriveStage(b)) - flowIndex(deriveStage(a)))[0];
  const biz = deal?.businessName || "your prospect";
  if (!act.roadmap) return { key: "report", deal, label: `Build ${biz}'s automation roadmap`, cta: "Open the report →", why: "Turn the audit into a priced, ROI-backed proposal." };
  if (!act.proposal) return { key: "report", deal, label: `Download ${biz}'s sales proposal`, cta: "Open the roadmap →", why: "A closing-quality PDF you can send today." };
  if (!act.outreach) return { key: "report", deal, label: `Generate outreach for ${biz}`, cta: "Generate outreach →", why: "Cold email + call script that quote their own ROI — this books the call." };
  if (!isPaid) return { key: "upgrade", label: "You've run the full play. Now scale it.", cta: "Go unlimited →", why: "Unlimited audits, proposals and outreach for every prospect in your pipeline." };
  return { key: "pipeline", deal, label: "Work your pipeline to close", cta: "Open pipeline →", why: "Closing is follow-up. Move deals to Closed-Won and sell the automation." };
}

// Value-anchored upgrade copy for free users — the headline is THEIR number.
function upgradeOffer(audits, agg, usage) {
  const pipeline = (agg.openValueCents + agg.wonValueCents) / 100;
  if (pipeline > 0) {
    return {
      headline: `You've built ${usd(pipeline)} in pipeline from ${audits.length} deal${audits.length !== 1 ? "s" : ""}.`,
      sub: usage.atLimit
        ? `Your free plan is capped at 1 audit. Go unlimited to run every prospect, build proposals, and work the whole pipeline to close.`
        : `Go unlimited and run this play on every prospect — unlimited audits, proposals and outreach.`,
      planId: "professional",
    };
  }
  return {
    headline: "Unlock the full Growth OS.",
    sub: usage.atLimit
      ? `You've used your free audit. Upgrade for unlimited audits, un-watermarked proposals, and the full pipeline.`
      : `Run unlimited audits, build sales-ready proposals, and generate outreach for every prospect you find.`,
    planId: "professional",
  };
}

// One call the UI uses for all conversion surfaces.
export function conversionState(audits = [], plan, usage) {
  const agg = pipelineAggregates(audits);
  const isPaid = plan?.id !== "free";
  const act = activation(audits);
  return {
    agg,
    pipelineValueCents: agg.openValueCents + agg.wonValueCents,
    isPaid,
    activation: act,
    next: nextAction(audits, act, isPaid),
    showUpgrade: !isPaid,
    upgrade: !isPaid ? upgradeOffer(audits, agg, usage) : null,
  };
}

export { usd };
