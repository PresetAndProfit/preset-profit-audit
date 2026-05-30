# Google Sheets Structure — Review & Reputation Engine

One spreadsheet per client. Import `reviews-sheet-header.csv`, name the tab exactly `Reviews`, put the ID in `GSHEET_REVIEWS_ID`.

## Tab: `Reviews`

| Column | Type | Written by | Purpose |
|---|---|---|---|
| `Customer_ID` | string | WF1 | `epochMs-last4` |
| `Created_At` | ISO datetime | WF1 | Job logged |
| `Customer_Name` | string | WF1 | From completed-job event |
| `Customer_Phone` | E.164 string | WF1 | **Dedup / match key** |
| `Customer_Email` | string | WF1 | Optional email channel |
| `Job_Type` | string | WF1 | What was done |
| `Completed_At` | ISO datetime | WF1 | Job finished |
| `Source` | string | WF1 | Manual / CRM / Jobber |
| `Send_At` | ISO datetime | WF1 | When WF2 should send the ask (completion + delay) |
| `Asked_At` | ISO datetime | WF2 | When the gating request went out |
| `Last_Inbound_At` | ISO datetime | WF1 | Customer replied (stops reminders) |
| `Last_Outbound_At` | ISO datetime | WF1/WF2 | Last message sent |
| `Rating` | 1-5 / null | WF1 | AI-estimated rating from reply |
| `Sentiment` | string | WF1 | positive / neutral / negative |
| `Is_Happy` | boolean | WF1 | Gate decision |
| `AI_Summary` | string | WF1 | One-line for owner |
| `Conversation` | long text | WF1 | Transcript |
| `Status` | string | WF1/WF2 | Lifecycle (below) |
| `Review_Link_Sent` | Yes/No | WF1 | Public review link pushed |
| `Reminder_Sent` | Yes/No | WF2 | One reminder cap |
| `Owner_Alerted` | Yes/No | WF1 | Negative escalation sent |
| `Reviewed` | Yes/No | manual/upgrade | Confirmed public review left |
| `Notes` | string | manual | Owner notes |

### Status lifecycle
`Queued - Review Pending` → `Asked - Awaiting Rating` → **either** `Positive - Review Requested` (happy → Google link sent) **or** `Negative - Owner Alerted` (unhappy → private apology + owner email, **no public link**).

### The reputation gate (the core value)
Unhappy customers never get pushed toward a public review. They get a private apology and the owner gets an immediate alert to resolve it offline — turning a would-be 1-star into a saved relationship. Only clearly happy customers (`Is_Happy=true`) receive the Google review link.

## Airtable equivalent
Single-selects for `Status`/`Sentiment`, checkboxes for `Is_Happy`/`Review_Link_Sent`/`Owner_Alerted`/`Reviewed`, Find/Update nodes, dedup by `Customer_Phone`.
