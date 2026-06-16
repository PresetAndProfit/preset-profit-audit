// api/_lib/research/index.js — the research ORCHESTRATOR. Given the Business
// Intelligence Profile + business location, runs the active providers and
// returns a provider-agnostic competitive landscape for the CompetitorAgent.
import { getResearchProviders } from "./registry.js";
import { dedupeBusinesses, rankCompetitors } from "./normalize.js";

// Map an industry to the search term a customer would actually type into Maps.
const SEARCH_KEYWORD = {
  Dental: "dentist", Chiropractic: "chiropractor", Plumbing: "plumber",
  Roofing: "roofing contractor", HVAC: "hvac contractor", Electrician: "electrician",
  Barbershop: "barber shop", "Med Spa": "med spa", Healthcare: "medical clinic",
  Legal: "law firm", "Real Estate": "real estate agent", "Home Services": "home services",
  Restaurant: "restaurant", Automotive: "auto repair", Retail: "store",
  Fitness: "gym", Finance: "financial advisor", Education: "tutoring center",
  "Beauty & Salon": "hair salon", Childcare: "daycare", SaaS: "software company",
  Agency: "marketing agency", "E-commerce": "online store",
};

export function competitorKeyword(profile) {
  const primary = profile?.industryCandidates?.[0]?.industry || profile?.industry;
  return SEARCH_KEYWORD[primary] || primary || "local business";
}

// Returns { available, providersUsed[], keyword, target, competitors[] }.
// Resilient: a failing provider is logged and skipped, never fatal.
export async function gatherCompetitiveLandscape({ profile, bizName, city, url, limit = 5 }) {
  const providers = getResearchProviders();
  if (!providers.length) return { available: false, providersUsed: [], target: null, competitors: [] };

  const keyword = competitorKeyword(profile);
  let target = null;
  const rawCompetitors = [];
  const used = [];

  for (const p of providers) {
    used.push(p.name);
    if (!target && typeof p.fetchBusiness === "function") {
      try { target = await p.fetchBusiness({ name: bizName, url, city }); }
      catch (e) { console.error("[research] fetchBusiness", p.name, e?.message || e); }
    }
    if (typeof p.fetchCompetitors === "function") {
      try {
        const c = await p.fetchCompetitors({ keyword, city, excludePlaceId: target?.placeId, limit: 20 });
        if (Array.isArray(c)) rawCompetitors.push(...c);
      } catch (e) { console.error("[research] fetchCompetitors", p.name, e?.message || e); }
    }
  }

  const competitors = rankCompetitors(dedupeBusinesses(rawCompetitors), target, limit);
  return { available: !!(target || competitors.length), providersUsed: used, keyword, target, competitors };
}
