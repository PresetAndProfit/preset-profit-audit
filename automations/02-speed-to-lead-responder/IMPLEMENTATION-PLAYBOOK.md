# Implementation Playbook — Lead Capture & Follow-Up Engine
**Preset & Profit · zero-to-live runbook** · example client **Acme HVAC**

Total hands-on: **~3–4 hours**. The variable is how many lead sources you wire up (Step 4) and A2P 10DLC approval (Step 5D). Mirrors Automation #01's playbook — the new work is **lead-source integration** instead of Twilio voice config.

Legend: 🟢 you · 🔵 client (guided) · ⚠ gotcha

## STEP 1 — Client signs agreement 🔵🟢
- [ ] Send agreement + the **Speed-to-Lead** order form ($750–1,000 setup / $397/mo).
- [ ] Collect legal business info for A2P 10DLC (legal name, EIN, address, website).
- [ ] Get a **list of every lead source** they use (website form platform, ad accounts, form tools).
- [ ] Take the setup fee.

## STEP 2 — Client gives access (intake) 🔵
Collect: business name, industry, owner email, service area, booking link, **and access to each lead source** you'll wire up:
- Website: who controls the form (Webflow/WordPress/Wix/custom dev)?
- Facebook/Instagram: admin access to the Meta Business / Lead Ads account.
- Form tools: Typeform/Jotform login or an admin to add a webhook.
- Google LSA: account access if applicable.
⚠ You don't need their phone carrier — this automation captures **form/ad** leads, not calls. (Pair with #01 for calls.)

## STEP 3 — System installation (n8n) 🟢
1. [ ] Import `workflow-1-lead-capture.json` and `workflow-2-followup-scheduler.json`.
2. [ ] Create the 4 credentials (Twilio, OpenAI, Google Sheets, Gmail) and attach them on every node showing a ⚠.
3. [ ] Set Variables from `.env.example` — including `FIRST_FOLLOW_UP_MIN`, `FOLLOW_UP_GAPS_MIN`, `FOLLOW_UP_CHANNELS`.
4. ⚠ Confirm the OpenAI node type matches your instance (swap legacy `n8n-nodes-base.openAi` if needed); verify the Code nodes' AI-parse line against your node's output shape.
5. [ ] Copy **WF1's webhook Production URL** — you need it for every lead source in Step 4.

## STEP 4 — Lead-source integration (the core work) 🟢🔵
For **each** source, point it at the WF1 webhook URL (append `?source=<label>` so `Source` is labeled):
- **Website form:** set the form's action/webhook to the URL, or bridge via the platform's native webhook / a no-code connector. Map field names; the Normalize node already handles `name/first_name/phone/email/service/message` and common aliases — add any custom ones.
- **Facebook/Instagram Lead Ads:** connect Meta Lead Ads to the webhook (via a Lead Ads trigger or a forwarding connector). Test with Meta's Lead Ads Testing Tool.
- **Typeform/Jotform/etc.:** add a webhook integration in the form's settings → the URL.
- **Google LSA / other:** forward via the platform's webhook or a connector.
- [ ] After wiring each, submit one test and confirm a row lands with the right `Source`.

## STEP 5 — Twilio + 10DLC 🟢
- **5A** Buy a local Twilio number (Voice+SMS), put it in `TWILIO_NUMBER`.
- **5B** Set the number's Messaging "A Message Comes In" → the **same** WF1 webhook URL (so reply texts route back in).
- **5C** No voice config needed for this automation (that's #01).
- **5D** ⚠ Register **A2P 10DLC** immediately — SMS is gated by carrier approval (minutes for sole-prop, 1–3 days standard). Use a pre-approved fallback number for day-one demos if pending.

## STEP 6 — Google Sheets 🟢
- [ ] Create the sheet, **File → Import →** `leads-sheet-header.csv` → Replace current sheet.
- [ ] Rename tab to exactly `Leads`; copy the ID into `GSHEET_LEADS_ID`.
- [ ] Give the credential's Google account edit access.

## STEP 7 — OpenAI 🟢
- [ ] Create API key, paste into credential, set a **$20/mo cap**, confirm `gpt-4o-mini` + JSON mode on both OpenAI nodes.

## STEP 8 — Testing 🟢
Run `checklists.md` §12 end-to-end: submit a test lead from each source → instant SMS+email <60s → reply → AI conversation → dedup → sequence fires → reply halts sequence → spam handled → fallback works. Also verify **email deliverability** (SPF/DKIM) so instant emails don't land in spam.

## STEP 9 — Go-live 🟢🔵
- [ ] Confirm 10DLC approved. Set both workflows **Active**.
- [ ] Switch every live lead source from test to production URL.
- [ ] Enable the global error workflow.
- [ ] One live test submission with the owner watching it hit their email + Sheet.
- [ ] Send the 1-page "how to read your leads" guide. Book 48h + 7-day reviews.

## Fastest path if the client is tomorrow
1. **Now:** sign, grab EIN, **start 10DLC**.
2. **Tonight:** Steps 3, 6, 7 (n8n import, Sheet, OpenAI).
3. **Tomorrow AM:** Step 4 (wire the 1–2 highest-volume sources first — usually the website form + Facebook), Step 5.
4. **Then:** test → go live. If 10DLC pending, route SMS through a fallback number and the email channel still works immediately.

## What can still block you
1. **A2P 10DLC timing** (SMS only — email + logging + alerts work without it).
2. **Lead-source access** — if the client can't grant access to their form/ad platform, you can't wire the trigger. Confirm access at signing, not at install.
