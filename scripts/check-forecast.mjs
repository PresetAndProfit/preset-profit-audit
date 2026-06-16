// scripts/check-forecast.mjs — V5 Layer 5 verification (offline): the outcome
// forecast engine + its end-to-end flow through synthesis into the diagnosis.
// Run: `node scripts/check-forecast.mjs`.
import { buildForecast } from "../src/lib/forecastEngine.js";
import { runSynthesisAgent } from "../api/_lib/agents/synthesis.js";
import { computeSalesBottlenecks, resolveSalesFramework } from "../api/_lib/agents/salesIntel.js";

let failures = 0;
const ok = (cond, m) => { if (!cond) { console.error("  ✗ " + m); failures++; } };

// 1. Portfolio revenue is anchored ONLY in quantified leaks; ramps 30<90<12mo.
{
  const f = buildForecast({
    topRevenueLeaks: [{ title: "Unrecovered calls", dollars: { low: 1400, high: 4200 } }, { title: "No booking", impact: 60 /* no dollars */ }],
    recommendations: [{ action: "Deploy Missed Call Text Back", canonical: "Missed Call Text Back" }, { action: "Deploy Automatic Review Requests", canonical: "Automatic Review Requests" }],
    leadValue: { tier: "high" },
  });
  ok(f.available && f.portfolio, "forecast: available with portfolio");
  ok(f.portfolio.d30.high < f.portfolio.d90.high && f.portfolio.d90.high < f.portfolio.m12.high, "forecast: 30 < 90 < 12-month ramp");
  ok(f.portfolio.m12.high >= 4200 * 9, "forecast: 12-month is cumulative (≈ steady × ~10.5)");
  // Only the leak WITH dollars anchors revenue (no fabrication from the $-less leak).
  ok(f.portfolio.d30.high === Math.round((4200 * 0.4) / 50) * 50, "forecast: anchored only in quantified leak");
}

// 2. Per-system operational metrics differ by ramp type.
{
  const f = buildForecast({
    topRevenueLeaks: [],
    recommendations: [
      { action: "Deploy Missed Call Text Back", canonical: "Missed Call Text Back" },     // instant
      { action: "Deploy Automatic Review Requests", canonical: "Automatic Review Requests" }, // compounding
    ],
  });
  ok(!f.portfolio, "forecast: no portfolio $ when no quantified leaks");
  const mc = f.recommendations.find((r) => r.canonical === "Missed Call Text Back");
  const rev = f.recommendations.find((r) => r.canonical === "Automatic Review Requests");
  ok(mc.metric.label.includes("missed calls") && mc.metric.unit === "/mo", "forecast: missed-call operational metric");
  ok(rev.metric.label.includes("reviews") && rev.ranking, "forecast: review automation has growth + ranking metric");
  ok(mc.trajectory.d30 > rev.trajectory.d30, "forecast: instant ramps faster than compounding at 30 days");
}

// 3. Unknown action → default model, never throws.
{
  const f = buildForecast({ recommendations: [{ action: "Close: Some bespoke gap" }] });
  ok(f.recommendations[0].canonical === null && f.recommendations[0].metric, "forecast: unknown action → default model");
}

// 4. End-to-end: synthesis embeds the forecast in the diagnosis.
{
  const profile = { industryCandidates: [{ industry: "Roofing", confidence: 0.9 }], leadValue: { tier: "high", perCustomerValueUsd: 2500 }, businessType: { label: "Roofing contractor" }, industry: "Roofing", classification: { blended: false } };
  const framework = resolveSalesFramework(profile);
  const sales = { bottlenecks: computeSalesBottlenecks({ signals: { phone: "x", phoneClickable: true, hasForm: true, booking: null, chat: null, reviewWidget: null, rating: null }, profile, framework }) };
  const consultant = { revenueLeaks: [{ title: "Unrecovered calls", recovery: { low: 1400, high: 4200 }, recommendation: "Add text-back." }], automationPlan: { automations: [] } };
  const d = await runSynthesisAgent({ profile, consultant, competitor: null, sales });
  ok(d.forecast?.available, "e2e: diagnosis carries forecast");
  ok(d.forecast.recommendations.length > 0, "e2e: per-system forecasts present");
  ok(d.highestRoiImprovements.every((i) => "canonical" in i), "e2e: improvements expose canonical for forecasting");
}

if (failures) { console.error(`\nFORECAST CHECK FAILED: ${failures} issue(s).`); process.exit(1); }
console.log("✓ Outcome Forecasting OK — portfolio ramp, per-system metrics, ramp-type differentiation, e2e embedding verified.");
const demo = buildForecast({ topRevenueLeaks: [{ dollars: { low: 1400, high: 4200 } }], recommendations: [{ canonical: "Missed Call Text Back", action: "Deploy Missed Call Text Back" }, { canonical: "Automatic Review Requests", action: "Deploy Automatic Review Requests" }], leadValue: { tier: "high" } });
console.log(`\n  Portfolio: 30d ${demo.portfolio.d30.low}-${demo.portfolio.d30.high}/mo · 90d ${demo.portfolio.d90.low}-${demo.portfolio.d90.high}/mo · 12mo $${demo.portfolio.m12.low.toLocaleString()}-$${demo.portfolio.m12.high.toLocaleString()} recovered`);
