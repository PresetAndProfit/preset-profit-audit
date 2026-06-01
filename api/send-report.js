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
import { scanSite } from "../src/lib/siteAnalyzer.js";
import { safeFetchPage, validateUrl } from "./_lib/safeFetch.js";
import { generateAudit } from "../src/lib/auditEngine.js";
import { logUsageEvent, clientIp } from "./_lib/usageServer.js";
import { sendLifecycleEmail } from "./_lib/email.js";
import { INDUSTRIES, GOALS } from "../src/lib/constants.js";

// ── Public Instant Audit Funnel (top-of-funnel acquisition) ──────────────────
// Unauthenticated lead-gen handled HERE (the public inbound hook) so we add ZERO
// serverless functions. A prospect submits a URL → server scans (SSRF-safe, no
// AI) and returns a deterministic audit + an HMAC; on email capture the audit is
// persisted as a CRM Deal owned by the funnel owner and a summary email is sent.
const FUNNEL_OWNER = process.env.FUNNEL_OWNER_USER_ID || null;
const FUNNEL_SECRET = process.env.PUBLIC_FUNNEL_SECRET || process.env.CRON_SECRET || null;
const PUBLIC_LIMITS = { perIpHour: 5, perIpDay: 20, globalDay: 500 };
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com", "temp-mail.org",
  "yopmail.com", "trashmail.com", "sharklasers.com", "getnada.com", "dispostable.com",
  "maildrop.cc", "throwawaymail.com", "fakeinbox.com", "mailnesia.com", "mintemail.com",
]);

const validEmail = (e) => typeof e === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 254;
const isDisposable = (e) => DISPOSABLE_DOMAINS.has(String(e).split("@")[1] || "");
const normalizeUrl = (u) => (/^https?:\/\//i.test(u) ? u : `https://${u}`);

function hostnameToName(url) {
  try {
    const host = new URL(normalizeUrl(url)).hostname.replace(/^www\./, "");
    const sld = host.split(".")[0] || host;
    return sld.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  } catch { return null; }
}

// Bind the persisted lead to a real, recent scan: HMAC over the full report hash
// + timestamp. Any tampering or a stale (>1h) token is rejected at capture time.
function reportHash(report) { return crypto.createHash("sha256").update(JSON.stringify(report)).digest("hex"); }
function signScan(report, ts) { return crypto.createHmac("sha256", FUNNEL_SECRET).update(`${reportHash(report)}.${ts}`).digest("hex"); }
function verifyScan(report, ts, sig) {
  if (!FUNNEL_SECRET || !report || typeof report !== "object" || !ts || !sig) return false;
  if (!Number.isFinite(Number(ts)) || Math.abs(Date.now() - Number(ts)) > 60 * 60 * 1000) return false;
  try { return timingSafeEqual(sig, signScan(report, ts)); } catch { return false; }
}

// Per-IP / global rate limiting via usage_events (attributed to the funnel owner,
// filtered by metadata.ip). No new table; reuses the metering log.
async function countPublicEvents(eventType, ip, sinceSeconds) {
  const since = new Date(Date.now() - sinceSeconds * 1000).toISOString();
  let q = supabaseAdmin.from("usage_events").select("id", { count: "exact", head: true })
    .eq("user_id", FUNNEL_OWNER).eq("event_type", eventType).gte("created_at", since);
  if (ip) q = q.eq("metadata->>ip", ip);
  const { count } = await q;
  return count || 0;
}

async function ownerBooking() {
  try {
    const { data } = await supabaseAdmin.from("profiles").select("calendar_url, company_name").eq("id", FUNNEL_OWNER).maybeSingle();
    return { bookingUrl: data?.calendar_url || null, company: data?.company_name || "Preset & Profit" };
  } catch { return { bookingUrl: null, company: "Preset & Profit" }; }
}

const topFindings = (report) => [...(report.leadFindings || []), ...(report.websiteFindings || [])]
  .filter((f) => f.status && f.status !== "good").slice(0, 3).map((f) => f.label);

// Stage 2-3: scan the submitted site and return a deterministic audit + HMAC.
async function handlePublicAudit(body, req, res) {
  if (!FUNNEL_OWNER || !FUNNEL_SECRET) return res.status(503).json({ ok: false, error: "funnel-not-configured" });
  const raw = typeof body.url === "string" ? body.url.trim().slice(0, 2000) : "";
  if (!raw) return res.status(400).json({ ok: false, error: "missing-url" });
  const url = normalizeUrl(raw);
  if (!validateUrl(url).ok) return res.status(400).json({ ok: false, error: "invalid-url" });

  const ip = clientIp(req);
  try {
    const [h, d, g] = await Promise.all([
      countPublicEvents("public_scan", ip, 3600),
      countPublicEvents("public_scan", ip, 86400),
      countPublicEvents("public_scan", null, 86400),
    ]);
    if (h >= PUBLIC_LIMITS.perIpHour || d >= PUBLIC_LIMITS.perIpDay) return res.status(429).json({ ok: false, error: "rate-limited" });
    if (g >= PUBLIC_LIMITS.globalDay) return res.status(429).json({ ok: false, error: "busy" });
  } catch { /* best-effort: fail open on count error */ }
  await logUsageEvent(FUNNEL_OWNER, "public_scan", { metadata: { ip, url } });

  let scan;
  try { scan = await scanSite(url, { fetchPage: safeFetchPage }); }
  catch { return res.status(200).json({ ok: false, error: "scan-failed" }); }

  const form = {
    bizName: (typeof body.bizName === "string" && body.bizName.trim().slice(0, 80)) || hostnameToName(url) || "Your business",
    industry: INDUSTRIES.includes(body.industry) ? body.industry : "Home Services",
    city: typeof body.city === "string" ? body.city.trim().slice(0, 80) : "",
    goal: GOALS.includes(body.goal) ? body.goal : "More Leads",
    tools: "", email: "", url,
  };
  const report = generateAudit(form, scan);
  const ts = Date.now();
  const { bookingUrl, company } = await ownerBooking();
  return res.status(200).json({ ok: true, report, ts, sig: signScan(report, ts), bookingUrl, ownerCompany: company });
}

// Stage 4-6: capture email → create Lead + CRM Deal (funnel owner) → summary email.
async function handlePublicLead(body, req, res) {
  if (!FUNNEL_OWNER || !FUNNEL_SECRET) return res.status(503).json({ ok: false, error: "funnel-not-configured" });
  if (body.hp) return res.status(200).json({ ok: true }); // honeypot — silently drop bots
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!validEmail(email)) return res.status(400).json({ ok: false, error: "invalid-email" });
  if (isDisposable(email)) return res.status(400).json({ ok: false, error: "disposable-email" });
  const { report, ts, sig } = body;
  if (!verifyScan(report, ts, sig)) return res.status(400).json({ ok: false, error: "invalid-or-expired" });

  const ip = clientIp(req);
  try {
    const url = (report.website || "").toLowerCase();
    const bizName = report.businessName || hostnameToName(url) || "New lead";

    // Dedupe: reuse an existing public-funnel Deal for this site (don't spawn dupes).
    const { data: existing } = await supabaseAdmin.from("audits")
      .select("id, client_id").eq("user_id", FUNNEL_OWNER).eq("url", report.website || "")
      .eq("crm->>source", "public_funnel").order("created_at", { ascending: false }).limit(1).maybeSingle();

    let auditDbId;
    if (existing) {
      auditDbId = existing.id;
      await supabaseAdmin.from("audits").update({ contact_email: email }).eq("id", auditDbId);
    } else {
      const row = {
        user_id: FUNNEL_OWNER, client_id: String(report.id),
        business_name: bizName, url: report.website || null,
        overall_score: Number.isFinite(report.overallScore) ? report.overallScore : null,
        data: report, stage: "audit", contact_email: email,
        crm: { source: "public_funnel", activity: [{ at: new Date().toISOString(), type: "lead", detail: "Inbound — public audit funnel" }] },
      };
      const { data: ins, error } = await supabaseAdmin.from("audits").upsert(row, { onConflict: "user_id,client_id" }).select("id").single();
      if (error) { console.error("[public_lead] deal insert", error); return res.status(500).json({ ok: false, error: "save-failed" }); }
      auditDbId = ins?.id;
    }

    // Lead row (dedupe by email + audit).
    const { data: lead } = await supabaseAdmin.from("leads")
      .select("id").eq("user_id", FUNNEL_OWNER).eq("email", email).eq("audit_id", auditDbId).maybeSingle();
    if (!lead) {
      await supabaseAdmin.from("leads").insert({ user_id: FUNNEL_OWNER, email, business_name: bizName, source: "public_funnel", audit_id: auditDbId });
    }
    await logUsageEvent(FUNNEL_OWNER, "public_lead", { auditId: auditDbId, metadata: { ip, email } });

    // Summary email to the prospect (deduped per deal).
    const { bookingUrl, company } = await ownerBooking();
    try {
      await sendLifecycleEmail({
        to: email, template: "public_audit_summary", userId: FUNNEL_OWNER,
        dedupeKey: `public_summary:${auditDbId}`,
        data: {
          businessName: bizName, score: report.overallScore,
          revenueOpportunity: report.revenueOpportunity || report.totalMonthlyOpportunity || null,
          bookingUrl, senderCompany: company, findings: topFindings(report),
        },
      });
    } catch { /* best-effort */ }

    return res.status(200).json({ ok: true, bookingUrl });
  } catch (e) {
    console.error("[public_lead]", e);
    return res.status(500).json({ ok: false, error: "server-error" });
  }
}

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
    .select("id, status, dedupe_key")
    .eq("provider_message_id", messageId)
    .maybeSingle();
  if (!row) return;
  const patch = {};
  if (m.at) patch[m.at] = new Date().toISOString();
  if (m.terminal || (RANK[m.status] ?? 99) > (RANK[row.status] ?? -1)) patch.status = m.status;
  if (Object.keys(patch).length) await supabaseAdmin.from("email_log").update(patch).eq("id", row.id);

  // Activation nudge tracking: mirror opens/clicks back onto the deal so the CRM
  // can show per-deal engagement (email_log is service-role only). The dedupe
  // key carries the auditId + step: 'activation:<auditId>:<step>'.
  if (row.dedupe_key && row.dedupe_key.startsWith("activation:") && (type === "email.opened" || type === "email.clicked")) {
    const [, auditId, step] = row.dedupe_key.split(":");
    const field = type === "email.clicked" ? "clicked" : "opened";
    if (auditId && step != null) {
      try {
        const { data: a } = await supabaseAdmin.from("audits").select("crm").eq("id", auditId).maybeSingle();
        if (a) {
          const crm = a.crm || {};
          const act = crm.activation || {};
          act[field] = { ...(act[field] || {}), [String(step)]: new Date().toISOString() };
          await supabaseAdmin.from("audits").update({ crm: { ...crm, activation: act } }).eq("id", auditId);
        }
      } catch { /* best-effort */ }
    }
  }
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

  // ── 3. Public Instant Audit Funnel (unauthenticated, rate-limited) ─────────
  if (body.action === "public_audit") return handlePublicAudit(body, req, res);
  if (body.action === "public_lead") return handlePublicLead(body, req, res);

  return res.status(400).json({ error: "unknown-request" });
}
