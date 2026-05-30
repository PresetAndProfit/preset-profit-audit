# Google Sheets Structure — Lead Capture & Follow-Up Engine

One spreadsheet per client. Import `leads-sheet-header.csv` to lay down the header row, name the tab exactly `Leads`, and put the spreadsheet ID in `GSHEET_LEADS_ID`.

## Tab: `Leads`

| Column | Type | Written by | Purpose |
|---|---|---|---|
| `Lead_ID` | string | WF1 | `epochMs-last4` unique id |
| `Created_At` | ISO datetime | WF1 | First capture |
| `Business_ID` | string | manual | Multi-client key (optional) |
| `Customer_Name` | string | WF1 | From form |
| `Customer_Phone` | E.164 string | WF1 | **Dedup / match key** |
| `Customer_Email` | string | WF1 | For email touches |
| `Source` | string | WF1 | Website Form / Facebook / Google LSA / Typeform… |
| `First_Touch_At` | ISO datetime | WF1 | When instant SMS+email sent |
| `Last_Inbound_At` | ISO datetime | WF1 | Last customer reply (= "has replied", stops sequence) |
| `Last_Outbound_At` | ISO datetime | WF1/WF2 | Last message we sent |
| `Conversation` | long text | WF1 | Running IN:/OUT: transcript |
| `AI_Intent` | string | WF1 | booking/quote/question/spam/not_interested/other |
| `Service_Needed` | string | WF1 | AI-extracted |
| `Urgency` | string | WF1 | emergency/high/medium/low |
| `Qualified` | boolean | WF1 | AI verdict |
| `Lead_Score` | number 0-100 | WF1 | AI score |
| `AI_Summary` | string | WF1 | One-line for owner |
| `Status` | string | WF1/WF2 | Lifecycle (below) |
| `Sequence_Step` | number | WF1/WF2 | 0..MAX_FOLLOW_UPS |
| `Follow_Up_Count` | number | WF2 | Mirrors step (reporting) |
| `Next_Follow_Up_At` | ISO datetime | WF1/WF2 | When WF2 should act next |
| `Owner_Notified` | Yes/No | WF1 | Alert sent |
| `Booked` | Yes/No | manual/upgrade | Conversion flag |
| `Notes` | string | manual | Owner notes |

### Status lifecycle
`Contacted - Awaiting Reply` → (`Followed Up`)* → `Replied - Review` / `Qualified - Owner Notified` → `Cold - No Response` (after the sequence ends with no reply).

### Sequence model (driven by env vars)
`FIRST_FOLLOW_UP_MIN` sets when step 1 fires after intake. `FOLLOW_UP_GAPS_MIN` and `FOLLOW_UP_CHANNELS` define each subsequent step's timing and channel (default: SMS +1h, Email +1d, SMS +3d, then Cold). Any inbound reply (`Last_Inbound_At` set) immediately halts the sequence.

## Airtable equivalent
Same fields; use single-selects for `Status`/`Urgency`/`AI_Intent`, checkboxes for `Qualified`/`Booked`, and Airtable Find/Update nodes. Dedup by searching `Customer_Phone`.
