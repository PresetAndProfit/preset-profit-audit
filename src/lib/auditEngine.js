import { mkRand, shuffle, uid } from "./helpers.js";
import { calcROI } from "./roiCalc.js";
import {
  LEAD_FINDINGS_POOL,
  WEBSITE_FINDINGS_POOL,
  AUTOMATION_POOL,
  INDUSTRY_REV,
  INDUSTRY_JOB_VALUE,
  INDUSTRY_NO_SHOW_RATE,
  INDUSTRY_MISSED_CALL_RATE,
  RECOMMENDATIONS,
  THIRTY_DAY_BY_GOAL,
  GOAL_AUTO_MAP,
  TECH_STACKS,
  QUICK_WINS_POOL,
} from "./constants.js";

// ─────────────────────────────────────────────────────────────────────────────
// PERSONALIZATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// Grammatical list join: ["a","b","c"] -> "a, b, and c"
const listJoin = arr =>
  arr.length <= 1 ? (arr[0] || "")
  : arr.length === 2 ? `${arr[0]} and ${arr[1]}`
  : `${arr.slice(0, -1).join(", ")}, and ${arr[arr.length - 1]}`;
const firstLower = s => (s ? s.charAt(0).toLowerCase() + s.slice(1) : s);
const stripDot   = s => (s || "").replace(/\.\s*$/, "");

function findingPersonalNote(label, { bizName, siteRef, industry, city, avgJobValue, monthlyJobs, noShowRate }) {
  const cityRef = city || "your area";
  const noShows = Math.round(monthlyJobs * noShowRate);
  const notes = {
    "No chat window on your website":
      `Most ${industry} enquiries happen after 6pm. Right now, ${siteRef} has no way to capture those visitors.`,
    "No clear 'book now' or 'call us' button at the top of your page":
      `On a phone screen, ${siteRef} needs a visible booking option within the first scroll — or people leave.`,
    "No free offer to get people to contact you":
      `Competing ${industry} businesses in ${cityRef} typically offer a free quote or consultation. ${bizName} doesn't.`,
    "Phone number is hard to find on your website":
      `A ${industry} customer who can't find ${bizName}'s number in 5 seconds will Google the next option.`,
    "No way for people to book online":
      `${bizName} requires a phone call to book. Competitors in ${cityRef} let people book at midnight on their phone.`,
    "No automatic follow-up when someone contacts you":
      `When someone contacts ${bizName} but doesn't book, nothing follows up automatically. Most move on to a competitor.`,
    "Your contact button says something vague like 'Submit' or 'Contact Us'":
      `A button that says "Book a Free ${industry} Consultation" outperforms "Contact Us" by 30–40%. ${bizName}'s current button is leaving bookings on the table.`,
    "Your reviews only appear on the homepage":
      `People deciding whether to choose ${bizName} look at your service pages — and that's where your reviews aren't showing.`,
    "Nothing stops people from leaving your website without contacting you":
      `${siteRef} has no way to recapture someone who visits and leaves without booking.`,
    "Booking confirmations are sent manually":
      `Every ${bizName} booking confirmation requires someone to send it manually. That's time every ${industry} business in ${cityRef} is automating.`,
    "Your contact form is too far down the page":
      `Most people visiting ${siteRef} on a phone won't scroll to find a buried contact form.`,
    "People can reach you by phone, email, and a contact form":
      `${bizName} gives potential customers multiple ways to reach out — that removes friction and increases contacts.`,
    "It's clear what you do and why people should choose you":
      `${bizName}'s website communicates its value immediately. That's one of the hardest things to get right.`,
    "People can book online directly from your website":
      `${siteRef} lets people book themselves — a real competitive advantage over ${industry} businesses in ${cityRef} that require a call.`,
    "Your reviews are shown where people are making decisions":
      `${bizName}'s reviews appear at the right point in the decision process. This builds trust exactly when it matters.`,
    "Every page has an easy way for people to get in touch":
      `Every page on ${siteRef} makes it easy to contact or book — nothing gets in the way.`,
    "Your website loads too slowly on phones":
      `${siteRef} is loading slowly on phones — and most ${industry} customers in ${cityRef} are searching on their phone.`,
    "Your website is hard to use on a phone":
      `Most ${industry} searches in ${cityRef} happen on a phone. ${siteRef} needs to be perfect on a small screen.`,
    "Your Google business listing isn't set up":
      `When someone in ${cityRef} searches for a ${industry.toLowerCase()} business, ${bizName} may not be showing in the map results.`,
    "Your website pages don't show a preview in Google search results":
      `When ${siteRef} appears in Google, it shows no description. People skip past it and click results that do.`,
    "Your website is not marked as secure":
      `${siteRef} shows as "Not Secure" in browsers. That warning puts off new customers before they read a word.`,
    "Your website images are too large — it makes the site slow":
      `Large images on ${siteRef} slow it down. Every extra second of loading time costs ${bizName} potential customers.`,
    "Your website hasn't been updated in over 6 months":
      `Google quietly moves stale websites down in search results. ${siteRef} may have slipped without ${bizName} noticing.`,
    "Google can't show your hours or reviews directly in search results":
      `With a simple fix, ${bizName}'s hours, rating, and FAQs could appear directly in Google search results before anyone clicks.`,
    "Your website doesn't show enough signs that you can be trusted":
      `First-time visitors to ${siteRef} need more signals that ${bizName} is trustworthy — certifications, badges, or affiliations.`,
    "No videos on your service pages":
      `A short video on ${siteRef}'s service pages would keep visitors there longer and make them more likely to book ${bizName}.`,
    "Your site works well on phones":
      `${siteRef} is mobile-friendly — that matters because most ${industry} searches in ${cityRef} happen on a phone.`,
    "Your website looks professional and consistent":
      `${bizName}'s website makes a strong first impression. That consistency builds trust with new visitors.`,
    "Your website is secure":
      `${siteRef} is marked as secure. Both visitors and Google see this as a sign ${bizName} is trustworthy.`,
    "Your Google business listing is active":
      `${bizName}'s Google listing is set up and visible — people in ${cityRef} can find you easily.`,
    "Your website loads quickly":
      `${siteRef} loads fast — people don't click away, and Google rewards ${bizName} in search results.`,
  };
  return notes[label] || null;
}

function automationPersonalIntro(name, { bizName, industry, city, avgJobValue, monthlyJobs, noShowRate }) {
  const cityRef = city ? `in ${city}` : "in your area";
  const noShows = Math.round(monthlyJobs * noShowRate);
  const $ = n => `$${Math.round(n).toLocaleString()}`;
  switch (name) {
    case "Missed Call Text Back":
      return `Every missed call to ${bizName} is a potential ${industry.toLowerCase()} customer who may call a competitor next — this system texts them back within 60 seconds.`;
    case "Appointment Reminder Messages":
      return `${bizName} likely loses around ${noShows} appointment${noShows !== 1 ? "s" : ""} a month to no-shows worth roughly ${$(noShows * avgJobValue)}. Most don't mean to cancel — they simply forget.`;
    case "Automatic Review Requests":
      return `${bizName}'s Google rating directly affects how many people ${cityRef} choose you over other ${industry.toLowerCase()} businesses. This system builds that rating automatically after every job.`;
    case "Automatic Customer Follow-Up":
      return `When someone contacts ${bizName} but doesn't book straight away, this system follows up automatically over the next two weeks until they either book or say they're not interested.`;
    case "24/7 Website Chat":
      return `When ${bizName} is closed, ${industry.toLowerCase()} customers are still searching online — and competitors with a chat window are capturing those enquiries while ${bizName} misses them.`;
    case "Customer Enquiry Tracker":
      return `Right now, some of ${bizName}'s enquiries are almost certainly getting lost or forgotten. This system makes sure every single one is tracked and followed up.`;
    case "Monthly Customer Emails":
      return `${bizName}'s past customers are the easiest people in the world to sell to — they already like you. A monthly email keeps you top of mind before they go elsewhere.`;
    case "Win-Back Messages":
      return `${bizName} has customers who haven't been back in months but would return with the right prompt. This system identifies them and sends a personal message that brings them back.`;
    case "Online Booking":
      return `${industry} customers ${cityRef} want to book ${bizName} at 9pm on a Sunday. Right now they can't — and they're booking someone else instead.`;
    default:
      return `This system is specifically suited to a ${industry.toLowerCase()} business like ${bizName}.`;
  }
}

function buildPersonalRecommendation(goal, { bizName, siteRef, city, totalMonthlyOpportunity, industry }) {
  const cityRef = city ? ` in ${city}` : "";
  switch (goal) {
    case "More Leads":
      return `We add a chat window to ${siteRef}, set up automatic text replies for every missed call to ${bizName}, and make sure every enquiry gets followed up. No potential ${industry.toLowerCase()} customer who contacts ${bizName} will ever go without a response.`;
    case "More Appointments":
      return `We add an online booking page to ${siteRef}, set up automatic reminders before every ${bizName} appointment, and follow up automatically with anyone who cancels. ${bizName}'s calendar fills itself.`;
    case "Better Follow-Up":
      return `Every person who contacts ${bizName} but doesn't book immediately gets a friendly series of texts and emails over the next two weeks — completely automatically. Your team does nothing extra.`;
    case "More Reviews":
      return `After every job, ${bizName}'s customers get a short text asking for a Google review. New reviews are automatically shared on social media. ${bizName}'s reputation builds itself${cityRef} without anyone on your team doing a thing.`;
    case "Save Staff Time":
      return `We connect ${siteRef}'s booking, ${bizName}'s follow-up messages, and your review requests so everything runs by itself. Your team stops doing the same tasks every single day.`;
    default:
      return `We build and manage the systems that keep ${bizName} growing — so you can focus on the work, not the admin.`;
  }
}

function personalizePlan(plan, { bizName, siteRef }) {
  const inject = text => text
    .replace(/\byour site\b/gi, siteRef)
    .replace(/\byour website\b/gi, siteRef)
    .replace(/\byour business\b/gi, bizName);
  const p = phase => ({ ...phase, actions: phase.actions.map(inject) });
  return { phase1: p(plan.phase1), phase2: p(plan.phase2), phase3: p(plan.phase3) };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN AUDIT GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

export function generateAudit(form, siteAnalysis = null) {
  const { bizName, industry, city, goal, tools, email } = form;
  const rawUrl  = (form.url || "").trim();
  const url     = rawUrl ? rawUrl.replace(/^https?:\/\//i, "").replace(/\/$/, "") : "their website";
  const siteRef = url !== "their website" ? url : `${bizName}'s website`;
  const cityRef = city ? `in ${city}` : "in your area";

  const seed = bizName + industry + rawUrl + goal;
  const rand = mkRand(seed);
  const rng  = (min, max) => Math.floor(rand() * (max - min + 1)) + min;

  const avgJobValue    = INDUSTRY_JOB_VALUE[industry]        || 150;
  const noShowRate     = INDUSTRY_NO_SHOW_RATE[industry]     || 0.15;
  const missedCallRate = INDUSTRY_MISSED_CALL_RATE[industry] || 0.25;

  const [revMin, revMax] = INDUSTRY_REV[industry] || [1000, 5000];
  const revenueAmount    = rng(revMin, revMax);
  const monthlyJobs      = Math.max(2, Math.round(revenueAmount / avgJobValue));

  // ── Findings + scores ───────────────────────────────────────────────────────
  // If we actually scanned the live site, the findings ARE the evidence and the
  // scores are derived from them. Otherwise we fall back to industry-typical
  // findings (clearly flagged as not site-specific).
  const noteCtx = { bizName, siteRef, industry, city, avgJobValue, monthlyJobs, noShowRate };
  const scan = siteAnalysis && siteAnalysis.ok && Array.isArray(siteAnalysis.findings) && siteAnalysis.findings.length
    ? siteAnalysis : null;

  // When the server ran the AI consultant on a real scrape, its site-grounded
  // findings ARE the report. Otherwise fall back to the scan heuristics, then to
  // the industry-typical template pool.
  const aiReport = scan && siteAnalysis.aiGenerated && siteAnalysis.ai ? siteAnalysis.ai : null;

  let leadFindings, websiteFindings, overallScore, leadScore, websiteScore;

  const rank = { bad: 0, warn: 1, good: 2 };
  const sortF = arr => [...arr].sort((a, b) => rank[a.status] - rank[b.status]);
  const scoreOf = arr => {
    if (!arr.length) return 70;
    let s = 72;
    for (const f of arr) s += f.status === "good" ? 6 : f.status === "warn" ? -8 : -15;
    return Math.max(30, Math.min(97, Math.round(s)));
  };

  if (aiReport) {
    // Map the consultant's findings into the report's finding shape. Lead-side
    // areas (leads/conversion/retention) vs site-side (website/trust/local).
    const mapped = aiReport.findings.map(f => ({
      label: f.title,
      status: f.status,
      area: ["leads", "conversion", "retention"].includes(f.area) ? "leads" : "website",
      what: f.observation,
      why: f.impact,
      proof: f.grounded ? `${f.observation} (${f.evidence})` : f.observation,
      fix: f.recommendation,
      detail: f.impact,
      personalNote: f.observation,
      grounded: f.grounded,
    }));
    leadFindings    = sortF(mapped.filter(f => f.area === "leads"));
    websiteFindings = sortF(mapped.filter(f => f.area === "website"));
    leadScore    = scoreOf(leadFindings);
    websiteScore = scoreOf(websiteFindings);
    overallScore = Math.round((leadScore + websiteScore) / 2);
  } else if (scan) {
    leadFindings    = sortF(scan.findings.filter(f => f.area === "leads"));
    websiteFindings = sortF(scan.findings.filter(f => f.area === "website"));
    leadScore    = scoreOf(leadFindings);
    websiteScore = scoreOf(websiteFindings);
    overallScore = Math.round((leadScore + websiteScore) / 2);
  } else {
    overallScore = rng(55, 92);
    leadScore    = Math.max(32, Math.min(96, overallScore + rng(-18, 12)));
    websiteScore = Math.max(32, Math.min(96, overallScore + rng(-12, 14)));

    const lBad  = shuffle(LEAD_FINDINGS_POOL.filter(f => f.status === "bad"),  rand);
    const lWarn = shuffle(LEAD_FINDINGS_POOL.filter(f => f.status === "warn"), rand);
    const lGood = shuffle(LEAD_FINDINGS_POOL.filter(f => f.status === "good"), rand);
    let rawLF;
    if      (leadScore < 55) rawLF = [...lBad.slice(0,3), ...lWarn.slice(0,2), ...lGood.slice(0,1)];
    else if (leadScore < 70) rawLF = [...lBad.slice(0,2), ...lWarn.slice(0,2), ...lGood.slice(0,2)];
    else if (leadScore < 82) rawLF = [...lBad.slice(0,1), ...lWarn.slice(0,2), ...lGood.slice(0,2)];
    else                     rawLF = [...lWarn.slice(0,1), ...lGood.slice(0,4)];
    leadFindings = rawLF.map(f => ({ ...f, personalNote: findingPersonalNote(f.label, noteCtx) }));

    const wBad  = shuffle(WEBSITE_FINDINGS_POOL.filter(f => f.status === "bad"),  rand);
    const wWarn = shuffle(WEBSITE_FINDINGS_POOL.filter(f => f.status === "warn"), rand);
    const wGood = shuffle(WEBSITE_FINDINGS_POOL.filter(f => f.status === "good"), rand);
    let rawWF;
    if      (websiteScore < 55) rawWF = [...wBad.slice(0,3), ...wWarn.slice(0,2), ...wGood.slice(0,1)];
    else if (websiteScore < 70) rawWF = [...wBad.slice(0,2), ...wWarn.slice(0,2), ...wGood.slice(0,2)];
    else if (websiteScore < 82) rawWF = [...wBad.slice(0,1), ...wWarn.slice(0,2), ...wGood.slice(0,2)];
    else                        rawWF = [...wWarn.slice(0,1), ...wGood.slice(0,4)];
    websiteFindings = rawWF.map(f => ({ ...f, personalNote: findingPersonalNote(f.label, noteCtx) }));
  }

  const status = overallScore >= 80 ? "hot" : overallScore >= 65 ? "warm" : "cold";

  // ── Personalized score labels ─────────────────────────────────────────────
  const scoreLabels = {
    overall: overallScore >= 80
      ? `${bizName} is performing well — above average for ${industry}`
      : overallScore >= 65
      ? `${bizName} has clear gaps that are costing real customers`
      : `${bizName} needs attention — customers are going to competitors instead`,
    lead: leadScore >= 80
      ? `${bizName} is picking up new ${industry.toLowerCase()} customers effectively`
      : leadScore >= 65
      ? `${bizName} is missing customers that should be choosing you`
      : `${bizName} is losing ${industry.toLowerCase()} customers to competitors daily`,
    website: websiteScore >= 80
      ? `${siteRef} is converting visitors into customers`
      : websiteScore >= 65
      ? `${siteRef} needs work — visitors are leaving without booking`
      : `${siteRef} is actively losing customers for ${bizName}`,
  };

  // ── Automations ───────────────────────────────────────────────────────────
  const preferredNames = GOAL_AUTO_MAP[goal] || GOAL_AUTO_MAP["More Leads"];
  const preferred      = AUTOMATION_POOL.filter(a => preferredNames.includes(a.name));
  const remaining      = shuffle(AUTOMATION_POOL.filter(a => !preferredNames.includes(a.name)), rand);
  const autoPool       = [...shuffle(preferred, rand), ...remaining];

  const introCtx = { bizName, industry, city, avgJobValue, monthlyJobs, noShowRate };
  const automations = autoPool.slice(0, 4).map((a, i) => {
    const breakdown = calcROI(a.name, {
      avgJobValue, monthlyJobs, missedCallRate, noShowRate,
      leadCloseRate: 0.13,
      industry, bizName,
    });
    return {
      ...a,
      priority: i + 1,
      roi: `$${breakdown.roiAmt.toLocaleString()}/mo`,
      roiAmt: breakdown.roiAmt,
      roiBreakdown: breakdown,
      personalIntro: automationPersonalIntro(a.name, introCtx),
    };
  });

  const totalRev = automations.reduce((s, a) => s + a.roiAmt, 0);
  const totalMonthlyOpportunity = `$${totalRev.toLocaleString()}/month`;
  const annualOpportunity = `$${(totalRev * 12).toLocaleString()}/year`;
  const estimateBasis = `Estimated from ~${monthlyJobs} jobs/mo × $${avgJobValue.toLocaleString()} average value`;

  // ── Recommendation, plan, wins, gap ──────────────────────────────────────
  // When we actually scanned the site, the prose below is built from real
  // observations (services seen, what's working, the specific gaps + their
  // proof). Otherwise it falls back to the industry-typical template.
  const sig = scan ? scan.signals : null;
  const realIssues = scan ? [...leadFindings, ...websiteFindings].filter(f => f.status !== "good") : []; // sorted bad→warn
  const services = sig && Array.isArray(sig.services)
    ? sig.services.filter(s => s && s.length <= 36).slice(0, 3) : [];

  // Only verified positives — things the scan confirmed are already working.
  const wins = [];
  if (sig) {
    if (sig.secure)         wins.push("your site loads securely");
    if (sig.hasViewport)    wins.push("it works on phones");
    if (sig.phoneClickable) wins.push("your number is tap-to-call");
    if (sig.booking)        wins.push(sig.booking !== "booking link" ? `customers can book through ${sig.booking}` : "customers can book online");
    if (sig.rating)         wins.push(`you're showing a ${sig.rating}★ rating`);
    if (sig.chat)           wins.push(`${sig.chat} chat is live`);
  }

  const baseRec = RECOMMENDATIONS[goal] || RECOMMENDATIONS["More Leads"];
  const recDescription = buildPersonalRecommendation(goal, { bizName, siteRef, city, totalMonthlyOpportunity, industry })
    + (services.length ? ` Since ${siteRef} highlights ${listJoin(services)}, the plan below is built to convert the visitors already arriving for those into booked customers.` : "");
  const recommendation = { ...baseRec, description: recDescription };

  const thirtyDayPlan = personalizePlan(
    THIRTY_DAY_BY_GOAL[goal] || THIRTY_DAY_BY_GOAL["More Leads"],
    { bizName, siteRef }
  );

  // Quick wins: when we scanned, these ARE the fixes for what we actually found.
  let quickWins = (aiReport && Array.isArray(aiReport.quickWins) && aiReport.quickWins.length)
    ? aiReport.quickWins.slice(0, 3)
    : (scan && realIssues.length)
    ? realIssues.slice(0, 3).map(f => f.fix).filter(Boolean)
    : shuffle(QUICK_WINS_POOL.map(fn => fn(siteRef)), rand).slice(0, 3);
  if (quickWins.length < 3) {
    quickWins = [...quickWins, ...shuffle(QUICK_WINS_POOL.map(fn => fn(siteRef)), rand)].slice(0, 3);
  }

  const techStack = TECH_STACKS[industry] || ["WordPress", "Google Analytics", "Facebook Business Page"];

  // Benchmark — when scanned, anchor it to what THEY actually have vs. miss.
  let competitorGap;
  if (aiReport && aiReport.competitorBenchmark) {
    competitorGap = aiReport.competitorBenchmark;
  } else if (scan && (wins.length || realIssues.length)) {
    const haveClause = wins.length
      ? `${bizName} already has some of what the best ${industry.toLowerCase()} businesses have — ${listJoin(wins)}. ` : "";
    const missClause = realIssues.length
      ? `The gaps still open on ${siteRef}: ${listJoin(realIssues.slice(0, 3).map(f => firstLower(stripDot(f.label))))}. ` : "";
    competitorGap = `${haveClause}${missClause}The top performers in ${industry.toLowerCase()} reply to new enquiries within minutes, hold 4.7+ star ratings, and follow up 5–7 times before giving up — that's the bar we'd close the gap to.`;
  } else {
    competitorGap = `These are industry benchmarks, not a review of your specific local rivals. Across the ${industry} industry, the best-performing local businesses typically reply to every new enquiry by text within minutes, hold 4.7+ star Google ratings with 100+ reviews, and follow up 5–7 times before giving up. Many also run a website chat that answers questions and books appointments after hours. Use these as the bar to aim for — the findings above show where ${bizName} stands against it today.`;
  }

  const topWin = automations[0].name;

  // Executive summary — when scanned, written from real observations.
  let executiveSummary;
  if (aiReport && aiReport.executiveSummary) {
    executiveSummary = aiReport.executiveSummary;
  } else if (scan) {
    const serviceClause = services.length ? ` On your homepage we saw ${listJoin(services)}.` : "";
    const winsClause    = wins.length ? ` The fundamentals are in good shape — ${listJoin(wins)}.` : "";
    const top = realIssues[0];
    const issueClause = top
      ? ` But we found ${realIssues.length} thing${realIssues.length !== 1 ? "s" : ""} quietly costing you customers — the biggest being “${stripDot(top.label)}”. ${top.proof}`
      : "";
    const fixText = top && top.fix ? firstLower(stripDot(top.fix)) : topWin.toLowerCase();
    executiveSummary = `We went through ${siteRef} ourselves, page by page.${serviceClause}${winsClause}${issueClause} Add the gaps up and ${bizName} is likely leaving about ${totalMonthlyOpportunity} on the table. The highest-impact fix to make first is to ${fixText} — and everything in this report can be set up for you without any technical work on your end.`;
  } else {
    const gapArea = leadScore < 70
      ? "picking up new customers and following up with enquiries"
      : "following up with enquiries before they go cold";
    executiveSummary = `Based on this audit, ${bizName} is likely missing around ${totalMonthlyOpportunity} every month — not because business is slow, but because potential ${industry.toLowerCase()} customers are slipping through the cracks before anyone follows up with them. The biggest gap is in ${gapArea}. The best-run ${industry.toLowerCase()} businesses are already using simple systems to respond to missed calls within seconds, fill their calendars automatically, and collect Google reviews without lifting a finger. The single highest-impact thing to fix first for ${bizName} is ${topWin.toLowerCase()} — it alone could recover a significant portion of that monthly gap, and it runs on autopilot once it's set up. Everything in this report can be implemented for ${bizName} without any technical knowledge or extra staff.`;
  }

  return {
    id: uid(),
    createdAt: new Date().toISOString(),
    businessName: bizName, website: url, siteRef, industry, city, goal, tools, email,
    overallScore, leadScore, websiteScore,
    scoreLabels,
    revenueOpportunity: totalMonthlyOpportunity,
    annualOpportunity, estimateBasis,
    revenueAmount, totalRev, status,
    leadFindings, websiteFindings,
    // Real-scan provenance — drives the "we actually looked at your site" banner.
    siteScanned: !!scan,
    aiGenerated: !!aiReport,
    detectedBusinessType: aiReport ? aiReport.businessType : null,
    siteSignals: scan ? scan.signals : null,
    scannedAt: scan ? (siteAnalysis.scannedAt || new Date().toISOString()) : null,
    scanError: (!scan && siteAnalysis && siteAnalysis.ok === false) ? (siteAnalysis.error || "unreachable") : null,
    automations, totalMonthlyOpportunity,
    assumptions: {
      avgJobValue, monthlyJobs,
      missedCallRate: Math.round(missedCallRate * 100),
      noShowRate: Math.round(noShowRate * 100),
      leadCloseRate: 13,
      industry,
    },
    recommendation,
    executiveSummary,
    quickWins,
    competitorGap, techStack,
    thirtyDayPlan,
    weaknesses: [...leadFindings, ...websiteFindings]
      .filter(f => f.status !== "good").slice(0, 4)
      .map(f => ({
        category: leadFindings.some(lf => lf.label === f.label) ? `Getting New Customers to ${bizName}` : siteRef,
        issue: f.label,
        evidence: f.proof || f.personalNote || f.detail || f.why,
        lostRevenue: `$${Math.round(totalRev * (f.status === "bad" ? 0.18 : 0.10) / 50) * 50}/mo`,
      })),
    disclaimer: "These are estimates based on industry benchmarks. Your actual results will depend on how your business is set up, your local market, and how the systems are used. We show the maths so you can check our working.",
  };
}
