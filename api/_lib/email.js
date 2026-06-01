// api/_lib/email.js — SERVER-ONLY lifecycle email sender (Resend).
//
// sendLifecycleEmail() is the single entry point used by the Stripe webhook,
// the audit-create handler, and the cron sweep. It is deliberately:
//   • idempotent  — a dedupeKey makes repeated calls (cron re-runs, Stripe
//                    retries) send at most once.
//   • non-throwing — email is best-effort; a failure here must NEVER fail an
//                    audit save or cause Stripe to retry the webhook. Callers
//                    can fire-and-forget. Failures land in email_log(status=failed).
//
// Every send is mirrored into the email_log table (pending → sent), and the
// Resend delivery webhook (api/send-report.js) advances it to delivered/opened/
// clicked/bounced/failed.
import { Resend } from "resend";
import { supabaseAdmin } from "./supabaseAdmin.js";
import { renderTemplate } from "./emailTemplates.js";

const FROM = process.env.RESEND_FROM || "Preset & Profit <notifications@presetprofit.com>";

let _resend = null;
function client() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!_resend) _resend = new Resend(key);
  return _resend;
}

async function markFailed(rowId, error) {
  if (!rowId) return;
  try {
    await supabaseAdmin.from("email_log").update({ status: "failed", error: String(error).slice(0, 500) }).eq("id", rowId);
  } catch { /* best-effort */ }
}

/**
 * Send one lifecycle email.
 * @param {object} o
 * @param {string} o.to          recipient email (required)
 * @param {string} o.template    key in emailTemplates.TEMPLATES (required)
 * @param {object} [o.data]      template data
 * @param {string} [o.userId]    Supabase user id (for the log + admin views)
 * @param {string} [o.dedupeKey] idempotency key; at most one non-failed send per key
 * @param {string} [o.orgId]     reserved (Phase 3 multi-tenant)
 * @param {boolean}[o.force]     bypass the dedupe skip (admin manual resend)
 * @returns {Promise<{ok:boolean, skipped?:boolean, id?:string, error?:string}>}
 */
export async function sendLifecycleEmail({ to, template, data = {}, userId = null, dedupeKey = null, orgId = null, force = false }) {
  if (!to || !template) return { ok: false, error: "missing-to-or-template" };

  // 1. Idempotency — find a prior attempt for this dedupe key.
  let reuseRowId = null;
  if (dedupeKey) {
    try {
      const { data: existing } = await supabaseAdmin
        .from("email_log")
        .select("id, status")
        .eq("dedupe_key", dedupeKey)
        .maybeSingle();
      if (existing) {
        // Already sent/delivered/etc → skip. Only a previously FAILED send is
        // retried (we reuse its row, since dedupe_key is UNIQUE).
        if (existing.status !== "failed" && !force) return { ok: true, skipped: true };
        reuseRowId = existing.id;
      }
    } catch { /* fall through and attempt the send */ }
  }

  // 2. Render the template.
  let rendered;
  try {
    rendered = renderTemplate(template, data);
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }

  // 3. Insert (or reuse) the pending log row.
  let rowId = reuseRowId;
  try {
    if (rowId) {
      await supabaseAdmin.from("email_log")
        .update({ status: "pending", error: null, to_email: to, template, subject: rendered.subject, user_id: userId, org_id: orgId })
        .eq("id", rowId);
    } else {
      const { data: row, error } = await supabaseAdmin.from("email_log")
        .insert({ to_email: to, template, subject: rendered.subject, status: "pending", user_id: userId, org_id: orgId, dedupe_key: dedupeKey, metadata: data || null })
        .select("id")
        .single();
      if (error) {
        // A unique-violation here means a concurrent send already claimed the
        // dedupe key — treat as skipped (someone else is sending it).
        if (error.code === "23505") return { ok: true, skipped: true };
        return { ok: false, error: error.message };
      }
      rowId = row.id;
    }
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }

  // 4. Send via Resend.
  const resend = client();
  if (!resend) {
    await markFailed(rowId, "resend-not-configured (RESEND_API_KEY missing)");
    return { ok: false, error: "resend-not-configured" };
  }
  try {
    const { data: sent, error } = await resend.emails.send({
      from: FROM,
      to,
      subject: rendered.subject,
      html: rendered.html,
    });
    if (error) {
      await markFailed(rowId, error.message || JSON.stringify(error));
      return { ok: false, error: error.message || "resend-error" };
    }
    const messageId = sent?.id || null;
    await supabaseAdmin.from("email_log")
      .update({ status: "sent", provider_message_id: messageId })
      .eq("id", rowId);
    return { ok: true, id: messageId };
  } catch (e) {
    await markFailed(rowId, e?.message || String(e));
    return { ok: false, error: String(e?.message || e) };
  }
}

// Small formatting helpers shared by trigger sites (kept here so callers stay tidy).
export function formatCents(amountCents, currency = "usd") {
  if (!Number.isFinite(amountCents)) return null;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(amountCents / 100);
  } catch {
    return `$${(amountCents / 100).toFixed(2)}`;
  }
}

export function formatDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return null;
  }
}
