# Automation #05 — Database Reactivation Campaign
**Status: 🟡 Scaffolded — not yet built** · [← Master Catalog](../MASTER-CATALOG.md)

## Catalog entry
- **Problem solved:** Every business has a list of past customers / dead leads doing nothing. This runs an AI-personalized win-back SMS/email campaign to that list.
- **Ideal customer:** Any business with 200+ past customers — HVAC (maintenance plans), dentists (recall), salons, auto repair.
- **Setup fee:** $1,000–1,500 · **Monthly fee:** $250 + optional rev-share (often a one-time campaign + retainer).
- **ROI:** Highest immediate ROI in the catalog — 2–5% response on 1,000 contacts = 20–50 conversations within days; frequently 5–15x on setup.
- **Required integrations:** n8n, customer list (CSV/CRM), Twilio, OpenAI, Gmail, Google Sheets.
- **Estimated implementation time:** 1 day.

## Build template (to complete)
1. Business objective · 2. Workflow architecture · 3. n8n node-by-node build · 4. Exact integrations · 5. Env vars / API keys · 6. Database / Sheets structure · 7. Error handling · 8. Duplicate prevention · 9. Retry logic · 10. AI prompts · 11. Client setup checklist · 12. Testing checklist · 13. Deployment checklist · 14. Pricing / package · 15. Upgrade opportunities

> ⚠ Compliance note: bulk SMS to old lists requires prior consent + A2P 10DLC; build STOP handling and consent filtering as a first-class step.

### Planned files
- `workflow-1-reactivation-blast.json` · `workflow-2-reply-handler.json` · `.env.example` · `google-sheets-structure.md` · `ai-prompts.md` · `checklists.md` · `IMPLEMENTATION-PLAYBOOK.md`
