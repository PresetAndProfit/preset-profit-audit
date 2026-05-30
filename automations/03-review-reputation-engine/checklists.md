# Checklists — Review & Reputation Engine

## 11. Client Setup Checklist (~45–60 min)
- [ ] Collect: business name, industry, owner email, business hours, timezone.
- [ ] Get the **Google review link** (Google Business Profile → "Ask for reviews" → copy link, or build from Place ID). Test it opens the review box. Put in `GOOGLE_REVIEW_LINK`.
- [ ] Provision Twilio number + register **A2P 10DLC** (gates SMS).
- [ ] Decide the **trigger source** for "job completed":
  - Manual: client texts/forwards a number, or you build a simple "mark complete" Google Form → webhook.
  - CRM/FSM: Jobber/Housecall Pro/ServiceTitan "job completed" webhook → the WF1 URL.
  - Sheet: a "Completed today" tab the client fills → a small read step.
- [ ] Create the client Google Sheet from `reviews-sheet-header.csv`; tab `Reviews`; ID → `GSHEET_REVIEWS_ID`.
- [ ] Set env vars (esp. `REVIEW_DELAY_MIN`, `BUSINESS_HOURS_START/END`) and **set the n8n timezone** to the client's zone.
- [ ] Import both workflows; map credentials; copy WF1 webhook URL.
- [ ] Point the completed-job trigger AND the Twilio Messaging webhook at the WF1 URL.

## 12. Testing Checklist
- [ ] Fire a test "completed job" → confirm a `Queued - Review Pending` row with a `Send_At` ~`REVIEW_DELAY_MIN` ahead.
- [ ] Temporarily set `REVIEW_DELAY_MIN=1` and activate WF2 → confirm the gating request sends only within business hours.
- [ ] Reply **"5"** → confirm Google review link is sent and Status → `Positive - Review Requested`.
- [ ] Reply **"2 - tech was late"** → confirm **no** public link, a private apology is sent, owner gets the alert email, Status → `Negative - Owner Alerted`.
- [ ] Reply something ambiguous ("ok i guess") → confirm it routes to the **private** path (conservative gate), not the public link.
- [ ] Fire the same customer twice → confirm dedup (not asked twice).
- [ ] Leave a request unanswered → confirm exactly **one** reminder after `REVIEW_REMINDER_MIN`, then no more.
- [ ] Send outside business hours → confirm nothing sends until the window opens.
- [ ] Force OpenAI failure → confirm safe fallback (routes to private path, owner alerted) — never mis-pushes a public link.

## 13. Deployment Checklist
- [ ] Confirm A2P 10DLC **Approved**; set both workflows `Active`.
- [ ] Confirm n8n timezone matches the client.
- [ ] Point the production completed-job trigger at the live URL.
- [ ] Enable global error workflow + logging.
- [ ] Confirm the Google review link works on mobile (most customers tap from their phone).
- [ ] Brief the owner: negative alerts require **their** fast personal follow-up — that's the magic, but only if they act.
- [ ] 7-day review: how many asks, positive rate, reviews gained, negatives intercepted.
