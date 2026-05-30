# Automation #04 — Appointment Reminder & No-Show Recovery
**Preset & Profit · Client-Ready Build**

Pulls appointments from the client's booking system, sends timed SMS reminders (24h + 2h), captures confirm/reschedule/cancel replies with AI, alerts the front desk on changes, and — when someone no-shows — automatically texts a rebook offer and alerts the owner. Cuts no-shows and recaptures the revenue from the ones that slip.

> Files: `workflow-1-appointment-engine.json` · `workflow-2-reminder-noshow-scheduler.json` · `.env.example` · `appointments-sheet-header.csv` · `google-sheets-structure.md` · `ai-prompts.md` · `checklists.md` · `IMPLEMENTATION-PLAYBOOK.md`

---

## 1. Business Objective
No-shows are pure lost revenue — an empty chair/bay/slot that can't be resold. A dental practice losing 8 no-shows/mo at ~$200 each bleeds ~$1,600/mo; salons, med-spas, and auto shops lose the same way. **Objective:** maximize confirmations with well-timed reminders, make rescheduling frictionless (so a conflict becomes a moved appointment instead of a no-show), and auto-recover the no-shows that still happen. Target: cut no-shows **30–50%** and rebook a chunk of the rest.

## 2. Workflow Architecture
```
Booking made (Calendly/Acuity/Google Cal/CRM/manual) ─▶ n8n Webhook (/appointment-engine) ─┬─ New Appt ─▶ dedup ─▶ log (Scheduled)
Customer replies C/R/X ─▶ Twilio SMS ───────────────────────────────────────────────────────┴─ SMS Reply ─▶ AI classify
                                                                                                  ├─ confirm  ─▶ Status Confirmed + ack
                                                                                                  ├─ reschedule/cancel ─▶ Status + ack + alert owner
                                                                                                  └─ question ─▶ ack + alert owner

Cron (15 min) ─▶ read appts ─▶ for each: 24h reminder? 2h reminder? no-show? ─▶ send ─▶ update flags
                                                                                   no-show ─▶ rebook text + owner alert
```
**WF1** (event-driven): logs new appointments and handles inbound replies. **WF2** (time-driven): reminders + no-show recovery, all on plain Date math.

## 3. n8n Node-by-Node Build Plan
**WF1 — Core (15 nodes)**
1. **Appointment Webhook** `POST /appointment-engine` · 2. **Respond** · 3. **Route Event** (Switch: `MessageSid` → reply; else new appt).
- New-appt branch: 4. **Normalize Appointment** (Code: maps Calendly/Acuity/Cal/CRM/manual, E.164, parses `Appt_Time` to ISO, derives `Appointment_ID`) → 5. **Find Existing** (dedup by `Appointment_ID`) → 6. **Is New Appointment?** (IF) → 7. **Log Appointment** (Status `Scheduled`, flags `No`).
- Reply branch: 8. **Normalize Reply** → 9. **Find Appointment** → 10. **Classify Reply (AI)** (JSON: action/needs_owner/summary/suggested_reply) → 11. **Parse Reply** (Code: maps action→status, safe fallback) → 12. **Send Acknowledgement** (Twilio) → 13. **Update Appointment** (Sheets) → 14. **Needs Owner?** (IF) → 15. **Alert Owner** (Gmail) on reschedule/cancel/question.

**WF2 — Scheduler (10 nodes)**
1. **Every 15 min** → 2. **Read All** → 3. **Find Due Actions** (Code: pure `Date` math — emits `reminder24` / `reminder2` / `noshow` with templated copy, respecting flag caps) → 4. **Loop Appointments** → 5. **Route Action** (Switch) →
  - **No-Show:** 6. **Send No-Show Rebook** → 7. **Alert Owner (No-Show)** → 8. **Mark No-Show Handled**.
  - **Reminder:** 9. **Send Reminder** → 10. **Mark Reminder Sent** (flips the right 24h/2h flag).

## 4. Exact Integrations
| Integration | Use | n8n credential |
|---|---|---|
| **Booking source** | Calendly/Acuity/Google Calendar/CRM/manual → /appointment-engine | (webhook) |
| **Twilio** | Reminders, acks, no-show rebook, inbound C/R/X | `twilioApi` |
| **OpenAI** | Classify replies | `openAiApi` |
| **Google Sheets** | Appointment pipeline DB | `googleSheetsOAuth2Api` |
| **Gmail** | Front-desk alerts | `gmailOAuth2` |

## 5. Environment Variables / API Keys
See `.env.example`. Timing: `REMINDER_LEAD_1_MIN` (24h), `REMINDER_LEAD_2_MIN` (2h), `NOSHOW_GRACE_MIN` (30). ⚠ **Set the n8n timezone** — this automation is fully time-driven, and `Appt_Time` must be ISO 8601.

## 6. Database Structure
See `google-sheets-structure.md` / `appointments-sheet-header.csv`. Match key is `Appointment_ID` (so the same customer can have multiple appointments). Flags (`Reminder_24h_Sent`, `Reminder_2h_Sent`, `NoShow_Handled`) cap each action to once.

## 7. Error Handling
- Webhook responds first; async downstream.
- Reminder copy is **templated, not AI** → no AI dependency for the core reminder function (cheaper + can't fail on a bad model response).
- AI reply classifier has a safe fallback (owner alerted, ack still sent).
- `continueOnFail` on all sends so one failure doesn't stall the batch.
- Flag caps + status checks prevent duplicate/again-and-again sends.
- Global error workflow + logging.

## 8. Duplicate Prevention
- Dedup by `Appointment_ID` before logging.
- Per-action flags (`Reminder_24h_Sent`/`Reminder_2h_Sent`/`NoShow_Handled`) ensure each reminder and the rebook fire **once**.
- `appendOrUpdate` keyed on `Appointment_ID` keeps one row per appointment.

## 9. Retry Logic
- Retry-On-Fail on Twilio/Sheets/Gmail.
- The 15-min cron naturally re-attempts any action that didn't complete (flag only flips after a successful send path).
- Split-In-Batches (1) paces sends.

## 10. AI Prompts
See `ai-prompts.md`. Only inbound replies use AI (one tiny JSON call: confirm/reschedule/cancel/question + ack). Reminders/no-show copy are deterministic templates. ~**<$0.005 per reply**.

## 11–13. Setup / Testing / Deployment
See `checklists.md`. Two install specifics: connect the **booking source** (Calendly/Acuity webhook is fastest), and verify **timezone + ISO times** with a live test so reminders don't land at 3am.

## 14. Pricing / Package Recommendation
| Package | Setup | Monthly | Includes |
|---|---|---|---|
| **Starter** | $500 | **$247** | 24h reminder, confirm capture, owner alerts, Sheet |
| **Pro** ⭐ | $500–750 | **$297** | + 2h reminder, reschedule/cancel handling, **no-show auto-rebook**, monthly report |
| **Elite** | $750–1,000 | **$397+** | + email channel, two-way reschedule into the calendar, multi-provider/locations, attendance sync |

ROI pitch: "Recover 4 no-shows/mo at $200 = $800 vs $297." Easy yes for dental/med-spa/salon.

## 15. Upgrade Opportunities
Two-way reschedule that writes back into Calendly/Google Calendar · email + SMS dual reminders · waitlist auto-fill (offer a freed slot to the next person) · deposit collection on booking (Stripe) to reduce no-shows · recurring-appointment recall (ties into Automation #10) · attendance sync from the CRM for true no-show detection · multi-location routing.

---
**Status: ✅ Built & importable.** Validated as structure + parseable JSON (WF1 15 nodes, WF2 10 nodes), **not** run against a live stack — first end-to-end test is the go-live gate. Uses robust `new Date()` math (not the `$DateTime` helper) so the scheduler is version-safe. Two honest limitations: **timezone correctness is critical** (verify with a live reminder), and **true no-show detection needs attendance data** — auto-recovery covers never-confirmed appointments; confirmed-but-absent requires the client to mark `Status=No-Show` or feed attendance from their system.
