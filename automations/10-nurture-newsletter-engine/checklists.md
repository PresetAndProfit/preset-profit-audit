# Checklists — Long-Term Nurture & Newsletter Engine

## ⚠ Compliance gate (read first)
This sends recurring marketing-adjacent SMS + email to a contact list. TCPA + carrier A2P rules and CAN-SPAM apply. **Do not send a single message until all of these are true:**
- [ ] Contacts have a **prior business relationship** (past customers / opted-in leads) — **not purchased or scraped lists**.
- [ ] **A2P 10DLC** brand + campaign is **Approved** (use case: Marketing / Low-Volume Mixed; sample messages include a nurture touch + STOP language).
- [ ] Every SMS carries **business identity + opt-out** ("Reply STOP to opt out" — appended in WF2 code automatically); every email carries a sign-off + unsubscribe line.
- [ ] **You reviewed a sample batch of AI-generated copy** for tone and accuracy — confirmed it never invents prices, discounts, or guarantees.
- [ ] Quiet/business hours set; **n8n timezone matches the client**; `DAILY_CAP` + `FREQUENCY_CAP_DAYS` conservative for a new number.

## 11. Client Setup Checklist (~1 day)
- [ ] Collect: business name, industry, owner email + **cell**, customer segments/tags, business hours, timezone.
- [ ] Confirm the **contact source(s)**: CRM / Jobber / ServiceTitan / Housecall Pro / GoHighLevel / past-customer export / manual — and whether they can webhook "new customer" / "job completed."
- [ ] Agree the **cadence**: `NURTURE_INTERVAL_DAYS` (default 30), `NURTURE_FIRST_TOUCH_DAYS` (default 3), `NURTURE_CHANNELS` (default `email,sms`), `MAX_TOUCHES` (default 0 = evergreen).
- [ ] Set `FREQUENCY_CAP_DAYS` (blank = `max(7, interval/2)`), `DAILY_CAP`, business hours.
- [ ] Provision Twilio number + **register/confirm A2P 10DLC**.
- [ ] Create the Google Sheet with tabs `Contacts`, `Touch_Log`, `Opt_Outs`, `Status_History` (+ optional `Engagements`); ID → `GSHEET_CONTACTS_ID`.
- [ ] Import both workflows; map credentials; copy WF1's webhook URL.
- [ ] Point the contact source webhook + Twilio inbound SMS at WF1's URL, or bulk-load the past-customer list into the `Contacts` tab.
- [ ] **Review a sample of generated content** (run WF2 manually against test rows) before any real send.

## 12. Testing Checklist (test on YOUR phones/inbox only)
- [ ] POST a sample contact (your number + email, a `segment`, a `last_service`) → `Contacts` row, `Status=Subscribed`, `Next_Touch_At` ≈ now + `NURTURE_FIRST_TOUCH_DAYS`.
- [ ] POST the **same contact again** → updates the row (dedup on `Contact_ID`), no duplicate.
- [ ] Force a due touch (set `Next_Touch_At` to the past) → run WF2 → a touch sends on the rotated channel **with the appended STOP/unsubscribe line**, copy is helpful + seasonal, `Touch_Count` advances, `Next_Touch_At` moves ~`NURTURE_INTERVAL_DAYS` out, `Last_Topic` recorded.
- [ ] Confirm the AI content is **seasonally appropriate** for the current month and the client's industry, and **never mentions a price/discount/guarantee**.
- [ ] Run WF2 again immediately → the same contact is **skipped** (frequency cap + not-yet-due).
- [ ] Reply "yes I need a tune-up" → `AI_Class=BOOK/INTERESTED`, status `Re-Engaged`, **nurture pauses**, owner gets the hot-lead email.
- [ ] Reply a question → answered, sequence **continues**.
- [ ] Reply "not right now" → `Replied - Not Now`, sequence **continues** politely.
- [ ] Reply **STOP** → `Opted_Out=Yes`, `Opt_Outs` row, excluded from all future runs.
- [ ] If `MAX_TOUCHES` is set, confirm the contact stops at N touches (`Status=Nurture Complete`, `Sequence_Active=No`); with `MAX_TOUCHES=0` it keeps going.
- [ ] Confirm the **daily cap** and **business-hours** gate behave.

## 13. Deployment Checklist
- [ ] A2P 10DLC **Approved**; STOP path tested; opt-out language verified on every SMS + unsubscribe on every email.
- [ ] Start with a conservative `DAILY_CAP` (drip the existing list in over days, don't blast it).
- [ ] Activate WF1 (capture/replies) + WF2 (scheduler).
- [ ] Confirm contacts are flowing in (or the list is loaded) and touches generate + send on schedule.
- [ ] Enable the global error workflow + logging.
- [ ] Monthly report: active contacts, touches sent, replies, **re-engaged/booked leads**, opt-out rate.
- [ ] Keep `Opted_Out=Yes` contacts permanently suppressed. Watch opt-out rate — if it climbs, lengthen the cadence.
