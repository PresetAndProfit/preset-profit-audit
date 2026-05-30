# Google Sheets Structure — Missed Call Recovery

Create one spreadsheet per client (or one tab-set per client). Spreadsheet ID goes in `GSHEET_LEADS_ID`.

## Tab 1: `Leads` (the operational table)

Header row (row 1) — column order matters for `appendOrUpdate` matching:

| Column | Type | Written by | Purpose |
|---|---|---|---|
| `Lead_ID` | string | WF1 | Unique id `epochMs-last4` |
| `Created_At` | ISO datetime | WF1 | First touch |
| `Business_ID` | string | manual/Config | Multi-client key (optional) |
| `Customer_Phone` | E.164 string | WF1 | **Matching key for dedup** |
| `Customer_Name` | string | manual/AI | Optional |
| `Caller_City` | string | WF1 | From Twilio `FromCity` |
| `Source` | string | WF1 | "Missed Call" |
| `Call_Status` | string | WF1 | no-answer/busy/failed |
| `First_SMS_At` | ISO datetime | WF1 | When first text sent |
| `Last_Inbound_At` | ISO datetime | WF1 | Last customer reply (also = "has replied") |
| `Last_Outbound_At` | ISO datetime | WF1/WF2 | Last message we sent |
| `Conversation` | long text | WF1 | Running IN:/OUT: transcript |
| `AI_Intent` | string | WF1 | booking/quote/question/spam/not_interested/other |
| `Service_Needed` | string | WF1 | AI-extracted |
| `Urgency` | string | WF1 | emergency/high/medium/low |
| `Qualified` | boolean | WF1 | AI verdict |
| `Lead_Score` | number 0-100 | WF1 | AI score |
| `AI_Summary` | string | WF1 | One-line for owner |
| `Suggested_Reply` | string | WF1 | Sent back to customer |
| `Status` | string | WF1/WF2 | See lifecycle below |
| `Follow_Up_Count` | number | WF2 | 0..MAX_FOLLOW_UPS |
| `Next_Follow_Up_At` | ISO datetime | WF1/WF2 | When WF2 should act |
| `Owner_Notified` | Yes/No | WF1 | Gmail alert sent |
| `Booked` | Yes/No | manual/upgrade | Conversion flag |
| `Notes` | string | manual | Owner notes |

### Status lifecycle
`Contacted - Awaiting Reply` → (`Followed Up`)* → `Replied - Review` / `Qualified - Owner Notified` → `Cold - No Response` (after max follow-ups, no reply).

## Tab 2: `Config` (optional — for multi-client on one instance)

| Business_ID | Business_Name | Industry | Owner_Email | Owner_SMS | Twilio_Number | Booking_Link | Service_Area | Max_Follow_Ups | Follow_Up_Gap_Min | Tone |
|---|---|---|---|---|---|---|---|---|---|---|

Look this tab up at the top of each workflow instead of using env vars when you run many clients off one n8n instance.

## Airtable equivalent
Same fields. Use Airtable's record ID instead of `row_number`, a single-select for `Status`/`Urgency`/`AI_Intent`, a checkbox for `Qualified`/`Booked`, and Airtable's "Find records" + "Update record" nodes. Airtable's native dedupe (search by `Customer_Phone`) replaces the Sheets `appendOrUpdate` match.
