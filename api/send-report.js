// api/send-report.js — INBOUND HOOKS endpoint (consolidated, no new function).
//
// Historically a stub for outbound report email; repurposed in Phase 1 as the
// single public inbound surface so we stay within the 12-function Hobby limit.
// Outbound lifecycle email is sent server-side from existing handlers via
// api/_lib/email.js — this endpoint only RECEIVES:
//
//   1. Resend delivery webhook  — Svix-signed events (delivered/opened/clicked/
//      bounced/complained/failed) that advance the matching email_log row.
//   2. { action: 'cron' }       — token-guarded daily sweep (trial-ending 3d/1d
//      + re-engagement), triggered by Supabase pg_cron (see database/phase1-email.sql).
//
// (Phase 3 will add { action:'widget_submit' } here.)
import crypto from "node:crypto";
import { supabaseAdmin } from "./_lib/supabaseAdmin.js";
import { runDailySweep } from "./_lib/lifecycleEmails.js";

// Read the raw body so we can (a) verify the Svix signature and (b) parse JSON
// ourselves. Vercel's body parser is disabled for this reason.
export const config = { api: { bodyParser: false } };

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function timingSafeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

// Verify a Resend (Svix) webhook signature against the raw payload.
// secret format: "whsec_<base64>". signed content: "<id>.<timestamp>.<body>".
function verifyResendSignature(rawBody, headers, secret) {
  const id = headers["svix-id"];
  const timestamp = headers["svix-timestamp"];
  const signatureHeader = headers["svix-signature"];
  if (!id || !timestamp || !signatureHeader || !secret) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const signed = `${id}.${timestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", key).update(signed).digest("base64");
  // Header is space-delimited "v1,<sig> v1,<sig2>"; accept if any version matches.
  return signatureHeader.split(" ").some((part) => {
    const sig = part.includes(",") ? part.split(",")[1] : part;
    return timingSafeEqual(sig, expected);
  });
}

// Advance an email_log row from a Resend delivery event. The positive funnel
// (sent→delivered→opened→clicked) is forward-only; bounce/complaint/failure are
// terminal and always override.
const RANK = { pending: 0, sent: 1, delivered: 2, opened: 3, clicked: 4 };
const EVENT_MAP = {
  "email.sent":            { status: "sent" },
  "email.delivered":       { status: "delivered", at: "delivered_at" },
  "email.opened":          { status: "opened", at: "opened_at" },
  "email.clicked":         { status: "clicked", at: "clicked_at" },
  "email.bounced":         { status: "bounced", terminal: true },
  "email.complained":      { status: "complained", terminal: true },
  "email.failed":          { status: "failed", terminal: true },
};

async function applyDeliveryEvent(event) {
  const type = event?.type;
  const messageId = event?.data?.email_id || event?.data?.id || null;
  const m = EVENT_MAP[type];
  if (!m || !messageId) return; // ignore unrelated events (e.g. delivery_delayed)
  const { data: row } = await supabaseAdmin
    .from("email_log")
    .select("id, status")
    .eq("provider_message_id", messageId)
    .maybeSingle();
  if (!row) return;
  const patch = {};
  if (m.at) patch[m.at] = new Date().toISOString();
  if (m.terminal || (RANK[m.status] ?? 99) > (RANK[row.status] ?? -1)) patch.status = m.status;
  if (Object.keys(patch).length) await supabaseAdmin.from("email_log").update(patch).eq("id", row.id);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method-not-allowed" });

  const raw = await readRawBody(req);

  // ── 1. Resend delivery webhook (Svix-signed) ───────────────────────────────
  if (req.headers["svix-signature"]) {
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (!secret) return res.status(500).json({ error: "webhook-not-configured" });
    if (!verifyResendSignature(raw, req.headers, secret)) {
      return res.status(401).json({ error: "invalid-signature" });
    }
    try {
      const event = JSON.parse(raw || "{}");
      await applyDeliveryEvent(event);
      return res.status(200).json({ received: true });
    } catch (e) {
      console.error("[send-report] delivery-event error", e);
      return res.status(200).json({ received: true }); // ack so Resend won't hammer retries
    }
  }

  // ── 2. Token-guarded cron sweep ────────────────────────────────────────────
  let body;
  try { body = JSON.parse(raw || "{}"); } catch { return res.status(400).json({ error: "bad-json" }); }

  if (body.action === "cron") {
    const secret = process.env.CRON_SECRET;
    if (!secret || !body.secret || !timingSafeEqual(body.secret, secret)) {
      return res.status(401).json({ error: "unauthorized" });
    }
    try {
      const counts = await runDailySweep();
      return res.status(200).json({ ok: true, counts });
    } catch (e) {
      console.error("[send-report] cron sweep failed", e);
      return res.status(500).json({ error: "sweep-failed", detail: String(e?.message || e) });
    }
  }

  return res.status(400).json({ error: "unknown-request" });
}
