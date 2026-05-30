# Checklists — Missed Call Recovery

## 11. Client Setup Checklist (onboarding, ~60–90 min)
- [ ] Collect: business name, industry, owner email, owner mobile, service area, booking link, business hours.
- [ ] Buy/port a **Twilio number** for the client (or use their tracking number).
- [ ] Twilio: register **A2P 10DLC brand + campaign** (required for US business SMS — start this first, it can take days).
- [ ] Configure call forwarding so the client's main line forwards on no-answer to the Twilio number **OR** set the Twilio number as the public/ad number that `<Dial>`s their real phone.
- [ ] In Twilio Voice config, set the **Dial timeout = 20s** and a status-callback / TwiML that posts missed-call events to the n8n webhook.
- [ ] In Twilio Messaging config, set the inbound-SMS webhook to the **same** n8n webhook URL.
- [ ] Create the client's **Google Sheet** from `google-sheets-structure.md`; copy its ID.
- [ ] Connect n8n credentials: Twilio, OpenAI, Google Sheets, Gmail.
- [ ] Set all env vars from `.env.example` for this client.
- [ ] Import both workflow JSON files; map credentials on each node.
- [ ] Set the owner's Gmail/alert address; send a test alert.
- [ ] Walk the owner through the Sheet and what each Status means.

## 12. Testing Checklist (before go-live)
- [ ] Call the number, let it ring out → confirm missed-call branch fires and first SMS arrives within ~10s.
- [ ] Confirm a new row appears in `Leads` with Status = `Contacted - Awaiting Reply`.
- [ ] Reply to the SMS → confirm AI qualifies, row updates, owner gets the Gmail alert, customer gets the AI reply.
- [ ] Send a second reply from the **same number** → confirm it updates the **same row** (no duplicate).
- [ ] Send `STOP` → confirm no further messages and Status reflects opt-out.
- [ ] Send gibberish/spam → confirm `qualified=false`, no booking link leaked.
- [ ] Leave a lead unanswered → confirm follow-up #1 fires after `FIRST_FOLLOW_UP_MIN`, #2 after the gap, then `Cold - No Response`.
- [ ] Force an OpenAI failure (bad key) → confirm fallback reply still sends and lead is still logged.
- [ ] Verify webhook rejects requests without a valid Twilio signature.
- [ ] Confirm messages only send during allowed hours if quiet-hours is enabled.

## 13. Deployment Checklist (go-live)
- [ ] Move workflows to the **production** n8n instance/project.
- [ ] Set both workflows `active = true`.
- [ ] Confirm A2P 10DLC campaign is **approved** (un-approved = carrier filtering/blocked texts).
- [ ] Point Twilio Voice + Messaging webhooks at the production URL.
- [ ] Enable n8n **error workflow** (global) → alerts you on any failed execution.
- [ ] Turn on execution logging + 7–30 day retention.
- [ ] Set up an uptime check / heartbeat on the webhook URL.
- [ ] Document the client's config in your master client sheet.
- [ ] Schedule a 48-hour and 7-day check-in to review the `Leads` tab with the owner.
- [ ] Hand over a 1-page "how to read your leads" PDF.
