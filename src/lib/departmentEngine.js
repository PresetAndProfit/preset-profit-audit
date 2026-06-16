// src/lib/departmentEngine.js — V6 Phase 5: the DEPARTMENT INTELLIGENCE MODEL.
// Turns one business's audit + opportunities into a per-department read so the
// platform can say "your Sales department is weak because leads aren't followed
// up" or "your Reputation department is exposed — competitors are gaining
// reviews faster." PURE & deterministic.
import { detectOpportunities } from "./opportunity/opportunityEngine.js";

const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

// Static department metadata (mission + KPIs).
export const DEPARTMENTS = [
  { key: "executive", name: "Executive Intelligence", mission: "Decide what matters and what to do first.", kpis: ["business health", "priority focus", "modeled opportunity"] },
  { key: "sales", name: "Sales", mission: "Turn interest into booked, paying customers.", kpis: ["speed-to-lead", "lead→customer rate", "follow-up coverage"] },
  { key: "marketing", name: "Marketing", mission: "Create demand and capture local attention.", kpis: ["reviews", "local visibility", "campaign output"] },
  { key: "customer_success", name: "Customer Success", mission: "Retain customers and grow repeat revenue.", kpis: ["repeat rate", "reactivation", "no-show rate"] },
  { key: "operations", name: "Operations", mission: "Run the business smoothly day to day.", kpis: ["SOP adherence", "scheduling", "bottlenecks"] },
  { key: "finance", name: "Finance", mission: "Protect cash and profitability.", kpis: ["revenue leak", "collections", "cash flow"] },
  { key: "competitive", name: "Competitive Intelligence", mission: "Know what rivals are doing and out-position them.", kpis: ["review gap", "local rank", "offer gaps"] },
  { key: "reputation", name: "Reputation", mission: "Build trust that wins the click before contact.", kpis: ["review volume", "rating", "response rate"] },
  { key: "business_dev", name: "Business Development", mission: "Open new channels, offers, and partnerships.", kpis: ["offer clarity", "referral volume", "new channels"] },
];

const OWNER_TO_KEY = {
  "Executive Intelligence": "executive", Sales: "sales", Marketing: "marketing", "Customer Success": "customer_success",
  Operations: "operations", Finance: "finance", "Competitive Intelligence": "competitive", Reputation: "reputation", "Business Development": "business_dev",
};

// Derive each department's issues/strengths/health from the audit.
function deriveSignals(audit) {
  const out = {}; // key → { issues:[], strengths:[], workflows:Set }
  for (const d of DEPARTMENTS) out[d.key] = { issues: [], strengths: [], workflows: new Set() };

  const bn = audit?.salesIntelligence?.bottlenecks || [];
  for (const b of bn) {
    const key = b.stage === "retention" ? "customer_success" : "sales";
    if (b.severity >= 3) out[key].issues.push(b.label);
    if (b.canonical) out[key].workflows.add(b.canonical);
  }

  const cm = audit?.competitorIntelligence?.metrics;
  if (cm && cm.reviewLeader != null && cm.yourReviews != null) {
    const gap = cm.reviewLeader - cm.yourReviews;
    if (gap > 40) { out.competitive.issues.push(`Trailing local leader on reviews (${cm.yourReviews} vs ${cm.reviewLeader})`); out.reputation.issues.push("Review volume below local leaders"); out.reputation.workflows.add("Automatic Review Requests"); }
    else out.reputation.strengths.push("Reviews competitive locally");
  }

  const leak = audit?.revenueLeakSummary;
  if (leak?.totalHigh > 0) out.finance.issues.push(`Modeled revenue leak up to $${(leak.totalHigh).toLocaleString()}/mo`);

  // Marketing health from diagnosis drivers (reviews/seo/social/website).
  const imps = audit?.growthDiagnosis?.highestRoiImprovements || [];
  for (const i of imps) {
    if (/review|reputation/i.test(i.growthDriver || "")) out.reputation.workflows.add(i.canonical);
    if (/seo|website|conversion|maps|visibility/i.test(i.growthDriver || "")) { out.marketing.issues.push(i.addresses); if (i.canonical) out.marketing.workflows.add(i.canonical); }
    if (/repeat|retention|recall/i.test(i.growthDriver || "")) { out.customer_success.issues.push(i.addresses); if (i.canonical) out.customer_success.workflows.add(i.canonical); }
  }

  // Operations & Finance need internal integrations the platform doesn't have yet.
  out.operations.issues.push("Internal operations data not connected (calendar / tasks / SOPs)");
  if (!out.finance.issues.length) out.finance.issues.push("Financial systems not connected (invoicing / cash flow)");

  return out;
}

const deptHealth = (issues, strengths) => clamp(Math.round(76 - issues * 9 + strengths * 5));

// Build the full department intelligence for a business.
export function departmentIntelligence(audit, opportunities) {
  const opps = opportunities || detectOpportunities(audit);
  const surfaced = opps.filter((o) => o.tier !== "ignore");
  const sig = deriveSignals(audit);

  // Bucket opportunities by owning department.
  const oppByKey = {};
  for (const o of surfaced) { const k = OWNER_TO_KEY[o.departmentOwner] || "marketing"; (oppByKey[k] = oppByKey[k] || []).push(o); }

  const topImprovement = audit?.growthDiagnosis?.highestRoiImprovements?.[0];
  const overallHealth = Number.isFinite(audit?.overallScore) ? audit.overallScore : 60;

  return DEPARTMENTS.map((d) => {
    const s = sig[d.key];
    const dOpps = oppByKey[d.key] || [];
    const issues = [...new Set(s.issues)];
    const isGated = d.key === "operations" || d.key === "finance";
    const health = d.key === "executive"
      ? clamp(Math.round(overallHealth))
      : isGated ? 50 /* advisory-only until integrations land */ : deptHealth(issues.length, s.strengths.length);

    const recommendedWorkflows = [...s.workflows, ...dOpps.map((o) => o.recommendedWorkflow).filter(Boolean)];
    const recommendedCampaigns = dOpps.map((o) => o.recommendedCampaign).filter(Boolean);
    const nextBestAction = d.key === "executive"
      ? (topImprovement ? topImprovement.action : (dOpps[0]?.nextBestAction || null))
      : (dOpps[0]?.nextBestAction || (issues.length ? `Address: ${issues[0]}` : null));

    return {
      key: d.key, name: d.name, mission: d.mission, kpis: d.kpis,
      currentHealthScore: health,
      detectedIssues: issues,
      detectedOpportunities: dOpps.map((o) => ({ title: o.title, score: o.score, revenue: o.estimatedRevenueRange })),
      recommendedWorkflows: [...new Set(recommendedWorkflows)].slice(0, 4),
      recommendedCampaigns: [...new Set(recommendedCampaigns)].slice(0, 3),
      nextBestAction,
      confidenceScore: isGated ? 0.4 : 0.8,
      gated: isGated,
    };
  });
}

// The single weakest department that has an actionable next step.
export function weakestDepartment(departments) {
  return departments
    .filter((d) => d.key !== "executive" && d.nextBestAction)
    .sort((a, b) => a.currentHealthScore - b.currentHealthScore)[0] || null;
}
