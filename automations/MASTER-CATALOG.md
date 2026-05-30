# Preset & Profit — Automation Marketplace
**Master Catalog of client-ready automations for local businesses**

Every automation in this catalog is built to be sold, installed, and supported as a productized service. Pricing assumes ~70%+ margin after Twilio/OpenAI/API pass-through. Target verticals across the catalog: **HVAC, plumbing, roofing, dental, barbers/salons, restaurants, auto repair, real estate.**

> Build status legend: ✅ Built & importable · 🟡 Scaffolded (folder ready) · ⬜ Planned

## Quick reference

| # | Automation | Setup | Monthly | Build time | Status |
|---|---|---|---|---|---|
| 01 | Missed Call Recovery System | $750–1,000 | $397 | 0.5–1 day | ✅ |
| 02 | Lead Capture & Follow-Up Engine | $750–1,000 | $397 | 0.5–1 day | ✅ |
| 03 | Review & Reputation Engine | $500–750 | $297 | 0.5 day | ✅ |
| 04 | Appointment Reminder & No-Show Recovery | $500–750 | $297 | 0.5–1 day | ✅ |
| 05 | Database Reactivation Campaign | $1,000–1,500 | $250 + rev-share | 1 day | 🟡 |
| 06 | Estimate / Quote Follow-Up Sequence | $600–900 | $297 | 0.5–1 day | 🟡 |
| 07 | AI Receptionist (24/7 Voice + Chat) | $1,500–3,000 | $797–1,500 | 3–5 days | 🟡 |
| 08 | Referral Generator | $500–750 | $247 | 0.5 day | 🟡 |
| 09 | Invoice & Payment Reminder (AR) | $500–800 | $297 | 0.5–1 day | 🟡 |
| 10 | Long-Term Nurture & Newsletter Engine | $750–1,000 | $347 | 1 day | 🟡 |

**Bundle play:** package 01 + 02 + 03 as the **"Never Lose a Lead" suite** — $1,500 setup / $897/mo. Most local businesses need all three.

---

## 01 — Missed Call Recovery System ✅
- **Problem solved:** Businesses miss 20–40% of calls and lose those leads to competitors. This texts the caller back in ~10s, qualifies with AI, alerts the owner, and follows up.
- **Ideal customer:** High-call-volume service businesses — HVAC, plumbing, roofing, auto repair, dentists, restaurants taking reservations.
- **Setup fee:** $750–1,000
- **Monthly fee:** $397 (Pro)
- **ROI:** One recovered HVAC/plumbing job ($150–$500+) per month pays for the service. At a 15–30% recovery rate on missed calls, a shop missing 50 calls/mo recovers 7–15 conversations → typically 2–5 booked jobs → **$300–$2,500/mo recovered** vs. $397 cost. Net ROI commonly **3–6x in month one**.
- **Required integrations:** n8n, Twilio (voice + SMS), OpenAI, Google Sheets (or Airtable), Gmail.
- **Estimated implementation time:** 0.5–1 day hands-on (gated by A2P 10DLC carrier approval).
- **Folder:** [`01-missed-call-recovery/`](01-missed-call-recovery/README.md)

## 02 — Lead Capture & Follow-Up Engine ✅
- **Problem solved:** Web-form / Google LSA / Facebook leads go cold fast — responding in 5 min vs 30 min can 10x contact rates. This instantly texts + emails new web leads, qualifies, and books.
- **Ideal customer:** Anyone running ads or a "contact us" form — roofers, real estate agents, dentists, med-spas, HVAC.
- **Setup fee:** $750–1,000
- **Monthly fee:** $397
- **ROI:** Lead-response studies show contacting within 5 minutes makes a lead ~21x more likely to qualify. Recovering even 2–3 extra deals/mo on ad spend already being paid for is **5–10x** the fee.
- **Required integrations:** n8n, webhook/Facebook Lead Ads/Typeform, Twilio, OpenAI, Google Sheets, Gmail, (optional) Calendly.
- **Estimated implementation time:** 0.5–1 day.
- **Folder:** [`02-speed-to-lead-responder/`](02-speed-to-lead-responder/README.md)

## 03 — Review & Reputation Engine ✅
- **Problem solved:** Few happy customers leave reviews, and bad ones surprise the owner. This requests Google reviews automatically after a job, routes unhappy customers to a private apology flow first.
- **Ideal customer:** Reputation-driven local businesses — dentists, restaurants, salons, auto repair, contractors.
- **Setup fee:** $500–750
- **Monthly fee:** $297
- **ROI:** More 5-star reviews directly lift map-pack ranking and call volume. Going from 30 → 150 reviews routinely raises lead volume 20–40%. Even a 10% lead lift dwarfs $297/mo.
- **Required integrations:** n8n, Twilio/Gmail, Google Business Profile review link, OpenAI (reply drafting), Google Sheets.
- **Estimated implementation time:** 0.5 day.
- **Folder:** [`03-review-reputation-engine/`](03-review-reputation-engine/README.md)

## 04 — Appointment Reminder & No-Show Recovery ✅
- **Problem solved:** No-shows waste chairs/bays/time. This sends SMS/email reminders, confirms, and re-books no-shows automatically.
- **Ideal customer:** Appointment-based businesses — dentists, salons/barbers, med-spas, auto repair, real estate showings.
- **Setup fee:** $500–750
- **Monthly fee:** $297
- **ROI:** A dental practice losing 8 no-shows/mo at ~$200 each = $1,600 lost. Cutting no-shows 50% recovers ~$800/mo vs $297. **2.5x+** plus reclaimed staff time.
- **Required integrations:** n8n, calendar source (Google Calendar/Calendly/Acuity/Jobber), Twilio, Gmail, Google Sheets.
- **Estimated implementation time:** 0.5–1 day.
- **Folder:** [`04-appointment-reminder-noshow/`](04-appointment-reminder-noshow/README.md)

## 05 — Database Reactivation Campaign 🟡
- **Problem solved:** Every business has a list of past customers/dead leads doing nothing. This runs an AI-personalized win-back SMS/email campaign to that list.
- **Ideal customer:** Any business with 200+ past customers — HVAC (maintenance plans), dentists (recall), salons, auto repair.
- **Setup fee:** $1,000–1,500
- **Monthly fee:** $250 + optional rev-share (often sold as a one-time campaign + retainer).
- **ROI:** Highest immediate ROI in the catalog — reactivating a cold list costs almost nothing and a 2–5% response on 1,000 contacts = 20–50 conversations → real booked revenue within days. Frequently **5–15x** on the setup fee.
- **Required integrations:** n8n, customer list (CSV/CRM), Twilio, OpenAI, Gmail, Google Sheets.
- **Estimated implementation time:** 1 day.
- **Folder:** [`05-database-reactivation/`](05-database-reactivation/README.md)

## 06 — Estimate / Quote Follow-Up Sequence 🟡
- **Problem solved:** Quotes get sent and forgotten. Most contractors never follow up past once. This runs a polite multi-touch SMS/email sequence on every open estimate until won/lost.
- **Ideal customer:** Quote-heavy trades — roofers, HVAC installs, remodelers, auto body, landscapers.
- **Setup fee:** $600–900
- **Monthly fee:** $297
- **ROI:** Closing even 1 extra $5,000–$15,000 roof/HVAC job per month from follow-up alone is a **20x+** return.
- **Required integrations:** n8n, quoting source (Jobber/ServiceTitan/Sheet/QuickBooks), Twilio, OpenAI, Gmail, Google Sheets.
- **Estimated implementation time:** 0.5–1 day.
- **Folder:** [`06-estimate-quote-followup/`](06-estimate-quote-followup/README.md)

## 07 — AI Receptionist (24/7 Voice + Chat) 🟡
- **Problem solved:** No one to answer calls/chats after hours or during rushes. An AI voice + web-chat agent answers, qualifies, books appointments, and escalates emergencies.
- **Ideal customer:** Businesses losing after-hours/overflow calls — HVAC, plumbing, dental, real estate, high-volume restaurants.
- **Setup fee:** $1,500–3,000 (premium flagship)
- **Monthly fee:** $797–1,500
- **ROI:** Replaces or augments a receptionist ($2,500–4,000/mo loaded) and captures after-hours emergency jobs worth $300–$1,000 each. Easy **3–5x** for busy shops; also a strong anchor/upsell from #01.
- **Required integrations:** n8n, Twilio Voice + a voice-AI layer (e.g. Vapi/Retell/ElevenLabs), OpenAI, calendar, Google Sheets/CRM, Gmail.
- **Estimated implementation time:** 3–5 days.
- **Folder:** [`07-ai-receptionist/`](07-ai-receptionist/README.md)

## 08 — Referral Generator 🟡
- **Problem solved:** Word-of-mouth is the best lead source but happens randomly. This asks happy customers for referrals at the right moment and tracks/rewards them.
- **Ideal customer:** Service businesses with loyal customers — salons, dentists, contractors, real estate.
- **Setup fee:** $500–750
- **Monthly fee:** $247
- **ROI:** Referred leads close at 2–4x normal rates and cost $0 in ad spend. A handful of referral jobs/mo is a **5x+** return with near-zero usage cost.
- **Required integrations:** n8n, Twilio/Gmail, OpenAI, Google Sheets, (optional) reward/gift-card API.
- **Estimated implementation time:** 0.5 day.
- **Folder:** [`08-referral-generator/`](08-referral-generator/README.md)

## 09 — Invoice & Payment Reminder (AR) 🟡
- **Problem solved:** Unpaid invoices tie up cash. This sends automated, escalating payment reminders with pay-links until invoices are settled.
- **Ideal customer:** Businesses that invoice — contractors, auto repair, B2B services, freelancers/agencies.
- **Setup fee:** $500–800
- **Monthly fee:** $297
- **ROI:** Faster collection of even $3,000–$10,000 in outstanding AR/mo improves cash flow immediately; reduces write-offs. Pays for itself on the first recovered invoice.
- **Required integrations:** n8n, QuickBooks/Stripe/Square/Jobber, Twilio, Gmail, Google Sheets.
- **Estimated implementation time:** 0.5–1 day.
- **Folder:** [`09-invoice-payment-reminder/`](09-invoice-payment-reminder/README.md)

## 10 — Long-Term Nurture & Newsletter Engine 🟡
- **Problem solved:** Leads not ready today get forgotten. This keeps the business top-of-mind with AI-generated seasonal/maintenance SMS + email touches.
- **Ideal customer:** Seasonal/recurring-need businesses — HVAC (seasonal tune-ups), dentists (6-mo recall), salons, real estate (market updates).
- **Setup fee:** $750–1,000
- **Monthly fee:** $347
- **ROI:** Recurring touches drive repeat/seasonal jobs that would otherwise go to competitors; one HVAC tune-up season can book dozens of jobs from the existing list. **High lifetime-value multiplier.**
- **Required integrations:** n8n, Twilio, OpenAI, Gmail/email platform, Google Sheets/CRM.
- **Estimated implementation time:** 1 day.
- **Folder:** [`10-nurture-newsletter-engine/`](10-nurture-newsletter-engine/README.md)

---

### How to read this catalog
Each automation folder follows the same structure as `01-missed-call-recovery/`: a `README.md` with the full 15-section build spec, importable n8n workflow JSON(s), `.env.example`, database schema, AI prompts, checklists, and an implementation playbook. Folders 02–10 are scaffolded with their catalog entry and the build template, ready to be built out one at a time.
