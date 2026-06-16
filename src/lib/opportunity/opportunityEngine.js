// src/lib/opportunity/opportunityEngine.js — V6 Phase 1: the OPPORTUNITY
// INTELLIGENCE ENGINE (orchestrator). signals → patterns → scoring → ranked
// Opportunity Alerts, each with a launch-ready campaign attached when it clears
// the bar. PURE & deterministic. This is the intelligence FILTER, not a feed:
// every alert answers what happened / why it matters / what to do / which
// workflow + campaign / expected impact.
import { gatherSignals, verticalOf } from "./signalLibrary.js";
import { matchPattern } from "./opportunityPatterns.js";
import { scoreOpportunity } from "./opportunityScoring.js";
import { generateCampaign } from "./campaignGenerator.js";

const APPLICABLE = {
  restaurant: ["Restaurant", "Bar", "Sports Bar", "Cafe"],
  roofing: ["Roofing", "Contractor"],
  dental: ["Dental"],
  barber_salon: ["Barbershop", "Salon", "Beauty"],
  auto: ["Auto Repair", "Tire Shop"],
  contractor: ["Contractor", "HVAC", "Plumbing", "Home Services"],
  agency_saas: ["Agency", "SaaS"],
  generic: ["All"],
};
const impactLabel = (score) => (score >= 72 ? "High" : score >= 52 ? "Medium-High" : score >= 34 ? "Medium" : "Low");

// Build a single Opportunity Alert from a signal + its matched template.
function buildAlert(signal, template, audit, idx) {
  const sc = scoreOpportunity({ signal, template, audit });
  const opportunity = {
    id: `opp_${signal.id}_${idx}`,
    title: template.title,
    category: template.category || signal.category,
    industry: audit?.industry || audit?.businessIntelligenceProfile?.industry || null,
    applicableBusinessTypes: APPLICABLE[signal.vertical] || ["All"],
    triggerSignal: signal.label,
    whyItMatters: template.whyItMatters,
    estimatedImpact: impactLabel(sc.score),
    confidenceScore: sc.confidence,
    urgency: sc.tier === "urgent" ? "high" : sc.tier === "opportunity" ? "medium" : "low",
    recommendedActions: template.recommendedActions || [],
    recommendedWorkflow: template.recommendedWorkflow || null,
    recommendedCampaign: template.recommendedCampaign || null,
    estimatedRevenueRange: sc.estimatedRevenueRange,
    timeWindow: template.timeWindow || "ongoing",
    requiredAssets: template.requiredAssets || [],
    implementationComplexity: template.implementationComplexity || "medium",
    departmentOwner: template.departmentOwner || "Marketing",
    nextBestAction: (template.recommendedActions || [])[0] || null,
    ignoreReason: sc.tier === "ignore" ? "Low modeled impact / urgency for this business right now." : null,
    sourceSignals: [{ id: signal.id, type: signal.type, simulated: !!signal.simulated, label: signal.label }],
    score: sc.score, tier: sc.tier, scoreBreakdown: sc,
  };
  // Attach a launch-ready campaign for anything worth acting on.
  if (sc.tier === "urgent" || sc.tier === "opportunity") {
    opportunity.campaign = generateCampaign({ opportunity, audit });
  }
  return opportunity;
}

// Detect, score, and rank opportunities for a business. opts.month/now drive
// seasonality; opts.injected forces specific signals (demo/adapter mocks).
export function detectOpportunities(audit, opts = {}) {
  const signals = gatherSignals(audit, opts);
  const alerts = [];
  const seenTitles = new Set();
  signals.forEach((sig, i) => {
    const tpl = matchPattern(sig, audit);
    if (!tpl) return;
    const alert = buildAlert(sig, tpl, audit, i);
    const key = alert.title.toLowerCase();
    if (seenTitles.has(key)) return; // dedupe same opportunity from multiple signals
    seenTitles.add(key);
    alerts.push(alert);
  });
  alerts.sort((a, b) => b.score - a.score);
  return alerts;
}

// Just the surfaced (actionable) opportunities — drops the ignore tier.
export function surfacedOpportunities(audit, opts = {}) {
  return detectOpportunities(audit, opts).filter((o) => o.tier !== "ignore");
}

export function topOpportunity(audit, opts = {}) {
  return surfacedOpportunities(audit, opts)[0] || null;
}

export { verticalOf };
