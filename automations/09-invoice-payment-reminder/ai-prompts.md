# AI Prompts — Invoice & Payment Reminder (AR)

One OpenAI call (JSON mode) in WF1 classifies and responds to customer replies. The outbound reminder touches (anchored to the due date, escalating in tone) are **templated in code** (WF2) so they're deterministic, free, and TCPA-safe.

## Prompt — Reply Classifier (WF1 "Classify Reply (AI)")

```
You analyze a customer's SMS reply to a payment reminder from {{BUSINESS_NAME}},
a {{BUSINESS_INDUSTRY}} business. The outstanding balance is ${{BALANCE}} on
invoice {{INVOICE_NUMBER}}.

Return STRICT JSON only:
{
  "class": "PAID | DISPUTE | PROMISE_TO_PAY | QUESTION | STOP | GENERAL",
  "sentiment": "positive | neutral | negative",
  "disputed": true | false,
  "promise_to_pay": true | false,
  "summary": "one sentence for the owner",
  "suggested_reply": "professional, courteous, firm-but-respectful 1-2 sentence SMS
                      under 300 chars.
                      - If PAID: thank them and say we'll confirm on our end.
                      - If DISPUTE: apologize and say the owner will personally review — never argue.
                      - If PROMISE_TO_PAY: thank them and confirm.
                      - Share the pay link when helpful: {{PAY_LINK}}.
                      - NEVER threaten, never mention legal action, never add late fees or
                        interest unless this exact text is provided: {{LATE_FEE_TEXT}}."
}
No text outside the JSON object.
```

### User message
```
Customer reply: "{{MESSAGE_BODY}}"
```

### Classification → behavior (decided in code, not the model)
- **PAID** → status `Paid - Reported`, **sequence stops**, owner alerted to confirm on their end.
- **DISPUTE** → status `Disputed`, **sequence stops**, owner alerted to handle personally.
- **PROMISE_TO_PAY** → status `Promised to Pay`, reminders **snoozed** `PROMISE_SNOOZE_DAYS`, owner alerted.
- **QUESTION / GENERAL** → answered, sequence **continues** on schedule (AR keeps reminding until paid).
- **STOP** → handled by a deterministic keyword check *before* the AI; never reaches the model.

## Outbound reminders (templated, WF2)
Tone escalates by step but stays respectful: step 0 friendly courtesy → step 1 polite follow-up → middle steps firmer "now past due" → final "final reminder." Every message includes the invoice number, balance, due date, the pay link (when present), and an appended opt-out line. A late-fee line is included **only** when `LATE_FEE_TEXT` is set.

## What is enforced in code, not the prompt
- **STOP/opt-out**: deterministic regex in WF1 before any AI/send → `Opted_Out=Yes` + `Opt_Outs` row.
- **Stopping / pausing** on paid / dispute / promise is set in code from the structured fields.
- **No fabricated fees or threats**: the templated copy only adds a late-fee line when `LATE_FEE_TEXT` is configured; the prompt is also instructed to never threaten or invent fees. Code is the real guard.
- **Quiet/business hours + daily cap** live in WF2's filter code.
- A JSON parse failure falls back to a safe, neutral reply so a bad model response never sends harsh or wrong copy.

## Compliance tone note
Most businesses chasing their *own* invoices are not "debt collectors" under the FDCPA, but a professional, non-harassing tone is both good practice and good business — and **TCPA still governs the SMS**. The copy never threatens, never implies legal action, and always offers an easy path to resolve. Keep it that way.

## Cost
~**$0.002–$0.005 per reply** classified (gpt-4o-mini, JSON mode). Reminders are free (templated). A few cents per invoice worked.
