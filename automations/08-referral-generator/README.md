# Automation #08 — Referral Generator Engine
**Preset & Profit · Client-Ready Build**

Turns happy, completed-job customers into a steady stream of warm referrals — automatically. Captures and **qualifies** satisfied customers from any source, asks for a referral on a polite **3-touch SMS + email cadence** (initial / +3 days / +7 days), uses AI to classify every reply (REFERRAL_PROVIDED / COMPLAINT / NOT_NOW / …), **captures the referred lead** (via reply or a referral form), and alerts the owner the moment a referral lands — while never being pushy, never fabricating rewards, and stopping the instant a customer replies, opts out, or refers.

> Files: `workflow-1-referral-trigger.json` · `workflow-2-referral-request-sequence.json` · `workflow-3-referral-capture-alert.json` · `.env.example` · `google-sheets-structure.md` · `ai-prompts.md` · `checklists.md` · `IMPLEMENTATION-PLAYBOOK.md`

---

## 1. Business Objective
Most businesses finish a job, delight a customer, and never ask for a referral — losing the warmest, highest-converting, $0-cost leads they could get. Referred leads close at 2–4x the rate of cold traffic. **Objective:** systematically (and compliantly) ask the *right* customers — satisfied, completed, no open complaint, outside a cooldown — for an introduction, make it effortless to give one, capture it, and get it to the owner immediately. A few referral jobs a month is a multiple of the fee at near-zero usage cost.

## 2. Workflow Architecture
```
Happy completed customer (job/review/survey/CRM/Jobber/ServiceTitan/HCP/GHL) ─▶ WF1 webhook
WF1 (trigger & qualification):
  New customer ─▶ normalize ─▶ dedup on Customer_ID ─▶ QUALIFY (satisfied+complete+no complaint+not opted-out+cooldown) ─┬ eligible ─▶ Customers (queued, Day-0 due)
                                                                                                                          └ no ─▶ logged Not Eligible (reason)
  SMS reply ─▶ STOP? ─┬ yes ─▶ suppress + Opt_Outs
                      └ no  ─▶ AI classify ─▶ reply ─▶ stop sequence ─▶ referral? ─▶ log Referral ─▶ alert owner (complaint/referral/wants-call)

WF2 (request sequence, every 15 min, business hours):
  read ─▶ filter [eligible, active, not opted-out, not replied, not submitted, due, under cap] ─▶ loop
       ─▶ route channel ─▶ send SMS/Email (+STOP) ─▶ log request ─▶ advance step + cooldown ─▶ next

WF3 (referral capture & owner alert, form webhook):
  referral submitted ─▶ normalize ─▶ dedup on Referred_Phone ─▶ AI summarize/draft ─▶ Referrals
                     ─▶ stop referrer's sequence ─▶ owner email ─▶ (high-value/urgent/wants-contact) ─▶ owner SMS
```
**WF1** decides *who* to ask and handles their replies. **WF2** does the asking, safely metered. **WF3** captures the payoff and routes it to the owner.

## 3. n8n Node-by-Node Build Plan
**WF1 — Trigger & Qualification (23 nodes):** Trigger Webhook → Respond → Route Event (SMS Reply / New Completion). *New:* Normalize Customer → Find Existing → **Qualify Customer** (Code: full eligibility gate) → Eligible? → Log Eligible (+ Day-0 schedule) → Record Status, or Log Ineligible (reason). *Reply:* Normalize Reply → Is Opt-Out? → Suppress + Log Opt-Out, or Find Customer → Classify Reply (AI) → Parse Reply (Code: class→status, stop, referral extract, alert flag, fallback) → Send AI Reply → Update Customer → Referral In Reply? → Log Referral (SMS) → Owner Alert Needed? → Alert Owner.

**WF2 — Request Sequence (9 nodes):** Every 15 min → Read Customers → **Find Due Requests** (Code: business-hours gate, daily cap, skip opted-out/ineligible/inactive/replied/submitted, due check, per-step templated copy with appended STOP + optional incentive, next due) → Loop → Route Channel → Send Email / Send SMS → Log Request → Update Sequence State (+ `Last_Request_At` cooldown anchor).

**WF3 — Capture & Owner Alert (13 nodes):** Referral Webhook → Respond → Normalize Referral → Find Existing (dedup on Referred_Phone) → Is New? → Summarize Referral (AI) → Parse Referral → Log Referral → Update Referrer (stop their sequence) → Alert Owner Email → Escalate? → Alert Owner SMS; existing → Update Existing (mark Duplicate).

## 4. Exact Integrations
| Integration | Use | n8n credential |
|---|---|---|
| **Google Sheets** | Customers state + 5 log/ledger tabs | `googleSheetsOAuth2Api` |
| **Twilio** | Requests, inbound replies, STOP, owner SMS | `twilioApi` |
| **OpenAI** | Reply classification + referral summary/draft | `openAiApi` |
| **Gmail** | Owner alerts + email channel | `gmailOAuth2` |
| **n8n** | 2 webhooks + cron sequence | — |
| **Trigger source** | Completed job / review / survey / CRM / Jobber / ServiceTitan / HCP / GHL | — |

## 5. Environment Variables / API Keys
See `.env.example`. Gate: `MIN_SATISFACTION`, `REFERRAL_COOLDOWN_DAYS`, `REQUEST_DELAY_MIN`. Cadence: `REQUEST_DAYS` (`0,3,7`), `REQUEST_CHANNELS`. Reward: `REFERRAL_INCENTIVE` (**blank = never mention a reward**). Pacing: `DAILY_CAP`, `BUSINESS_HOURS_START/END`. ⚠ **Set the n8n timezone.**

## 6. Database Structure
See `google-sheets-structure.md`. Six tabs — **`Customers`** (state), **`Referral_Requests`**, **`Referrals`**, **`Activity_Log`**, **`Opt_Outs`**, **`Status_History`**. Match keys: `Customer_ID` (capture), `Customer_Phone` (replies), `Referred_Phone` (referral dedup).

## 7. Error Handling
- Both webhooks respond first; downstream is async.
- **Opt-out is checked first, deterministically** (regex) before any AI or send.
- Both AI calls have safe fallbacks (neutral classification / generic summary) so a bad model response never breaks the flow or sends pushy copy.
- `continueOnFail` on every Twilio/Gmail send.
- Unknown / empty lookups handled via `alwaysOutputData` + new-vs-existing checks.

## 8. Duplicate Prevention
- Customers dedupe on **`Customer_ID`**; referrals dedupe on **`Referred_Phone`** (second submission flagged `Duplicate`).
- `appendOrUpdate` keyed match → one row per customer/referral.
- WF2 advances `Sequence_Step` + `Next_Request_At` atomically → one touch per step.
- **Cooldown** (`Last_Request_At` + `REFERRAL_COOLDOWN_DAYS`) prevents re-asking the same customer.

## 9. Retry Logic
- Retry-On-Fail on Twilio/Sheets/Gmail.
- The cron is self-healing: a due-but-unsent customer is picked up next run (until the cap).
- Daily cap + business-hours pacing protect carrier standing.

## 10. AI Prompts
See `ai-prompts.md`. WF1 classifies replies into the six required classes (+ sentiment, complaint detection, extracted referral, owner summary, suggested reply). WF3 summarizes a referral and drafts owner outreach, flagging high-value/urgent. **Compliance, eligibility, stopping, and "no fabricated rewards" are enforced in code, not the prompt.** ~a few cents per customer.

## 11–13. Setup / Testing / Deployment
See `checklists.md` — opens with a compliance gate. Key practices: ask only genuinely-happy completed customers, **A2P 10DLC approved before sending**, keep `REFERRAL_INCENTIVE` blank unless a real reward exists, set the timezone, test on your own phones only, start with a conservative daily cap.

## 14. Pricing / Package Recommendation
| Package | Price | Includes |
|---|---|---|
| **Setup** | **$500–750** | Trigger + form integration, qualification + cadence config, all three workflows, testing |
| **Monthly** ⭐ | **$247/mo** | Always-on asking, reply handling, referral capture, owner alerts, support |
| **Bundles** | with #01/#02/#03/#05 | See below |

ROI pitch: "Your happiest customers become your best salespeople — automatically, and politely. Referred jobs close 2–4x better than ads, at zero ad cost."

**Bundle opportunities:** stacks naturally onto the **"Never Lose a Lead" suite (#01 + #02 + #03)** — capture and respond to leads, earn the 5-star review (#03), then ask that delighted customer for a referral (#08). Pairs especially well with **#05 Database Reactivation**: reactivate a lapsed customer, delight them again, then trigger #08. Sell #08 as the "growth flywheel" add-on to any retainer.

## 15. Upgrade Opportunities
Configurable two-sided reward fulfillment (gift-card API) once a client opts in · referral leaderboard / staff attribution from `Referral_Requests` + `Assigned_Staff` · auto-text the **referred** person (with consent) a friendly intro · printable/QR referral cards linking to the form · review-gated asks (only ask 5-star reviewers, tying into #03) · seasonal referral pushes (ties into #10) · CRM write-back of referral outcomes · referral-source analytics dashboard.

---
**Status: ✅ Built & importable.** WF1 23 nodes, WF2 9 nodes, WF3 13 nodes; all valid JSON, version-safe `new Date()`/`$now` date math (no `$DateTime`). Compliance (STOP-first, eligibility gate, cooldown, daily cap, business hours, no-fabricated-rewards) lives in **code, not the prompt**. **Not run against a live stack** — first test (your own numbers only) is the go-live gate. Honest caveats: this carries **real TCPA/A2P weight** — only ask genuinely-consented, satisfied customers and only with an **approved A2P 10DLC campaign**; **the quality of the "happy customer" trigger is everything** (asking an unhappy or mid-job customer is the worst failure — trust the satisfaction/complaint gate); **timezone correctness is critical** (cooldown + due + hours math depend on it); and exotic CRM/form payloads may need a small tweak to the Normalize nodes' key lists — test with a real sample.
