// api/audits/import.js — one-time migration of pre-auth localStorage audits
// into the signed-in account. Because client inserts are blocked by RLS, this
// runs server-side. It is migration-only: allowed solely when the account has
// NO audits yet, capped, and logged as 'audit_imported' (not 'audit_created')
// so it never pollutes credit/usage metrics or grants new credits.
//
// POST /api/audits/import  Body: { audits: [...] }  Header: Authorization: Bearer
import { supabaseAdmin, getUserFromRequest } from "../_lib/supabaseAdmin.js";
import { logUsageEvent } from "../_lib/usageServer.js";

const MAX_IMPORT = 25;

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
  const incoming = Array.isArray(body.audits) ? body.audits : [];
  if (!incoming.length) return res.status(200).json({ ok: true, imported: 0 });

  try {
    // Migration only runs into a fresh account.
    const { count } = await supabaseAdmin
      .from("audits")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    if (count && count > 0) return res.status(200).json({ ok: true, imported: 0, reason: "already-has-audits" });

    const rows = incoming
      .filter((a) => a && a.id)
      .slice(0, MAX_IMPORT)
      .map((a) => reportToRow(user.id, a));

    if (!rows.length) return res.status(200).json({ ok: true, imported: 0 });

    const { error } = await supabaseAdmin
      .from("audits")
      .upsert(rows, { onConflict: "user_id,client_id" });
    if (error) {
      console.error("[audits/import] upsert failed", error);
      return res.status(500).json({ error: "import-failed" });
    }

    await logUsageEvent(user.id, "audit_imported", { metadata: { count: rows.length } });
    return res.status(200).json({ ok: true, imported: rows.length });
  } catch (e) {
    console.error("[audits/import]", e);
    return res.status(500).json({ error: "server-error", detail: String(e?.message || e) });
  }
}
