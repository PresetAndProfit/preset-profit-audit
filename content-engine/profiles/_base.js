// profiles/_base.js — shared helpers every brand profile can use.
// A "profile" is a plain object that teaches the generic caption engine how a
// given niche should sound. See profiles/index.js for the contract.

/** Normalize a raw handle into "@name" form. */
export function atHandle(username = "") {
  const clean = String(username).trim().replace(/^@+/, "");
  return clean ? `@${clean}` : "@creator";
}

/** "a, b, and c" from an array. */
export function humanList(items = []) {
  const a = items.filter(Boolean);
  if (a.length <= 1) return a[0] || "";
  if (a.length === 2) return `${a[0]} and ${a[1]}`;
  return `${a.slice(0, -1).join(", ")}, and ${a[a.length - 1]}`;
}

/** Split a free-text "details/features/mods" field into a clean list. */
export function splitDetails(s = "") {
  return String(s)
    .split(/[;,]|\band\b/i)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** True if any needle appears in the haystack. */
export const has = (hay, needles) => needles.some((n) => hay.includes(n));

/**
 * Build exactly `count` unique hashtags from prioritized groups.
 * core kept in order; priority + filler shuffled by the seeded rng.
 */
export function tags20({ core = [], priority = [], filler = [] }, rng, count = 20) {
  const shuffle = (a) => [...a].sort(() => rng() - 0.5);
  const out = [];
  for (const t of [...core, ...shuffle(priority), ...shuffle(filler)]) {
    const tag = t.startsWith("#") ? t : `#${t}`;
    if (!out.includes(tag)) out.push(tag);
    if (out.length === count) break;
  }
  for (const t of filler) {
    if (out.length === count) break;
    const tag = t.startsWith("#") ? t : `#${t}`;
    if (!out.includes(tag)) out.push(tag);
  }
  return out.slice(0, count);
}

// Sensible defaults a profile can spread in.
export const DEFAULT_LIMITS = { instagram: 220, story: 90, facebook: 320 };
export const DEFAULT_EMOJI = ["✨", "🔥", "👌", "👏"];

/**
 * Generic submission analyzer for non-automotive niches. Maps the three
 * descriptive columns to neutral concepts the sentence pools reference:
 *   car_model → subject   color → descriptor   mods → details/features
 */
export function baseAnalyze(sub, subjectFallback = "this one") {
  const list = splitDetails(sub.mods);
  let vision = {};
  try {
    vision = sub.vision_json ? JSON.parse(sub.vision_json) : {};
  } catch {
    /* ignore */
  }
  return {
    user: atHandle(sub.instagram_username),
    subject: (sub.car_model || "").trim() || subjectFallback,
    descriptor: (sub.color || vision.color || "").trim() || "",
    detail: list[0] || "",
    details: humanList(list),
    detailList: list,
    detailCount: list.length,
    style: "default",
    lighting: vision.lighting || "",
    environment: vision.environment || "",
    setting: vision.setting || "",
    hasLighting: Boolean(vision.lighting),
    hasEnvironment: Boolean(vision.environment),
  };
}

/**
 * Build a complete profile from data alone — used by the simpler niches.
 * `pools` = { opener, details, style, closer, story, questions } (arrays).
 * `tags` = { core, priority, filler }. `cta(ctx)` returns the call-to-action
 * block. `fbLead(ctx)` returns the Facebook lead sentence.
 */
export function makeSimpleProfile(cfg) {
  return {
    id: cfg.id,
    name: cfg.name,
    handle: cfg.handle,
    niche: cfg.niche,
    multiDetail: cfg.multiDetail || false,
    limits: cfg.limits || DEFAULT_LIMITS,
    emoji: cfg.emoji || DEFAULT_EMOJI,
    platformStyle: cfg.platformStyle || "Instagram-first, Facebook secondary",
    avoid: cfg.avoid || ["generic filler", "excessive emojis", "ALL CAPS hype"],
    bannedPhrases: cfg.bannedPhrases || [],
    voiceProfile: cfg.voiceProfile,
    fbLead: cfg.fbLead,
    creditBlock: (sub, ctx) => cfg.cta(ctx),
    aiContext: (sub, ctx) =>
      `- Account: ${cfg.name} (${cfg.niche})\n- Subject: ${ctx.subject}\n- Descriptor: ${sub.color || "n/a"}\n- Details/features: ${ctx.details || sub.mods || "none"}\n- Scene (from vision): ${[ctx.lighting, ctx.environment].filter(Boolean).join(", ") || "n/a"}\n- Posted by / credit: ${ctx.user}`,
    analyze: (sub) => baseAnalyze(sub, cfg.subjectFallback),
    sections: (ctx) => ({
      openers: cfg.pools.opener,
      details: [
        ...(ctx.detailCount ? cfg.pools.details : []),
        ...(ctx.hasLighting && cfg.pools.lighting ? cfg.pools.lighting : []),
        ...(ctx.hasEnvironment && cfg.pools.environment ? cfg.pools.environment : []),
      ],
      style: cfg.pools.style,
      closers: cfg.pools.closer,
      story: cfg.pools.story,
      questions: cfg.pools.questions,
    }),
    hashtags: (ctx, rng) => tags20(cfg.tags, rng),
  };
}
