// src/lib/forecastEngine.js — V5 Layer 5: OUTCOME FORECASTING. PURE &
// deterministic (no AI, no network). Turns the Growth Diagnosis from "what is
// wrong" into "what results are expected": a 30 / 90 / 365-day trajectory for
// each prescribed system, plus a portfolio revenue forecast.
//
// Discipline (same as the rest of the platform): every figure is a MODELED
// RANGE, never a guarantee. The portfolio $ forecast is anchored ONLY in the
// revenue leaks the diagnosis already quantified (we never invent a $ number);
// per-system operational metrics are conservative modeled ranges that ramp up
// over time (a review engine compounds slowly; missed-call recovery is near
// instant). Consumed by synthesis.js → embedded in report.growthDiagnosis.forecast.

const round50 = (n) => Math.round((Number(n) || 0) / 50) * 50;

// How fast a system reaches steady-state impact: d30/d90 = fraction of steady
// impact reached; sum12 = effective active-months over the first year (a slow
// ramp yields fewer than 12 full months of value).
const RAMP = {
  instant:     { d30: 0.55, d90: 0.90, sum12: 11.0 },
  medium:      { d30: 0.40, d90: 0.80, sum12: 10.5 },
  compounding: { d30: 0.20, d90: 0.55, sum12: 9.0 },
};

// Per-canonical operational forecast model (the spec's "Review Automation →
// estimated review growth", "Lead Follow-Up → conversion increase", etc.).
const FORECAST_MODELS = {
  "Missed Call Text Back":         { ramp: "instant",     metric: { label: "missed calls recovered", low: 6, high: 18, unit: "/mo" } },
  "Online Booking":                { ramp: "instant",     metric: { label: "booking-conversion lift", low: 15, high: 30, unit: "%" } },
  "Online Ordering":               { ramp: "instant",     metric: { label: "off-premise order lift", low: 10, high: 25, unit: "%" } },
  "24/7 Website Chat":             { ramp: "instant",     metric: { label: "after-hours leads captured", low: 4, high: 12, unit: "/mo" } },
  "Appointment Reminder Messages": { ramp: "instant",     metric: { label: "no-show reduction", low: 25, high: 50, unit: "%" } },
  "Automatic Customer Follow-Up":  { ramp: "medium",      metric: { label: "lead→customer conversion lift", low: 15, high: 35, unit: "%" } },
  "Customer Enquiry Tracker":      { ramp: "medium",      metric: { label: "close-rate lift", low: 10, high: 25, unit: "%" } },
  "Automatic Review Requests":     { ramp: "compounding", metric: { label: "new reviews", low: 6, high: 15, unit: "/mo" }, ranking: "+1–3 local Map Pack positions modeled over 12 months" },
  "Monthly Customer Emails":       { ramp: "compounding", metric: { label: "repeat-visit lift", low: 5, high: 15, unit: "%" } },
  "Win-Back Messages":             { ramp: "compounding", metric: { label: "reactivated customers", low: 3, high: 10, unit: "/mo" } },
  _default:                        { ramp: "medium",      metric: { label: "operational impact", low: 5, high: 15, unit: "%" } },
};

const canonicalFromAction = (action) => String(action || "").replace(/^Deploy\s+/i, "").replace(/^Close:\s*/i, "").trim();
const modelFor = (canonical) => FORECAST_MODELS[canonical] || FORECAST_MODELS._default;

// Build the outcome forecast from the assembled diagnosis sections + lead value.
export function buildForecast({ topRevenueLeaks = [], recommendations = [], leadValue = null } = {}) {
  // Portfolio revenue — anchored ONLY in already-quantified leaks (no invention).
  let lkLow = 0, lkHigh = 0;
  for (const l of topRevenueLeaks) {
    if (l.dollars) { lkLow += l.dollars.low || 0; lkHigh += l.dollars.high || 0; }
  }
  const R = RAMP.medium; // blended portfolio ramp
  const portfolio = lkHigh > 0 ? {
    label: "Modeled recovered revenue — a range, not a guarantee.",
    basis: "Anchored in the revenue leaks quantified above, ramped as systems reach steady-state.",
    d30: { low: round50(lkLow * R.d30), high: round50(lkHigh * R.d30), note: "monthly run-rate by day 30" },
    d90: { low: round50(lkLow * R.d90), high: round50(lkHigh * R.d90), note: "monthly run-rate by day 90" },
    m12: { low: round50(lkLow * R.sum12), high: round50(lkHigh * R.sum12), note: "cumulative first-year recovery" },
  } : null;

  // Per-system operational forecast + ramp trajectory.
  const recs = recommendations.map((rec) => {
    const canonical = rec.canonical || canonicalFromAction(rec.action);
    const m = modelFor(canonical);
    const r = RAMP[m.ramp];
    return {
      action: rec.action,
      canonical: FORECAST_MODELS[canonical] ? canonical : null,
      rampType: m.ramp,
      metric: { label: m.metric.label, low: m.metric.low, high: m.metric.high, unit: m.metric.unit, modeled: true },
      ranking: m.ranking || null,
      // % of steady-state impact reached at each horizon.
      trajectory: { d30: Math.round(r.d30 * 100), d90: Math.round(r.d90 * 100), m12: 100 },
    };
  });

  return {
    available: !!(portfolio || recs.length),
    method: "Modeled ramp-up on each system's steady-state impact. Ranges, not guarantees; actual results depend on execution.",
    leadValueTier: leadValue?.tier || null,
    portfolio,
    recommendations: recs,
  };
}
