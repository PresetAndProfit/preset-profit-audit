# Implementation Playbook — Referral Generator Engine
**Preset & Profit · zero-to-live runbook** · example client **Acme Dental**

Hands-on: **~half a day**. This is an always-on service: satisfied, completed-job customers flow in, the engine qualifies them, asks for a referral on a polite 3-touch cadence, classifies replies, captures the referred leads, and pings the owner. The dominant value is **turning happy customers into warm, free leads**; the dominant risk is **SMS compliance + not being pushy**, so the playbook front-loads both.

Legend: 🟢 you · 🔵 client (guided) · ⚠ gotcha

## ⚠ STEP 0 — Compliance pre-flight (do before anything else)
- [ ] Confirm asks only go to **real, satisfied, completed-job customers** (not bought lists).
- [ ] Start **A2P 10DLC** registration immediately; use case *Customer Care*; include a referral ask + STOP sample messages.
- [ ] Decide whether the client offers a **reward**. If not, `REFERRAL_INCENTIVE` stays blank and nothing ever promises one. If yes, get the exact, legal wording.

## STEP 1 — Client signs agreement 🔵🟢
- [ ] Send agreement + order form ($500–750 setup / $247/mo).
- [ ] Collect A2P 10DLC legal info. Take payment.

## STEP 2 — Client gives access + info 🔵
- [ ] How they know a job is **done + the customer is happy**: completed-job event, post-job survey, positive review, or CRM stage (Jobber/ServiceTitan/Housecall Pro/GoHighLevel).
- [ ] Owner email + **cell**, booking link, and the **referral link/form** (or let us build a simple one).
- [ ] Reward policy (exact wording or none), business hours, timezone.

## STEP 3 — Decide gate + cadence 🟢
- [ ] `MIN_SATISFACTION`, `REFERRAL_COOLDOWN_DAYS` (default 90), `REQUEST_DELAY_MIN`.
- [ ] `REQUEST_DAYS` (default `0,3,7`) and `REQUEST_CHANNELS` (default `sms,email,sms`).

## STEP 4 — System installation (n8n) 🟢
1. [ ] Import `workflow-1-referral-trigger.json`, `workflow-2-referral-request-sequence.json`, `workflow-3-referral-capture-alert.json`.
2. [ ] Create + attach the 4 credentials on each ⚠ node (Google Sheets, Twilio, OpenAI, Gmail).
3. [ ] Set Variables from `.env.example`.
4. ⚠ **Set the n8n timezone** (hours gate + cooldown + due math depend on it).
5. [ ] Copy WF1's webhook URL (triggers + replies) and WF3's webhook URL (referral form).

## STEP 5 — Google Sheets 🟢
- [ ] Create the sheet with tabs `Customers`, `Referral_Requests`, `Referrals`, `Activity_Log`, `Opt_Outs`, `Status_History` (headers in `google-sheets-structure.md`). ID → `GSHEET_REFERRALS_ID`; grant edit access.

## STEP 6 — Wire the trigger + form 🟢🔵
- [ ] Point the "happy completed customer" source at WF1 (`/webhook/referral-trigger`). The Normalize node maps Jobber/ServiceTitan/HCP/GHL/generic shapes and **dedupes on `Customer_ID`**.
- [ ] Build/embed the **referral form** posting `{referrer_name, referrer_phone, referred_name, referred_phone, referred_email, service_needed, relationship, notes}` to WF3.

## STEP 7 — Twilio + 10DLC 🟢
- [ ] Buy number (SMS), set `TWILIO_NUMBER` + `OWNER_PHONE`.
- [ ] Messaging "A Message Comes In" → WF1 URL (replies + STOP route here).
- [ ] ⚠ Confirm A2P 10DLC **Approved** before any real send.

## STEP 8 — OpenAI 🟢
- [ ] API key → credential, low cap (~$10/mo is plenty), `gpt-4o-mini` + JSON mode.

## STEP 9 — Testing (your phones only) 🟢
Run `checklists.md` §12 with test customers on YOUR numbers. Verify: qualification + dedup, the 3-touch cadence with appended STOP, reply classification (referral/complaint/general), SMS-provided referral capture + owner alert, the referral **form** path + high-value/urgent SMS escalation, STOP suppression, cooldown, daily cap, business hours, and — critically — that **no reward is ever mentioned when `REFERRAL_INCENTIVE` is blank**. **Do not test against the client's real customer list.**

## STEP 10 — Go-live 🟢🔵
1. [ ] 10DLC approved, STOP tested.
2. [ ] Conservative `DAILY_CAP`. Activate WF1 + WF2 + WF3.
3. [ ] Confirm the trigger source + form are delivering.
4. [ ] **Watch day 1:** delivery, opt-out %, reply tone. If opt-outs spike or replies feel annoyed, soften copy / lengthen cadence.
5. [ ] Work the `Referrals` rows with the owner fast — referred leads close quickly.
6. [ ] Weekly report: asked, replied, referrals captured, jobs won, opt-outs.

## What can still block you
1. **A2P 10DLC / consent** — gating issue; no approval = no send.
2. **Bad trigger signal** — asking unhappy or mid-job customers is the worst failure; trust the satisfaction/complaint gate and keep `MIN_SATISFACTION` honest.
3. **Pushiness / over-asking** — the cooldown + "any reply stops the sequence" + low-pressure copy guard this; don't shorten the cadence aggressively.
4. **Timezone** — wrong zone sends off-hours and breaks cooldown/due math.
5. **Reward claims** — never promise an incentive the client doesn't actually honor; leave `REFERRAL_INCENTIVE` blank if unsure.
