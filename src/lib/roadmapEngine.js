// ─────────────────────────────────────────────────────────────────────────────
// roadmapEngine.js
// THE CONVERSION LAYER. Takes a completed audit `report` and produces an
// "AI Automation Roadmap" — the document that turns a free diagnosis into a
// quoted, sequenced, ROI-justified proposal and naturally converts audit users
// into automation clients.
//
// Pure + deterministic: same report in → same roadmap out. No network, no React,
// no persistence (the roadmap is always re-derivable from the audit, so it costs
// zero serverless functions — see [[vercel-function-budget]]).
//
// Pipeline:
//   1. Read the audit's weaknesses (findings + the 4 modeled automations).
//   2. Score every priced catalog service against those weaknesses + goal + industry.
//   3. Select the services that actually address this business.
//   4. Ground each service's monthly revenue impact in the audit's own roiAmt
//      where a soft-automation maps; otherwise model it from the audit assumptions.
//   5. Compute investment vs. return: setup, retainer, payback, first-year ROI.
//   6. Sequence into a now/next/later roadmap.
//   7. Pick the best-value bundle.
//   8. Assemble the client-facing proposal copy.
// ─────────────────────────────────────────────────────────────────────────────

import { CATALOG, CATALOG_BY_ID, BUNDLES } from "./automationCatalog.js";

// ── money helpers ────────────────────────────────────────────────────────────
const r50 = n => Math.max(50, Math.round(n / 50) * 50);
export const usd = n => `$${Math.round(Number(n) || 0).toLocaleString()}`;
const round1 = n => Math.round(n * 10) / 10;

// ── weakness extraction ──────────────────────────────────────────────────────
// The audit already sorts findings bad→warn and exposes a `weaknesses` summary.
// We normalise everything into one list the matcher can score against.
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

// ── per-service revenue impact ───────────────────────────────────────────────
// Ground the quote in the audit: sum the modeled roiAmt of any audit automation
// that maps onto this service. If none maps, fall back to a conservative model
// derived from the audit's own assumptions so every line still has a number.
function monthlyImpactFor(service, report) {
  const audited = (report.automations || []).filter(a => service.mapsFrom.includes(a.name));
  if (audited.length) {
    return { amount: audited.reduce((s, a) => s + (a.roiAmt || 0), 0), grounded: true, from: audited.map(a => a.name) };
  }
  const a = report.assumptions || {};
  const jobs = a.monthlyJobs || 20;
  const value = a.avgJobValue || 150;
  return { amount: r50(jobs * value * service.liftFactor), grounded: false, from: [] };
}

// ── scoring ──────────────────────────────────────────────────────────────────
// How strongly does this priced service belong in THIS business's roadmap?
function scoreService(service, { report, weaknesses, impact }) {
  let score = 0;
  const addressed = [];

  // The strongest signal: the audit's own engine already picked an automation
  // that maps to this service. That opportunity is modeled, not guessed.
  if (impact.grounded) score += 50;

  // Weakness signal matching — count the findings this service actually fixes.
  for (const w of weaknesses) {
    if (service.signals.some(sig => w.label.includes(sig))) {
      score += w.weight * 6;
      addressed.push(w);
    }
  }

  if (service.goalFit.includes(report.goal)) score += 12;
  if (service.idealIndustries.includes(report.industry)) score += 8;

  // Size of the prize nudges ties (normalised so it can't dominate the signal).
  score += Math.min(10, impact.amount / 250);

  return { score, addressed };
}

// ── per-service economics ────────────────────────────────────────────────────
function economicsFor(service, monthlyImpact) {
  const setup = service.setupLow;            // quote the "starting from" figure
  const monthly = service.monthly;
  const monthlyNet = monthlyImpact - monthly;
  const firstYearReturn = monthlyImpact * 12;
  const firstYearCost = setup + monthly * 12;
  const firstYearNet = firstYearReturn - firstYearCost;
  const roiMultiple = firstYearCost > 0 ? round1(firstYearReturn / firstYearCost) : 0;
  // Months to earn back the one-time setup out of the NET monthly gain.
  const paybackMonths = monthlyNet > 0 ? round1(setup / monthlyNet) : null;
  return { setup, monthly, monthlyImpact, monthlyNet, firstYearReturn, firstYearCost, firstYearNet, roiMultiple, paybackMonths };
}

// ── roadmap sequencing ───────────────────────────────────────────────────────
// Three honest phases. We lead with the fast, high-impact capture systems
// (cash this month), then conversion/follow-up, then the premium/retention plays.
const PHASES = [
  { key: "now",   title: "Phase 1 — Launch", timeframe: "Week 1", objective: "Stop the bleeding immediately. Fast-to-deploy systems that recover revenue you're already losing this month." },
  { key: "next",  title: "Phase 2 — Convert", timeframe: "Weeks 2–4", objective: "Turn the captured demand into booked, paying jobs with relentless automated follow-up." },
  { key: "later", title: "Phase 3 — Compound", timeframe: "Month 2+", objective: "Maximize lifetime value and scale — reputation, reactivation and premium 24/7 coverage." },
];

function phaseKeyFor(service, isGrounded) {
  // Grounded, low-effort capture/convert work leads; premium/retain trails.
  if (service.effort === "high") return "later";
  if (service.defaultPhase === 1 && (isGrounded || service.effort === "low")) return "now";
  if (service.defaultPhase === 3) return "later";
  return "next";
}

// ── bundle selection ─────────────────────────────────────────────────────────
function pickBundle(selectedIds, solutions) {
  const set = new Set(selectedIds);
  let best = null;
  for (const b of BUNDLES) {
    const present = b.members.filter(id => set.has(id));
    if (present.length < b.triggerMin) continue;
    // Compare the bundle price to à-la-carte for the members in this roadmap.
    const alacarteSetup = present.reduce((s, id) => s + CATALOG_BY_ID[id].setupLow, 0);
    const alacarteMonthly = present.reduce((s, id) => s + CATALOG_BY_ID[id].monthly, 0);
    const savings = (alacarteSetup + alacarteMonthly) - (b.setup + b.monthly);
    const candidate = { ...b, present, alacarteSetup, alacarteMonthly, savings, coverage: present.length };
    if (!best || candidate.coverage > best.coverage || (candidate.coverage === best.coverage && candidate.savings > best.savings)) {
      best = candidate;
    }
  }
  if (!best) return null;
  // Combined monthly impact of the bundle's covered services (for the headline).
  best.monthlyImpact = best.present.reduce((s, id) => {
    const sol = solutions.find(x => x.id === id);
    return s + (sol ? sol.monthlyImpact : 0);
  }, 0);
  best.roiMultiple = best.firstYearCost > 0 ? round1((best.monthlyImpact * 12) / (best.setup + best.monthly * 12)) : 0;
  return best;
}

// ── proposal copy ────────────────────────────────────────────────────────────
function buildProposal(report, { solutions, totals, bundle }) {
  const biz = report.businessName;
  const cityRef = report.city ? ` in ${report.city}` : "";
  const monthlyLeak = report.totalMonthlyOpportunity || usd(totals.monthlyImpact) + "/month";

  const opportunityStatement =
    `Our audit of ${biz}${cityRef} identified roughly ${monthlyLeak} in revenue leaking out of the business every month — ` +
    `not from a lack of demand, but from leads and customers slipping through the cracks before anyone follows up. ` +
    `This proposal lays out the exact automation systems that close those gaps, what each one returns, and the order to deploy them.`;

  // Problem → solution → impact rows, the heart of the sales narrative. Each
  // weakness is claimed by ONE solution (its highest-impact match, since
  // `solutions` is impact-sorted) so no gap repeats across rows and the mapping
  // reads as a clean 1:1 prescription rather than padding. When a solution's
  // gaps are all already claimed, we fall back to its own problem statement.
  const usedIssues = new Set();
  const problemSolution = solutions.map(s => {
    const fresh = s.addressedWeaknesses.find(w => !usedIssues.has(w.issue));
    if (fresh) usedIssues.add(fresh.issue);
    return {
      problem: fresh ? fresh.issue : s.problem,
      evidence: fresh ? fresh.evidence : "",
      solution: s.consumerName,
      impact: usd(s.monthlyImpact) + "/mo",
    };
  });

  const recommendation = bundle
    ? `We recommend starting with the ${bundle.name} — ${bundle.present.length} systems packaged together for ${usd(bundle.setup)} setup and ${usd(bundle.monthly)}/month, ` +
      `${bundle.savings > 0 ? `saving ${biz} ${usd(bundle.savings)} versus buying them separately` : "the fastest path to results"}. ` +
      `It's the highest-leverage place to start for ${biz}.`
    : `We recommend deploying the ${solutions.length} systems below in the sequenced roadmap that follows — fastest-payback systems first, so ${biz} sees recovered revenue before the next invoice.`;

  const terms = [
    "Done-for-you build and configuration — your team touches nothing.",
    "Setup is a one-time fee; the monthly retainer covers hosting, monitoring, message/API costs and ongoing optimization.",
    "Most systems are live within 7 days of kickoff (premium voice builds, 3–5 working days).",
    "Month-to-month after launch — no long-term contract, cancel anytime.",
    "All numbers are modeled from published industry benchmarks and confirmed against your real figures on the kickoff call.",
  ];

  const guarantee =
    "30-day results check-in on every system. If an automation isn't performing, we fix it at no charge — we don't consider the project done until it's producing.";

  const cta = `Reply to this proposal or book a 30-minute kickoff call and we'll have ${biz}'s first system live within a week.`;

  return { opportunityStatement, problemSolution, recommendation, terms, guarantee, cta };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
export function generateRoadmap(report, { maxServices = 6, minServices = 3 } = {}) {
  if (!report) return null;

  const weaknesses = extractWeaknesses(report);

  // Score every catalog service for this business.
  const scored = CATALOG.map(service => {
    const impact = monthlyImpactFor(service, report);
    const { score, addressed } = scoreService(service, { report, weaknesses, impact });
    return { service, impact, score, addressed };
  });

  // Selection: always include the grounded (audit-modeled) services — those are
  // the opportunities the audit already proved. Fill the rest with the highest-
  // scoring relevant additions, capped at maxServices, floored at minServices.
  const grounded = scored.filter(s => s.impact.grounded);
  const rest = scored
    .filter(s => !s.impact.grounded)
    .sort((a, b) => b.score - a.score);

  const chosen = [...grounded];
  for (const s of rest) {
    if (chosen.length >= maxServices) break;
    // Only add an un-grounded service if it clearly fits (addresses a weakness,
    // or matches both goal and industry).
    const fits = s.addressed.length > 0 || s.score >= 18;
    if (fits || chosen.length < minServices) chosen.push(s);
  }
  // Last-resort floor: if the audit was unusually clean, top up by raw score.
  if (chosen.length < minServices) {
    for (const s of rest) {
      if (chosen.length >= minServices) break;
      if (!chosen.includes(s)) chosen.push(s);
    }
  }

  // Order the selected set by monthly impact (biggest prize first).
  chosen.sort((a, b) => b.impact.amount - a.impact.amount);

  // Build the full solution objects (economics + phase + addressed weaknesses).
  const solutions = chosen.map(({ service, impact, addressed }) => {
    const econ = economicsFor(service, impact.amount);
    return {
      id: service.id,
      num: service.num,
      name: service.name,
      consumerName: service.consumerName,
      category: service.category,
      problem: service.problem,
      solution: service.solution,
      howItWorks: service.howItWorks,
      buildLabel: service.buildLabel,
      effort: service.effort,
      hoursPerWeek: service.hoursPerWeek,
      grounded: impact.grounded,
      groundedFrom: impact.from,
      addressedWeaknesses: addressed.map(w => ({ issue: w.issue, severity: w.severity, evidence: w.evidence })),
      phase: phaseKeyFor(service, impact.grounded),
      ...econ,
    };
  });

  // Roadmap totals.
  const totals = solutions.reduce((t, s) => ({
    setup: t.setup + s.setup,
    monthly: t.monthly + s.monthly,
    monthlyImpact: t.monthlyImpact + s.monthlyImpact,
    hoursPerWeek: t.hoursPerWeek + s.hoursPerWeek,
  }), { setup: 0, monthly: 0, monthlyImpact: 0, hoursPerWeek: 0 });
  totals.annualImpact = totals.monthlyImpact * 12;
  totals.firstYearCost = totals.setup + totals.monthly * 12;
  totals.firstYearNet = totals.annualImpact - totals.firstYearCost;
  totals.roiMultiple = totals.firstYearCost > 0 ? round1(totals.annualImpact / totals.firstYearCost) : 0;
  const blendedNet = totals.monthlyImpact - totals.monthly;
  totals.paybackMonths = blendedNet > 0 ? round1(totals.setup / blendedNet) : null;

  // Phased roadmap.
  const roadmap = {
    phases: PHASES.map(p => ({
      ...p,
      services: solutions.filter(s => s.phase === p.key).map(s => s.id),
    })).filter(p => p.services.length),
  };

  // Best-value bundle for the chosen set.
  const bundle = pickBundle(solutions.map(s => s.id), solutions);
  if (bundle) {
    bundle.firstYearCost = bundle.setup + bundle.monthly * 12;
    bundle.roiMultiple = bundle.firstYearCost > 0 ? round1((bundle.monthlyImpact * 12) / bundle.firstYearCost) : 0;
  }

  const proposal = buildProposal(report, { solutions, totals, bundle });

  return {
    generatedAt: new Date().toISOString(),
    auditId: report.id || null,
    business: {
      name: report.businessName,
      industry: report.industry,
      city: report.city || "",
      goal: report.goal || "",
      website: report.website || "",
      siteRef: report.siteRef || report.website || "",
    },
    source: {
      overallScore: report.overallScore,
      leadScore: report.leadScore,
      websiteScore: report.websiteScore,
      monthlyLeak: report.totalMonthlyOpportunity || usd(totals.monthlyImpact) + "/month",
      annualLeak: report.annualOpportunity || usd(totals.annualImpact) + "/year",
    },
    assumptions: report.assumptions || null,
    weaknesses,
    solutions,
    totals,
    roadmap,
    bundle,
    proposal,
  };
}
