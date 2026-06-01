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
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await syncSubscriptionRecord(event.data.object);
        break;

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        await syncSubscriptionRecord(sub);
        await logAdminEvent("cancellation", {
          userId: sub.metadata?.supabase_user_id || null,
          email: await emailForUserId(sub.metadata?.supabase_user_id),
          detail: { message: "subscription canceled" },
        });
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
          await syncSubscriptionRecord(sub);
          await logAdminEvent("upgrade", {
            userId: sub.metadata?.supabase_user_id || null,
            email: session.customer_details?.email || await emailForUserId(sub.metadata?.supabase_user_id),
            detail: { message: "subscription started" },
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const inv = event.data.object;
        await logAdminEvent("failed_payment", {
          email: inv.customer_email || null,
          detail: { message: "payment failed", amount: inv.amount_due },
        });
        break;
      }

      default:
        // Ignore unrelated events.
        break;
    }
    return res.status(200).json({ received: true });
  } catch (e) {
    console.error("[webhook] handler error", e);
    return res.status(500).json({ error: "handler-failed" });
  }
}
