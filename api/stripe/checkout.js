// api/stripe/checkout.js — create a Stripe Checkout Session for a paid plan.
// Auth required (Bearer access token). Returns { url } for the client to redirect to.
import { stripe, priceIdForPlan } from "../_lib/stripe.js";
import { supabaseAdmin, getUserFromRequest } from "../_lib/supabaseAdmin.js";
import { getPlan } from "../../src/lib/plans.js";
import { isDisabled } from "../_lib/systemSettings.js";
import { isAdminEmail } from "../_lib/adminAuth.js";

const APP_URL = process.env.APP_URL || "http://localhost:5173";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method-not-allowed" });

  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });

  // System control: admin can disable checkout platform-wide (admins exempt).
  if (!isAdminEmail(user.email) && await isDisabled("checkout_disabled")) {
    return res.status(503).json({ error: "checkout-disabled", message: "Checkout is temporarily unavailable. Please try again soon." });
  }

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

  try {
    // Reuse the Stripe customer if we've already created one for this user.
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId = sub?.stripe_customer_id || null;
    // Whether this customer has EVER had a subscription. Used to suppress the
    // free trial on re-subscribe so a user can't cancel + re-subscribe for
    // unlimited back-to-back free trials.
    let hadPriorSubscription = false;

    // Migration-safe: a customer created in a different Stripe mode (e.g. a test
    // customer saved while testing) does not exist under the current (live) key,
    // which raises "No such customer". Verify the stored ID in the active mode;
    // if it's missing or deleted, drop it so a fresh one is created below.
    if (customerId) {
      try {
        const existing = await stripe.customers.retrieve(customerId);
        if (existing?.deleted) customerId = null;
      } catch (e) {
        if (e?.statusCode === 404 || e?.code === "resource_missing") {
          console.warn("[checkout] stored customer not in current mode, recreating", { userId: user.id });
          customerId = null;
        } else {
          throw e;
        }
      }
    }

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
    } else {
      // Duplicate-subscription guard. If this customer already has a live
      // subscription (active/trialing/past_due/incomplete), creating a second
      // Checkout Session would create a SECOND subscription and bill the card
      // twice. The correct path for an existing subscriber to change/cancel a
      // plan is the Billing Portal, so send them there instead of double-charging.
      const existingSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: "all",
        limit: 100,
      });
      // Any prior subscription (even canceled) means a trial was likely already
      // consumed — don't grant another one on re-subscribe.
      hadPriorSubscription = existingSubs.data.length > 0;
      // Block only on subscriptions that represent a real, billable plan. An
      // `incomplete` sub (abandoned/failed first payment, auto-expires in 24h) is
      // intentionally excluded so the user can retry checkout.
      const live = existingSubs.data.find((s) =>
        ["active", "trialing", "past_due", "unpaid"].includes(s.status)
      );
      if (live) {
        const portal = await stripe.billingPortal.sessions.create({
          customer: customerId,
          return_url: `${APP_URL}/?view=account`,
        });
        console.log("[checkout] existing subscription — routing to portal", {
          userId: user.id, subscriptionId: live.id, status: live.status,
        });
        return res.status(200).json({ url: portal.url, alreadySubscribed: true });
      }
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
        ...(plan.trialDays && !hadPriorSubscription ? { trial_period_days: plan.trialDays } : {}),
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
