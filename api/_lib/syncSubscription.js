// api/_lib/syncSubscription.js — write a Stripe subscription's state into the
// Supabase `subscriptions` table (service-role, bypasses RLS). Shared by the
// webhook (authoritative, push) and the /sync endpoint (pull, used right after
// checkout return so the UI updates without waiting for webhook delivery).
import { supabaseAdmin } from "./supabaseAdmin.js";
import { planForPriceId, normalizeStatus } from "./stripe.js";

function tsToIso(unixSeconds) {
  return unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null;
}

// Resolve the Supabase user id for a Stripe subscription. Prefer metadata set
// at checkout; fall back to the customer id already stored on a row.
async function resolveUserId(sub) {
  const fromMeta = sub.metadata?.supabase_user_id;
  if (fromMeta) return fromMeta;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!customerId) return null;
  const { data } = await supabaseAdmin
    .from("subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return data?.user_id ?? null;
}

// Upsert from a full Stripe Subscription object.
export async function syncSubscriptionRecord(sub) {
  const userId = await resolveUserId(sub);
  if (!userId) {
    console.warn("[syncSubscription] could not resolve user for", sub.id);
    return { ok: false, reason: "no-user" };
  }

  const item = sub.items?.data?.[0];
  const priceId = item?.price?.id ?? null;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;

  // Newer Stripe API versions moved current_period_* from the subscription onto
  // each subscription item. Read the item first, fall back to the legacy top-level.
  const periodStart = sub.current_period_start ?? item?.current_period_start ?? null;
  const periodEnd = sub.current_period_end ?? item?.current_period_end ?? null;

  // A canceled/ended subscription drops the user back to free.
  const ended = ["canceled", "incomplete_expired"].includes(sub.status);
  const plan = ended ? "free" : planForPriceId(priceId);

  const row = {
    user_id: userId,
    plan,
    status: normalizeStatus(sub.status),
    stripe_customer_id: customerId,
    stripe_subscription_id: ended ? null : sub.id,
    current_period_start: tsToIso(periodStart),
    current_period_end: tsToIso(periodEnd),
    trial_ends_at: tsToIso(sub.trial_end),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin
    .from("subscriptions")
    .upsert(row, { onConflict: "user_id" });

  if (error) {
    console.error("[syncSubscription] upsert failed", error);
    return { ok: false, reason: "db-error", error };
  }
  return { ok: true, plan, status: row.status };
}

// Reset a user to the free plan (e.g. customer has no subscriptions at all).
export async function resetToFree(userId, stripeCustomerId = null) {
  const { error } = await supabaseAdmin.from("subscriptions").upsert(
    {
      user_id: userId,
      plan: "free",
      status: "active",
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: null,
      current_period_start: null,
      current_period_end: null,
      trial_ends_at: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  return { ok: !error, error };
}
