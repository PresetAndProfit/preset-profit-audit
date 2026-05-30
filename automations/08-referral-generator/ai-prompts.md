# AI Prompts — Referral Generator Engine

Two OpenAI calls (JSON mode): one classifies customer SMS replies (WF1), one summarizes a submitted referral and drafts owner outreach (WF3). The outbound request touches (initial / +3d / +7d) are **templated in code** (WF2) so they're deterministic, free, and TCPA-safe.

## Prompt 1 — Reply Classifier (WF1 "Classify Reply (AI)")

```
You analyze a customer's SMS reply to a referral request from {{BUSINESS_NAME}},
a {{BUSINESS_INDUSTRY}} business.

Return STRICT JSON only:
{
  "class": "REFERRAL_PROVIDED | INTERESTED_BUT_NEEDS_PROMPTING | NOT_NOW | COMPLAINT | STOP | GENERAL_REPLY",
  "sentiment": "positive | neutral | negative",
  "complaint": true | false,
  "referral": { "name": "", "phone": "", "email": "", "service": "", "relationship": "", "notes": "" },
  "summary": "one sentence for the owner",
  "suggested_reply": "warm, brief 1-2 sentence SMS under 300 chars. Never pressure.
                      Never promise rewards or incentives unless one is provided here: {{REFERRAL_INCENTIVE}}.
                      If a referral was given, thank them warmly. If a complaint, apologize
                      sincerely and say the owner will personally follow up. If interested but
                      vague, gently make it easy to share a name."
}
Leave referral fields empty strings if none was given. No text outside the JSON object.
```

### User message
```
Customer reply: "{{MESSAGE_BODY}}"
```

## Prompt 2 — Referral Summarizer / Owner Draft (WF3 "Summarize Referral (AI)")

```
You process a referral submitted to {{BUSINESS_NAME}}, a {{BUSINESS_INDUSTRY}} business.

Return STRICT JSON only:
{
  "summary": "one sentence for the owner",
  "high_value": true | false,
  "urgent": true | false,
  "wants_contact": true | false,
  "suggested_owner_message": "a brief, warm 1-2 sentence outreach the owner could send the
                              referred person; never fabricate incentives or promise rewards
                              unless one is provided here: {{REFERRAL_INCENTIVE}}; never pressure"
}
high_value=true if the service sounds like a large/expensive job. urgent=true if soon.
No text outside the JSON object.
```

### User message
```
Referred person: {{REFERRED_NAME}}
Service needed: {{SERVICE}}
Relationship: {{RELATIONSHIP}}
Notes: {{NOTES}}
```

## What is enforced in code, not the prompt
- **STOP/opt-out** is caught by a deterministic regex in WF1 *before* the AI runs — opt-outs never reach a model and are written to `Opt_Outs` + `Opted_Out=Yes`.
- **Eligibility** (satisfied, complete, no complaint, not opted-out, cooldown passed, not staff-blocked) is decided in WF1's "Qualify Customer" code node — the model never decides who gets asked.
- **Stopping the sequence** on any reply / opt-out / complaint / referral-submitted is set in code (`Sequence_Active=No`), not trusted to AI.
- **No fabricated rewards:** the templated request copy (WF2) only includes an incentive line when `REFERRAL_INCENTIVE` is set; both prompts are also instructed never to invent one. Code is the real guard.
- **Quiet/business hours + daily cap** live in WF2's filter code.
- A JSON parse failure in either call falls back to a safe, neutral result so a bad model response never breaks the flow or sends pushy copy.

## Tone rules (both prompts + templated copy)
Grateful, low-pressure, human. Never guilt, never urgency, never "you owe us." A referral is a favor — the copy reflects that. Reuse the industry tone presets in `../01-missed-call-recovery/ai-prompts.md`.

## Cost
~**$0.002–$0.005 per reply / per referral** (gpt-4o-mini, JSON mode). Outbound requests are free (templated). Effectively a few cents per customer worked.
