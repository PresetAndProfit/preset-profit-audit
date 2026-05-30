# Automation #1 — Missed Call Recovery System
**Preset & Profit · Client-Ready Build**

Turns every missed call into a text-back conversation that qualifies the lead, logs it, alerts the owner, and follows up automatically. Built for HVAC, plumbing, roofing, dental, barbers, restaurants, auto repair, and real estate.

> Files in this folder:
> - `workflow-1-missed-call-recovery.json` — core workflow (import into n8n)
> - `workflow-2-followup-scheduler.json` — follow-up cron (import into n8n)
> - `.env.example` — all environment variables
> - `google-sheets-structure.md` — database schema
> - `ai-prompts.md` — OpenAI prompts + industry tones
> - `checklists.md` — setup / testing / deployment

---

## 1. Business Objective
Local service businesses miss **20–40% of inbound calls** (after hours, on jobs, with another customer). A missed call from a high-intent buyer (burst pipe, no AC, toothache) usually goes straight to a competitor. Industry data puts a recovered service lead at **$150–$500+** in job value.

**Objective:** respond to a missed call within ~10 seconds via SMS, hold the conversation with AI, qualify intent + urgency, route a hot lead to the owner instantly, and nurture cold ones — with zero human effort. Target: recover **15–30%** of missed calls into live conversations.

## 2. Workflow Architecture
```
                 ┌─────────── Twilio Number (forward + SMS) ───────────┐
   Caller ──▶ Twilio Voice ──(no-answer/busy)──▶  n8n Webhook
                                                       │
                                                  Route Event ──┬── Missed Call ─▶ dedup ─▶ first SMS ─▶ log lead
                                                                │
   Caller ──▶ Twilio SMS reply ─────────────────────────────────┴── SMS Reply ─▶ find lead ─▶ AI qualify
                                                                                       │
                                          ┌────────────────────────────────────────────┤
                                          ▼                  ▼                          ▼
                                   Update Sheet      Notify owner (Gmail)        AI reply SMS to customer

   Cron (every 15 min) ─▶ read leads ─▶ filter due & no-reply ─▶ follow-up SMS ─▶ update state ─▶ Cold after max
```
Two workflows: **WF1 (event-driven)** handles missed calls + replies on one webhook; **WF2 (time-driven)** runs the follow-up sequence.

## 3. n8n Node-by-Node Build Plan

**WF1 — Core (`workflow-1-missed-call-recovery.json`)**
1. **Twilio Inbound Webhook** — POST `/missed-call-recovery`. One URL for both voice status callbacks and inbound SMS.
2. **Respond to Twilio** — returns empty `<Response/>` TwiML immediately (keeps Twilio fast; processing continues async).
3. **Route Event** (Switch) — `Body` present → SMS Reply branch; `DialCallStatus/CallStatus` ∈ {no-answer,busy,failed,canceled} → Missed Call branch.
4. **Normalize Missed Call** (Set) — extract `From/Caller`, `To`, city, CallSid, status, timestamp.
5. **Find Existing Lead (Call)** (Google Sheets read, filter `Customer_Phone`) — for dedup.
6. **Is New Lead?** (IF) — only continue if no existing row.
7. **Send First SMS** (Twilio) — the "sorry we missed you" text.
8. **Log New Lead** (Google Sheets append) — create the row, Status `Contacted - Awaiting Reply`, `Next_Follow_Up_At = +30m`.
9. **Normalize Reply** (Set) — extract `From`, `Body`, `MessageSid`.
10. **Find Lead (Reply)** (Google Sheets read) — pull the existing row + conversation.
11. **Qualify Lead (AI)** (OpenAI, JSON mode) — returns intent/service/urgency/qualified/score/summary/suggested_reply.
12. **Parse AI + Build Update** (Code) — parse JSON, append to transcript, fallback on parse error.
13. **Update Lead** (Google Sheets appendOrUpdate, match `Customer_Phone`) — write AI fields + Status.
14. **Notify Business (Gmail)** — owner alert with the lead summary + transcript.
15. **Send AI Reply SMS** (Twilio) — send the AI's suggested reply back to the customer.

**WF2 — Follow-Up (`workflow-2-followup-scheduler.json`)**
1. **Every 15 min** (Schedule Trigger).
2. **Read All Leads** (Google Sheets).
3. **Filter Due Follow-Ups** (Code) — awaiting/followed-up, no inbound reply, `Follow_Up_Count < MAX`, `Next_Follow_Up_At` is due.
4. **Loop Leads** (Split In Batches, size 1) — rate-safe iteration.
5. **Send Follow-Up SMS** (Twilio) — gentle nudge, with a different "last attempt" message.
6. **Update Follow-Up State** (Google Sheets) — increment count, set next time or mark `Cold - No Response`.

## 4. Exact Integrations Required
| Integration | Use | Auth in n8n |
|---|---|---|
| **Twilio** | Voice forwarding, missed-call callback, inbound + outbound SMS | `twilioApi` (Account SID + Auth Token) |
| **OpenAI** | Lead qualification + reply drafting | `openAiApi` (API key) |
| **Google Sheets** | Lead database (or Airtable) | `googleSheetsOAuth2Api` |
| **Gmail** | Owner notification | `gmailOAuth2` |
| **n8n** | Orchestration + cron | Cloud or self-hosted |

## 5. Environment Variables / API Keys
See `.env.example`. Key ones: `BUSINESS_NAME`, `BUSINESS_INDUSTRY`, `BUSINESS_SERVICE_AREA`, `OWNER_EMAIL`, `BOOKING_LINK`, `TWILIO_ACCOUNT_SID/AUTH_TOKEN/NUMBER`, `OPENAI_API_KEY/MODEL`, `GSHEET_LEADS_ID`, `MAX_FOLLOW_UPS`, `FOLLOW_UP_GAP_MIN`, `FIRST_FOLLOW_UP_MIN`. Credentials (Twilio/OpenAI/Sheets/Gmail) live in n8n's encrypted credential vault, **not** in env.

## 6. Database / Google Sheets Structure
See `google-sheets-structure.md`. `Leads` tab is the operational table; `Customer_Phone` (E.164) is the dedup key; optional `Config` tab drives multi-client deployments off one instance.

## 7. Error Handling
- **Webhook responds first** (node 2) so Twilio never times out, even if downstream fails.
- **Global error workflow** (n8n setting) → pings you on any failed execution.
- **AI fallback** — if OpenAI errors or returns non-JSON, the Code node ships a safe canned reply and still logs the lead (no dropped customer).
- **Opt-out guard** — `STOP/UNSUBSCRIBE/STOPALL` short-circuits before AI and before any send (Twilio also enforces this at the carrier level).
- **Quiet hours** (optional IF) — defer outbound texts outside business hours to avoid TCPA complaints.
- **Sheet write failures** — `Continue On Fail` on Gmail/SMS nodes so one channel failing doesn't block the others.

## 8. Duplicate Prevention
- **Phone-keyed upsert:** replies use `appendOrUpdate` matched on `Customer_Phone`, so repeat texts update one row.
- **New-lead guard:** missed-call branch checks for an existing row before appending.
- **MessageSid** is captured to detect/skip Twilio retries of the same inbound message.
- **One conversation per number** keeps the owner's view clean and prevents double alerts.

## 9. Retry Logic
- Twilio + Sheets nodes: enable **Retry On Fail** (3 attempts, ~2s back-off) for transient 429/5xx.
- WF2 follow-up cadence is itself a retry layer: `MAX_FOLLOW_UPS` attempts at `FOLLOW_UP_GAP_MIN` spacing.
- Split-In-Batches (size 1) in WF2 avoids Twilio rate spikes when many leads are due at once.
- n8n **error workflow** can re-queue a failed execution.

## 10. AI Prompts
See `ai-prompts.md` — JSON-mode qualifier with a strict schema, six industry tone presets, and compliance guardrails (no invented prices/medical advice, honors STOP, single-segment replies). ~**<$0.01 per lead** on `gpt-4o-mini`.

## 11–13. Setup / Testing / Deployment Checklists
See `checklists.md` (onboarding, pre-launch tests, go-live — including the **A2P 10DLC registration** that US SMS legally requires).

## 14. Pricing / Package Recommendation
Position on recovered revenue, not software cost. One saved HVAC job/month pays for a year.

| Package | Setup (one-time) | Monthly | What's included |
|---|---|---|---|
| **Starter** | $500–$750 | **$197/mo** | Missed-call text-back, AI qualify, owner email alert, Google Sheet, 2 follow-ups |
| **Pro** (recommended) | $750–$1,000 | **$397/mo** | + SMS owner alerts, booking-link automation, business-hours logic, monthly lead report, priority support |
| **Elite** | $1,000–$1,500 | **$597–$997/mo** | + CRM sync, review-request automation, reactivation campaigns, multi-location, call-recording summaries |

Add **usage pass-through** (Twilio + OpenAI ≈ $10–$40/mo) or bundle it. Target **70%+ margin**. Offer a 14-day pilot or performance guarantee ("recover leads or you don't pay month 2") to close.

## 15. Upgrade Opportunities (expansion revenue)
1. **Booking automation** — AI books straight into Calendly/Google Calendar.
2. **Review requests** — text a Google review link after a completed job.
3. **CRM sync** — push leads to HubSpot/GoHighLevel/ServiceTitan/Jobber.
4. **Database reactivation** — re-text old leads/customers on a schedule.
5. **Voicemail-to-text + AI summary** — read voicemails, summarize, alert.
6. **Web-chat + Facebook/Instagram DM** on the same AI brain (omnichannel).
7. **Owner dashboard** — a hosted analytics view (ties into your Preset & Profit audit app).
8. **Spanish/bilingual** auto-detect and reply.
9. **Payment links** for deposits via Stripe.
10. **Weekly performance report** — calls missed, recovered, booked, revenue influenced.
