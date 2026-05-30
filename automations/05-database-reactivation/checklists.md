# Checklists — Database Reactivation Campaign

## ⚠ Compliance gate (read first)
Bulk SMS to a list is the highest-legal-risk automation in the catalog (TCPA + carrier A2P rules). **Do not send a single message until all of these are true:**
- [ ] The client has a **prior business relationship / consent** for every contact marked `Consent=Yes`.
- [ ] **A2P 10DLC** brand + campaign is **Approved** (use case: Customer Care / Account Notification; sample messages include the win-back + STOP language).
- [ ] Every message carries **business identity + opt-out** ("Txt STOP to opt out" — appended in code automatically).
- [ ] You are **not** texting purchased lists, scraped numbers, or anyone who previously opted out.
- [ ] Throttle settings are conservative for a new number (warm-up).

## 11. Client Setup Checklist (~half day)
- [ ] Collect: business name, industry, owner email, booking link, **the offer**, business hours, timezone.
- [ ] Get the **customer list** export (CSV from CRM/POS/QuickBooks). Confirm consent basis with the client in writing.
- [ ] Clean the list: dedupe, **normalize phones to E.164**, drop obviously-bad numbers, set `Consent=Yes` only where justified, generate unique `Contact_ID` per row.
- [ ] Provision Twilio number + **register/confirm A2P 10DLC** (start days ahead).
- [ ] Create the Google Sheet from `contacts-sheet-header.csv`; tab `Contacts`; import the cleaned list; ID → `GSHEET_CONTACTS_ID`.
- [ ] Set env vars (`OFFER`, `BATCH_SIZE`, `DAILY_CAP`, `SEND_GAP_SEC`, business hours) and **n8n timezone**.
- [ ] Import both workflows; map credentials; copy WF2 (reply handler) webhook URL.
- [ ] Set the Twilio Messaging webhook → the WF2 URL (so replies + STOP route in).

## 12. Testing Checklist (test on YOUR phones only)
- [ ] Add 2-3 test rows (your own numbers, `Consent=Yes`) → run WF1 manually → confirm personalized SMS arrives **with "Txt STOP to opt out."** appended.
- [ ] Confirm a row with `Consent` blank/No is **never** sent.
- [ ] Confirm a row with `Opted_Out=Yes` is **never** sent.
- [ ] Reply "yes interested" → AI reply sent, owner alerted, Status `Replied - Interested`.
- [ ] Reply "no thanks" → polite acknowledgement, Status `Replied - Not Interested`, no further sends.
- [ ] Reply **STOP** → `Opted_Out=Yes`, Status `Opted Out`, and that contact is excluded from all future runs.
- [ ] Confirm the **daily cap** halts sends once reached, and **business-hours** gate blocks off-hours sends.
- [ ] Confirm the **throttle gap** spaces messages (watch execution timing).
- [ ] Re-run WF1 → confirm already-sent rows are skipped (no double-send).

## 13. Deployment Checklist
- [ ] A2P 10DLC **Approved**; consent verified; STOP path tested.
- [ ] Start with a **low `DAILY_CAP`** (e.g., 50–100) and a small first batch; watch delivery + opt-out rate before scaling up.
- [ ] Activate WF1 (drip) + WF2 (reply handler).
- [ ] Monitor the first day closely: delivery failures, opt-out %, complaint signals. If opt-outs spike, pause and revisit the list/copy.
- [ ] Enable global error workflow + logging.
- [ ] After the campaign: report to the client — sent, replies, interested, rebooked, opt-outs.
- [ ] Keep `Opted_Out=Yes` contacts permanently suppressed for any future campaign.
