# Implementation Playbook — Appointment Reminder & No-Show Recovery
**Preset & Profit · zero-to-live runbook** · example client **Acme Dental**

Hands-on: **~2–3 hours**. The new work vs #01–#03 is (a) connecting the **appointment source** and (b) getting **timezone + ISO appointment times** right (this automation is entirely time-driven, so timezone errors send reminders at the wrong hour).

Legend: 🟢 you · 🔵 client (guided) · ⚠ gotcha

## STEP 1 — Client signs agreement 🔵🟢
- [ ] Send agreement + order form ($500–750 setup / $297/mo).
- [ ] Collect A2P 10DLC legal info.
- [ ] Confirm what they book in (Calendly/Acuity/Google Calendar/Dentrix/Jobber/paper) — this is the install's main variable.
- [ ] Take setup fee.

## STEP 2 — Client gives access 🔵
- [ ] Front-desk/owner email, **timezone**, business hours, reminder preferences (24h+2h is the default).
- [ ] Access to the booking system to add a webhook (Calendly/Acuity admin, calendar share, or CRM webhook permission).
- [ ] Confirm the source can emit **name, phone, ISO appointment time, service**.

## STEP 3 — System installation (n8n) 🟢
1. [ ] Import `workflow-1-appointment-engine.json` and `workflow-2-reminder-noshow-scheduler.json`.
2. [ ] Create + attach the 4 credentials on each ⚠ node.
3. [ ] Set Variables from `.env.example` (`REMINDER_LEAD_1_MIN`, `REMINDER_LEAD_2_MIN`, `NOSHOW_GRACE_MIN`).
4. ⚠ **Set the n8n timezone** to the client's local zone. This automation lives or dies on correct time math.
5. [ ] Copy WF1's webhook Production URL.

## STEP 4 — Wire the appointment source 🟢🔵 (main variable)
- **Calendly:** Integrations → Webhooks → subscribe to `invitee.created` → WF1 URL. Map invitee name/email + the SMS/phone question to the normalizer fields.
- **Acuity:** Integrations → Webhooks → "appointment scheduled" → WF1 URL.
- **Google Calendar:** use a Calendar trigger workflow (or a sync) that POSTs new events (with the customer phone in the event) to WF1.
- **CRM/FSM (Jobber/Housecall Pro/ServiceTitan):** appointment-created webhook → WF1 URL.
- **Manual:** a Google Form (name/phone/time/service) → webhook → WF1, or the front desk adds rows directly.
- [ ] Append `?source=<label>` so `Source` is tagged.
- [ ] Set the Twilio **Messaging** webhook → the same WF1 URL (so C/R/X replies route in).
- [ ] Submit one test booking → confirm a `Scheduled` row with a correct ISO `Appt_Time`.

## STEP 5 — Twilio + 10DLC 🟢
- [ ] Buy number (SMS), set `TWILIO_NUMBER`. Messaging webhook → WF1 URL.
- [ ] ⚠ Register **A2P 10DLC** immediately; fallback number for day-one if pending.

## STEP 6 — Google Sheets 🟢
- [ ] Create sheet, import `appointments-sheet-header.csv` (Replace current sheet), tab `Appointments`, ID → `GSHEET_APPTS_ID`, grant edit access.

## STEP 7 — OpenAI 🟢
- [ ] API key → credential, $10/mo cap, `gpt-4o-mini` + JSON mode (only inbound replies use AI; reminders are templated).

## STEP 8 — Testing 🟢
Run `checklists.md` §12. Critical: a reminder lands at the **right local time**; C/R/X classify correctly; reminders don't double-send (flag caps); an **unconfirmed** appt past grace triggers exactly one no-show rebook + owner alert; the **manual** `Status=No-Show` path also triggers rebooking.

⚠ **No-show truth:** without attendance data, the system auto-detects no-shows only for **never-confirmed** appointments. For confirmed-but-absent customers, the client must mark `Status=No-Show` (or feed attendance from the calendar/CRM). Set this expectation explicitly.

## STEP 9 — Go-live 🟢🔵
- [ ] 10DLC approved → both workflows `Active`.
- [ ] Production source wired; timezone re-verified with a live test.
- [ ] Agree the attendance-marking process with the front desk.
- [ ] One real appointment through the full cycle with the client watching.
- [ ] 7-day review: confirm rate, no-shows, rebooks recovered.

## Fastest path if the client is tomorrow
1. **Now:** sign, EIN, **start 10DLC**, confirm booking system + timezone.
2. **Tonight:** Steps 3, 6, 7.
3. **Tomorrow:** Step 4 (Calendly/Acuity webhook is fastest), Step 5, test, go live.

## What can still block you
1. **Timezone / non-ISO appointment times** — wrong zone = reminders at 3am. Verify with a live test before launch.
2. **A2P 10DLC timing** (SMS only).
3. **No-show detection limits** — auto only for unconfirmed; confirmed-absent needs a manual/CRM attendance signal.
