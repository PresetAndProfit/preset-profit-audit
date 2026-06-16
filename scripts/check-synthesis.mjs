// scripts/check-synthesis.mjs — Phase 7 verification (offline, no network/AI):
// the evidence pack, the deterministic weight-ranked structured sections, and
// the template consultant voice. Run: `node scripts/check-synthesis.mjs`.
import { buildEvidencePack, assembleStructuredDiagnosis, runSynthesisAgent } from "../api/_lib/agents/synthesis.js";
import { computeSalesBottlenecks, resolveSalesFramework } from "../api/_lib/agents/salesIntel.js";

let failures = 0;
const ok = (cond, m) => { if (!cond) { console.error("  ✗ " + m); failures++; } };

const profile = {
  industryCandidates: [{ industry: "Roofing", confidence: 0.9 }],
  leadValue: { tier: "high", perCustomerValueUsd: 2500 },
  businessType: { label: "Roofing contractor" }, industry: "Roofing", classification: { blended: false },
};
const framework = resolveSalesFramework(profile);
const SIGNALS = { phone: "(540) 555-0101", phoneClickable: true, hasForm: true, booking: null, chat: null, reviewWidget: null, rating: null };
const sales = { bottlenecks: computeSalesBottlenecks({ signals: SIGNALS, profile, framework }) };
const competitor = {
  available: true,
  gaps: [{ dimension: "reviews", status: "behind", source: "google_places", summary: "You show 38 reviews; the strongest nearby competitor shows 412 (local median 120)." }],
  metrics: { yourReviews: 38, reviewLeader: 412 },
};
const consultant = {
  revenueLeaks: [{ title: "Unrecovered missed calls", recovery: { low: 1200, high: 3600 }, recommendation: "Add missed-call text-back to recover after-hours demand." }],
  revenueLeakSummary: { totalHigh: 3600 },
  automationPlan: { automations: [{ canonicalService: "Automatic Review Requests", linkedFindingTitle: "Thin review base" }] },
};

// 1. Evidence pack merges + ranks all sources.
const pack = buildEvidencePack({ profile, framework, consultant, competitor, sales });
ok(pack.rankedConstraints.length > 0, "pack: has constraints");
ok(pack.rankedConstraints.every((c, i) => i === 0 || pack.rankedConstraints[i - 1].impact >= c.impact), "pack: constraints sorted by impact desc");
ok(pack.rankedConstraints.some((c) => c.source === "competitor"), "pack: competitor gap folded into constraints");
ok(pack.rankedConstraints.some((c) => c.source === "leak"), "pack: revenue leak folded in");
ok(pack.automations.some((a) => a.name === "Missed Call Text Back") && pack.automations.some((a) => a.name === "Automatic Review Requests"), "pack: automations deduped from sales + plan");

// 2. Structured (deterministic, weight-ranked) sections.
const structured = assembleStructuredDiagnosis(pack);
ok(structured.topRevenueLeaks.length > 0 && structured.topRevenueLeaks.length <= 5, "structured: top revenue leaks 1..5");
ok(structured.topCompetitiveDisadvantages.some((g) => g.dimension === "reviews"), "structured: competitive disadvantage from real gap");
ok(structured.highestRoiImprovements.every((i, idx) => i.rank === idx + 1 && i.action), "structured: ROI improvements ranked");
ok(structured.ninetyDayPlan.now.length <= 2 && Array.isArray(structured.ninetyDayPlan.later), "structured: 90-day plan now/next/later");
ok(structured.automationOpportunities.length > 0, "structured: automation opportunities");

// 3. No-competitor path degrades gracefully.
const noComp = assembleStructuredDiagnosis(buildEvidencePack({ profile, framework, consultant, competitor: null, sales }));
ok(noComp.topCompetitiveDisadvantages[0].note, "structured: graceful note when no competitor data");

// 4. Full diagnosis (offline → template voice) has all 8 sections.
const d = await runSynthesisAgent({ profile, consultant, competitor, sales });
const sections = ["executiveSummary", "whatIsLimitingGrowth", "topRevenueLeaks", "topCompetitiveDisadvantages", "highestRoiImprovements", "automationOpportunities", "ninetyDayPlan", "consultantVerdict"];
for (const s of sections) ok(d[s] != null, `diagnosis: section "${s}" present`);
ok(typeof d.executiveSummary === "string" && d.executiveSummary.length > 40, "diagnosis: executive summary prose");
ok(Array.isArray(d.whatIsLimitingGrowth) && d.whatIsLimitingGrowth.length > 0, "diagnosis: what-is-limiting-growth populated");
ok(typeof d.consultantVerdict === "string", "diagnosis: consultant verdict present");

if (failures) { console.error(`\nSYNTHESIS CHECK FAILED: ${failures} issue(s).`); process.exit(1); }
console.log("✓ Synthesis OK — evidence pack, weight-ranked structured sections, graceful degradation, 8-section diagnosis verified.");
console.log(`\n  generatedBy: ${d.generatedBy}`);
console.log("  top ROI improvement:", d.highestRoiImprovements[0]?.action, `(impact ${d.highestRoiImprovements[0]?.impactScore})`);
