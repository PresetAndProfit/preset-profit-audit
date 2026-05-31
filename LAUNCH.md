# 🚀 LAUNCH MODE — Execution Checklist (manual, in order)

Follow top to bottom. Each item: **Click → Screen → Value → Expected result.**

> **Two cross-dependencies to know up front (they shape the order):**
> 1. `APP_URL` and the Stripe **webhook secret** both need your final deployed domain. So you will: deploy once (Step 5) to get the domain → then set `APP_URL` + create the webhook → then **redeploy**.
> 2. Do the **entire flow in Stripe TEST mode first** (test keys + test webhook), confirm a test purchase works, *then* repeat Steps 3–4 with **live** keys. The real-card test (Step 6) only happens in live mode.

> **Supabase key naming:** newer projects show "Publishable" + "Secret" keys; older ones show "anon" + "service_role". They map 1:1 — **anon = publishable** (client-safe), **service_role = secret** (server-only). Use whichever your project shows.

---

## 1 · Supabase migrations

**1.1 — Run the base schema**
- **Click:** Left sidebar → **SQL Editor** → **+ New query**
- **Screen:** Supabase Dashboard → SQL Editor
- **Value:** Paste the **entire contents of `database/schema.sql`**, then click **Run** (or Ctrl/Cmd+Enter)
- **Expected:** "Success. No rows returned." Tables `profiles, subscriptions, audits, leads, usage_events, shared_reports` now exist.

**1.2 — Run the Tier 2 hardening migration**
- **Click:** **+ New query** → paste → **Run**
- **Screen:** SQL Editor
- **Value:** Paste the **entire contents of `database/tier2.sql`**
- **Expected:** "Success." This drops client INSERT/UPDATE on `audits`, adds `profiles.is_admin`, and creates the `admin_usage_overview` view. **Until this runs, the free-audit limit is bypassable — do not skip.**

**1.3 — Verify RLS is on**
- **Click:** Left sidebar → **Database** → **Tables** (or **Authentication → Policies**)
- **Screen:** Table list
- **Value:** Visually confirm each table shows **"RLS enabled"**; `audits` should have only **Select** + **Delete** policies (no Insert/Update).
- **Expected:** All six tables RLS-enabled; `audits` has no client insert policy.

**1.4 — Configure Auth URLs**
- **Click:** Left sidebar → **Authentication** → **URL Configuration**
- **Screen:** Auth settings
- **Value:** **Site URL** = your production domain (e.g. `https://app.presetandprofit.com`). Under **Redirect URLs**, add `https://<your-domain>/reset-password`.
- **Expected:** Saved. (If you don't have the domain yet, come back after Step 5.)

**1.5 — Email confirmation**
- **Click:** **Authentication** → **Providers** → **Email**
- **Screen:** Email provider settings
- **Value:** For production, **enable "Confirm email"**.
- **Expected:** New signups must confirm via email before first login.

---

## 2 · Environment variables (collect the values)

You'll paste these into Vercel in Step 5. Gather them now into a scratch note.

**2.1 — Supabase URL + keys**
- **Click:** Gear icon → **Project Settings** → **API** (or **API Keys**)
- **Screen:** Settings → API
- **Value (copy these):**
  - **Project URL** → used for both `VITE_SUPABASE_URL` **and** `SUPABASE_URL`
  - **anon / publishable** key → `VITE_SUPABASE_ANON_KEY`
  - **service_role / secret** key → `SUPABASE_SERVICE_ROLE_KEY`  *(secret — never `VITE_`)*
- **Expected:** You have 3 distinct values noted.

**2.2 — Full variable list you'll need** (paste targets in Step 5)
```
VITE_SUPABASE_URL            = https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY       = <anon/publishable key>
SUPABASE_URL                 = https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY    = <service_role/secret key>
APP_URL                      = https://<your-domain>        (set/confirm after Step 5)
STRIPE_SECRET_KEY            = sk_...                        (Step 3)
VITE_STRIPE_PUBLISHABLE_KEY  = pk_...                        (Step 3)
STRIPE_PRICE_PROFESSIONAL    = price_...                     (Step 3)
STRIPE_PRICE_AGENCY          = price_...                     (Step 3)
STRIPE_WEBHOOK_SECRET        = whsec_...                     (Step 4)
```
- **Expected:** A filled scratch list. Anything without `VITE_` is server-only.

---

## 3 · Stripe production setup

> Do this first in **TEST mode**, validate through Step 6, then repeat in **LIVE mode**. The test/live toggle is top-right of the Stripe dashboard.

**3.1 — Get API keys**
- **Click:** **Developers** → **API keys**
- **Screen:** Stripe → Developers → API keys
- **Value:** Copy **Secret key** → `STRIPE_SECRET_KEY`; **Publishable key** → `VITE_STRIPE_PUBLISHABLE_KEY`. (Test keys are `sk_test_`/`pk_test_`; live are `sk_live_`/`pk_live_`.)
- **Expected:** Both keys noted for the current mode.

**3.2 — Create the two products + prices (scripted)**
- **Click:** *(local terminal in the project, not a dashboard)*
- **Screen:** Your terminal at `C:\dev\preset-profit-audit`
- **Value:** Put `STRIPE_SECRET_KEY=<the key for this mode>` in `.env.local`, then run:
  ```
  npm run setup:stripe
  ```
- **Expected:** Prints two lines — `STRIPE_PRICE_PROFESSIONAL=price_…` ($49/mo) and `STRIPE_PRICE_AGENCY=price_…` ($399/mo). Copy them into your env list.
- **Manual alternative:** Stripe → **Products** → **+ Add product** → name "Professional", price **$49.00 / month recurring** → save → copy the **API ID** of the price (`price_…`). Repeat for "Agency" at **$399.00 / month**.

**3.3 — Activate the customer billing portal**
- **Click:** **Settings** (gear) → **Billing** → **Customer portal**
- **Screen:** Stripe → Settings → Billing → Customer portal
- **Value:** Toggle the portal **active**; allow customers to **cancel** and **update payment method**.
- **Expected:** "Manage billing" in the app will open a working portal.

---

## 4 · Webhook setup

> Needs your deployed URL. If you don't have it yet, do **Step 5 first**, then return here.

**4.1 — Create the webhook endpoint**
- **Click:** **Developers** → **Webhooks** → **+ Add endpoint**
- **Screen:** Stripe → Developers → Webhooks
- **Value:**
  - **Endpoint URL:** `https://<your-domain>/api/stripe/webhook`
  - **Events to send:** select `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
- **Expected:** Endpoint created and listed.

**4.2 — Copy the signing secret**
- **Click:** Click the new endpoint → **Reveal** under "Signing secret"
- **Screen:** The endpoint's detail page
- **Value:** Copy `whsec_…` → `STRIPE_WEBHOOK_SECRET` (then add/update it in Vercel and **redeploy**)
- **Expected:** Webhook secret stored in Vercel.

**4.3 — (Local test-mode option)** To test webhooks locally instead:
- **Value:** `stripe listen --forward-to localhost:5173/api/stripe/webhook` → copy its `whsec_…` into local `.env.local`.
- **Expected:** Stripe CLI shows events forwarding when you test.

---

## 5 · Vercel deployment

**5.1 — Import the project** (first time)
- **Click:** **Add New…** → **Project** → import the Git repo
- **Screen:** Vercel Dashboard → New Project
- **Value:** Framework preset **Vite**; build command `npm run build`; output dir `dist` (Vercel auto-detects). Don't deploy yet — add env vars first.
- **Expected:** Project created, build settings detected.

**5.2 — Add environment variables**
- **Click:** Project → **Settings** → **Environment Variables**
- **Screen:** Vercel → Settings → Environment Variables
- **Value:** Add **every** variable from your Step 2.2 list, **Environment = Production** (also tick Preview if you preview-test). Use the **live** Stripe values once you're past test mode.
- **Expected:** ~10 variables saved. Confirm no secret key has a `VITE_` prefix.

**5.3 — Deploy**
- **Click:** **Deployments** → **Redeploy** (or push to the `main` branch)
- **Screen:** Vercel → Deployments
- **Value:** Trigger a production deploy.
- **Expected:** Build succeeds; you get a live URL. **Now set `APP_URL` to that domain (Step 2/5.2) and create the webhook (Step 4), then redeploy once more** so the success/redirect URLs and webhook are correct.

**5.4 — Confirm runtime**
- **Screen:** `vercel.json` (already in repo) pins functions to `nodejs22.x` — no action, just confirm the deploy didn't warn about it.
- **Expected:** Functions run on Node 22.

**5.5 — Grant yourself admin**
- **Click:** Supabase → **SQL Editor** → New query
- **Value:** `update public.profiles set is_admin = true where email = '<your-login-email>';` (after you've signed up once on the live app)
- **Expected:** The **Admin** nav item appears in the app for your account.

---

## 6 · Live payment test

> First pass in **TEST mode**, then a **real-card** pass in live mode.

**6.1 — Sign up**
- **Click:** Visit `https://<your-domain>` → **Create account** → confirm email → log in
- **Expected:** Lands in the app on the **Free** plan; sidebar shows "0 / 1 audits".

**6.2 — Run the free audit (confirms the core product + credit meter)**
- **Click:** **New Audit** → enter a business + a real public URL → run
- **Expected:** A scanned report generates and saves. Sidebar shows "1 / 1". Starting a 2nd audit shows the **upgrade panel** (free limit enforced).

**6.3 — Upgrade**
- **Click:** **Account** → **Upgrade to Professional →**
- **Screen:** Stripe Checkout
- **Value:** **Test mode:** card `4242 4242 4242 4242`, any future expiry, any CVC/ZIP. **Live mode:** a real card.
- **Expected:** Redirect back to **Account**; plan flips to **Professional**; audit limit becomes **Unlimited**.

**6.4 — Verify webhook + portal**
- **Click:** Stripe → **Developers → Webhooks →** your endpoint → recent deliveries
- **Expected:** `checkout.session.completed` and a `customer.subscription.*` show **200**. In the app, **Manage billing** opens the Stripe portal. Cancel there → app downgrades to Free at period end.

**6.5 — (Live) refund the test charge**
- **Click:** Stripe → **Payments** → the charge → **Refund**
- **Expected:** Your real-card test charge is refunded.

---

## 7 · Security verification

**7.1 — Get a logged-in access token**
- **Click:** In the live app (logged in) open **DevTools → Network** → click any `/api/...` request → **Headers** → copy the `Authorization: Bearer <token>` value (the part after `Bearer `).
- **Expected:** You have a token string.

**7.2 — Run the automated gate**
- **Click:** *(local terminal)*
- **Screen:** terminal at `C:\dev\preset-profit-audit`
- **Value:**
  ```
  BASE_URL=https://<your-domain> TOKEN=<token from 7.1> node scripts/verify-security.mjs
  ```
- **Expected:** ✅ on: auth required (401 without token) on `/api/analyze-site`, `/api/audits/create`, `/api/admin/usage`; SSRF blocked for `169.254.169.254`, `127.0.0.1`, `10.0.0.1`, `localhost`. Exit code 0.

**7.3 — Manual checks the script prints**
- **Free credit cap:** with a second **free** account, a 2nd audit/scan returns **402**.
- **No client bypass:** in Supabase SQL editor, an `insert into audits ...` as an anon context is denied by RLS (the app's anon key cannot insert).
- **Rate limit:** rapid repeated scans return **429** after the burst limit (12/min).
- **Expected:** All three behave as described.

---

## 8 · Go-live checklist (final gate before announcing)

- [ ] `schema.sql` **and** `tier2.sql` run on the **production** Supabase project.
- [ ] All env vars set in Vercel (Production); no secret carries a `VITE_` prefix.
- [ ] Stripe in **LIVE** mode: live keys, live `price_…` IDs, live webhook with `whsec_…` in Vercel.
- [ ] `APP_URL` = production domain; redeployed after setting it.
- [ ] One **real-card** subscribe → upgrade → cancel cycle completed and refunded.
- [ ] `scripts/verify-security.mjs` exits **0**; the three manual security checks pass.
- [ ] Legal pages live and **`{{PLACEHOLDERS}}` in `src/lib/legalContent.js` filled + lawyer-reviewed**.
- [ ] Supabase **email confirmation ON**; password-reset email delivers.
- [ ] You can sign up, run an audit, and view a shared `/r/:token` link in an incognito window.
- [ ] (Recommended) Supabase point-in-time recovery / backups enabled.

**When every box is checked, you are live and accepting payments.**
