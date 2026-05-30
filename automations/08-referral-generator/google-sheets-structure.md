# Google Sheets Structure — Referral Generator Engine

One spreadsheet per client with **six tabs**. Put the spreadsheet ID in `GSHEET_REFERRALS_ID`. The `Customers` tab is the live state for qualification + the request sequence; the others are append-only logs and the captured-referrals ledger.

> Create each tab with the exact header row below (the workflows append/update by tab name). Match keys: `Customers` on `Customer_ID` (capture) and `Customer_Phone` (replies); `Referrals` on `Referred_Phone` (dedup).

## Tab: `Customers` (primary state — one row per past customer)
| Column | Type | Written by | Purpose |
|---|---|---|---|
| `Customer_ID` | string | WF1 | **Match key** (source id prefixed, else phone) |
| `Created_At` | ISO datetime | WF1 | First captured |
| `Customer_Name` | string | WF1 | Personalization |
| `Customer_Phone` | **E.164** | WF1 | Send + reply matching |
| `Customer_Email` | string | WF1 | Email channel |
| `Service_Type` | string | WF1 | What was done (referenced in copy) |
| `Completion_Date` | date | WF1 | Job-complete signal |
| `Satisfaction_Score` | number | WF1 | Eligibility gate |
| `Review_Status` | string | WF1 | Eligibility gate (positive review qualifies) |
| `Referral_Eligible` | **Yes/No** | WF1 | **Gate — only `Yes` is ever asked** |
| `Assigned_Staff` | string | WF1 | Who did the job |
| `Source` | string | WF1 | Completed job / review / survey / CRM / Jobber / ServiceTitan / HCP / GHL / Manual |
| `Status` | string | WF1/WF2/WF3 | Lifecycle (below) |
| `Sequence_Step` | number | WF1/WF2 | Which request touch was last sent (0 = none) |
| `Sequence_Active` | **Yes/No** | WF1/WF2/WF3 | **Master switch — `No` stops all requests** |
| `Next_Request_At` | ISO datetime | WF1/WF2 | When the next touch is due |
| `Last_Request_At` | ISO datetime | WF2 | **Cooldown** anchor (last time we asked) |
| `Last_Outbound_At` | ISO datetime | WF1/WF2 | Drives daily cap |
| `Last_Inbound_At` | ISO datetime | WF1 | Last reply (any reply stops the sequence) |
| `Conversation` | long text | WF1 | Transcript |
| `AI_Class` | string | WF1 | REFERRAL_PROVIDED / INTERESTED... / NOT_NOW / COMPLAINT / STOP / GENERAL_REPLY |
| `AI_Sentiment` | string | WF1 | positive/neutral/negative |
| `AI_Summary` | string | WF1 | One-line for owner |
| `Complaint` | **Yes/No** | WF1 | Blocks future asks until resolved |
| `Opted_Out` | **Yes/No** | WF1 | **Suppression — never message again** |
| `Referral_Submitted` | **Yes/No** | WF1/WF3 | Stops the sequence (success) |
| `Owner_Notified` | Yes/No | WF1 | Alert sent |
| `Notes` | string | manual | Staff notes |

### Status lifecycle
`Eligible - Queued` → `Request Sent` (repeats per touch) → one of:
`Replied - Referral Provided` / `Replied - Interested` / `Replied - Not Now` / `Replied - Complaint` / `Replied - General` / `Referral Submitted` / `Opted Out` / `Not Eligible` / `Sequence Complete - No Referral`.

## Tab: `Referral_Requests` (append-only — one row per request touch sent by WF2)
`Customer_ID, Sent_At, Step, Channel, Message, Customer_Phone`

## Tab: `Referrals` (the captured referred leads — WF1 SMS path + WF3 form path)
`Referral_ID, Created_At, Referrer_Name, Referrer_Phone, Referred_Name, Referred_Phone, Referred_Email, Service_Needed, Relationship, Notes, AI_Summary, Source, Status, Owner_Notified`

## Tab: `Activity_Log` (append-only — engagement events feed; optional)
`Customer_ID, Event_At, Event_Type, Detail, Phone`
> The build records lifecycle changes to `Status_History` and request touches to `Referral_Requests`. Use `Activity_Log` if you want a single unified event stream (populate from the same send/reply paths).

## Tab: `Opt_Outs` (suppression ledger — WF1 STOP path)
`Customer_Phone, Opted_Out_At, Source`

## Tab: `Status_History` (append-only — one row per status change)
`Customer_ID, Changed_At, Old_Status, New_Status, Changed_By`

### The compliance gates (non-negotiable, all enforced in code)
1. **`Referral_Eligible = Yes`** — set only when the qualification gate passes (satisfied + complete + no complaint + not opted-out + cooldown passed + not staff-blocked).
2. **`Opted_Out = Yes`** + a row in `Opt_Outs` — set automatically on STOP; permanently suppressed.
3. **`Sequence_Active = No`** — set on any reply, opt-out, complaint, or referral submitted; WF2 skips the row.
4. **`Last_Request_At` + `REFERRAL_COOLDOWN_DAYS`** — re-qualification is blocked inside the cooldown window.

## Airtable / CRM equivalent
Single-selects for `Status`/`AI_Class`/`AI_Sentiment`, checkboxes for `Referral_Eligible`/`Sequence_Active`/`Complaint`/`Opted_Out`/`Referral_Submitted`, linked tables for the logs, match on `Customer_ID`/`Customer_Phone`/`Referred_Phone`.
