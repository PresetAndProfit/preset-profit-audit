// src/sheets.js — Google Sheets adapter. Lazy-loads `googleapis` so the engine
// still runs (on the local store) even before `npm install`.
// Same interface as localStore: init/list/get/insert/update + ensureHeader.
import fs from "node:fs/promises";
import { CONFIG } from "./env.js";
import { COLUMNS, shape } from "./schema.js";

async function getSheetsClient() {
  let google;
  try {
    ({ google } = await import("googleapis"));
  } catch {
    throw new Error("googleapis not installed — run `npm install` in content-engine/ to enable Sheets.");
  }

  let credentials;
  if (CONFIG.googleServiceAccountJson) {
    // Inline JSON key (starts with "{") or a path to a .json file.
    const raw = CONFIG.googleServiceAccountJson.trim();
    const json = raw.startsWith("{") ? raw : await fs.readFile(raw, "utf8");
    credentials = JSON.parse(json);
    if (credentials.private_key) credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
  } else if (CONFIG.googleClientEmail && CONFIG.googlePrivateKey) {
    credentials = { client_email: CONFIG.googleClientEmail, private_key: CONFIG.googlePrivateKey };
  } else if (CONFIG.googleCredsFile) {
    credentials = JSON.parse(await fs.readFile(CONFIG.googleCredsFile, "utf8"));
  } else {
    throw new Error("No Google credentials configured.");
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth: await auth.getClient() });
}

const A1_TAB = (tab) => `'${tab.replace(/'/g, "''")}'`;

function rowToRecord(headerRow, row) {
  const rec = {};
  headerRow.forEach((h, i) => (rec[h] = row[i] ?? ""));
  return shape(rec);
}

export async function createSheetsStore() {
  const sheets = await getSheetsClient();
  const spreadsheetId = CONFIG.sheetId;
  const tab = CONFIG.sheetTab;

  async function readGrid() {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${A1_TAB(tab)}!A1:ZZ`,
    });
    return res.data.values || [];
  }

  const store = {
    kind: "google-sheets",
    columns: COLUMNS,
    spreadsheetId,
    tab,

    async init() {
      await store.ensureHeader();
    },

    /** Create the tab if missing and write/repair the header row. */
    async ensureHeader() {
      const meta = await sheets.spreadsheets.get({ spreadsheetId });
      const exists = (meta.data.sheets || []).some((s) => s.properties.title === tab);
      if (!exists) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: { requests: [{ addSheet: { properties: { title: tab } } }] },
        });
      }
      const grid = await readGrid();
      const header = grid[0] || [];
      const matches = COLUMNS.every((c, i) => header[i] === c);
      if (!matches) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${A1_TAB(tab)}!A1`,
          valueInputOption: "RAW",
          requestBody: { values: [COLUMNS] },
        });
      }
      return COLUMNS;
    },

    async list() {
      const grid = await readGrid();
      if (grid.length < 2) return [];
      const header = grid[0];
      return grid.slice(1).filter((r) => r.length).map((r) => rowToRecord(header, r));
    },

    async get(id) {
      const rows = await store.list();
      return rows.find((r) => r.submission_id === id) || null;
    },

    async insert(record) {
      const rec = shape(record);
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${A1_TAB(tab)}!A1`,
        valueInputOption: "RAW",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: [COLUMNS.map((c) => rec[c])] },
      });
      return rec;
    },

    async update(id, patch) {
      const grid = await readGrid();
      if (grid.length < 2) return null;
      const header = grid[0];
      const idCol = header.indexOf("submission_id");
      const rowIdx = grid.findIndex((r, i) => i > 0 && r[idCol] === id);
      if (rowIdx === -1) return null;
      const merged = shape({ ...rowToRecord(header, grid[rowIdx]), ...patch });
      const sheetRow = rowIdx + 1; // 1-based, header is row 1
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${A1_TAB(tab)}!A${sheetRow}`,
        valueInputOption: "RAW",
        requestBody: { values: [COLUMNS.map((c) => merged[c])] },
      });
      return merged;
    },
  };

  return store;
}
