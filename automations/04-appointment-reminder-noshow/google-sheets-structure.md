# Google Sheets Structure — Appointment Reminder & No-Show Recovery

One spreadsheet per client. Import `appointments-sheet-header.csv`, name the tab exactly `Appointments`, put the ID in `GSHEET_APPTS_ID`.

## Tab: `Appointments`

| Column | Type | Written by | Purpose |
|---|---|---|---|
| `Appointment_ID` | string | WF1 | **Match key** (from calendar event id, or generated `last4-apptISO`) |
| `Created_At` | ISO datetime | WF1 | Logged |
| `Customer_Name` | string | WF1 | From source |
| `Customer_Phone` | E.164 string | WF1 | Reply matching |
| `Customer_Email` | string | WF1 | Optional email channel |
| `Service` | string | WF1 | Appointment type |
| `Appt_Time` | **ISO 8601** datetime | WF1 | Drives all reminder/no-show math |
| `Source` | string | WF1 | Calendly / Acuity / Jobber / Google Calendar / Manual |
| `Status` | string | WF1/WF2 | Lifecycle (below) |
| `Confirmed_At` | ISO datetime | WF1 | When customer confirmed |
| `Reminder_24h_Sent` | Yes/No | WF2 | First reminder cap |
| `Reminder_2h_Sent` | Yes/No | WF2 | Second reminder cap |
| `NoShow_Handled` | Yes/No | WF2 | No-show rebook cap |
| `Last_Inbound_At` | ISO datetime | WF1 | Last customer reply |
| `Last_Outbound_At` | ISO datetime | WF1/WF2 | Last message sent |
| `Conversation` | long text | WF1 | Transcript |
| `AI_Action` | string | WF1 | confirm/reschedule/cancel/question/other |
| `AI_Summary` | string | WF1 | One-line for owner |
| `Owner_Notified` | Yes/No | WF1/WF2 | Escalation sent |
| `Rebooked` | Yes/No | manual/upgrade | Recovery conversion flag |
| `Notes` | string | manual | Owner notes |

### Status lifecycle
`Scheduled` → (reminders) → `Confirmed` / `Reschedule Requested` / `Cancelled` → `Completed` (manual or via calendar) **or** `No-Show - Rebook Sent`.

### How reminders & no-shows fire (WF2, plain Date math)
- **24h reminder:** when `now` is within `REMINDER_LEAD_1_MIN` but more than `REMINDER_LEAD_2_MIN` before `Appt_Time`, and `Reminder_24h_Sent != Yes`.
- **2h reminder:** when within `REMINDER_LEAD_2_MIN` before `Appt_Time` and `Reminder_2h_Sent != Yes`.
- **No-show:** `Appt_Time` passed by more than `NOSHOW_GRACE_MIN`, status not Confirmed/Completed/Cancelled, `NoShow_Handled != Yes`. (Also fires immediately if the owner manually sets `Status = No-Show`.)

> ⚠ Honest limitation: without real attendance data, a true no-show can't be detected with certainty. This auto-fires no-show recovery only for appointments the customer **never confirmed**. For confirmed-but-absent customers, have the owner set `Status = No-Show` (or pass attendance from the calendar/CRM) to trigger rebooking. Documented in the playbook.

## Airtable equivalent
Single-selects for `Status`/`AI_Action`, checkboxes for the Yes/No flags, a date field for `Appt_Time`, Find/Update nodes, match on `Appointment_ID`.
