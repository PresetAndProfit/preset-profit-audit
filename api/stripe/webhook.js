// api/stripe/webhook.js — authoritative subscription state, pushed by Stripe.
// Verifies the signature against the RAW request body, then mirrors lifecycle
// events into Supabase. No user auth here — trust comes from the signature.
//
// Stripe → Developers → Webhooks → add endpoint  https://<your-app>/api/stripe/webhook
// Local:  stripe listen --forward-to localhost:5173/api/stripe/webhook
import { stripe } from "../_lib/stripe.js";
import { syncSubscriptionRecord } from "../_lib/syncSubscription.js";
import { supabaseAdmin } from "../_lib/supabaseAdmin.js";
import { logAdminEvent } from "../_lib/systemSettings.js";
import {
  onSubscriptionState,
  onInvoicePaid,
  onInvoiceFailed,
  onSubscriptionCancelled,
} from "../_lib/lifecycleEmails.js";

// Resolve a denormalized email for the admin activity feed (best-effort).
async function emailForUserId(uid) {
  if (!uid) return null;
  const { data } = await supabaseAdmin.from("profiles").select("email").eq("id", uid).maybeSingle();
  return data?.email || null;
}

// Disable Vercel's automatic body parsing so we can read the raw bytes that
// Stripe signed. Without this, signature verification fails.
export const config = { api: { bodyParser: false } };

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method-not-allowed" });

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers["stripe-signature"];
  if (!secret || !sig) return res.status(400).json({ error: "missing-signature-config" });

  let event;
  try {
    const raw = await readRawBody(req);
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (e) {
    console.error("[webhook] signature verification failed", e?.message);
    return res.status(400).json({ error: "invalid-signature" });
  }

  try {
    let result = { ok: true };
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        result = await syncSubscriptionRecord(event.data.object);
        // Lifecycle: Trial Started (fires once per subscription via dedupe key).
        await onSubscriptionState(event.data.object);
        break;

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        result = await syncSubscriptionRecord(sub);
        await logAdminEvent("cancellation", {
          userId: sub.metadata?.supabase_user_id || null,
          email: await emailForUserId(sub.metadata?.supabase_user_id),
          detail: { message: "subscription canceled" },
        });
        // Lifecycle: Cancellation + reactivation offer.
        await onSubscriptionCancelled(sub);
        break;
      }

      // Stripe fires these on dunning. Re-sync so failed-payment / recovery state
      // propagates promptly; also log a failed_payment event for the admin feed.
      case "invoice.payment_failed":
      case "invoice.paid":
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription);
          result = await syncSubscriptionRecord(sub);
        }
        if (event.type === "invoice.payment_failed") {
          await logAdminEvent("failed_payment", {
            email: invoice.customer_email || null,
            detail: { message: "payment failed", amount: invoice.amount_due },
          });
          // Lifecycle: Payment Failed + retry instructions.
          await onInvoiceFailed(invoice);
        } else {
          // Lifecycle: Payment Succeeded receipt (skips $0 trial invoices, deduped per invoice).
          await onInvoicePaid(invoice);
        }
        break;
      }

      case "checkout.session.completed": {
        // Fetch the full subscription so we have items/price/period fields.
        const session = event.data.object;
        if (session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription);
          // Ensure we can resolve the user even if metadata wasn't copied.
          if (!sub.metadata?.supabase_user_id && session.client_reference_id) {
            sub.metadata = { ...sub.metadata, supabase_user_id: session.client_reference_id };
          }
          result = await syncSubscriptionRecord(sub);
          await logAdminEvent("upgrade", {
            userId: sub.metadata?.supabase_user_id || null,
            email: session.customer_details?.email || await emailForUserId(sub.metadata?.supabase_user_id),
            detail: { message: "subscription started" },
          });
          // Lifecycle: Trial Started, sent promptly on checkout (deduped with the
          // subscription.created event above so it never double-sends).
          await onSubscriptionState(sub);
        }
        break;
      }

      default:
        // Ignore unrelated events.
        break;
    }

    // A DB write failure is transient — return 500 so Stripe retries and the
    // subscription state can't permanently desync. "no-user" is NOT retriable
    // (it will never resolve), so we ack it with 200 to stop the retries.
    if (result && result.ok === false && result.reason === "db-error") {
      console.error("[webhook] db write failed, asking Stripe to retry", event.type);
      return res.status(500).json({ error: "db-write-failed" });
    }

    return res.status(200).json({ received: true });
  } catch (e) {
    console.error("[webhook] handler error", e);
    return res.status(500).json({ error: "handler-failed" });
  }
}
