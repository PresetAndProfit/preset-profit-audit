// src/captionEngine.js — niche-agnostic caption composer.
// Given a submission and a brand PROFILE, it produces a varied, unique content
// set. All niche knowledge lives in the profile (analyze + sentence pools);
// this file is pure composition + assembly. Deterministic per submission_id.
import { hash32, mulberry32, pick } from "./util.js";

const FALLBACK = { subject: "this one", descriptor: "", detail: "", details: "", user: "a friend", model: "" };

function fill(str, ctx) {
  return str
    .replace(/\{(\w+)\}/g, (_, k) => {
      const v = ctx[k];
      return v != null && typeof v !== "object" && v !== "" ? String(v) : FALLBACK[k] ?? "";
    })
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,!?])/g, "$1")
    // "a Audi" → "an Audi", "a 18in" → "an 18in" (subject values vary by niche).
    .replace(/\b([Aa]) (?=[AEIOUaeiou]|1[18]|8)/g, (_, a) => (a === "A" ? "An " : "an "))
    .trim();
}

const capFirst = (s) => s.replace(/^([^A-Za-z]*)([a-z])/, (_, pre, ch) => pre + ch.toUpperCase());

function clamp(s, n) {
  s = s.trim();
  if (s.length <= n) return s;
  return s.slice(0, n - 1).replace(/[\s,;:.–-]+\S*$/, "").trim() + "…";
}

// Join filled segments, dropping whole trailing sentences (never mid-sentence)
// until the result fits. Each segment is capitalized as its own sentence.
function assembleWithin(parts, ctx, limit) {
  const segs = parts.map((p) => capFirst(fill(p, ctx))).filter(Boolean);
  while (segs.length > 1 && segs.join(" ").length > limit) segs.pop();
  const joined = segs.join(" ");
  return joined.length > limit ? clamp(joined, limit) : joined;
}

// Pull a distinct item from a pool, advancing the rng stream so IG / FB / story
// don't collide on the same line.
function take(pool, rng, used) {
  if (!pool || !pool.length) return "";
  for (let i = 0; i < 8; i++) {
    const s = pick(pool, rng);
    if (!used.has(s)) {
      used.add(s);
      return s;
    }
  }
  return pick(pool, rng);
}

function maybeEmoji(rng, palette, max = 1) {
  if (!palette || !palette.length) return "";
  const n = rng() < 0.5 ? 0 : 1 + Math.floor(rng() * max);
  const out = [];
  const seen = new Set();
  while (out.length < n) {
    const e = pick(palette, rng);
    if (!seen.has(e)) {
      seen.add(e);
      out.push(e);
    }
  }
  return out.join("");
}

function assertClean(s, banned = []) {
  const low = s.toLowerCase();
  return banned.some((p) => low.includes(p.toLowerCase())) ? "" : s;
}

/**
 * Compose the full content set for a submission using the given profile.
 * Returns the same shape the AI path returns.
 */
export function composeContent(sub, profile) {
  const ctx = profile.analyze(sub);
  ctx.brand = profile.name;
  ctx.handle = profile.handle;
  ctx.niche = profile.niche;

  const seed = sub.submission_id || `${ctx.user}|${ctx.subject}|${ctx.details}`;
  const rng = mulberry32(hash32(seed));
  const used = new Set();
  const S = profile.sections(ctx);
  const L = profile.limits;
  const banned = profile.bannedPhrases || [];

  // --- Instagram: opener + 1-2 details (or style) + closer ---
  const igParts = [take(S.openers, rng, used)];
  if (S.details.length) igParts.push(take(S.details, rng, used));
  // A second detail line only helps when the profile's detail lines describe
  // DIFFERENT aspects (multiDetail). Otherwise they'd just repeat the same data.
  if (profile.multiDetail && S.details.length > 2 && rng() < 0.5) igParts.push(take(S.details, rng, used));
  else if (S.style.length && rng() < 0.6) igParts.push(take(S.style, rng, used));
  igParts.push(take(S.closers, rng, used));
  const em = maybeEmoji(rng, profile.emoji, 2);
  let instagram = assembleWithin(igParts, ctx, L.instagram - (em ? em.length + 1 : 0));
  if (em) instagram += " " + em;
  instagram = assertClean(instagram, banned) || assembleWithin(igParts, ctx, L.instagram);

  // --- Story ---
  let story = capFirst(fill(take(S.story, rng, used), ctx));
  if (rng() < 0.35 && S.story.length > 1) story += " " + capFirst(fill(take(S.story, rng, used), ctx));
  story = clamp(story, L.story);

  // --- Facebook: lead + details + style + closer ---
  const fbParts = [profile.fbLead(ctx)];
  if (S.details.length) fbParts.push(take(S.details, rng, used));
  if (S.style.length) fbParts.push(take(S.style, rng, used));
  fbParts.push(take(S.closers, rng, used));
  const facebook = assembleWithin(fbParts, ctx, L.facebook);

  // --- Engagement question + hashtags ---
  const engagement = fill(take(S.questions, rng, used), ctx);
  const hashtags = profile.hashtags(ctx, rng);

  return {
    instagram_caption: instagram,
    story_caption: story,
    facebook_caption: facebook,
    hashtags,
    engagement_question: engagement,
    credit_block: profile.creditBlock(sub, ctx),
    _engine: `profile:${profile.id}`,
    _analysis: ctx,
  };
}
