# Implementation Playbook — Invoice & Payment Reminder (AR)
**Preset & Profit · zero-to-live runbook** · example client **Acme Contracting**

Hands-on: **~half a day to a day**. This is an always-on service: invoices flow in from the client's billing tool, the engine sends escalating-but-respectful reminders on a due-date-anchored schedule, classifies replies, stops the instant an invoice is paid or disputed, and pings the owner on the ones that matter. The value is **faster cash collection + fewer write-offs**; the risk is **SMS compliance + tone**, so the playbook front-loads both.

Legend: 🟢 you · 🔵 client (guided) · ⚠ gotcha

## ⚠ STEP 0 — Compliance pre-flight (do before anything else)
- [ ] Confirm reminders go only to customers with a **real invoice / prior relationship**.
- [ ] Start **A2P 10DLC** registration immediately; use case *Account Notification*; include a reminder + STOP sample.
- [ ] Decide the **late-fee** policy. If none, `LATE_FEE_TEXT` stays blank and nothing ever mentions a fee. If yes, get the exact, agreed wording.
- [ ] Agree the tone: professional, never threatening. (Most self-billing isn't FDCPA "debt collection," but tone + TCPA still matter.)

## STEP 1 — Client signs agreement 🔵🟢
- [ ] Send agreement + order form ($500–800 setup / $297/mo). Collect A2P 10DLC legal info. Take payment.

## STEP 2 — Client gives access 🔵
- [ ] Billing tool: QuickBooks / Stripe / Square / Jobber / other; can it webhook **invoice-sent** + **payment-received**?
- [ ] Owner email + **cell**, payment terms, late-fee policy, business hours, timezone.

## STEP 3 — Decide the schedule 🟢
- [ ] `REMINDER_DAYS` (default `0,3,7,14` from due date; add a negative like `-3` for a pre-due courtesy) and `REMINDER_CHANNELS`.
- [ ] `HIGH_VALUE_INVOICE`, `PROMISE_SNOOZE_DAYS`, `LATE_FEE_TEXT`.

## STEP 4 — System installation (n8n) 🟢
1. [ ] Import `workflow-1-invoice-capture.json` and `workflow-2-ar-reminder-scheduler.json`.
2. [ ] Create + attach the 4 credentials on each ⚠ node (Google Sheets, Twilio, OpenAI, Gmail).
3. [ ] Set Variables from `.env.example`.
4. ⚠ **Set the n8n timezone** (hours gate + due-date math depend on it).
5. [ ] Copy WF1's webhook Production URL (`/webhook/invoice-intake`).

## STEP 5 — Google Sheets 🟢
- [ ] Create the sheet with tabs `Invoices`, `Reminder_Log`, `Payments`, `Opt_Outs`, `Status_History` (headers in `google-sheets-structure.md`). ID → `GSHEET_INVOICES_ID`; grant edit access.

## STEP 6 — Wire the billing source 🟢🔵
- [ ] **Best:** point the tool's **invoice-sent** and **payment-received** webhooks at WF1. The Normalize node maps QuickBooks/Stripe/Square/Jobber/generic (incl. Stripe unix `due_date` + `hosted_invoice_url`) and **dedupes on `Invoice_ID`**; the payment event marks the invoice paid and stops reminders.
- [ ] **Or:** sync open invoices into the `Invoices` tab on a schedule (mind E.164 phones + a real `Pay_Link`).

## STEP 7 — Twilio + 10DLC 🟢
- [ ] Buy number (SMS), set `TWILIO_NUMBER` + `OWNER_PHONE`.
- [ ] Messaging "A Message Comes In" → WF1 URL (replies + STOP route here).
- [ ] ⚠ Confirm A2P 10DLC **Approved** before any real send.

## STEP 8 — OpenAI 🟢
- [ ] API key → credential, low cap (~$10/mo plenty), `gpt-4o-mini` + JSON mode.

## STEP 9 — Testing (your phones only) 🟢
Run `checklists.md` §12 with test invoices on YOUR numbers. Verify: capture + dedup, high-value alert, escalating reminders with pay link + appended STOP, reply classification (paid/dispute/promise/question), the payment-webhook → paid → stop path, STOP suppression, daily cap, business hours, and — critically — that **no late fee is ever mentioned when `LATE_FEE_TEXT` is blank** and copy never threatens. **Do not test against the client's real AR.**

## STEP 10 — Go-live 🟢🔵
1. [ ] 10DLC approved, STOP tested.
2. [ ] Conservative `DAILY_CAP`. Activate WF1 + WF2.
3. [ ] Confirm invoices + payments are flowing and paid invoices stop reminding (no chasing paid customers!).
4. [ ] **Watch day 1:** delivery, opt-out %, disputes, reply tone. If anything reads harsh, soften copy.
5. [ ] Work `Disputed` / `Promised to Pay` rows with the owner.
6. [ ] Weekly report: invoices worked, reminders sent, replies, disputes, **$ collected**, opt-outs.

## What can still block you
1. **A2P 10DLC / consent** — gating issue; no approval = no send.
2. **Paid-but-still-reminding** — the #1 way to anger customers. Wire the **payment webhook** (or a balance sync) so paid invoices stop instantly; verify in testing.
3. **Timezone** — wrong zone sends off-hours and breaks the due-date schedule.
4. **Tone** — keep it respectful; never threaten or imply legal action over SMS.
5. **Partial payments** — re-post the invoice with the new balance; the row updates and reminders continue on the remainder.
6. **Exotic billing payloads** — confirm the Normalize node's field mapping with a real sample from the client's tool.
