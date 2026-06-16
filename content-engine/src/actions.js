// src/actions.js — high-level operations shared by the CLI and the web UI.
import { getStore } from "./store.js";
import { generateContent } from "./ai.js";
import { exportPack } from "./contentPack.js";
import { isGenerated } from "./schema.js";
import { intakeFolder } from "./intake.js";
import { analyzeImage } from "./vision.js";

/** Ensure a record has vision analysis (runs it if a local image exists). */
export async function ensureVision(id, { force = false } = {}) {
  const store = await getStore();
  const rec = await store.get(id);
  if (!rec) throw new Error(`No submission ${id}`);
  if (!rec.local_image_path) return rec;
  if (rec.vision_json && !force) return rec;
  const vision = await analyzeImage(rec.local_image_path);
  return store.update(id, { vision_json: JSON.stringify(vision), vision_summary: vision.summary || "" });
}

/**
 * List submissions, optionally filtered by status.
 * order: "asc" = oldest first (FIFO drop order, the approval queue);
 *        "desc" = newest first (default, handy for ops/CLI scans).
 */
export async function listSubmissions(status, { order = "desc" } = {}) {
  const store = await getStore();
  const rows = await store.list();
  const filtered = status ? rows.filter((r) => r.approval_status === status) : rows;
  const dir = order === "asc" ? 1 : -1;
  return filtered.sort((a, b) => dir * String(a.created_at).localeCompare(String(b.created_at)));
}

export async function getSubmission(id) {
  const store = await getStore();
  return store.get(id);
}

/** Run the AI generator on one record and persist the captions. */
export async function generateFor(id, { force = false } = {}) {
  const store = await getStore();
  let rec = await store.get(id);
  if (!rec) throw new Error(`No submission ${id}`);
  if (isGenerated(rec) && !force) return { rec, skipped: true };

  // Phase 1: vision precedes generation. Backfill it for records that predate it.
  if (rec.local_image_path && !rec.vision_json) rec = await ensureVision(id);

  const generated = await generateContent(rec);
  delete generated._engine;
  const updated = await store.update(id, generated);
  return { rec: updated, skipped: false };
}

/** Generate for every pending record missing captions, in drop order. */
export async function generatePending({ force = false } = {}) {
  const rows = await listSubmissions("pending", { order: "asc" });
  const results = [];
  for (const r of rows) {
    if (isGenerated(r) && !force) continue;
    results.push(await generateFor(r.submission_id, { force }));
  }
  return results;
}

/**
 * Batch workflow: ingest every new photo in `folder`, generate content for all
 * of them, and leave them queued as `pending` in drop order. One call handles
 * a 20-photo drop end to end.
 */
export async function runBatch(folder, { source = "dm" } = {}) {
  const ingested = await intakeFolder(folder, { source });
  const generated = await generatePending({ force: false });
  return { ingested, generated };
}

/** Set approval status. Auto-generates captions when approving if needed. */
export async function setStatus(id, status) {
  const store = await getStore();
  const rec = await store.get(id);
  if (!rec) throw new Error(`No submission ${id}`);

  if (status === "approved" && !isGenerated(rec)) {
    await generateFor(id);
  }
  const updated = await store.update(id, { approval_status: status });

  // On approval, drop a fresh content pack to disk for convenience.
  if (status === "approved") await exportPack(updated);
  return updated;
}

export async function exportApproved() {
  const rows = await listSubmissions("approved");
  const dirs = [];
  for (const r of rows) dirs.push(await exportPack(r));
  return dirs;
}
