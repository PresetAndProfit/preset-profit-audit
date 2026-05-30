# Implementation Playbook — Estimate / Quote Follow-Up Engine
**Preset & Profit · zero-to-live runbook** · example client **Acme Roofing**

Hands-on: **~half a day to a day**. This is an always-on service: estimates flow in from the client's quoting tool, the engine works every open quote on a Day 1/3/7/14/21 cadence, classifies replies, and pings the owner the moment a lead gets hot. The dominant value is **closing quotes that would otherwise be forgotten**; the dominant risk is **SMS compliance**, so the playbook front-loads it.

Legend: 🟢 you · 🔵 client (guided) · ⚠ gotcha

## ⚠ STEP 0 — Compliance pre-flight (do before anything else)
- [ ] Confirm the client only follows up with people who **requested an estimate** (prior business relationship — not bought lists).
- [ ] Start **A2P 10DLC** registration immediately; use case *Customer Care*; include a follow-up touch + STOP sample messages.
- [ ] Agree a conservative `DAILY_CAP` to warm up the number.

## STEP 1 — Client signs agreement 🔵🟢
- [ ] Send agreement + order form ($600–900 setup / $297/mo).
- [ ] Collect A2P 10DLC legal info.
- [ ] Take payment.

## STEP 2 — Client gives access 🔵
- [ ] How they create estimates today: **Jobber / ServiceTitan / Housecall Pro / GoHighLevel / QuickBooks / spreadsheet / manual**.
- [ ] Owner email + **owner cell** (HOT-lead SMS), booking link, business hours, timezone.
- [ ] Typical quote value range (to set `HIGH_VALUE_ESTIMATE`) and desired cadence.

## STEP 3 — Decide the sequence 🟢
- [ ] `FOLLOWUP_DAYS` (default `1,3,7,14,21`) and `FOLLOWUP_CHANNELS` (default `sms,email,sms,email,sms`).
- [ ] `HIGH_VALUE_ESTIMATE` threshold and `VIEW_ALERT_THRESHOLD`.

## STEP 4 — System installation (n8n) 🟢
1. [ ] Import `workflow-1-estimate-capture.json` and `workflow-2-followup-engine.json`.
2. [ ] Create + attach the 4 credentials on each ⚠ node (Google Sheets, Twilio, OpenAI, Gmail).
3. [ ] Set Variables from `.env.example`.
4. ⚠ **Set the n8n timezone** (hours gate + daily cap + due-date math depend on it).
5. [ ] Copy WF1's webhook Production URL (`/webhook/estimate-intake`).

## STEP 5 — Google Sheets 🟢
- [ ] Create the sheet, import `quotes-sheet-header.csv` into the `Quotes` tab, add tabs `Follow_Up_Log`, `Status_History`, `Activity` (headers in `google-sheets-structure.md`). ID → `GSHEET_QUOTES_ID`; grant edit access.

## STEP 6 — Wire the estimate source 🟢🔵
- [ ] **Best:** point the quoting tool's "estimate sent" webhook at WF1's URL. The Normalize node already maps Jobber / ServiceTitan / Housecall Pro / GoHighLevel / generic field shapes and **deduplicates on `Quote_ID`**.
- [ ] **Or:** scheduled CRM/CSV export → append rows to the `Quotes` tab (mind E.164 phones).
- [ ] **Or:** a simple internal form / manual entry that POSTs to the webhook.

## STEP 7 — Twilio + 10DLC 🟢
- [ ] Buy number (SMS), set `TWILIO_NUMBER`.
- [ ] Messaging "A Message Comes In" → WF1 URL (replies + STOP route here).
- [ ] ⚠ Confirm A2P 10DLC **Approved** before any real send.

## STEP 8 — OpenAI 🟢
- [ ] API key → credential, set a low cap (~$10/mo is plenty), `gpt-4o-mini` + JSON mode.

## STEP 9 — Testing (your phones only) 🟢
Run `checklists.md` §12 with test estimates on YOUR numbers. Verify: capture + dedup, high-value alert, due follow-up sends on the right channel, reply classification (HOT/WARM/COLD/DECLINED), accept/decline/STOP all stop the sequence, view alert, expiration stop, daily cap, business hours, and that the `Follow_Up_Log` / `Status_History` tabs populate. **Do not test against the client's real quote list.**

## STEP 10 — Go-live 🟢🔵
1. [ ] 10DLC approved, STOP tested.
2. [ ] Set `DAILY_CAP` conservative. Activate WF1 + WF2.
3. [ ] Confirm the source webhook is delivering new estimates.
4. [ ] **Watch day 1:** delivery failures, opt-out %, any complaints. If opt-outs spike, pause and revisit copy/cadence.
5. [ ] Work the `Replied - Hot` / `Won - Accepted` rows with the owner.
6. [ ] Weekly report: quotes in sequence, touches sent, replies, hot leads, jobs won, revenue influenced.

## What can still block you
1. **A2P 10DLC / consent** — the gating issue; no approval = do not send.
2. **Source field mapping** — exotic CRM payloads may need a tweak to the Normalize node's key lists; test with a real sample.
3. **Timezone** — wrong zone sends outside business hours and breaks due-date math.
4. **Dirty phones/emails** — normalize to E.164 and validate emails before they enter the sheet.
5. **Stale status** — if the client marks a quote won/lost only in their CRM, mirror it into `Sequence_Active=No` (webhook re-sync or manual) so the sequence stops.
