# Implementation Playbook — Missed Call Recovery (HVAC Client)
**Preset & Profit · zero-to-live runbook**

Example client used throughout: **Acme HVAC**, owner **Mike**, real cell **+1 480 555 1234**, service area **Phoenix, AZ**.
Total hands-on time: **~3–4 hours** spread over the steps below. The only thing you can't compress is **A2P 10DLC carrier approval** (see Step 4D) — start it the moment the agreement is signed.

Legend: 🟢 you do it · 🔵 client does it (you guide) · ⏱ time · ⚠ gotcha

---

## STEP 0 — Before the call (15 min) 🟢
- [ ] Create a fresh folder/credential set so this client is isolated from others.
- [ ] Have these accounts ready: your **n8n** (Cloud or self-hosted), **Twilio**, **OpenAI**, a **Google account** for the Sheet, and the **Gmail** that will send owner alerts.
- [ ] Open the repo folder `automations/01-missed-call-recovery/` — you'll use every file in it.

---

## STEP 1 — Client signs agreement ⏱15 min 🔵🟢
- [ ] Send the service agreement + the **Pro package** order form ($750–1,000 setup / $397/mo).
- [ ] Get written consent for two specific things (protects you legally):
  - [ ] **Authorization to send SMS on their behalf** (you'll register their brand for A2P 10DLC).
  - [ ] **Business legal info for 10DLC**: legal business name, EIN, business address, website, support email. *(You cannot register 10DLC without these — collect them here, not later.)*
- [ ] Collect the **intake sheet** (Step 2).
- [ ] Take the **setup fee payment now** before provisioning anything.

---

## STEP 2 — Client gives access (intake) ⏱20 min 🔵
Collect exactly these. Everything downstream is filled from this list:

| Field | Acme HVAC example |
|---|---|
| Legal business name + EIN | Acme HVAC LLC / 88-1234567 |
| Business address + website | 123 Main St, Phoenix AZ / acmehvac.com |
| Owner name | Mike |
| **Owner real cell** (where calls forward + alerts go) | +14805551234 |
| Owner alert email | mike@acmehvac.com |
| Service area | Phoenix metro |
| Booking link (or "none") | acmehvac.com/book |
| Business hours (for quiet-hours) | Mon–Sat 7a–7p |
| **Do they want a new number or to forward their existing line?** | New tracking number |

⚠ **You do NOT need their phone carrier password.** Two valid setups:
- **(A) New tracking number (recommended for tomorrow):** put a Twilio number on their Google Business Profile / ads. No carrier porting, live immediately.
- **(B) Forward their existing line:** client (or their carrier) sets **conditional call forwarding on no-answer/busy** to your Twilio number — they dial a carrier code or call support. Slower, needs client action.

For a client going live tomorrow, **use (A).**

---

## STEP 3 — System installation (n8n) ⏱30 min 🟢
1. [ ] In n8n: **Workflows → Import from File** → import `workflow-1-missed-call-recovery.json`.
2. [ ] Import `workflow-2-followup-scheduler.json`.
3. [ ] **Credentials → New** and create all four (you'll attach them in later steps):
   - `P&P Twilio` (twilioApi) · `P&P OpenAI` (openAiApi) · `P&P Google Sheets` (googleSheetsOAuth2Api) · `P&P Gmail` (gmailOAuth2)
4. [ ] Set **Variables** (n8n Cloud: Settings → Variables; self-hosted: env) from `.env.example` — fill with Acme's intake values. Critical ones: `BUSINESS_NAME`, `BUSINESS_INDUSTRY="HVAC"`, `BUSINESS_SERVICE_AREA`, `OWNER_EMAIL`, `BOOKING_LINK`, `TWILIO_NUMBER`, `GSHEET_LEADS_ID`, `MAX_FOLLOW_UPS=2`, `FOLLOW_UP_GAP_MIN=1440`, `FIRST_FOLLOW_UP_MIN=30`.
5. [ ] Open WF1 → click each node with a ⚠ credential warning → pick the matching credential from Step 3.3.
6. ⚠ On the **Qualify Lead (AI)** node, confirm it's the OpenAI node your instance has. If only the legacy `n8n-nodes-base.openAi` exists, replace the node and paste the prompt from `ai-prompts.md`.
7. [ ] **Copy the WF1 webhook Production URL** (click the Webhook node → Production URL). You need it for Step 4. It looks like `https://acme.app.n8n.cloud/webhook/missed-call-recovery`.

---

## STEP 4 — Twilio setup ⏱40 min + carrier wait 🟢

### 4A — Buy the number (5 min)
- [ ] Twilio Console → **Phone Numbers → Buy a Number** → local Phoenix (480/602/623) area code → must have **Voice + SMS** capability → Buy.
- [ ] Put this number in `TWILIO_NUMBER` (n8n Variables) — E.164, e.g. `+14805550000`.

### 4B — Voice config (10 min)
- [ ] Console → **TwiML Bins → Create new**. Paste `twilio-missed-call.twiml.xml`, replacing:
  - `{{OWNER_CELL_E164}}` → `+14805551234`
  - `{{TWILIO_NUMBER_E164}}` → the number from 4A
  - `{{N8N_WEBHOOK_URL}}` → the WF1 Production URL from Step 3.7
- [ ] Save the Bin.
- [ ] Console → **Phone Numbers → [your number] → Voice → "A Call Comes In"** → set to **TwiML Bin** → select the Bin → Save.

### 4C — Messaging config (5 min)
- [ ] Same number page → **Messaging → "A Message Comes In"** → **Webhook** → paste the **same** WF1 Production URL → method **POST** → Save.

### 4D — A2P 10DLC registration (20 min of work, then carrier wait) ⚠ **DO THIS FIRST, RIGHT AFTER STEP 1**
- [ ] Console → **Messaging → Regulatory Compliance → A2P 10DLC** → register **Brand** (uses Acme's legal name + EIN from intake) → register a **Campaign** (use case: *Customer Care / Conversational*; sample messages: your missed-call + follow-up texts).
- ⚠ **Reality check for "tomorrow":** Sole-proprietor/low-volume brands often approve in **minutes–hours**; standard brands can take **1–3 business days**. Until the campaign is **Approved**, US carriers may filter or block texts. **Voice forwarding works immediately**; SMS is the part gated by 10DLC. If approval is pending at go-live, you can demo end-to-end using **your own already-registered number/sub-account** and cut over to Acme's once approved.

---

## STEP 5 — Google Sheets setup ⏱10 min 🟢
1. [ ] Create a new Google Sheet named **"Acme HVAC — Leads"**.
2. [ ] **File → Import →** upload `leads-sheet-header.csv` → **Replace current sheet** → this lays down the exact header row in the right order.
3. [ ] Rename the tab to exactly **`Leads`** (case-sensitive — the workflow looks for `Leads`).
4. [ ] Copy the spreadsheet **ID** from the URL (`/d/<THIS_PART>/edit`) → paste into `GSHEET_LEADS_ID` in n8n Variables.
5. [ ] Make sure the Google account behind `P&P Google Sheets` credential has **edit access** to this sheet.
6. ⚠ Don't reorder or rename columns — `appendOrUpdate` matches on the `Customer_Phone` header by name.

---

## STEP 6 — OpenAI setup ⏱10 min 🟢
1. [ ] platform.openai.com → **API Keys → Create** → name it `pnp-acme-hvac` → copy the `sk-...` key.
2. [ ] Paste into the `P&P OpenAI` credential in n8n.
3. [ ] Set a **usage limit / budget alert** on the OpenAI project (e.g. $20/mo hard cap) — pennies per lead, but cap it so a loop can't run up a bill.
4. [ ] Confirm `OPENAI_MODEL=gpt-4o-mini` (cheap + plenty for qualification).
5. [ ] In WF1's **Qualify Lead (AI)** node, confirm **JSON mode** is on and the system prompt reflects HVAC (it pulls `BUSINESS_INDUSTRY` automatically; optionally paste the HVAC tone line from `ai-prompts.md`).

---

## STEP 7 — Testing (run the full `checklists.md` test list) ⏱30 min 🟢
Do these in order, from your own phone, **before** the client touches it:

1. [ ] **Missed call:** call the Twilio number, let it ring past 20s without Mike answering. → First SMS should arrive on your phone within ~10s, and a new row should appear in `Leads` (Status `Contacted - Awaiting Reply`).
2. [ ] **Reply / qualify:** text back *"My AC stopped cooling, can someone come today?"* → within seconds you should get an AI reply, Mike should get a Gmail alert tagged urgency **high/emergency**, and the row should fill `AI_Intent`, `Qualified=true`, `Lead_Score`.
3. [ ] **Dedup:** text again from the same number → it updates the **same row**, no duplicate.
4. [ ] **STOP:** text `STOP` → no further messages (Twilio enforces; confirm no error in n8n).
5. [ ] **Spam:** text *"wrong number lol"* → `Qualified=false`, no booking link leaked.
6. [ ] **Answered call (negative test):** call and have Mike answer within 20s → **no** text should send (DialCallStatus=completed hits the switch fallback).
7. [ ] **Follow-up:** leave a test lead un-replied; temporarily set `FIRST_FOLLOW_UP_MIN=1` and activate WF2 → confirm follow-up #1 fires, then reset to 30.
8. [ ] **Failure mode:** put a bad OpenAI key in briefly → confirm the fallback canned reply still sends and the lead still logs. Restore the key.
9. [ ] Check **n8n Executions** — all green, no silent fails.

---

## STEP 8 — Go-live ⏱15 min 🟢🔵
1. [ ] Confirm **A2P 10DLC = Approved** (Step 4D). If still pending, keep SMS on your registered fallback number and cut over later.
2. [ ] Set **both workflows to `Active`** (toggle top-right in n8n).
3. [ ] Enable a **global error workflow** in n8n settings so failed executions ping you.
4. [ ] Put the **Twilio number live** where leads will see it: client's Google Business Profile primary/secondary number, website click-to-call, and ad campaigns. *(This is the client's action — guide Mike through it on a screen-share.)*
5. [ ] Send Mike a **1-page "how to read your leads" guide** (what each Status means, where the Sheet is, that hot leads also hit his email).
6. [ ] Do **one real live test call** with Mike watching, so he sees a lead land in his inbox + Sheet.
7. [ ] Calendar: **48-hour check-in** and **7-day review** of the `Leads` tab together.
8. [ ] Log Acme's config (number, sheet ID, credential names) in your master client tracker.

---

## Fastest critical path if the client is literally tomorrow
1. **Right now:** sign + collect EIN/legal info → **start A2P 10DLC (Step 4D)** so the carrier clock runs overnight.
2. **Tonight:** Steps 3, 5, 6 (n8n import, Sheet, OpenAI) — ~50 min, no waiting.
3. **Tomorrow AM:** Steps 4A–4C (buy number, voice + messaging config) — 20 min.
4. **Tomorrow:** Step 7 testing. If 10DLC approved → Step 8 go-live. If not → go live on **voice + your fallback SMS number**, swap Acme's number in once approved (a 2-minute change).

## The one thing that can still block you tomorrow
**A2P 10DLC approval timing** — it's the only step outside your control. Everything else you can finish in an evening. Mitigation: register immediately, and have a pre-approved Twilio sub-account/number you can route SMS through for day-one if Acme's brand is still pending.
