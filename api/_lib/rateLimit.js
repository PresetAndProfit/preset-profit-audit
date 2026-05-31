// api/_lib/rateLimit.js — abuse protection backed by the usage_events table.
//
// Serverless instances are stateless, so we can't keep counters in memory.
// Instead we count rows in usage_events within a time window (the same table
// used for metering) and reject when over the limit. Authoritative because the
// table is service-role-only writable.
import { supabaseAdmin } from "./supabaseAdmin.js";

// Count events of `eventType` for a user within the last `windowSeconds`.
async function countRecent(userId, eventType, windowSeconds) {
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();
  const { count, error } = await supabaseAdmin
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("event_type", eventType)
    .gte("created_at", since);
  if (error) {
    // Fail OPEN on metering errors? No — fail closed-ish but don't hard-block
    // the whole app: log and allow, since this is best-effort abuse control.
    console.error("[rateLimit] count failed", error);
    return 0;
  }
  return count || 0;
}

// Returns { allowed, remaining, limit } for a set of windows. Pass several
// windows (e.g. per-minute burst + per-day cap) and all must pass.
export async function checkRateLimit(userId, eventType, windows) {
  for (const w of windows) {
    const used = await countRecent(userId, eventType, w.windowSeconds);
    if (used >= w.limit) {
      return { allowed: false, limit: w.limit, windowSeconds: w.windowSeconds, used };
    }
  }
  return { allowed: true };
}

// Default scan limits: short burst + daily ceiling. Generous enough for real
// use (paid plans are unlimited audits, but scans still cost us money/traffic).
export const SCAN_LIMITS = [
  { limit: 12, windowSeconds: 60 },        // 12 / minute (burst)
  { limit: 300, windowSeconds: 24 * 3600 }, // 300 / day
];
