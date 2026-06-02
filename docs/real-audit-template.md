# Real Sample Audit — Production Template

Purpose: produce ONE real, defensible sample audit to replace the fictional
"Northwind" example as the strongest proof asset on the site. Use a business you
own or have **written permission** to audit, or anonymize a public business.

**Hard rules**
- Every claim goes under one of the labels below. Never blur them.
- `Observed Facts` = screenshot-backed, verifiable today. No interpretation.
- `Assessment` = your professional judgment, clearly your opinion.
- `Estimate` = ranges only, with every input stated. Never a single hero number.
- No fabricated traffic/revenue. If an input is unknown, say so and widen the range.
- No fake authority, no fake case studies, no invented testimonials.

---

## 0. Provenance (one line, builds trust)
- Business: `__________`  ·  URL: `__________`  ·  Date analyzed: `__________`
- Basis: ☐ My own business ☐ Audited with written permission ☐ Public info, anonymized

## 1. Observed Facts (verifiable, screenshot each)
List only what is literally true and visible. Example shape:
- Above-the-fold headline reads: "`____`" (screenshot)
- Primary CTA is: "`____`" → links to `____`
- Mobile PageSpeed score: `__` (PageSpeed Insights, public, link)
- Quote/contact form fields: `____`
- Public pricing shown: ☐ yes `____` ☐ no

## 2. Assessment (your judgment — label as opinion)
For each observed fact that matters, state the implication:
- "Because the headline leads with history, a first-time visitor cannot tell what is sold or for whom." (Assessment)
- Tag each with a **confidence**: High / Medium / Low.

## 3. Estimate (ranges + stated assumptions only)
For each high-impact issue:
- Affected volume: `____` (source: shared analytics / conservative public estimate — state which)
- Recovery rate range: `__%–__%` (basis: `____`)
- Value per conversion: `$____` (stated AOV / customer value)
- → Estimated opportunity: **`$____ – $____` /mo** (conservative)
- If any input is unknown: say so, widen the range, lower confidence.

## 4. Priority Fixes (ranked by impact × effort)
| # | Fix | Impact | Effort | Confidence |
|---|-----|--------|--------|------------|
| 1 | `____` | High | Low | High |
| 2 | `____` | High | Med | High |
| 3 | `____` | Med | Low | Med |

## 5. Roadmap (sequenced, what to do first)
- Week 1: `____` (lowest effort, highest return)
- Weeks 1–2: `____`
- Weeks 2–4: `____`
- Ongoing: `____`

---

## Publishing it as the site's sample
1. Mirror this content into a new fragment `src/marketing/pages/sample-real.html`
   using the same classes as `sample-report.html` (tags: `Observed` / `Assessment`
   / `Estimate` instead of generic labels).
2. Add a route `/sample-report/real` (or swap it in as the primary) in `App.jsx`.
3. Keep the fictional one labeled "Illustrative"; label the real one
   "Real audit — [Business or 'Anonymized'], [date], prepared from public info."
4. Link it from the homepage sample-report CTA.

> Claude can generate a first-draft real audit from a live URL on request — it will
> fill Observed Facts from the public site and clearly mark every Assessment/Estimate.
