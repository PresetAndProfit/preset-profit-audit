// api/_lib/usageServer.js — authoritative, server-side usage + credit logic.
// This is the layer the client CANNOT bypass: RLS blocks client audit inserts,
// so the only way to create an audit is through an endpoint that calls
// assertCanCreateAudit() first.
import { supabaseAdmin } from "./supabaseAdmin.js";
import { getPlan, usageWindowStart } from "../../src/lib/plans.js";

// Resolve the user's plan object from their subscription row (defaults to free).
export async function getUserPlan(userId) {
  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select("plan, status, current_period_start")
    .eq("user_id", userId)
    .maybeSingle();
  return { plan: getPlan(data?.plan), subscription: data || null };
}

// Count audits the user has within the current plan window. Free = lifetime
// (all audits ever); paid plans are unlimited so we never need to count.
export async function countAudits(userId, plan, subscription) {
  if (plan.auditLimit == null) return 0; // unlimited → count irrelevant
  const since = usageWindowStart(plan, subscription?.current_period_start).toISOString();
  const { count, error } = await supabaseAdmin
    .from("audits")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  if (error) {
    console.error("[usageServer] countAudits failed", error);
    // Fail closed for finite plans: treat as at-limit rather than give away free credits.
    return plan.auditLimit;
  }
  return count || 0;
}

// Decide whether a NEW audit (new client_id) may be created.
export async function assertCanCreateAudit(userId) {
  const { plan, subscription } = await getUserPlan(userId);
  if (plan.auditLimit == null) return { ok: true, plan, subscription };
  const used = await countAudits(userId, plan, subscription);
  if (used >= plan.auditLimit) {
    return { ok: false, reason: "limit-reached", plan, used, limit: plan.auditLimit };
  }
  return { ok: true, plan, subscription, used };
}

// Append an entry to the metering log (service-role; clients can't write here).
export async function logUsageEvent(userId, eventType, { auditId = null, metadata = null } = {}) {
  const { error } = await supabaseAdmin.from("usage_events").insert({
    user_id: userId,
    event_type: eventType,
    audit_id: auditId,
    metadata,
  });
  if (error) console.error("[usageServer] logUsageEvent failed", error);
}

// Best-effort client IP for forensics / IP-level abuse review.
export function clientIp(req) {
  const xff = req.headers["x-forwarded-for"] || req.headers["X-Forwarded-For"];
  if (typeof xff === "string" && xff.length) return xff.split(",")[0].trim();
  return req.socket?.remoteAddress || null;
}
