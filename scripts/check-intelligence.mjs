// scripts/check-intelligence.mjs — V5 persistence verification (offline): the
// PURE extractors + aggregators in api/_lib/intelligence.js. No DB is touched —
// we only exercise the data-shaping logic that feeds the snapshot /
// recommendation / benchmark tables. Run: `node scripts/check-intelligence.mjs`.

// The module constructs a service-role client at import; give it a valid-looking
// URL so that never throws. The pure functions below never call the DB.
process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY ||= "test-key";

const { extractSnapshot, extractRecommendations, percentiles, computeBenchmarks, forecastAccuracy } =
  await import("../api/_lib/intelligence.js");

let failures = 0;
const ok = (c, m) => { if (!c) { console.error("  ✗ " + m); failures++; } };

const AUDIT = {
  id: "roof-001", businessName: "Blue Ridge Roofing Co.", aiGenerated: true,
  overallScore: 62, leadScore: 58, websiteScore: 66,
  leadFindings: [{ status: "bad" }, { status: "warn" }], websiteFindings: [{ status: "warn" }],
  businessIntelligenceProfile: { industry: "Roofing", archetype: "quote_trades", leadValue: { tier: "high" } },
  salesIntelligence: { bottlenecks: [{ impactScore: 84 }, { impactScore: 84 }] },
  revenueLeakSummary: { totalLow: 1400, totalHigh: 4200 },
  competitorIntelligence: { metrics: { reviewLeader: 412, yourReviews: 38, rank: 4 } },
  growthDiagnosis: {
    highestRoiImprovements: [
      { rank: 1, action: "Deploy Online Booking", canonical: "Online Booking", growthDriver: "Estimate Conversion", impactScore: 84, effort: "medium" },
      { rank: 2, action: "Deploy Missed Call Text Back", canonical: "Missed Call Text Back", growthDriver: "Estimate Conversion", impactScore: 84, effort: "medium" },
      { rank: 3, action: "Close: bespoke gap", canonical: null, growthDriver: "revenue leak", impactScore: 70, effort: "medium" },
    ],
    ninetyDayPlan: { now: ["Deploy Online Booking", "Deploy Missed Call Text Back"], next: [], later: [] },
    automationOpportunities: [{ name: "Online Booking" }],
    forecast: { portfolio: { m12: { low: 14700, high: 44100 } }, recommendations: [{ canonical: "Online Booking", metric: { label: "booking-conversion lift", low: 15, high: 30, unit: "%" } }] },
  },
};

// 1. Snapshot extraction (Phase A).
{
  const s = extractSnapshot(AUDIT, { auditRowId: "row-1", userId: "u-1" });
  ok(s.industry === "Roofing" && s.archetype === "quote_trades", "snapshot: industry/archetype");
  ok(s.business_size === "midmarket", `snapshot: high lead value → midmarket (got ${s.business_size})`);
  ok(s.overall_score === 62 && s.finding_count === 3, "snapshot: scores + finding count");
  ok(s.severity_score === 168, `snapshot: severity from bottlenecks (got ${s.severity_score})`);
  ok(s.revenue_leak_low === 1400 && s.revenue_leak_high === 4200, "snapshot: revenue leak range");
  ok(s.competitor_review_gap === 374 && s.competitor_rank === 4, "snapshot: competitor gap 412−38");
  ok(s.forecast_12mo_high === 44100, "snapshot: 12-month forecast");
  ok(s.top_workflow === "Online Booking" && s.ai_generated === true, "snapshot: top workflow + ai flag");
}

// 2. Recommendation extraction (Phase B).
{
  const recs = extractRecommendations(AUDIT, { auditRowId: "row-1", userId: "u-1" });
  ok(recs.length === 2, `recs: only canonical workflows, deduped (got ${recs.length})`);
  ok(recs[0].workflow === "Online Booking" && recs[0].priority === "now", "recs: workflow + 90-day priority");
  ok(recs.every((r) => r.status === "recommended" && r.user_id === "u-1"), "recs: default status + user scope");
  ok(recs[0].forecasted_outcome?.metric?.label.includes("booking"), "recs: forecast snapshot attached");
}

// 3. Percentiles.
{
  const p = percentiles([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  ok(p.n === 9 && p.p50 === 5 && p.mean === 5, "percentiles: p50/mean");
  ok(percentiles([]) === null, "percentiles: empty → null");
}

// 4. Benchmark aggregation + anonymity gate (Phase D).
{
  const mk = (industry, score, size = "small") => ({ industry, business_size: size, overall_score: score, lead_score: score, website_score: score, severity_score: 100, revenue_leak_high: 3000, forecast_12mo_high: 30000, competitor_review_gap: 200, competitor_rank: 3 });
  const few = computeBenchmarks([mk("Roofing", 60), mk("Roofing", 70), mk("Roofing", 50)]);
  ok(few.length === 0, "benchmarks: below MIN sample → no rows (anonymity gate)");
  const many = computeBenchmarks(Array.from({ length: 6 }, (_, i) => mk("Roofing", 50 + i * 5)));
  ok(many.length > 0, "benchmarks: ≥ MIN sample → rows emitted");
  const overall = many.find((b) => b.metric === "overall_score" && b.business_size === "all");
  ok(overall && overall.sample_size === 6, "benchmarks: 'all' size group + sample size");
  ok(many.some((b) => b.metric === "lead_gen") && many.some((b) => b.metric === "review_gap"), "benchmarks: metric mapping (lead_gen, review_gap)");
}

// 5. Forecast accuracy (Phase E math).
{
  const recs = [{ id: "r1", forecasted_outcome: { portfolioShareHigh: 1000 } }, { id: "r2", forecasted_outcome: { portfolioShareHigh: 2000 } }];
  const outs = [{ recommendation_id: "r1", revenue_impact_cents: 90000 }, { recommendation_id: "r2", revenue_impact_cents: 300000 }];
  const fa = forecastAccuracy(recs, outs);
  ok(fa.samples === 2, "forecast accuracy: counts paired outcomes");
  ok(fa.medianRatio != null && fa.withinBandPct != null, "forecast accuracy: produces ratio + band");
  ok(forecastAccuracy([], []).samples === 0, "forecast accuracy: empty → 0 samples");
}

if (failures) { console.error(`\nINTELLIGENCE CHECK FAILED: ${failures} issue(s).`); process.exit(1); }
console.log("✓ V5 persistence cores OK — snapshot/recommendation extraction, percentiles, anonymized benchmarks, forecast-accuracy math verified.");
