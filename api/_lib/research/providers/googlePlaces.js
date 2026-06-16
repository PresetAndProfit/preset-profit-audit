// api/_lib/research/providers/googlePlaces.js — first ResearchProvider impl.
// Uses the Google Places API (New, v1) Text Search. Official, reliable, cheap —
// real review counts, ratings, categories, and price level for the target
// business and nearby competitors. Requires GOOGLE_PLACES_API_KEY; degrades to
// "not available" (provider disabled) when absent, never throws at import.
//
// The host is a fixed, trusted Google endpoint (not a user-supplied URL), so a
// plain fetch is appropriate here — the SSRF-hardened safeFetchPage is for
// scraping arbitrary sites, not calling a known API.
import { normalizedBusiness } from "../contract.js";

const ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = [
  "places.id", "places.displayName", "places.rating", "places.userRatingCount",
  "places.types", "places.priceLevel", "places.websiteUri", "places.location",
  "places.businessStatus",
].join(",");

const PRICE_MAP = {
  PRICE_LEVEL_FREE: 0, PRICE_LEVEL_INEXPENSIVE: 1, PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3, PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

const apiKey = () => (process.env.GOOGLE_PLACES_API_KEY || "").trim();

// Map ONE raw Places (v1) place object → NormalizedBusiness. Exported for
// offline tests (no network).
export function mapPlace(p, isTarget = false) {
  if (!p || typeof p !== "object") return null;
  return normalizedBusiness({
    source: "google_places",
    placeId: p.id ?? null,
    name: p.displayName?.text ?? null,
    rating: typeof p.rating === "number" ? p.rating : null,
    reviewCount: typeof p.userRatingCount === "number" ? p.userRatingCount : null,
    categories: Array.isArray(p.types) ? p.types : [],
    priceLevel: PRICE_MAP[p.priceLevel] ?? null,
    website: p.websiteUri ?? null,
    businessStatus: p.businessStatus ?? null,
    location: p.location ? { lat: p.location.latitude, lng: p.location.longitude } : null,
    isTarget,
  });
}

async function searchText(textQuery, maxResultCount = 10) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey(),
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({ textQuery, maxResultCount: Math.min(20, maxResultCount) }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`google_places ${res.status}`);
  const json = await res.json();
  return Array.isArray(json.places) ? json.places : [];
}

export const googlePlacesProvider = {
  name: "google_places",
  capabilities: ["business_profile", "reviews", "competitors"],
  enabled: () => !!apiKey(),

  async fetchBusiness({ name, city }) {
    const q = [name, city].filter(Boolean).join(" ").trim();
    if (!q) return null;
    const places = await searchText(q, 1);
    return places.length ? mapPlace(places[0], true) : null;
  },

  async fetchCompetitors({ keyword, city, excludePlaceId, limit = 20 }) {
    const q = [keyword, city ? `in ${city}` : null].filter(Boolean).join(" ").trim();
    if (!q) return [];
    const places = await searchText(q, limit);
    return places
      .map((p) => mapPlace(p, false))
      .filter((b) => b && b.placeId && b.placeId !== excludePlaceId)
      .filter((b) => b.businessStatus == null || b.businessStatus === "OPERATIONAL");
  },
};
