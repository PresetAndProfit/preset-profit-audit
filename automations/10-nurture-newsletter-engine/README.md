# Automation #10 — Long-Term Nurture & Newsletter Engine
**Preset & Profit · Client-Ready Build**

Keeps a business top-of-mind with the people who already know them — automatically. Captures past customers and not-yet-ready leads from any source, then sends **AI-generated, seasonally-relevant value touches** (a maintenance tip, a seasonal reminder, a helpful nudge) on a long, respectful cadence over SMS + email. When a nurtured contact replies with intent, it **classifies the reply, pauses the drip, and hands the owner a hot lead** — never salesy, never inventing prices or discounts, always one tap from opting out.

> Files: `workflow-1-contact-capture.json` · `workflow-2-nurture-scheduler.json` · `.env.example` · `google-sheets-structure.md` · `ai-prompts.md` · `checklists.md` · `IMPLEMENTATION-PLAYBOOK.md`

---

## 1. Business Objective
Every business has a list of past customers and cold leads doing nothing. The ones not ready today get forgotten — and go to a competitor when the need returns. **Objective:** stay top-of-mind with that entire list through genuinely useful, seasonally-timed touches, so repeat and seasonal work (HVAC tune-ups, dental recall, real-estate check-ins, salon rebookings) comes back to the client instead of the competition — and surface the moment any contact re-engages so the owner can book them. The list is already paid for; this turns it into a recurring revenue engine.

## 2. Workflow Architecture
```
Contact source (CRM/Jobber/ServiceTitan/HCP/GHL/Job/Lead/Sheet) ─▶ webhook ─▶ WF1

WF1 intake (webhook) routes 2 event types:
  New contact ─▶ normalize (multi-source) ─▶ dedup on Contact_ID ─▶ Contacts sheet (first touch scheduled)
  SMS reply   ─▶ STOP? ─┬─ yes ─▶ suppress (Opted_Out + Opt_Outs)
                        └─ no  ─▶ AI classify ─▶ reply ─▶ hot? pause + alert owner · else keep nurturing

WF2 nurture scheduler (every 3 h, business hours):
  read ─▶ filter [active, not opted-out, due, under daily+frequency cap, under MAX_TOUCHES] ─▶ loop
       ─▶ AI generate seasonal content ─▶ finalize (cap + append STOP/identity, safe fallback)
       ─▶ route channel ─▶ send SMS/Email ─▶ log touch ─▶ advance count + next due ─▶ next
```
**WF1** is the always-on intake for new contacts and replies. **WF2** is the metered cron that writes + sends each touch and advances the cadence, stopping itself on opt-out, re-engagement, or `MAX_TOUCHES`.

## 3. n8n Node-by-Node Build Plan
**WF1 — Contact Capture & Intake (20 nodes):** Contact Intake Webhook → Respond → Route Event (SMS Reply / New Contact). *New:* Normalize Contact (Code: multi-source map, E.164 phone, stable `Contact_ID`, first-touch schedule) → Find Existing → Is New? → Log New Contact → Record Status; existing → Update Existing (re-sync name/email/segment/last-service). *Reply:* Normalize Reply → Is Opt-Out? → Suppress + Log Opt-Out, or Find Contact → Classify Reply (AI) → Parse Reply (Code: class→status, pause-on-hot, suppress-on-unsubscribe, alert flag, safe fallback) → Send AI Reply → Update Contact → Owner Alert Needed? → Alert Owner (Re-Engaged).

**WF2 — Nurture Scheduler (11 nodes):** Every 3 h → Read Contacts → **Find Due Touches** (Code: business-hours gate, daily cap, frequency cap, skip opted-out/inactive/terminal, `MAX_TOUCHES` check, due check, channel rotation, **month/season detection**, content brief) → Loop → **Generate Content (AI)** (seasonal value copy as JSON) → **Finalize Content** (Code: parse, cap length, append STOP + identity, safe fallback) → Route Channel → Send Email / Send SMS → Log Touch → Update Sequence State (advance `Touch_Count` + `Next_Touch_At`).

## 4. Exact Integrations
| Integration | Use | n8n credential |
|---|---|---|
| **Google Sheets** | Contacts state + 3 log/ledger tabs | `googleSheetsOAuth2Api` |
| **Twilio** | Nurture SMS, inbound replies, STOP, owner SMS | `twilioApi` |
| **OpenAI** | **Content generation** (touches) + reply classification | `openAiApi` |
| **Gmail** | Email touches + owner alerts | `gmailOAuth2` |
| **n8n** | Webhook intake + cron scheduler | — |
| **Contact source** | CRM / Jobber / ServiceTitan / Housecall Pro / GoHighLevel / export | — |

## 5. Environment Variables / API Keys
See `.env.example`. Cadence: `NURTURE_INTERVAL_DAYS` (30), `NURTURE_FIRST_TOUCH_DAYS` (3), `NURTURE_CHANNELS`, `MAX_TOUCHES` (`0` = evergreen), `FREQUENCY_CAP_DAYS`. Identity steers content: `BUSINESS_INDUSTRY` + per-contact `Segment`. Pacing: `DAILY_CAP`, `BUSINESS_HOURS_START/END`. ⚠ **Set the n8n timezone** (hours gate + season detection + cadence depend on it).

## 6. Database Structure
See `google-sheets-structure.md`. Four core tabs — **`Contacts`** (state), **`Touch_Log`**, **`Opt_Outs`**, **`Status_History`** (+ optional **`Engagements`**). Match keys: `Contact_ID` (capture), `Customer_Phone` (replies). Touches are paced off **`Next_Touch_At`** + **`Last_Touch_At`**; the sequence stops on `Opted_Out`, re-engagement, `Sequence_Active=No`, or `MAX_TOUCHES`.

## 7. Error Handling
- WF1 responds to the source first; downstream is async.
- **Opt-out is checked first, deterministically** (regex) before any AI or send.
- Both AI calls have safe fallbacks — a bad content response sends a neutral seasonal template; a bad classifier response defaults to a benign "team will follow up" reply.
- `continueOnFail` on every Twilio/Gmail send.
- Unknown / empty lookups handled via `alwaysOutputData` + new-vs-existing checks.

## 8. Duplicate Prevention
- Capture dedupes on **`Contact_ID`** (source id, else `C-phone`, else `C-email`): a re-sent contact **updates** its row.
- `appendOrUpdate` keyed on `Contact_ID`/`Customer_Phone` → one row per contact.
- WF2 advances `Touch_Count` + `Next_Touch_At` atomically, and the **frequency cap** blocks any second touch inside `FREQUENCY_CAP_DAYS` → no double-sends.

## 9. Retry Logic
- Retry-On-Fail on Twilio/Sheets/Gmail.
- The cron is self-healing: a due-but-unsent touch is picked up next run (until the cap).
- Daily cap + frequency cap + business-hours pacing protect carrier standing and prevent nurture fatigue.

## 10. AI Prompts (content generation + classification)
See `ai-prompts.md`. **The outbound touches are AI-written** (one call per touch, JSON mode) from the industry + segment + computed month/season — so copy stays fresh and seasonally relevant without a human. A second call classifies replies (BOOK/INTERESTED/QUESTION/NOT_NOW/UNSUBSCRIBE/GENERAL). **Length caps, the appended STOP/identity line, pause/stop logic, and "no fabricated prices/discounts/guarantees" are enforced in code, not the prompt** — the prompt is also instructed accordingly. ~a few cents per contact per month.

## 11–13. Setup / Testing / Deployment
See `checklists.md` — opens with a compliance gate. Key practices: nurture **only real past customers / opted-in leads**, **A2P 10DLC approved before sending**, **review a sample of AI-generated copy** before go-live, keep the cadence long, set the timezone, drip the list in under a conservative daily cap, test on your own phones/inbox only.

## 14. Pricing / Package Recommendation
| Package | Price | Includes |
|---|---|---|
| **Setup** | **$750–1,000** | Source/list integration, segment + cadence config, content review, both workflows, testing |
| **Monthly** ⭐ | **$347/mo** | Always-on AI nurture, reply handling, hot-lead alerts, support |
| **Bundle** | with #05 / #03 / #08 | The "growth flywheel": **#05 Database Reactivation** wakes the list, this keeps it warm forever, **#03 Reviews** + **#08 Referrals** compound the relationships |

ROI pitch: "Your past-customer list quietly books repeat and seasonal work for you — useful, on-brand messages every month, and the second someone's ready, it pings you with the lead."

## 15. Upgrade Opportunities
True broadcast/newsletter campaigns (one themed send to a whole segment on a date) · holiday/birthday/service-anniversary triggers · per-segment content templates and A/B subject testing · image/MMS + branded HTML email (move email to SendGrid/Mailgun for deliverability + open/click tracking) · open/click engagement scoring that shortens the cadence for warm contacts · auto-suppress contacts who re-enter an active job/quote pipeline · a self-serve preference center (cadence + topics) · monthly "reactivation report" of nurture-sourced booked revenue.

---
**Status: ✅ Built & importable.** WF1 20 nodes, WF2 11 nodes, both valid JSON, version-safe `new Date()`/`$now` date + season math (no `$DateTime`). Compliance (STOP-first, opt-out suppression, business hours, daily + frequency caps, `MAX_TOUCHES` stop, pause-on-re-engagement, appended identity/opt-out, no-fabricated-offers) lives in **code, not the prompt**. **Not run against a live stack** — first test (your own numbers/inbox only) is the go-live gate. Honest caveats: the headline feature is **AI-written outbound copy**, so this carries more **content-quality risk** than the templated automations — **review a sample batch before go-live** and keep `BUSINESS_INDUSTRY`/`Segment` accurate (the code guarantees the STOP line, length, and no-empty-message, but tone/relevance is a setup responsibility); it also carries **TCPA/A2P + CAN-SPAM weight** as recurring marketing-adjacent messaging — nurture **only people with a prior relationship** on an **approved A2P 10DLC campaign**, keep the cadence long, and watch the opt-out rate; **timezone correctness is critical** (hours gate, season selection, and cadence all depend on it); and exotic CRM payloads may need a small tweak to the Normalize node's key lists — test with a real sample.
