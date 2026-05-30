# Google Sheets Structure — AI Receptionist

One spreadsheet per client with **four tabs**, plus the client's **Google Calendar** as the real source of truth for availability and bookings. The sheet is the owner-facing log/CRM; the calendar is where appointments actually land. Put the spreadsheet ID in `GSHEET_RECEPTIONIST_ID` and the calendar id in `GOOGLE_CALENDAR_ID`.

> Create each tab with the exact header row below (the workflow appends to them by name). The voice layer (Vapi/Retell) handles the live conversation; this backend writes every outcome here.

## Tab: `Calls` (append-only — one row per call or chat session)
`Call_ID, Started_At, Caller_Phone, Caller_Name, Channel, Duration, Intent, Outcome, Summary, Transcript, Recording_URL, Escalated, Booked`
- Written by the **end_of_call** report (voice) and the **chat_message** path (chat, `Channel=chat`).

## Tab: `Bookings` (append-only — one row per appointment booked)
`Booking_ID, Created_At, Customer_Name, Customer_Phone, Customer_Email, Service, Appt_Start, Appt_End, Calendar_Event_ID, Source, Status, Notes`
- Written by the **book_appointment** tool. `Calendar_Event_ID` ties the row back to the Google Calendar event the workflow created.

## Tab: `Leads` (append-only — one row per message/lead when no booking is made)
`Lead_ID, Created_At, Customer_Name, Customer_Phone, Customer_Email, Service, Urgency, Summary, Channel, Status`
- Written by the **capture_lead** tool.

## Tab: `Escalations` (append-only — one row per emergency)
`Escalation_ID, At, Customer_Name, Customer_Phone, Issue, Urgency, Notified`
- Written by the **escalate_emergency** tool, alongside the owner SMS + email.

## How the backend tools map to storage
| Tool (from voice/chat agent) | Calendar | Sheet tab | Owner alert |
|---|---|---|---|
| `check_availability` | reads events | — | — |
| `book_appointment` | **creates event** | `Bookings` | email |
| `capture_lead` | — | `Leads` | — |
| `escalate_emergency` | — | `Escalations` | **SMS + email** |
| `end_of_call` (voice report) | — | `Calls` | — |
| `chat_message` (web chat) | — | `Calls` (`Channel=chat`) | email if escalated |

## Calendar (the booking source of truth)
- `GOOGLE_CALENDAR_ID` = `primary` or a dedicated calendar's address. The receptionist offers only open slots inside `BUSINESS_HOURS_START`–`END`, at least `BOOKING_LEAD_MIN` minutes out, in `SLOT_MINUTES` blocks, avoiding existing events.
- **Calendly/Acuity/Jobber alternative:** swap the two Google Calendar nodes for the relevant API (or have those tools own booking and only log to `Bookings`). Documented as an upgrade in the README.

## Airtable / CRM equivalent
Single-selects for `Intent`/`Outcome`/`Status`/`Urgency`, checkboxes for `Escalated`/`Booked`, linked tables across the four logs. The tool routing and calendar logic are unchanged.
