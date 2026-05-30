# Google Sheets Structure — Estimate / Quote Follow-Up Engine

One spreadsheet per client, with **four tabs**. Import `quotes-sheet-header.csv` to set up the `Quotes` tab, add the other three tabs with the headers below, put the spreadsheet ID in `GSHEET_QUOTES_ID`.

The `Quotes` tab is the live state; the other three are append-only logs that give the owner a full audit trail.

## Tab: `Quotes` (primary state — one row per estimate)

| Column | Type | Written by | Purpose |
|---|---|---|---|
| `Quote_ID` | string | WF1 | **Match key.** Source's own quote/estimate id (prefixed by source) when available, else `phone-amount`. Drives dedup. |
| `Created_At` | ISO datetime | WF1 | When the estimate was first captured |
| `Customer_Name` | string | WF1 | Personalization |
| `Customer_Phone` | **E.164** string | WF1 | Send + reply matching |
| `Customer_Email` | string | WF1 | Email-channel follow-ups |
| `Service_Type` | string | WF1 | What was quoted (referenced in copy) |
| `Estimate_Amount` | number | WF1 | Drives high-value alert + copy |
| `Estimate_Date` | date | WF1 | When the estimate was issued |
| `Expiration_Date` | date | WF1 | Sequence stops + estimate marked `Expired` past this |
| `Assigned_Rep` | string | WF1 | Owner/rep routing |
| `Source` | string | WF1 | Jobber / ServiceTitan / Housecall Pro / GoHighLevel / Webhook / Sheet / Manual |
| `Status` | string | WF1/WF2 | Lifecycle (below) |
| `Sequence_Step` | number | WF1/WF2 | Which follow-up touch was last sent (0 = none yet) |
| `Sequence_Active` | **Yes/No** | WF1/WF2 | **Master switch** — `No` stops all further follow-ups |
| `Next_Follow_Up_At` | ISO datetime | WF1/WF2 | When the next touch is due |
| `Last_Outbound_At` | ISO datetime | WF1/WF2 | Last message sent (drives daily cap) |
| `Last_Inbound_At` | ISO datetime | WF1 | Last customer reply |
| `Last_Source_Update_At` | ISO datetime | WF1 | Last re-sync from the quoting source |
| `Conversation` | long text | WF1 | Transcript (IN/OUT) |
| `AI_Interest` | string | WF1 | **HOT / WARM / COLD / DECLINED** |
| `AI_Intent` | string | WF1 | accept/negotiate/question/schedule_call/not_now/decline/other |
| `AI_Objection` | string | WF1 | price/timing/trust/scope/none |
| `AI_Summary` | string | WF1 | One-line for the owner |
| `Views` | number | WF1 | Estimate-view ping count |
| `Last_Viewed_At` | ISO datetime | WF1 | Last view ping |
| `View_Alerted` | Yes/No | WF1 | Multi-view owner alert already sent |
| `Opted_Out` | **Yes/No** | WF1 | **Suppression — never message again** |
| `Owner_Notified` | Yes/No | WF1 | Alert sent |
| `Won` | Yes/No | WF1 | Conversion flag (set on accept) |
| `Notes` | string | manual | Owner notes |

### Status lifecycle
`Open - Follow-Up Scheduled` → `Follow-Up Sent` (repeats per touch) → one of:
`Replied - Hot` / `Replied - Warm` / `Replied - Cold` / `Won - Accepted` / `Declined` / `Declined - Opted Out` / `Expired` / `Sequence Complete - No Response`.

### The two stop gates (non-negotiable)
1. **`Sequence_Active = No`** — set on accept, decline, opt-out, or expiration; WF2 skips the row entirely. Any terminal `Status` is also skipped as a backstop.
2. **`Opted_Out = Yes`** — set automatically when someone replies STOP/UNSUBSCRIBE/etc.; permanently suppresses that contact.

## Tab: `Follow_Up_Log` (append-only — one row per touch sent by WF2)
`Quote_ID, Sent_At, Step, Channel, Message, Customer_Phone`

## Tab: `Status_History` (append-only — one row per status change)
`Quote_ID, Changed_At, Old_Status, New_Status, Changed_By`

## Tab: `Activity` (append-only — engagement events: views, inbound replies)
`Quote_ID, Event_At, Event_Type, Detail, Customer_Phone`
> WF1 logs the initial capture to `Status_History` and view-tally state to `Quotes`. The `Activity` tab is provided for clients who want a single engagement feed; populate it from the same view/reply paths if desired (optional extension — see README §15).

### Importing estimates from a quoting tool
Map the client's export (Jobber/ServiceTitan/Housecall Pro/GoHighLevel/QuickBooks/CSV) into the `Quotes` columns, or — better — point the tool's webhook at WF1 (`/webhook/estimate-intake`) so new estimates flow in automatically and deduplicate on `Quote_ID`. Phone numbers must be **E.164** (`+1XXXXXXXXXX`).

## Airtable equivalent
Single-selects for `Status`/`AI_Interest`/`AI_Intent`, checkboxes for `Sequence_Active`/`Opted_Out`/`Won`, linked tables for the three logs, Find/Update nodes matching on `Quote_ID` (capture) and `Customer_Phone` (replies).
