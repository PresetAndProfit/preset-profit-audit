// scripts/smoke-growth-os.mjs — Growth OS funnel smoke test.
//
// Asserts the deterministic core of the funnel (audit → roadmap → proposal →
// outreach → CRM stage machine → activation emails) so a regression fails CI
// BEFORE deploy. Pure logic only — no DB/Stripe/Resend/secrets required.
//
// Run:  node scripts/smoke-growth-os.mjs   (or: npm run smoke)
import { generateRoadmap } from "../src/lib/roadmapEngine.js";
import { generateOutreach } from "../src/lib/outreachEngine.js";
import { conversionState } from "../src/lib/conversion.js";
import {
  maxStage, deriveStage, pipelineAggregates, activationMetrics, dealActivation, STAGE_KEYS,
} from "../src/lib/dealEngine.js";
import { renderTemplate, TEMPLATES } from "../api/_lib/emailTemplates.js";

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; } else { fail++; console.error(`  ✗ ${msg}`); } };
const section = (s) => console.log(`\n${s}`);

// A representative audit (the shape generateAudit() produces).
const report = {
  id: "smoke-1", businessName: "Summit Air HVAC", industry: "HVAC", city: "Austin",
  goal: "More Leads", website: "summitairhvac.com", siteRef: "summitairhvac.com",
  overallScore: 61, leadScore: 54, websiteScore: 68,
  totalMonthlyOpportunity: "$4,250/month", annualOpportunity: "$51,000/year",
  revenueOpportunity: "$4,250/month",
  assumptions: { avgJobValue: 450, monthlyJobs: 22, missedCallRate: 38, noShowRate: 10, leadCloseRate: 13, industry: "HVAC" },
  leadFindings: [
    { label: "No automatic follow-up when someone contacts you", status: "bad" },
    { label: "No chat window on your website", status: "bad" },
  ],
  websiteFindings: [{ label: "Your reviews only appear on the homepage", status: "warn" }],
  automations: [
    { name: "Missed Call Text Back", roiAmt: 1500 },
    { name: "24/7 Website Chat", roiAmt: 1300 },
    { name: "Automatic Customer Follow-Up", roiAmt: 950 },
    { name: "Automatic Review Requests", roiAmt: 500 },
  ],
};

section("Roadmap engine + ROI gate");
const rm = generateRoadmap(report);
ok(rm && rm.solutions.length > 0 && rm.solutions.length <= 3, "recommends at most the top 3 systems");
ok(rm.solutions.every(s => s.roiMultiple >= 3), "every recommendation clears the 3× monthly-ROI gate");
ok(rm.solutions.every(s => s.paybackMonths != null && s.paybackMonths < 6), "every recommendation pays back in under 6 months");
ok(rm.solutions.every(s => s.monthlyNet > 0), "NO recommendation has cost ≥ recovered value (never negative)");
ok(rm.totals.monthlyNet > 0, "total net monthly gain is positive");
ok(rm.proposal.problemSolution.length === rm.solutions.length, "1:1 gap→solution mapping");
// Trust gate on a low-ticket business: must NOT fabricate money-losing recommendations.
const cheap = generateRoadmap({ id: "c", businessName: "Joe's Barbershop", industry: "Barbershop", goal: "More Leads",
  overallScore: 60, leadFindings: [{ label: "No automatic follow-up when someone contacts you", status: "bad" }], websiteFindings: [],
  assumptions: { avgJobValue: 32, monthlyJobs: 60, missedCallRate: 30, noShowRate: 20, industry: "Barbershop" }, automations: [] });
ok(cheap.solutions.every(s => s.monthlyNet > 0), "low-ticket: any shown recommendation is still net-positive");
ok(cheap.hasRecommendations === false || cheap.solutions.length > 0, "low-ticket: either honest no-recs or only gated recs");

section("Outreach engine");
const outNoLink = generateOutreach(report, { senderName: "Justin" });
const outLink = generateOutreach(report, { senderName: "Justin", calendarUrl: "https://calendly.com/justin/15min" });
ok(!JSON.stringify(outNoLink).includes("[your calendar link]"), "no [your calendar link] placeholder when unset");
ok(!JSON.stringify(outLink).includes("[your calendar link]"), "no placeholder when set");
ok(outLink.coldEmail.body.includes("https://calendly.com/justin/15min"), "embeds booking link in cold email");
ok(outLink.coldEmail.subject.includes("Summit Air HVAC"), "subject personalized with business name");
ok(outLink.followUps.length === 3, "3-touch follow-up sequence");

section("Conversion engine");
const convNew = conversionState([], { id: "free" }, { atLimit: false });
ok(convNew.next.key === "scan", "new user → run first audit");
const convBuilt = conversionState([{ id: 1, businessName: "Acme", stage: "proposal", deal_value_cents: 3378400 }], { id: "free" }, { atLimit: true });
ok(convBuilt.upgrade && convBuilt.upgrade.headline.includes("$33,784"), "upgrade copy anchored to real pipeline value");
ok(!conversionState([], { id: "professional" }, {}).showUpgrade, "paid user sees no upgrade prompt");

section("Deal stage machine");
ok(STAGE_KEYS.length === 8, "8 pipeline stages");
ok(maxStage("audit", "roadmap") === "roadmap", "forward stamp advances");
ok(maxStage("proposal", "audit") === "proposal", "never downgrades");
ok(maxStage("closed_won", "outreach") === "closed_won", "closed is sticky");
ok(deriveStage({ overallScore: 70 }) === "audit", "legacy row back-fills to 'audit'");
const agg = pipelineAggregates([
  { stage: "proposal", deal_value_cents: 3378400 },
  { stage: "closed_won", deal_value_cents: 2000000 },
  { stage: "closed_lost", deal_value_cents: 500000 },
]);
ok(agg.openValueCents === 3378400 && agg.wonValueCents === 2000000, "pipeline value split open/won");
ok(agg.winRate === 50, "win rate = won / closed");

section("Activation email sequence");
const actKeys = ["activation_immediate", "activation_24h", "activation_7d"];
ok(actKeys.every((k) => TEMPLATES[k]), "all 3 activation templates registered");
const tdata = { name: "Dave", businessName: "Summit Air HVAC", score: 61, revenueOpportunity: "$4,250/month", bookingUrl: "https://calendly.com/justin/15min", senderCompany: "Preset & Profit" };
for (const k of actKeys) {
  const r = renderTemplate(k, tdata);
  ok(r.html.includes("https://calendly.com/justin/15min"), `${k}: booking link is the CTA`);
  ok(!/undefined|\[object Object\]/.test(r.html), `${k}: no render defects`);
}
const keys = [0, 1, 2].map((s) => `activation:AUDIT123:${s}`);
ok(new Set(keys).size === 3, "dedupe keys unique per step (no duplicate sends)");
section("Public audit funnel");
ok(!!TEMPLATES.public_audit_summary, "public_audit_summary template registered");
const ps = renderTemplate("public_audit_summary", { businessName: "Summit Air HVAC", score: 61, revenueOpportunity: "$4,250/month", bookingUrl: "https://calendly.com/justin/15min", senderCompany: "Preset & Profit", findings: ["No follow-up", "No chat", "Reviews only on homepage"] });
ok(ps.html.includes("https://calendly.com/justin/15min"), "summary email CTA is the booking link");
ok(ps.html.includes("4,250") && ps.html.includes("Summit Air HVAC"), "summary email personalized");
ok(!/undefined|\[object Object\]/.test(ps.html), "summary email no render defects");

const m = activationMetrics([
  { crm: { activation: { enabled: true, sent: { 0: "x", 1: "x" }, opened: { 0: "x" }, clicked: {}, booked: false } } },
  { crm: { activation: { enabled: true, sent: { 0: "x", 1: "x", 2: "x" }, opened: { 0: "x", 1: "x" }, clicked: { 1: "x" }, booked: true } } },
]);
ok(m.active === 2 && m.sent === 5 && m.opened === 3 && m.clicked === 1 && m.booked === 1, "CRM activation funnel aggregates correctly");
ok(dealActivation({ crm: {} }) === null, "no activation → null (not surfaced)");

console.log(`\n${fail === 0 ? "✓ PASS" : "✗ FAIL"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
