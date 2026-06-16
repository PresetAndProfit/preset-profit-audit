// src/store.js — pick the storage backend based on config and cache it.
// Google Sheets when fully configured, otherwise the local JSON store.
import { CONFIG } from "./env.js";
import { createLocalStore } from "./localStore.js";

let cached = null;

export async function getStore() {
  if (cached) return cached;

  if (CONFIG.sheetsEnabled) {
    try {
      const { createSheetsStore } = await import("./sheets.js");
      cached = await createSheetsStore();
      await cached.init();
      return cached;
    } catch (e) {
      console.warn(`⚠  Google Sheets unavailable (${e.message}). Falling back to local JSON store.`);
    }
  }

  cached = createLocalStore();
  await cached.init();
  return cached;
}
