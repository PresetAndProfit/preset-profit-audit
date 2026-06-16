// src/setup.js — turns the engine from a local demo into a setup-ready tool.
//
//   • collectStatus()    → structured "what's connected?" snapshot (CLI + /setup)
//   • runSetup()         → interactive wizard that writes .env
//   • runIntakeManual()  → guided manual Instagram import (no API needed)
//   • read/merge/write .env helpers that PRESERVE existing keys + comments
//
// Nothing here imports the AI/vision pipeline at module load, so `setup` and
// `setup-status` stay fast and work even before `npm install`.
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { PATHS, CONFIG } from "./env.js";
import { getProfile, listProfiles, hasProfile } from "../profiles/index.js";

const ENV_PATH = path.join(PATHS.root, ".env");

/* ─────────────────────────── .env read / write ─────────────────────────── */

/** Parse a .env file into a plain { KEY: value } map (best-effort, no eval). */
export async function parseEnvFile(file = ENV_PATH) {
  let text = "";
  try {
    text = await fs.readFile(file, "utf8");
  } catch {
    return {};
  }
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

/**
 * Quote a value only when it needs it, in a form Node's `loadEnvFile` reads back
 * unchanged. Single quotes are literal in dotenv (so Windows paths like
 * `C:\Users\me\key.json` survive); double quotes (with \n) are reserved for
 * multi-line secrets such as a pasted private key.
 */
function formatEnvValue(v) {
  const s = String(v ?? "");
  if (s === "") return "";
  if (!/[\s#"'=]/.test(s)) return s; // safe bare token (most keys/ids)
  if (/[\r\n]/.test(s)) return JSON.stringify(s); // multi-line → double-quote with escapes
  if (!s.includes("'")) return `'${s}'`; // literal single-quote (preserves backslashes)
  return JSON.stringify(s); // contains a single quote → fall back to double-quote
}

/**
 * Merge { KEY: value } updates into the existing .env, preserving every other
 * line (comments, ordering, unmanaged keys). Existing keys are updated in place;
 * brand-new keys are appended under a "written by setup" header. Returns the path.
 */
export async function updateEnvFile(updates, file = ENV_PATH) {
  let text = "";
  try {
    text = await fs.readFile(file, "utf8");
  } catch {
    /* no .env yet */
  }
  const lines = text.length ? text.split(/\r?\n/) : [];
  const pending = { ...updates };

  const next = lines.map((line) => {
    const m = line.match(/^(\s*)([A-Z0-9_]+)(\s*=).*$/);
    if (m && Object.prototype.hasOwnProperty.call(pending, m[2])) {
      const key = m[2];
      const val = pending[key];
      delete pending[key];
      return `${m[1]}${key}=${formatEnvValue(val)}`;
    }
    return line;
  });

  const leftover = Object.keys(pending);
  if (leftover.length) {
    if (next.length && next[next.length - 1].trim() !== "") next.push("");
    next.push("# ---- written by `node cli.js setup` ----");
    for (const k of leftover) next.push(`${k}=${formatEnvValue(pending[k])}`);
  }

  let result = next.join("\n");
  if (!result.endsWith("\n")) result += "\n";
  await fs.writeFile(file, result, "utf8");
  return file;
}

/* ─────────────────────────────── status ────────────────────────────────── */

/** Is something listening on a local TCP port? (used for "app running?") */
export function isPortOpen(port, host = "127.0.0.1", timeout = 400) {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    const done = (open) => {
      sock.destroy();
      resolve(open);
    };
    sock.setTimeout(timeout);
    sock.once("connect", () => done(true));
    sock.once("timeout", () => done(false));
    sock.once("error", () => done(false));
    sock.connect(port, host);
  });
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * One structured snapshot of everything the user asked `setup-status` to show.
 * Shared by the CLI command and the /setup web page so they never drift.
 */
export async function collectStatus() {
  const profile = getProfile(CONFIG.profileId);
  const [appRunning, envExists] = await Promise.all([isPortOpen(CONFIG.port), exists(ENV_PATH)]);

  const sheets = {
    mode: CONFIG.mode === "sheets",
    sheetId: CONFIG.sheetId,
    tab: CONFIG.sheetTab,
    hasCreds: CONFIG.hasGoogleCreds,
    connected: CONFIG.sheetsEnabled,
  };
  const instagram = {
    mode: CONFIG.mode === "instagram",
    handle: CONFIG.igHandle,
    token: Boolean(CONFIG.igToken),
    businessId: Boolean(CONFIG.igUserId),
    app: Boolean(CONFIG.metaAppId && CONFIG.metaAppSecret),
    connected: CONFIG.igEnabled,
  };
  const ai = {
    anthropic: Boolean(CONFIG.anthropicKey),
    openai: Boolean(CONFIG.openaiKey),
    model: CONFIG.anthropicModel,
    connected: CONFIG.aiConfigured,
  };

  // What's still missing for the chosen mode (most important first).
  const missing = [];
  if (!envExists) missing.push("No .env yet — run `node cli.js setup`.");
  if (sheets.mode) {
    if (!CONFIG.sheetId) missing.push("GSHEET_CONTENT_ID (the spreadsheet id from its URL).");
    if (!CONFIG.hasGoogleCreds) missing.push("GOOGLE_SERVICE_ACCOUNT_JSON (path to / contents of a service-account key).");
  }
  if (instagram.mode) {
    if (!CONFIG.igToken) missing.push("INSTAGRAM_ACCESS_TOKEN (long-lived Graph API token).");
    if (!CONFIG.igUserId) missing.push("INSTAGRAM_BUSINESS_ACCOUNT_ID (IG business/creator account id).");
    if (!instagram.app) missing.push("META_APP_ID + META_APP_SECRET (your Meta developer app).");
  }
  if (!ai.connected) missing.push("ANTHROPIC_API_KEY (optional — template captions are used without it).");

  // The single most useful "do this next".
  let nextStep;
  if (!envExists) {
    nextStep = "Run `node cli.js setup` to create your .env.";
  } else if (sheets.mode && !sheets.connected) {
    nextStep = "Finish Google Sheets: set GSHEET_CONTENT_ID + GOOGLE_SERVICE_ACCOUNT_JSON, then `node cli.js setup-sheet`.";
  } else if (instagram.mode && !instagram.connected) {
    nextStep = "Finish Instagram: add INSTAGRAM_ACCESS_TOKEN + INSTAGRAM_BUSINESS_ACCOUNT_ID (see INSTAGRAM_SETUP.md). You can import manually today with `node cli.js intake-manual`.";
  } else if (!appRunning) {
    nextStep = "Start the dashboard with `node cli.js web`, then open http://localhost:" + CONFIG.port + ".";
  } else {
    nextStep = "You're set. Drop photos in inbox/ and run `node cli.js batch`, or import a post with `node cli.js intake-manual`.";
  }

  return {
    appRunning,
    port: CONFIG.port,
    mode: CONFIG.mode,
    envExists,
    profile: { id: profile.id, name: profile.name, niche: profile.niche },
    storage: CONFIG.sheetsEnabled ? "google-sheets" : "local",
    ai,
    sheets,
    instagram,
    paths: { inbox: PATHS.inbox, exports: PATHS.exports, env: ENV_PATH, dbFile: PATHS.dbFile },
    missing,
    nextStep,
  };
}

/* ─────────────────────────── interactive wizard ────────────────────────── */

async function ask(rl, question, { def = "", secret = false } = {}) {
  const suffix = def ? ` [${secret ? "•".repeat(Math.min(8, def.length)) + " set" : def}]` : "";
  const a = (await rl.question(`${question}${suffix}: `)).trim();
  return a || def;
}

async function choose(rl, question, options) {
  console.log(`\n${question}`);
  options.forEach((o, i) => console.log(`  ${i + 1}) ${o.label}${o.hint ? `  — ${o.hint}` : ""}`));
  while (true) {
    const a = (await rl.question("Choose 1-" + options.length + ": ")).trim();
    const i = Number(a) - 1;
    if (i >= 0 && i < options.length) return options[i].value;
    console.log("  Please enter a number from the list.");
  }
}

/**
 * `node cli.js setup` — friendly wizard. Asks brand/profile, IG handle, mode,
 * AI key(s), and the extra creds the chosen mode needs, then writes .env.
 */
export async function runSetup() {
  const current = await parseEnvFile();
  const rl = readline.createInterface({ input, output });
  try {
    console.log("\n🏁  Preset & Profit — Content OS setup");
    console.log("    Answer a few questions; I'll write everything to .env.");
    console.log("    Press Enter to keep the value shown in [brackets]. Nothing is sent anywhere.\n");

    const updates = {};

    // 1) Brand / profile
    const profiles = listProfiles();
    console.log("Brand profile controls voice, hashtags, and CTA. Available:");
    profiles.forEach((p) => console.log(`  • ${p.id.padEnd(12)} ${p.name} — ${p.niche}`));
    let profileId = await ask(rl, "Profile id", { def: current.CONTENT_PROFILE || CONFIG.profileId });
    if (!hasProfile(profileId)) {
      console.log(`  Unknown profile "${profileId}", keeping b7squad.`);
      profileId = "b7squad";
    }
    updates.CONTENT_PROFILE = profileId;

    // 2) Instagram handle
    updates.INSTAGRAM_HANDLE = (await ask(rl, "Your Instagram handle (no @)", { def: current.INSTAGRAM_HANDLE || CONFIG.igHandle })).replace(/^@/, "");

    // 3) Mode
    const mode = await choose(rl, "How do you want to run it?", [
      { label: "Local only", value: "local", hint: "files on this computer, no accounts (works today)" },
      { label: "Google Sheets", value: "sheets", hint: "store submissions in a shared spreadsheet" },
      { label: "Instagram API", value: "instagram", hint: "auto-pull tagged posts / mentions / DMs" },
    ]);
    updates.CONTENT_MODE = mode;

    // 4) AI keys (optional in every mode)
    console.log("\nAI captions (optional). Leave blank to use the built-in template writer.");
    updates.ANTHROPIC_API_KEY = await ask(rl, "Anthropic / Claude API key", { def: current.ANTHROPIC_API_KEY, secret: true });
    updates.OPENAI_API_KEY = await ask(rl, "OpenAI API key (optional)", { def: current.OPENAI_API_KEY, secret: true });

    // 5) Google Sheets creds
    if (mode === "sheets") {
      console.log("\nGoogle Sheets — paste the spreadsheet id from its URL (the long token between /d/ and /edit).");
      updates.GSHEET_CONTENT_ID = await ask(rl, "Google Sheet ID", { def: current.GSHEET_CONTENT_ID });
      updates.GSHEET_CONTENT_TAB = await ask(rl, "Worksheet / tab name", { def: current.GSHEET_CONTENT_TAB || "Submissions" });
      console.log("Service account: download a JSON key from Google Cloud and share the sheet with its client_email.");
      updates.GOOGLE_SERVICE_ACCOUNT_JSON = await ask(rl, "Path to service-account .json", { def: current.GOOGLE_SERVICE_ACCOUNT_JSON || "./service-account.json" });
    }

    // 6) Instagram / Meta creds
    if (mode === "instagram") {
      console.log("\nInstagram API needs a Meta developer app + a Business/Creator account linked to a Facebook Page.");
      console.log("Full walkthrough: INSTAGRAM_SETUP.md. You can skip any field and still import manually.");
      updates.INSTAGRAM_ACCESS_TOKEN = await ask(rl, "Instagram access token", { def: current.INSTAGRAM_ACCESS_TOKEN, secret: true });
      updates.INSTAGRAM_BUSINESS_ACCOUNT_ID = await ask(rl, "Instagram business account id", { def: current.INSTAGRAM_BUSINESS_ACCOUNT_ID });
      updates.META_APP_ID = await ask(rl, "Meta app id", { def: current.META_APP_ID });
      updates.META_APP_SECRET = await ask(rl, "Meta app secret", { def: current.META_APP_SECRET, secret: true });
    }

    const file = await updateEnvFile(updates);
    console.log(`\n✓ Saved to ${file}`);
    console.log("  Review what's connected:  node cli.js setup-status");
    if (mode === "sheets") console.log("  Then create the sheet header:  node cli.js setup-sheet");
    if (mode === "instagram") console.log("  Pull from Instagram:  node cli.js intake-pull --source all");
    console.log("  Open the dashboard:  node cli.js web\n");
  } finally {
    rl.close();
  }
}

/* ─────────────────────────── manual IG import ──────────────────────────── */

/**
 * `node cli.js intake-manual` — import one post by hand, no Instagram API.
 * Asks username, source, caption/details, and an image path OR url, then queues
 * it as a pending submission just like every other intake source.
 */
export async function runIntakeManual() {
  const { createSubmission } = await import("./intake.js");
  const rl = readline.createInterface({ input, output });
  try {
    console.log("\n📥  Manual Instagram import — queue one submission by hand.\n");
    const username = (await ask(rl, "Instagram username (no @)")).replace(/^@/, "");

    // tagged_post / dm / manual — "manual" maps to the schema's generic 'upload'.
    const source = await choose(rl, "Where did this come from?", [
      { label: "Tagged post", value: "tagged_post" },
      { label: "DM", value: "dm" },
      { label: "Manual / other", value: "upload" },
    ]);

    const caption = await ask(rl, "Caption / details (optional)");
    const subject = await ask(rl, "Subject (e.g. car model — optional)");
    const descriptor = await ask(rl, "Descriptor (e.g. color — optional)");

    console.log("\nImage: paste a LOCAL file path or an image URL (either is fine, or leave blank).");
    const image = await ask(rl, "Image path or URL");
    const isUrl = /^https?:\/\//i.test(image);

    const raw = {
      source,
      username,
      caption_original: caption,
      subject,
      descriptor,
      details: caption,
      local_image_path: !isUrl && image ? image : "",
      media_url: isUrl ? image : "",
    };

    const rec = await createSubmission(raw, { fallbackSource: source, runVision: Boolean(raw.local_image_path) });
    if (!rec) {
      console.log("\n· Already imported (same image/url) — skipped.\n");
      return;
    }
    console.log(`\n✓ Queued ${rec.submission_id}  @${rec.instagram_username || "?"}  (pending)`);
    console.log(`  Generate captions:  node cli.js generate ${rec.submission_id}`);
    console.log("  Or review in the dashboard:  node cli.js web\n");
  } finally {
    rl.close();
  }
}
