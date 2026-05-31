// src/lib/supabaseClient.js — browser Supabase client (anon key).
// Protected by Row Level Security; safe to ship to the client bundle.
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Surface misconfiguration loudly in dev instead of failing with cryptic
// network errors later. In prod these come from Vercel env vars.
export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.warn(
    "[supabase] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — " +
      "copy .env.example to .env.local and fill them in."
  );
}

// Pass-through lock: by default supabase-js serializes auth operations behind a
// Web Locks (navigator.locks) lock. In production that lock can deadlock —
// getSession() awaits a lock that never releases, so it hangs forever (the exact
// "session loaded: pending" symptom). Replacing it with a no-op lock runs each
// auth op immediately. Trade-off: no cross-tab refresh coordination (redundant
// refreshes are harmless here).
const passThroughLock = async (_name, _acquireTimeout, fn) => fn();

export const supabase = createClient(url ?? "http://localhost", anonKey ?? "public-anon-key", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lock: passThroughLock,
  },
});
