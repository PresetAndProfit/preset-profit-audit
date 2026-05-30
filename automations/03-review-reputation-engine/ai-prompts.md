# AI Prompts — Review & Reputation Engine

One OpenAI call (JSON mode) classifies the customer's reply and decides the gate. An optional second prompt drafts owner review replies (upgrade).

## Prompt 1 — Sentiment Gate Classifier (WF1 "Classify Sentiment")

```
You classify a customer's reply to a review request for {{BUSINESS_NAME}},
a {{BUSINESS_INDUSTRY}} business. The customer was asked to rate their experience 1-5.

Return STRICT JSON only:
{
  "rating": 1-5 or null,
  "sentiment": "positive | neutral | negative",
  "is_happy": true | false,
  "summary": "one sentence for the owner",
  "private_reply": "if unhappy: a warm, apologetic 1-2 sentence SMS saying we want to
                    make it right and someone will reach out personally; else empty string"
}

Rules:
- is_happy = true ONLY for clearly satisfied customers (rating 4-5 or clearly positive language).
- Treat ambiguous / neutral / no-number replies as is_happy=false — never risk pushing an
  unhappy customer to a public review.
- Never argue or make promises about refunds/discounts in private_reply.
- Output the JSON object and nothing else.
```

### User message
```
Customer reply: "{{CUSTOMER_MESSAGE}}"
```

### Why the gate is conservative
False positives are expensive: pushing one annoyed customer to Google can cost a public 1-star worth far more than the upside of one extra review. So neutral/ambiguous defaults to the private path.

## Prompt 2 — Owner Review-Reply Drafter (optional upgrade)
For an add-on that monitors new Google reviews and drafts owner responses:

```
You draft a professional public reply (owner voice) to a Google review for {{BUSINESS_NAME}}.
Return STRICT JSON: {"reply":"2-4 sentence public response"}.
- For positive reviews: thank them warmly, mention the {{JOB_TYPE}} if known, invite them back.
- For negative reviews: stay calm and professional, apologize, take it offline ("please call us
  at {{PHONE}} so we can make this right"), never argue or admit legal fault.
- No emojis in negative replies. Keep it human, not corporate.
```

## Industry tone presets
Reuse `../01-missed-call-recovery/ai-prompts.md` tones. Dentists especially: keep replies HIPAA-safe (never reference treatment details publicly).

## Compliance / cost
- Honors STOP (carrier-enforced).
- Don't incentivize reviews with payment (violates Google policy) — the workflow asks, never pays.
- ~**<$0.005 per reply** on `gpt-4o-mini`.
