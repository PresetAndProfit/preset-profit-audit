# Automation #07 — AI Receptionist (24/7 Voice + Chat)
**Status: 🟡 Scaffolded — not yet built** · [← Master Catalog](../MASTER-CATALOG.md)

## Catalog entry
- **Problem solved:** No one answers after-hours or overflow calls/chats. An AI voice + web-chat agent answers, qualifies, books appointments, and escalates emergencies to a human.
- **Ideal customer:** Businesses losing after-hours/overflow calls — HVAC, plumbing, dental, real estate, high-volume restaurants.
- **Setup fee:** $1,500–3,000 (flagship) · **Monthly fee:** $797–1,500
- **ROI:** Replaces/augments a receptionist ($2,500–4,000/mo loaded) and captures after-hours emergency jobs worth $300–$1,000 each — 3–5x for busy shops; strong upsell anchor from #01.
- **Required integrations:** n8n, Twilio Voice + a voice-AI layer (Vapi/Retell/ElevenLabs), OpenAI, calendar, Google Sheets/CRM, Gmail.
- **Estimated implementation time:** 3–5 days.

## Build template (to complete)
1. Business objective · 2. Workflow architecture · 3. n8n node-by-node build · 4. Exact integrations · 5. Env vars / API keys · 6. Database / Sheets structure · 7. Error handling · 8. Duplicate prevention · 9. Retry logic · 10. AI prompts (voice persona + booking logic) · 11. Client setup checklist · 12. Testing checklist · 13. Deployment checklist · 14. Pricing / package · 15. Upgrade opportunities

> Note: this is the catalog's premium flagship and the natural upgrade path from #01 Missed Call Recovery. Voice layer (Vapi/Retell) handles speech; n8n handles booking, logging, escalation.

### Planned files
- `workflow-1-receptionist-backend.json` · `voice-agent-config.json` · `.env.example` · `google-sheets-structure.md` · `ai-prompts.md` · `checklists.md` · `IMPLEMENTATION-PLAYBOOK.md`
