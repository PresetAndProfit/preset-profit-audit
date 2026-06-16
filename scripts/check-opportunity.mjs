// scripts/check-opportunity.mjs — V6 verification (offline, deterministic): the
// Opportunity Intelligence engine, scoring, campaign generation, department
// intelligence, next-best-action, marketplace packages, and adapters.
// Run: `node scripts/check-opportunity.mjs`.
import { detectOpportunities, surfacedOpportunities, topOpportunity } from "../src/lib/opportunity/opportunityEngine.js";
import { generateCampaign } from "../src/lib/opportunity/campaignGenerator.js";
import { departmentIntelligence, weakestDepartment, DEPARTMENTS } from "../src/lib/departmentEngine.js";
import { nextBestAction } from "../src/lib/nextBestAction.js";
import { DEPARTMENT_PACKAGES, packageForIndustry } from "../src/lib/departmentPackages.js";
import { ADAPTERS, adapterList, gatherExternalSignals } from "../src/lib/adapters/index.js";
import { buildPortfolioBriefing } from "../src/lib/chiefOfStaff.js";

let failures = 0;
const ok = (c, m) => { if (!c) { console.error("  ✗ " + m); failures++; } };

const ROOFER = {
  id: "r1", businessName: "Blue Ridge Roofing", industry: "Roofing", city: "Fishersville, VA", overallScore: 62,
  businessIntelligenceProfile: { industry: "Roofing", archetype: "quote_trades", leadValue: { tier: "high" } },
  competitorIntelligence: { metrics: { reviewLeader: 412, yourReviews: 38, rank: 4 } },
  salesIntelligence: { bottlenecks: [{ label: "No missed-call recovery", stage: "response", severity: 3, canonical: "Missed Call Text Back" }] },
  revenueLeakSummary: { totalHigh: 4200 },
  growthDiagnosis: { highestRoiImprovements: [{ rank: 1, action: "Deploy Missed Call Text Back", canonical: "Missed Call Text Back", addresses: "No missed-call recovery", rationale: "every unanswered call walks", impactScore: 84, growthDriver: "Estimate Conversion", effort: "medium" }], forecast: { portfolio: { m12: { low: 14700, high: 44100 } } }, topRevenueLeaks: [{ title: "Unrecovered calls", dollars: { low: 1400, high: 4200 } }] },
};

const REQUIRED_ALERT_KEYS = ["id", "title", "category", "industry", "applicableBusinessTypes", "triggerSignal", "whyItMatters", "estimatedImpact", "confidenceScore", "urgency", "recommendedActions", "recommendedWorkflow", "recommendedCampaign", "estimatedRevenueRange", "timeWindow", "requiredAssets", "implementationComplexity", "departmentOwner", "nextBestAction", "sourceSignals", "score", "tier"];

// 1. Opportunity detection (storm season → urgent storm inspection).
{
  const opps = detectOpportunities(ROOFER, { month: 6 });
  ok(opps.length >= 2, `opportunities: roofer produced ${opps.length} alerts`);
  const storm = opps.find((o) => o.recommendedCampaign === "storm_inspection");
  ok(storm && storm.tier === "urgent", "opportunities: storm inspection is urgent");
  ok(storm.departmentOwner === "Marketing" && storm.recommendedWorkflow === "Missed Call Text Back", "opportunities: department + workflow mapped");
  ok(REQUIRED_ALERT_KEYS.every((k) => k in storm), "opportunities: alert has all required fields");
  ok(storm.estimatedRevenueRange.high > storm.estimatedRevenueRange.low, "opportunities: revenue range scaled");
  ok(opps.some((o) => o.recommendedCampaign === "review_engine"), "opportunities: grounded competitor/review opportunity present");
}

// 2. Scoring tiers ranked.
{
  const opps = detectOpportunities(ROOFER, { month: 6 });
  ok(opps.every((o, i) => i === 0 || opps[i - 1].score >= o.score), "scoring: ranked by score desc");
  ok(surfacedOpportunities(ROOFER, { month: 6 }).every((o) => o.tier !== "ignore"), "scoring: surfaced drops ignore tier");
}

// 3. Campaign generation completeness (launch-ready, not fluff).
{
  const top = topOpportunity(ROOFER, { month: 6 });
  const camp = top.campaign || generateCampaign({ opportunity: top, audit: ROOFER });
  for (const k of ["campaignName", "offer", "facebookAd", "googleHeadlines", "instagramCaption", "smsBlast", "emailCampaign", "landingHeadline", "commercialScript", "reelScript", "cta", "budgetRange", "launchTimeline", "successMetrics", "recommendedWorkflowPairing"]) ok(camp[k], `campaign: has ${k}`);
  ok(camp.facebookAd.includes("Fishersville") || camp.facebookAd.includes("Blue Ridge"), "campaign: copy is business-specific, not generic");
  ok(camp.commercialScript.includes("[0–5s]"), "campaign: 30-sec script timestamped");
}

// 4. Department intelligence.
{
  const opps = detectOpportunities(ROOFER, { month: 6 });
  const depts = departmentIntelligence(ROOFER, opps);
  ok(depts.length === DEPARTMENTS.length && depts.length === 9, "departments: 9 departments");
  const rep = depts.find((d) => d.key === "reputation");
  ok(rep.detectedIssues.length > 0, "departments: reputation flags the review gap");
  const sales = depts.find((d) => d.key === "sales");
  ok(sales.detectedIssues.some((i) => /missed-call/i.test(i)) || sales.recommendedWorkflows.includes("Missed Call Text Back"), "departments: sales flags missed-call");
  ok(depts.find((d) => d.key === "operations").gated && depts.find((d) => d.key === "finance").gated, "departments: ops + finance marked gated (need integrations)");
  ok(weakestDepartment(depts), "departments: weakest department resolved");
}

// 5. Next Best Action.
{
  const nba = nextBestAction(ROOFER, surfacedOpportunities(ROOFER, { month: 6 }));
  ok(nba && nba.actionTitle, "nba: produces a single action");
  ok(["diagnosis", "opportunity"].includes(nba.source), "nba: sourced from diagnosis or opportunity");
  ok(nba.revenueRange && nba.timeToLaunch, "nba: carries revenue range + launch time");
}

// 6. Marketplace department packages.
{
  ok(DEPARTMENT_PACKAGES.length >= 6, "packages: ≥6 department packages");
  ok(DEPARTMENT_PACKAGES.every((p) => p.includedWorkflows.length && p.roiRange && p.outcome), "packages: each has workflows + roi + outcome");
  ok(packageForIndustry("Roofing").some((p) => p.key === "sales"), "packages: industry filter works");
}

// 7. Adapters (integration-ready, mocked → empty, never throw).
{
  ok(Object.keys(ADAPTERS).length >= 14, "adapters: ≥14 sources registered");
  ok(adapterList().every((a) => a.live === false), "adapters: all mocked (no live API)");
  const sigs = await gatherExternalSignals({ geo: "Fishersville" });
  ok(Array.isArray(sigs), "adapters: gatherExternalSignals returns array (mock)");
}

// 8. Chief of Staff portfolio briefing now carries the V6 sections.
{
  const b = buildPortfolioBriefing([ROOFER], { now: Date.parse("2026-06-15T00:00:00Z") });
  ok(Array.isArray(b.growthOpportunities) && b.growthOpportunities.length > 0, "briefing: growth opportunities");
  ok(Array.isArray(b.recommendedCampaigns), "briefing: recommended campaigns");
  ok(Array.isArray(b.sevenDayPlan), "briefing: 7-day plan");
  ok(b.nextBestAction && b.nextBestAction.actionTitle, "briefing: portfolio next best action");
  ok(Array.isArray(b.departmentNotes), "briefing: department notes");
}

if (failures) { console.error(`\nOPPORTUNITY CHECK FAILED: ${failures} issue(s).`); process.exit(1); }
console.log("✓ Opportunity Intelligence OK — detection, scoring, campaigns, departments, next-best-action, packages, adapters, and Chief-of-Staff synthesis verified.");
const top = topOpportunity(ROOFER, { month: 6 });
console.log(`\n  Top opportunity: ${top.title} [${top.tier}, score ${top.score}] → ${top.recommendedCampaign}`);
console.log(`  Revenue range: $${top.estimatedRevenueRange.low.toLocaleString()}–$${top.estimatedRevenueRange.high.toLocaleString()} · window ${top.timeWindow}`);
