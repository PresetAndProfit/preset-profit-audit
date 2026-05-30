# AI Prompts — Long-Term Nurture & Newsletter Engine

This automation uses OpenAI in **two** places: (1) **content generation** for each outbound nurture touch (WF2 — the headline feature; this is what keeps the engine fresh and seasonal without a human writing copy), and (2) **reply classification** when a nurtured contact texts back (WF1). Both are JSON mode. **All compliance, stop/pause, length, and identity/opt-out guarantees live in code, not the prompt.**

## Prompt 1 — Content Generator (WF2 "Generate Content (AI)")

```
You write ONE short, friendly, value-first nurture message for {{BUSINESS_NAME}},
a {{BUSINESS_INDUSTRY}} business, to a past or prospective customer to stay
top-of-mind. It is currently {{MONTH}} ({{SEASON}}). Customer first name: {{FIRST}}.
Segment/notes: {{SEGMENT}}. Last service on file: {{LAST_SERVICE}}.

Goal: be genuinely useful and seasonally relevant (a maintenance tip, seasonal
reminder, or helpful nudge for this kind of business) — NOT a hard sell. Warmly
invite them to reach out if they need help.

Return STRICT JSON only:
{
  "topic": "2-4 word label of the content angle",
  "sms": "<=300 char friendly, helpful SMS; do NOT include any opt-out text (added automatically)",
  "email_subject": "<=60 char subject",
  "email_body": "2-4 short plain-text paragraphs, helpful and seasonal, with a soft invitation to reply or call"
}

HARD RULES: Never invent prices, discounts, percentages, dates, deadlines, or
guarantees. Never claim a specific past purchase unless the last-service note
states it. Keep it warm, concise, human. At most one emoji. No text outside the
JSON object.
```

### User message
```
Write this period's nurture touch (touch #{{TOUCH_NUMBER}}) for this {{BUSINESS_INDUSTRY}} customer.
```

The **month and season are computed in code** (from the n8n timezone) and passed in, so an HVAC client gets AC/cooling angles in summer and heating/tune-up angles in fall, a dentist gets recall nudges, a realtor gets seasonal market check-ins — all from the same prompt, driven by `BUSINESS_INDUSTRY` + `Segment`. Temperature `0.7` for variety across touches.

### What the code does after generation (the real guard)
- Parses the JSON; on any failure, swaps in a **safe seasonal fallback** message so a bad model response never sends broken/empty copy.
- **Caps the SMS** at 300 chars and **appends `" Reply STOP to opt out."`** every time.
- **Appends the business sign-off + `"Reply STOP to unsubscribe."`** to every email.
- Stamps `Topic` and advances the cadence (`Touch_Count`, `Next_Touch_At`).

## Prompt 2 — Reply Classifier (WF1 "Classify Reply (AI)")

```
You analyze a customer's SMS reply to a friendly nurture/check-in message from
{{BUSINESS_NAME}}, a {{BUSINESS_INDUSTRY}} business. Their segment/notes: {{SEGMENT}}.

Return STRICT JSON only:
{
  "class": "BOOK | INTERESTED | QUESTION | NOT_NOW | UNSUBSCRIBE | GENERAL",
  "sentiment": "positive | neutral | negative",
  "wants_service": true | false,
  "summary": "one sentence for the owner",
  "suggested_reply": "warm, helpful, 1-2 sentence SMS under 300 chars.
                      - If BOOK/INTERESTED: be enthusiastic; say the team will reach out to help/schedule.
                      - If QUESTION: answer helpfully or say the team will follow up.
                      - If NOT_NOW: be gracious; say we'll stay in touch.
                      - NEVER invent prices, discounts, dates, or guarantees."
}
No text outside the JSON object.
```

### User message
```
Customer reply: "{{MESSAGE_BODY}}"
```

### Classification → behavior (decided in code, not the model)
- **BOOK / INTERESTED** (or `wants_service`, or "call me") → status `Re-Engaged - Hot Lead` / `Re-Engaged - Interested`, **nurture pauses** (`Sequence_Active=No`), **owner alerted** to follow up and book. This is the money event — a cold contact turning into a live lead.
- **QUESTION / NOT_NOW / GENERAL** → answered warmly, **nurture continues** on the long cadence.
- **UNSUBSCRIBE** → `Opted_Out=Yes`, suppressed (backup to the deterministic STOP check).
- **STOP** → handled by a deterministic keyword check *before* the AI; never reaches the model.

## What is enforced in code, not the prompt
- **STOP/opt-out**: deterministic regex in WF1 before any AI/send → `Opted_Out=Yes` + `Opt_Outs` row.
- **Pausing** on re-engagement and **stopping** on unsubscribe are set in code from the structured fields.
- **Business identity + opt-out line** appended to every outbound message in code (never trusted to the model).
- **Frequency cap, daily cap, business hours, `MAX_TOUCHES`** all live in WF2's selection code.
- **No fabricated prices/discounts/guarantees**: instructed in both prompts; because outbound copy is AI-written, this is the one place to spot-check during onboarding — review the first batch of generated messages before going live.

## Cost
Content generation: ~**$0.002–$0.006 per touch** (gpt-4o-mini, JSON mode). Reply classification: ~**$0.002–$0.005 per reply**. At a 30-day cadence that's only a few cents per contact per month.
