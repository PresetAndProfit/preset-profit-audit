# Automation #06 — Estimate / Quote Follow-Up Engine
**Preset & Profit · Client-Ready Build**

Turns every estimate a service business sends into a tracked, automatically-worked deal. Captures quotes from any source (Jobber/ServiceTitan/Housecall Pro/GoHighLevel/CRM/Sheet/manual), runs a polite **multi-touch SMS + email sequence on Day 1/3/7/14/21**, uses AI to classify every reply **HOT / WARM / COLD / DECLINED**, and alerts the owner the instant a quote heats up — while stopping cleanly on accept, decline, STOP, or expiration. Most contractors never follow up past once; this closes the deals they were leaving on the table.

> Files: `workflow-1-estimate-capture.json` · `workflow-2-followup-engine.json` · `.env.example` · `quotes-sheet-header.csv` · `google-sheets-structure.md` · `ai-prompts.md` · `checklists.md` · `IMPLEMENTATION-PLAYBOOK.md`

---

## 1. Business Objective
Service businesses (HVAC, plumbing, roofing, construction, remodeling, landscaping, electricians, auto shops) send estimates and rarely follow up. The customer gets busy, the quote is forgotten, a competitor wins. **Objective:** track every estimate automatically, follow up on a proven cadence across SMS + email, recover forgotten deals, and surface the hot ones to the owner immediately — without anyone on the team having to remember. Closing even one extra mid-size job a month from follow-up alone dwarfs the fee.

## 2. Workflow Architecture
```
Estimate source (Jobber/ServiceTitan/HCP/GHL/CRM/Sheet/manual) ─▶ webhook ─▶ WF1

WF1 intake (webhook) routes 3 event types:
  New estimate ─▶ normalize (multi-source) ─▶ dedup on Quote_ID ─▶ Quotes sheet
                                                              └─ high-value? ─▶ alert owner
  Quote viewed ─▶ tally views ─▶ threshold? ─▶ alert owner
  SMS reply    ─▶ STOP? ─┬─ yes ─▶ suppress (Opted_Out)
                         └─ no  ─▶ AI classify (HOT/WARM/COLD/DECLINED) ─▶ reply
                                 ─▶ update ─▶ (hot/objection/call/won) ─▶ alert owner (email+SMS)

WF2 sequence engine (every 15 min, business hours):
  read ─▶ filter [active, not opted-out, not terminal, due, not expired, under cap] ─▶ loop
       ─▶ route channel ─▶ send SMS/Email ─▶ log touch ─▶ advance step + next due ─▶ next
       (expired ─▶ mark Expired & stop)
```
**WF1** is the always-on intake for captures, view pings, and replies. **WF2** is the metered cron drip that actually works the schedule and stops itself on terminal states.

## 3. n8n Node-by-Node Build Plan
**WF1 — Estimate Capture & Intake (27 nodes)**
1. **Estimate Intake Webhook** → 2. **Respond to Source** → 3. **Route Event** (switch: SMS Reply / Quote Viewed / fallback New Estimate).
- *New estimate:* 4. **Normalize Estimate** (Code: multi-source field mapping, E.164, amount parse, stable `Quote_ID`) → 5. **Find Existing Quote** → 6. **Is New Quote?** → new: 7. **Log New Quote** (append + Day-1 schedule) → 8. **Record Status (New)** → 9. **High-Value Quote?** → 10. **Alert Owner (High-Value)**; existing: 11. **Update Existing Quote** (re-sync amount/status/expiration).
- *SMS reply:* 12. **Normalize Reply** → 13. **Is Opt-Out?** → yes: 14. **Suppress (Opt-Out)**; no: 15. **Find Quote (Reply)** → 16. **Classify Reply (AI)** → 17. **Parse Reply** (Code: classify→status, stop flag, alert flag, fallback) → 18. **Send AI Reply** → 19. **Update Quote (Reply)** → 20. **Owner Alert Needed?** → 21/22. **Alert Owner Email + SMS (Reply)**.
- *Quote viewed:* 23. **Find Quote (View)** → 24. **Tally View** (Code) → 25. **Update Views** → 26. **Viewed Repeatedly?** → 27. **Alert Owner (Multiple Views)**.

**WF2 — Sequence Engine (10 nodes)**
1. **Every 15 min** → 2. **Read Quotes** → 3. **Find Due Follow-Ups** (Code: business-hours gate, daily cap, skip opted-out/terminal/inactive, due check, expiration guard, per-step channel + templated copy, next due date) → 4. **Loop Quotes** → 5. **Route Channel** (switch: Expired / Email / SMS) → 6. **Mark Expired** | 7. **Send Follow-Up Email** / 8. **Send Follow-Up SMS** → 9. **Log Follow-Up** → 10. **Update Sequence State**.

## 4. Exact Integrations
| Integration | Use | n8n credential |
|---|---|---|
| **Google Sheets** | Quotes state + 3 log tabs | `googleSheetsOAuth2Api` |
| **Twilio** | Outbound touches, inbound replies, STOP, owner SMS | `twilioApi` |
| **OpenAI** | Reply classification (HOT/WARM/COLD/DECLINED) | `openAiApi` |
| **Gmail** | Email touches + owner alerts | `gmailOAuth2` |
| **n8n** | Webhook intake + cron sequence engine | — |
| **Estimate source** | Jobber/ServiceTitan/Housecall Pro/GoHighLevel/CRM/Sheet (via webhook) | — |

## 5. Environment Variables / API Keys
See `.env.example`. Sequence controls: `FOLLOWUP_DAYS` (`1,3,7,14,21`), `FOLLOWUP_CHANNELS`, `HIGH_VALUE_ESTIMATE`, `VIEW_ALERT_THRESHOLD`, `DAILY_CAP`, `BUSINESS_HOURS_START/END`. ⚠ **Set the n8n timezone.**

## 6. Database Structure
See `google-sheets-structure.md` / `quotes-sheet-header.csv`. Four tabs: **`Quotes`** (live state), **`Follow_Up_Log`**, **`Status_History`**, **`Activity`**. Capture dedupes on **`Quote_ID`**; replies match on **`Customer_Phone`**. Two stop gates: **`Sequence_Active`** and **`Opted_Out`**.

## 7. Error Handling
- WF1 responds to the source first; all downstream work is async.
- **Opt-out is checked first, deterministically** (regex), before any AI or send — STOP can never be missed due to a model error.
- AI classification has a safe WARM fallback (generic reply, sequence preserved) so a bad model response never breaks the flow.
- `continueOnFail` on every Twilio/Gmail send so one bad number/address doesn't halt the batch.
- View pings for an unknown `Quote_ID` are ignored (Code returns empty).
- Global error workflow + logging recommended.

## 8. Duplicate Prevention
- Capture is keyed on **`Quote_ID`** (source's own id when available, else `phone-amount`): a re-sent estimate **updates** its row instead of creating a second.
- `appendOrUpdate` keyed on `Quote_ID`/`Customer_Phone` → one row per quote.
- WF2 advances `Sequence_Step` and `Next_Follow_Up_At` atomically, so a touch is sent **once** per step even across overlapping cron runs.

## 9. Retry Logic
- Retry-On-Fail on Twilio/Sheets/Gmail nodes.
- The cron is self-healing: a due-but-unsent quote is simply picked up next run (until the daily cap).
- Throttle is implicit (cron cadence + daily cap) — protecting carrier standing, the real failure mode for volume SMS.

## 10. AI Prompts
See `ai-prompts.md`. One classifier call per reply returns `interest` (HOT/WARM/COLD/DECLINED), `intent`, `wants_call`, `objection`, owner `summary`, and a `suggested_reply`. **Stop/alert decisions are made in code from the structured fields, not trusted to the model.** Outbound touches are templated (no per-touch AI cost). ~**under $5/mo** in AI for a busy shop.

## 11–13. Setup / Testing / Deployment
See `checklists.md` — which opens with a compliance gate. Key practices: confirm a genuine estimate relationship for every contact, **A2P 10DLC approved before sending**, set the n8n timezone, test on your own phones only, and start with a conservative daily cap.

## 14. Pricing / Package Recommendation
| Package | Price | Includes |
|---|---|---|
| **Setup** | **$600–900** | Source integration, sheet + sequence config, both workflows, testing |
| **Monthly** ⭐ | **$297/mo** | Always-on follow-up engine, reply handling, owner alerts, support |
| **Bundle** | with #01 + #02 | Folds into the "Never Lose a Lead" suite — capture → respond → follow up to close |

ROI pitch: "Every quote you send gets worked for three weeks straight, and you get pinged the second someone's ready to buy. Close one extra job a month and it's paid for many times over."

## 15. Upgrade Opportunities
AI-personalized follow-up copy per touch (mirror #05's personalizer) · two-way write-back of won/lost into the CRM · auto-booking for HOT replies (Calendly) · A/B-tested cadences and offers · automatic discount/financing nudge on price objections (owner-approved) · estimate-view tracking via email pixel / quote-link click · per-rep leaderboards from the `Follow_Up_Log` · seasonal re-quote of expired estimates (ties into Automation #10).

---
**Status: ✅ Built & importable.** WF1 27 nodes, WF2 10 nodes, both valid JSON, using `new Date()`/`$now` date math (version-safe — no `$DateTime`). **Not run against a live stack** — first end-to-end test (your own numbers only) is the go-live gate. Honest caveats: **A2P 10DLC + a real estimate relationship are required before any send**; opt-outs are sacred and suppressed permanently; **timezone correctness is critical** (due-date math + hours gate depend on it); and exotic CRM webhook payloads may need a small tweak to the Normalize node's key lists — test with a real sample from the client's tool.
