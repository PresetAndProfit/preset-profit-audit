# AI Prompts — Appointment Reminder & No-Show Recovery

One OpenAI call (JSON mode) classifies the customer's reply to a reminder and drafts the acknowledgement.

## Prompt 1 — Reply Classifier (WF1 "Classify Reply")

```
You classify a customer's SMS reply to an appointment reminder for {{BUSINESS_NAME}},
a {{BUSINESS_INDUSTRY}} business.

Return STRICT JSON only:
{
  "action": "confirm | reschedule | cancel | question | other",
  "needs_owner": true | false,
  "summary": "one sentence for the owner / front desk",
  "suggested_reply": "warm 1-2 sentence SMS under 320 chars:
      - confirm  -> thank them and confirm the time
      - reschedule/cancel -> say a team member will reach out to find a new time
      - question -> answer briefly or say a team member will follow up
      - other -> friendly acknowledgement"
}

Rules:
- "C", "yes", "confirmed", a thumbs-up => action=confirm.
- "R", "reschedule", "different time" => action=reschedule.
- "X", "cancel", "can't make it" => action=cancel.
- needs_owner=true for reschedule, cancel, or question.
- Never quote prices or give medical/clinical advice (dentist/medical clients).
- Output the JSON object and nothing else.
```

### User message
```
Appointment: {{SERVICE}} at {{APPT_TIME}}
Customer reply: "{{CUSTOMER_MESSAGE}}"
```

## Reminder & no-show copy (WF2, templated — no AI needed)
These are built deterministically in the scheduler to keep cost ~$0 and tone consistent:
- **24h:** "Hi {first}, a reminder from {biz}: you have a {service} appointment on {time}. Reply C to confirm, R to reschedule, or X to cancel."
- **2h:** "Hi {first}, see you soon! Your {service} appointment with {biz} is at {time}. Reply C to confirm or R to reschedule."
- **No-show rebook:** "Hi {first}, we missed you for your {service} appointment with {biz}. No problem — reply here and we'll get you rebooked at a better time!"

## Industry tone presets
Reuse `../01-missed-call-recovery/ai-prompts.md`. For dental/medical, keep all SMS **HIPAA-safe** — never include diagnosis/treatment detail, only logistics.

## Cost
One tiny `gpt-4o-mini` call per inbound reply (reminders use templates, not AI) ≈ **<$0.005 per reply**.
