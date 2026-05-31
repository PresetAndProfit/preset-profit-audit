# Preset & Profit — Production Launch Checklist

Work top to bottom. Nothing below the **Launch gate** line should be skipped before taking real payments.

---

## 1. Database (Supabase)
- [ ] Create the production Supabase project (separate from any dev project).
- [ ] Run `database/schema.sql` in the SQL editor (tables, RLS, triggers).
- [ ] Run `database/tier2.sql` (RLS lockdown, `is_admin`, admin view).
- [ ] Verify RLS is **ON** for every table: `profiles, subscriptions, audits, leads, usage_events, shared_reports`.
- [ ] Confirm the browser **cannot** insert into `audits` (only SELECT/DELETE) — try from the anon key.
- [ ] Grant yourself admin: `update public.profiles set is_admin = true where email = 'you@…';`
- [ ] Authentication → URL Configuration: set **Site URL** to your prod domain; add `/reset-password` redirect.
- [ ] Decide email confirmation policy (ON for production).

## 2. Stripe (live mode)
- [ ] Switch from sandbox to **live** keys when ready to charge real cards.
- [ ] Run `npm run setup:stripe` against the live key (or create Products manually) → capture `STRIPE_PRICE_PROFESSIONAL`, `STRIPE_PRICE_AGENCY`.
- [ ] Add the webhook endpoint: `https://<domain>/api/stripe/webhook`, events `customer.subscription.*` + `checkout.session.completed`; copy its signing secret.
- [ ] Configure the Billing Portal (branding, cancellation policy) in the Stripe Dashboard.
- [ ] Test the full path with a live card: subscribe → plan updates → cancel via portal → downgrades to free.

## 3. Environment variables (Vercel → Settings → Environment Variables)
Server-only (no `VITE_` prefix):
- [ ] `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PROFESSIONAL`, `STRIPE_PRICE_AGENCY`
- [ ] `APP_URL` = your production domain

Client-safe (`VITE_`):
- [ ] `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_STRIPE_PUBLISHABLE_KEY`
- [ ] Confirm **no** service-role / secret key is exposed with a `VITE_` prefix.

## 4. Build & runtime
- [ ] `npm run build` passes.
- [ ] `npm run lint` shows no NEW errors.
- [ ] `vercel.json` functions runtime is `nodejs22.x`.
- [ ] Deploy a preview; smoke-test signup → scan → save → upgrade → admin.

---
## 🚦 Launch gate — security must-haves (Tier 2)
- [ ] **SSRF**: confirm `/api/analyze-site` rejects internal targets — test `http://169.254.169.254/`, `http://localhost`, `http://127.0.0.1`, `http://10.0.0.1`, a `.internal` host, and a public host that 302-redirects to a private IP. All must return `blocked-url`.
- [ ] **Auth**: `/api/analyze-site`, `/api/audits/create`, `/api/admin/usage` all return 401 with no/invalid token.
- [ ] **Credit cap**: a free account can save exactly **1** audit; the 2nd `POST /api/audits/create` returns 402, and a 2nd scan returns 402.
- [ ] **Client bypass**: attempt a direct `insert` into `audits` with the anon key — must be denied by RLS.
- [ ] **Rate limit**: rapid scans return 429 after the burst limit.
- [ ] **Admin**: `/api/admin/usage` returns 403 for a non-admin token; the Admin nav item is hidden for non-admins.

---
## 5. Operational readiness (recommended before scale)
- [ ] Error monitoring (e.g. Sentry) on client + serverless.
- [ ] Structured logging / alerting on webhook failures and 5xx.
- [ ] Transactional email wired (`api/send-report.js` is still a stub; Resend planned in Tier 4) — at minimum, password-reset email deliverability verified.
- [ ] Custom domain + HTTPS + `APP_URL` aligned.
- [ ] Privacy policy, terms of service, and a refund/cancellation policy published.
- [ ] Backup/restore plan for Supabase (point-in-time recovery enabled).
- [ ] Load-sanity: confirm scan timeouts/size caps hold under a few concurrent scans.

## 6. Known deferrals (not blockers, track post-launch)
- White-label rendering (logo/colors/share links) — schema exists (Tier 3 work).
- Lifecycle emails (welcome/trial-expiry/receipts) — Tier 4.
- PDF watermarking for the free tier — flag exists in `plans.js`, not yet applied to export.
- Per-IP (vs per-user) rate limiting — IP is logged in `usage_events.metadata` but limits are per-user today.
