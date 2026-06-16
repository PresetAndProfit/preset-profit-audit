// api/_lib/agents/synthesis.js — V2 Phase 7: the SYNTHESIS AGENT (capstone).
//
// Consumes every prior stage — BIP (spine) + growth-driver weighting + the
// consultant's findings/revenue-leaks/automations + competitor intelligence +
// the ranked sales bottlenecks — and produces a GROWTH DIAGNOSIS, not an audit:
//
//   1 Executive Summary            5 Highest-ROI Improvements
//   2 What Is Limiting Growth      6 Recommended Automation Opportunities
//   3 Top Revenue Leaks            7 90-Day Growth Plan
//   4 Top Competitive Disadvantages 8 Consultant Verdict
//
// DESIGN: the STRUCTURED sections (3,4,5,6,7) are assembled DETERMINISTICALLY
// from the evidence pack, ranked by the same growth-driver weighting that runs
// the whole system — so the ranking is grounded and reproducible. The AI writes
// only the consultant-VOICE sections (1,2,8) over that pack, with a template
// fallback. This keeps the diagnosis ranked by business impact, never a list of
// generic observations.
import Anthropic from "@anthropic-ai/sdk";
import { getBlendedFramework, getFramework } from "../../../src/lib/frameworks/index.js";
import { buildForecast } from "../../../src/lib/forecastEngine.js";

const MODEL = process.env.SYNTHESIS_MODEL || "claude-opus-4-8";
const rawKey = process.env.ANTHROPIC_API_KEY;
const aiOn = !!(rawKey && rawKey.trim());
let _client = null;
const client = () => (_client || (_client = new Anthropic({ apiKey: (rawKey || "").trim() })));

function resolveFramework(profile) {
  if (profile?.industryCandidates?.length) return getBlendedFramework(profile.industryCandidates);
  return getFramework(profile?.userIndustryHint || profile?.industry);
}

// Map a competitor gap dimension to the weight of the growth driver it harms.
function driverWeightFor(keywords, drivers) {
  let best = 0;
  for (const d of drivers || []) {
    const n = d.driver.toLowerCase();
    if (keywords.some((k) => n.includes(k))) best = Math.max(best, d.weight);
  }
  return best;
}

// PURE: merge + rank every constraint into one evidence pack. Tested offline.
export function buildEvidencePack({ profile, framework, consultant, competitor, sales }) {
  const weighting = framework?.growthDrivers || [];
  const salesB = sales?.bottlenecks || [];
  const leaks = consultant?.revenueLeaks || [];

  const constraints = [];
  for (const b of salesB) {
    constraints.push({ source: "sales", title: b.label, driver: b.driver, impact: b.impactScore, consequence: b.consequence, fix: b.canonical, effort: b.severity >= 3 ? "medium" : "low", stage: b.stage });
  }
  for (const l of leaks) {
    const hi = l.recovery?.high || 0;
    constraints.push({ source: "leak", title: l.title, driver: "revenue leak", impact: Math.min(95, Math.max(20, Math.round(hi / 60))), consequence: l.recommendation || l.whatsMissing || "", dollars: l.recovery || null, fix: null, effort: "medium" });
  }
  // Competitive gaps become constraints too, weighted by the driver they harm.
  const gaps = (competitor?.gaps || []).filter((g) => g.status === "behind");
  for (const g of gaps) {
    const w = driverWeightFor(g.dimension === "rating" ? ["rating", "reviews", "trust", "reputation"] : ["reviews", "trust", "reputation"], weighting) || 18;
    constraints.push({ source: "competitor", title: `Competitive ${g.dimension} gap`, driver: "Reviews & Reputation", impact: Math.round(w * 1.4), consequence: g.summary, fix: g.dimension === "reviews" ? "Automatic Review Requests" : "Automatic Review Requests", effort: "low" });
  }

  // Rank by impact, dedupe by title.
  constraints.sort((a, b) => b.impact - a.impact);
  const seen = new Set();
  const ranked = [];
  for (const c of constraints) {
    const k = c.title.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    ranked.push(c);
  }

  // Canonical automation set (sales + consultant plan), deduped.
  const automations = [];
  const addAuto = (name, solves) => { if (name && !automations.find((a) => a.name === name)) automations.push({ name, solves }); };
  for (const b of salesB) if (b.canonical) addAuto(b.canonical, b.label);
  for (const a of consultant?.automationPlan?.automations || []) if (a.canonicalService) addAuto(a.canonicalService, a.linkedFindingTitle || a.problem || "");

  return {
    businessType: profile?.businessType?.label || profile?.industry || "this business",
    industry: profile?.industry || null,
    classification: profile?.classification || null,
    leadValue: profile?.leadValue || null,
    weighting,
    rankedConstraints: ranked,
    competitor: competitor && competitor.available ? competitor : null,
    competitiveGaps: gaps,
    automations,
    leakSummary: consultant?.revenueLeakSummary || null,
  };
}

// PURE: assemble the structured (deterministic, weight-ranked) diagnosis sections.
export function assembleStructuredDiagnosis(pack) {
  const topRevenueLeaks = pack.rankedConstraints
    .filter((c) => c.source === "sales" || c.source === "leak")
    .slice(0, 5)
    .map((c) => ({ title: c.title, impact: c.impact, consequence: c.consequence, dollars: c.dollars || null, growthDriver: c.driver }));

  const topCompetitiveDisadvantages = pack.competitiveGaps.length
    ? pack.competitiveGaps.map((g) => ({ dimension: g.dimension, summary: g.summary, source: g.source || "google_places" }))
    : [{ note: pack.competitor ? "No decisive competitive gap detected." : "Competitor benchmarking unavailable (no local data source configured)." }];

  const highestRoiImprovements = pack.rankedConstraints
    .filter((c) => c.fix || c.source === "leak")
    .slice(0, 5)
    .map((c, i) => ({
      rank: i + 1,
      action: c.fix ? `Deploy ${c.fix}` : `Close: ${c.title}`,
      canonical: c.fix || null,
      addresses: c.title,
      rationale: c.consequence,
      growthDriver: c.driver,
      impactScore: c.impact,
      effort: c.effort,
    }));

  // 90-day plan: sequence the ROI improvements by impact, low-effort-first within tier.
  const ordered = [...highestRoiImprovements];
  const ninetyDayPlan = {
    now: ordered.slice(0, 2).map((i) => i.action),
    next: ordered.slice(2, 4).map((i) => i.action),
    later: ordered.slice(4).map((i) => i.action),
  };

  return {
    topRevenueLeaks,
    topCompetitiveDisadvantages,
    highestRoiImprovements,
    automationOpportunities: pack.automations,
    ninetyDayPlan,
  };
}

// Deterministic consultant-voice fallback for sections 1, 2, 8.
function templateVoice(pack, structured) {
  const top = structured.highestRoiImprovements[0];
  const bt = pack.businessType;
  const lead = pack.leadValue?.tier || "medium";
  const rationale = (top ? top.rationale : "the current process leaks qualified demand").replace(/[.\s]+$/, "");
  const executiveSummary = `${bt} is held back less by a long list of small flaws than by a few high-leverage gaps. The single highest-ROI move right now is to ${top ? top.action.toLowerCase() : "tighten the sales process"} — ${rationale}. With ${lead}-value customers, every leaked lead is expensive, so the priorities below are ranked by likely revenue impact, not by what is easiest to fix.`;
  const whatIsLimitingGrowth = structured.highestRoiImprovements.slice(0, 3).map((i) => ({
    constraint: i.addresses,
    why: i.rationale,
    growthDriver: i.growthDriver,
  }));
  const consultantVerdict = `The fundamentals are workable; growth is constrained by ${structured.highestRoiImprovements.slice(0, 2).map((i) => i.addresses.toLowerCase()).join(" and ")}. Fix those first and the rest compounds. This is an execution gap, not a market problem.`;
  return { executiveSummary, whatIsLimitingGrowth, consultantVerdict };
}

async function narrate(pack, structured) {
  const drivers = pack.weighting.map((d) => `${d.driver} ${d.weight}%`).join(", ");
  const constraints = structured.highestRoiImprovements.map((i) => `  #${i.rank} ${i.addresses} — serves ${i.growthDriver}, impact ${i.impactScore}. ${i.rationale}`).join("\n");
  const comp = structured.topCompetitiveDisadvantages.map((g) => g.summary || g.note).filter(Boolean).join("; ");
  const system = `You are a senior business consultant (30+ years) writing the VOICE sections of a GROWTH DIAGNOSIS — not an audit. A business owner must finish it thinking "this consultant understands exactly how my business makes money."

RULES:
- Think like the OWNER: "what would I fix first to make more money?" Explain CONSEQUENCES, not observations.
- RESPECT the ranking and the growth-driver weighting provided — the priorities are already ordered by revenue impact for THIS industry. Do not elevate a low-impact item.
- Use ONLY the evidence provided. Invent no new numbers, competitors, or features. No hype, no emoji. Address the owner as "you".
Return ONLY JSON: {
  "executiveSummary": <3-5 sentences: what is limiting growth and the single highest-ROI next move>,
  "whatIsLimitingGrowth": [ { "constraint": <string>, "why": <revenue consequence>, "growthDriver": <string> } ],  // 2-4, worst-first
  "consultantVerdict": <2-3 sentences: the honest bottom line — is this an execution gap or a market problem, and what compounds if fixed>
}`;
  const lv = pack.leadValue || {};
  const user = [
    `BUSINESS: ${pack.businessType}${pack.industry ? ` (${pack.industry})` : ""}. Lead value: ${lv.tier || "medium"}${lv.perCustomerValueUsd ? ` (~$${lv.perCustomerValueUsd.toLocaleString()}/customer)` : ""}.`,
    `GROWTH-DRIVER WEIGHTING (rank by this): ${drivers}`,
    "",
    "RANKED GROWTH CONSTRAINTS (already prioritized by revenue impact — respect this order):",
    constraints,
    comp ? `\nCOMPETITIVE GAPS: ${comp}` : "",
  ].join("\n");

  const stream = client().messages.stream({
    model: MODEL, max_tokens: 1600,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: user }],
  });
  const res = await stream.finalMessage();
  const block = (res.content || []).find((b) => b.type === "text");
  let txt = (block?.text || "").trim();
  const fence = txt.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) txt = fence[1].trim();
  const a = txt.indexOf("{"), z = txt.lastIndexOf("}");
  if (a !== -1 && z > a) txt = txt.slice(a, z + 1);
  const p = JSON.parse(txt);
  return {
    executiveSummary: typeof p.executiveSummary === "string" ? p.executiveSummary : null,
    whatIsLimitingGrowth: Array.isArray(p.whatIsLimitingGrowth) ? p.whatIsLimitingGrowth.filter((x) => x && x.constraint) : null,
    consultantVerdict: typeof p.consultantVerdict === "string" ? p.consultantVerdict : null,
  };
}

// Orchestrate: pack → structured sections → consultant voice → Growth Diagnosis.
export async function runSynthesisAgent({ profile, consultant, competitor, sales }) {
  const framework = resolveFramework(profile);
  const pack = buildEvidencePack({ profile, framework, consultant, competitor, sales });
  const structured = assembleStructuredDiagnosis(pack);

  let voice = null;
  if (aiOn) {
    try { voice = await narrate(pack, structured); } catch (e) { console.error("[synthesis] narrate failed", e?.message || e); }
  }
  if (!voice || !voice.executiveSummary) voice = templateVoice(pack, structured);

  // Layer 5 — Outcome Forecasting (pure, deterministic). 30/90/12-month
  // trajectory per system + a portfolio revenue forecast anchored in the leaks.
  const forecast = buildForecast({ topRevenueLeaks: structured.topRevenueLeaks, recommendations: structured.highestRoiImprovements, leadValue: pack.leadValue });

  return {
    available: true,
    generatedBy: aiOn ? MODEL : "template",
    businessType: pack.businessType,
    weightingUsed: pack.weighting,
    forecast,
    // The 8 sections of the Growth Diagnosis, in order.
    executiveSummary: voice.executiveSummary,
    whatIsLimitingGrowth: voice.whatIsLimitingGrowth,
    topRevenueLeaks: structured.topRevenueLeaks,
    topCompetitiveDisadvantages: structured.topCompetitiveDisadvantages,
    highestRoiImprovements: structured.highestRoiImprovements,
    automationOpportunities: structured.automationOpportunities,
    ninetyDayPlan: structured.ninetyDayPlan,
    consultantVerdict: voice.consultantVerdict,
  };
}
