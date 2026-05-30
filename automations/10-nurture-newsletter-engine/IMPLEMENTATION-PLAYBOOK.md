# Implementation Playbook — Long-Term Nurture & Newsletter Engine
**Preset & Profit · zero-to-live runbook** · example client **Acme Heating & Cooling**

Hands-on: **~1 day**. This is an always-on service: contacts flow in from the client's CRM/field-service tool (or a one-time list import), and the engine keeps the business top-of-mind with **AI-generated, seasonally-relevant value touches** on a long cadence (default every 30 days), rotating SMS + email. When a nurtured contact replies with intent, it **pauses the drip and hands the owner a hot lead**. The value is **repeat/seasonal revenue + reactivated relationships from a list that was doing nothing**; the risks are **SMS compliance + content quality**, so the playbook front-loads both.

Legend: 🟢 you · 🔵 client (guided) · ⚠ gotcha

## ⚠ STEP 0 — Compliance + content pre-flight (do before anything else)
- [ ] Confirm contacts have a **prior relationship** (past customers / opted-in leads), never purchased lists.
- [ ] Start **A2P 10DLC** registration immediately; use case *Marketing / Low-Volume Mixed*; include a nurture + STOP sample.
- [ ] Agree the **content guardrails**: no invented prices/discounts/guarantees; warm, value-first, not salesy. (AI writes the copy — you'll review a sample.)
- [ ] Decide the **cadence** and whether nurture is evergreen (`MAX_TOUCHES=0`) or capped.

## STEP 1 — Client signs agreement 🔵🟢
- [ ] Send agreement + order form ($750–1,000 setup / $347/mo). Collect A2P 10DLC legal info. Take payment.

## STEP 2 — Client gives access 🔵
- [ ] Contact source: CRM / Jobber / ServiceTitan / Housecall Pro / GoHighLevel / past-customer export; can it webhook "new customer" / "job completed"?
- [ ] Owner email + **cell**, customer segments/tags, business hours, timezone.

## STEP 3 — Decide the schedule + segments 🟢
- [ ] `NURTURE_INTERVAL_DAYS` (default 30), `NURTURE_FIRST_TOUCH_DAYS` (default 3), `NURTURE_CHANNELS` (default `email,sms`).
- [ ] `MAX_TOUCHES` (0 = evergreen), `FREQUENCY_CAP_DAYS`, `DAILY_CAP`.
- [ ] Map the client's customer types into the `Segment` column so the AI angles content correctly.

## STEP 4 — System installation (n8n) 🟢
1. [ ] Import `workflow-1-contact-capture.json` and `workflow-2-nurture-scheduler.json`.
2. [ ] Create + attach the 4 credentials on each ⚠ node (Google Sheets, Twilio, OpenAI, Gmail).
3. [ ] Set Variables from `.env.example`.
4. ⚠ **Set the n8n timezone** (hours gate + month/season detection + cadence math depend on it).
5. [ ] Copy WF1's webhook Production URL (`/webhook/contact-intake`).

## STEP 5 — Google Sheets 🟢
- [ ] Create the sheet with tabs `Contacts`, `Touch_Log`, `Opt_Outs`, `Status_History` (+ optional `Engagements`); headers in `google-sheets-structure.md`. ID → `GSHEET_CONTACTS_ID`; grant edit access.

## STEP 6 — Load the list / wire the source 🟢🔵
- [ ] **Best:** point the CRM/field tool's "new customer" / "job completed" webhook at WF1. The Normalize node maps CRM/Jobber/ServiceTitan/Housecall Pro/GoHighLevel/generic and **dedupes on `Contact_ID`**.
- [ ] **Or:** bulk-load the past-customer export into the `Contacts` tab (E.164 phones, `Sequence_Active=Yes`, `Touch_Count=0`, a near-term `Next_Touch_At`, a `Segment`).

## STEP 7 — Twilio + 10DLC 🟢
- [ ] Buy number (SMS), set `TWILIO_NUMBER` + `OWNER_PHONE`.
- [ ] Messaging "A Message Comes In" → WF1 URL (replies + STOP route here).
- [ ] ⚠ Confirm A2P 10DLC **Approved** before any real send.

## STEP 8 — OpenAI 🟢
- [ ] API key → credential, low cap (~$10/mo plenty), `gpt-4o-mini` + JSON mode (content + classifier).

## STEP 9 — Content review + testing (your phones/inbox only) 🟢
- [ ] Run WF2 **manually** against a few test rows and **read the generated touches** — confirm tone, seasonal relevance, and that nothing invents a price/discount/guarantee. Adjust `BUSINESS_INDUSTRY`/`Segment` wording if the angle is off.
- [ ] Run `checklists.md` §12 on YOUR numbers: capture + dedup, due-touch send with appended STOP, frequency-cap skip, reply classification (book/question/not-now), STOP suppression, daily cap, business hours, `MAX_TOUCHES` stop.
- [ ] **Do not test against the client's real list.**

## STEP 10 — Go-live 🟢🔵
1. [ ] 10DLC approved, STOP tested, sample copy approved.
2. [ ] Conservative `DAILY_CAP` so the existing list **drips in over days** rather than blasting. Activate WF1 + WF2.
3. [ ] Confirm contacts/touches are flowing and the cadence advances correctly.
4. [ ] **Watch week 1:** delivery, opt-out %, reply tone, content quality. If opt-outs climb, lengthen the cadence.
5. [ ] Work `Re-Engaged` rows with the owner — these are the booked-revenue events.
6. [ ] Monthly report: active contacts, touches sent, replies, **re-engaged/booked leads**, opt-outs.

## What can still block you
1. **A2P 10DLC / consent** — gating issue; no approval = no send. Recurring marketing-adjacent SMS draws more scrutiny than transactional.
2. **List quality** — nurturing people with no relationship spikes opt-outs/complaints. Past customers only.
3. **Timezone** — wrong zone sends off-hours and picks the wrong season for content.
4. **Content quality** — AI writes the copy, so review a sample and keep `Segment`/industry accurate; the code guarantees the STOP line + no-empty-message, but tone/relevance is on the setup.
5. **Over-frequency** — keep the cadence long and the frequency cap honest; nurture fatigue = unsubscribes.
6. **Exotic source payloads** — confirm the Normalize node's field mapping with a real sample from the client's CRM.
