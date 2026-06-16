// src/lib/nextBestAction.js — V6 Phase 10: the NEXT BEST ACTION engine. The
// central decision mechanism: of everything the platform knows about a business,
// the ONE thing to do first. Weighs revenue, urgency, ease, confidence, the
// audit's own top fix, and the highest-scoring opportunity. PURE.
import { surfacedOpportunities } from "./opportunity/opportunityEngine.js";

const COMPLEXITY = { low: 1.0, medium: 0.7, high: 0.45 };
const norm = (v, max) => Math.max(0, Math.min(1, (Number(v) || 0) / max));

// Score a candidate action on the same axes regardless of where it came from.
function rank(candidate) {
  const revenue = norm(candidate.revenueHigh, 20000);
  const urgency = candidate.urgency ?? 0.5;
  const ease = COMPLEXITY[candidate.complexity] ?? 0.7;
  const confidence = candidate.confidence ?? 0.7;
  return revenue * 0.35 + urgency * 0.25 + confidence * 0.2 + ease * 0.2;
}

// Determine the single highest-leverage next action for a business.
export function nextBestAction(audit, opportunities) {
  const candidates = [];

  // Candidate A — the audit's own #1 highest-ROI improvement.
  const imp = audit?.growthDiagnosis?.highestRoiImprovements?.[0];
  if (imp) {
    const leakHigh = (audit?.growthDiagnosis?.forecast?.portfolio?.m12?.high || 0);
    candidates.push({
      source: "diagnosis", actionTitle: imp.action, explanation: imp.rationale,
      expectedResult: `Closes "${imp.addresses}" — the highest-impact gap in the diagnosis.`,
      recommendedWorkflow: imp.canonical || null, recommendedCampaign: null,
      timeToLaunch: imp.effort === "low" ? "this week" : "1–2 weeks", complexity: imp.effort || "medium",
      confidence: 0.85, departmentOwner: "Sales", revenueHigh: Math.max(2000, Math.round(leakHigh / 6)),
      urgency: 0.7, revenueRange: { low: Math.round(leakHigh / 12) || 500, high: Math.round(leakHigh / 4) || 3000 },
    });
  }

  // Candidate B — the top surfaced opportunity (often time-sensitive + a campaign).
  const opps = opportunities || surfacedOpportunities(audit);
  const topOpp = opps[0];
  if (topOpp) {
    candidates.push({
      source: "opportunity", actionTitle: topOpp.nextBestAction || topOpp.title, explanation: topOpp.whyItMatters,
      expectedResult: `Captures the "${topOpp.title}" window before it closes.`,
      recommendedWorkflow: topOpp.recommendedWorkflow, recommendedCampaign: topOpp.recommendedCampaign,
      timeToLaunch: topOpp.urgency === "high" ? "within 48 hours" : "within 1 week", complexity: topOpp.implementationComplexity,
      confidence: topOpp.confidenceScore, departmentOwner: topOpp.departmentOwner, revenueHigh: topOpp.estimatedRevenueRange.high,
      urgency: topOpp.urgency === "high" ? 0.95 : topOpp.urgency === "medium" ? 0.65 : 0.4,
      revenueRange: topOpp.estimatedRevenueRange, campaign: topOpp.campaign || null,
    });
  }

  if (!candidates.length) return null;
  candidates.forEach((c) => { c._rank = rank(c); });
  candidates.sort((a, b) => b._rank - a._rank);
  const best = candidates[0];
  return {
    actionTitle: best.actionTitle, explanation: best.explanation, expectedResult: best.expectedResult,
    recommendedWorkflow: best.recommendedWorkflow, recommendedCampaign: best.recommendedCampaign,
    timeToLaunch: best.timeToLaunch, complexity: best.complexity, confidence: best.confidence,
    revenueRange: best.revenueRange, departmentOwner: best.departmentOwner, source: best.source,
    campaign: best.campaign || null,
  };
}
