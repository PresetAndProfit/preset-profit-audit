// api/_lib/lifecycleEmails.js — orchestrates WHICH lifecycle email fires for a
// given business event, and resolves the recipient. Keeps the trigger sites
// (stripe/webhook.js, audits/create.js, the send-report cron sweep) thin.
//
// Every function here is best-effort and self-contained: it resolves the
// recipient, picks a dedupe key, and delegates to sendLifecycleEmail (which is
// itself non-throwing). Errors are swallowed so a lifecycle email can never
// break billing sync or an audit save.
import { supabaseAdmin } from "./supabaseAdmin.js";
import { sendLifecycleEmail, formatCents, formatDate } from "./email.js";
import { planForPriceId } from "./stripe.js";
import { getPlan } from "../../src/lib/plans.js";
import { rebuildBenchmarks } from "./intelligence.js";

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

const APP_URL = process.env.APP_URL || "https://app.presetprofit.com";

const firstName = (full) => (full ? String(full).trim().split(/\s+/)[0] : null);
const userIdFromSub = (sub) => sub?.metadata?.supabase_user_id || null;
const customerIdOf = (obj) => (typeof obj?.customer === "string" ? obj.customer : obj?.customer?.id) || null;
const planNameFromSub = (sub) => getPlan(planForPriceId(sub?.items?.data?.[0]?.price?.id))?.name || "your plan";

async function profileById(userId) {
  if (!userId) return {};
  try {
    const { data } = await supabaseAdmin.from("profiles").select("email, full_name").eq("id", userId).maybeSingle();
    return data || {};
  } catch { return {}; }
}

// Resolve { userId, email, full_name } from a Stripe subscription object.
async function recipientFromSub(sub) {
  let userId = userIdFromSub(sub);
  if (!userId) {
    const customerId = customerIdOf(sub);
    if (customerId) {
      try {
        const { data } = await supabaseAdmin.from("subscriptions").select("user_id").eq("stripe_customer_id", customerId).maybeSingle();
        userId = data?.user_id || null;
      } catch { /* ignore */ }
    }
  }
  const profile = await profileById(userId);
  return { userId, email: profile.email || null, full_name: profile.full_name || null };
}

// Resolve { userId, email, full_name, plan } from a Stripe customer id.
async function recipientFromCustomer(customerId) {
  if (!customerId) return {};
  let userId = null, plan = null;
  try {
    const { data } = await supabaseAdmin.from("subscriptions").select("user_id, plan").eq("stripe_customer_id", customerId).maybeSingle();
    userId = data?.user_id || null; plan = data?.plan || null;
  } catch { /* ignore */ }
  const profile = await profileById(userId);
  return { userId, plan, email: profile.email || null, full_name: profile.full_name || null };
}

// ── Trigger: a subscription is (or became) trialing → Trial Started ──────────
export async function onSubscriptionState(sub) {
  try {
    if (sub?.status !== "trialing") return;
    const r = await recipientFromSub(sub);
    if (!r.email) return;
    await sendLifecycleEmail({
      to: r.email, template: "trial_started", userId: r.userId,
      dedupeKey: `trial_started:${sub.id}`,
      data: {
        name: firstName(r.full_name),
        planName: planNameFromSub(sub),
        trialEndsAt: formatDate(sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null),
      },
    });
  } catch { /* best-effort */ }
}

// ── Trigger: an invoice was paid (amount > 0) → Payment Succeeded / receipt ──
export async function onInvoicePaid(invoice) {
  try {
    if (!(invoice?.amount_paid > 0)) return; // skip $0 trial-creation invoices
    const r = await recipientFromCustomer(customerIdOf(invoice));
    const to = invoice.customer_email || r.email;
    if (!to) return;
    await sendLifecycleEmail({
      to, template: "payment_succeeded", userId: r.userId,
      dedupeKey: `payment_succeeded:${invoice.id}`,
      data: {
        name: firstName(r.full_name),
        planName: getPlan(r.plan)?.name || "your plan",
        amount: formatCents(invoice.amount_paid, invoice.currency),
        invoiceUrl: invoice.hosted_invoice_url || null,
      },
    });
  } catch { /* best-effort */ }
}

// ── Trigger: an invoice payment failed → Payment Failed / dunning ────────────
export async function onInvoiceFailed(invoice) {
  try {
    const r = await recipientFromCustomer(customerIdOf(invoice));
    const to = invoice.customer_email || r.email;
    if (!to) return;
    await sendLifecycleEmail({
      to, template: "payment_failed", userId: r.userId,
      dedupeKey: `payment_failed:${invoice.id}`,
      data: {
        name: firstName(r.full_name),
        amount: formatCents(invoice.amount_due, invoice.currency),
        portalUrl: `${APP_URL}/?view=account`,
      },
    });
  } catch { /* best-effort */ }
}

// ── Trigger: subscription deleted → Cancellation + reactivation offer ────────
export async function onSubscriptionCancelled(sub) {
  try {
    const r = await recipientFromSub(sub);
    if (!r.email) return;
    await sendLifecycleEmail({
      to: r.email, template: "subscription_cancelled", userId: r.userId,
      dedupeKey: `cancelled:${sub.id}`,
      data: {
        name: firstName(r.full_name),
        planName: planNameFromSub(sub),
        surveyUrl: `${APP_URL}/?view=account`,
      },
    });
  } catch { /* best-effort */ }
}

// ── Trigger: a brand-new audit was saved → Audit Complete / report delivered ─
// auditRowId is the email_log dedupe anchor (the DB audit id). isPaid suppresses
// the upgrade CTA for users who already pay.
export async function onAuditComplete({ userId, email, fullName, auditRowId, audit, isPaid }) {
  try {
    if (!email) return;
    await sendLifecycleEmail({
      to: email, template: "audit_complete", userId,
      dedupeKey: `audit_complete:${auditRowId || audit?.id}`,
      data: {
        name: firstName(fullName),
        businessName: audit?.businessName || null,
        overallScore: Number.isFinite(audit?.overallScore) ? audit.overallScore : null,
        revenueOpportunity:
          typeof audit?.revenueOpportunity === "number"
            ? formatCents(audit.revenueOpportunity * 100)
            : audit?.revenueOpportunity || null,
        isPaid: !!isPaid,
      },
    });
  } catch { /* best-effort */ }
}

// ── Time-based sweep: Trial-Ending (3d/1d) + Re-engagement ───────────────────
// Called once a day by api/send-report.js ({ action:'cron' }). Idempotent: every
// send carries a dedupe key, so re-running the same day sends nothing new.
// Returns a per-template count summary for the cron response / admin visibility.
async function emailsForUserIds(userIds) {
  const out = {};
  if (!userIds.length) return out;
  try {
    const { data } = await supabaseAdmin.from("profiles").select("id, email, full_name").in("id", userIds);
    for (const p of data || []) out[p.id] = { email: p.email, full_name: p.full_name };
  } catch { /* ignore */ }
  return out;
}

async function trialEndingBatch(template, fromMs, toMs) {
  const { data: subs } = await supabaseAdmin
    .from("subscriptions")
    .select("stripe_subscription_id, user_id, plan, trial_ends_at")
    .eq("status", "trialing")
    .gt("trial_ends_at", new Date(fromMs).toISOString())
    .lte("trial_ends_at", new Date(toMs).toISOString());
  const rows = subs || [];
  const profiles = await emailsForUserIds([...new Set(rows.map((r) => r.user_id))]);
  let sent = 0;
  for (const r of rows) {
    const prof = profiles[r.user_id];
    if (!prof?.email) continue;
    const res = await sendLifecycleEmail({
      to: prof.email,
      template,
      userId: r.user_id,
      dedupeKey: `${template}:${r.stripe_subscription_id || r.user_id}`,
      data: {
        name: firstName(prof.full_name),
        planName: getPlan(r.plan)?.name || "Professional",
        trialEndsAt: formatDate(r.trial_ends_at),
      },
    });
    if (res.ok && !res.skipped) sent++;
  }
  return sent;
}

// ── CRM follow-up sweep ──────────────────────────────────────────────────────
// Growth OS: remind the OPERATOR (deal owner) about deals whose next_action_at is
// due. Deliberately operator-only — we never cold-email prospects from the shared
// domain. Deduped per scheduled date so a given follow-up reminds exactly once.
async function followupBatch() {
  const nowIso = new Date().toISOString();
  const { data: due } = await supabaseAdmin
    .from("audits")
    .select("id, user_id, business_name, contact_email, contact_name, next_action_at, crm")
    .not("next_action_at", "is", null)
    .lte("next_action_at", nowIso)
    .not("stage", "in", "(closed_won,closed_lost)")
    .order("next_action_at", { ascending: true })
    .limit(200);
  const rows = due || [];
  if (!rows.length) return 0;
  const profiles = await emailsForUserIds([...new Set(rows.map((r) => r.user_id))]);
  let sent = 0;
  for (const r of rows) {
    const prof = profiles[r.user_id];
    if (!prof?.email) continue;
    const dayTag = String(r.next_action_at).slice(0, 10); // dedupe per scheduled day
    const notes = Array.isArray(r.crm?.notes) ? r.crm.notes : [];
    const res = await sendLifecycleEmail({
      to: prof.email,
      template: "followup_reminder",
      userId: r.user_id,
      dedupeKey: `followup:${r.id}:${dayTag}`,
      data: {
        name: firstName(prof.full_name),
        businessName: r.business_name,
        contactName: r.contact_name,
        contactEmail: r.contact_email,
        when: formatDate(r.next_action_at),
        note: notes.length ? notes[notes.length - 1].text : null,
      },
    });
    if (res.ok && !res.skipped) sent++;
  }
  return sent;
}

// ── Activation nudge sequence (Audit → Booked Call) ──────────────────────────
// 3 prospect-facing touches (immediate via onActivationStart, then 24h + 7d via
// the cron). Personalized from the deal's audit + the operator's booking link.
// Idempotent per step (dedupe key); stops the moment the deal is booked/closed.
const ACTIVATION_TEMPLATES = ["activation_immediate", "activation_24h", "activation_7d"];

function activationDataFor(auditRow, profile) {
  const data = auditRow.data || {};
  return {
    name: firstName(auditRow.contact_name),
    businessName: auditRow.business_name || data.businessName || "your business",
    score: Number.isFinite(data.overallScore) ? data.overallScore : null,
    revenueOpportunity: data.revenueOpportunity || data.totalMonthlyOpportunity || null,
    bookingUrl: profile?.calendar_url || null,
    senderCompany: profile?.company_name || "Preset & Profit",
  };
}

// Persist that a step was sent into the deal's crm.activation.sent (client-
// readable, so the CRM can show "sent N/3" without reading the service-role log).
async function recordActivationSent(auditId, step) {
  try {
    const { data: row } = await supabaseAdmin.from("audits").select("crm").eq("id", auditId).maybeSingle();
    const crm = row?.crm || {};
    const activation = crm.activation || {};
    activation.sent = { ...(activation.sent || {}), [String(step)]: new Date().toISOString() };
    await supabaseAdmin.from("audits").update({ crm: { ...crm, activation } }).eq("id", auditId);
  } catch { /* best-effort */ }
}

async function sendActivationStep(auditRow, profile, step) {
  const to = auditRow.contact_email;
  const bookingUrl = profile?.calendar_url;
  if (!to || !bookingUrl) return { ok: false, skipped: true }; // can't drive a booking
  const res = await sendLifecycleEmail({
    to,
    template: ACTIVATION_TEMPLATES[step],
    userId: auditRow.user_id,
    dedupeKey: `activation:${auditRow.id}:${step}`,
    data: activationDataFor(auditRow, profile),
  });
  if (res.ok && !res.skipped) await recordActivationSent(auditRow.id, step);
  return res;
}

// Immediate touch — fired from api/audits/create.js when the operator arms the
// sequence on a deal.
export async function onActivationStart(auditRow, profile) {
  try { return await sendActivationStep(auditRow, profile, 0); }
  catch { return { ok: false }; }
}

// Cron pass: send the 24h and 7d reminders for armed, unbooked, open deals.
async function activationBatch() {
  const { data: rows } = await supabaseAdmin
    .from("audits")
    .select("id, user_id, business_name, contact_email, contact_name, data, crm, stage")
    .eq("crm->activation->>enabled", "true")
    .limit(200);
  const list = rows || [];
  if (!list.length) return 0;
  const profById = {};
  const userIds = [...new Set(list.map((r) => r.user_id))];
  try {
    const { data: profs } = await supabaseAdmin.from("profiles").select("id, calendar_url, company_name").in("id", userIds);
    for (const p of profs || []) profById[p.id] = p;
  } catch { /* ignore */ }
  const now = Date.now();
  let sent = 0;
  for (const r of list) {
    const act = r.crm?.activation || {};
    if (act.booked) continue;
    if (r.stage === "closed_won" || r.stage === "closed_lost") continue;
    const profile = profById[r.user_id];
    if (!profile?.calendar_url || !r.contact_email) continue;
    const ageH = (now - new Date(act.startedAt || now).getTime()) / HOUR;
    const sentMap = act.sent || {};
    let res = null;
    if (ageH >= 168 && sentMap["2"] == null) res = await sendActivationStep(r, profile, 2);
    else if (ageH >= 24 && sentMap["1"] == null) res = await sendActivationStep(r, profile, 1);
    if (res?.ok && !res.skipped) sent++;
  }
  return sent;
}

export async function runDailySweep() {
  const counts = { trial_ending_3d: 0, trial_ending_1d: 0, reengagement: 0, followup_reminder: 0, activation: 0, benchmarks: 0 };
  const now = Date.now();

  // V5: refresh the anonymized industry benchmarks from accumulated snapshots.
  // Pure aggregation — collects/structures data, no learning. Best-effort.
  try { const r = await rebuildBenchmarks(); counts.benchmarks = r.benchmarks; } catch { /* ignore */ }

  // Trial ending in ~3 days (48–72h out) and ~1 day (0–24h out).
  try { counts.trial_ending_3d = await trialEndingBatch("trial_ending_3d", now + 48 * HOUR, now + 72 * HOUR); } catch { /* ignore */ }
  try { counts.trial_ending_1d = await trialEndingBatch("trial_ending_1d", now, now + 24 * HOUR); } catch { /* ignore */ }

  // CRM: operator follow-up reminders for due deals.
  try { counts.followup_reminder = await followupBatch(); } catch { /* ignore */ }

  // CRM: activation nudge reminders (24h + 7d) driving Audit → Booked Call.
  try { counts.activation = await activationBatch(); } catch { /* ignore */ }

  // Re-engagement: free-plan users who joined >30d ago and have no audit in the
  // last 30 days. Reuses the admin_usage_overview view (plan + last_audit_at).
  // Deduped per user per calendar month so it's a gentle monthly nudge, capped.
  try {
    const monthTag = new Date(now).toISOString().slice(0, 7); // YYYY-MM
    const staleBefore = now - 30 * DAY;
    const { data: stale } = await supabaseAdmin
      .from("admin_usage_overview")
      .select("user_id, email, full_name, plan, last_audit_at, joined_at")
      .eq("plan", "free")
      .lt("joined_at", new Date(staleBefore).toISOString())
      .limit(200);
    for (const u of stale || []) {
      if (!u.email) continue;
      if (u.last_audit_at && new Date(u.last_audit_at).getTime() >= staleBefore) continue;
      const res = await sendLifecycleEmail({
        to: u.email,
        template: "reengagement",
        userId: u.user_id,
        dedupeKey: `reengagement:${u.user_id}:${monthTag}`,
        data: { name: firstName(u.full_name) },
      });
      if (res.ok && !res.skipped) counts.reengagement++;
    }
  } catch { /* ignore */ }

  return counts;
}
