# Growth OS — Production Deployment Checklist

This release turns the audit tool into the **Growth Operating System**: one Deal
record threading `Lead → Audit → Roadmap → Proposal → Outreach → CRM → Follow-up
→ Booked Call → Closed → Automation Sold`, plus the conversion funnel (value-
anchored upgrade, personalized booking CTA, activation email nudge).

**Architecture guarantee:** zero new serverless functions — still **12/12** on
the Vercel Hobby cap. All new backend routes through existing functions
(`audits/create.js` `{op:...}`, `send-report.js` cron + webhook).

---

## 0. Pre-deploy verification (run locally on `feature/growth-os`)

```bash
npm ci
npm run lint        # must be clean
npm run build       # must succeed
npm run smoke       # must print "✓ PASS — 29 passed, 0 failed"
```

Function-count guard (must print `12`):
```bash
find api -name '*.js' -not -path '*/_lib/*' | wc -l
```

---

## 1. Database migration (REQUIRED — run once, in order)

In the Supabase SQL editor, run **`database/phase2-crm.sql`** (idempotent,
additive — safe on the live DB; no destructive change).

It adds: `audits.stage / deal_value_cents / next_action_at / last_contact_at /
contact_email / contact_name / crm(jsonb)` + indexes, and `profiles.calendar_url`.

**Verify:**
```sql
select column_name from information_schema.columns
 where table_name='audits' and column_name in ('stage','crm','next_action_at');
select column_name from information_schema.columns
 where table_name='profiles' and column_name='calendar_url';
```
RLS is unchanged — existing "own audits/profile" policies already cover the new
columns. Legacy audit rows back-fill to `stage='audit'` automatically.

> Pre-migration safety: the client selects `*` and falls back to defaults, so the
> app keeps working even if deploy lands before the migration. Deal persistence,
> the activation sequence, and the booking field activate once the migration runs.

---

## 2. Environment variables (Vercel project settings)

Already required (confirm present):
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PROFESSIONAL`, `STRIPE_PRICE_AGENCY`
  — **`STRIPE_PRICE_PROFESSIONAL` is what the one-click upgrade resolves; verify it's set or upgrade buttons error.**
- `RESEND_API_KEY`, `RESEND_FROM` (`Preset & Profit <notifications@presetprofit.com>`), `RESEND_WEBHOOK_SECRET`
- `CRON_SECRET`, `APP_URL`

New behavior on existing vars:
- **Resend → enable click tracking** on the sending domain. Without it, the
  "🔗 Clicked booking link" CRM metric stays 0 (sends + opens still work).

New vars for the **Public Instant Audit Funnel** (`/audit`):
- `FUNNEL_OWNER_USER_ID` — **required to enable the funnel.** The Supabase auth
  user id that public leads/deals attach to (Justin's account; must be a REAL
  auth.users id and should be on a paid/unlimited plan). If unset, `/audit`
  returns "temporarily unavailable" (no breakage).
- `PUBLIC_FUNNEL_SECRET` — optional HMAC secret for the scan→capture token; falls
  back to `CRON_SECRET` if unset.
- Set the funnel owner's **booking link** (Account → Booking & outreach identity)
  so the public CTA + summary email point at a real calendar.

---

## 3. Cron (REQUIRED for activation reminders + follow-ups)

`runDailySweep` now also drives the **activation 24h/7d reminders** and
**operator follow-up reminders**. It runs via `POST /api/send-report` with
`{action:'cron', secret:<CRON_SECRET>}`.

If not already scheduled, set up pg_cron (see the commented block in
`database/phase1-email.sql`) or Vercel Cron to hit it **once daily**. Verify:
```bash
curl -s -X POST https://<app>/api/send-report \
  -H 'Content-Type: application/json' \
  -d '{"action":"cron","secret":"<CRON_SECRET>"}'
# → {"ok":true,"counts":{...,"activation":N,"followup_reminder":N}}
```

---

## 4. Resend delivery webhook (for open/click + booked tracking)

Confirm the Resend webhook points at `POST /api/send-report` (Svix-signed) and
`RESEND_WEBHOOK_SECRET` matches. This advances `email_log` AND mirrors
opens/clicks onto the deal (`crm.activation`) for the CRM funnel metrics.

---

## 5. Deploy

Merge the PR → Vercel auto-builds `main`. Confirm the build is green and the 12
functions deploy (no new ones).

---

## 6. Live smoke test (post-deploy, ~5 min — do this once in prod)

1. **Booking identity:** Account → *Booking & outreach identity* → set a real
   Calendly link → Save. (Reload; field persists.)
2. **Audit → Deal:** run an audit on a test business → it appears on the
   **Sales Pipeline** as a Deal at stage *Audited*.
3. **Roadmap → Proposal:** open it → *Build Roadmap* (stage → Roadmap) →
   *Download Proposal* (stage → Proposal; pipeline value populates). Open the PDF
   → **"Book the Kickoff Call" button must point to your Calendly link.**
4. **Outreach:** *Generate Outreach* → cold email contains your booking link
   (not `[your calendar link]`).
5. **Activation sequence:** on the Deal, set a **prospect email you control** →
   *Start activation sequence*. Within ~1 min the **immediate email arrives** at
   that address, personalized with the business name + revenue, booking-link CTA.
   - Open it → CRM shows **Opened 1** (after webhook). Click the button → **Clicked 1**.
   - Run the cron curl twice (step 5 above) → **no duplicate** immediate email.
6. **Booked call:** click **📞 Mark call booked** → sequence shows
   *Call booked — stopped*; the Pipeline activation funnel shows **Booked 1**.
7. **Upgrade path (free account):** dashboard shows the value-anchored upgrade
   banner → *Go Unlimited* → redirects to Stripe Checkout for Professional.

If all 7 pass, the funnel is live end-to-end.

### Public funnel smoke (after setting `FUNNEL_OWNER_USER_ID` + owner booking link)
8. Visit **`/audit`** (logged out). Enter a real business website + industry →
   *Get My Free Audit* → teaser shows scores + revenue leak + 2 gaps (rest locked).
9. Enter a **business email you control** → *Unlock Full Audit* → full report shows;
   a **summary email arrives** with the booking-link CTA.
10. In the app (as the funnel owner) → **Sales Pipeline** shows a new Deal at stage
    *Audited*, tagged inbound, with that prospect's email — ready for roadmap →
    proposal → activation. (Confirms public → CRM hand-off.)
11. Re-submit the same site/email → **no duplicate Deal** (dedupe by URL).
12. Abuse checks: rapid repeat scans from one IP get `429` after the per-IP cap;
    a `mailinator.com` email is rejected at the gate.

> **SEO:** ensure `/audit` is crawlable (it's the lead-gen surface) — add it to
> the sitemap / link it from the marketing site. The page is a public SPA route
> (served by the existing `/*` rewrite).

---

## 7. Rollback

- **Code:** revert the merge commit / redeploy the previous Vercel build. The
  migration is additive — leaving the columns in place is harmless on rollback.
- **Stop sends instantly without a deploy:** the activation sequence only sends
  for deals with `crm.activation.enabled=true`; it self-stops on `booked`/closed.
  To halt all sequences, pause the daily cron (the immediate touch is operator-
  initiated only).

---

## Known limitations (acceptable for first-customer launch)
- Activation/outreach emails send from the platform domain
  (`notifications@presetprofit.com`) — ideal for the Preset & Profit funnel;
  per-agency sending domains are a later enhancement.
- Marketplace service checkout is intentionally **not** wired to Stripe yet
  (different buyer model; needs Stripe products). Monetization runs via CRM
  sold-tracking until then.
- Multi-tenancy is soft (client labels), not enforced org isolation (`org_id`
  reserved for Phase 3).
