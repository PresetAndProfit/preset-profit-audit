// src/sources/index.js — intake adapter registry + orchestrator.
//
//   Source (adapter.pull) → normalize → dedupe → Submission Queue (pending)
//
// Every adapter returns raw items; createSubmission normalizes + dedupes +
// inserts them, so all current and future sources feed exactly one queue and
// the approval workflow downstream never changes.
import folder from "./localFolder.js";
import url from "./manualUrl.js";
import tagged from "./taggedPosts.js";
import mentions from "./mentions.js";
import dm from "./dm.js";
import { createSubmission } from "../intake.js";

export const ADAPTERS = { folder, url, tagged, mentions, dm };

export function listAdapters() {
  return Object.values(ADAPTERS).map((a) => ({ id: a.id, label: a.label, source: a.source }));
}

/**
 * Pull from one adapter ("folder"/"url"/"tagged"/"mentions"/"dm") or "all".
 * Returns { created: [...records], duplicates: n } — order preserved per source.
 */
export async function pull(id = "all", opts = {}) {
  const ids = !id || id === "all" ? Object.keys(ADAPTERS) : [id];
  const created = [];
  let duplicates = 0;
  for (const k of ids) {
    const adapter = ADAPTERS[k];
    if (!adapter) throw new Error(`Unknown source "${k}". Options: ${Object.keys(ADAPTERS).join(", ")}, all`);
    const raws = await adapter.pull(opts);
    for (const raw of raws) {
      const rec = await createSubmission(raw, { fallbackSource: adapter.source, runVision: true });
      if (rec) created.push({ ...rec, _source_adapter: adapter.id });
      else duplicates++;
    }
  }
  return { created, duplicates };
}
