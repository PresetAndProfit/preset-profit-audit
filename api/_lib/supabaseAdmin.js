// api/_lib/supabaseAdmin.js — SERVER-ONLY Supabase client (service-role key).
// Bypasses Row Level Security. Import this ONLY inside /api serverless
// functions. It must never reach the browser bundle, so it reads non-VITE_
// env vars that Vite does not expose to the client.
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  // Functions that need it will throw clearly rather than make silent,
  // unauthenticated calls.
  console.warn("[supabaseAdmin] Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
}

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Resolve the user from the Authorization: Bearer <access_token> header so
// serverless metering can attribute actions to the signed-in user.
export async function getUserFromRequest(req) {
  const auth = req.headers?.authorization || req.headers?.Authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error) return null;
  return data.user ?? null;
}
