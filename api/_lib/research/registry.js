// api/_lib/research/registry.js — selects the active ResearchProviders from the
// RESEARCH_PROVIDERS env (csv, ordered by priority; default "google_places").
// Adding a provider = register it here + add its id to the env. Nothing else in
// the system changes.
import { googlePlacesProvider } from "./providers/googlePlaces.js";

const ALL = {
  google_places: googlePlacesProvider,
  // serp_api: serpApiProvider,        // later — no redesign needed
  // data_for_seo: dataForSeoProvider,
  // yelp: yelpProvider,
};

export function getResearchProviders() {
  const ids = (process.env.RESEARCH_PROVIDERS || "google_places")
    .split(",").map((s) => s.trim()).filter(Boolean);
  return ids.map((id) => ALL[id]).filter(Boolean).filter((p) => p.enabled());
}
