# Implementation Playbook — Database Reactivation Campaign
**Preset & Profit · zero-to-live runbook** · example client **Acme HVAC**

Hands-on: **~half a day** (most of it list cleaning). This is a **campaign**, not an always-on service — you load a list, drip it out safely, work the replies, then report. The dominant risk is **compliance**, so the playbook front-loads it.

Legend: 🟢 you · 🔵 client (guided) · ⚠ gotcha

## ⚠ STEP 0 — Compliance pre-flight (do before anything else)
- [ ] Confirm in writing that the client has a **prior business relationship / consent** for the contacts (past paying customers — not purchased or scraped lists).
- [ ] Start **A2P 10DLC** registration immediately; the campaign use case is *Customer Care*; include the win-back + STOP sample messages.
- [ ] Agree conservative throttle (warm-up): `DAILY_CAP` 50–100 to start.

## STEP 1 — Client signs agreement 🔵🟢
- [ ] Send agreement + order form ($1,000–1,500 one-time campaign / $250/mo retainer, or rev-share).
- [ ] Collect A2P 10DLC legal info + written consent attestation.
- [ ] Take payment.

## STEP 2 — Client gives access (the list) 🔵
- [ ] Export of past customers from their CRM/POS/QuickBooks/Jobber: **name, phone, email, last service, last visit**.
- [ ] The **offer** (the hook — e.g., "$50 off a tune-up this month").
- [ ] Owner email, booking link, business hours, timezone.

## STEP 3 — Clean & prepare the list 🟢 (the real work)
- [ ] Dedupe; remove staff/test/obviously-bad numbers.
- [ ] **Normalize every phone to E.164** (`+1XXXXXXXXXX`).
- [ ] Set `Consent=Yes` only where justified (leave blank if unsure — blank never sends).
- [ ] Generate a unique `Contact_ID` per row.
- [ ] Save as the import for the `Contacts` tab.

## STEP 4 — System installation (n8n) 🟢
1. [ ] Import `workflow-1-campaign-sender.json` and `workflow-2-reply-handler.json`.
2. [ ] Create + attach the 4 credentials on each ⚠ node.
3. [ ] Set Variables from `.env.example` (`OFFER`, `BATCH_SIZE`, `DAILY_CAP`, `SEND_GAP_SEC`, business hours).
4. ⚠ **Set the n8n timezone** (hours gate + daily cap depend on it).
5. [ ] Copy WF2's webhook Production URL.

## STEP 5 — Twilio + 10DLC 🟢
- [ ] Buy number (SMS), set `TWILIO_NUMBER`.
- [ ] Messaging "A Message Comes In" → WF2 URL (replies + STOP route here).
- [ ] ⚠ Confirm A2P 10DLC **Approved** before any real send.

## STEP 6 — Google Sheets 🟢
- [ ] Create sheet, import `contacts-sheet-header.csv` to set headers, then import the cleaned list into the `Contacts` tab. ID → `GSHEET_CONTACTS_ID`; grant edit access.

## STEP 7 — OpenAI 🟢
- [ ] API key → credential, set a cap (~$20/mo covers a few thousand contacts), `gpt-4o-mini` + JSON mode.

## STEP 8 — Testing (your phones only) 🟢
Run `checklists.md` §12 with a few test rows that are YOUR numbers. Verify: personalized SMS **with appended STOP**, consent gate, opt-out suppression, interested→owner alert, daily cap, business hours, throttle gap, no double-send. **Do not test against the client's real list.**

## STEP 9 — Go-live (staged) 🟢🔵
1. [ ] 10DLC approved, consent verified, STOP tested.
2. [ ] Set `DAILY_CAP` low (e.g., 50). Activate WF1 (drip) + WF2 (replies).
3. [ ] **Watch day 1 closely:** delivery failures, opt-out %, any complaints. Healthy opt-out is low single digits; if it spikes, pause and fix list/copy.
4. [ ] Scale `DAILY_CAP` up over subsequent days as the number stays healthy.
5. [ ] Work the `Replied - Interested` rows with the owner; book them.
6. [ ] Closeout report: sent, replies, interested, rebooked, opt-outs, revenue influenced.

## What can still block you
1. **Consent / A2P 10DLC** — the gating issue. No consent or unapproved campaign = do not send. Non-negotiable.
2. **Dirty list** — bad phone formats cause failed sends and wasted spend; clean before import.
3. **Timezone** — wrong zone can send outside legal/business hours.
4. **Opt-out spike** — a sign the list or offer is off; staged rollout limits the damage.
