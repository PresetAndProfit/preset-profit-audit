# Google Sheets Structure — Database Reactivation Campaign

One spreadsheet per client/campaign. Import `contacts-sheet-header.csv`, name the tab exactly `Contacts`, put the ID in `GSHEET_CONTACTS_ID`.

## Tab: `Contacts`

| Column | Type | Written by | Purpose |
|---|---|---|---|
| `Contact_ID` | string | import | **Match key** (use a unique value per row; generate at import) |
| `Imported_At` | date | import | When the list was loaded |
| `Customer_Name` | string | import | For personalization |
| `Customer_Phone` | **E.164** string | import | Send + reply matching |
| `Customer_Email` | string | import | Optional email channel (upgrade) |
| `Last_Service` | string | import | Personalization hook |
| `Last_Visit` | date | import | Personalization / segmentation |
| `Consent` | **Yes/No** | import | **GATE — only `Yes` is ever messaged** |
| `Status` | string | WF1/WF2 | Lifecycle (below) |
| `Sent_At` | ISO datetime | WF1 | Drives daily cap + "already sent" |
| `Last_Inbound_At` | ISO datetime | WF2 | Last reply |
| `Last_Outbound_At` | ISO datetime | WF1/WF2 | Last message sent |
| `Conversation` | long text | WF1/WF2 | Transcript |
| `AI_Intent` | string | WF2 | interested/not_interested/question/other |
| `AI_Summary` | string | WF2 | One-line for owner |
| `Interested` | boolean | WF2 | Drives owner alert |
| `Opted_Out` | **Yes/No** | WF2 | **Suppression — never message again** |
| `Owner_Notified` | Yes/No | WF2 | Alert sent |
| `Rebooked` | Yes/No | manual | Conversion flag |
| `Notes` | string | manual | Owner notes |

### Status lifecycle
`(blank/Queued)` → `Reactivation Sent` → `Replied - Interested` / `Replied - Not Interested` / `Replied - Question` / `Opted Out` → `Rebooked` (manual).

### The two compliance gates (non-negotiable)
1. **`Consent = Yes`** — the sender only ever messages rows with explicit consent / a prior business relationship. No consent = never sent.
2. **`Opted_Out = Yes`** — set automatically when someone replies STOP/UNSUBSCRIBE/etc.; permanently suppresses that contact.

### Importing the client's list
Map the client's export (CSV/CRM) into these columns. **Generate a unique `Contact_ID`** per row (e.g., a row counter or `phone-index`). Set `Consent=Yes` only for contacts the client legitimately has consent for — when in doubt, leave blank (won't send). Phone numbers must be **E.164** (`+1XXXXXXXXXX`); clean the export before import.

## Airtable equivalent
Single-selects for `Status`/`AI_Intent`, checkboxes for `Consent`/`Interested`/`Opted_Out`/`Rebooked`, Find/Update nodes, match on `Contact_ID` (sender) and `Customer_Phone` (replies).
