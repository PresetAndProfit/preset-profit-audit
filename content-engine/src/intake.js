// src/intake.js — turn raw submissions (a pasted IG URL, or a photo dropped in
// the inbox) into pending records in the store.
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { PATHS } from "./env.js";
import { getStore } from "./store.js";
import { shape, SOURCES } from "./schema.js";
import { isImage, extractMetadata } from "./image.js";
import { atHandle } from "../profiles/_base.js";
import { monotonicNow, naturalCompare } from "./util.js";
import { analyzeImage } from "./vision.js";

function newId() {
  return `b7-${Date.now().toString(36)}-${crypto.randomBytes(2).toString("hex")}`;
}

const nowIso = monotonicNow;

function normalizeSource(source, fallback = "upload") {
  return SOURCES.includes(source) ? source : fallback;
}

/** Pull a likely @username out of an Instagram URL (best-effort). */
function userFromInstagramUrl(url) {
  // https://www.instagram.com/<user>/p/<code>/  or  /reel/<code>/
  const m = String(url).match(/instagram\.com\/([^/?#]+)\/(?:p|reel|tv)\//i);
  return m && !["p", "reel", "tv", "stories"].includes(m[1]) ? m[1] : "";
}

/**
 * Normalize a raw item (from any intake adapter) into a schema-shaped record.
 * Accepts both automotive (car_model/color/mods) and generic
 * (subject/descriptor/details) field names. Runs vision when a local image is
 * present. Does NOT insert — returns { rec } ready for the queue.
 */
export async function normalizeRaw(raw, { fallbackSource = "upload", runVision = true } = {}) {
  const user = raw.instagram_username || raw.username || (raw.media_url ? userFromInstagramUrl(raw.media_url) : "");
  let vision = {};
  if (runVision && raw.local_image_path) vision = await analyzeImage(raw.local_image_path);

  return shape({
    submission_id: newId(),
    source: normalizeSource(raw.source, fallbackSource),
    instagram_username: atHandle(user).replace(/^@/, ""),
    media_url: raw.media_url || "",
    local_image_path: raw.local_image_path || "",
    caption_original: raw.caption_original || raw.caption || "",
    car_model: raw.car_model || raw.subject || "",
    color: raw.color || raw.descriptor || vision.color || "",
    mods: raw.mods || raw.details || "",
    approval_status: "pending",
    created_at: nowIso(),
    vision_summary: vision.summary || "",
    vision_json: raw.local_image_path ? JSON.stringify(vision) : "",
  });
}

/**
 * Central front door for EVERY intake source: normalize → dedupe → insert.
 * Dedupes on media_url or local_image_path so re-running an adapter is safe.
 * Returns the inserted record, or null if it was a duplicate.
 */
export async function createSubmission(raw, opts = {}) {
  const store = await getStore();
  if (raw.media_url || raw.local_image_path) {
    const existing = await store.list();
    const dup = existing.some(
      (r) => (raw.media_url && r.media_url === raw.media_url) || (raw.local_image_path && r.local_image_path === raw.local_image_path),
    );
    if (dup) return null;
  }
  const rec = await normalizeRaw(raw, opts);
  await store.insert(rec);
  return rec;
}

/**
 * Ingest a single pasted media URL as a pending submission.
 * Generic aliases: subject→car_model, descriptor→color, details→mods.
 */
export async function intakeFromUrl({ url, username, source, caption, car_model, color, mods, subject, descriptor, details }) {
  if (!url) throw new Error("intakeFromUrl: url is required");
  return createSubmission(
    { source: source || "url", media_url: url, username, caption, car_model, color, mods, subject, descriptor, details },
    { fallbackSource: "url", runVision: false },
  );
}

/**
 * Scan the inbox folder for images and create a pending record per new image.
 * Optional sidecar `<image>.json` (or `.txt`) supplies username/caption/mods etc.
 * Files already represented in the store (by local_image_path) are skipped.
 */
/**
 * Read a folder of images into raw items (sidecar + EXIF merged), in drop order.
 * Does NOT insert — used by both intakeFolder and the local-folder adapter.
 */
export async function readInboxRaws(folder = PATHS.inbox, source = "upload") {
  await fs.mkdir(folder, { recursive: true });
  const entries = (await fs.readdir(folder)).sort(naturalCompare); // 01_, 02_, … 10_
  const raws = [];
  for (const name of entries) {
    const full = path.join(folder, name);
    if (!isImage(name)) continue;
    const sidecar = await readSidecar(folder, name);
    const meta = await extractMetadata(full);
    raws.push({
      source: sidecar.source || source,
      local_image_path: full,
      instagram_username: sidecar.instagram_username || sidecar.username,
      media_url: sidecar.media_url,
      caption_original: sidecar.caption_original || sidecar.caption,
      car_model: sidecar.car_model || sidecar.subject,
      color: sidecar.color || sidecar.descriptor,
      mods: sidecar.mods || sidecar.details || (meta.camera ? `shot on ${meta.camera}` : ""),
    });
  }
  return raws;
}

export async function intakeFolder(folder = PATHS.inbox, { source = "upload" } = {}) {
  const raws = await readInboxRaws(folder, source);
  const created = [];
  for (const raw of raws) {
    const rec = await createSubmission(raw, { fallbackSource: "upload", runVision: true });
    if (rec) created.push(rec); // null = already ingested (dedup)
  }
  return created;
}

/** Look for `<image>.json` then `<image>.txt` (txt = caption only). */
async function readSidecar(folder, imageName) {
  const base = imageName.replace(path.extname(imageName), "");
  try {
    const j = await fs.readFile(path.join(folder, `${base}.json`), "utf8");
    return JSON.parse(j);
  } catch {
    /* try txt */
  }
  try {
    const t = await fs.readFile(path.join(folder, `${base}.txt`), "utf8");
    return { caption: t.trim() };
  } catch {
    return {};
  }
}
