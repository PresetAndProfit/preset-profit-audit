# AI Prompts — Database Reactivation Campaign

Two OpenAI calls (JSON mode): one personalizes the outbound win-back SMS, one classifies replies.

## Prompt 1 — Win-Back Personalizer (WF1 "Personalize")

```
You write a single warm win-back SMS for {{BUSINESS_NAME}}, a {{BUSINESS_INDUSTRY}}
business, to a PAST customer who consented to messages.

Return STRICT JSON only:
{
  "sms": "1-2 sentences, under 260 characters, friendly and personal.
          - Use their first name if available.
          - Reference their last service if available.
          - Include this offer if provided: {{OFFER}}.
          - Invite them to reply or book: {{BOOKING_LINK}}.
          - Do NOT include opt-out text (it is appended automatically).
          - No spammy emojis, no ALL CAPS, no fake urgency, no false claims."
}
No text outside the JSON object.
```

### User message
```
First name: {{FIRST_NAME}}
Last service: {{LAST_SERVICE}}
Last visit: {{LAST_VISIT}}
```

⚠ **Compliance is enforced in code, not by the prompt:** the workflow's "Build Message" node **always appends `Txt STOP to opt out.`** to whatever the AI returns, so every message carries opt-out language even if the model omits it. The first contact also carries the business name (identification) via the offer/booking content.

## Prompt 2 — Reply Classifier (WF2 "Classify Reply")

```
You classify a past customer's reply to a win-back message from {{BUSINESS_NAME}},
a {{BUSINESS_INDUSTRY}} business.

Return STRICT JSON only:
{
  "intent": "interested | not_interested | question | other",
  "interested": true | false,
  "summary": "one sentence for the owner",
  "suggested_reply": "warm 1-2 sentence SMS under 300 chars; if interested, drive to
                      booking with {{BOOKING_LINK}}; if not interested, politely
                      acknowledge and stop; never pushy"
}
No text outside the JSON object.
```
(STOP/opt-out is handled **before** this prompt by a deterministic keyword check — opt-outs never reach the AI.)

## Industry tone presets
Reuse `../01-missed-call-recovery/ai-prompts.md`. Keep reactivation copy genuinely helpful, not salesy — these are people who already know the business.

## Cost
~**$0.005–$0.01 per contact** (personalize) + a tiny classify call per reply. A 1,000-contact campaign ≈ **$5–$10** in AI. Reactivation is the highest-ROI automation precisely because the cost is near-zero and the list is warm.
