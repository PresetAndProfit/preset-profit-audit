// api/stripe/sync.js — pull this user's current subscription state from Stripe
// and write it into Supabase. Auth required. Called by the client right after
// returning from Checkout so the plan updates immediately, independent of
// webhook delivery (webhooks remain the authoritative path for ongoing changes).
import { stripe } from "../_lib/stripe.js";
import { supabaseAdmin, getUserFromRequest } from "../_lib/supabaseAdmin.js";
import { syncSubscriptionRecord, resetToFree } from "../_lib/syncSubscription.js";

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

    const customerId = sub?.stripe_customer_id;
    if (!customerId) {
      return res.status(200).json({ ok: true, plan: "free" });
    }

    // Latest subscription for this customer (any status).
    const list = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 1,
    });

    if (!list.data.length) {
      await resetToFree(user.id, customerId);
      return res.status(200).json({ ok: true, plan: "free" });
    }

    const result = await syncSubscriptionRecord(list.data[0]);
    return res.status(200).json(result);
  } catch (e) {
    console.error("[sync]", e);
    return res.status(500).json({ error: "sync-failed", detail: String(e?.message || e) });
  }
}
