// scripts/check-chiefofstaff.mjs — Executive Intelligence verification (offline):
// the Chief of Staff engine. Run: `node scripts/check-chiefofstaff.mjs`.
import { businessHealth, strategicPriority, detectSignals, buildPortfolioBriefing } from "../src/lib/chiefOfStaff.js";

let failures = 0;
const ok = (c, m) => { if (!c) { console.error("  ✗ " + m); failures++; } };

const NOW = Date.parse("2026-06-02T00:00:00Z");
const DAY = 86400000;
const iso = (ms) => new Date(ms).toISOString();

const ROOFER = {
  id: "a", businessName: "Blue Ridge Roofing", industry: "Roofing", overallScore: 62, createdAt: iso(NOW - 2 * DAY),
  competitorIntelligence: { metrics: { reviewLeader: 412, yourReviews: 38 } },
  salesIntelligence: { bottlenecks: [{ severity: 3 }, { severity: 3 }] },
  growthDiagnosis: { highestRoiImprovements: [{ action: "Deploy Online Booking", addresses: "No self-serve booking", rationale: "after-hours demand leaks", impactScore: 84, growthDriver: "Estimate Conversion", effort: "medium" }], forecast: { portfolio: { m12: { low: 14700, high: 44100 } } } },
};
const DENTAL = {
  id: "b", businessName: "Bright Dental", industry: "Dental", overallScore: 85, createdAt: iso(NOW - 30 * DAY),
  growthDiagnosis: { highestRoiImprovements: [{ action: "Deploy Automatic Review Requests", addresses: "reviews", rationale: "trust", impactScore: 20, effort: "low" }], forecast: { portfolio: { m12: { low: 3000, high: 9000 } } } },
};
const RESTAURANT = {
  id: "c", businessName: "Mill Tavern", industry: "Restaurant", overallScore: 70, next_action_at: iso(NOW - 1 * DAY),
  growthDiagnosis: { highestRoiImprovements: [{ action: "Deploy Automatic Customer Follow-Up", addresses: "follow-up", rationale: "list/repeat", impactScore: 42, effort: "medium" }], forecast: { portfolio: { m12: { low: 8000, high: 24000 } } } },
};

// 1. Business health (transparent, penalized).
{
  const h = businessHealth(ROOFER);
  ok(h.score === 44 && h.label === "At risk", `health: roofer 62 −12 competitive −6 risk = 44 (got ${h.score}/${h.label})`);
  ok(h.components.some((c) => c.key === "competitive" && c.value === -12), "health: competitive penalty component");
  ok(h.components.some((c) => c.key === "risk" && c.value === -6), "health: open-risk penalty component");
  ok(businessHealth(DENTAL).score === 85 && businessHealth(DENTAL).label === "Strong", "health: dental strong");
}

// 2. Strategic priority + signals.
{
  ok(strategicPriority(ROOFER).action === "Deploy Online Booking" && strategicPriority(ROOFER).impact === 84, "priority: top ROI improvement");
  const s = detectSignals(ROOFER);
  ok(s.threats.some((t) => t.source === "competitor"), "signals: competitor review threat");
  ok(s.opportunities.some((o) => o.source === "forecast"), "signals: forecast upside opportunity");
}

// 3. Portfolio briefing — the four questions.
{
  const b = buildPortfolioBriefing([ROOFER, DENTAL, RESTAURANT], { now: NOW });
  ok(b.portfolioHealth === 66, `briefing: portfolio health avg(44,85,70)=66 (got ${b.portfolioHealth})`);
  ok(b.whatMatters[0].business === "Blue Ridge Roofing" && b.whatMatters[0].impact === 84, "briefing: what-matters ranked by impact");
  ok(b.whatNext.action === "Deploy Online Booking", "briefing: what's-next = top action");
  ok(b.whatChanged.some((c) => c.business === "Blue Ridge Roofing" && c.change === "New audit completed"), "briefing: new audit this week");
  ok(b.whatChanged.some((c) => c.business === "Mill Tavern" && c.change === "Follow-up due"), "briefing: follow-up due");
  ok(b.whatToIgnore.count >= 1 && b.whatToIgnore.stableBusinesses.includes("Bright Dental"), "briefing: stable business ignored");
  ok(b.roster[0].business === "Blue Ridge Roofing", "briefing: roster worst-health first");
  ok(b.totalOpportunity === 44100 + 9000 + 24000, "briefing: total modeled opportunity");
}

if (failures) { console.error(`\nCHIEF OF STAFF CHECK FAILED: ${failures} issue(s).`); process.exit(1); }
console.log("✓ Chief of Staff OK — health scoring, priority, signal detection, and the what-matters/changed/next/ignore briefing verified.");
const b = buildPortfolioBriefing([ROOFER, DENTAL, RESTAURANT], { now: NOW });
console.log(`\n  Portfolio health ${b.portfolioHealth} · ${b.businesses} businesses · ${b.whatChanged.length} changes`);
console.log(`  Next: ${b.whatNext.action} (${b.whatNext.business})`);
