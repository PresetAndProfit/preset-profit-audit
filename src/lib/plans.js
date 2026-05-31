// src/lib/plans.js — subscription tier definitions (single source of truth).
//
// Prices are user-confirmed. `auditLimit` drives usage metering and the
// authoritative server-side credit check (api/_lib/usageServer.js).
//   auditLimit: <number>  → hard cap within the plan's `period`
//   auditLimit: null      → UNLIMITED (no cap)
//
//   free          → 1 audit total (lifetime) — a taste, not a substitute
//   professional  → unlimited audits (own-site owner plan)
//   agency        → unlimited audits + white-label (reseller plan)
//
// Keep the `plan` keys in sync with the CHECK constraint in database/schema.sql.

export const PLANS = {
  free: {
    id: "free",
    name: "Free",
    price: "$0",
    priceNote: "forever",
    auditLimit: 1,
    period: "lifetime", // counts ALL audits ever
    watermark: true,
    whiteLabel: false,
    shareLinks: false,
    blurb: "1 full audit to see exactly where you stand.",
    features: [
      "1 complete business audit",
      "Live website scan + findings",
      "Watermarked PDF export",
    ],
  },
  professional: {
    id: "professional",
    name: "Professional",
    price: "$49",
    priceNote: "/mo",
    amountCents: 4900, // used by scripts/setup-stripe.js
    interval: "month",
    priceEnv: "STRIPE_PRICE_PROFESSIONAL", // resolved by checkout via env
    auditLimit: null, // unlimited
    period: "month",
    watermark: false,
    whiteLabel: false,
    shareLinks: false,
    trialDays: 14,
    blurb: "Monitor and improve your own site over time.",
    features: [
      "Unlimited audits & re-scans",
      "Un-watermarked PDF export",
      "30-day action plan",
      "Score tracking over time",
    ],
  },
  agency: {
    id: "agency",
    name: "Agency",
    price: "$399",
    priceNote: "/mo",
    amountCents: 39900, // used by scripts/setup-stripe.js
    interval: "month",
    priceEnv: "STRIPE_PRICE_AGENCY", // resolved by checkout via env
    auditLimit: null, // unlimited
    period: "month",
    watermark: false,
    whiteLabel: true,
    shareLinks: true,
    trialDays: 14,
    blurb: "White-label audits for your clients.",
    features: [
      "Unlimited audits",
      "Your logo, colors & domain on reports",
      "Shareable report links",
      "Multiple businesses",
    ],
  },
};

export const PLAN_ORDER = ["free", "professional", "agency"];

export function getPlan(planId) {
  return PLANS[planId] || PLANS.free;
}

// Start of the current usage window for a plan. Lifetime plans return the epoch
// (count everything); monthly plans return the start of the current calendar
// month. When a real Stripe billing period exists, pass current_period_start.
export function usageWindowStart(plan, currentPeriodStart = null) {
  if (plan.period === "lifetime") return new Date(0);
  if (currentPeriodStart) return new Date(currentPeriodStart);
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}
