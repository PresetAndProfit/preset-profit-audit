# Real Business Test Plan

Goal: move from "it works in a smoke test" to **real audits → real leads → real
booked calls → first paying customer**. Three stages, each with a go/no-go gate.
Keep volume low and deliberate — this is validation, not a launch blast.

Prereq: `FIRST-CUSTOMER-VALIDATION.md` §0–4 complete (deployed, env set, five flows
pass with real data, payment + calendar live, email domain authenticated).

---

## Stage 1 — Dogfood (1 prospect, end to end) — Day 1
Prove the full pipeline with one real business you'd genuinely want as a client.
1. Pick a real local business in **one** niche (e.g. an HVAC company in your city).
2. Run its audit via `/audit` (or in-app). Confirm the findings are **true** against
   the real site — no false positives. Fix any obviously wrong finding before scaling.
3. Generate the roadmap + proposal. Read it as if you were the owner: is the ROI
   believable? Is the offer clear?
4. Generate outreach; arm the activation sequence to a **mailbox you control** to see
   exactly what the prospect receives.
5. Book a call into your own calendar from the proposal CTA. Mark it booked.
**Gate:** the audit is accurate, the proposal is credible, every email lands in the
inbox (not spam), the booking works. If not → fix before Stage 2.

## Stage 2 — Pilot batch (10–20 prospects) — Days 2–7
Real outreach to a tight, hand-picked list. This is where deliverability + message
quality get tested.
1. Build a list of **10–20** real businesses in the **same niche** (tight ICP =
   better audits, better message, better learning).
2. For each: run the audit, generate personalized outreach, send from your own hand
   (or arm the sequence selectively). Track each as a Deal.
3. Stagger sends (deliverability discipline). Watch Resend: delivered %, open %,
   bounce/complaint %. **Stop and fix if complaint rate climbs.**
4. Work replies in the CRM → book calls.
**Gate:** ≥1 booked call from the batch, deliverability healthy (complaints ≈ 0).
Target funnel: 15 audits → ~30–50% open → a few replies → **1–2 booked calls**.

## Stage 3 — First close — Days 7–14
1. Run the booked call(s). Use the proposal as the visual; lead with the prospect's
   own revenue-leak number.
2. Make the offer concrete (scope + price + start date). Have a **payment link /
   invoice ready** (Stripe) so "yes" can pay immediately — don't let the close cool.
3. On win → mark Closed-Won, record the sold automation in the CRM, deliver.
**Gate:** **first paying customer.**

---

## What to measure (one simple sheet — these are the funnel's vital signs)
| Stage | Metric | Healthy signal |
|---|---|---|
| Audit | accuracy (false-positive findings) | ~0 obviously-wrong findings |
| Capture | teaser → email-unlock rate | ≥ 25% |
| Email | delivered % / open % / complaint % | ≥ 95% / ≥ 30% / ~0% |
| CRM | audits → booked-call rate | ≥ 5–10% of worked deals |
| Close | booked call → closed-won | ≥ 1 in the pilot |

Instrument cheaply: the **Admin Command Center** (audits, emails) + **Resend**
dashboard (delivery) + the **Pipeline** activation funnel (sent/opened/clicked/
booked) cover all of the above without new code.

---

## Operating rules during validation
- **One niche, small batches.** Tight ICP makes every audit sharper and protects the
  email domain. Scale a channel only after a gate passes.
- **Read every artifact a prospect sees** before sending it at volume.
- **Fix the funnel, don't add to it.** If a stage underperforms, the fix is almost
  always copy/accuracy/deliverability — not a new feature.
- **Log learnings against the 3 conversion risks** in `FIRST-CUSTOMER-VALIDATION.md`
  §5; that's the prioritization input for the next build.

## Decision after Stage 3
- **Closed a customer:** double down on the channel that produced the booked call;
  only then consider Phase B (lead scoring, analytics, Turnstile) to scale it.
- **Booked calls but no close:** the gap is the offer/close, not the funnel — refine
  pricing/packaging, not features.
- **No booked calls:** diagnose by stage — deliverability (Risk 1), traffic/list
  quality (Risk 2), or audit credibility (Risk 3) — and fix that one thing.
