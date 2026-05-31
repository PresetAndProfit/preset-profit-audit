// api/stripe/portal.js — open the Stripe Billing Portal so a paying user can
// update card, change plan, or cancel. Auth required. Returns { url }.
import { stripe } from "../_lib/stripe.js";
import { supabaseAdmin, getUserFromRequest } from "../_lib/supabaseAdmin.js";

const APP_URL = process.env.APP_URL || "http://localhost:5173";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method-not-allowed" });

  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ error: "unauthorized" });

  try {
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!sub?.stripe_customer_id) {
      return res.status(400).json({ error: "no-customer" });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${APP_URL}/?view=account`,
    });

    return res.status(200).json({ url: session.url });
  } catch (e) {
    console.error("[portal]", e);
    return res.status(500).json({ error: "portal-failed", detail: String(e?.message || e) });
  }
}
