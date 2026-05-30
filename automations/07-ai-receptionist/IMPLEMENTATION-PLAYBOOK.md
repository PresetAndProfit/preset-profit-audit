# Implementation Playbook — AI Receptionist (Voice + Chat)
**Preset & Profit · zero-to-live runbook** · example client **Acme Plumbing**

Hands-on: **~3–5 days**, most of it voice tuning and dry-run calls. This is the catalog's **premium flagship** and the natural upgrade from #01 Missed Call Recovery. Architecture: a **voice layer** (Vapi/Retell) handles speech and the live conversation; **n8n** (`workflow-1-receptionist-backend`) is the backend brain — it checks the calendar, books, captures leads, escalates emergencies, and logs everything. The web-chat widget hits the same backend.

Legend: 🟢 you · 🔵 client (guided) · ⚠ gotcha

## ⚠ STEP 0 — Pre-flight
- [ ] Confirm **recording / AI disclosure** rules for the client's state; plan a disclosure line in the greeting if required.
- [ ] Agree the **emergency definition** and who/what number gets the alert + optional live transfer.
- [ ] Set expectations: a shadow period before the AI fully owns the line.

## STEP 1 — Client signs agreement 🔵🟢
- [ ] Send agreement + order form ($1,500–3,000 setup / $797–1,500/mo — usage-aware).
- [ ] Take payment. Note expected call volume to size the monthly.

## STEP 2 — Client gives access + info 🔵
- [ ] Exact hours, services, common FAQs, pricing-talk policy (usually "we'll confirm with a tech").
- [ ] Owner email + **on-call cell**; the number to publish or forward.
- [ ] Google account for Calendar + Sheets; which calendar to book into.

## STEP 3 — Build the knowledge + persona 🟢
- [ ] Fill the persona in `voice-agent-config.json` (`model.messages[0]`) and the web-chat node with the client's specifics + FAQs.
- [ ] Set `EMERGENCY_KEYWORDS`, booking rules (`SLOT_MINUTES`, `BOOKING_LEAD_MIN`, hours).

## STEP 4 — n8n backend install 🟢
1. [ ] Import `workflow-1-receptionist-backend.json`.
2. [ ] Create + attach the **5 credentials**: Google Sheets, Google Calendar, Twilio, OpenAI, Gmail.
3. ⚠ **Confirm the Google Calendar nodes' fields on import** (calendar id, start/end mapping) — calendar APIs vary by n8n version.
4. [ ] Set Variables from `.env.example`; ⚠ **set the n8n timezone** and `TIMEZONE`.
5. [ ] Copy the **Backend Webhook Production URL** → this is `N8N_WEBHOOK_URL`.

## STEP 5 — Voice layer (Vapi/Retell) 🟢
- [ ] Create the assistant from `voice-agent-config.json` (Vapi `POST /assistant`, or adapt to Retell).
- [ ] Set **every tool's `server.url`** and the assistant **`serverUrl`** to `N8N_WEBHOOK_URL`.
- [ ] Pick a voice (ElevenLabs) + transcriber (Deepgram). Set API keys in the voice layer.
- [ ] Attach a phone number (buy in the voice layer or bring the Twilio number via SIP).

## STEP 6 — Google Calendar + Sheets 🟢
- [ ] `GOOGLE_CALENDAR_ID` set; the booking calendar is shared with the credential's account.
- [ ] Create the sheet tabs `Calls`, `Bookings`, `Leads`, `Escalations`; ID → `GSHEET_RECEPTIONIST_ID`.

## STEP 7 — Telephony routing 🟢🔵
- [ ] Decide: dedicated AI number, or **after-hours/overflow forward** from the main line (the safe first step — AI only takes calls a human wouldn't).
- [ ] Configure forwarding; set `OWNER_PHONE` + `FORWARD_NUMBER`.

## STEP 8 — Web chat (optional) 🟢
- [ ] Embed a chat widget that POSTs `{channel:'chat', action:'chat_message', message, history}` to `N8N_WEBHOOK_URL` and renders the returned `result`.

## STEP 9 — Testing (call it yourself, a lot) 🟢
Run `checklists.md` §12 thoroughly: greeting, FAQs, real availability + booking onto the calendar, busy-slot avoidance, lead capture, **emergency → owner SMS+email (+transfer)**, end-of-call logging, web chat, and graceful fallback. Tune the persona between calls. **Do not put it on the client's live line until this all passes.**

## STEP 10 — Go-live (shadow first) 🟢🔵
1. [ ] Disclosure compliant; emergency path verified on real phones.
2. [ ] Start as **after-hours/overflow** so the AI only handles calls that would otherwise be missed.
3. [ ] **Shadow week:** read every transcript daily, fix FAQ gaps and tone, watch booking accuracy.
4. [ ] Expand hours/volume as confidence grows. Optionally promote to primary answer.
5. [ ] Set voice-layer + OpenAI spend alerts; confirm the monthly fee covers actual minutes.
6. [ ] Weekly report: calls handled, booked, leads, emergencies, after-hours saves.

## What can still block you
1. **Latency** — slow backend tool responses make the agent stall; keep the calendar/sheet calls quick and the n8n host responsive.
2. **Calendar node specifics** — confirm field mapping per n8n version (the one place to verify on import).
3. **Timezone** — wrong zone offers/books the wrong times. Verify with a real booking.
4. **Voice quality / interruptions** — tune voice, endpointing, and the persona's brevity; long replies feel robotic.
5. **Compliance** — recording/AI disclosure and emergency handling are not optional; get them right before the line is live.
6. **Cost drift** — voice minutes are the real cost; monitor and price the monthly accordingly.
