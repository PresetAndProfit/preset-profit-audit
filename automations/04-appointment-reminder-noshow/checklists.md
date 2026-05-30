# Checklists — Appointment Reminder & No-Show Recovery

## 11. Client Setup Checklist (~60–90 min)
- [ ] Collect: business name, industry, front-desk/owner email, **timezone**, reminder timing preferences.
- [ ] Provision Twilio number + register **A2P 10DLC**.
- [ ] Decide the **appointment source** (how bookings reach the system):
  - Calendly/Acuity: add a webhook on "invitee created" → WF1 URL.
  - Google Calendar: a Calendar trigger or a sync that POSTs events → WF1 URL.
  - FSM/CRM (Jobber/Housecall Pro/ServiceTitan/Dentrix-via-Zapier): job/appt-created webhook → WF1 URL.
  - Manual/Sheet: front desk adds rows, or a simple form → webhook.
- [ ] Confirm the source sends **name, phone, appointment time (ISO), service** (map field names if custom).
- [ ] Create the Google Sheet from `appointments-sheet-header.csv`; tab `Appointments`; ID → `GSHEET_APPTS_ID`.
- [ ] Set env vars (`REMINDER_LEAD_1_MIN`, `REMINDER_LEAD_2_MIN`, `NOSHOW_GRACE_MIN`) and **set the n8n timezone** to the client's zone.
- [ ] Import both workflows; map credentials; copy WF1 URL.
- [ ] Point the appointment source AND the Twilio Messaging webhook at the WF1 URL.

## 12. Testing Checklist
- [ ] Create a test appointment ~25h out → confirm a `Scheduled` row with correct `Appt_Time` (ISO) and timezone.
- [ ] Temporarily set `REMINDER_LEAD_1_MIN` high / shift the appt time so the 24h reminder fires; confirm it sends once and flips `Reminder_24h_Sent`.
- [ ] Reply **C** → Status `Confirmed`, `Confirmed_At` set, friendly ack sent.
- [ ] Reply **R** → Status `Reschedule Requested`, owner alerted, ack sent.
- [ ] Reply **X** → Status `Cancelled`, owner alerted.
- [ ] Reply a question → owner alerted, no status change, ack sent.
- [ ] Confirm the **2h reminder** fires for a still-scheduled appt and flips `Reminder_2h_Sent`.
- [ ] Let an **unconfirmed** appt pass its time + grace → confirm one no-show rebook text + owner alert + `NoShow_Handled=Yes` (and it doesn't repeat).
- [ ] Manually set a confirmed appt to `Status=No-Show` → confirm rebook fires (manual path).
- [ ] Confirm reminders don't double-send across cron cycles (flag caps work).
- [ ] Force OpenAI failure → safe fallback (owner alerted, ack still sent).

## 13. Deployment Checklist
- [ ] A2P 10DLC **Approved**; both workflows `Active`.
- [ ] n8n timezone matches client; spot-check a reminder lands at the expected local time.
- [ ] Production appointment source pointed at the live URL.
- [ ] Decide attendance handling: will the client mark `Completed`/`No-Show`, or will the calendar/CRM feed it? Document it.
- [ ] Enable global error workflow + logging.
- [ ] Brief front desk: reschedule/cancel/no-show alerts need a human callback.
- [ ] 7-day review: reminders sent, confirm rate, no-shows, rebooks recovered.
