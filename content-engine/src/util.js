// src/util.js — small shared helpers.

// Strictly-increasing ISO timestamps, even within the same millisecond, so a
// batch of 20 photos ingested in a tight loop keeps a stable, ordered sequence.
let lastTs = 0;
export function monotonicNow() {
  let t = Date.now();
  if (t <= lastTs) t = lastTs + 1;
  lastTs = t;
  return new Date(t).toISOString();
}

// FNV-1a 32-bit string hash — used to seed the caption RNG per submission so
// each car gets unique-but-reproducible copy.
export function hash32(str = "") {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// mulberry32 — tiny seeded PRNG. Deterministic stream from a 32-bit seed.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick one element using a seeded RNG. */
export function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

/** Natural filename sort (so 02.jpg comes before 10.jpg). */
export function naturalCompare(a, b) {
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}
