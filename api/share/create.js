// api/share/create.js — create a public, white-label share link for an audit.
// Auth required, and gated to plans with shareLinks (Agency). The audit must
// belong to the caller. Returns { token, url }.
import { supabaseAdmin, getUserFromRequest } from "../_lib/supabaseAdmin.js";
import { getUserPlan } from "../_lib/usageServer.js";

const APP_URL = process.env.APP_URL || "http://localhost:5173";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method-not-allowed" });

  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });

  const { plan } = await getUserPlan(user.id);
  if (!plan.shareLinks) return res.status(403).json({ error: "upgrade-required", need: "agency" });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const clientId = body.auditId; // the report's client-side id
  if (!clientId) return res.status(400).json({ error: "missing-audit" });

  try {
    // Resolve the audit row and confirm ownership.
    const { data: audit } = await supabaseAdmin
      .from("audits")
      .select("id")
      .eq("user_id", user.id)
      .eq("client_id", String(clientId))
      .maybeSingle();
    if (!audit) return res.status(404).json({ error: "audit-not-found" });

    // Reuse an existing active link if one exists, else create one.
    const { data: existing } = await supabaseAdmin
      .from("shared_reports")
      .select("token")
      .eq("user_id", user.id)
      .eq("audit_id", audit.id)
      .maybeSingle();

    let token = existing?.token;
    if (!token) {
      const { data, error } = await supabaseAdmin
        .from("shared_reports")
        .insert({ user_id: user.id, audit_id: audit.id }) // token defaults server-side
        .select("token")
        .single();
      if (error) {
        console.error("[share/create]", error);
        return res.status(500).json({ error: "share-failed" });
      }
      token = data.token;
    }

    return res.status(200).json({ ok: true, token, url: `${APP_URL}/r/${token}` });
  } catch (e) {
    console.error("[share/create]", e);
    return res.status(500).json({ error: "server-error", detail: String(e?.message || e) });
  }
}
