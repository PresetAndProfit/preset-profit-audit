// api/_lib/stripe.js — SERVER-ONLY Stripe client + plan↔price mapping.
// Never import this into client code; it reads the secret key.
import Stripe from "stripe";

const secret = process.env.STRIPE_SECRET_KEY;

if (!secret) {
  console.warn("[stripe] Missing STRIPE_SECRET_KEY");
}

export const stripe = new Stripe(secret || "sk_test_missing", {
  // Pin nothing here on purpose — use the account's default API version so a
  // dashboard upgrade doesn't require a code change. Pin later if needed.
  appInfo: { name: "Preset & Profit" },
});

// Map our internal plan id → the Stripe Price ID (from env). Single source of
// truth for both directions so checkout and webhook agree.
export function priceIdForPlan(plan) {
  if (plan === "professional") return process.env.STRIPE_PRICE_PROFESSIONAL || null;
  if (plan === "agency") return process.env.STRIPE_PRICE_AGENCY || null;
  return null; // 'free' has no Stripe price
}

export function planForPriceId(priceId) {
  if (!priceId) return "free";
  if (priceId === process.env.STRIPE_PRICE_PROFESSIONAL) return "professional";
  if (priceId === process.env.STRIPE_PRICE_AGENCY) return "agency";
  return "free";
}

// Stripe has more statuses than our subscriptions.status CHECK constraint
// allows (active|trialing|past_due|canceled|incomplete). Normalize so writes
// never violate the constraint.
export function normalizeStatus(stripeStatus) {
  switch (stripeStatus) {
    case "active":
    case "trialing":
    case "past_due":
    case "canceled":
    case "incomplete":
      return stripeStatus;
    case "unpaid":
      return "past_due";
    case "incomplete_expired":
      return "canceled";
    default:
      return "active";
  }
}
