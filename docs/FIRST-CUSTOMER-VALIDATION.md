# First Customer Validation Checklist

Objective: prove the Growth OS funnel works **in production with real data**, then
acquire the first paying customer. Work top to bottom. Nothing here is a new
feature — it's validation of what's already built.

---

## 0. Deploy (ordered — migration BEFORE the production push)
1. **Run the migration** on the production Supabase: `database/phase2-crm.sql`
   (idempotent, additive). Verify the columns exist (queries in `DEPLOY-GROWTH-OS.md` §1).
2. **Set/verify env vars** (§1 below) in Vercel **Production**.
3. **Merge & deploy:**
   ```bash
   git checkout main && git pull
   git merge --no-ff feature/growth-os
   git push origin main         # → triggers Vercel production build
   ```
4. Confirm the Vercel build is green and **12 functions** deploy (no new ones).

> The code is backward-compatible: if the deploy lands before the migration, the
> existing audit flow keeps working; only the new CRM writes error until the
> migration runs. The public funnel stays inert until `FUNNEL_OWNER_USER_ID` is set.

---

## 1. Environment variable verification (Vercel → Production)
| Var | Used by | Verify |
|---|---|---|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | client auth/data | app loads, login works |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | all `/api` | audits save |
| `APP_URL` | email/checkout links | links point at the prod domain |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | checkout/webhook | test upgrade reaches Stripe |
| `STRIPE_PRICE_PROFESSIONAL` / `STRIPE_PRICE_AGENCY` | checkout | **upgrade button resolves a price** (else `price-not-configured`) |
| `RESEND_API_KEY` / `RESEND_FROM` | all email | a test email sends |
| `RESEND_WEBHOOK_SECRET` | open/click tracking | `email_log` advances to delivered/opened |
| `CRON_SECRET` | daily sweep | cron curl returns `{ok:true}` |
| `ANTHROPIC_API_KEY` | AI consultant (optional) | authed audits get AI findings (public funnel uses none) |
| **`FUNNEL_OWNER_USER_ID`** | public funnel | **set to your real auth user id** — `/audit` activates |
| `PUBLIC_FUNNEL_SECRET` | funnel HMAC (optional) | falls back to `CRON_SECRET` |

**Built-in preflight:** `POST /api/stripe/checkout` returns `missing_*_price` if a
Stripe var is absent — a fast way to confirm Stripe config without a real charge.

**Also:** sign in as the funnel owner → Account → **Booking & outreach identity** →
set a real calendar link (Calendly etc.). Without it the funnel/proposal CTAs and
the activation sequence can't book a call.

---

## 2. Production smoke (run once, post-deploy)
Run the **7-step** core smoke + **8–12-step** public-funnel smoke in
`DEPLOY-GROWTH-OS.md` §6. Cron check:
```bash
curl -s -X POST https://<app>/api/send-report -H 'Content-Type: application/json' \
  -d '{"action":"cron","secret":"<CRON_SECRET>"}'
# → {"ok":true,"counts":{...,"activation":N,"followup_reminder":N}}
```

---

## 3. Five-flow verification (the funnel, end to end, with REAL data)
- [ ] **Public Audit Funnel** — visit `/audit` logged out → submit a real site →
      teaser (scores + revenue leak + 2 gaps) → enter a real email → full report
      unlocks → **summary email arrives** with a working booking-link CTA.
- [ ] **CRM** — as the funnel owner, the prospect appears on **Sales Pipeline** as a
      Deal (stage *Audited*, inbound tag, contact email). Move stages → persists on
      reload. Add a note → persists. Schedule a follow-up → shows ⏰ due.
- [ ] **Proposal Generation** — open the Deal → Build Roadmap → Download Proposal.
      Open the PDF → "Book the Kickoff Call" points at **your** calendar; ROI numbers
      match the audit; stage advances to *Proposal*, pipeline value populates.
- [ ] **Booking Flow** — booking link is correct in the proposal PDF, the outreach
      copy, and the summary email. Click **📞 Mark call booked** → activity logged,
      activation stops, pipeline "Booked" increments.
- [ ] **Email Sequence** — arm activation on a deal (real prospect email you own):
      immediate email arrives; open it → CRM "Opened" ticks; click the CTA → "Clicked"
      ticks; run the cron twice → **no duplicate** immediate email; follow-up cron sends
      the operator reminder when a follow-up is due.

A flow isn't "verified" until it works with a **real** website/email, not a test stub.

---

## 4. First-customer readiness gate (all must be true before driving traffic)
- [ ] Deploy green; 12 functions; migration applied; all env vars set.
- [ ] All five flows pass §3 with real data.
- [ ] **Booking calendar is real and bookable** (test-book it yourself end to end).
- [ ] **Payment path is live** — Stripe in **live mode**, `STRIPE_PRICE_*` are live
      prices; a real card can subscribe to Professional; the webhook flips the plan.
- [ ] Email domain authenticated (SPF/DKIM/DMARC pass in Resend) — see Risk #1.
- [ ] Legal pages reachable (`/terms`, `/privacy`, `/refund`) and a visible
      unsubscribe in lifecycle emails.
- [ ] Basic monitoring: watch Vercel logs + Resend bounce/complaint + the Admin
      Command Center for the first batch.
- [ ] A clear **offer + price** for the done-for-you automation (what you pitch on
      the booked call) — the funnel books the call; you still need the close.

---

## 5. Top 3 remaining conversion risks (watch these — they decide first revenue)

### Risk 1 — Email deliverability (highest)
The Audit→Booked-Call engine is email-driven, sent from the shared platform domain
to **cold prospects**. If those land in spam, opens→clicks→bookings collapse, and
bounces/complaints damage the domain that also carries trial/payment emails.
- **Mitigate:** verify SPF/DKIM/DMARC in Resend before any volume; warm up slowly
  (start with hand-picked, real prospects, not a blast); monitor Resend
  bounce/complaint; keep a visible unsubscribe; consider a `justin@`-style from
  for the activation sequence; **operator-triggered** activation (already chosen)
  keeps volume disciplined. **Measure:** delivered %, open %, spam-complaint %.

### Risk 2 — Distribution / traffic to `/audit`
The funnel converts, but nothing drives traffic to it yet. No visitors = no leads =
no customers, regardless of build quality.
- **Mitigate:** pick ONE channel to start — direct cold outreach with a personal
  audit link, a niche (one industry/city), or a partner who has the audience. The
  Outreach Generator + public audit link are designed exactly for founder-led cold
  outreach. **Measure:** unique `/audit` visits → teaser → email-unlock rate.

### Risk 3 — Public-audit credibility (no-AI deterministic + heuristic scan)
The public path uses the deterministic engine (no AI) and a regex-based site scan.
A false positive ("no chat window" when they have one) or numbers that feel
made-up break trust → no booking. Credibility is the conversion gate before the call.
- **Mitigate:** keep claims conservative and benchmark-sourced (the engine already
  "shows its math"); spot-check the first audits against the real sites for false
  positives; if accuracy is weak on the public path, gate the AI consultant behind
  the email (still no public AI cost pre-capture) as a fast follow. **Measure:**
  teaser→email-unlock rate and booked-call rate per audit.

> Honorable mention — **the close**: the funnel ends at a booked call; the first
> *paid* dollar still depends on the sales conversation + a frictionless way to pay.
> The SaaS subscription path is live; the done-for-you service checkout is manual
> (Stripe products deferred). Have an invoice/payment-link ready for the call.
