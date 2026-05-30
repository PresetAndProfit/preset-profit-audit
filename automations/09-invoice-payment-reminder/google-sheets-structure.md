# Google Sheets Structure — Invoice & Payment Reminder (AR)

One spreadsheet per client with **five tabs**. Put the spreadsheet ID in `GSHEET_INVOICES_ID`. The `Invoices` tab is the live state for the reminder sequence; the others are append-only logs/ledgers.

> Create each tab with the exact header row below (the workflows append/update by tab name). Match keys: `Invoices` on `Invoice_ID` (capture / payment) and `Customer_Phone` (replies).

## Tab: `Invoices` (primary state — one row per invoice)
| Column | Type | Written by | Purpose |
|---|---|---|---|
| `Invoice_ID` | string | WF1 | **Match key.** Source id (prefixed), else `source-invoice#`, else `phone-amount`. Drives dedup. |
| `Created_At` | ISO datetime | WF1 | When captured |
| `Customer_Name` | string | WF1 | Personalization |
| `Customer_Phone` | **E.164** | WF1 | Send + reply matching |
| `Customer_Email` | string | WF1 | Email channel |
| `Invoice_Number` | string | WF1 | Human reference in copy |
| `Amount` | number | WF1 | Invoice total |
| `Amount_Paid` | number | WF1 | Paid so far |
| `Balance` | number | WF1 | **Drives reminders + high-value alert.** `<= 0` = paid, stop |
| `Issue_Date` | date | WF1 | When issued |
| `Due_Date` | date | WF1 | **Anchor** for the reminder schedule |
| `Pay_Link` | url | WF1 | Pay link from the source (Stripe/Square/etc.), used in copy |
| `Source` | string | WF1 | QuickBooks / Stripe / Square / Jobber / CRM / Sheet / Manual |
| `Status` | string | WF1/WF2 | Lifecycle (below) |
| `Reminder_Step` | number | WF1/WF2 | Which reminder was last sent (0 = none) |
| `Sequence_Active` | **Yes/No** | WF1/WF2 | **Master switch — `No` stops all reminders** |
| `Next_Reminder_At` | ISO datetime | WF1/WF2 | When the next reminder is due |
| `Last_Outbound_At` | ISO datetime | WF1/WF2 | Drives daily cap |
| `Last_Inbound_At` | ISO datetime | WF1 | Last reply |
| `Last_Source_Update_At` | ISO datetime | WF1 | Last re-sync from the billing source |
| `Conversation` | long text | WF1 | Transcript |
| `AI_Class` | string | WF1 | PAID / DISPUTE / PROMISE_TO_PAY / QUESTION / STOP / GENERAL |
| `AI_Summary` | string | WF1 | One-line for owner |
| `Disputed` | **Yes/No** | WF1 | Pauses reminders, routes to owner |
| `Opted_Out` | **Yes/No** | WF1 | **Suppression — never message again** |
| `Owner_Notified` | Yes/No | WF1 | Alert sent |
| `Paid_At` | ISO datetime | WF1 | When marked paid |
| `Notes` | string | manual | Owner notes |

### Status lifecycle
`Open - Reminders Scheduled` → `Reminder Sent` → `Past Due - Reminder Sent` → `Final Reminder Sent` → one of:
`Paid` (payment webhook) / `Paid - Reported` (customer says so) / `Disputed` / `Promised to Pay` / `Reminders Stopped - Opted Out`.

### The stop / pause gates (all enforced in code)
1. **`Balance <= 0`** or a **payment webhook** → `Paid`, `Sequence_Active=No`.
2. **`Disputed = Yes`** → reminders pause, owner alerted (never argue over SMS).
3. **`Opted_Out = Yes`** → permanent suppression + a row in `Opt_Outs`.
4. **`Sequence_Active = No`** → WF2 skips the row entirely (backstop alongside terminal `Status`).
5. **Promise to pay** → `Next_Reminder_At` snoozed `PROMISE_SNOOZE_DAYS`, sequence stays active.

## Tab: `Reminder_Log` (append-only — one row per reminder sent by WF2)
`Invoice_ID, Sent_At, Step, Channel, Message, Customer_Phone, Balance`

## Tab: `Payments` (append-only — one row per payment received / reported)
`Invoice_ID, Paid_At, Amount, Customer_Phone, Source`

## Tab: `Opt_Outs` (suppression ledger — WF1 STOP path)
`Customer_Phone, Opted_Out_At, Source`

## Tab: `Status_History` (append-only — one row per status change)
`Invoice_ID, Changed_At, Old_Status, New_Status, Changed_By`

### Importing invoices from a billing tool
Best: point the tool's "invoice sent" + "payment received" webhooks at WF1 (`/webhook/invoice-intake`). The Normalize node maps QuickBooks / Stripe / Square / Jobber / generic shapes (including Stripe's unix `due_date` and `hosted_invoice_url` pay link) and **dedupes on `Invoice_ID`**. Or sync a CSV/export into the `Invoices` tab. Phones must be **E.164**.

> **Partial payments:** the payment webhook path assumes full settlement (sets `Balance=0`, `Paid`). For partial payments, re-post the invoice with the new `balance` through the capture path — the existing row updates and reminders continue on the remaining balance.

## Airtable / CRM equivalent
Single-selects for `Status`/`AI_Class`, checkboxes for `Sequence_Active`/`Disputed`/`Opted_Out`, linked tables for the logs, match on `Invoice_ID` / `Customer_Phone`.
