// src/lib/adapters/index.js — V6 Phase 8: INTEGRATION-READY ADAPTERS.
// Defines the contract for every future external signal/data source. All
// implementations are MOCKS today (no live API, no credentials) but normalize
// INTO the RawSignal shape the opportunity engine already consumes — so turning
// one live is: drop the real fetch into `fetch()`, nothing downstream changes.
//
// Adapter contract:
//   name, source, category, expectedInput, expectedOutput, confidence,
//   fetch(input) -> Promise<rawItems[]>        // live call (mocked now)
//   normalize(raw, input) -> RawSignal[]       // → signalLibrary RawSignal shape
//   errorHandling: how failures degrade (always: return [] , never throw)

function makeAdapter({ name, source, category, expectedInput, expectedOutput, confidence = 0.6, mock = async () => [], normalize }) {
  return {
    name, source, category, expectedInput, expectedOutput, confidence,
    errorHandling: "degrades to [] on failure or missing credentials — never throws",
    live: false, // flip true when a real fetch is wired
    async fetch(input) { try { return await mock(input); } catch (e) { console.warn(`[adapter:${name}] mock fetch failed`, e?.message || e); return []; } },
    normalize: normalize || ((raw) => (Array.isArray(raw) ? raw : []).map((r, i) => ({ id: `${name}_${i}`, type: "external", category, label: r.label || name, detail: r.detail || "", confidence: r.confidence ?? confidence, simulated: true, payload: r }))),
  };
}

// The registry. Add real fetch() bodies later; the engine reads ADAPTERS.normalize().
export const ADAPTERS = {
  google_trends:     makeAdapter({ name: "google_trends", source: "Google Trends", category: "Community Trend", expectedInput: "{ keyword, geo }", expectedOutput: "rising search terms", confidence: 0.55 }),
  google_business:   makeAdapter({ name: "google_business", source: "Google Business Profile", category: "Reputation", expectedInput: "{ placeId }", expectedOutput: "reviews, rating, posts", confidence: 0.9 }),
  weather:           makeAdapter({ name: "weather", source: "Weather API", category: "Weather-Driven", expectedInput: "{ lat, lng }", expectedOutput: "hail/wind/heat/cold events", confidence: 0.7 }),
  eventbrite:        makeAdapter({ name: "eventbrite", source: "Eventbrite", category: "Local Event", expectedInput: "{ geo, radius }", expectedOutput: "upcoming events", confidence: 0.65 }),
  ticketmaster:      makeAdapter({ name: "ticketmaster", source: "Ticketmaster", category: "Local Event", expectedInput: "{ geo, radius }", expectedOutput: "concerts/sports", confidence: 0.65 }),
  local_news_rss:    makeAdapter({ name: "local_news_rss", source: "Local News RSS", category: "Community Trend", expectedInput: "{ feedUrl }", expectedOutput: "local stories", confidence: 0.4 }),
  facebook_ads:      makeAdapter({ name: "facebook_ads", source: "Facebook Ads", category: "Paid Ads", expectedInput: "{ adAccountId }", expectedOutput: "spend, CPL, performance", confidence: 0.8 }),
  google_ads:        makeAdapter({ name: "google_ads", source: "Google Ads", category: "Paid Ads", expectedInput: "{ customerId }", expectedOutput: "spend, CPC, conversions", confidence: 0.8 }),
  stripe:            makeAdapter({ name: "stripe", source: "Stripe", category: "Demand Spike", expectedInput: "{ accountId }", expectedOutput: "revenue, MRR, churn", confidence: 0.95 }),
  quickbooks:        makeAdapter({ name: "quickbooks", source: "QuickBooks", category: "Demand Spike", expectedInput: "{ realmId }", expectedOutput: "invoices, AR, cash flow", confidence: 0.95 }),
  calendar:          makeAdapter({ name: "calendar", source: "Calendar", category: "Demand Spike", expectedInput: "{ calendarId }", expectedOutput: "bookings, open slots", confidence: 0.9 }),
  crm:               makeAdapter({ name: "crm", source: "CRM", category: "Retention", expectedInput: "{ apiKey }", expectedOutput: "contacts, pipeline, last touch", confidence: 0.9 }),
  pos:               makeAdapter({ name: "pos", source: "POS", category: "Demand Spike", expectedInput: "{ merchantId }", expectedOutput: "sales by hour/item", confidence: 0.9 }),
  review_platforms:  makeAdapter({ name: "review_platforms", source: "Review Platforms", category: "Reputation", expectedInput: "{ businessId }", expectedOutput: "reviews, sentiment", confidence: 0.85 }),
  social_platforms:  makeAdapter({ name: "social_platforms", source: "Social Platforms", category: "Social Content", expectedInput: "{ handle }", expectedOutput: "engagement, mentions", confidence: 0.7 }),
};

export const adapterList = () => Object.values(ADAPTERS).map((a) => ({ name: a.name, source: a.source, category: a.category, live: a.live, confidence: a.confidence }));

// Run any subset of adapters and return normalized RawSignals (all mocked → []).
export async function gatherExternalSignals(input, names = Object.keys(ADAPTERS)) {
  const out = [];
  for (const n of names) {
    const a = ADAPTERS[n];
    if (!a) continue;
    const raw = await a.fetch(input);
    out.push(...a.normalize(raw, input));
  }
  return out;
}
