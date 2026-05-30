# Checklists — Referral Generator Engine

## ⚠ Compliance gate (read first)
This texts past customers — a genuine prior business relationship — but TCPA + carrier A2P rules still apply. **Do not send a single message until all of these are true:**
- [ ] Customers being asked are real, satisfied, completed-job customers (not purchased/scraped lists).
- [ ] **A2P 10DLC** brand + campaign is **Approved** (use case: Customer Care; sample messages include a referral ask + STOP language).
- [ ] Every SMS carries **business identity + opt-out** ("Reply STOP to opt out" — appended in WF2 code automatically).
- [ ] **No fabricated rewards:** `REFERRAL_INCENTIVE` is blank unless the client actually offers one.
- [ ] Quiet/business hours set; **n8n timezone matches the client**; daily cap conservative for a new number.

## 11. Client Setup Checklist (~half day)
- [ ] Collect: business name, industry, owner email + **cell**, booking link, **referral link/form**, whether a reward is offered (and its exact wording), business hours, timezone.
- [ ] Confirm the **trigger source** for "happy completed customer": completed job / positive review / survey / CRM / Jobber / ServiceTitan / Housecall Pro / GoHighLevel / manual sheet.
- [ ] Set eligibility (`MIN_SATISFACTION`, `REFERRAL_COOLDOWN_DAYS`, `REQUEST_DELAY_MIN`) and cadence (`REQUEST_DAYS`, `REQUEST_CHANNELS`).
- [ ] Provision Twilio number + **register/confirm A2P 10DLC**.
- [ ] Create the Google Sheet with tabs `Customers`, `Referral_Requests`, `Referrals`, `Activity_Log`, `Opt_Outs`, `Status_History`; ID → `GSHEET_REFERRALS_ID`.
- [ ] Build/confirm the **referral submission form** that POSTs to WF3 (`/webhook/referral-capture`).
- [ ] Import all three workflows; map credentials; copy WF1's webhook URL (triggers + replies) and WF3's webhook URL (form).
- [ ] Point the trigger source at WF1 and Twilio inbound SMS at WF1; point the form at WF3.
- [ ] Set env vars from `.env.example` and the **n8n timezone**.

## 12. Testing Checklist (test on YOUR phones only)
- [ ] POST a completed, satisfied customer (your number, score ≥ `MIN_SATISFACTION`) to WF1 → `Customers` row with `Referral_Eligible=Yes`, `Status=Eligible - Queued`, `Next_Request_At` set.
- [ ] POST an unsatisfied / complaint / within-cooldown customer → logged `Not Eligible` with the reason, no sequence.
- [ ] POST the **same customer twice** → updates the row (dedup on `Customer_ID`), no duplicate.
- [ ] Force a due request (set `Next_Request_At` to the past) → run WF2 → initial ask sends on the right channel **with "Reply STOP to opt out."**, `Sequence_Step` advances, `Last_Request_At` set.
- [ ] Confirm the reminder (+3d) and final (+7d) fire in order, then the sequence completes.
- [ ] Reply with a referral ("my neighbor Sam needs a cleaning, 480-555-0199") → `AI_Class=REFERRAL_PROVIDED`, `Referrals` row written, owner alerted, sequence **stops**.
- [ ] Reply with a complaint → `Complaint=Yes`, owner alerted, sequence stops, polite apology sent.
- [ ] Reply anything → sequence stops (any reply halts further asks).
- [ ] Reply **STOP** → `Opted_Out=Yes`, `Opt_Outs` row, `Status=Opted Out`, excluded from all future runs.
- [ ] Submit the **referral form** (WF3) → `Referrals` row, owner email, referrer marked `Referral Submitted`; high-value/urgent submission also fires the owner **SMS**.
- [ ] Submit the **same referred phone twice** → second is marked `Duplicate`, no re-alert.
- [ ] Confirm the **daily cap** and **business-hours** gate behave.
- [ ] If `REFERRAL_INCENTIVE` is blank, confirm **no reward is ever mentioned** in any message.

## 13. Deployment Checklist
- [ ] A2P 10DLC **Approved**; STOP path tested; opt-out language verified on every SMS.
- [ ] Start with a conservative `DAILY_CAP`; watch delivery + opt-out rate before scaling.
- [ ] Activate WF1 (trigger/replies) + WF2 (sequence) + WF3 (capture).
- [ ] Confirm the trigger source + referral form are live and flowing in.
- [ ] Enable the global error workflow + logging.
- [ ] Weekly report: customers asked, replies, referrals captured, jobs won from referrals, opt-outs.
- [ ] Keep `Opted_Out=Yes` contacts permanently suppressed; respect the cooldown.
