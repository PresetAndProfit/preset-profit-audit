# Automation #02 — Lead Capture & Follow-Up Engine
**Preset & Profit · Client-Ready Build** · (catalog slot: Speed-to-Lead Web Responder)

Captures every inbound web/ad/form lead, responds by SMS **and** email within ~60 seconds, qualifies with AI, logs it, alerts the owner, holds a two-way conversation, and runs a multi-touch follow-up sequence until the lead replies or goes cold. The natural companion to Automation #01 (which handles *calls*); this handles *forms and ads*.

> Files: `workflow-1-lead-capture.json` · `workflow-2-followup-scheduler.json` · `.env.example` · `leads-sheet-header.csv` · `google-sheets-structure.md` · `ai-prompts.md` · `checklists.md` · `IMPLEMENTATION-PLAYBOOK.md`

---

## 1. Business Objective
Speed kills — or saves — the deal. Industry lead-response research shows contacting a web lead **within 5 minutes** makes it ~21x more likely to qualify than at 30 minutes, yet most local businesses reply in hours (or never, after hours). Meanwhile they're paying for those leads via Google/Facebook ads.

**Objective:** sub-60-second first contact on every form/ad lead, AI qualification, instant owner alert on hot leads, and a persistent multi-touch sequence so no paid lead is ever dropped. Target: lift lead-to-conversation rate **2–4x** on leads the business already pays to generate.

## 2. Workflow Architecture
```
Website form ─┐
Facebook/IG  ─┤
Google LSA   ─┼─▶ n8n Webhook (/lead-capture) ─┬─ New Lead ─▶ normalize source ─▶ dedup ─▶ AI qualify+draft
Typeform/etc ─┘                                 │                                            ├─▶ instant SMS
                                                │                                            ├─▶ instant email
Lead texts back ─▶ Twilio SMS ──────────────────┴─ SMS Reply ─▶ find lead ─▶ AI qualify     ├─▶ log lead
                                                                   ├─▶ update sheet           └─▶ notify owner
                                                                   ├─▶ notify owner
                                                                   └─▶ AI reply SMS

Cron (15 min) ─▶ read leads ─▶ filter due & no-reply ─▶ route channel ─▶ SMS / Email touch ─▶ update ─▶ Cold after sequence
```
**WF1** (event-driven): one webhook serves both inbound form/ad leads and inbound SMS replies, routed by a Switch. **WF2** (time-driven): the multi-touch sequence engine.

## 3. n8n Node-by-Node Build Plan
**WF1 — Core (19 nodes)**
1. **Lead Intake Webhook** — `POST /lead-capture`.
2. **Respond to Source** — immediate `{status:received}` so forms/Twilio don't wait.
3. **Route Event** (Switch) — `MessageSid` present → SMS Reply; else → New Lead.
4. **Normalize Lead** (Code) — maps website/Facebook/Typeform/Jotform/generic payloads into one schema; basic US E.164 phone cleanup; labels `Source`.
5. **Find Existing Lead** (Sheets) — dedup by phone.
6. **Is New Lead?** (IF).
7. **Qualify + Draft (AI)** (OpenAI JSON) — qualifies **and** writes the first SMS + email in one call.
8. **Parse AI Intake** (Code) — parse + fallback.
9. **Send Instant SMS** (Twilio, continueOnFail).
10. **Send Instant Email** (Gmail, continueOnFail).
11. **Log New Lead** (Sheets append) — Status `Contacted - Awaiting Reply`, `Sequence_Step 0`, `Next_Follow_Up_At`.
12. **Notify Business** (Gmail).
13–19. **SMS Reply branch** — Normalize Reply → Find Lead → Qualify Reply (AI) → Parse → Update Lead → Notify Business (Reply) + Send AI Reply SMS (two-way conversation, same pattern as #01).

**WF2 — Sequence (8 nodes)**
1. **Every 15 min** → 2. **Read All Leads** → 3. **Filter Due Follow-Ups** (Code: not replied, step < max, due; computes channel + message per step) → 4. **Loop Leads** (batch 1) → 5. **Route Channel** (Switch sms/email) → 6/7. **Send Follow-Up SMS / Email** → 8. **Update Sequence State** (increment step, reschedule, or mark Cold).

## 4. Exact Integrations
| Integration | Use | n8n credential |
|---|---|---|
| **Lead sources** | Website form / FB Lead Ads / Typeform / Jotform / Google LSA → webhook | (webhook, no cred) |
| **Twilio** | Instant + follow-up SMS, two-way replies | `twilioApi` |
| **OpenAI** | Qualify + draft SMS/email | `openAiApi` |
| **Google Sheets** | Lead database | `googleSheetsOAuth2Api` |
| **Gmail** | Instant email to lead + owner alerts + email touches | `gmailOAuth2` |
| **n8n** | Orchestration + cron | — |
| (optional) **Calendly/Cal.com** | Booking link target | upgrade |

## 5. Environment Variables / API Keys
See `.env.example`. New vs #01: `FOLLOW_UP_GAPS_MIN` (per-step timing) and `FOLLOW_UP_CHANNELS` (per-step channel), plus `LEAD_WEBHOOK_SECRET`. Credentials live in n8n's vault.

## 6. Database Structure
See `google-sheets-structure.md` / `leads-sheet-header.csv`. Adds `Customer_Email`, `Sequence_Step`, and `Source` vs #01. `Customer_Phone` is the dedup/match key; any inbound reply halts the sequence.

## 7. Error Handling
- Webhook responds first; downstream is async.
- `continueOnFail` on instant SMS + email so one channel failing still logs the lead and sends the other.
- AI fallback in both Code nodes (canned SMS/email, lead still saved).
- Global error workflow + execution logging.
- STOP/opt-out guard (carrier-enforced; add explicit node for production).

## 8. Duplicate Prevention
- Dedup lookup before creating a lead; phone-keyed `appendOrUpdate` on replies/sequence.
- One row per phone → no double sequences, no double alerts.
- Re-submissions from the same number update the existing lead instead of spawning a new one.

## 9. Retry Logic
- Retry-On-Fail on Twilio/Sheets/Gmail nodes for transient errors.
- The sequence itself is structured retry: `MAX_FOLLOW_UPS` touches at `FOLLOW_UP_GAPS_MIN` spacing across SMS + email.
- Split-In-Batches (1) in WF2 paces sends to avoid rate spikes.

## 10. AI Prompts
See `ai-prompts.md`. Prompt 1 qualifies **and** drafts the first SMS + email in a single JSON call; Prompt 2 handles two-way replies. ~**<$0.02 per engaged lead** on `gpt-4o-mini`.

## 11–13. Setup / Testing / Deployment
See `checklists.md`. Core differentiator from #01: **lead-source integration** (wiring each form/ad platform to the webhook) and **email deliverability** (SPF/DKIM) so instant emails don't spam-folder.

## 14. Pricing / Package Recommendation
| Package | Setup | Monthly | Includes |
|---|---|---|---|
| **Starter** | $500–750 | **$297** | 1 lead source, instant SMS, AI qualify, owner alert, Sheet, SMS-only sequence |
| **Pro** ⭐ | $750–1,000 | **$397** | Multi-source capture, SMS **+ email** instant + sequence, two-way AI conversation, booking-link automation, monthly report |
| **Elite** | $1,000–1,500 | **$597+** | + CRM sync, lead-source-level reporting, A/B-tested sequences, multi-location |

**Bundle:** sell with #01 + #03 as the **"Never Lose a Lead" suite** ($1,500 setup / $897/mo) — calls + forms + reputation covered.

## 15. Upgrade Opportunities
Calendly/Cal.com auto-booking · CRM sync (HubSpot/GoHighLevel/ServiceTitan/Jobber) · lead-source ROI dashboard (which channel converts) · A/B-tested message sequences · web-chat + IG/FB DM on the same webhook · Spanish/bilingual auto-reply · Stripe deposit links · long-term nurture handoff to Automation #10.

---
**Status: ✅ Built & importable.** Same honest caveat as #01: validated as structure + parseable JSON, **not** run against a live stack — the first end-to-end test lead per source is the real gate to go-live. The biggest install variable is lead-source access (confirm at signing).
