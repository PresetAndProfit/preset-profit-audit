# Checklists — Lead Capture & Follow-Up Engine

## 11. Client Setup Checklist (~60–90 min)
- [ ] Collect: business name, industry, owner email, service area, booking link, lead sources in use.
- [ ] Identify every place leads come in: website form, Facebook/Instagram Lead Ads, Google LSA, Typeform/Jotform, landing pages.
- [ ] Provision the client's **Twilio number** + register **A2P 10DLC** (start immediately — carrier approval gates SMS).
- [ ] Connect n8n credentials: Twilio, OpenAI, Google Sheets, Gmail.
- [ ] Create the client's Google Sheet from `leads-sheet-header.csv`; tab named `Leads`; copy ID into `GSHEET_LEADS_ID`.
- [ ] Set all env vars from `.env.example`, including the sequence config (`FOLLOW_UP_GAPS_MIN`, `FOLLOW_UP_CHANNELS`).
- [ ] Import both workflow JSONs; map credentials on each node.
- [ ] Copy WF1's webhook Production URL.
- [ ] **Wire each lead source to the webhook** (this is the core integration work):
  - Website form: set form action / Zapier / native webhook → POST to the URL.
  - Facebook Lead Ads: connect via Meta Lead Ads → webhook (or a Lead Ads trigger node) → forward to the URL.
  - Typeform/Jotform: add a webhook integration pointing at the URL.
  - Map each source's field names (the Normalize node already covers common ones; add aliases if a form uses custom names).
- [ ] Send the owner a test alert.

## 12. Testing Checklist
- [ ] Submit a test lead from **each** connected source → confirm instant SMS + email arrive (<60s) and a row is created.
- [ ] Confirm `Source` is correctly labeled per channel.
- [ ] Confirm phone numbers normalize to E.164 (esp. 10-digit form inputs).
- [ ] Reply to the SMS → AI qualifies, row updates, owner alerted, AI reply sent.
- [ ] Submit the **same phone** twice → updates one row, no duplicate.
- [ ] Leave a lead un-replied → confirm sequence fires: SMS +1h, Email +1d, SMS +3d, then `Cold - No Response` (temporarily shrink gaps to test).
- [ ] Reply mid-sequence → confirm follow-ups **stop** immediately.
- [ ] Submit spam → `Qualified=false`, no booking link leaked, no email sent if `sms_reply` empty.
- [ ] Force OpenAI failure → fallback messages still send, lead still logged.
- [ ] Confirm webhook rejects requests missing the shared secret.

## 13. Deployment Checklist
- [ ] Move workflows to production n8n; set both `Active`.
- [ ] Confirm A2P 10DLC **Approved**.
- [ ] Point all live lead sources at the production webhook URL.
- [ ] Enable global error workflow + execution logging.
- [ ] Verify email deliverability (SPF/DKIM on the sending Gmail/domain) so instant emails don't spam-folder.
- [ ] Add an uptime check on the webhook.
- [ ] 48-hour and 7-day review of the `Leads` tab with the owner.
- [ ] Hand over the 1-page "how to read your leads" guide.
