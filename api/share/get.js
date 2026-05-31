// api/share/get.js — PUBLIC (no auth). Returns a shared audit + the owner's
// white-label branding, looked up by an unguessable token. Reads via the
// service-role key (shared_reports is revoked from anon), and returns only
// safe fields — never the owner's email or account internals.
import { supabaseAdmin } from "../_lib/supabaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "method-not-allowed" });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const token = body.token || req.query?.token;
  if (!token) return res.status(400).json({ error: "missing-token" });

  try {
    const { data: share } = await supabaseAdmin
      .from("shared_reports")
      .select("audit_id, user_id, expires_at")
      .eq("token", String(token))
      .maybeSingle();
    if (!share) return res.status(404).json({ error: "not-found" });

    if (share.expires_at && new Date(share.expires_at).getTime() < Date.now()) {
      return res.status(410).json({ error: "expired" });
    }

    const [{ data: audit }, { data: profile }] = await Promise.all([
      supabaseAdmin.from("audits").select("data").eq("id", share.audit_id).maybeSingle(),
      supabaseAdmin
        .from("profiles")
        .select("company_name, brand_logo_url, brand_color")
        .eq("id", share.user_id)
        .maybeSingle(),
    ]);
    if (!audit) return res.status(404).json({ error: "not-found" });

    const branding = {
      name: profile?.company_name || null,
      logoUrl: profile?.brand_logo_url || null,
      color: profile?.brand_color || null,
    };

    return res.status(200).json({ ok: true, audit: audit.data, branding });
  } catch (e) {
    console.error("[share/get]", e);
    return res.status(500).json({ error: "server-error", detail: String(e?.message || e) });
  }
}
