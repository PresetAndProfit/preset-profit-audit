// src/lib/billing.js — thin client for the Stripe serverless endpoints.
// Attaches the user's Supabase access token so the server can authenticate
// the request and attribute it to the right account.
import { supabase } from "./supabaseClient.js";

async function authedPost(path, body) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body || {}),
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON */ }
  if (!res.ok) {
    throw new Error(json?.error || `request-failed-${res.status}`);
  }
  return json;
}

// Begin checkout for a paid plan → returns { url } to redirect the browser to.
export const startCheckout = (plan) => authedPost("/api/stripe/checkout", { plan });

// Open the Stripe Billing Portal → returns { url }.
export const openBillingPortal = () => authedPost("/api/stripe/portal", {});

// Pull latest subscription state from Stripe into Supabase (after checkout return).
export const syncSubscription = () => authedPost("/api/stripe/sync", {});
