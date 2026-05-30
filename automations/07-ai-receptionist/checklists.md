# Checklists — AI Receptionist (Voice + Chat)

## ⚠ Pre-flight (read first)
This is the catalog's flagship and the most moving parts. It touches **live phone calls**, so quality and honesty matter more than anywhere else.
- [ ] The agent **never invents** prices, availability, or promises — verify in testing.
- [ ] Emergencies reliably reach a human (owner SMS + email, optional live transfer).
- [ ] Call **recording/AI-disclosure** complies with the client's state law (some require announcing recording / that callers are speaking with an AI). Add a disclosure line to `firstMessage` where required.
- [ ] A clean **human fallback** exists (transfer or "we'll call you right back") for anything the agent can't handle.
- [ ] Timezone (`TIMEZONE` + n8n timezone) matches the client — slot math depends on it.

## 11. Client Setup Checklist (~3–5 days, mostly voice tuning + dry runs)
- [ ] Collect: business name, industry, service area, **exact hours**, owner email + **on-call cell**, services offered, common FAQs, emergency definition, booking rules (slot length, lead time).
- [ ] Decide call routing: dedicated AI number, or after-hours/overflow forward from the main line.
- [ ] Provision the **voice layer** (Vapi or Retell) + a voice (ElevenLabs) + transcriber (Deepgram).
- [ ] Provision Twilio number (or SIP) connected to the voice layer; set `TWILIO_NUMBER`, `OWNER_PHONE`, `FORWARD_NUMBER`.
- [ ] Create the Google Sheet with tabs `Calls`, `Bookings`, `Leads`, `Escalations`; ID → `GSHEET_RECEPTIONIST_ID`.
- [ ] Choose/clear the Google **Calendar**; ID → `GOOGLE_CALENDAR_ID`.
- [ ] Import `workflow-1-receptionist-backend.json`; map the 5 credentials; copy the **Backend Webhook Production URL**.
- [ ] Fill `voice-agent-config.json` placeholders (set every tool `server.url` **and** `serverUrl` to that webhook URL); create the assistant in the voice layer.
- [ ] Set env vars from `.env.example` and the **n8n timezone**.
- [ ] Optional: drop the web-chat widget on the site, POSTing `{channel:'chat', action:'chat_message', message, history}` to the webhook.

## 12. Testing Checklist (call it yourself, many times)
- [ ] Call the number → agent greets with the business name and offers help.
- [ ] Ask "what are your hours / do you do X?" → accurate, no invented specifics.
- [ ] Ask to book → agent calls `check_availability`, reads back only real open slots, confirms a time, calls `book_appointment` → **event appears on the calendar** + a `Bookings` row + owner email.
- [ ] Try to book a slot that's already busy → it's not offered.
- [ ] Decline to book / no preference → agent calls `capture_lead` → `Leads` row written.
- [ ] Say an **emergency** phrase → agent reassures, calls `escalate_emergency` → owner gets **SMS + email**, `Escalations` row written, (transfer if `FORWARD_NUMBER` set).
- [ ] Hang up → **end-of-call report** writes a `Calls` row with summary/transcript/recording.
- [ ] Web chat: send a message → `{result}` reply returns; emergency message triggers the owner email; `Calls` row with `Channel=chat`.
- [ ] Garbage / silence / off-topic → graceful fallback, never a hallucinated answer.
- [ ] Confirm tool responses come back fast enough that the agent doesn't stall (watch n8n execution time).

## 13. Deployment Checklist
- [ ] Recording/AI disclosure compliant for the client's state; disclosure added if required.
- [ ] Emergency path tested end-to-end on real devices.
- [ ] Point the client's number (or after-hours forward) at the voice assistant.
- [ ] Activate `workflow-1-receptionist-backend`.
- [ ] **Shadow period:** run alongside the human/voicemail for a few days; review every `Calls` transcript daily and tune the persona/FAQs.
- [ ] Set spend alerts on the voice layer + OpenAI; confirm the monthly fee covers expected minutes.
- [ ] Weekly report: calls handled, booked, leads captured, emergencies escalated, after-hours saves.
- [ ] Enable the global error workflow + logging.
