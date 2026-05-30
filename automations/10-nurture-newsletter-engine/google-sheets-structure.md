# Google Sheets Structure — Long-Term Nurture & Newsletter Engine

One spreadsheet per client with **five tabs**. Put the spreadsheet ID in `GSHEET_CONTACTS_ID`. The `Contacts` tab is the live state for the nurture cadence; the others are append-only logs/ledgers.

> Create each tab with the exact header row below (the workflows append/update by tab name). Match keys: `Contacts` on `Contact_ID` (capture) and `Customer_Phone` (replies).

## Tab: `Contacts` (primary state — one row per contact)
| Column | Type | Written by | Purpose |
|---|---|---|---|
| `Contact_ID` | string | WF1 | **Match key.** Source id (prefixed), else `C-<phone>`, else `C-<email>`. Drives dedup. |
| `Created_At` | ISO datetime | WF1 | When captured |
| `Customer_Name` | string | WF1 | Personalization |
| `Customer_Phone` | **E.164** | WF1 | SMS + reply matching |
| `Customer_Email` | string | WF1 | Email channel |
| `Segment` | string | WF1 | Tags / list / customer type — **steers the AI content angle** (e.g. `residential`, `maintenance-plan`, `past-customer`) |
| `Last_Service` | string | WF1 | Last job/plan on file — context the AI may reference (never invents one) |
| `Last_Service_Date` | date | WF1 | When last served |
| `Source` | string | WF1 | CRM / Jobber / ServiceTitan / Housecall Pro / GoHighLevel / Job / Lead / Sheet / Manual |
| `Status` | string | WF1/WF2 | Lifecycle (below) |
| `Touch_Count` | number | WF1/WF2 | How many nurture touches sent (0 = none) |
| `Sequence_Active` | **Yes/No** | WF1/WF2 | **Master switch — `No` stops all nurture** |
| `Next_Touch_At` | ISO datetime | WF1/WF2 | When the next touch is due |
| `Last_Touch_At` | ISO datetime | WF2 | Drives daily cap + frequency cap |
| `Last_Topic` | string | WF2 | Topic/angle of the last touch (avoids guesswork in review) |
| `Last_Outbound_At` | ISO datetime | WF1 | Last outbound (reply path) |
| `Last_Inbound_At` | ISO datetime | WF1 | Last reply |
| `Last_Source_Update_At` | ISO datetime | WF1 | Last re-sync from the source |
| `Conversation` | long text | WF1 | Transcript |
| `AI_Class` | string | WF1 | BOOK / INTERESTED / QUESTION / NOT_NOW / UNSUBSCRIBE / GENERAL |
| `AI_Summary` | string | WF1 | One-line for owner |
| `Opted_Out` | **Yes/No** | WF1 | **Suppression — never message again** |
| `Owner_Notified` | Yes/No | WF1 | Alert sent |
| `Notes` | string | manual | Owner notes |

### Status lifecycle
`Subscribed` → `Nurtured` (recurring) → optionally `Nurture Complete` (if `MAX_TOUCHES` reached) — and at any time one of:
`Re-Engaged - Hot Lead` / `Re-Engaged - Interested` (reply with intent → nurture pauses, owner alerted) ·
`Replied - Question` / `Replied - Not Now` / `Replied - General` (nurture continues) ·
`Unsubscribed` (STOP/opt-out → permanent suppression).

### The stop / pause gates (all enforced in code)
1. **`Opted_Out = Yes`** (STOP or AI `UNSUBSCRIBE`) → permanent suppression + a row in `Opt_Outs`.
2. **Re-engaged hot** (`BOOK` / `INTERESTED` / "call me") → `Sequence_Active=No`, owner alerted; they're now a live lead, not a drip target.
3. **`Sequence_Active = No`** → WF2 skips the row entirely (backstop alongside terminal `Status`).
4. **`MAX_TOUCHES` reached** → `Sequence_Active=No`, `Status=Nurture Complete` (only if `MAX_TOUCHES>0`; default `0` = evergreen).
5. **Frequency cap** → a contact touched within `FREQUENCY_CAP_DAYS` is skipped even if otherwise due (anti-fatigue backstop).

## Tab: `Touch_Log` (append-only — one row per nurture touch sent by WF2)
`Contact_ID, Sent_At, Touch_Number, Channel, Topic, Message, Customer_Phone`

## Tab: `Opt_Outs` (suppression ledger — WF1 STOP path)
`Customer_Phone, Opted_Out_At, Source`

## Tab: `Status_History` (append-only — one row per status change)
`Contact_ID, Changed_At, Old_Status, New_Status, Changed_By`

## Tab: `Engagements` (append-only — optional ledger of hot re-engagements for reporting)
`Contact_ID, Engaged_At, Class, Summary, Customer_Phone`
> Optional: add a branch off "Alert Owner (Re-Engaged)" to append here if you want a clean pipeline report of nurture-sourced leads. The core flow runs fine without it.

### Importing your contact list / wiring sources
Best: point your CRM / field-service tool's "new customer" or "job completed" webhook at WF1 (`/webhook/contact-intake`). The Normalize node maps CRM / Jobber / ServiceTitan / Housecall Pro / GoHighLevel / generic shapes and **dedupes on `Contact_ID`**. Or bulk-load a past-customer export straight into the `Contacts` tab (set `Sequence_Active=Yes`, `Touch_Count=0`, a near-term `Next_Touch_At`, phones in **E.164**).

> **Newsletter / broadcast vs. drip:** this engine runs a *per-contact* cadence (each contact gets a personalized touch every `NURTURE_INTERVAL_DAYS`), which naturally spreads send volume and keeps the daily cap happy. To run a true single-day broadcast, set every contact's `Next_Touch_At` to the same date — they'll all generate + send on the next run, subject to `DAILY_CAP`.

## Airtable / CRM equivalent
Single-select for `Status`/`AI_Class`, checkboxes for `Sequence_Active`/`Opted_Out`, linked tables for the logs, match on `Contact_ID` / `Customer_Phone`.
