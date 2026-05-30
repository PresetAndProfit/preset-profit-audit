# Implementation Playbook — Review & Reputation Engine
**Preset & Profit · zero-to-live runbook** · example client **Acme HVAC**

Hands-on: **~2–3 hours**. The new work vs #01/#02 is (a) getting the **Google review link** right and (b) choosing how "job completed" gets into the system. A2P 10DLC still gates SMS.

Legend: 🟢 you · 🔵 client (guided) · ⚠ gotcha

## STEP 1 — Client signs agreement 🔵🟢
- [ ] Send agreement + order form (Reputation package: $500–750 setup / $297/mo).
- [ ] Collect A2P 10DLC legal info (legal name, EIN, address, website).
- [ ] Confirm they have a **Google Business Profile** (no profile = no Google reviews; set one up first as an add-on).
- [ ] Take setup fee.

## STEP 2 — Client gives access 🔵
- [ ] Owner email, business hours, timezone, industry.
- [ ] **Google review link** — have them go to Google Business Profile → "Ask for reviews" → copy. (Or you build it from their Place ID via the Place ID Finder.)
- [ ] How jobs finish in their world — do they use a CRM/FSM (Jobber, Housecall Pro, ServiceTitan), or just a calendar / paper? This decides Step 4.

## STEP 3 — System installation (n8n) 🟢
1. [ ] Import `workflow-1-review-engine.json` and `workflow-2-request-scheduler.json`.
2. [ ] Create + attach the 4 credentials on each ⚠ node.
3. [ ] Set Variables from `.env.example`: `GOOGLE_REVIEW_LINK`, `REVIEW_DELAY_MIN`, `BUSINESS_HOURS_START/END`, etc.
4. ⚠ **Set the n8n timezone** (Settings → Timezone, or per-workflow) to the client's local zone — business-hours gating and `Send_At` depend on it.
5. [ ] Copy WF1's webhook Production URL.

## STEP 4 — Wire the "job completed" trigger 🟢🔵 (the key decision)
Pick the lightest option the client can sustain:
- **A — CRM/FSM webhook (best):** in Jobber/Housecall Pro/ServiceTitan, add a "job completed / invoice paid" webhook → POST to the WF1 URL with `name`, `phone`, `email`, `job_type`. The Normalize node already maps these.
- **B — Google Form (simplest, no CRM):** build a 4-field form (name, phone, email, job type) the tech/front desk fills when a job wraps → form's webhook/Apps Script → the WF1 URL. Append `?source=GoogleForm`.
- **C — "Completed today" sheet:** client lists completed jobs in a tab; add a small daily read step to feed WF1. (Slower, more manual.)
- [ ] Also set the Twilio number's **Messaging webhook** → the same WF1 URL (so 1-5 replies route back in).

## STEP 5 — Twilio + 10DLC 🟢
- [ ] Buy number (SMS), set `TWILIO_NUMBER`.
- [ ] Messaging "A Message Comes In" → WF1 URL.
- [ ] ⚠ Register **A2P 10DLC** immediately. Use a pre-approved fallback number for day-one if pending.

## STEP 6 — Google Sheets 🟢
- [ ] Create sheet, import `reviews-sheet-header.csv` (Replace current sheet), tab named `Reviews`, ID → `GSHEET_REVIEWS_ID`, grant edit access.

## STEP 7 — OpenAI 🟢
- [ ] API key → credential, $10/mo cap (this one is cheap — one tiny call per reply), `gpt-4o-mini` + JSON mode.

## STEP 8 — Testing 🟢
Run `checklists.md` §12. The critical tests: reply "5" → public link; reply "2 + complaint" → **no link, private apology, owner alerted**; ambiguous reply → private path; business-hours gating; one-reminder cap; OpenAI-failure → safe (private) fallback. **Verify the Google link opens the review box on a phone.**

## STEP 9 — Go-live 🟢🔵
- [ ] 10DLC approved → both workflows `Active`.
- [ ] Production trigger wired; timezone confirmed.
- [ ] **Brief the owner**: negative alerts need their fast personal call-back — that's what saves the reputation. Set the expectation that they'll act on those emails same-day.
- [ ] Run one real completed job through it end-to-end with the owner watching.
- [ ] 7-day review: asks sent, positive rate, new reviews, negatives intercepted.

## Fastest path if the client is tomorrow
1. **Now:** sign, EIN, **start 10DLC**, grab the Google review link.
2. **Tonight:** Steps 3, 6, 7.
3. **Tomorrow:** Step 4 (Google Form is fastest if no CRM), Step 5, test, go live.

## What can still block you
1. **A2P 10DLC timing** (SMS only).
2. **No Google Business Profile / wrong review link** — the whole value is the public review; verify the link before launch.
3. **Owner won't act on negative alerts** — the interception only works if they follow up. Set that expectation at go-live.
