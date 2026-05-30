# Automation #09 — Invoice & Payment Reminder (AR)
**Preset & Profit · Client-Ready Build**

Gets invoices paid faster and cuts write-offs — automatically. Captures every invoice from any billing tool, sends an **escalating-but-respectful SMS + email reminder sequence anchored to the due date**, includes the pay link on every touch, uses AI to classify replies (PAID / DISPUTE / PROMISE_TO_PAY / …), and **stops the instant an invoice is paid or disputed** — while pinging the owner on disputes, promises, and high-value balances. Never threatening, never adding fees that weren't configured.

> Files: `workflow-1-invoice-capture.json` · `workflow-2-ar-reminder-scheduler.json` · `.env.example` · `google-sheets-structure.md` · `ai-prompts.md` · `checklists.md` · `IMPLEMENTATION-PLAYBOOK.md`

---

## 1. Business Objective
Unpaid invoices tie up cash and quietly become write-offs. Most businesses chase them manually, inconsistently, or not at all. **Objective:** automatically and professionally remind every customer about their balance on a sensible escalating cadence, make paying one tap away (pay link), handle replies intelligently, and stop chasing the moment they pay or dispute — improving cash flow on day one. Recovering even a few thousand dollars of AR per month, faster, dwarfs the fee.

## 2. Workflow Architecture
```
Billing tool (QuickBooks/Stripe/Square/Jobber/CRM/Sheet) ─▶ webhook ─▶ WF1

WF1 intake (webhook) routes 3 event types:
  New invoice   ─▶ normalize (multi-source) ─▶ dedup on Invoice_ID ─▶ Invoices sheet
                                                             └─ high-value? ─▶ alert owner
  Payment event ─▶ find invoice ─▶ mark Paid + stop ─▶ log Payment ─▶ receipt SMS
  SMS reply     ─▶ STOP? ─┬─ yes ─▶ suppress (Opted_Out + Opt_Outs)
                          └─ no  ─▶ AI classify ─▶ reply ─▶ paid/dispute stop · promise snooze ─▶ alert owner

WF2 AR scheduler (every 30 min, business hours):
  read ─▶ filter [active, not paid/disputed/opted-out, balance>0, due, under cap] ─▶ loop
       ─▶ route channel ─▶ send escalating SMS/Email (+pay link +STOP) ─▶ log ─▶ advance step + next due ─▶ next
```
**WF1** is the always-on intake for invoices, payments, and replies. **WF2** is the metered cron that works the escalating schedule and stops itself on terminal states.

## 3. n8n Node-by-Node Build Plan
**WF1 — Invoice Capture & Intake (26 nodes):** Invoice Intake Webhook → Respond → Route Event (SMS Reply / Payment Event / New Invoice). *New:* Normalize Invoice (Code: multi-source incl. Stripe unix due-date + hosted pay link, balance math, stable `Invoice_ID`, first-reminder schedule) → Find Existing → Is New? → Log New Invoice → Record Status → High-Value? → Alert Owner; existing → Update Existing (re-sync, mark Paid if balance ≤ 0). *Payment:* Find Invoice → Mark Paid → Log Payment → Send Receipt SMS. *Reply:* Normalize Reply → Is Opt-Out? → Suppress + Log Opt-Out, or Find Invoice → Classify Reply (AI) → Parse Reply (Code: class→status, stop/snooze, alert flag, fallback) → Send AI Reply → Update Invoice → Owner Alert Needed? → Alert Owner.

**WF2 — AR Scheduler (9 nodes):** Every 30 min → Read Invoices → **Find Due Reminders** (Code: business-hours gate, daily cap, skip paid/disputed/opted-out/inactive/zero-balance, due check, **escalating templated copy by step** with pay link + appended STOP + optional late-fee, due-date-anchored next offset) → Loop → Route Channel → Send Email / Send SMS → Log Reminder → Update Sequence State.

## 4. Exact Integrations
| Integration | Use | n8n credential |
|---|---|---|
| **Google Sheets** | Invoices state + 4 log/ledger tabs | `googleSheetsOAuth2Api` |
| **Twilio** | Reminders, inbound replies, STOP, receipt + owner SMS | `twilioApi` |
| **OpenAI** | Reply classification (PAID/DISPUTE/PROMISE/…) | `openAiApi` |
| **Gmail** | Email reminders + owner alerts | `gmailOAuth2` |
| **n8n** | Webhook intake + cron scheduler | — |
| **Billing source** | QuickBooks / Stripe / Square / Jobber (invoice + payment webhooks) | — |

## 5. Environment Variables / API Keys
See `.env.example`. Schedule: `REMINDER_DAYS` (`0,3,7,14` from due date), `REMINDER_CHANNELS`, `PROMISE_SNOOZE_DAYS`. Alerts: `HIGH_VALUE_INVOICE`. Fees: `LATE_FEE_TEXT` (**blank = never mention a fee**). Pacing: `DAILY_CAP`, `BUSINESS_HOURS_START/END`. ⚠ **Set the n8n timezone.**

## 6. Database Structure
See `google-sheets-structure.md`. Five tabs — **`Invoices`** (state), **`Reminder_Log`**, **`Payments`**, **`Opt_Outs`**, **`Status_History`**. Match keys: `Invoice_ID` (capture/payment), `Customer_Phone` (replies). Reminders are anchored to **`Due_Date`**; the sequence stops on `Balance ≤ 0`, `Disputed`, `Opted_Out`, or `Sequence_Active=No`.

## 7. Error Handling
- WF1 responds to the source first; downstream is async.
- **Opt-out is checked first, deterministically** (regex) before any AI or send.
- AI classification has a safe neutral fallback so a bad model response never sends harsh/wrong copy.
- `continueOnFail` on every Twilio/Gmail send.
- Unknown / empty lookups handled via `alwaysOutputData` + new-vs-existing checks.

## 8. Duplicate Prevention
- Capture dedupes on **`Invoice_ID`** (source id, else `source-invoice#`, else `phone-amount`): a re-sent invoice **updates** its row.
- `appendOrUpdate` keyed on `Invoice_ID`/`Customer_Phone` → one row per invoice.
- WF2 advances `Reminder_Step` + `Next_Reminder_At` atomically → one reminder per step.
- A payment event or `Balance ≤ 0` permanently stops reminders (no chasing paid invoices).

## 9. Retry Logic
- Retry-On-Fail on Twilio/Sheets/Gmail.
- The cron is self-healing: a due-but-unsent invoice is picked up next run (until the cap).
- Daily cap + business-hours pacing protect carrier standing.

## 10. AI Prompts
See `ai-prompts.md`. One classifier call per reply returns `class` (PAID/DISPUTE/PROMISE_TO_PAY/QUESTION/STOP/GENERAL), sentiment, dispute/promise flags, an owner summary, and a professional `suggested_reply`. **Stop/snooze/alert and "no fabricated fees or threats" are enforced in code, not the prompt.** Reminders are templated (no per-touch AI cost). ~a few cents per invoice.

## 11–13. Setup / Testing / Deployment
See `checklists.md` — opens with a compliance gate. Key practices: only invoice real customers, **A2P 10DLC approved before sending**, keep `LATE_FEE_TEXT` blank unless real, never threaten, wire the **payment webhook so paid invoices stop**, set the timezone, test on your own phones only.

## 14. Pricing / Package Recommendation
| Package | Price | Includes |
|---|---|---|
| **Setup** | **$500–800** | Billing-source + payment-webhook integration, schedule config, both workflows, testing |
| **Monthly** ⭐ | **$297/mo** | Always-on AR reminders, reply handling, owner alerts, support |
| **Bundle** | with #04 / #03 | Pairs with Appointment Reminders (#04) as the operational "get-paid + show-up" pack; reactivation/review automations cross-sell naturally |

ROI pitch: "Your invoices chase themselves — politely, on schedule, with a pay link — and stop the second someone pays. Most clients collect faster and write off less in month one."

## 15. Upgrade Opportunities
Native QuickBooks/Stripe/Square sync (read open invoices + write payments back) instead of webhooks · partial-payment tracking with auto-recalculated balances · pay-now SMS deep links / card-on-file · auto-escalation to a phone call or owner task after the final notice · statements (multiple invoices per customer rolled into one reminder) · aging dashboard (0–30 / 31–60 / 61–90) from `Reminder_Log` · configurable late-fee automation once a client opts in · collections-agency handoff export.

---
**Status: ✅ Built & importable.** WF1 26 nodes, WF2 9 nodes, both valid JSON, version-safe `new Date()`/`$now` date math (no `$DateTime`). Compliance (STOP-first, opt-out suppression, business hours, daily cap, no-threats / no-fabricated-fees, paid/disputed stop) lives in **code, not the prompt**. **Not run against a live stack** — first test (your own numbers only) is the go-live gate. Honest caveats: this carries **TCPA/A2P weight and tone sensitivity** — only remind real-invoice customers with an **approved A2P 10DLC campaign**, and keep copy professional; **wiring the payment webhook (or a balance sync) is essential** so paid invoices stop immediately — chasing a paid customer is the worst failure mode; **timezone correctness is critical** (due-date schedule + hours gate depend on it); the payment path assumes **full settlement** (partial payments: re-post the invoice with the new balance); and exotic billing payloads may need a small tweak to the Normalize node's key lists — test with a real sample.
