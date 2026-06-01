// api/_lib/adminAuth.js — SERVER-ONLY. The single gate for every admin endpoint.
// A request is admin IFF the authenticated user's profile.is_admin is true OR
// their email is in the ADMIN_EMAILS allowlist (always includes the owner).
import { supabaseAdmin, getUserFromRequest } from "./supabaseAdmin.js";

// Configurable via env (comma-separated); the owner is always included so the
// console is reachable even before profiles.is_admin is set.
export const ADMIN_EMAILS = new Set(
  ["justin@presetprofit.com", ...String(process.env.ADMIN_EMAILS || "").split(",")]
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

export function isAdminEmail(email) {
  return !!email && ADMIN_EMAILS.has(String(email).toLowerCase());
}

// Returns the user object when the caller is an admin, otherwise null.
export async function requireAdmin(req) {
  const user = await getUserFromRequest(req);
  if (!user) return null;
  if (isAdminEmail(user.email)) return user;
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  return data?.is_admin ? user : null;
}
