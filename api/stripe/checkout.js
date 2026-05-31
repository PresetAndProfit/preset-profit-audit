// api/stripe/checkout.js — create a Stripe Checkout Session for a paid plan.
// Auth required (Bearer access token). Returns { url } for the client to redirect to.
import { stripe, priceIdForPlan } from "../_lib/stripe.js";
import { supabaseAdmin, getUserFromRequest } from "../_lib/supabaseAdmin.js";
import { getPlan } from "../../src/lib/plans.js";

const APP_URL = process.env.APP_URL || "http://localhost:5173";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method-not-allowed" });

  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const planId = body.plan;
  const plan = getPlan(planId);
  if (!plan || plan.id === "free") return res.status(400).json({ error: "invalid-plan" });

  const priceId = priceIdForPlan(plan.id);
  if (!priceId) return res.status(500).json({ error: "price-not-configured", plan: plan.id });

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
    console.error("[checkout]", e);
    return res.status(500).json({ error: "checkout-failed", detail: String(e?.message || e) });
  }
}
