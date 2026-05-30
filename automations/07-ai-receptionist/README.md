# Automation #07 — AI Receptionist (24/7 Voice + Chat)
**Preset & Profit · Client-Ready Build · ⭐ Flagship**

A 24/7 AI voice + web-chat receptionist that answers, qualifies, books onto the real calendar, captures messages, and escalates genuine emergencies to a human — so no call or chat is ever missed again. A **voice layer** (Vapi/Retell) runs the conversation; an **n8n backend** is the brain that does the work and logs every outcome. This is the catalog's premium flagship and the natural upgrade from #01 Missed Call Recovery.

> Files: `workflow-1-receptionist-backend.json` · `voice-agent-config.json` · `.env.example` · `google-sheets-structure.md` · `ai-prompts.md` · `checklists.md` · `IMPLEMENTATION-PLAYBOOK.md`

---

## 1. Business Objective
Most local businesses lose calls after hours, during rushes, and on jobs — and those callers go straight to a competitor. A human receptionist costs $2,500–4,000/mo loaded and still doesn't cover nights and weekends. **Objective:** answer every call and chat 24/7 with a warm, professional AI that books real appointments, takes messages, and gets emergencies to a human instantly — capturing after-hours emergency jobs ($300–$1,000 each) and freeing staff from the phone. Start as after-hours/overflow, expand as trust grows.

## 2. Workflow Architecture
```
Caller ─▶ Twilio/SIP number ─▶ Voice layer (Vapi/Retell: speech + LLM + voice)
Web visitor ─▶ chat widget ──────────────────────────────────┐
                                                              ▼
                        tool calls / chat / end-of-call ─▶ n8n Backend Webhook (WF1)
                                                              │ Route Action (switch)
   check_availability ─▶ read calendar ─▶ compute open slots ─▶ respond slots
   book_appointment   ─▶ create calendar event ─▶ log Bookings ─▶ email owner ─▶ respond
   capture_lead       ─▶ log Leads ─▶ respond
   escalate_emergency ─▶ owner SMS + email ─▶ log Escalations ─▶ respond (transfer?)
   end_of_call        ─▶ log Calls (summary/transcript/recording) ─▶ respond
   chat_message       ─▶ Chat AI (JSON) ─▶ log Calls ─▶ escalate? ─▶ respond {reply}
```
The voice layer owns the *conversation*; n8n owns *availability, booking, escalation, and the record*. One webhook, routed by tool name, returns provider-correct JSON synchronously.

## 3. n8n Node-by-Node Build Plan
**WF1 — Receptionist Backend (27 nodes)**
1. **Backend Webhook** → 2. **Normalize Request** (Code: unify Vapi tool-calls / end-of-call report / web-chat into `{action,args,tool_call_id,channel}`) → 3. **Route Action** (switch, 6 tools + fallback).
- *check_availability:* 4. **Day Bounds** (Code) → 5. **Get Calendar Events** (Google Calendar) → 6. **Compute Open Slots** (Code).
- *book_appointment:* 7. **Prep Booking** (Code) → 8. **Create Calendar Event** → 9. **Log Booking** (Sheets) → 10. **Notify Owner (Booking)** (Gmail) → 11. **Build Booking Result**.
- *capture_lead:* 12. **Log Lead** → 13. **Build Lead Result**.
- *escalate_emergency:* 14. **Alert Owner SMS** (Twilio) → 15. **Alert Owner Email** (Gmail) → 16. **Log Escalation** → 17. **Build Escalation Result** (with `transfer_to`).
- *end_of_call:* 18. **Log Call** → 19. **Build Call Result**.
- *chat_message:* 20. **Chat AI** (OpenAI JSON) → 21. **Parse Chat** (Code) → 22. **Log Chat** → 23. **Chat Escalate?** (IF) → 24. **Alert Owner (Chat)** → 25. **Build Chat Result**.
- *fallback:* 26. **Build Fallback Result**.
- All branches converge on 27. **Respond to Agent** (returns Vapi `{results:[{toolCallId,result}]}` for tool calls, `{result}` for chat).

**Voice layer — `voice-agent-config.json`** (Vapi schema): persona, voice (ElevenLabs), transcriber (Deepgram), and the four function tools all pointed at the Backend Webhook.

## 4. Exact Integrations
| Integration | Use | n8n credential |
|---|---|---|
| **Voice layer (Vapi/Retell)** | Speech, telephony, live LLM conversation | (own keys) |
| **Twilio / SIP** | Phone number + owner emergency SMS | `twilioApi` |
| **Google Calendar** | Availability + real bookings | `googleCalendarOAuth2Api` |
| **Google Sheets** | Calls / Bookings / Leads / Escalations log | `googleSheetsOAuth2Api` |
| **OpenAI** | Web-chat brain (voice layer uses its own model) | `openAiApi` |
| **Gmail** | Owner booking + emergency alerts | `gmailOAuth2` |
| **n8n** | Backend tool router + record-keeper | — |

## 5. Environment Variables / API Keys
See `.env.example`. Booking rules: `SLOT_MINUTES`, `BOOKING_LEAD_MIN`, `BUSINESS_HOURS_START/END`, `MAX_SLOTS_OFFERED`, `TIMEZONE`. Escalation: `EMERGENCY_KEYWORDS`, `OWNER_PHONE`, `FORWARD_NUMBER`. Voice: `N8N_WEBHOOK_URL`, `VAPI_API_KEY`, `ELEVENLABS_VOICE_ID`. ⚠ **Set the n8n timezone and `TIMEZONE`.**

## 6. Database Structure
See `google-sheets-structure.md`. Four tabs — **`Calls`**, **`Bookings`**, **`Leads`**, **`Escalations`** — plus the client's **Google Calendar** as the booking source of truth. Each backend tool writes exactly one place; `Calendar_Event_ID` links a `Bookings` row to its calendar event.

## 7. Error Handling
- Webhook uses `responseNode` so every tool call gets a synchronous, provider-correct JSON reply.
- `continueOnFail` on calendar create, all Gmail/Twilio sends — a failed alert/booking still returns a sane reply instead of hanging the call.
- Web-chat AI has a safe fallback (generic helpful reply) on parse failure.
- Unknown actions hit the fallback branch and get a graceful "could you rephrase / take a message" reply.
- `alwaysOutputData` on the calendar read so an empty day still computes slots.

## 8. Duplicate Prevention
- Bookings carry a generated `Booking_ID` and the `Calendar_Event_ID`; the lead-time + busy-slot check prevents offering an already-taken time, so double-booking is avoided at the source.
- Logs are append-only by design (each call/lead/escalation is a distinct event).

## 9. Retry Logic
- Retry-On-Fail on Calendar/Sheets/Gmail nodes.
- The voice layer retries/falls back on its side (e.g. transfer) if the backend is briefly unavailable; emergencies always have the owner-SMS path.

## 10. AI Prompts
See `ai-prompts.md`. One persona drives both the voice agent (in `voice-agent-config.json`) and the web-chat node. The agent **never invents** availability or prices — it calls `check_availability`/`book_appointment` for anything real. Tool-response formatting and escalation are done in code, not trusted to the model.

## 11–13. Setup / Testing / Deployment
See `checklists.md`. Key practices: confirm **recording/AI-disclosure** law, test the **emergency path** on real phones, set the **timezone**, go live as **after-hours/overflow first**, and run a **shadow week** reading every transcript before the AI owns the line.

## 14. Pricing / Package Recommendation
| Package | Price | Includes |
|---|---|---|
| **Setup** | **$1,500–3,000** | Voice + chat agent build, persona/FAQ tuning, calendar + sheet wiring, dry-run calls |
| **Monthly** ⭐ | **$797–1,500** (usage-aware) | 24/7 answering, booking, escalation, logging, support, transcript reviews |
| **Anchor/upsell** | from #01 | Sell Missed Call Recovery first, then upgrade the busy/after-hours shop to the full receptionist |

ROI pitch: "It answers every call day and night, books jobs straight onto your calendar, and texts you the second there's an emergency — for a fraction of a full-time receptionist." Voice minutes are the real cost, so price the monthly to the client's volume.

## 15. Upgrade Opportunities
Calendly/Acuity/Jobber/ServiceTitan booking instead of raw Google Calendar · live warm-transfer to staff during hours · SMS confirmation + #04 reminder sequence on every booking · multi-language · CRM write-back (HubSpot/GHL) · outbound callbacks for missed web leads · per-agent analytics dashboard from the `Calls` log · payment/deposit collection on booking (Stripe) · spam/robocall screening.

---
**Status: ✅ Built & importable.** Backend WF1 27 nodes, valid JSON, version-safe `new Date()`/`$now` math (no `$DateTime`); switch routes 6 tools + fallback, all converging on one provider-correct Respond node. `voice-agent-config.json` is valid Vapi schema. **Not run against a live stack** — the go-live gate is your own test calls. Honest caveats: this is a **3–5 day flagship**, not a half-day install; the **voice layer (Vapi/Retell) is a separate paid service** with its own keys and pricing — voice minutes are the dominant cost, so price the monthly to volume; **confirm the Google Calendar nodes' field mapping on import** (calendar APIs vary by n8n version); and **recording/AI-disclosure compliance is the client's legal responsibility** — verify state law before the line is live.
