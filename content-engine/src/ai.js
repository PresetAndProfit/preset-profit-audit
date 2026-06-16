// src/ai.js — generate the content set for one submission, for the ACTIVE brand
// profile. Uses the Anthropic Messages API when ANTHROPIC_API_KEY is set (with
// prompt caching on the per-profile brief), and falls back to the seeded
// voice-template engine otherwise.
import { CONFIG } from "./env.js";
import { getProfile } from "../profiles/index.js";
import { composeContent } from "./captionEngine.js";

function systemBrief(profile) {
  return `You are the lead social copywriter for ${profile.name}, an Instagram + Facebook account in this niche: ${profile.niche}.

${profile.voiceProfile}

Hard rules:
- Every caption must be UNIQUE and derived from the specific submission (its subject, descriptor, and details/features). Never write generic filler that could apply to anything.
- Vary sentence structure, length, and opener across submissions. No formula.
- Make the call-to-action / next step clear in the Facebook caption where it fits.
${profile.bannedPhrases?.length ? `- NEVER use these worn-out phrases: ${profile.bannedPhrases.map((p) => `"${p}"`).join(", ")}.` : ""}
- Avoid: ${(profile.avoid || []).join("; ")}.
- Platform style: ${profile.platformStyle || "Instagram-first"}.
- 0-2 tasteful emojis max in the IG caption; none required.

Respond with ONLY a JSON object — no prose, no markdown fences — with exactly these keys:
{
  "instagram_caption": string,   // <= ${profile.limits.instagram} chars, specific to THIS submission
  "story_caption": string,       // <= ${profile.limits.story} chars, ultra-short overlay text
  "facebook_caption": string,    // <= ${profile.limits.facebook} chars, a touch more descriptive, includes the CTA
  "hashtags": string[],          // exactly 20 niche hashtags, each starting with #, no duplicates
  "engagement_question": string  // one short question that invites comments
}`;
}

async function anthropicGenerate(sub, profile) {
  const ctx = profile.analyze(sub);
  const userMsg = `Submission details:
${profile.aiContext(sub, ctx)}
- Original caption / notes (context only): ${sub.caption_original || "none"}

Write the JSON now. Make the copy unmistakably about THIS submission.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": CONFIG.anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: CONFIG.anthropicModel,
      max_tokens: 1024,
      system: [{ type: "text", text: systemBrief(profile), cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: userMsg }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = (data.content || []).map((b) => b.text || "").join("").trim();
  const json = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));

  let hashtags = Array.isArray(json.hashtags) ? json.hashtags.map(String) : [];
  hashtags = [...new Set(hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)))];
  if (hashtags.length < 20) {
    for (const t of composeContent(sub, profile).hashtags) {
      if (!hashtags.includes(t)) hashtags.push(t);
      if (hashtags.length === 20) break;
    }
  }

  const banned = profile.bannedPhrases || [];
  const scrub = (s) => {
    const out = String(s || "").trim();
    return banned.some((p) => out.toLowerCase().includes(p.toLowerCase())) ? "" : out;
  };

  return {
    instagram_caption: scrub(json.instagram_caption),
    story_caption: scrub(json.story_caption),
    facebook_caption: scrub(json.facebook_caption),
    hashtags: hashtags.slice(0, 20),
    engagement_question: String(json.engagement_question || "").trim(),
    credit_block: profile.creditBlock(sub, ctx),
    _engine: `${profile.id}:${CONFIG.anthropicModel}`,
  };
}

/**
 * Generate the full content set for a submission using the active (or given)
 * profile. Returns schema-shaped generated fields ready to merge.
 */
export async function generateContent(sub, profileId = CONFIG.profileId) {
  const profile = getProfile(profileId);
  const template = composeContent(sub, profile); // always available; also the AI fallback
  let result = template;

  if (CONFIG.aiEnabled) {
    try {
      const ai = await anthropicGenerate(sub, profile);
      result = {
        instagram_caption: ai.instagram_caption || template.instagram_caption,
        story_caption: ai.story_caption || template.story_caption,
        facebook_caption: ai.facebook_caption || template.facebook_caption,
        hashtags: ai.hashtags,
        engagement_question: ai.engagement_question || template.engagement_question,
        credit_block: ai.credit_block,
        _engine: ai._engine,
      };
    } catch (e) {
      console.warn(`⚠  AI generation failed (${e.message}). Using voice-template engine.`);
    }
  }

  return {
    generated_instagram_caption: result.instagram_caption,
    generated_story_caption: result.story_caption,
    generated_facebook_caption: result.facebook_caption,
    generated_hashtags: Array.isArray(result.hashtags) ? result.hashtags.join(" ") : result.hashtags,
    generated_engagement_question: result.engagement_question,
    credit_block: result.credit_block,
    _engine: result._engine,
  };
}
