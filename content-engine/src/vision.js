// src/vision.js — Phase 1: turn a photo into structured visual features that
// the caption engine can weave in. Two backends:
//   • Claude Vision  (ANTHROPIC_API_KEY set)  → rich, accurate detection
//   • Local heuristics (no key)               → color / lighting / environment
// Always degrades gracefully; never throws into the pipeline.
import fs from "node:fs/promises";
import path from "node:path";
import { CONFIG } from "./env.js";
import { imageStats } from "./imageStats.js";

const MEDIA_TYPE = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif" };

// The shape every vision result conforms to.
export const VISION_FIELDS = [
  "color", "wheels", "wheel_color", "stance", "body_mods", "roof_rack",
  "spoiler", "environment", "setting", "lighting", "build_style", "summary",
];

function blankVision() {
  return { color: "", wheels: "", wheel_color: "", stance: "", body_mods: [], roof_rack: "", spoiler: "", environment: "", setting: "", lighting: "", build_style: "", summary: "", _source: "none" };
}

// --- nearest named color for the local path -------------------------------
const PALETTE = [
  ["black", [22, 22, 26]], ["white", [235, 235, 235]], ["silver", [190, 193, 198]],
  ["grey", [120, 122, 126]], ["blue", [30, 80, 180]], ["dark blue", [25, 40, 90]],
  ["red", [165, 30, 38]], ["green", [40, 110, 70]], ["yellow", [210, 190, 60]],
  ["orange", [205, 120, 60]],
];
function nearestColor([r, g, b]) {
  let best = "", d = Infinity;
  for (const [name, c] of PALETTE) {
    const dist = (r - c[0]) ** 2 + (g - c[1]) ** 2 + (b - c[2]) ** 2;
    if (dist < d) { d = dist; best = name; }
  }
  return best;
}

function localVision(stats) {
  const v = blankVision();
  v._source = "local-heuristics";
  if (!stats) return v;
  v.color = nearestColor(stats.avg);

  const { brightness, warmth, greenRatio, skyRatio, colorfulness } = stats;
  if (brightness < 60) v.lighting = "low, moody night light";
  else if (brightness < 110) v.lighting = warmth > 15 ? "warm golden-hour light" : "soft overcast light";
  else if (brightness < 185) v.lighting = warmth > 20 ? "warm evening light" : "even daylight";
  else v.lighting = "bright open daylight";

  if (greenRatio > 0.18) { v.setting = "nature"; v.environment = "a tree-lined, natural backdrop"; }
  else if (skyRatio > 0.5 && greenRatio < 0.1) { v.setting = "open-air"; v.environment = "an open sky backdrop"; }
  else if (brightness < 75 && colorfulness < 130) { v.setting = "indoor"; v.environment = "a clean studio / garage setting"; }
  else { v.setting = "street"; v.environment = "an urban street backdrop"; }

  v.summary = `${v.color} subject in ${v.lighting} against ${v.environment}`;
  return v;
}

// --- Claude Vision --------------------------------------------------------
const SYSTEM = `You are a vehicle photography analyst. Look at the image and report only what is clearly visible. Respond with ONLY a JSON object, no prose, with these keys:
{
  "color": string,            // vehicle paint color, specific if possible
  "wheels": string,           // wheel style/spokes, e.g. "multi-spoke" or "CH-R style"
  "wheel_color": string,      // e.g. "silver", "gloss black"
  "stance": string,           // ride height/stance, e.g. "slammed", "sitting low", "factory height"
  "body_mods": string[],      // visible body mods (splitter, widebody, etc.); [] if none
  "roof_rack": string,        // "" if none, else describe
  "spoiler": string,          // "" if none, else describe
  "environment": string,      // short phrase, e.g. "tree-lined backdrop", "concrete parking structure"
  "setting": string,          // one of: urban | nature | street | indoor | open-air | studio
  "lighting": string,         // e.g. "golden-hour", "overcast", "harsh midday", "night with reflections"
  "build_style": string,      // e.g. "aggressive OEM+", "stance", "track", "factory/clean"
  "summary": string           // one vivid sentence describing the scene like an enthusiast would
}`;

async function claudeVision(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const media_type = MEDIA_TYPE[ext];
  if (!media_type) return null;
  const data = (await fs.readFile(filePath)).toString("base64");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": CONFIG.anthropicKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: CONFIG.anthropicModel,
      max_tokens: 700,
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type, data } }, { type: "text", text: "Analyze this vehicle photo." }] }],
    }),
  });
  if (!res.ok) throw new Error(`Vision API ${res.status}`);
  const out = await res.json();
  const text = (out.content || []).map((b) => b.text || "").join("").trim();
  const json = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ""));
  const v = { ...blankVision(), ...json, _source: `claude-vision:${CONFIG.anthropicModel}` };
  v.body_mods = Array.isArray(json.body_mods) ? json.body_mods : [];
  if (!v.summary) v.summary = [v.color, v.stance, v.environment].filter(Boolean).join(", ");
  return v;
}

/**
 * Analyze the submission's image. Returns a vision object (never throws).
 * Uses the local image only; remote media_url is not fetched here.
 */
export async function analyzeImage(filePath) {
  if (!filePath) return blankVision();
  try {
    await fs.access(filePath);
  } catch {
    return blankVision();
  }

  if (CONFIG.aiEnabled) {
    try {
      const v = await claudeVision(filePath);
      if (v) return v;
    } catch (e) {
      console.warn(`⚠  Claude Vision failed (${e.message}); using local heuristics.`);
    }
  }
  return localVision(await imageStats(filePath).catch(() => null));
}

/** Parse the stored vision_json off a submission record (safe). */
export function readVision(sub = {}) {
  try {
    return sub.vision_json ? JSON.parse(sub.vision_json) : {};
  } catch {
    return {};
  }
}

/** Merge vision body_mods + text mods into a clean, deduped detail set. */
export function visionToParts(vision = {}) {
  const parts = [];
  if (vision.roof_rack) parts.push(vision.roof_rack.toLowerCase().includes("rack") ? vision.roof_rack : `${vision.roof_rack} roof rack`);
  if (vision.spoiler) parts.push(vision.spoiler.toLowerCase().includes("spoiler") || vision.spoiler.toLowerCase().includes("wing") ? vision.spoiler : `${vision.spoiler} spoiler`);
  for (const m of vision.body_mods || []) parts.push(m);
  return parts;
}
