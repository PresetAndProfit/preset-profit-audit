// api/_lib/stripe.js — SERVER-ONLY Stripe client + plan↔price mapping.
// Never import this into client code; it reads the secret key.
import Stripe from "stripe";

const rawSecret = process.env.STRIPE_SECRET_KEY;
// Tolerate stray whitespace/newline from env-var paste. A trailing "\n" makes
// the Authorization header invalid → Node's HTTP client throws → the Stripe SDK
// wraps it as StripeConnectionError. Trimming removes that failure mode.
const secret = (rawSecret || "").trim();

// Startup key diagnostics — SAFE: exposes only the mode prefix (sk_test_/sk_live_),
// length, whitespace flag, and format validity. Never the secret random portion.
export const stripeKeyDiagnostics = {
  exists: !!rawSecret,
  length: rawSecret ? rawSecret.length : 0,
  trimmedLength: secret.length,
  hadWhitespace: !!rawSecret && rawSecret.length !== secret.length,
  prefix: secret ? secret.slice(0, 8) : null, // "sk_test_" / "sk_live_" — mode only
  validFormat: /^sk_(test|live)_/.test(secret),
};
console.log("[stripe] key diagnostics", stripeKeyDiagnostics);

if (!secret) {
  console.warn("[stripe] Missing STRIPE_SECRET_KEY");
}

export const stripe = new Stripe(secret || "sk_test_missing", {
  // Pin nothing here on purpose — use the account's default API version so a
  // dashboard upgrade doesn't require a code change. Pin later if needed.
  appInfo: { name: "Preset & Profit" },
  // Use the fetch-based HTTP client (undici/global fetch) instead of Node's
  // default https agent. On this serverless runtime the https client can't
  // reach api.stripe.com (StripeConnectionError) while fetch-based clients work
  // fine (Supabase + the site scanner both use fetch successfully here).
  httpClient: Stripe.createFetchHttpClient(),
  // Fail fast on transport errors instead of masking them behind retries.
  maxNetworkRetries: 0,
  timeout: 20000,
});

// SDK version for diagnostics (logged by the checkout endpoint).
export const STRIPE_SDK_VERSION = Stripe.PACKAGE_VERSION || "unknown";

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
    case "paused":
      // Intentionally paused collection → no paid entitlement.
      return "canceled";
    default:
      // Unknown/future status: fail CLOSED. "incomplete" satisfies the DB CHECK
      // constraint and is NOT an entitled status, so an unrecognized state can
      // never silently grant unlimited audits.
      return "incomplete";
  }
}
