# AI Prompts — Estimate / Quote Follow-Up Engine

One OpenAI call (JSON mode) in WF1 classifies and responds to customer replies. The outbound follow-up touches (Day 1/3/7/14/21) are **templated in code** (not AI-generated) so they are deterministic, free, and reference the real quote details — see WF2's "Find Due Follow-Ups" node.

## Prompt — Reply Analyzer / Classifier (WF1 "Classify Reply (AI)")

```
You analyze a customer's reply to an estimate/quote follow-up from {{BUSINESS_NAME}},
a {{BUSINESS_INDUSTRY}} business. The customer was quoted ${{ESTIMATE_AMOUNT}} for
{{SERVICE_TYPE}}.

Return STRICT JSON only:
{
  "interest": "HOT | WARM | COLD | DECLINED",
  "intent": "accept | negotiate | question | schedule_call | not_now | decline | other",
  "wants_call": true | false,
  "objection": "price | timing | trust | scope | none",
  "summary": "one sentence for the owner",
  "suggested_reply": "warm, helpful 1-2 sentence SMS under 300 chars;
                      if HOT/accept, drive to booking with {{BOOKING_LINK}};
                      if objection, acknowledge it and offer to help;
                      if DECLINED, politely thank them and stop;
                      never pushy, never invent prices or discounts"
}
No text outside the JSON object.
```

### User message
```
Prior conversation:
{{CONVERSATION}}

Customer reply: "{{MESSAGE_BODY}}"
```

### Classification meaning
- **HOT** — ready to move forward / accepting → owner alerted (email + SMS), drive to booking.
- **WARM** — interested but has a question or objection → AI answers, sequence continues, owner alerted if there's an objection or call request.
- **COLD** — vague / stalling → polite nudge, sequence continues.
- **DECLINED** — clear no → polite thanks, **sequence stops** (`Sequence_Active=No`).

### What is enforced in code, not the prompt
- **STOP/opt-out** is caught by a deterministic keyword check *before* this prompt runs — opt-outs never reach the AI.
- **Stopping the sequence** on accept/decline is decided in the "Parse Reply" code node from `intent`/`interest`, not trusted to the model.
- The owner-alert decision (HOT, wants a call, has an objection, or accepted) is computed in code from the structured fields.
- A parse failure falls back to a safe WARM classification with a generic "a team member will follow up" reply, so a bad model response never breaks the flow.

## Outbound follow-up copy (templated, WF2)
Each touch references the customer's first name, service type, estimate amount, and expiration date when available. The last touch is a softer "final check-in." No AI cost per touch. To upgrade to AI-personalized follow-ups, mirror the `Personalize (AI)` node from Automation #05's campaign sender.

## Industry tone presets
Reuse `../01-missed-call-recovery/ai-prompts.md`. Keep quote follow-ups genuinely helpful and low-pressure — these are warm prospects who already received a price.

## Cost
~**$0.002–$0.005 per reply** classified (gpt-4o-mini, JSON mode). Outbound touches are free (templated). A shop sending hundreds of follow-ups/mo with dozens of replies spends **well under $5/mo** in AI.
