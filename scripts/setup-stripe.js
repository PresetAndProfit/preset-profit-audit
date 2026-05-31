// scripts/setup-stripe.js — one-time Stripe product/price setup.
//
// Creates a Product + recurring monthly Price for each paid plan defined in
// src/lib/plans.js, then prints the env lines to paste. Idempotent-ish: it
// looks up existing products by a stable lookup metadata key before creating.
//
// Usage:
//   1. Put STRIPE_SECRET_KEY in .env.local (or export it in your shell).
//   2. node scripts/setup-stripe.js
//   3. Copy the printed STRIPE_PRICE_* lines into .env.local AND Vercel.
import fs from "node:fs";
import path from "node:path";
import Stripe from "stripe";
import { PLANS } from "../src/lib/plans.js";

// Minimal .env.local loader (no dotenv dependency).
function loadEnvLocal() {
  const file = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnvLocal();

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("✗ STRIPE_SECRET_KEY not set. Add it to .env.local or export it, then re-run.");
  process.exit(1);
}
const stripe = new Stripe(key);

const PAID = ["professional", "agency"];

async function ensurePlan(planId) {
  const plan = PLANS[planId];
  const lookup = `pp_${planId}_monthly`;

  // Reuse an existing active price tagged with our lookup key if present.
  const existing = await stripe.prices.search({
    query: `metadata['pp_lookup']:'${lookup}' AND active:'true'`,
  });
  if (existing.data.length) {
    return { planId, priceId: existing.data[0].id, reused: true };
  }

  const product = await stripe.products.create({
    name: `Preset & Profit — ${plan.name}`,
    description: plan.blurb,
    metadata: { pp_plan: planId },
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: plan.amountCents,
    currency: "usd",
    recurring: { interval: plan.interval || "month" },
    metadata: { pp_lookup: lookup, pp_plan: planId },
  });

  return { planId, priceId: price.id, reused: false };
}

(async () => {
  console.log("Setting up Stripe products & prices…\n");
  const results = [];
  for (const planId of PAID) {
    const r = await ensurePlan(planId);
    console.log(`  ${r.reused ? "↺ reused" : "✓ created"}  ${PLANS[planId].name.padEnd(13)} ${PLANS[planId].price}/mo  →  ${r.priceId}`);
    results.push(r);
  }

  const envKey = (planId) => PLANS[planId].priceEnv;
  console.log("\n────────────────────────────────────────────");
  console.log("Paste these into .env.local AND Vercel env vars:\n");
  for (const r of results) console.log(`${envKey(r.planId)}=${r.priceId}`);
  console.log("────────────────────────────────────────────\n");
  console.log("Done. (Test mode if your key is sk_test_…)");
})().catch((e) => {
  console.error("✗ Stripe setup failed:", e?.message || e);
  process.exit(1);
});
