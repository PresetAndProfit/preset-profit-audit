// api/_lib/research/contract.js — the PROVIDER-AGNOSTIC shapes for external
// business research. Agents and the report consume ONLY these shapes, never a
// provider's raw payload — so adding SerpAPI / DataForSEO / Yelp later is one
// adapter + an env flag, with zero changes to the CompetitorAgent or the report.
//
// A ResearchProvider implements (any subset of):
//   name: string
//   capabilities: Array<'business_profile'|'reviews'|'competitors'|'local_pack'>
//   enabled(): boolean                                  // config present?
//   fetchBusiness({ name, url, city }): NormalizedBusiness | null
//   fetchCompetitors({ keyword, city, excludePlaceId, limit }): NormalizedBusiness[]

/**
 * @typedef {Object} NormalizedBusiness
 * @property {string}  source          provider id, e.g. "google_places"
 * @property {?string} placeId         provider-stable id (dedupe key)
 * @property {?string} name
 * @property {?number} rating          0..5 or null
 * @property {?number} reviewCount     total ratings or null
 * @property {string[]} categories     provider category tokens
 * @property {?number} priceLevel      0..4 or null
 * @property {?string} website
 * @property {?string} businessStatus  e.g. "OPERATIONAL"
 * @property {?{lat:number,lng:number}} location
 * @property {?number} distanceMeters  from the target (computed downstream)
 * @property {boolean} isTarget        the audited business vs. a competitor
 */

// Factory: always return a fully-shaped NormalizedBusiness so downstream code
// never has to null-check missing keys.
export function normalizedBusiness(partial = {}) {
  return {
    source: partial.source || "unknown",
    placeId: partial.placeId ?? null,
    name: partial.name ?? null,
    rating: typeof partial.rating === "number" ? partial.rating : null,
    reviewCount: typeof partial.reviewCount === "number" ? partial.reviewCount : null,
    categories: Array.isArray(partial.categories) ? partial.categories : [],
    priceLevel: typeof partial.priceLevel === "number" ? partial.priceLevel : null,
    website: partial.website ?? null,
    businessStatus: partial.businessStatus ?? null,
    location: partial.location && typeof partial.location.lat === "number" ? { lat: partial.location.lat, lng: partial.location.lng } : null,
    distanceMeters: typeof partial.distanceMeters === "number" ? partial.distanceMeters : null,
    isTarget: !!partial.isTarget,
  };
}
