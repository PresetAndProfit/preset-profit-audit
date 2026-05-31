// api/stripe/checkout.js — create a Stripe Checkout Session for a paid plan.
// Auth required (Bearer access token). Returns { url } for the client to redirect to.
import { stripe, priceIdForPlan, STRIPE_SDK_VERSION } from "../_lib/stripe.js";
import { supabaseAdmin, getUserFromRequest } from "../_lib/supabaseAdmin.js";
import { getPlan } from "../../src/lib/plans.js";

const APP_URL = process.env.APP_URL || "http://localhost:5173";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method-not-allowed" });

  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });

  // Env preflight — reports exactly which Stripe variable is missing so the
  // misconfiguration is visible client-side. Only presence is checked; no
  // secret values are ever returned.
  if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ error: "missing_secret_key" });
  if (!process.env.STRIPE_PRICE_PROFESSIONAL) return res.status(500).json({ error: "missing_professional_price" });
  if (!process.env.STRIPE_PRICE_AGENCY) return res.status(500).json({ error: "missing_agency_price" });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const planId = body.plan;
  const plan = getPlan(planId);
  if (!plan || plan.id === "free") return res.status(400).json({ error: "invalid-plan" });

  const priceId = priceIdForPlan(plan.id);
  if (!priceId) return res.status(500).json({ error: "price-not-configured", plan: plan.id });

  // Runtime + SDK breadcrumb. `edge` must be false — Stripe's Node HTTP client
  // does not work on the Edge runtime and would cause connection errors.
  console.log("[checkout] runtime", {
    node: process.version,
    edge: typeof globalThis.EdgeRuntime !== "undefined",
    stripeSdk: STRIPE_SDK_VERSION,
    region: process.env.VERCEL_REGION || null,
  });

  // Connectivity preflight: a lightweight GET to Stripe. If the network/transport
  // is the problem (StripeConnectionError), it fails HERE with the exact error,
  // isolating transport issues from the checkout-session payload.
  try {
    await stripe.prices.retrieve(priceId);
  } catch (e) {
    const info = {
      type: e?.type || e?.name || "Error",
      code: e?.code || null,
      message: e?.message || String(e),
      requestId: e?.requestId || null,
    };
    console.error("[checkout] stripe connectivity/price preflight failed", info);
    return res.status(502).json({ error: "stripe-unreachable", stripe: info });
  }

  try {
    // Reuse the Stripe customer if we've already created one for this user.
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId = sub?.stripe_customer_id || null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await supabaseAdmin
        .from("subscriptions")
        .upsert(
          { user_id: user.id, stripe_customer_id: customerId, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
    }

    // Server-side breadcrumb (Vercel logs). priceId / customerId are not secret.
    console.log("[checkout] creating session", {
      userId: user.id, plan: plan.id, priceId, hasCustomer: !!customerId,
      successUrl: `${APP_URL}/?checkout=success`, cancelUrl: `${APP_URL}/?checkout=cancel`,
    });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: user.id,
      subscription_data: {
        metadata: { supabase_user_id: user.id },
        ...(plan.trialDays ? { trial_period_days: plan.trialDays } : {}),
      },
      allow_promotion_codes: true,
      success_url: `${APP_URL}/?checkout=success&plan=${plan.id}`,
      cancel_url: `${APP_URL}/?checkout=cancel`,
    });

    return res.status(200).json({ url: session.url });
  } catch (e) {
    // Stripe SDK errors carry type/code/param/message. Stripe redacts API keys
    // in its own messages and price IDs aren't secret, so these are safe to
    // surface to the UI. Full context is logged server-side (Vercel logs).
    const stripeErr = {
      type: e?.type || e?.name || "Error",
      code: e?.code || null,
      param: e?.param || null,
      message: e?.message || String(e),
    };
    console.error("[checkout] stripe error", { ...stripeErr, requestId: e?.requestId || null });
    return res.status(500).json({ error: "checkout-failed", detail: stripeErr.message, stripe: stripeErr });
  }
}
