// src/lib/opportunity/opportunityScoring.js — V6 Phase 9: the SIGNAL SCORING
// SYSTEM. Normalizes every opportunity to a single 0–100 score + a display tier,
// so the UI can decide what to surface as urgent vs. opportunity vs. watch vs.
// ignore — never a raw news feed. PURE.

const COMPLEXITY_ACTIONABILITY = { low: 1.0, medium: 0.7, high: 0.45 };
const LEAD_MULT = { high: 1.3, medium: 1.0, low: 0.8 };
const WINDOW_URGENCY = { "this weekend": 1.0, "next 10 days": 0.95, "before Dec 31": 0.9, "next 2 weeks": 0.8, "next 30 days": 0.6, "this season": 0.5, "this quarter": 0.45, ongoing: 0.35 };

const clamp01 = (n) => Math.max(0, Math.min(1, n));
const round50 = (n) => Math.round(n / 50) * 50;

// Weighted opportunity score from its component dimensions.
export function scoreOpportunity({ signal, template, audit }) {
  const confidence = clamp01(signal.confidence ?? 0.6);
  const fit = signal.vertical && signal.vertical !== "generic" && signal.type !== "external" ? 0.95 : signal.type === "grounded" ? 0.9 : 0.7;
  const urgency = clamp01((template.urgencyBias ?? 0.5) * 0.6 + (WINDOW_URGENCY[template.timeWindow] ?? 0.5) * 0.4);
  const actionability = clamp01((COMPLEXITY_ACTIONABILITY[template.implementationComplexity] ?? 0.7) + (template.recommendedWorkflow ? 0.05 : 0));

  // Revenue → impact, scaled by the business's lead value.
  const tier = audit?.businessIntelligenceProfile?.leadValue?.tier || "medium";
  const mult = LEAD_MULT[tier] ?? 1.0;
  const [lo, hi] = template.baseRevenue || [500, 2000];
  const estimatedRevenueRange = { low: round50(lo * mult), high: round50(hi * mult) };
  const businessImpact = clamp01(Math.log10(Math.max(10, estimatedRevenueRange.high)) / 4.3); // ~$20k → ~1.0
  const relevance = clamp01(confidence * 0.6 + fit * 0.4);

  const score = Math.round(100 * clamp01(
    businessImpact * 0.30 + urgency * 0.25 + confidence * 0.20 + fit * 0.15 + actionability * 0.10
  ));
  const tierLabel = score >= 72 ? "urgent" : score >= 52 ? "opportunity" : score >= 34 ? "watch" : "ignore";

  return {
    relevance: Math.round(relevance * 100) / 100,
    urgency: Math.round(urgency * 100) / 100,
    businessImpact: Math.round(businessImpact * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
    actionability: Math.round(actionability * 100) / 100,
    fit: Math.round(fit * 100) / 100,
    score, tier: tierLabel, estimatedRevenueRange,
  };
}

export const opportunityTier = (score) => (score >= 72 ? "urgent" : score >= 52 ? "opportunity" : score >= 34 ? "watch" : "ignore");
