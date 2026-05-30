# Automation #05 — Database Reactivation Campaign
**Preset & Profit · Client-Ready Build**

Turns a client's dormant customer list into booked revenue: imports past customers, sends AI-personalized win-back texts on a **throttled, consent-gated, business-hours drip**, handles replies and **STOP opt-outs** automatically, and routes interested customers straight to the owner. The catalog's **highest immediate ROI** — and its **highest compliance responsibility**.

> Files: `workflow-1-campaign-sender.json` · `workflow-2-reply-handler.json` · `.env.example` · `contacts-sheet-header.csv` · `google-sheets-structure.md` · `ai-prompts.md` · `checklists.md` · `IMPLEMENTATION-PLAYBOOK.md`

---

## 1. Business Objective
Every established business has hundreds or thousands of past customers who simply drifted. Re-engaging them costs almost nothing and converts far better than cold leads because the relationship already exists. **Objective:** systematically and *compliantly* re-contact that list with a personal, offer-driven message, capture the interested ones, and book them — typically driving real revenue within **days**. A 2–5% response on 1,000 contacts = 20–50 live conversations.

## 2. Workflow Architecture
```
Client list (CRM/POS export) ─▶ cleaned + Consent=Yes ─▶ Google Sheet (Contacts)

WF1 drip (every 10 min, business hours):
  read ─▶ filter [Consent=Yes, not opted-out, not sent, under daily cap] ─▶ loop
       ─▶ AI personalize ─▶ append "Txt STOP to opt out" ─▶ send SMS ─▶ mark sent ─▶ throttle gap ─▶ next

WF2 reply handler (webhook):
  inbound SMS ─▶ STOP? ─┬─ yes ─▶ suppress (Opted_Out=Yes)
                        └─ no  ─▶ AI classify ─▶ reply ─▶ update ─▶ interested? ─▶ alert owner
```
**WF1** safely meters the outbound blast. **WF2** handles every reply, with opt-out checked *before* anything else.

## 3. n8n Node-by-Node Build Plan
**WF1 — Campaign Sender (9 nodes)**
1. **Every 10 min (drip)** → 2. **Read Contacts** → 3. **Filter Eligible (Consent + Cap)** (Code: business-hours gate, daily-cap count via `Sent_At` dates, consent + opt-out + already-sent filters, slice to batch size) → 4. **Loop Contacts** → 5. **Personalize (AI)** (JSON: one win-back SMS) → 6. **Build Message (+ STOP)** (Code: fallback copy + **always appends opt-out**) → 7. **Send Reactivation SMS** (Twilio) → 8. **Mark Sent** (Sheets) → 9. **Throttle Gap** (Wait `SEND_GAP_SEC`).

**WF2 — Reply & Opt-Out Handler (12 nodes)**
1. **Reply Webhook** → 2. **Respond** → 3. **Normalize Reply** → 4. **Is Opt-Out?** (IF regex stop/unsubscribe/cancel/quit/end) →
  - **yes:** 5. **Suppress (Opt-Out)** (`Opted_Out=Yes`, Status `Opted Out`).
  - **no:** 6. **Find Contact** → 7. **Classify Reply (AI)** → 8. **Parse Reply** → 9. **Send AI Reply** → 10. **Update Contact** → 11. **Interested?** (IF) → 12. **Alert Owner** (Gmail).

## 4. Exact Integrations
| Integration | Use | n8n credential |
|---|---|---|
| **Google Sheets** | Contact list + state | `googleSheetsOAuth2Api` |
| **Twilio** | Throttled outbound + inbound replies + STOP | `twilioApi` |
| **OpenAI** | Personalize + classify | `openAiApi` |
| **Gmail** | Owner alert on interested | `gmailOAuth2` |
| **n8n** | Drip cron + Wait throttle | — |

## 5. Environment Variables / API Keys
See `.env.example`. Campaign controls: `OFFER`, `BATCH_SIZE`, `DAILY_CAP`, `SEND_GAP_SEC`, `BUSINESS_HOURS_START/END`. ⚠ **Set the n8n timezone.**

## 6. Database Structure
See `google-sheets-structure.md` / `contacts-sheet-header.csv`. Two compliance columns are the heart of it: **`Consent` (only `Yes` is ever sent)** and **`Opted_Out` (permanent suppression)**. Sender matches on `Contact_ID`; replies match on `Customer_Phone`.

## 7. Error Handling
- WF2 responds to Twilio first; async downstream.
- **Opt-out is checked first, deterministically** (regex), before any AI or send — STOP can never be missed due to a model error.
- AI personalize/classify both have safe fallbacks (templated copy / generic reply).
- `continueOnFail` on sends so one bad number doesn't halt the drip.
- Global error workflow + logging; staged rollout limits blast radius of any mistake.

## 8. Duplicate Prevention
- `Sent_At` + Status check means a contact is messaged **once** per campaign; re-runs skip them.
- `appendOrUpdate` keyed on `Contact_ID`/`Customer_Phone` → one row per contact.
- Opt-outs permanently excluded from all future runs.

## 9. Retry Logic
- Retry-On-Fail on Twilio/Sheets.
- The drip cron is self-healing: an unsent eligible contact is simply picked up next run (until cap).
- Throttle gap + daily cap protect carrier standing (the real failure mode for bulk SMS is getting filtered/blocked, not a single send erroring).

## 10. AI Prompts
See `ai-prompts.md`. Personalizer writes the win-back; classifier sorts replies. **Compliance is enforced in code, not the prompt** — the opt-out line is always appended. ~**$5–$10 in AI per 1,000 contacts.**

## 11–13. Setup / Testing / Deployment
See `checklists.md` — which opens with a hard compliance gate. Key practices: clean the list to E.164, set `Consent` honestly, **A2P 10DLC approved before sending**, test on your own phones only, and **stage the rollout** (start with a low daily cap, watch opt-out rate, scale up).

## 14. Pricing / Package Recommendation
| Package | Price | Includes |
|---|---|---|
| **One-time campaign** | **$1,000–1,500** | List cleaning, setup, personalized drip, reply handling, closeout report |
| **Campaign + retainer** ⭐ | $1,000 setup + **$250/mo** | Above + monthly re-engagement sends to new lapsed customers |
| **Rev-share** | setup + **% of recovered revenue** | For clients who prefer performance pricing (track via `Rebooked`) |

ROI pitch: "We'll wake up your existing customer list — most clients see booked jobs within the first week." This is the easiest automation to sell on results.

## 15. Upgrade Opportunities
Email channel alongside SMS (for no-phone contacts) · segmentation by `Last_Service`/`Last_Visit` for tailored offers · seasonal recurring reactivation (ties into Automation #10) · A/B-tested offers · auto-booking for interested replies (Calendly) · CRM write-back of outcomes · win-back analytics dashboard.

---
**Status: ✅ Built & importable.** WF1 9 nodes, WF2 12 nodes, both valid JSON, using `new Date()`/`$now` date math (version-safe). **Not run against a live stack** — first test (your own numbers only) is the go-live gate. Honest, important caveats: this automation carries **real legal/compliance weight** — it must only be run with genuine consent and an **approved A2P 10DLC campaign**, opt-outs are sacred, and rollout should be staged. The build enforces consent + opt-out at the data and code layers, but **you are responsible for the consent basis of the list** — that can't be automated away.
