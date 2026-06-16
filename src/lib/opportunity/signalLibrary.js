// src/lib/opportunity/signalLibrary.js — V6 Opportunity Intelligence: the SIGNAL
// LAYER. PURE & DETERMINISTIC (no live APIs). Emits raw business signals from
// three sources, each clearly tagged:
//   • GROUNDED  — derived from the audit's own data (competitor/review/retention)
//   • SEASONAL  — deterministic by month + vertical (storm season, back-to-school…)
//   • SIMULATED — plausible local events/weather, seeded by business name so each
//                 business gets a stable, varied set without any external call.
//
// Live sources (Weather/Eventbrite/Trends…) plug in later via src/lib/adapters —
// they normalize INTO this same RawSignal shape, so nothing downstream changes.
//
// RawSignal: { id, type, category, label, detail, confidence(0..1), simulated,
//              vertical, payload }

// Deterministic FNV-1a hash → stable per-business seed (no Math.random).
export function seedFrom(str) {
  let h = 2166136261;
  const s = String(str || "");
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Map an industry/archetype to an opportunity vertical.
export function verticalOf(audit) {
  const ind = (audit?.industry || audit?.businessIntelligenceProfile?.industry || "").toLowerCase();
  const arch = audit?.businessIntelligenceProfile?.archetype || "";
  // Specific-first; word boundaries so "barbershop" never matches "bar".
  if (/dent/.test(ind)) return "dental";
  if (/roof/.test(ind)) return "roofing";
  if (/barber|salon|beauty|hair|spa/.test(ind)) return "barber_salon";
  if (/auto|car|tire|mechanic/.test(ind)) return "auto";
  if (/\b(bar|pub|tavern|grill|restaurant|cafe|diner|eatery|bistro|kitchen|food)\b/.test(ind)) return "restaurant";
  if (/hvac|plumb|electric|home services|contractor|roofing/.test(ind)) return "contractor";
  if (/agency|saas|software|marketing/.test(ind)) return "agency_saas";
  if (arch === "hospitality") return "restaurant";
  if (arch === "quote_trades") return "contractor";
  if (arch === "high_ticket_advisory") return "agency_saas";
  return "generic";
}

// SEASONAL windows — deterministic by month (1–12). Each fires when the current
// month is in `months`. These are real, predictable demand cycles.
const SEASONAL = {
  restaurant: [
    { months: [11, 12], category: "Seasonal", label: "Holiday party & catering season", detail: "Group bookings and catering peak through the holidays.", confidence: 0.8 },
    { months: [5, 6, 7], category: "Seasonal", label: "Summer patio & tourism season", detail: "Foot traffic and tourism rise in summer.", confidence: 0.7 },
  ],
  roofing: [
    { months: [3, 4, 5, 6, 7, 8, 9], category: "Weather-Driven", label: "Storm & hail season", detail: "Roof damage claims peak in storm season — inspection demand spikes.", confidence: 0.85 },
    { months: [9, 10], category: "Seasonal", label: "Pre-winter roof inspection window", detail: "Homeowners book inspections before winter.", confidence: 0.7 },
  ],
  dental: [
    { months: [8], category: "Seasonal", label: "Back-to-school checkup season", detail: "Families book checkups before school starts.", confidence: 0.8 },
    { months: [10, 11, 12], category: "Seasonal", label: "Year-end insurance benefits expiring", detail: "Patients lose unused dental benefits on Dec 31 — high-intent recall window.", confidence: 0.85 },
    { months: [4, 5], category: "Seasonal", label: "Wedding & prom whitening season", detail: "Cosmetic/whitening demand rises before wedding and prom season.", confidence: 0.65 },
  ],
  barber_salon: [
    { months: [8, 9], category: "Seasonal", label: "Back-to-school & college move-in", detail: "Students refresh cuts before school and move-in.", confidence: 0.75 },
    { months: [4, 5], category: "Seasonal", label: "Prom & wedding styling season", detail: "Event styling demand peaks.", confidence: 0.7 },
    { months: [11, 12], category: "Seasonal", label: "Holiday grooming season", detail: "Grooming and gift packages peak for the holidays.", confidence: 0.7 },
  ],
  auto: [
    { months: [11, 12], category: "Seasonal", label: "Holiday travel safety season", detail: "Pre-travel inspections (brakes, tires, fluids) spike before holiday road trips.", confidence: 0.8 },
    { months: [6, 7, 8], category: "Weather-Driven", label: "Summer AC & overheating season", detail: "Heat drives AC service and cooling-system demand.", confidence: 0.75 },
    { months: [1, 2], category: "Weather-Driven", label: "Winter battery & tire season", detail: "Cold weather drives battery and tire failures.", confidence: 0.7 },
  ],
  contractor: [
    { months: [3, 4, 5], category: "Seasonal", label: "Spring home-improvement season", detail: "Real-estate and renovation activity rises in spring.", confidence: 0.75 },
    { months: [9, 10], category: "Seasonal", label: "Pre-winter maintenance window", detail: "Homeowners schedule maintenance before winter.", confidence: 0.7 },
  ],
  agency_saas: [
    { months: [1, 9], category: "Seasonal", label: "New-budget planning season", detail: "Businesses set budgets in January and Q4 — high-intent buying windows.", confidence: 0.65 },
  ],
  generic: [],
};

// SIMULATED external events — plausible, vertical-specific, fired deterministically
// by the business-name seed so the set is stable and varied (a stand-in for live
// Eventbrite/Weather/news adapters). Each carries `simulated: true`.
const SIMULATED = {
  restaurant: [
    { category: "Local Event", label: "Major sporting event nearby this weekend", detail: "A regional game is driving crowds within a few miles.", confidence: 0.7 },
    { category: "Local Event", label: "Motorcycle rally routed near you", detail: "A multi-day rally passes nearby — hundreds of riders looking for food stops.", confidence: 0.65 },
    { category: "Local Event", label: "Concert / festival weekend in the area", detail: "A ticketed event is bringing visitors to the area.", confidence: 0.6 },
    { category: "Demand Spike", label: "Nearby construction crew on a multi-week job", detail: "A crew working nearby needs reliable daily lunch options.", confidence: 0.55 },
  ],
  roofing: [
    { category: "Weather-Driven", label: "Hailstorm reported in your service area", detail: "Recent hail likely caused roof damage across nearby neighborhoods.", confidence: 0.75 },
    { category: "Weather-Driven", label: "High-wind event passed through", detail: "Strong winds commonly lift shingles and create leak risk.", confidence: 0.65 },
  ],
  auto: [
    { category: "Weather-Driven", label: "Cold snap forecast this week", detail: "A temperature drop will spike battery and tire issues.", confidence: 0.6 },
  ],
  barber_salon: [
    { category: "Local Event", label: "College move-in week approaching", detail: "An influx of students arrives in the area.", confidence: 0.6 },
  ],
  contractor: [
    { category: "Weather-Driven", label: "Storm activity in your region", detail: "Recent storms create repair and inspection demand.", confidence: 0.6 },
    { category: "Local Event", label: "Active real-estate season in your zip", detail: "Home sales drive pre-listing repairs and inspections.", confidence: 0.55 },
  ],
  dental: [],
  agency_saas: [],
  generic: [],
};

// GROUNDED signals — straight from the audit's own intelligence (highest trust).
function groundedSignals(audit) {
  const out = [];
  const cm = audit?.competitorIntelligence?.metrics;
  if (cm && cm.reviewLeader != null && cm.yourReviews != null) {
    const gap = cm.reviewLeader - cm.yourReviews;
    if (gap > 40) out.push({ category: "Competitor Gap", label: "Competitor pulling ahead on reviews", detail: `A local competitor shows ${cm.reviewLeader} reviews to your ${cm.yourReviews}.`, confidence: 0.9, payload: { gap, yours: cm.yourReviews, leader: cm.reviewLeader } });
    if (gap > 0) out.push({ category: "Reputation", label: "Review volume below local leaders", detail: `Closing the review gap lifts local ranking and trust.`, confidence: 0.85, payload: { gap } });
  }
  // Retention signal from the diagnosis (no repeat/reactivation engine).
  const leaks = audit?.growthDiagnosis?.topRevenueLeaks || [];
  if (leaks.some((l) => /repeat|reactivat|retention|follow-?up|win-?back|list/i.test(l.title || ""))) {
    out.push({ category: "Retention", label: "Past customers not being reactivated", detail: "Repeat revenue is leaking — your warmest audience is dormant.", confidence: 0.75 });
  }
  return out;
}

// Gather all raw signals for a business. `month` (1–12) defaults from `now`.
// `injected` lets demos/adapters force specific signals (same RawSignal shape).
export function gatherSignals(audit, { month, now = Date.now(), injected = [] } = {}) {
  const vertical = verticalOf(audit);
  const m = month || new Date(now).getUTCMonth() + 1;
  const seed = seedFrom(audit?.businessName || audit?.id || "biz");
  const out = [];
  let n = 0;
  const push = (s, source) => out.push({ id: `sig_${source}_${n++}`, type: source, vertical, simulated: source === "simulated", ...s });

  groundedSignals(audit).forEach((s) => push(s, "grounded"));
  (SEASONAL[vertical] || []).filter((s) => s.months.includes(m)).forEach((s) => push(s, "seasonal"));
  // Deterministic firing of simulated events: ~half fire, chosen by seed.
  (SIMULATED[vertical] || []).forEach((s, i) => { if ((seed + i * 2654435761) % 100 < 55) push(s, "simulated"); });
  // Injected (demo/adapter) signals pass straight through, normalized.
  (injected || []).forEach((s) => push({ confidence: 0.7, ...s }, s.simulated ? "simulated" : (s.type || "external")));

  return out;
}
