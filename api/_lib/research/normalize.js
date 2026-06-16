// api/_lib/research/normalize.js — cross-provider merge/rank helpers. Pure.

// Great-circle distance in meters between two {lat,lng} points (or null).
export function haversineMeters(a, b) {
  if (!a || !b || typeof a.lat !== "number" || typeof b.lat !== "number") return null;
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat), la2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.asin(Math.sqrt(h)));
}

// Dedupe businesses across providers — by placeId first, then lowercased name.
export function dedupeBusinesses(list) {
  const seen = new Set();
  const out = [];
  for (const b of list || []) {
    const k = (b.placeId || b.name || "").toString().toLowerCase().trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(b);
  }
  return out;
}

// Rank competitors by reviewCount desc, attach distance from the target, take
// the top N. (Review volume is the strongest public proxy for local dominance.)
export function rankCompetitors(competitors, target, limit = 5) {
  return (competitors || [])
    .map((c) => ({ ...c, distanceMeters: target?.location && c.location ? haversineMeters(target.location, c.location) : null }))
    .sort((a, b) => (b.reviewCount ?? -1) - (a.reviewCount ?? -1))
    .slice(0, limit);
}
