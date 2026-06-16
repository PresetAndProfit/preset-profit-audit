// src/env.js — load .env (Node 20.6+ native) and expose resolved config.
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Native .env loader — silent if the file is absent.
try {
  process.loadEnvFile(path.join(ROOT, ".env"));
} catch {
  /* no .env present — that's fine, everything has a default */
}

const env = process.env;

export const PATHS = {
  root: ROOT,
  data: path.join(ROOT, "data"),
  inbox: path.join(ROOT, "inbox"),
  exports: path.join(ROOT, "exports"),
  feeds: path.join(ROOT, "feeds"), // intake adapter queues (one .jsonl per IG source)
  dbFile: path.join(ROOT, "data", "submissions.json"),
};

export const CONFIG = {
  // Active brand profile (niche). Override per-run with the CLI --profile flag.
  profileId: env.CONTENT_PROFILE || "b7squad",

  // Operating mode (set by `node cli.js setup`): local | sheets | instagram.
  // Purely informational — it drives what `setup-status` expects to be wired
  // up. Storage still auto-selects Sheets vs. local from the creds below.
  mode: (env.CONTENT_MODE || "local").toLowerCase(),

  // Brand Instagram handle being run (display only).
  igHandle: (env.INSTAGRAM_HANDLE || "").replace(/^@/, ""),

  // AI caption generation. Generation uses Anthropic/Claude; OPENAI_API_KEY is
  // accepted and stored for future use. Without any key, the template engine runs.
  anthropicKey: env.ANTHROPIC_API_KEY || "",
  anthropicModel: env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
  openaiKey: env.OPENAI_API_KEY || "",
  get aiEnabled() {
    return Boolean(this.anthropicKey);
  },
  // True if ANY AI provider key is present (used by setup-status display).
  get aiConfigured() {
    return Boolean(this.anthropicKey || this.openaiKey);
  },

  // Google Sheets
  sheetId: env.GSHEET_CONTENT_ID || "",
  sheetTab: env.GSHEET_CONTENT_TAB || "Submissions",
  // GOOGLE_SERVICE_ACCOUNT_JSON may be an inline JSON key or a path to a .json file.
  googleServiceAccountJson: env.GOOGLE_SERVICE_ACCOUNT_JSON || "",
  googleCredsFile: env.GOOGLE_APPLICATION_CREDENTIALS || "",
  googleClientEmail: env.GOOGLE_CLIENT_EMAIL || "",
  googlePrivateKey: (env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  get hasGoogleCreds() {
    return Boolean(this.googleServiceAccountJson || this.googleCredsFile || (this.googleClientEmail && this.googlePrivateKey));
  },
  get sheetsEnabled() {
    return Boolean(this.sheetId && this.hasGoogleCreds);
  },

  // Instagram intake (optional). When a token + business account id are present,
  // the tagged/mentions/dm adapters can poll the Graph API; otherwise they read
  // the local feed queues. New INSTAGRAM_*/META_* names take precedence; the
  // legacy IG_* names are still honored for older .env files.
  igToken: env.INSTAGRAM_ACCESS_TOKEN || env.IG_ACCESS_TOKEN || "",
  igUserId: env.INSTAGRAM_BUSINESS_ACCOUNT_ID || env.IG_USER_ID || "",
  metaAppId: env.META_APP_ID || "",
  metaAppSecret: env.META_APP_SECRET || "",
  get igEnabled() {
    return Boolean(this.igToken && this.igUserId);
  },

  // Content calendar (Phase 3)
  scheduleTime: env.SCHEDULE_TIME || "18:00", // local HH:MM for auto-scheduled slots
  schedulePerDay: Number(env.SCHEDULE_PER_DAY) || 1,

  // Web
  port: Number(env.PORT) || 4317,
};
