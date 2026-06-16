// api/_lib/agents/competitor.js — V2 Phase 3: the COMPETITOR INTELLIGENCE AGENT.
// Consumes the BIP (spine) + a provider-agnostic competitive landscape (real
// Google Places data) and produces the Reputation + Competitor Intelligence
// sections. Per the diagnostic principle, it does not describe — it surfaces the
// review/rating GAPS that are costing this business growth, ROI-first.
//
// Grounding: every number traces to provider data (cited as source). The agent
// NEVER invents a competitor or a capability the listing data doesn't show
// (e.g. it will not claim a rival "offers online booking" — Places doesn't say).
// The numeric gaps are computed DETERMINISTICALLY; the AI only writes the
// narrative over those numbers, and a template fallback covers AI-off / failure.
import Anthropic from "@anthropic-ai/sdk";
import { renderProfileForPrompt } from "./profile.js";

const MODEL = process.env.COMPETITOR_MODEL || "claude-haiku-4-5";
const rawKey = process.env.ANTHROPIC_API_KEY;
const aiOn = !!(rawKey && rawKey.trim());
let _client = null;
const client = () => (_client || (_client = new Anthropic({ apiKey: (rawKey || "").trim() })));

const median = (arr) => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};
const avg = (arr) => (arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null);

// PURE: compute the competitive metrics + grounded gap statements. Tested offline.
export function computeCompetitiveMetrics(landscape) {
  const target = landscape?.target || null;
  const comps = landscape?.competitors || [];
  const compReviews = comps.map((c) => c.reviewCount).filter((n) => typeof n === "number");
  const compRatings = comps.map((c) => c.rating).filter((n) => typeof n === "number");

  const reviewLeader = compReviews.length ? Math.max(...compReviews) : null;
  const reviewMedian = median(compReviews);
  const ratingAvg = avg(compRatings);
  const targetReviews = typeof target?.reviewCount === "number" ? target.reviewCount : null;
  const targetRating = typeof target?.rating === "number" ? target.rating : null;

  // Rank the target among all analyzed businesses by review volume.
  const ranked = [...(target ? [target] : []), ...comps]
    .filter((b) => typeof b.reviewCount === "number")
    .sort((a, b) => b.reviewCount - a.reviewCount);
  const rank = target && targetReviews != null ? ranked.findIndex((b) => b === target) + 1 : null;

  const gaps = [];
  if (targetReviews != null && reviewLeader != null) {
    const status = targetReviews >= reviewLeader ? "ahead" : targetReviews >= (reviewMedian ?? 0) ? "on_par" : "behind";
    gaps.push({
      dimension: "reviews", yours: targetReviews, benchmarkLeader: reviewLeader, benchmarkMedian: reviewMedian,
      status, source: "google_places",
      summary: `You show ${targetReviews} reviews; the strongest nearby competitor shows ${reviewLeader} (local median ${reviewMedian}).`,
    });
  }
  if (targetRating != null && ratingAvg != null) {
    const status = targetRating >= ratingAvg + 0.1 ? "ahead" : targetRating <= ratingAvg - 0.2 ? "behind" : "on_par";
    gaps.push({
      dimension: "rating", yours: targetRating, benchmarkAvg: ratingAvg, status, source: "google_places",
      summary: `Your rating is ${targetRating} vs a local average of ${ratingAvg} across ${compRatings.length} competitors.`,
    });
  }

  return { target, competitorsAnalyzed: comps.length, reviewLeader, reviewMedian, ratingAvg, targetReviews, targetRating, rank, totalRanked: ranked.length, gaps };
}

// Deterministic, fully-grounded fallback narrative (AI off / failed). Exported
// for offline tests.
export function templateNarrative(m) {
  const opportunities = [];
  const parts = [];
  const reviewGap = m.gaps.find((g) => g.dimension === "reviews");
  const ratingGap = m.gaps.find((g) => g.dimension === "rating");

  if (reviewGap && reviewGap.status === "behind") {
    const deficit = m.reviewLeader - m.targetReviews;
    parts.push(`Across ${m.competitorsAnalyzed} nearby competitors, the review leader holds ${m.reviewLeader} reviews to your ${m.targetReviews} — a ${deficit}-review gap that pushes you down the local Map Pack, where most new customers are won.`);
    opportunities.push("Automate review requests after every job/visit to close the review-count gap that is suppressing your local ranking.");
  } else if (reviewGap) {
    parts.push(`Your ${m.targetReviews} reviews hold up against the local field (median ${m.reviewMedian}) — protect that lead with a steady review cadence.`);
  }
  if (ratingGap && ratingGap.status === "behind") {
    parts.push(`Your ${m.targetRating} rating trails the ${m.ratingAvg} local average, which costs you clicks before a prospect ever reaches your site.`);
    opportunities.push("Trigger review requests to your happiest customers and respond to every review to lift your average rating toward the local benchmark.");
  }
  if (!parts.length) parts.push(`Analyzed ${m.competitorsAnalyzed} nearby competitors from Google listing data; no decisive review or rating gap was detected.`);
  return { narrative: parts.join(" "), opportunities };
}

async function narrate(metrics, landscape, profile) {
  const compLines = (landscape.competitors || [])
    .map((c, i) => `  ${i + 1}. ${c.name || "(unnamed)"} — ${c.reviewCount ?? "?"} reviews, rating ${c.rating ?? "?"}`)
    .join("\n");
  const system = `You are a senior local-marketing consultant writing the REPUTATION & COMPETITOR INTELLIGENCE section of a paid business audit. You are given REAL Google Places listing data (review counts and ratings) and a Business Intelligence Profile.

RULES (a violation makes the section worthless):
- Use ONLY the numbers provided. Every figure must come from the data below; cite it as Google listing data. NEVER invent a competitor, a review count, a rating, or a capability (you do NOT know whether a competitor offers booking, ordering, etc. — do not claim it).
- Do not describe for its own sake. Convert each gap into WHY it costs this business growth and the highest-ROI move to close it (the audit's purpose).
- Plain, direct, senior language. No hype, no emoji. Address the owner as "you".
Return ONLY JSON: { "narrative": <2-4 sentences>, "opportunities": [<1-3 ROI-first actions>] }`;
  const user = [
    renderProfileForPrompt(profile),
    "",
    `COMPUTED METRICS (Google listing data): your reviews=${metrics.targetReviews}, your rating=${metrics.targetRating}, competitor review leader=${metrics.reviewLeader}, local review median=${metrics.reviewMedian}, local rating average=${metrics.ratingAvg}, competitors analyzed=${metrics.competitorsAnalyzed}, your review rank=${metrics.rank}/${metrics.totalRanked}.`,
    "COMPETITORS (Google listing data):",
    compLines || "  (none returned)",
  ].join("\n");

  const message = await client().messages.create({
    model: MODEL,
    max_tokens: 700,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: user }],
  });
  const block = (message.content || []).find((b) => b.type === "text");
  let txt = (block?.text || "").trim();
  const fence = txt.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) txt = fence[1].trim();
  const s = txt.indexOf("{"), e = txt.lastIndexOf("}");
  if (s !== -1 && e > s) txt = txt.slice(s, e + 1);
  const parsed = JSON.parse(txt);
  return {
    narrative: typeof parsed.narrative === "string" ? parsed.narrative : null,
    opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities.filter((x) => typeof x === "string") : [],
  };
}

// Assemble the persisted Reputation + Competitor Intelligence section.
export function assembleCompetitorSection({ landscape, metrics, narrative, opportunities }) {
  const slim = (b) => ({ name: b.name, rating: b.rating, reviewCount: b.reviewCount, distanceMeters: b.distanceMeters ?? null, source: b.source });
  return {
    available: true,
    providersUsed: landscape.providersUsed || [],
    method: `Based on Google Places listing data for ${metrics.competitorsAnalyzed} nearby competitor(s).`,
    keyword: landscape.keyword || null,
    reputation: metrics.target ? slim(metrics.target) : null,
    competitors: (landscape.competitors || []).map(slim),
    metrics: {
      reviewLeader: metrics.reviewLeader, reviewMedian: metrics.reviewMedian, ratingAvg: metrics.ratingAvg,
      yourReviews: metrics.targetReviews, yourRating: metrics.targetRating, rank: metrics.rank, totalRanked: metrics.totalRanked,
    },
    gaps: metrics.gaps,
    narrative,
    opportunities: opportunities || [],
  };
}

// Orchestrate: landscape → metrics → (AI narrative | template) → section.
export async function runCompetitorAgent({ landscape, profile }) {
  if (!landscape?.available) return { available: false, reason: "no_research_data" };
  const metrics = computeCompetitiveMetrics(landscape, profile);

  let narrative = null, opportunities = null;
  if (aiOn) {
    try { ({ narrative, opportunities } = await narrate(metrics, landscape, profile)); }
    catch (e) { console.error("[competitor] narrate failed", e?.message || e); }
  }
  if (!narrative) ({ narrative, opportunities } = templateNarrative(metrics));

  return assembleCompetitorSection({ landscape, metrics, narrative, opportunities });
}
