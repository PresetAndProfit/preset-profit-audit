// profiles/index.js — auto-discovering profile registry.
//
// Adding a niche requires ONLY dropping a `profiles/<name>.js` file that
// `export default`s a profile object. No edits here, no core engine changes.
// Files starting with "_" (helpers) and this index are skipped.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const DEFAULT_PROFILE = "b7squad";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const REGISTRY = {};

const files = fs
  .readdirSync(DIR)
  .filter((f) => f.endsWith(".js") && !f.startsWith("_") && f !== "index.js")
  .sort(); // stable load order

for (const file of files) {
  try {
    const mod = await import(pathToFileURL(path.join(DIR, file)).href);
    const p = mod.default;
    if (p && p.id) REGISTRY[p.id] = p;
    else console.warn(`⚠  profiles/${file} has no default profile export — skipped.`);
  } catch (e) {
    console.warn(`⚠  Failed to load profile ${file}: ${e.message}`);
  }
}

/** Resolve a profile by id, falling back to the default. */
export function getProfile(id) {
  return REGISTRY[id] || REGISTRY[DEFAULT_PROFILE];
}

export function hasProfile(id) {
  return Boolean(REGISTRY[id]);
}

/** Listing for the CLI: [{ id, name, niche }] (default first). */
export function listProfiles() {
  return Object.values(REGISTRY)
    .map((p) => ({ id: p.id, name: p.name, niche: p.niche }))
    .sort((a, b) => (a.id === DEFAULT_PROFILE ? -1 : b.id === DEFAULT_PROFILE ? 1 : a.id.localeCompare(b.id)));
}
