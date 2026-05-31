// src/lib/usage.js — client-side usage metering (UX display + soft gating).
//
// Counts how many audits fall inside the current plan's usage window so the UI
// can show "1 / 1 used" and block the New Audit flow at the limit. This mirrors
// what the server enforces, but is ADVISORY only — the authoritative check lives
// in api/_lib/usageServer.js and cannot be bypassed from the client.
//
// A null auditLimit means UNLIMITED (paid plans): never at limit.
import { usageWindowStart } from "./plans.js";

export function computeUsage(audits, plan, subscription) {
  const unlimited = plan.auditLimit == null;
  const start = usageWindowStart(plan, subscription?.current_period_start).getTime();
  const used = (audits || []).filter((a) => {
    const t = new Date(a.createdAt || a.created_at || 0).getTime();
    return t >= start;
  }).length;

  if (unlimited) {
    return { used, limit: null, unlimited: true, remaining: Infinity, atLimit: false, period: plan.period };
  }

  const limit = plan.auditLimit;
  const remaining = Math.max(0, limit - used);
  return {
    used,
    limit,
    unlimited: false,
    remaining,
    atLimit: used >= limit,
    period: plan.period, // 'lifetime' | 'month'
  };
}
