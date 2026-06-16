// src/localStore.js — zero-dependency JSON-file store.
// Same interface as the Sheets adapter so the rest of the app is storage-agnostic.
import fs from "node:fs/promises";
import { PATHS } from "./env.js";
import { COLUMNS, shape } from "./schema.js";

async function readAll() {
  try {
    const raw = await fs.readFile(PATHS.dbFile, "utf8");
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.map(shape) : [];
  } catch (e) {
    if (e.code === "ENOENT") return [];
    throw e;
  }
}

async function writeAll(rows) {
  await fs.mkdir(PATHS.data, { recursive: true });
  await fs.writeFile(PATHS.dbFile, JSON.stringify(rows, null, 2), "utf8");
}

export function createLocalStore() {
  return {
    kind: "local-json",
    columns: COLUMNS,

    async init() {
      await fs.mkdir(PATHS.data, { recursive: true });
    },

    async list() {
      return readAll();
    },

    async get(id) {
      const rows = await readAll();
      return rows.find((r) => r.submission_id === id) || null;
    },

    async insert(record) {
      const rows = await readAll();
      const rec = shape(record);
      rows.push(rec);
      await writeAll(rows);
      return rec;
    },

    async update(id, patch) {
      const rows = await readAll();
      const i = rows.findIndex((r) => r.submission_id === id);
      if (i === -1) return null;
      rows[i] = shape({ ...rows[i], ...patch });
      await writeAll(rows);
      return rows[i];
    },
  };
}
