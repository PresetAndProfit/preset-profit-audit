// api/stripe/webhook.js — authoritative subscription state, pushed by Stripe.
// Verifies the signature against the RAW request body, then mirrors lifecycle
// events into Supabase. No user auth here — trust comes from the signature.
//
// Stripe → Developers → Webhooks → add endpoint  https://<your-app>/api/stripe/webhook
// Local:  stripe listen --forward-to localhost:5173/api/stripe/webhook
import { stripe } from "../_lib/stripe.js";
import { syncSubscriptionRecord } from "../_lib/syncSubscription.js";

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
      case "customer.subscription.deleted":
        result = await syncSubscriptionRecord(event.data.object);
        break;

      // Stripe fires these on dunning. They also produce a
      // customer.subscription.updated (status → past_due / active), but re-syncing
      // here makes failed-payment and recovery state propagate promptly.
      case "invoice.payment_failed":
      case "invoice.paid":
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        if (invoice.subscription) {
          const sub = await stripe.subscriptions.retrieve(invoice.subscription);
          result = await syncSubscriptionRecord(sub);
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
