# Automation #03 — Review & Reputation Engine
**Preset & Profit · Client-Ready Build**

After a job is finished, this automatically asks the customer for a rating, then **gates the result**: happy customers get the Google review link; unhappy or ambiguous customers get a private apology and the owner gets an instant alert to fix it offline — **before** it becomes a public 1-star. Rounds out the "Never Lose a Lead" bundle with #01 (calls) and #02 (forms).

> Files: `workflow-1-review-engine.json` · `workflow-2-request-scheduler.json` · `.env.example` · `reviews-sheet-header.csv` · `google-sheets-structure.md` · `ai-prompts.md` · `checklists.md` · `IMPLEMENTATION-PLAYBOOK.md`

---

## 1. Business Objective
Online reviews drive local search ranking and trust — more 5-star reviews = higher map-pack position = more calls. But happy customers rarely review unprompted, and unhappy ones review loudly. **Objective:** systematically ask every completed-job customer for a review, maximize positive public reviews, and **intercept negative feedback privately** so it's resolved instead of published. Target: move a business from a trickle of reviews to a steady stream, and cut public negatives.

## 2. Workflow Architecture
```
Job completed (CRM / Google Form / manual) ─▶ n8n Webhook (/review-engine) ─┬─ Completed Job ─▶ dedup ─▶ queue (Send_At = done + delay)
Customer texts rating ─▶ Twilio SMS ────────────────────────────────────────┴─ SMS Reply ─▶ AI sentiment gate
                                                                                              │
                                                          ┌───────── Happy? ─────────┐
                                                          ▼ yes                       ▼ no / ambiguous
                                                 Send Google review link      Send private apology
                                                 Status: Positive             + Alert owner (Gmail)
                                                                              Status: Negative

Cron (15 min) ─▶ read ─▶ filter queued & due & in-hours ─▶ send "rate 1-5" ─▶ mark Asked (+1 reminder max)
```
**WF1** (event-driven): logs completed jobs and runs the sentiment gate on replies. **WF2** (time-driven): sends the rating request at the right time, in business hours, with one reminder.

## 3. n8n Node-by-Node Build Plan
**WF1 — Core (17 nodes)**
1. **Review Engine Webhook** `POST /review-engine` · 2. **Respond** (empty TwiML) · 3. **Route Event** (Switch: `MessageSid` → reply; else completed job).
- Completed-job branch: 4. **Normalize Job** (Code; maps CRM/form/manual, E.164, computes `Send_At`) → 5. **Find Existing** (dedup) → 6. **Not Asked Recently?** (IF) → 7. **Queue Review Request** (Sheets append, Status `Queued`).
- Reply branch: 8. **Normalize Reply** → 9. **Find Customer** → 10. **Classify Sentiment (AI)** (JSON: rating/sentiment/is_happy/summary/private_reply) → 11. **Parse Sentiment** (Code, safe fallback) → 12. **Happy?** (IF) →
  - **yes:** 13. **Send Review Link** (Twilio) → 14. **Update (Positive)**.
  - **no:** 15. **Send Private Apology** (Twilio) → 16. **Alert Owner** (Gmail) → 17. **Update (Negative)**.

**WF2 — Scheduler (6 nodes)**
1. **Every 15 min** → 2. **Read All** → 3. **Filter Due Requests** (Code: queued + `Send_At` due + within business hours + not replied; also sends one reminder to un-answered asks) → 4. **Loop Customers** → 5. **Send Review Request** (Twilio "rate 1-5") → 6. **Mark Asked** (Status `Asked - Awaiting Rating`, reminder cap).

## 4. Exact Integrations
| Integration | Use | n8n credential |
|---|---|---|
| **Completed-job trigger** | CRM/FSM webhook, Google Form, or sheet → /review-engine | (webhook) |
| **Twilio** | Rating request, review link, private apology, inbound replies | `twilioApi` |
| **OpenAI** | Sentiment gate classification | `openAiApi` |
| **Google Sheets** | Review pipeline DB | `googleSheetsOAuth2Api` |
| **Gmail** | Owner negative-feedback alert | `gmailOAuth2` |
| **Google Business Profile** | The review link target | (link only; API optional for upgrade) |

## 5. Environment Variables / API Keys
See `.env.example`. Notable: `GOOGLE_REVIEW_LINK` (the whole product hinges on this being correct), `REVIEW_DELAY_MIN`, `BUSINESS_HOURS_START/END`, `REVIEW_REMINDER_MIN`. ⚠ **Set the n8n timezone** to the client's zone.

## 6. Database Structure
See `google-sheets-structure.md` / `reviews-sheet-header.csv`. Pipeline keyed on `Customer_Phone`; lifecycle `Queued → Asked → Positive | Negative`.

## 7. Error Handling
- Webhook responds first; async downstream.
- **Fail-safe gate:** if the AI errors/returns junk, the Parse fallback sets `is_happy=false` → routes to the **private** path and alerts the owner. The system never accidentally pushes a public review on failure.
- `continueOnFail` on the scheduler's send.
- Business-hours + reminder caps prevent spammy sends.
- Global error workflow + logging.

## 8. Duplicate Prevention
- Dedup lookup before queuing (won't ask the same customer twice in a window).
- Phone-keyed `appendOrUpdate` on all updates → one row per customer.
- `Reminder_Sent` flag caps reminders at exactly one.
- `Last_Inbound_At` halts further sends once they reply.

## 9. Retry Logic
- Retry-On-Fail on Twilio/Sheets/Gmail.
- WF2's 15-min cadence naturally retries un-sent queued asks next cycle.
- Split-In-Batches (1) paces sends.

## 10. AI Prompts
See `ai-prompts.md`. The classifier is **deliberately conservative** — neutral/ambiguous → private path — because one mis-pushed public 1-star costs far more than one missed review. Optional Prompt 2 drafts owner replies to public reviews (upgrade). ~**<$0.005 per reply**.

## 11–13. Setup / Testing / Deployment
See `checklists.md`. Two install specifics: get the **Google review link** right (test on mobile), and pick the **completed-job trigger** (CRM webhook > Google Form > manual sheet).

## 14. Pricing / Package Recommendation
| Package | Setup | Monthly | Includes |
|---|---|---|---|
| **Starter** | $500 | **$247** | Review request + gate, Google link, owner alerts, Sheet |
| **Pro** ⭐ | $500–750 | **$297** | + reminder logic, business-hours, monthly reputation report, email channel |
| **Elite** | $750–1,000 | **$397+** | + AI owner-reply drafting on new Google reviews, multi-location, review-site expansion (Facebook/Yelp) |

**Bundle:** #01 + #02 + #03 = **"Never Lose a Lead" suite** ($1,500 setup / $897/mo).

## 15. Upgrade Opportunities
AI auto-drafted replies to incoming Google reviews (owner approves) · multi-platform (Facebook/Yelp/industry sites) · review-to-social: auto-post 5-star reviews to the client's social · monthly reputation scorecard · negative-feedback resolution tracking · QR-code/in-person review cards tied to the same flow · Google Business Profile API integration for live review monitoring.

---
**Status: ✅ Built & importable.** Same honest caveat as #01/#02: validated as structure + parseable JSON (WF1 17 nodes, WF2 6 nodes), **not** run against a live stack — first end-to-end test (especially the happy-vs-unhappy gate) is the go-live gate. Two real-world dependencies to verify: the **Google review link works on mobile**, and the **owner actually acts on negative alerts** (the interception only pays off if they follow up).
