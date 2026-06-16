// src/sources/_igFeed.js — shared backbone for the Instagram intake adapters.
//
// Production seam: a real connector (Graph API poller or webhook receiver) just
// appends one JSON object per line to feeds/<file>. These adapters drain that
// queue into the submission pipeline. When IG_ACCESS_TOKEN is set, this is also
// where a live Graph API pull would slot in (see pollGraphApi below).
import fs from "node:fs/promises";
import path from "node:path";
import { PATHS, CONFIG } from "../env.js";

/** Read newline-delimited JSON items from feeds/<file> (empty if absent). */
export async function readFeed(file) {
  try {
    const text = await fs.readFile(path.join(PATHS.feeds, file), "utf8");
    return text
      .split(/\r?\n/)
      .filter((l) => l.trim())
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Build an IG-source adapter. `endpoint` names the Graph API edge a live
 * connector would hit (documented, not called without a token + review).
 */
export function makeIgAdapter({ id, label, source, file, endpoint }) {
  return {
    id,
    label,
    source,
    endpoint,
    async pull(opts = {}) {
      const items = [];
      if (CONFIG.igToken) {
        // Live polling would call the Graph API `endpoint` here and map results
        // to raw items. Kept token-gated + queue-backed so the pipeline is
        // identical whether items arrive via webhook, poller, or manual feed.
        items.push(...(await pollGraphApi({ endpoint, source }).catch(() => [])));
      }
      items.push(...(await readFeed(file)));
      return items.map((i) => ({ source, ...i }));
    },
  };
}

// Placeholder for a real Graph API poll. Returns [] until wired to a reviewed
// app + token; the feed queue covers ingestion in the meantime.
async function pollGraphApi(/* { endpoint, source } */) {
  return [];
}
