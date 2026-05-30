# Checklists — Invoice & Payment Reminder (AR)

## ⚠ Compliance gate (read first)
This texts customers about money owed. TCPA + carrier A2P rules apply, and tone/conduct matter. **Do not send a single message until all of these are true:**
- [ ] Reminders go only to customers with a **real invoice** and a prior business relationship (not purchased lists).
- [ ] **A2P 10DLC** brand + campaign is **Approved** (use case: Account Notification / Customer Care; sample messages include a reminder + STOP language).
- [ ] Every SMS carries **business identity + opt-out** ("Reply STOP to opt out" — appended in WF2 code automatically).
- [ ] Copy is **professional and non-threatening** — no legal threats, no harassment, no fees unless `LATE_FEE_TEXT` is set to the client's real, agreed terms.
- [ ] Quiet/business hours set; **n8n timezone matches the client**; daily cap conservative for a new number.

## 11. Client Setup Checklist (~half day)
- [ ] Collect: business name, industry, owner email + **cell**, billing/payment terms, whether a **late fee** applies (exact wording or none), business hours, timezone.
- [ ] Confirm the **billing source**: QuickBooks / Stripe / Square / Jobber / other / spreadsheet / manual — and whether it can fire **invoice-sent** and **payment-received** webhooks.
- [ ] Decide the **reminder cadence** (`REMINDER_DAYS`, default `0,3,7,14` from due date) and channel mix (`REMINDER_CHANNELS`).
- [ ] Set `HIGH_VALUE_INVOICE`, `PROMISE_SNOOZE_DAYS`, and `LATE_FEE_TEXT` (blank unless real).
- [ ] Provision Twilio number + **register/confirm A2P 10DLC**.
- [ ] Create the Google Sheet with tabs `Invoices`, `Reminder_Log`, `Payments`, `Opt_Outs`, `Status_History`; ID → `GSHEET_INVOICES_ID`.
- [ ] Import both workflows; map credentials; copy WF1's webhook URL.
- [ ] Point the billing tool's invoice + payment webhooks and Twilio inbound SMS at WF1's URL.

## 12. Testing Checklist (test on YOUR phones only)
- [ ] POST a sample invoice (your number, with a `due_date` and `pay_link`) → `Invoices` row, `Status=Open - Reminders Scheduled`, `Next_Reminder_At` ≈ due date.
- [ ] POST the **same invoice again** → updates the row (dedup on `Invoice_ID`), no duplicate.
- [ ] POST a high-value invoice (≥ `HIGH_VALUE_INVOICE`) → owner gets the high-value email.
- [ ] Force a due reminder (set `Next_Reminder_At` to the past) → run WF2 → reminder sends on the right channel **with pay link + "Reply STOP to opt out."**, `Reminder_Step` advances, `Next_Reminder_At` moves to the next offset.
- [ ] Confirm tone **escalates** across steps and the final step says "final reminder," all professional.
- [ ] Reply "already paid" → `AI_Class=PAID`, status `Paid - Reported`, sequence **stops**, owner alerted to confirm.
- [ ] Reply "I'm disputing this charge" → `Disputed=Yes`, sequence **stops**, owner alerted; reply apologizes and does **not** argue.
- [ ] Reply "I'll pay Friday" → `Promised to Pay`, reminders **snoozed** `PROMISE_SNOOZE_DAYS`, owner alerted.
- [ ] Reply a question → answered, sequence **continues** on schedule.
- [ ] Reply **STOP** → `Opted_Out=Yes`, `Opt_Outs` row, excluded from all future runs.
- [ ] Fire the **payment webhook** (`event=paid`, `invoice_id`) → invoice marked `Paid`, `Balance=0`, sequence stops, `Payments` row, receipt SMS sent.
- [ ] Set `Balance` to 0 via an updated invoice post → marked `Paid`, reminders stop.
- [ ] Confirm the **daily cap** and **business-hours** gate behave.
- [ ] If `LATE_FEE_TEXT` is blank, confirm **no fee is ever mentioned**.

## 13. Deployment Checklist
- [ ] A2P 10DLC **Approved**; STOP path tested; opt-out language verified on every SMS.
- [ ] Start with a conservative `DAILY_CAP`; watch delivery + opt-out rate before scaling.
- [ ] Activate WF1 (capture/payments/replies) + WF2 (scheduler).
- [ ] Confirm invoice + payment webhooks are flowing in and paid invoices stop reminding.
- [ ] Enable the global error workflow + logging.
- [ ] Weekly report: invoices in sequence, reminders sent, replies, disputes, $ collected, opt-outs.
- [ ] Keep `Opted_Out=Yes` contacts permanently suppressed.
