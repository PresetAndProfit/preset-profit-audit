// ─────────────────────────────────────────────────────────────────────────────
// outreachEngine.js
// THE CONVERSION KEYSTONE. A downloaded proposal closes nothing on its own —
// what books the call is personalized outreach that quotes the prospect's OWN
// revenue leak, top gap, and payback. This pure engine turns an audit (+ its
// derived roadmap) into ready-to-send copy: cold email, short email, a 3-touch
// follow-up sequence, LinkedIn DM, SMS, voicemail, and a call script.
//
// Pure + deterministic, mirrors roadmapEngine.js (zero network). Output persists
// per-Deal in audits.crm.outreach so follow-ups reuse the thread.
// ─────────────────────────────────────────────────────────────────────────────

import { generateRoadmap, usd } from "./roadmapEngine.js";

const firstName = s => (s ? String(s).trim().split(/\s+/)[0] : "");

function ground(report) {
  const rm = generateRoadmap(report);
  const top = rm.solutions[0] || null;
  const topGap = top?.addressedWeaknesses?.[0]?.issue
    || (report.weaknesses && report.weaknesses[0]?.issue)
    || "leads slipping through the cracks before anyone follows up";
  return {
    rm,
    biz: report.businessName,
    industry: (report.industry || "business").toLowerCase(),
    city: report.city || "",
    siteRef: report.siteRef || report.website || "your website",
    score: report.overallScore,
    monthly: rm.totals.monthlyImpact,
    annual: rm.totals.annualImpact,
    roi: rm.totals.roiMultiple,
    payback: rm.totals.paybackMonths,
    topFix: top ? top.consumerName : "automated follow-up",
    topFixImpact: top ? top.monthlyImpact : rm.totals.monthlyImpact,
    bundle: rm.bundle ? rm.bundle.name : null,
    topGap: String(topGap).replace(/\.$/, "").toLowerCase(),
    nSystems: rm.solutions.length,
  };
}

export function generateOutreach(report, { senderName = "", senderCompany = "Preset & Profit", toName = "" } = {}) {
  if (!report) return null;
  const g = ground(report);
  const hi = firstName(toName) || "there";
  const sign = senderName || senderCompany;
  const senderShort = senderName ? firstName(senderName) : senderCompany;
  const industryTitle = report.industry || "business";
  const cityClause = g.city ? ` in ${g.city}` : "";
  const m = usd(g.monthly), a = usd(g.annual);

  // ── Subject lines (operator can A/B these) ────────────────────────────────
  const subjectLines = [
    `${g.biz} is leaving ~${m}/mo on the table`,
    `Quick question about ${g.biz}'s ${industryTitle} leads`,
    `Found ${usd(g.topFixImpact)}/mo hiding in ${g.biz}'s website`,
    `${g.biz} — ${g.roi}× ROI idea (2 min)`,
  ];

  // ── Cold email (detailed, value-first) ────────────────────────────────────
  const coldEmail = {
    subject: subjectLines[0],
    preview: `A 30-second look at why ${g.biz} is missing ${g.industry} customers.`,
    body:
`Hi ${hi},

I ran a quick audit of ${g.biz}${cityClause} and found something costing you real money: ${g.topGap}.

Adding it up, ${g.biz} is likely leaving about ${m} every month on the table — roughly ${a} a year — mostly from ${g.industry} customers who reach out (or try to) and never get followed up with.

The single highest-impact fix is ${g.topFix.toLowerCase()}, which alone could recover about ${usd(g.topFixImpact)}/mo, and it runs on autopilot once it's set up. I've mapped out ${g.nSystems} systems${g.bundle ? ` (packaged as the ${g.bundle})` : ""} that close the gaps — done-for-you, live within about a week, no work on your end.

Want me to send over the full breakdown with the numbers? Or grab 15 minutes here and I'll walk you through exactly where the ${m}/mo is going: [your calendar link]

— ${sign}`,
  };

  // ── Short email (punchy, for busy owners) ─────────────────────────────────
  const shortEmail = {
    subject: subjectLines[1],
    body:
`Hi ${hi},

Quick one — I audited ${g.biz} and you're losing ~${m}/mo to ${g.topGap}.

Fixable in about a week, done-for-you, ${g.roi}× first-year ROI. Worth 15 minutes?

— ${sign}`,
  };

  // ── 3-touch follow-up sequence ────────────────────────────────────────────
  const followUps = [
    {
      day: 3, channel: "email",
      subject: `Re: ${subjectLines[0]}`,
      body:
`Hi ${hi},

Floating this back up. The ${m}/mo gap at ${g.biz} doesn't fix itself — every month it's another ${m} gone.

I put together a one-page plan showing the ${g.nSystems} systems and what each recovers. Want me to send it?

— ${sign}`,
    },
    {
      day: 7, channel: "email",
      subject: `One number for ${g.biz}`,
      body:
`Hi ${hi},

If ${g.topFix} recovered even half of what I modeled, that's ~${usd(Math.round(g.topFixImpact / 2))}/mo back to ${g.biz} — for a system that pays for itself in ${g.payback != null ? `${g.payback} months` : "weeks"}.

Happy to set it up and prove it. 15 minutes this week?

— ${sign}`,
    },
    {
      day: 12, channel: "email",
      subject: `Should I close your file?`,
      body:
`Hi ${hi},

Haven't heard back, so I'll assume the timing isn't right — no worries.

If ${g.biz} ever wants the ${m}/mo back, the audit and plan are ready whenever you are. Just reply "send it."

— ${sign}`,
    },
  ];

  // ── Other channels ────────────────────────────────────────────────────────
  const linkedinDM =
`Hi ${hi} — I help ${g.industry} businesses${cityClause} stop losing leads to slow/no follow-up. Ran a quick look at ${g.biz} and spotted ~${m}/mo being left on the table (mostly ${g.topGap}). Mind if I send over the 2-minute breakdown?`;

  const sms =
`Hi ${hi}, it's ${senderShort} — I audited ${g.biz} and found ~${m}/mo in missed ${g.industry} revenue (${g.topGap}). Can I send you the quick breakdown?`;

  const voicemail =
`Hi ${hi}, ${senderShort} here. I ran an audit on ${g.biz} and found about ${m} a month slipping away from ${g.topGap}. I've got a simple done-for-you fix that pays for itself fast. Shoot me a text or call back and I'll walk you through it in 15 minutes. Thanks ${hi}.`;

  const callScript = {
    opener: `Hi, is this ${hi}? Great — I'll be quick. I run automation systems for ${g.industry} businesses${cityClause}, and I actually audited ${g.biz}'s setup before calling. Do you have 60 seconds?`,
    hook: `So here's what jumped out: ${g.topGap}. That one gap is costing ${g.biz} roughly ${m} a month — about ${a} a year — in customers who reach out but never get followed up with.`,
    pitch: `The fix is ${g.topFix.toLowerCase()} — it runs automatically, we build the whole thing for you, and it's usually live within a week. Most clients see it pay for itself in ${g.payback != null ? `about ${g.payback} months` : "the first few weeks"}.`,
    objection: `Totally fair if you're busy — that's exactly the point, this runs without you touching it. All I'm asking for is 15 minutes to show you where the ${m}/mo is going. Worst case, you walk away with a free audit.`,
    close: `What does your Thursday look like — morning or afternoon better for a quick screen-share?`,
  };

  return {
    generatedAt: new Date().toISOString(),
    business: { name: g.biz, industry: report.industry, city: g.city },
    headline: { monthly: m, annual: a, roi: `${g.roi}×`, topFix: g.topFix, bundle: g.bundle },
    subjectLines,
    coldEmail,
    shortEmail,
    followUps,
    linkedinDM,
    sms,
    voicemail,
    callScript,
  };
}

// Compact, serializable copy to persist on the Deal (no need to store the full
// generated object — it's re-derivable; we keep just what aids the operator).
export function outreachSummary(outreach) {
  if (!outreach) return null;
  return {
    at: outreach.generatedAt,
    subject: outreach.coldEmail.subject,
    monthly: outreach.headline.monthly,
    roi: outreach.headline.roi,
  };
}
