// api/_lib/emailTemplates.js — lifecycle email content. Each template is a pure
// function (data) => { subject, html }. No I/O here; rendering only. The Resend
// wrapper (./email.js) picks a template by key and sends the result.
//
// HTML is intentionally simple, inline-styled, and table-wrapped so it renders
// consistently across email clients (Gmail/Outlook/Apple Mail). Every email has
// one brand header, one primary CTA, and a footer.

const BRAND = "Preset & Profit";
const COLOR = { bg: "#0f1115", card: "#161a22", text: "#e7e9ee", muted: "#9aa3b2", accent: "#5b8cff", border: "#262c38" };

const APP_URL = process.env.APP_URL || "https://app.presetprofit.com";
// CAN-SPAM requires a valid physical postal address in every commercial email.
// Set BUSINESS_ADDRESS in the environment to your real mailing address.
const BUSINESS_ADDRESS = process.env.BUSINESS_ADDRESS || "Preset & Profit";

const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function button(href, label) {
  return `<a href="${esc(href)}" style="display:inline-block;background:${COLOR.accent};color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 26px;border-radius:8px">${esc(label)}</a>`;
}

// Compliant footer. `account` = recipients with a P&P account (manage prefs in
// app). `prospect` = cold recipients of the public audit / activation sequence —
// they have NO account, so we give a reply-based opt-out instead of a dead link.
// Both include the physical postal address (CAN-SPAM).
function footerHtml(kind) {
  const optOut = kind === "prospect"
    ? `You received this because you requested a free audit. To stop these emails, reply with “unsubscribe”.`
    : `You're receiving this because you have a ${BRAND} account.&nbsp;·&nbsp;<a href="${esc(APP_URL)}/?view=account" style="color:${COLOR.muted}">Manage email preferences</a>`;
  return `${BRAND} · ${esc(BUSINESS_ADDRESS)}<br>${optOut}`;
}

// Shared shell. `body` is trusted HTML built by a template below.
function layout({ preheader = "", body, footerKind = "account" }) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${COLOR.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<span style="display:none;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLOR.bg};padding:32px 12px">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${COLOR.card};border:1px solid ${COLOR.border};border-radius:14px;overflow:hidden">
      <tr><td style="padding:26px 32px 0">
        <div style="font-size:18px;font-weight:700;color:${COLOR.text};letter-spacing:.2px">${BRAND}</div>
      </td></tr>
      <tr><td style="padding:18px 32px 30px;color:${COLOR.text};font-size:15px;line-height:1.6">
        ${body}
      </td></tr>
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
      <tr><td style="padding:18px 32px;color:${COLOR.muted};font-size:12px;line-height:1.5;text-align:center">
        ${footerHtml(footerKind)}
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function p(text) { return `<p style="margin:0 0 16px">${text}</p>`; }
function h(text) { return `<h1 style="margin:0 0 14px;font-size:21px;line-height:1.3;color:${COLOR.text}">${esc(text)}</h1>`; }
const hi = (name) => p(`Hi${name ? " " + esc(name) : ""},`);

// ── Templates ────────────────────────────────────────────────────────────────

function auditComplete(d = {}) {
  const biz = d.businessName ? esc(d.businessName) : "your business";
  const score = Number.isFinite(d.overallScore) ? `${d.overallScore}/100` : null;
  const opp = d.revenueOpportunity ? esc(d.revenueOpportunity) : null;
  const upgradeCta = !d.isPaid;
  return {
    subject: `Your audit for ${d.businessName || "your business"} is ready`,
    html: layout({
      preheader: `Your automation & profit audit is ready to view.`,
      body:
        h("Your audit is ready") +
        hi(d.name) +
        p(`We just finished the automation & profit audit for <strong>${biz}</strong>.`) +
        (score || opp
          ? `<table role="presentation" width="100%" style="margin:0 0 18px;border-collapse:separate;border-spacing:0 8px">
               ${score ? `<tr><td style="color:${COLOR.muted};font-size:13px">Overall score</td><td align="right" style="color:${COLOR.text};font-weight:700">${esc(score)}</td></tr>` : ""}
               ${opp ? `<tr><td style="color:${COLOR.muted};font-size:13px">Revenue opportunity</td><td align="right" style="color:${COLOR.text};font-weight:700">${opp}</td></tr>` : ""}
             </table>`
          : "") +
        p(`Open your dashboard to review the full findings, recommendations, and export the PDF.`) +
        `<div style="margin:8px 0 22px">${button(`${APP_URL}/?view=report`, "View your audit")}</div>` +
        (upgradeCta
          ? p(`<span style="color:${COLOR.muted}">Want unlimited audits, un-watermarked PDFs, and score tracking over time? <a href="${esc(APP_URL)}/?view=account" style="color:${COLOR.accent}">Upgrade to Professional →</a></span>`)
          : ""),
    }),
  };
}

function trialStarted(d = {}) {
  const plan = esc(d.planName || "Professional");
  return {
    subject: `Welcome to ${plan} — your trial has started`,
    html: layout({
      preheader: `Here's how to get the most out of your trial.`,
      body:
        h(`Welcome to ${plan}`) +
        hi(d.name) +
        p(`Your free trial is active${d.trialEndsAt ? ` through <strong>${esc(d.trialEndsAt)}</strong>` : ""}. You now have full access.`) +
        `<ul style="margin:0 0 18px;padding-left:20px;color:${COLOR.text}">
           <li style="margin-bottom:6px">Run <strong>unlimited audits</strong> and re-scans</li>
           <li style="margin-bottom:6px">Export <strong>un-watermarked</strong> PDF reports</li>
           <li style="margin-bottom:6px">Track scores over time with the 30-day action plan</li>
         </ul>` +
        `<div style="margin:8px 0 22px">${button(`${APP_URL}/?view=scan`, "Run your first audit")}</div>` +
        p(`<span style="color:${COLOR.muted}">Questions? Just reply to this email.</span>`),
    }),
  };
}

function trialEnding(d = {}, days) {
  const plan = esc(d.planName || "Professional");
  const when = days === 1 ? "tomorrow" : `in ${days} days`;
  return {
    subject: days === 1 ? `Your trial ends tomorrow` : `Your ${plan} trial ends in ${days} days`,
    html: layout({
      preheader: `Add a payment method to keep your access.`,
      body:
        h(days === 1 ? "Your trial ends tomorrow" : `Your trial ends ${when}`) +
        hi(d.name) +
        p(`Your ${plan} trial ends ${when}${d.trialEndsAt ? ` (${esc(d.trialEndsAt)})` : ""}. To keep unlimited audits and un-watermarked exports, confirm your plan now — it's the same card on file, no interruption.`) +
        `<div style="margin:8px 0 22px">${button(`${APP_URL}/?view=account`, "Keep my plan")}</div>` +
        p(`<span style="color:${COLOR.muted}">If you do nothing, your account moves to the free plan when the trial ends.</span>`),
    }),
  };
}

function paymentSucceeded(d = {}) {
  const plan = esc(d.planName || "your plan");
  return {
    subject: `Payment received — you're all set on ${plan}`,
    html: layout({
      preheader: `Receipt and confirmation for your subscription.`,
      body:
        h("Payment received") +
        hi(d.name) +
        p(`Thanks! Your payment for <strong>${plan}</strong>${d.amount ? ` (${esc(d.amount)})` : ""} went through and your subscription is active.`) +
        (d.invoiceUrl ? p(`<a href="${esc(d.invoiceUrl)}" style="color:${COLOR.accent}">View your receipt →</a>`) : "") +
        `<div style="margin:8px 0 22px">${button(`${APP_URL}/?view=dashboard`, "Go to dashboard")}</div>`,
    }),
  };
}

function paymentFailed(d = {}) {
  return {
    subject: `Action needed: your payment didn't go through`,
    html: layout({
      preheader: `Update your card to keep your subscription active.`,
      body:
        h("Your payment didn't go through") +
        hi(d.name) +
        p(`We couldn't process your latest payment${d.amount ? ` of ${esc(d.amount)}` : ""}. This usually means an expired card or insufficient funds.`) +
        p(`We'll retry automatically, but updating your payment method now is the fastest way to avoid any interruption.`) +
        `<div style="margin:8px 0 22px">${button(d.portalUrl || `${APP_URL}/?view=account`, "Update payment method")}</div>` +
        p(`<span style="color:${COLOR.muted}">Already fixed it? You can ignore this email.</span>`),
    }),
  };
}

function subscriptionCancelled(d = {}) {
  return {
    subject: `Your subscription has been cancelled`,
    html: layout({
      preheader: `We'd love to know why — and you can come back anytime.`,
      body:
        h("Your subscription is cancelled") +
        hi(d.name) +
        p(`Your ${esc(d.planName || "subscription")} has been cancelled and your account will move to the free plan. Your audits and data stay safe.`) +
        p(`Mind telling us why you left? It takes 20 seconds and genuinely shapes what we build next.`) +
        `<div style="margin:8px 0 14px">${button(d.surveyUrl || `${APP_URL}/?view=account`, "Share quick feedback")}</div>` +
        p(`<span style="color:${COLOR.muted}">Changed your mind? <a href="${esc(APP_URL)}/?view=account" style="color:${COLOR.accent}">Reactivate your plan →</a></span>`),
    }),
  };
}

function reengagement(d = {}) {
  return {
    subject: `Your next audit is waiting`,
    html: layout({
      preheader: `Pick up where you left off — find your next revenue opportunity.`,
      body:
        h("Find your next opportunity") +
        hi(d.name) +
        p(`It's been a while. Every business changes — sites get slower, new automation gaps appear, and competitors move. A fresh audit takes about a minute and shows exactly where the money is.`) +
        `<div style="margin:8px 0 22px">${button(`${APP_URL}/?view=scan`, "Run a fresh audit")}</div>` +
        p(`<span style="color:${COLOR.muted}">Want unlimited audits and tracking over time? <a href="${esc(APP_URL)}/?view=account" style="color:${COLOR.accent}">See plans →</a></span>`),
    }),
  };
}

// Activation nudge sequence (Growth OS) — goes to the PROSPECT to convert an
// audit into a booked call. 3 touches (immediate / 24h / 7d), each personalized
// with the business name, audit score, revenue opportunity, and the operator's
// booking link as the primary CTA (so a click is tracked and a call gets booked).
// The operator explicitly arms this per-deal with a real prospect email + link.
function activationNudge(d = {}, step = 0) {
  const biz = d.businessName ? esc(d.businessName) : "your business";
  const rev = d.revenueOpportunity ? esc(String(d.revenueOpportunity)) : null;
  const score = Number.isFinite(d.score) ? `${d.score}/100` : null;
  const book = d.bookingUrl || `${APP_URL}`;
  const STEPS = [
    {
      subject: rev ? `${d.businessName || "Your business"}: we found ${d.revenueOpportunity} in monthly opportunity` : `Your audit for ${d.businessName || "your business"} is ready`,
      preheader: "Here's what your audit found — and the fastest way to act on it.",
      heading: "Here's what your audit found",
      lead: `We ran an audit on <strong>${biz}</strong>${rev ? ` and found about <strong>${rev}</strong> in recoverable revenue every month` : ""}${score ? ` (current score: <strong>${score}</strong>)` : ""}.`,
      body2: "The biggest gaps are quietly costing you customers. The fastest way to see the full plan and what it's worth is a quick 15-minute call.",
      btn: "Book your 15-minute call",
    },
    {
      subject: rev ? `Still leaving ${d.revenueOpportunity} on the table?` : `A quick follow-up on ${d.businessName || "your"} audit`,
      preheader: "Every week these gaps stay open is money lost.",
      heading: rev ? `${rev}/month is still on the table` : "Your audit is still waiting",
      lead: `Yesterday we shared the audit for <strong>${biz}</strong>. ${rev ? `That ${rev}/month doesn't recover itself` : "Those gaps don't close themselves"} — every week costs more.`,
      body2: "It takes 15 minutes to walk through exactly where the money is going and how we'd fix it for you. No pressure, no obligation.",
      btn: "Grab a 15-minute slot",
    },
    {
      subject: `Last note about ${d.businessName || "your"} audit`,
      preheader: "Closing the loop — the offer's open whenever you are.",
      heading: "Should I close your file?",
      lead: `I haven't heard back, so I'll assume the timing isn't right for <strong>${biz}</strong> — totally understandable.`,
      body2: `If you ever want to recover ${rev ? `that ${rev}/month` : "the revenue we found"}, the audit and the plan are ready whenever you are. One click books a time:`,
      btn: "Book a call",
    },
  ];
  const s = STEPS[step] || STEPS[0];
  return {
    subject: s.subject,
    html: layout({
      footerKind: "prospect",
      preheader: s.preheader,
      body:
        h(s.heading) +
        hi(d.name) +
        p(s.lead) +
        p(s.body2) +
        `<div style="margin:8px 0 20px">${button(book, s.btn)}</div>` +
        p(`<span style="color:${COLOR.muted}">Prefer email? Just reply to this message.</span>`) +
        (d.senderCompany ? p(`<span style="color:${COLOR.muted}">— ${esc(d.senderCompany)}</span>`) : ""),
    }),
  };
}

// Public funnel — audit summary to the PROSPECT after they submit their email on
// the free public audit. Their results + top gaps + a book-a-call CTA (the funnel
// owner's booking link). Soft opt-in: they submitted their email for this report.
function publicAuditSummary(d = {}) {
  const biz = d.businessName ? esc(d.businessName) : "your business";
  const rev = d.revenueOpportunity ? esc(String(d.revenueOpportunity)) : null;
  const score = Number.isFinite(d.score) ? `${d.score}/100` : null;
  const findings = Array.isArray(d.findings) ? d.findings.slice(0, 3) : [];
  const book = d.bookingUrl || APP_URL;
  return {
    subject: rev ? `${d.businessName || "Your"} audit: ${d.revenueOpportunity} in monthly opportunity` : `Your free audit for ${d.businessName || "your business"}`,
    html: layout({
      footerKind: "prospect",
      preheader: "Your audit results + the fastest fixes.",
      body:
        h(`Your audit for ${biz}`) +
        p(`Here's the snapshot from your free audit${score ? `. Overall score: <strong>${esc(score)}</strong>` : ""}.`) +
        (rev ? p(`We estimate <strong>${rev}</strong> in recoverable revenue every month from the gaps we found.`) : "") +
        (findings.length ? `<ul style="margin:0 0 16px;padding-left:20px;color:${COLOR.text}">${findings.map((f) => `<li style="margin-bottom:6px">${esc(f)}</li>`).join("")}</ul>` : "") +
        p("The fastest way to turn this into booked customers is a quick 15-minute call — we'll walk you through the plan and exactly what it's worth.") +
        `<div style="margin:8px 0 20px">${button(book, "Book your 15-minute call")}</div>` +
        (d.senderCompany ? p(`<span style="color:${COLOR.muted}">— ${esc(d.senderCompany)}</span>`) : ""),
    }),
  };
}

// Operator follow-up reminder (Growth OS CRM). Goes to the DEAL OWNER — never
// the prospect — so the shared sending domain's reputation is never exposed to
// cold outreach. It nudges the operator to work a due deal.
function followupReminder(d = {}) {
  const biz = d.businessName ? esc(d.businessName) : "a deal";
  const contact = d.contactName ? esc(d.contactName) : null;
  return {
    subject: `⏰ Follow-up due: ${d.businessName || "a deal"}`,
    html: layout({
      preheader: `A deal in your pipeline is due for follow-up.`,
      body:
        h("A deal is due for follow-up") +
        hi(d.name) +
        p(`Your follow-up for <strong>${biz}</strong>${contact ? ` (${contact})` : ""} is due${d.when ? ` — scheduled for ${esc(d.when)}` : ""}.`) +
        (d.note ? p(`<span style="color:${COLOR.muted}">Last note:</span> ${esc(d.note)}`) : "") +
        (d.contactEmail ? p(`<span style="color:${COLOR.muted}">Reach them at:</span> <a href="mailto:${esc(d.contactEmail)}" style="color:${COLOR.accent}">${esc(d.contactEmail)}</a>`) : "") +
        `<div style="margin:8px 0 22px">${button(`${APP_URL}/?view=leads`, "Open the deal")}</div>` +
        p(`<span style="color:${COLOR.muted}">Outreach copy and the proposal are ready on the deal — open it and send the next touch.</span>`),
    }),
  };
}

// Registry. Keys must match email_log.template and the dedupe_key prefixes.
export const TEMPLATES = {
  audit_complete:        (d) => auditComplete(d),
  trial_started:         (d) => trialStarted(d),
  trial_ending_3d:       (d) => trialEnding(d, 3),
  trial_ending_1d:       (d) => trialEnding(d, 1),
  payment_succeeded:     (d) => paymentSucceeded(d),
  payment_failed:        (d) => paymentFailed(d),
  subscription_cancelled:(d) => subscriptionCancelled(d),
  reengagement:          (d) => reengagement(d),
  followup_reminder:     (d) => followupReminder(d),
  activation_immediate:  (d) => activationNudge(d, 0),
  activation_24h:        (d) => activationNudge(d, 1),
  activation_7d:         (d) => activationNudge(d, 2),
  public_audit_summary:  (d) => publicAuditSummary(d),
};

// Render a template by key. Throws on unknown key so a typo fails loudly in dev.
export function renderTemplate(template, data = {}) {
  const fn = TEMPLATES[template];
  if (!fn) throw new Error(`unknown-email-template:${template}`);
  return fn(data);
}
