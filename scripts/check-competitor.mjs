// scripts/check-competitor.mjs — Phase 3 verification (offline, no network/AI):
// the provider mapping, normalization, competitive metrics, grounded template
// narrative, section assembly, and provider gating.
// Run: `node scripts/check-competitor.mjs`.
import { mapPlace } from "../api/_lib/research/providers/googlePlaces.js";
import { haversineMeters, dedupeBusinesses, rankCompetitors } from "../api/_lib/research/normalize.js";
import { getResearchProviders } from "../api/_lib/research/registry.js";
import { gatherCompetitiveLandscape, competitorKeyword } from "../api/_lib/research/index.js";
import { computeCompetitiveMetrics, templateNarrative, assembleCompetitorSection } from "../api/_lib/agents/competitor.js";

let failures = 0;
const ok = (cond, m) => { if (!cond) { console.error("  ✗ " + m); failures++; } };

// 1. Places v1 → NormalizedBusiness mapping.
{
  const b = mapPlace({
    id: "p1", displayName: { text: "Bright Dental" }, rating: 4.7, userRatingCount: 152,
    types: ["dentist"], priceLevel: "PRICE_LEVEL_MODERATE", websiteUri: "https://x.com",
    location: { latitude: 30.27, longitude: -97.74 }, businessStatus: "OPERATIONAL",
  }, true);
  ok(b.name === "Bright Dental" && b.reviewCount === 152 && b.rating === 4.7, "mapPlace: core fields");
  ok(b.priceLevel === 2, "mapPlace: price enum → number");
  ok(b.isTarget === true && b.source === "google_places" && b.location.lat === 30.27, "mapPlace: target/source/location");
  ok(mapPlace(null) === null, "mapPlace: null-safe");
}

// 2. Normalization helpers.
{
  ok(haversineMeters({ lat: 30.27, lng: -97.74 }, { lat: 30.30, lng: -97.74 }) > 3000, "haversine: ~3.3km");
  ok(haversineMeters(null, { lat: 1, lng: 1 }) === null, "haversine: null-safe");
  const deduped = dedupeBusinesses([{ placeId: "a", name: "A" }, { placeId: "a", name: "A dup" }, { placeId: "b", name: "B" }]);
  ok(deduped.length === 2, "dedupe: by placeId");
  const ranked = rankCompetitors([{ name: "x", reviewCount: 10 }, { name: "y", reviewCount: 99 }], null, 1);
  ok(ranked.length === 1 && ranked[0].name === "y", "rank: desc by reviewCount + limit");
}

// 3. Competitive metrics + grounded gaps (the "412 vs 38" moment).
const landscape = {
  available: true, providersUsed: ["google_places"], keyword: "dentist",
  target: { name: "You", reviewCount: 38, rating: 4.2, location: { lat: 30.27, lng: -97.74 }, source: "google_places" },
  competitors: [
    { name: "A", reviewCount: 412, rating: 4.8, source: "google_places" },
    { name: "B", reviewCount: 120, rating: 4.5, source: "google_places" },
    { name: "C", reviewCount: 64, rating: 4.6, source: "google_places" },
  ],
};
const m = computeCompetitiveMetrics(landscape);
ok(m.reviewLeader === 412, "metrics: review leader");
ok(m.reviewMedian === 120, "metrics: review median");
ok(m.ratingAvg === 4.6, `metrics: rating avg (got ${m.ratingAvg})`);
ok(m.rank === 4 && m.totalRanked === 4, `metrics: target review rank (got ${m.rank}/${m.totalRanked})`);
const reviewGap = m.gaps.find((g) => g.dimension === "reviews");
ok(reviewGap && reviewGap.status === "behind" && reviewGap.source === "google_places", "metrics: review gap = behind, grounded");
ok(m.gaps.find((g) => g.dimension === "rating")?.status === "behind", "metrics: rating gap = behind");

// 4. Template narrative is grounded in the real numbers + ROI-first.
{
  const t = templateNarrative(m);
  ok(t.narrative.includes("412") && t.narrative.includes("38"), "template: cites real review numbers");
  ok(t.opportunities.length >= 1, "template: produces ROI opportunities");
}

// 5. Section assembly shape (what gets persisted).
{
  const t = templateNarrative(m);
  const section = assembleCompetitorSection({ landscape, metrics: m, narrative: t.narrative, opportunities: t.opportunities });
  ok(section.available === true, "assemble: available");
  ok(section.competitors.length === 3 && section.competitors[0].name === "A", "assemble: slim competitor list");
  ok(section.reputation && section.reputation.reviewCount === 38, "assemble: reputation = target");
  ok(section.metrics.yourReviews === 38 && section.metrics.reviewLeader === 412, "assemble: metrics carried");
  ok(Array.isArray(section.gaps) && section.gaps.length === 2, "assemble: gaps carried");
}

// 6. Provider gating: no key → no providers → landscape unavailable (graceful).
{
  delete process.env.GOOGLE_PLACES_API_KEY;
  delete process.env.RESEARCH_PROVIDERS;
  ok(getResearchProviders().length === 0, "registry: no key → no active providers");
  const land = await gatherCompetitiveLandscape({ profile: null, bizName: "Test", city: "Austin" });
  ok(land.available === false, "gather: unavailable without a provider, no throw");
}

// 7. Keyword mapping (industry → what a customer types in Maps).
ok(competitorKeyword({ industryCandidates: [{ industry: "Roofing" }] }) === "roofing contractor", "keyword: Roofing → roofing contractor");
ok(competitorKeyword({ industry: "Dental" }) === "dentist", "keyword: Dental → dentist");

if (failures) {
  console.error(`\nCOMPETITOR CHECK FAILED: ${failures} issue(s).`);
  process.exit(1);
}
console.log("✓ Competitor intelligence OK — provider mapping, metrics, grounding, assembly, and gating verified.");
console.log("\n── sample grounded narrative ──\n" + templateNarrative(m).narrative);
