// src/contentPack.js — export ready-to-post content packs.
// Per record: exports/<id>/ with post.md, post.json, and the image (if local).
// Bulk CSV: exports/content.csv across many records. Markdown/JSON/CSV all
// carry caption set, hashtags, engagement, credit, scheduled date, and the
// full vision analysis (Phase 5).
import fs from "node:fs/promises";
import path from "node:path";
import { PATHS, CONFIG } from "./env.js";
import { getProfile } from "../profiles/index.js";
import { atHandle } from "../profiles/_base.js";
import { COLUMNS } from "./schema.js";
import { readVision } from "./vision.js";

function visionBlock(rec) {
  const v = readVision(rec);
  if (!v || !v._source || v._source === "none") return "_No vision analysis._";
  const line = (k, val) => (val && (!Array.isArray(val) || val.length) ? `- **${k}:** ${Array.isArray(val) ? val.join(", ") : val}\n` : "");
  return (
    line("Summary", v.summary) +
    line("Color", v.color) +
    line("Wheels", [v.wheel_color, v.wheels].filter(Boolean).join(" ")) +
    line("Stance", v.stance) +
    line("Body mods", v.body_mods) +
    line("Roof rack", v.roof_rack) +
    line("Spoiler", v.spoiler) +
    line("Lighting", v.lighting) +
    line("Environment", v.environment) +
    line("Setting", v.setting) +
    line("Build style", v.build_style) +
    line("Source", v._source)
  ).trim();
}

function postMarkdown(rec) {
  const profile = getProfile(CONFIG.profileId);
  const user = atHandle(rec.instagram_username);
  const scheduled = rec.scheduled_date ? new Date(rec.scheduled_date).toLocaleString() : "—";
  return `# ${profile.name} — Ready-to-Post Pack

- **Submission:** ${rec.submission_id}
- **Source:** ${rec.source}
- **Credit / handle:** ${user}
- **Subject:** ${[rec.color, rec.car_model].filter(Boolean).join(" ") || "—"}
- **Details:** ${rec.mods || "—"}
- **Status:** ${rec.approval_status}
- **Scheduled:** ${scheduled}
- **Media:** ${rec.media_url || rec.local_image_path || "—"}

---

## 📸 Instagram caption
${rec.generated_instagram_caption}

**Engagement:** ${rec.generated_engagement_question}

${rec.credit_block}

${rec.generated_hashtags}

---

## 📲 Instagram Story (overlay text)
${rec.generated_story_caption}

---

## 👍 Facebook caption
${rec.generated_facebook_caption}

${rec.credit_block}

---

## 🔍 Vision analysis
${visionBlock(rec)}
`;
}

/** Write the per-record pack. Returns the export folder path. */
export async function exportPack(rec) {
  const dir = path.join(PATHS.exports, rec.submission_id);
  await fs.mkdir(dir, { recursive: true });

  await fs.writeFile(path.join(dir, "post.md"), postMarkdown(rec), "utf8");
  await fs.writeFile(path.join(dir, "post.json"), JSON.stringify(rec, null, 2), "utf8");

  if (rec.local_image_path) {
    try {
      const ext = path.extname(rec.local_image_path) || ".jpg";
      await fs.copyFile(rec.local_image_path, path.join(dir, `image${ext}`));
    } catch {
      /* source image moved/missing — pack still useful */
    }
  }
  return dir;
}

const csvCell = (v) => {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Write a single CSV across many records (all schema columns). Returns path. */
export async function exportCsv(records, file = "content.csv") {
  await fs.mkdir(PATHS.exports, { recursive: true });
  const out = path.join(PATHS.exports, file);
  const rows = [COLUMNS.join(",")];
  for (const r of records) rows.push(COLUMNS.map((c) => csvCell(r[c])).join(","));
  await fs.writeFile(out, rows.join("\r\n") + "\r\n", "utf8");
  return out;
}

/** Write a single combined JSON array across many records. Returns path. */
export async function exportJsonAll(records, file = "content.json") {
  await fs.mkdir(PATHS.exports, { recursive: true });
  const out = path.join(PATHS.exports, file);
  await fs.writeFile(out, JSON.stringify(records, null, 2), "utf8");
  return out;
}
