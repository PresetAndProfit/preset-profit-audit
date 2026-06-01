// ─────────────────────────────────────────────────────────────────────────────
// roadmapEngine.js — DEFENSIBLE proposal economics.
//
// Hard rule: never recommend a system that doesn't clearly make the client more
// money than it costs. No inflation, no marketing fantasy — investor-grade math.
//
// How it works:
//   1. Derive the business's real economics from the audit (volume, customer value,
//      close rate, leak rates) — see deriveEconomics + constants INDUSTRY_LEAD_VALUE.
//   2. Model each system's monthly impact on a DISTINCT leak (missed calls, web
//      leads, no-shows, reviews/volume, quotes, after-hours, referrals, dormant,
//      receivables, repeat). Distinct mechanisms ⇒ no double-counting ⇒ the
//      combined total is honest, not naive over-addition.
//   3. ROI GATE: a system is "recommended" ONLY if monthly recovered value ≥ 3×
//      monthly cost AND payback < 6 months. Otherwise it's a "Future Opportunity"
//      (positive but below the bar) or "needs manual validation" (too little data).
//   4. Rank the passing systems by ROI + ease + time-to-value + relevance, and
//      recommend only the TOP 3. The rest collapse into Additional / Future.
//   5. Every recommendation answers YES to: "if I spend this, will I make more?"
//
// Pure + deterministic. All assumptions are explicit constants below.
// ─────────────────────────────────────────────────────────────────────────────

import { CATALOG, BUNDLES, CATALOG_BY_ID } from "./automationCatalog.js";
import {
  INDUSTRY_JOB_VALUE, INDUSTRY_LEAD_VALUE, INDUSTRY_CLOSE_RATE,
  INDUSTRY_NO_SHOW_RATE, INDUSTRY_MISSED_CALL_RATE,
} from "./constants.js";

// ── money helpers ────────────────────────────────────────────────────────────
const r50 = n => Math.max(50, Math.round(n / 50) * 50);
export const usd = n => `$${Math.round(Number(n) || 0).toLocaleString()}`;
const round1 = n => Math.round(n * 10) / 10;

// ── the ROI gate (trust protection) ──────────────────────────────────────────
export const MIN_ROI_MULTIPLE = 3;       // monthly recovered ≥ 3× monthly cost
export const MAX_PAYBACK_MONTHS = 6;      // must pay back the setup within 6 months
const MIN_RECOVERED_PER_MO = 0.4;         // below this the estimate is too noisy → validate manually

export function paybackLabel(months) {
  if (months == null) return "—";
  if (months < 1) { const w = Math.max(1, Math.round(months * 4)); return `~${w} week${w !== 1 ? "s" : ""}`; }
  return `${round1(months)} month${months >= 2 ? "s" : ""}`;
}

// ── industry economics derived from the audit ────────────────────────────────
function deriveEconomics(report) {
  const a = report.assumptions || {};
  const industry = report.industry || a.industry || "Home Services";
  const M = Math.max(2, a.monthlyJobs || 20);                       // closed customers / jobs per month
  const avgJob = a.avgJobValue || INDUSTRY_JOB_VALUE[industry] || 150;
  const LV = INDUSTRY_LEAD_VALUE[industry] || Math.max(avgJob, 300); // value of one NEW customer (conservative LTV-lite)
  const closeRate = INDUSTRY_CLOSE_RATE[industry] || 0.35;
  const L = M / closeRate;                                          // total inbound leads / inquiries per month
  const missedCallRate = (a.missedCallRate != null ? a.missedCallRate / 100 : null) ?? INDUSTRY_MISSED_CALL_RATE[industry] ?? 0.25;
  const noShowRate = (a.noShowRate != null ? a.noShowRate / 100 : null) ?? INDUSTRY_NO_SHOW_RATE[industry] ?? 0.15;
  return { industry, M, L, avgJob, LV, closeRate, missedCallRate, noShowRate };
}

// ── per-system impact model — each on a DISTINCT leak (no double counting) ────
// `leak(e)` = the monthly volume the system acts on; `rate` = the conservative,
// benchmark-grounded fraction it converts; `basis` = whether each recovery is
// worth a new customer (LV) or a single job (avgJob). `ttv` = weeks to value.
const IMPACT_MODELS = {
  "missed-call-recovery": { leak: e => e.L * e.missedCallRate, rate: 0.15, basis: "LV",  ttv: 1, note: "~15% of missed callers recovered to a booking via a ~60-second text-back" },
  "speed-to-lead":        { leak: e => e.L * 0.5,              rate: 0.08, basis: "LV",  ttv: 1, note: "~8% more web/form leads closed by replying in minutes instead of hours" },
  "review-engine":        { leak: e => e.M,                    rate: 0.06, basis: "LV",  ttv: 3, note: "~6% lead-volume uplift from a stronger map-pack rating" },
  "appointment-reminders":{ leak: e => e.M * e.noShowRate,     rate: 0.50, basis: "job", ttv: 1, note: "~50% of no-shows prevented by day-before + 1-hour reminders" },
  "quote-followup":       { leak: e => e.L,                    rate: 0.08, basis: "job", ttv: 1, note: "~8% more quotes closed via a multi-touch follow-up sequence" },
  "ai-receptionist":      { leak: e => e.L,                    rate: 0.06, basis: "LV",  ttv: 2, note: "~6% of after-hours / overflow inquiries captured 24/7" },
  "referral-generator":   { leak: e => e.M,                    rate: 0.05, basis: "LV",  ttv: 2, note: "~5% more customers/month from a structured referral ask" },
  "database-reactivation":{ leak: e => e.M,                    rate: 0.08, basis: "LV",  ttv: 2, note: "~8% of monthly volume re-won from a dormant-customer campaign" },
  "invoice-reminder":     { leak: e => e.M,                    rate: 0.0,  basis: "job", ttv: 1, cashflow: true, note: "cash-flow benefit from faster collection — not new revenue" },
  "nurture-newsletter":   { leak: e => e.M,                    rate: 0.03, basis: "LV",  ttv: 4, note: "~3% incremental repeat purchases from staying top-of-mind" },
};

function modelImpact(service, econ) {
  const m = IMPACT_MODELS[service.id];
  if (!m) return { recovered: 0, monthlyImpact: 0, confidence: "low", note: "", ttv: 4 };
  if (m.cashflow) {
    // AR/cash-flow systems don't create NEW revenue; modeled tiny and honest so
    // they correctly fail the ROI gate and surface as a future opportunity.
    return { recovered: 0, monthlyImpact: r50(econ.M * econ.avgJob * 0.015), confidence: "low", note: m.note, ttv: m.ttv };
  }
  const recovered = m.leak(econ) * m.rate;                          // expected new customers/jobs per month
  const value = m.basis === "LV" ? econ.LV : econ.avgJob;
  return {
    recovered,
    monthlyImpact: r50(recovered * value),
    confidence: recovered < MIN_RECOVERED_PER_MO ? "low" : "ok",
    note: m.note,
    ttv: m.ttv,
  };
}

function economicsFor(service, monthlyImpact) {
  const setup = service.setupLow, monthly = service.monthly;
  const monthlyNet = monthlyImpact - monthly;
  const roiMultiple = round1(monthlyImpact / monthly);              // the gate metric (≥3)
  const paybackMonths = monthlyNet > 0 ? round1(setup / monthlyNet) : null;
  const firstYearReturn = monthlyImpact * 12;
  const firstYearCost = setup + monthly * 12;
  const firstYearNet = firstYearReturn - firstYearCost;
  const annualRoi = firstYearCost > 0 ? round1(firstYearReturn / firstYearCost) : 0;
  return { setup, monthly, monthlyImpact, monthlyNet, roiMultiple, paybackMonths, firstYearReturn, firstYearCost, firstYearNet, annualRoi };
}

// ── weakness extraction + relevance ──────────────────────────────────────────
function extractWeaknesses(report) {
  const findings = [...(report.leadFindings || []), ...(report.websiteFindings || [])]
    .filter(f => f.status && f.status !== "good");
  return findings.map(f => ({
    issue: f.label,
    severity: f.status === "bad" ? "critical" : "moderate",
    evidence: f.proof || f.personalNote || f.detail || f.why || "",
    weight: f.status === "bad" ? 2 : 1,
    label: String(f.label || "").toLowerCase(),
  }));
}

function relevanceOf(service, report, weaknesses) {
  let score = 0; const addressed = [];
  for (const w of weaknesses) {
    if (service.signals.some(sig => w.label.includes(sig))) { score += w.weight; addressed.push(w); }
  }
  const goalFit = service.goalFit.includes(report.goal);
  const industryFit = service.idealIndustries.includes(report.industry);
  if (goalFit) score += 2;
  if (industryFit) score += 1.5;
  return { score, addressed, relevant: addressed.length > 0 || goalFit || industryFit };
}

// Ranking: ROI-dominant, then ease, time-to-value, relevance.
function compositeScore(s) {
  const roi = Math.min(1, s.roiMultiple / 6);
  const ease = s.effort === "low" ? 1 : s.effort === "medium" ? 0.6 : 0.3;
  const ttv = 1 - Math.min(1, (s.ttv - 1) / 5);
  const rel = Math.min(1, s.relevanceScore / 6);
  return 0.5 * roi + 0.2 * ease + 0.15 * ttv + 0.15 * rel;
}

// ── dealable shape for the UI / PDF ──────────────────────────────────────────
function solutionShape(s) {
  return {
    id: s.id, num: s.service.num, name: s.service.name, consumerName: s.service.consumerName,
    category: s.service.category, problem: s.service.problem, solution: s.service.solution,
    howItWorks: s.service.howItWorks, buildLabel: s.service.buildLabel, effort: s.service.effort,
    hoursPerWeek: s.service.hoursPerWeek, ttvWeeks: s.ttv,
    monthlyImpact: s.monthlyImpact, setup: s.setup, monthly: s.monthly, monthlyNet: s.monthlyNet,
    roiMultiple: s.roiMultiple, paybackMonths: s.paybackMonths, paybackText: paybackLabel(s.paybackMonths),
    firstYearReturn: s.firstYearReturn, firstYearCost: s.firstYearCost, firstYearNet: s.firstYearNet, annualRoi: s.annualRoi,
    impactBasis: s.impactNote, recoveredPerMonth: round1(s.recovered),
    addressedWeaknesses: (s.addressed || []).map(w => ({ issue: w.issue, severity: w.severity, evidence: w.evidence })),
    status: s.status, phase: s.phase,
  };
}

function futureShape(s) {
  return {
    id: s.id, consumerName: s.service.consumerName, category: s.service.category,
    setup: s.setup, monthly: s.monthly, monthlyImpact: s.monthlyImpact, roiMultiple: s.roiMultiple,
    reason: s.status === "validate"
      ? "Not enough data to estimate responsibly — validate your real numbers before investing."
      : `Below our ${MIN_ROI_MULTIPLE}× ROI bar at current volume (${usd(s.monthlyImpact)}/mo vs ${usd(s.monthly)}/mo cost). Revisit as the business grows.`,
    impactBasis: s.impactNote,
  };
}

// ── roadmap sequencing ───────────────────────────────────────────────────────
const PHASES = [
  { key: "now",   title: "Phase 1 — Launch",  timeframe: "Week 1",    objective: "Deploy the fastest-payback systems first — recover revenue you're losing this month." },
  { key: "next",  title: "Phase 2 — Convert",  timeframe: "Weeks 2–4", objective: "Turn captured demand into booked, paying jobs." },
  { key: "later", title: "Phase 3 — Compound", timeframe: "Month 2+",  objective: "Maximize lifetime value: reputation, reactivation, premium coverage." },
];
function phaseKeyFor(service) {
  if (service.effort === "high") return "later";
  if (service.defaultPhase === 1) return "now";
  if (service.defaultPhase === 3) return "later";
  return "next";
}

// ── bundle selection (over the recommended set) ──────────────────────────────
function pickBundle(selectedIds, solutions) {
  const set = new Set(selectedIds);
  let best = null;
  for (const b of BUNDLES) {
    const present = b.members.filter(id => set.has(id));
    if (present.length < b.triggerMin) continue;
    const alacarteSetup = present.reduce((s, id) => s + CATALOG_BY_ID[id].setupLow, 0);
    const alacarteMonthly = present.reduce((s, id) => s + CATALOG_BY_ID[id].monthly, 0);
    const savings = (alacarteSetup + alacarteMonthly) - (b.setup + b.monthly);
    const candidate = { ...b, present, alacarteSetup, alacarteMonthly, savings, coverage: present.length };
    if (!best || candidate.coverage > best.coverage || (candidate.coverage === best.coverage && candidate.savings > best.savings)) best = candidate;
  }
  if (!best) return null;
  best.monthlyImpact = best.present.reduce((s, id) => { const sol = solutions.find(x => x.id === id); return s + (sol ? sol.monthlyImpact : 0); }, 0);
  best.firstYearCost = best.setup + best.monthly * 12;
  best.roiMultiple = best.firstYearCost > 0 ? round1((best.monthlyImpact * 12) / best.firstYearCost) : 0;
  return best;
}

// ── proposal copy ────────────────────────────────────────────────────────────
function buildProposal(report, { solutions, totals, bundle, hasRecommendations }) {
  const biz = report.businessName;
  const cityRef = report.city ? ` in ${report.city}` : "";

  if (!hasRecommendations) {
    return {
      opportunityStatement:
        `We modeled ${biz}${cityRef} conservatively against our standard automation systems. At ${biz}'s current volume and customer value, ` +
        `none of them clears our minimum bar — at least ${MIN_ROI_MULTIPLE}× return on cost with payback under ${MAX_PAYBACK_MONTHS} months. ` +
        `We won't recommend spend that doesn't clearly pay for itself. The opportunities below are worth revisiting as the business grows, ` +
        `and we'd validate your real numbers on a quick call before recommending anything.`,
      problemSolution: [],
      recommendation: `Our honest recommendation for ${biz}: don't buy yet. Let's confirm your real call volume, lead value, and close rate on a 15-minute call — if the numbers support it, we'll build the plan; if they don't, we'll tell you.`,
      terms: PROPOSAL_TERMS,
      guarantee: GUARANTEE,
      cta: `Book a 15-minute validation call and we'll pressure-test these numbers against ${biz}'s reality — no obligation.`,
      netGain: 0,
    };
  }

  const opportunityStatement =
    `We modeled ${biz}${cityRef} against our automation systems using conservative, published benchmarks and ${biz}'s own numbers. ` +
    `We recommend only the systems that clearly pay for themselves — at least ${MIN_ROI_MULTIPLE}× monthly return with payback under ${MAX_PAYBACK_MONTHS} months. ` +
    `The ${solutions.length} below are projected to add about ${usd(totals.monthlyImpact)}/month against ${usd(totals.monthly)}/month in cost — a net gain of about ${usd(totals.monthlyNet)}/month.`;

  const usedIssues = new Set();
  const problemSolution = solutions.map(s => {
    const fresh = s.addressedWeaknesses.find(w => !usedIssues.has(w.issue));
    if (fresh) usedIssues.add(fresh.issue);
    return {
      problem: fresh ? fresh.issue : s.problem,
      evidence: fresh ? fresh.evidence : "",
      solution: s.consumerName,
      impact: `${usd(s.monthlyImpact)}/mo · pays back in ${s.paybackText}`,
    };
  });

  const recommendation = bundle
    ? `Start with the ${bundle.name} — ${bundle.present.length} systems packaged for ${usd(bundle.setup)} setup + ${usd(bundle.monthly)}/month` +
      `${bundle.savings > 0 ? `, saving ${biz} ${usd(bundle.savings)} vs. à la carte` : ""}. It's the fastest path to the ${usd(totals.monthlyNet)}/month net gain modeled below.`
    : `Deploy the ${solutions.length} systems below, fastest-payback first. Combined, they're modeled to net ${biz} about ${usd(totals.monthlyNet)}/month after all costs.`;

  return { opportunityStatement, problemSolution, recommendation, terms: PROPOSAL_TERMS, guarantee: GUARANTEE, cta: `Reply or book a 15-minute kickoff and we'll have ${biz}'s first system live within a week.`, netGain: totals.monthlyNet };
}

const PROPOSAL_TERMS = [
  "Done-for-you build and configuration — your team touches nothing.",
  "Setup is a one-time fee; the monthly retainer covers hosting, monitoring, message/API costs and ongoing optimization.",
  "Most systems are live within 7 days of kickoff (premium voice builds, 3–5 working days).",
  "Month-to-month after launch — no long-term contract, cancel anytime.",
  "Every figure is modeled from conservative, published benchmarks and confirmed against your real numbers on the kickoff call.",
];
const GUARANTEE = "30-day results check-in on every system. If an automation isn't performing, we fix it at no charge — we don't consider the project done until it's producing.";

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
export function generateRoadmap(report, { maxRecommended = 3 } = {}) {
  if (!report) return null;

  const econ = deriveEconomics(report);
  const weaknesses = extractWeaknesses(report);

  // Model + classify every catalog system for THIS business.
  const all = CATALOG.map(service => {
    const im = modelImpact(service, econ);
    const ec = economicsFor(service, im.monthlyImpact);
    const rel = relevanceOf(service, report, weaknesses);
    const passesGate = im.confidence !== "low"
      && ec.monthlyImpact >= MIN_ROI_MULTIPLE * service.monthly
      && ec.paybackMonths != null && ec.paybackMonths < MAX_PAYBACK_MONTHS;
    const status = im.confidence === "low" ? "validate" : passesGate ? "recommended" : "future";
    return {
      id: service.id, service, ...ec, ...im,
      effort: service.effort, relevanceScore: rel.score, addressed: rel.addressed,
      relevant: rel.relevant, status, impactNote: im.note, ttv: im.ttv,
      phase: phaseKeyFor(service),
    };
  });

  // Only systems that are actually relevant to this business are ever shown.
  const relevant = all.filter(s => s.relevant);

  const recommendedAll = relevant.filter(s => s.status === "recommended")
    .map(s => ({ ...s, _c: compositeScore(s) }))
    .sort((a, b) => b._c - a._c);

  const top = recommendedAll.slice(0, maxRecommended);
  const additional = recommendedAll.slice(maxRecommended);
  const future = relevant.filter(s => s.status === "future").sort((a, b) => b.monthlyImpact - a.monthlyImpact).slice(0, 4);
  const validate = relevant.filter(s => s.status === "validate").sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 3);

  const solutions = top.map(solutionShape);
  const hasRecommendations = solutions.length > 0;

  // Totals over the RECOMMENDED set only — every figure is net-positive by construction.
  const totals = solutions.reduce((t, s) => ({
    setup: t.setup + s.setup, monthly: t.monthly + s.monthly,
    monthlyImpact: t.monthlyImpact + s.monthlyImpact, hoursPerWeek: t.hoursPerWeek + s.hoursPerWeek,
  }), { setup: 0, monthly: 0, monthlyImpact: 0, hoursPerWeek: 0 });
  totals.monthlyNet = totals.monthlyImpact - totals.monthly;
  totals.annualImpact = totals.monthlyImpact * 12;
  totals.firstYearCost = totals.setup + totals.monthly * 12;
  totals.firstYearNet = totals.annualImpact - totals.firstYearCost;
  totals.roiMultiple = totals.firstYearCost > 0 ? round1(totals.annualImpact / totals.firstYearCost) : 0;
  totals.paybackMonths = totals.monthlyNet > 0 ? round1(totals.setup / totals.monthlyNet) : null;
  totals.paybackText = paybackLabel(totals.paybackMonths);

  const roadmap = { phases: PHASES.map(p => ({ ...p, services: solutions.filter(s => s.phase === p.key).map(s => s.id) })).filter(p => p.services.length) };
  const bundle = hasRecommendations ? pickBundle(solutions.map(s => s.id), solutions) : null;
  const proposal = buildProposal(report, { solutions, totals, bundle, hasRecommendations });

  return {
    generatedAt: new Date().toISOString(),
    auditId: report.id || null,
    business: { name: report.businessName, industry: report.industry, city: report.city || "", goal: report.goal || "", website: report.website || "", siteRef: report.siteRef || report.website || "" },
    source: {
      overallScore: report.overallScore, leadScore: report.leadScore, websiteScore: report.websiteScore,
      monthlyLeak: hasRecommendations ? `${usd(totals.monthlyImpact)}/month` : "—",
      annualLeak: hasRecommendations ? `${usd(totals.annualImpact)}/year` : "—",
    },
    economics: {
      industry: econ.industry, monthlyJobs: Math.round(econ.M), monthlyLeads: Math.round(econ.L),
      customerValue: econ.LV, avgJobValue: econ.avgJob, closeRate: Math.round(econ.closeRate * 100),
    },
    assumptions: report.assumptions || null,
    weaknesses,
    solutions,                              // the recommended TOP 3 (all pass the ROI gate)
    additionalOpportunities: additional.map(solutionShape),
    futureOpportunities: future.map(futureShape),
    validateOpportunities: validate.map(futureShape),
    hasRecommendations,
    totals, roadmap, bundle, proposal,
  };
}
