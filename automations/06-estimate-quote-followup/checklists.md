# Checklists — Estimate / Quote Follow-Up Engine

## ⚠ Compliance gate (read first)
This automation texts customers who requested an estimate — a genuine prior business relationship — but TCPA + carrier A2P rules still apply. **Do not send a single message until all of these are true:**
- [ ] Every contact in the sequence asked for / received an estimate from the client (no purchased or scraped numbers).
- [ ] **A2P 10DLC** brand + campaign is **Approved** (use case: Customer Care; sample messages include a follow-up touch + STOP language).
- [ ] Every SMS carries **business identity + opt-out** ("Reply STOP to opt out" — verify your messaging service appends it, or add it to the templates).
- [ ] Quiet/business-hours window is set and the **n8n timezone matches the client**.
- [ ] Daily cap is conservative for a new number (warm-up).

## 11. Client Setup Checklist (~half day)
- [ ] Collect: business name, industry, owner email, **owner cell** (for HOT alerts), booking link, business hours, timezone.
- [ ] Confirm the **quoting source**: Jobber / ServiceTitan / Housecall Pro / GoHighLevel / QuickBooks / spreadsheet / manual.
- [ ] Decide the **follow-up cadence** (`FOLLOWUP_DAYS`, default `1,3,7,14,21`) and channel mix (`FOLLOWUP_CHANNELS`).
- [ ] Set the **high-value threshold** (`HIGH_VALUE_ESTIMATE`) and **view-alert threshold** (`VIEW_ALERT_THRESHOLD`).
- [ ] Provision Twilio number + **register/confirm A2P 10DLC** (start days ahead).
- [ ] Create the Google Sheet from `quotes-sheet-header.csv`; add tabs `Quotes`, `Follow_Up_Log`, `Status_History`, `Activity`; ID → `GSHEET_QUOTES_ID`.
- [ ] Set env vars from `.env.example` and **set the n8n timezone**.
- [ ] Import both workflows; map credentials; copy WF1's webhook Production URL.
- [ ] Point the quoting tool's webhook (and/or Twilio inbound SMS) at WF1's URL so estimates + replies + view pings route in.

## 12. Testing Checklist (test on YOUR phones only)
- [ ] POST a sample estimate (your own number) to WF1 → confirm a row appears in `Quotes` with `Status = Open - Follow-Up Scheduled` and `Next_Follow_Up_At` ≈ Day 1.
- [ ] POST the **same estimate again** → confirm it **updates** the existing row (dedup on `Quote_ID`), not a duplicate.
- [ ] POST a high-value estimate (≥ `HIGH_VALUE_ESTIMATE`) → confirm the owner gets the high-value email.
- [ ] Force a due follow-up (set `Next_Follow_Up_At` to the past) → run WF2 → confirm the touch sends on the right channel and `Sequence_Step` advances.
- [ ] Reply "what's included for that price?" → AI answers, `AI_Interest = WARM`, owner alerted (objection), sequence continues.
- [ ] Reply "yes let's do it" → `Won - Accepted`, `Sequence_Active = No`, owner alerted (email + SMS), **no more follow-ups**.
- [ ] Reply "no thanks" → `Declined`, sequence stops.
- [ ] Reply **STOP** → `Opted_Out = Yes`, `Status = Declined - Opted Out`, excluded from all future runs.
- [ ] POST `{event:"viewed", quote_id:"..."}` `VIEW_ALERT_THRESHOLD` times → confirm `Views` increments and the multi-view alert fires once.
- [ ] Set an `Expiration_Date` in the past → run WF2 → confirm the quote is marked `Expired` and stops (no send).
- [ ] Confirm the **daily cap** halts sends once reached, and **business-hours** gate blocks off-hours sends.
- [ ] Confirm `Follow_Up_Log` and `Status_History` rows are written.

## 13. Deployment Checklist
- [ ] A2P 10DLC **Approved**; STOP path tested; opt-out language verified on every SMS.
- [ ] Start with a **conservative `DAILY_CAP`** and watch delivery + opt-out rate before scaling.
- [ ] Activate WF1 (intake) + WF2 (sequence engine).
- [ ] Confirm the quoting-source webhook is live and new estimates are flowing in.
- [ ] Enable the global error workflow + logging.
- [ ] Week 1: review `Replied - Hot`/`Won - Accepted` rows with the owner; report quotes touched, replies, hot leads, jobs won.
- [ ] Keep `Opted_Out = Yes` contacts permanently suppressed.
