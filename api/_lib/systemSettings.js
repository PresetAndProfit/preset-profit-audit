// api/_lib/systemSettings.js — SERVER-ONLY read/write of the operational
// kill-switches (maintenance mode, disable signups/checkout/audits). Backed by
// the singleton system_settings row; cached briefly to avoid a DB hit per call.
import { supabaseAdmin } from "./supabaseAdmin.js";

const DEFAULTS = { maintenance_mode: false, signups_disabled: false, checkout_disabled: false, audits_disabled: false };
const KEYS = Object.keys(DEFAULTS);
const TTL_MS = 5000;

let _cache = null;
let _at = 0;

export async function getSettings({ fresh = false } = {}) {
  if (!fresh && _cache && Date.now() - _at < TTL_MS) return _cache;
  const { data, error } = await supabaseAdmin
    .from("system_settings")
    .select("maintenance_mode, signups_disabled, checkout_disabled, audits_disabled")
    .eq("id", 1)
    .maybeSingle();
  // Fail OPEN to defaults (all enabled) so a settings outage never bricks the app.
  _cache = error || !data ? { ...DEFAULTS } : { ...DEFAULTS, ...data };
  _at = Date.now();
  return _cache;
}

export async function setSettings(patch, updatedBy = null) {
  const clean = {};
  for (const k of KEYS) if (k in patch) clean[k] = !!patch[k];
  const { data, error } = await supabaseAdmin
    .from("system_settings")
    .update({ ...clean, updated_at: new Date().toISOString(), updated_by: updatedBy })
    .eq("id", 1)
    .select("maintenance_mode, signups_disabled, checkout_disabled, audits_disabled")
    .single();
  if (error) return { ok: false, error };
  _cache = { ...DEFAULTS, ...data };
  _at = Date.now();
  return { ok: true, settings: _cache };
}

// Convenience guard for endpoints: returns true when the named switch is OFF
// (feature enabled). e.g. await featureEnabled("checkout_disabled")
export async function isDisabled(key) {
  const s = await getSettings();
  return !!s[key];
}

// Best-effort billing-event logger for the activity feed (never throws).
export async function logAdminEvent(type, { userId = null, email = null, detail = null } = {}) {
  try {
    await supabaseAdmin.from("admin_events").insert({ type, user_id: userId, email, detail });
  } catch { /* feed is best-effort */ }
}
