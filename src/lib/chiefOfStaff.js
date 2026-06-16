// src/lib/chiefOfStaff.js — V5 Executive Intelligence: the CHIEF OF STAFF.
// PURE & deterministic. Turns the portfolio of audited businesses into an
// always-on executive briefing that answers the four questions a chief of staff
// answers every week:
//   What matters?  ·  What changed?  ·  What should happen next?  ·  What to ignore?
//
// Operates on the `audits` array the app already loads (own-rows via RLS) plus
// the diagnosis/forecast/competitor blocks already inside each audit — so it
// needs NO new data fetch and NO new serverless function. Importable by the
// client (the in-app Briefing) and, later, the server cron (weekly email).

import { surfacedOpportunities } from "./opportunity/opportunityEngine.js";
import { nextBestAction } from "./nextBestAction.js";
import { departmentIntelligence, weakestDepartment } from "./departmentEngine.js";

const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const WEEK = 7 * 86400000;

// A single business's health (0–100) with transparent components, so the score
// is explainable, not a black box.
export function businessHealth(audit) {
  const base = Number.isFinite(audit?.overallScore) ? audit.overallScore : 60;
  const components = [{ key: "audit", label: "Audit score", value: Math.round(base) }];
  let score = base;

  const cm = audit?.competitorIntelligence?.metrics;
  if (cm && cm.reviewLeader != null && cm.yourReviews != null) {
    const gap = cm.reviewLeader - cm.yourReviews;
    const pen = gap > 200 ? 12 : gap > 80 ? 7 : gap > 0 ? 3 : 0;
    if (pen) { score -= pen; components.push({ key: "competitive", label: "Competitive standing", value: -pen }); }
  }
  const sev = (audit?.salesIntelligence?.bottlenecks || []).filter((b) => b.severity >= 3).length;
  const sevPen = Math.min(12, sev * 3);
  if (sevPen) { score -= sevPen; components.push({ key: "risk", label: "Open sales risks", value: -sevPen }); }

  score = clamp(Math.round(score));
  const label = score >= 75 ? "Strong" : score >= 55 ? "Stable" : score >= 40 ? "At risk" : "Critical";
  return { score, label, components };
}

// The single highest-leverage next action for a business ("what should happen next").
export function strategicPriority(audit) {
  const imp = audit?.growthDiagnosis?.highestRoiImprovements?.[0];
  if (imp) return { action: imp.action, addresses: imp.addresses, rationale: imp.rationale, impact: imp.impactScore ?? null, driver: imp.growthDriver || null, source: "diagnosis" };
  const w = audit?.weaknesses?.[0];
  if (w) return { action: `Fix: ${w.label || w}`, rationale: w.detail || "", impact: null, source: "finding" };
  return null;
}

// Threats (act on) and opportunities (capture) for a business.
export function detectSignals(audit) {
  const threats = [], opportunities = [];
  const cm = audit?.competitorIntelligence?.metrics;
  if (cm && cm.reviewLeader != null && cm.yourReviews != null && cm.reviewLeader - cm.yourReviews > 80) {
    threats.push({ title: "Review gap vs local leader", detail: `${cm.yourReviews} vs ${cm.reviewLeader} reviews — suppressing local visibility.`, source: "competitor" });
  }
  const f12 = audit?.growthDiagnosis?.forecast?.portfolio?.m12;
  if (f12 && f12.high > 0) opportunities.push({ title: "Modeled first-year upside", detail: `$${(f12.low || 0).toLocaleString()}–$${f12.high.toLocaleString()} recoverable from prescribed systems.`, source: "forecast" });
  const quick = (audit?.growthDiagnosis?.highestRoiImprovements || []).find((i) => i.effort === "low");
  if (quick) opportunities.push({ title: "Quick win available", detail: `${quick.action} — low effort, impact ${quick.impactScore}.`, source: "diagnosis" });
  if (businessHealth(audit).score < 40) threats.push({ title: "Business health critical", detail: "Overall health is in the critical band.", source: "health" });
  return { threats, opportunities };
}

export function buildBusinessBriefing(audit, opts = {}) {
  const opportunities = surfacedOpportunities(audit, opts);
  const departments = departmentIntelligence(audit, opportunities);
  return {
    id: audit.id, business: audit.businessName, industry: audit.industry,
    health: businessHealth(audit),
    priority: strategicPriority(audit),
    signals: detectSignals(audit),
    stage: audit.stage || null,
    nextActionAt: audit.next_action_at || null,
    opportunityValue: audit?.growthDiagnosis?.forecast?.portfolio?.m12?.high ?? null,
    // V6 — opportunity intelligence + department + the one next action.
    opportunities,
    nba: nextBestAction(audit, opportunities),
    departments,
    weakestDept: weakestDepartment(departments),
  };
}

// The portfolio-level CEO briefing: what matters / changed / next / ignore.
export function buildPortfolioBriefing(audits, { now = Date.now() } = {}) {
  const list = (audits || []).map(buildBusinessBriefing);
  const portfolioHealth = list.length ? Math.round(list.reduce((s, b) => s + b.health.score, 0) / list.length) : null;

  // WHAT MATTERS — the highest-impact open priorities across the book.
  const whatMatters = list
    .filter((b) => b.priority)
    .sort((a, b) => (b.priority.impact || 0) - (a.priority.impact || 0))
    .slice(0, 3)
    .map((b) => ({ id: b.id, business: b.business, action: b.priority.action, rationale: b.priority.rationale, impact: b.priority.impact }));

  // WHAT CHANGED — recent activity (new audits this week, follow-ups now due).
  const whatChanged = [];
  for (const a of audits || []) {
    const created = a.createdAt ? new Date(a.createdAt).getTime() : null;
    if (created && now - created <= WEEK) whatChanged.push({ business: a.businessName, change: "New audit completed", at: a.createdAt });
    if (a.next_action_at && new Date(a.next_action_at).getTime() <= now) whatChanged.push({ business: a.businessName, change: "Follow-up due", at: a.next_action_at });
  }

  // WHAT'S NEXT — the single most important action right now.
  const whatNext = whatMatters[0] || null;

  // WHAT TO IGNORE — healthy/stable businesses that need no attention this week.
  const stable = list.filter((b) => b.health.score >= 70 && (!b.priority || (b.priority.impact || 0) < 30));
  const whatToIgnore = { stableBusinesses: stable.map((b) => b.business).slice(0, 6), count: stable.length };

  const threats = list.flatMap((b) => b.signals.threats.map((t) => ({ ...t, business: b.business }))).slice(0, 5);
  const opportunities = list.flatMap((b) => b.signals.opportunities.map((o) => ({ ...o, business: b.business }))).slice(0, 5);
  const totalOpportunity = list.reduce((s, b) => s + (b.opportunityValue || 0), 0);

  // V6 — opportunity intelligence rolled up across the book.
  const growthOpportunities = list
    .flatMap((b) => (b.opportunities || []).map((o) => ({ ...o, business: b.business, businessId: b.id })))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
  const recommendedCampaigns = growthOpportunities
    .filter((o) => o.campaign)
    .slice(0, 4)
    .map((o) => ({ business: o.business, businessId: o.businessId, campaignName: o.campaign.campaignName, opportunity: o.title, revenue: o.estimatedRevenueRange, window: o.timeWindow, channel: o.campaign.recommendedChannel }));
  const recommendedAutomations = [...new Set(growthOpportunities.map((o) => o.recommendedWorkflow).filter(Boolean))].slice(0, 6);
  const competitorWatch = list
    .filter((b) => b.signals.threats.some((t) => t.source === "competitor"))
    .map((b) => ({ business: b.business, detail: b.signals.threats.find((t) => t.source === "competitor").detail }))
    .slice(0, 5);
  // Department notes: weakest department per business (action-bearing only).
  const departmentNotes = list
    .filter((b) => b.weakestDept)
    .map((b) => ({ business: b.business, department: b.weakestDept.name, health: b.weakestDept.currentHealthScore, note: b.weakestDept.nextBestAction }))
    .sort((a, b) => a.health - b.health)
    .slice(0, 6);
  // Portfolio next-best-action = the most urgent/valuable single move across the book.
  const portfolioNba = list.map((b) => b.nba).filter(Boolean)
    .sort((a, b) => (b.revenueRange?.high || 0) - (a.revenueRange?.high || 0))[0] || null;
  // 7-day action plan = top priorities + the highest-urgency opportunity, sequenced.
  const sevenDayPlan = [
    ...whatMatters.slice(0, 3).map((m, i) => ({ day: `Day ${i + 1}`, action: m.action, business: m.business })),
    ...growthOpportunities.filter((o) => o.urgency === "high").slice(0, 2).map((o, i) => ({ day: `Day ${4 + i}`, action: o.nextBestAction || o.title, business: o.business })),
  ].slice(0, 5);

  return {
    generatedAt: new Date(now).toISOString(),
    businesses: list.length,
    portfolioHealth,
    whatMatters, top3Priorities: whatMatters, whatChanged: whatChanged.slice(0, 6), whatNext, whatToIgnore,
    threats, opportunities, totalOpportunity,
    // V6 executive-briefing sections.
    growthOpportunities, recommendedCampaigns, recommendedAutomations, competitorWatch, departmentNotes,
    nextBestAction: portfolioNba, sevenDayPlan,
    roster: list.sort((a, b) => a.health.score - b.health.score), // worst-health first
  };
}
