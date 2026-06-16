// scripts/check-sales.mjs — Phase 4 verification (offline, no network/AI): the
// Sales Process Agent's pure ranking. Proves the SAME weak-site signals produce
// DIFFERENT, industry-weighted bottleneck rankings for a dentist, roofer, and
// restaurant — i.e. it ranks by revenue impact in that specific industry, not
// generic detection. Run: `node scripts/check-sales.mjs`.
import { computeSalesBottlenecks, resolveSalesFramework, assembleSalesSection, templateNarrative } from "../api/_lib/agents/salesIntel.js";

let failures = 0;
const ok = (cond, m) => { if (!cond) { console.error("  ✗ " + m); failures++; } };

// A "weak" site (raw siteAnalyzer field names): takes calls, has a form, but no
// booking, no ordering, no chat, no reviews → multiple bottlenecks fire.
const SIGNALS = { phone: "(540) 555-0101", phoneClickable: true, hasForm: true, booking: null, ordering: null, chat: null, reviewWidget: null, rating: null };

const PROFILES = {
  dentist: { industryCandidates: [{ industry: "Dental", confidence: 0.9 }], leadValue: { tier: "medium" } },
  roofer: { industryCandidates: [{ industry: "Roofing", confidence: 0.9 }], leadValue: { tier: "high" } },
  restaurant: { industryCandidates: [{ industry: "Restaurant", confidence: 0.9 }], leadValue: { tier: "low" } },
};

const rank = {};
for (const [k, profile] of Object.entries(PROFILES)) {
  const framework = resolveSalesFramework(profile);
  ok(Array.isArray(framework.growthDrivers) && framework.growthDrivers.length > 0, `${k}: framework has growthDrivers`);
  rank[k] = computeSalesBottlenecks({ signals: SIGNALS, profile, framework });
  ok(rank[k].length > 0, `${k}: produced bottlenecks`);
  ok(rank[k].every((b, i) => b.rank === i + 1 && b.impactScore > 0), `${k}: ranks sequential, impact positive`);
}
const find = (k, id) => rank[k].find((b) => b.id === id);

// 1. Archetype gating: no online-ordering finding for a dentist/roofer; no
//    online-booking finding for a restaurant.
ok(find("restaurant", "no_online_ordering") && !find("restaurant", "no_online_booking"), "restaurant: ordering applies, booking gated out");
ok(find("dentist", "no_online_booking") && !find("dentist", "no_online_ordering"), "dentist: booking applies, ordering gated out");
ok(!find("roofer", "no_repeat_retention") && find("dentist", "no_repeat_retention"), "retention: gated for roofer (low-repeat), present for dentist");

// 2. Lead value scales impact: the SAME bottleneck ranks higher for the
//    high-lead-value roofer than the medium-lead-value dentist.
ok(find("roofer", "no_online_booking").impactScore > find("dentist", "no_online_booking").impactScore,
  `lead value: roofer booking impact (${find("roofer", "no_online_booking").impactScore}) should exceed dentist (${find("dentist", "no_online_booking").impactScore})`);

// 3. Industry severity nuance: missed-call recovery is more severe for trades.
ok(find("roofer", "no_missed_call_recovery").severity === 3 && find("dentist", "no_missed_call_recovery").severity === 2,
  "severity: missed-call recovery escalated for quote_trades");

// 4. Industry-specific TOP priority: restaurant differs from dentist/roofer.
ok(rank.dentist[0].id === "no_online_booking", `dentist top should be booking (got ${rank.dentist[0].id})`);
ok(rank.restaurant[0].id !== rank.dentist[0].id, `restaurant top should differ from dentist (both ${rank.restaurant[0].id})`);

// 5. Driver attribution: every bottleneck names the growth driver it serves.
ok(rank.roofer.every((b) => typeof b.driver === "string" && b.driver.length), "every bottleneck attributes a growth driver");

// 6. Section assembly + grounded template narrative.
{
  const section = assembleSalesSection({ bottlenecks: rank.roofer, profile: PROFILES.roofer });
  ok(section.available && section.topPriority && section.byStage, "assemble: shape ok");
  ok(section.byStage.capture.includes("no_online_booking"), "assemble: byStage grouping");
  const t = templateNarrative(rank.roofer);
  ok(t.narrative.includes(rank.roofer[0].label.toLowerCase()) || t.narrative.toLowerCase().includes(rank.roofer[0].label.toLowerCase()), "template: leads with #1 bottleneck");
}

if (failures) {
  console.error(`\nSALES CHECK FAILED: ${failures} issue(s).`);
  process.exit(1);
}
console.log("✓ Sales Process Agent OK — industry-weighted ranking, gating, lead-value scaling, assembly verified.");

// Show the divergence: top 3 ranked bottlenecks per industry.
for (const k of ["dentist", "roofer", "restaurant"]) {
  console.log(`\n── ${k.toUpperCase()} (lead ${PROFILES[k].leadValue.tier}) — top sales bottlenecks ──`);
  for (const b of rank[k].slice(0, 4)) console.log(`  #${b.rank} ${b.label}  [${b.driver} ${b.driverWeight}% × sev ${b.severity}] → impact ${b.impactScore}`);
}
