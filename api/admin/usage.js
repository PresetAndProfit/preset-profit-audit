// api/admin/usage.js — admin-only usage dashboard data.
// Requires an authenticated user whose profile.is_admin = true. Reads the
// admin_usage_overview view via the service-role key (the view is revoked from
// anon/authenticated, so it is only ever reachable through this guarded path).
//
// POST /api/admin/usage   Header: Authorization: Bearer <token>
import { supabaseAdmin, getUserFromRequest } from "../_lib/supabaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "method-not-allowed" });
  }

  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });

  // Verify admin (server-side; never trust a client claim).
  const { data: prof } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!prof?.is_admin) return res.status(403).json({ error: "forbidden" });

  try {
    const { data: rows, error } = await supabaseAdmin
      .from("admin_usage_overview")
      .select("*")
      .order("joined_at", { ascending: false })
      .limit(500);
    if (error) {
      console.error("[admin/usage]", error);
      return res.status(500).json({ error: "query-failed" });
    }

    const totals = rows.reduce(
      (acc, r) => {
        acc.users += 1;
        acc.audits += Number(r.total_audits || 0);
        acc.scans30d += Number(r.scans_30d || 0);
        acc.paid += r.plan && r.plan !== "free" ? 1 : 0;
        return acc;
      },
      { users: 0, audits: 0, scans30d: 0, paid: 0 }
    );

    return res.status(200).json({ ok: true, totals, rows });
  } catch (e) {
    console.error("[admin/usage]", e);
    return res.status(500).json({ error: "server-error", detail: String(e?.message || e) });
  }
}
