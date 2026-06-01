// api/audits/create.js — the ONLY way to persist an audit. RLS blocks client
// inserts into the audits table, so this server endpoint (service-role) is the
// single chokepoint where the per-plan credit limit is enforced. A free user
// gets exactly 1 audit; this cannot be bypassed from the browser.
//
// POST /api/audits/create  Body: { audit }  Header: Authorization: Bearer <token>
import { supabaseAdmin, getUserFromRequest } from "../_lib/supabaseAdmin.js";
import { assertCanCreateAudit, enforceAuditLimitForClient, logUsageEvent } from "../_lib/usageServer.js";
import { isDisabled } from "../_lib/systemSettings.js";
import { isAdminEmail } from "../_lib/adminAuth.js";
import { onAuditComplete } from "../_lib/lifecycleEmails.js";
import { effectivePlan } from "../../src/lib/plans.js";
import { STAGE_KEYS } from "../../src/lib/dealEngine.js";

const VALID_STAGES = new Set(STAGE_KEYS);

// Build a whitelisted column patch from a client deal_update. NEVER trusts
// user_id/data/credit fields — only pipeline columns are writable, and stage is
// constrained to the known vocabulary. Returns null if nothing valid was sent.
function sanitizeDealPatch(patch) {
  if (!patch || typeof patch !== "object") return null;
  const out = {};
  if (typeof patch.stage === "string" && VALID_STAGES.has(patch.stage)) out.stage = patch.stage;
  if (patch.next_action_at === null || typeof patch.next_action_at === "string") out.next_action_at = patch.next_action_at || null;
  if (patch.last_contact_at === null || typeof patch.last_contact_at === "string") out.last_contact_at = patch.last_contact_at || null;
  if (patch.deal_value_cents === null || Number.isFinite(patch.deal_value_cents)) out.deal_value_cents = patch.deal_value_cents ?? null;
  if (patch.contact_email === null || typeof patch.contact_email === "string") out.contact_email = patch.contact_email ? String(patch.contact_email).slice(0, 200) : null;
  if (patch.contact_name === null || typeof patch.contact_name === "string") out.contact_name = patch.contact_name ? String(patch.contact_name).slice(0, 200) : null;
  if (patch.crm && typeof patch.crm === "object" && !Array.isArray(patch.crm)) out.crm = patch.crm;
  return Object.keys(out).length ? out : null;
}

function reportToRow(userId, audit) {
  return {
    user_id: userId,
    client_id: String(audit.id),
    business_name: audit.businessName ?? null,
    url: audit.website ?? null,
    overall_score: Number.isFinite(audit.overallScore) ? audit.overallScore : null,
    data: audit,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method-not-allowed" });

  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};

  // ── Deal/CRM update path ──────────────────────────────────────────────────
  // Reuses this endpoint (no new serverless function) to mutate pipeline columns
  // on the caller's OWN audit row. Strictly user-scoped, no credit check, no
  // audit creation. This branch can never mint an audit or bypass tier gating —
  // it only UPDATEs existing rows matched by (user_id, client_id).
  if (body.op === "deal_update") {
    const clientId = body.clientId != null ? String(body.clientId) : "";
    const patch = sanitizeDealPatch(body.patch);
    if (!clientId || !patch) return res.status(400).json({ error: "invalid-deal-update" });
    try {
      const { data, error } = await supabaseAdmin
        .from("audits")
        .update(patch)
        .eq("user_id", user.id)
        .eq("client_id", clientId)
        .select("id")
        .maybeSingle();
      if (error) {
        console.error("[audits/create] deal_update failed", error);
        return res.status(500).json({ error: "deal-update-failed" });
      }
      if (!data) return res.status(404).json({ error: "deal-not-found" });
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error("[audits/create] deal_update", e);
      return res.status(500).json({ error: "server-error" });
    }
  }

  // System control: admin can disable audits platform-wide (admins exempt).
  if (!isAdminEmail(user.email) && await isDisabled("audits_disabled")) {
    return res.status(503).json({ error: "audits-disabled" });
  }

  const audit = body.audit;
  if (!audit || typeof audit !== "object" || !audit.id) {
    return res.status(400).json({ error: "invalid-audit" });
  }

  try {
    // Re-saving an EXISTING audit (same client_id) is an update — allowed, and
    // does not consume a new credit. Only a brand-new audit is metered.
    const { data: existing } = await supabaseAdmin
      .from("audits")
      .select("id")
      .eq("user_id", user.id)
      .eq("client_id", String(audit.id))
      .maybeSingle();

    if (!existing) {
      const verdict = await assertCanCreateAudit(user.id);
      if (!verdict.ok) {
        return res.status(402).json({ error: "limit-reached", limit: verdict.limit, used: verdict.used });
      }
    }

    const row = reportToRow(user.id, audit);
    const { data, error } = await supabaseAdmin
      .from("audits")
      .upsert(row, { onConflict: "user_id,client_id" })
      .select("id, data")
      .single();

    if (error) {
      console.error("[audits/create] upsert failed", error);
      return res.status(500).json({ error: "save-failed" });
    }

    // Race guard: the pre-check above is not atomic with the insert, so re-verify
    // after writing. If a concurrent request pushed us over the limit, this drops
    // the row we just created and reports over-limit (only for brand-new audits).
    if (!existing) {
      const reconciled = await enforceAuditLimitForClient(user.id, String(audit.id));
      if (!reconciled.ok) {
        return res.status(402).json({ error: "limit-reached", limit: reconciled.limit });
      }
    }

    if (!existing) {
      await logUsageEvent(user.id, "audit_created", {
        auditId: data?.id ?? null,
        metadata: { client_id: String(audit.id), business: audit.businessName ?? null },
      });

      // Lifecycle: Audit Complete email (only for brand-new audits, deduped by
      // audit id). Best-effort — never fails the save. The upgrade CTA is shown
      // only to users who aren't already on a paid plan.
      const [{ data: profile }, { data: sub }] = await Promise.all([
        supabaseAdmin.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
        supabaseAdmin.from("subscriptions").select("plan, status").eq("user_id", user.id).maybeSingle(),
      ]);
      await onAuditComplete({
        userId: user.id,
        email: user.email,
        fullName: profile?.full_name ?? null,
        auditRowId: data?.id ?? null,
        audit,
        isPaid: effectivePlan(sub)?.id !== "free",
      });
    }

    return res.status(200).json({ ok: true, audit: data?.data ?? audit });
  } catch (e) {
    console.error("[audits/create]", e);
    return res.status(500).json({ error: "server-error", detail: String(e?.message || e) });
  }
}
