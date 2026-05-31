// api/audits/create.js — the ONLY way to persist an audit. RLS blocks client
// inserts into the audits table, so this server endpoint (service-role) is the
// single chokepoint where the per-plan credit limit is enforced. A free user
// gets exactly 1 audit; this cannot be bypassed from the browser.
//
// POST /api/audits/create  Body: { audit }  Header: Authorization: Bearer <token>
import { supabaseAdmin, getUserFromRequest } from "../_lib/supabaseAdmin.js";
import { assertCanCreateAudit, logUsageEvent } from "../_lib/usageServer.js";

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
      .select("data")
      .single();

    if (error) {
      console.error("[audits/create] upsert failed", error);
      return res.status(500).json({ error: "save-failed" });
    }

    if (!existing) {
      await logUsageEvent(user.id, "audit_created", {
        auditId: data?.id ?? null,
        metadata: { client_id: String(audit.id), business: audit.businessName ?? null },
      });
    }

    return res.status(200).json({ ok: true, audit: data?.data ?? audit });
  } catch (e) {
    console.error("[audits/create]", e);
    return res.status(500).json({ error: "server-error", detail: String(e?.message || e) });
  }
}
