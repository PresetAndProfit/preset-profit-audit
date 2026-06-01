# Public Instant Audit Funnel — Architecture & Plan (DRAFT, not yet implemented)

> Status: **design only.** No implementation until this is reviewed/approved.
> Prereq: Growth OS (`feature/growth-os`) deployed and its live smoke test passed.

## 1. Objective & non-goals
Top-of-funnel acquisition: a public, no-login page where a business submits its
website, gets an instant audit teaser, exchanges an email for the full result,
and lands as a **Deal in the CRM** — feeding the machine we already built
(roadmap → proposal → outreach → activation → booked call → close).

**Non-goals (v1):** no AI consultant on the public path (cost), no public proposal
self-serve checkout, no multi-agency attribution (single funnel owner), no account
creation for the prospect.

## 2. Where it fits
This is the **only missing stage** before our funnel: it generates the *Lead* and
*Audit* that everything downstream already converts. It does **not** add new
conversion machinery — it pours qualified leads into the one we shipped.

```
[PUBLIC] landing → submit URL → instant audit teaser → email gate
   → Lead + Deal created in CRM (owned by funnel owner)
   → audit summary email (book-a-call CTA)
        └────────────► [EXISTING GROWTH OS]
                       Deal → Roadmap → Proposal → Activation seq → Booked Call → Close
```

## 3. Hard constraints (verified against the codebase)
- **12/12 serverless functions — none may be added.**
- `api/analyze-site.js` is **auth-gated** (Bearer token + credit check + per-user
  rate limit) → **cannot** serve the public path.
- `api/send-report.js` is the **public, unauthenticated inbound hook** (Svix
  webhook + token cron today; the codebase already reserves `{action:'widget_submit'}`
  here). **This is where the public funnel's server actions live.**
- `safeFetchPage` (`api/_lib/safeFetch.js`) is SSRF-safe (private-IP/redirect/
  rebind guarded). `scanSite` (`src/lib/siteAnalyzer.js`) turns HTML → signals.
  `auditEngine.generateAudit(form, scan)` renders the deterministic audit.
  `rateLimit.js` + `usageServer.clientIp` provide IP rate limiting. The `leads`
  table has a `source` column; `audits` is the Deal record.

## 4. Architecture — function-budget proof (0 new functions)
| Concern | Routed through | New code |
|---|---|---|
| Public scan → teaser | `send-report.js` `{action:'public_audit'}` | branch reusing `safeFetchPage`+`scanSite` |
| Email capture → Lead+Deal+summary | `send-report.js` `{action:'public_lead'}` | branch (service-role insert + Resend) |
| Audit render | **client** (`auditEngine.generateAudit`) | public React route |
| Summary email | Resend via `email.js` | one new template `public_audit_summary` |
| Full report view (optional) | existing `/r/:token` + `api/share/get.js` | reuse |

Public landing is a **new unauthenticated React route** (`/audit`) in `App.jsx`,
outside `ProtectedRoute` — client only, no function.

## 5. Data flow (mapped to the 8 objectives)
1. **Public landing page** — `/audit` (SEO-indexable; the lead-gen surface). Hero +
   single input: website URL (+ optional business name / industry to sharpen the audit).
2. **Submit website** → client POSTs `send-report.js {action:'public_audit', url, hp}`
   (`hp` = honeypot). No auth.
3. **Automated audit generation** — server: IP rate-limit → validate/normalize URL →
   `safeFetchPage(url)` → `scanSite()` → return **signals + teaser** (overall/lead/
   website scores, revenue-opportunity range, top 2 findings). **No AI** (bounded cost).
   Client renders the teaser; remaining findings/fixes are **blurred/locked**.
4. **Email capture** — to unlock the full findings + "what to fix" + book a call, the
   prospect submits email → `send-report.js {action:'public_lead', email, url, businessName, scanToken}`.
5. **Lead creation in CRM** — server (service-role): validate email (block disposable
   domains) → upsert a `leads` row (`source='public_funnel'`) **and** an `audits`
   Deal row, both owned by `FUNNEL_OWNER_USER_ID`, `stage='audit'`, `contact_email`
   set, `data` = the deterministic report. (Service-role insert; **no usage_event**,
   so it doesn't burn the owner's plan credits.)
6. **Audit summary delivery** — server sends `public_audit_summary` (Resend): scores,
   revenue opportunity, top findings, **book-a-call CTA = funnel owner's `calendar_url`**.
   Client simultaneously unlocks the full audit in-browser (instant gratification).
7. **Proposal generation path** — the Deal is now in the CRM; the operator one-clicks
   Roadmap → Proposal (existing). Optionally auto-stamp `stage` and pre-fill contact.
8. **Booked-call path** — the summary email's CTA + (optionally auto-armed) activation
   sequence both drive to the owner's booking link; booking tracked via the CRM we built.

## 6. Data model & attribution
- **`FUNNEL_OWNER_USER_ID`** (env) — the account public leads/deals attach to (Justin
  for the P&P funnel). Single-owner in v1; `org_id` (reserved) generalizes this later.
- `leads`: `source='public_funnel'`, `email`, `business_name`, `audit_id` (FK to the Deal).
- `audits` (Deal): owned by funnel owner, `stage='audit'`, `contact_email`=prospect,
  `crm.source='public_funnel'`, `data`=report. Appears in the Pipeline tagged as inbound.
- **Dedupe:** upsert by (owner, normalized-url) within a cooldown window so repeat
  submits don't spawn duplicate deals; refresh `contact_email` if a new one arrives.

## 7. Security
- **SSRF:** reuse `safeFetchPage` (already blocks private IPs, redirects to internal,
  DNS-rebind; enforces size/time caps). Reject non-`http(s)`, IP-literal, and
  over-length URLs before fetch.
- **No secrets client-side**; service-role stays in `send-report.js`.
- **Input validation:** URL normalize + allowlist scheme; email RFC + MX-ish sanity;
  length caps on all fields.
- **Owner isolation:** public actions can only ever write under `FUNNEL_OWNER_USER_ID`
  — never an arbitrary `user_id` from the request.

## 8. Abuse prevention
- **IP rate limits** (via `rateLimit.js`): `public_audit` hard-capped (e.g. 5/IP/hour,
  20/IP/day — scans are the expensive op); `public_lead` lighter + email-dedupe.
- **Honeypot** field + min-time-to-submit (drop bot submissions) — zero-dependency.
- **Disposable-email block** (static domain list) → lead quality + abuse.
- **Cost bound:** deterministic scan only (no OpenAI), one page fetch, capped size.
- **Cooldown/dedupe** per URL+IP to stop scan spamming.
- **Scale upgrade (phase 2):** Cloudflare Turnstile (a verify call fits inside the
  existing `public_audit` branch — still no new function).

## 9. Scalability
- `send-report.js` is stateless serverless → scales horizontally; the scan fetch
  (~1–3s) is the latency driver, protected by rate limits and a fetch timeout.
- Reads/writes hit already-indexed tables (`leads`, `audits`, `email_log`).
- Teaser payload is small; full render is client-side (no server cost per view).
- Vercel function execution time bounded by the `safeFetchPage` timeout.

## 10. Lead quality
- Require a **business email** (block disposable) → intent filter.
- The **scan must succeed** to create a Deal (a real, reachable site = real business).
- **Lead score** = audit `overallScore` inverted (low score = high opportunity = hot)
  + scan success + email-domain match to the site domain (strong intent signal).
- Tag `source='public_funnel'` so the operator filters/prioritizes inbound vs outbound.

## 11. Conversion optimization
- **Value before capture:** show scores + "we found ~$X/mo leaking" + 1–2 findings
  *before* the email gate; lock the fixes + full plan behind email.
- **Instant unlock** on submit (no waiting) + emailed copy (reciprocity + a saved asset).
- **Single, specific CTA** post-unlock: "Book a 15-min call — we'll fix this for you"
  → owner's calendar. The activation sequence (already built) re-engages non-bookers.
- **SEO/shareable** landing → compounding organic top-of-funnel.

## 12. Risks & mitigations
| Risk | Mitigation |
|---|---|
| Public scan = new attack surface | `safeFetchPage` SSRF guard + strict URL validation + IP rate limit |
| Scan cost/DoS | deterministic-only (no AI), per-IP caps, fetch timeout, cooldown |
| Bot/junk leads pollute CRM | honeypot + time-trap + disposable-email block + `source` tag to filter |
| Cold-email deliverability (summaries) | soft opt-in (they submitted email+URL), clear unsubscribe, monitor bounce/complaint; consider double-opt-in if complaints rise |
| Single-owner attribution won't scale to agencies | acceptable for first-customer; `org_id` reserved for Phase 3 |
| Duplicate deals from repeat submits | upsert + cooldown by (owner, url) |

## 13. Deployment requirements
- **Env:** `FUNNEL_OWNER_USER_ID` (required); optional `TURNSTILE_SECRET`/site key (phase 2);
  `DISPOSABLE_EMAIL_BLOCKLIST` optional override.
- **Routing:** `/audit` public route in `App.jsx` (SPA rewrite already serves `/*`).
- **Rate-limit config** for the two new `send-report` actions.
- **Resend:** add `public_audit_summary` template; reuse existing domain/keys.
- **SEO:** ensure `/audit` is indexable (robots/sitemap) to actually generate leads.
- **No DB migration** required (reuses `leads`/`audits`/`source`); optional index on
  `leads(source, created_at)` for inbound reporting.

## 14. Open decisions (need a call before build)
1. **Auto-create the Deal on email capture** (recommended — connects to the funnel
   immediately) vs lead-only until the owner promotes it. → *Recommend auto-create.*
2. **Auto-arm the activation sequence** for public leads, or leave it operator-initiated?
   → *Recommend operator-initiated first* (deliverability caution), auto-arm once
   complaint rates are known.
3. **Bot protection level at launch:** honeypot+rate-limit (MVP) vs Turnstile (adds a
   key + a verify call). → *Recommend MVP, add Turnstile if abused.*
4. **Full report delivery:** in-browser unlock only, vs also a `/r/:token` public link
   (reuses share infra but `share/create` is Agency-gated — would need the funnel
   owner to be Agency, or a public-share variant). → *Recommend in-browser + email summary v1.*

## 15. Phased build plan (for approval — NOT executed)
- **Phase A (MVP, ~1–1.5 days):** `/audit` landing + teaser; `public_audit` +
  `public_lead` actions in `send-report.js`; Lead+Deal creation under funnel owner;
  `public_audit_summary` email; honeypot + IP rate limit; smoke-test additions.
- **Phase B (quality):** disposable-email block, lead scoring + `source` filter in the
  Pipeline, dedupe/cooldown, SEO metadata.
- **Phase C (scale):** Turnstile, optional double-opt-in, inbound analytics in Admin,
  auto-arm activation (gated on observed deliverability).

---
**First-customer lens:** this funnel's only job is to put *more qualified Deals* into
the pipeline that already converts to booked calls and paid clients. It is correctly
sequenced **after** that pipeline is proven live in production.
