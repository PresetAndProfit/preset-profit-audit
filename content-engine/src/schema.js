// src/schema.js — single source of truth for the submission record.
// Column order here IS the Google Sheet header order. Don't reorder casually:
// the Sheets adapter matches rows positionally against this list.

export const COLUMNS = [
  "submission_id",
  "source", // tagged_post | mention | dm | upload | url
  "instagram_username",
  "media_url",
  "local_image_path",
  "caption_original",
  "car_model",
  "color",
  "mods",
  "generated_instagram_caption",
  "generated_story_caption",
  "generated_facebook_caption",
  "generated_hashtags",
  "generated_engagement_question",
  "credit_block",
  "approval_status", // pending | approved | rejected | posted
  "created_at",
  "scheduled_date", // ISO datetime the content is queued to post (Phase 3)
  "vision_summary", // one-line human-readable visual read (Phase 1)
  "vision_json", // serialized full vision analysis (Phase 1)
];

export const SOURCES = ["tagged_post", "mention", "dm", "upload", "url"];
export const STATUSES = ["pending", "approved", "rejected", "posted"];

// Fields produced by the AI generator (everything else is intake metadata).
export const GENERATED_FIELDS = [
  "generated_instagram_caption",
  "generated_story_caption",
  "generated_facebook_caption",
  "generated_hashtags",
  "generated_engagement_question",
  "credit_block",
];

/** Build a blank, fully-shaped record so every row has every column. */
export function blankRecord() {
  return Object.fromEntries(COLUMNS.map((c) => [c, ""]));
}

/** Coerce an arbitrary object into a schema-shaped record (extra keys dropped). */
export function shape(partial = {}) {
  const rec = blankRecord();
  for (const c of COLUMNS) {
    if (partial[c] !== undefined && partial[c] !== null) rec[c] = String(partial[c]);
  }
  return rec;
}

/** True if the AI generator has already run on this record. */
export function isGenerated(rec) {
  return Boolean(rec.generated_instagram_caption?.trim());
}
