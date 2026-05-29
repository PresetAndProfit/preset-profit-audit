import { useState, useRef, useEffect } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// BACKEND NOTE: When you're ready to add AI, create POST /api/generate-audit
// on your server. Store your API key in process.env.ANTHROPIC_API_KEY there.
// The frontend currently uses a fully client-side audit engine (no backend needed).
// ─────────────────────────────────────────────────────────────────────────────

// ── Global styles (unchanged) ─────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=IBM+Plex+Mono:wght@300;400;500;600&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{
      --ink:#0a0a0f;--panel:#111118;--surface:#16161f;
      --border:#242430;--border-bright:#3a3a50;
      --amber:#f5a623;--amber-dim:#c47d0e;--amber-glow:rgba(245,166,35,0.12);
      --green:#00d68f;--red:#ff4757;--blue:#4a9eff;
      --text:#e8e8f0;--muted:#6b6b85;--dim:#3a3a50;
    }
    body{background:var(--ink);color:var(--text);font-family:'IBM Plex Mono',monospace}
    ::-webkit-scrollbar{width:4px}
    ::-webkit-scrollbar-track{background:var(--ink)}
    ::-webkit-scrollbar-thumb{background:var(--dim);border-radius:2px}
    @keyframes pulse-amber{0%,100%{box-shadow:0 0 0 0 rgba(245,166,35,0.4)}50%{box-shadow:0 0 0 8px rgba(245,166,35,0)}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
    .fade-up{animation:fadeUp .4s ease forwards}
    .main-layout{display:flex;min-height:100vh;background:var(--ink)}
    .sidebar{width:220px;flex-shrink:0;background:var(--panel);border-right:1px solid var(--border);display:flex;flex-direction:column;position:fixed;height:100vh;z-index:20;transition:transform .25s ease}
    .main-content{margin-left:220px;flex:1;min-height:100vh;overflow-y:auto}
    .mobile-bar{display:none}
    .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:28px}
    .pricing-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;max-width:980px;margin:0 auto}
    .form-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    .table-wrap{overflow-x:auto}
    .lead-table{width:100%;border-collapse:collapse;min-width:680px}
    .page-pad{padding:32px 40px}
    @media(max-width:900px){
      .stats-grid{grid-template-columns:1fr 1fr!important}
      .pricing-grid{grid-template-columns:1fr!important;max-width:460px}
      .form-grid-2{grid-template-columns:1fr!important}
    }
    @media(max-width:640px){
      .sidebar{transform:translateX(-100%)}
      .sidebar.open{transform:translateX(0)}
      .main-content{margin-left:0!important;padding-top:52px}
      .mobile-bar{display:flex}
      .stats-grid{grid-template-columns:1fr!important}
      .page-pad{padding:20px 16px!important}
    }
  `}</style>
);

// ── Constants ─────────────────────────────────────────────────────────────────
const SERVICE_PACKAGES = [
  {name:"Starter Audit",price:"$97",priceNote:"one-time",color:"#6b6b85",tag:"GET STARTED",highlight:false,cta:"Order Audit",
   deliverables:["Full AI Business Audit Report","Top 3 automation opportunities","Competitor gap analysis","30-day quick-win roadmap","PDF delivered within 24 hrs"]},
  {name:"Automation Setup",price:"$497+",priceNote:"per system",color:"#f5a623",tag:"MOST POPULAR",highlight:true,cta:"Book Strategy Call",
   deliverables:["Everything in Starter Audit","Done-for-you automation build","AI chatbot or booking system","CRM + follow-up sequence","30-day onboarding support","Monthly performance check-in"]},
  {name:"Growth System",price:"$997+",priceNote:"per month",color:"#4a9eff",tag:"FULL SERVICE",highlight:false,cta:"Apply Now",
   deliverables:["Complete audit + setup","Full automation stack deployed","Review generation system","Ongoing optimization & reporting","Priority Slack/text support","Quarterly strategy reviews"]},
];
const STATUS_COLORS={hot:"#ff4757",warm:"#f5a623",cold:"#4a9eff"};
const EFFORT_COLOR={low:"#00d68f",medium:"#f5a623",high:"#ff4757"};
const SEV_COLOR={critical:"#ff4757",high:"#f5a623",medium:"#4a9eff"};
const CONF_COLOR={high:"#00d68f",medium:"#f5a623",low:"#6b6b85"};
const INDUSTRIES=["Healthcare","Legal","Real Estate","Home Services","Restaurant","Automotive","Retail","Fitness","Finance","Education","Beauty & Salon","Childcare"];
const GOALS=["More Leads","More Appointments","Better Follow-Up","More Reviews","Save Staff Time"];
const STORAGE_KEY = "pp_audits_v2";

// ── Utilities ─────────────────────────────────────────────────────────────────
function strHash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < (str||"").length; i++) {
    h ^= str.charCodeAt(i);
    h = (Math.imul(h, 0x01000193)) >>> 0;
  }
  return h;
}
function mkRand(seed) {
  let s = (strHash(String(seed)) ^ 0xdeadbeef) >>> 0;
  return () => {
    s = (Math.imul(s ^ (s >>> 16), 0x45d9f3b)) >>> 0;
    s = (Math.imul(s ^ (s >>> 16), 0x45d9f3b)) >>> 0;
    return ((s ^ (s >>> 16)) >>> 0) / 0x100000000;
  };
}
function shuffle(arr, rand) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── localStorage hook ─────────────────────────────────────────────────────────
function useAudits() {
  const load = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } };
  const [audits, setAudits] = useState(load);
  const save = (audit) => {
    setAudits(prev => {
      const next = [audit, ...prev.filter(a => a.id !== audit.id)];
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const remove = (id) => {
    setAudits(prev => {
      const next = prev.filter(a => a.id !== id);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };
  return { audits, save, remove };
}

// ── Audit Engine ──────────────────────────────────────────────────────────────
const LEAD_FINDINGS_POOL = [
  {label:"No live chat or chatbot present",status:"bad",detail:"67% of service inquiries arrive outside business hours with no capture mechanism in place."},
  {label:"Missing CTA above the fold",status:"bad",detail:"Visitors must scroll before seeing any call-to-action, losing the majority of mobile traffic."},
  {label:"No lead magnet or free offer",status:"bad",detail:"Competitors offering free quotes or consultations are capturing leads this business is losing."},
  {label:"Phone number not visible in header",status:"bad",detail:"Prospects who want to call cannot find the number without scrolling or searching the page."},
  {label:"No appointment booking widget",status:"bad",detail:"Requiring phone calls to book creates friction that eliminates a large share of potential clients."},
  {label:"No automated lead follow-up",status:"bad",detail:"Leads that do not convert on first contact are never followed up with automatically."},
  {label:"Generic CTA copy ('Submit', 'Contact Us')",status:"warn",detail:"Vague CTAs underperform specific ones ('Book Free Consultation') by 30–40% in A/B tests."},
  {label:"Social proof limited to homepage only",status:"warn",detail:"Testimonials and reviews should appear on every service page, not just the homepage."},
  {label:"No exit-intent capture mechanism",status:"warn",detail:"Visitors leaving the site without converting could be recovered with a targeted offer popup."},
  {label:"Booking confirmation not automated",status:"warn",detail:"Manual confirmation emails create staff overhead and delay the response time to new clients."},
  {label:"Contact form buried below the fold",status:"warn",detail:"Form placement requires intentional effort from visitors — most mobile users will not scroll that far."},
  {label:"Multiple contact methods available",status:"good",detail:"Phone, email, and form options give every prospect their preferred way to reach out immediately."},
  {label:"Clear value proposition above fold",status:"good",detail:"Visitors immediately understand what the business does and why they should choose it over competitors."},
  {label:"Booking widget integrated on site",status:"good",detail:"Self-serve scheduling reduces friction and captures leads without requiring any staff involvement."},
  {label:"Strong social proof on key pages",status:"good",detail:"Reviews and testimonials are positioned near conversion points to build trust at the right moment."},
  {label:"Active lead capture on all key pages",status:"good",detail:"Every service page has a clear path for visitors to express interest or book immediately."},
];

const WEBSITE_FINDINGS_POOL = [
  {label:"Page speed score below 50 (Google)",status:"bad",detail:"Slow load times increase bounce rate by up to 90% on mobile — the majority of local search traffic."},
  {label:"Not fully mobile-optimized",status:"bad",detail:"Over 60% of local business searches happen on mobile devices. Poor mobile UX loses this entire segment."},
  {label:"No Google Business Profile linked",status:"bad",detail:"Without a linked GBP, the business is invisible in local map pack searches — the highest-intent traffic."},
  {label:"Missing meta descriptions on key pages",status:"bad",detail:"Pages without meta descriptions receive significantly lower click-through rates from search results."},
  {label:"No SSL certificate (not HTTPS)",status:"bad",detail:"Google flags non-HTTPS sites as 'Not Secure,' directly damaging both trust and organic search rankings."},
  {label:"Images not compressed — slow load",status:"warn",detail:"Unoptimized images add 2–4 seconds to page load time, significantly reducing conversion rates."},
  {label:"Blog content not updated in 6+ months",status:"warn",detail:"Stale content signals lower domain authority to Google and gives returning visitors nothing new."},
  {label:"Missing structured data markup",status:"warn",detail:"Schema markup enables Google to display rich results — hours, reviews, FAQs — directly in search listings."},
  {label:"Limited trust signals on site",status:"warn",detail:"Certifications, affiliations, and security badges can increase conversion rates by 20–30%."},
  {label:"No video content on service pages",status:"warn",detail:"Video increases time-on-site and conversion rates, particularly for service-based businesses."},
  {label:"Mobile-friendly design confirmed",status:"good",detail:"Site renders correctly across screen sizes, delivering a full experience to mobile visitors."},
  {label:"Strong branding and visual identity",status:"good",detail:"Consistent colors, fonts, and imagery build recognition and trust with first-time visitors."},
  {label:"SSL secure (HTTPS active)",status:"good",detail:"Secure certificate in place — both visitors and Google recognize this as a positive trust signal."},
  {label:"Active Google Business Profile",status:"good",detail:"Business appears in local map searches and collects reviews, maximizing local visibility."},
  {label:"Fast page load confirmed (under 3s)",status:"good",detail:"Optimized load speed reduces bounce rate and positively impacts organic search rankings."},
];

const AUTOMATION_POOL = [
  {name:"Missed Call Text Back",category:"Lead Gen",tool:"GoHighLevel + Twilio",effort:"low",timesSaved:"8 hrs/wk",confidence:"high",presetService:"Automation Setup $497+",
   description:"Instantly sends a personalized text to anyone who calls but can't get through, recovering leads before they dial a competitor.",
   profitAngle:"Every missed call is a lost customer. This system converts them automatically without any staff action."},
  {name:"Appointment Reminder System",category:"Scheduling",tool:"Calendly + Zapier",effort:"low",timesSaved:"10 hrs/wk",confidence:"high",presetService:"Automation Setup $497+",
   description:"Sends automated SMS and email reminders 24 hours and 1 hour before each appointment, reducing no-shows by 40–60%.",
   profitAngle:"Reducing no-shows by 25% alone can add thousands in recovered monthly revenue."},
  {name:"Review Request Automation",category:"Marketing",tool:"Podium",effort:"low",timesSaved:"5 hrs/wk",confidence:"high",presetService:"Starter Audit $97",
   description:"Triggers a personalized SMS review request 2 hours after each completed job, with a 1-tap link to your Google profile.",
   profitAngle:"More 5-star reviews equals higher map pack rankings, which equals more inbound leads without ad spend."},
  {name:"Lead Follow-Up System",category:"CRM",tool:"GoHighLevel",effort:"medium",timesSaved:"12 hrs/wk",confidence:"high",presetService:"Growth System $997+",
   description:"Sends a multi-step email and SMS sequence to every new lead over 14 days until they book an appointment or explicitly opt out.",
   profitAngle:"80% of sales happen after the 5th follow-up. Most businesses stop after one attempt."},
  {name:"AI Website Chat Assistant",category:"Lead Gen",tool:"Tidio + GPT-4o",effort:"low",timesSaved:"15 hrs/wk",confidence:"high",presetService:"Automation Setup $497+",
   description:"Answers visitor questions 24/7, qualifies leads, and books appointments directly without any staff involvement.",
   profitAngle:"Captures after-hours leads currently lost to competitors who already have chat on their sites."},
  {name:"CRM Pipeline Automation",category:"Operations",tool:"GoHighLevel",effort:"medium",timesSaved:"8 hrs/wk",confidence:"medium",presetService:"Growth System $997+",
   description:"Automatically moves leads through your pipeline stages, sends internal team alerts, and prevents any prospect from falling through the cracks.",
   profitAngle:"Organized pipelines convert 28% more leads than businesses relying on manual tracking."},
  {name:"Email Nurture Campaign",category:"Marketing",tool:"ActiveCampaign",effort:"medium",timesSaved:"6 hrs/wk",confidence:"medium",presetService:"Growth System $997+",
   description:"Keeps past customers engaged with monthly value emails and targeted re-engagement offers that generate repeat bookings on autopilot.",
   profitAngle:"Selling to an existing customer costs 5x less than acquiring a new one."},
  {name:"Reactivation SMS Campaign",category:"CRM",tool:"GoHighLevel + Twilio",effort:"low",timesSaved:"4 hrs/wk",confidence:"medium",presetService:"Automation Setup $497+",
   description:"Identifies customers who haven't returned in 90+ days and automatically sends a targeted win-back offer via SMS.",
   profitAngle:"A 5% increase in customer retention can grow total revenue by 25–95%."},
  {name:"Online Booking System",category:"Scheduling",tool:"Acuity + Square",effort:"low",timesSaved:"12 hrs/wk",confidence:"high",presetService:"Automation Setup $497+",
   description:"Self-serve booking page synced to your calendar with payment collection and automated confirmation messages.",
   profitAngle:"Businesses with online booking fill 20–30% more appointments than those requiring phone calls."},
];

const RECOMMENDATIONS = {
  "More Leads":{name:"Lead Recovery System",description:"Captures and converts missed opportunities through AI chat, call tracking, and automated multi-channel follow-up sequences. Ensures no lead goes uncontacted.",package:"Automation Setup",price:"$497+"},
  "More Appointments":{name:"Appointment Automation Suite",description:"Fills your calendar with self-serve online booking, automated reminders, and a no-show recovery sequence. Reduces admin overhead by up to 15 hours per week.",package:"Automation Setup",price:"$497+"},
  "Better Follow-Up":{name:"AI Follow-Up Engine",description:"Multi-touch email and SMS sequences that automatically contact every lead until they convert or opt out — without any manual effort from your team.",package:"Growth System",price:"$997+"},
  "More Reviews":{name:"Review Growth System",description:"Post-service SMS review requests that build your Google rating on autopilot, paired with social proof automation to turn reviews into continuous trust signals.",package:"Automation Setup",price:"$497+"},
  "Save Staff Time":{name:"Complete Automation Package",description:"End-to-end workflow automation covering lead capture, appointment booking, follow-up sequences, reviews, and reporting — eliminating repetitive manual tasks.",package:"Growth System",price:"$997+"},
};

const INDUSTRY_REV = {
  Healthcare:[3000,8000],Legal:[4000,10000],"Real Estate":[2000,7000],
  "Home Services":[1500,5000],Restaurant:[800,3000],Automotive:[1000,4000],
  Retail:[1200,4000],Fitness:[800,3000],Finance:[3000,8000],
  Education:[1000,4000],"Beauty & Salon":[600,2500],Childcare:[800,3000],
};

const THIRTY_DAY_BY_GOAL = {
  "More Leads":{
    phase1:{title:"Quick Wins (Days 1–7)",actions:["Install AI chatbot on website with lead capture and FAQ flow","Add click-to-call button prominently in mobile site header","Set up missed call text-back automation for all incoming calls"]},
    phase2:{title:"Lead System Build (Days 8–21)",actions:["Build 5-step follow-up email + SMS sequence for all new leads","Connect contact form submissions directly to CRM pipeline","Set up lead scoring to automatically prioritize highest-value prospects"]},
    phase3:{title:"Optimise & Scale (Days 22–30)",actions:["Review chatbot conversation logs and refine responses for top missed questions","A/B test two versions of homepage CTA copy to find the higher-converting option","Pull 30-day report: leads captured, response rate, cost per booked appointment"]},
  },
  "More Appointments":{
    phase1:{title:"Quick Wins (Days 1–7)",actions:["Launch self-serve online booking page linked from website header","Set up automated SMS + email confirmation for every new booking","Add booking link to Google Business Profile and all social profiles"]},
    phase2:{title:"Appointment Filling (Days 8–21)",actions:["Activate 24hr and 1hr pre-appointment reminder sequence to cut no-shows","Set up automated follow-up for cancellations offering immediate rebooking","Build waitlist system to auto-fill cancelled slots from interested clients"]},
    phase3:{title:"Optimise & Scale (Days 22–30)",actions:["Review booking conversion rate and test updated page headline or layout","Analyse no-show data to identify patterns by day, time, or service type","Generate 30-day report: bookings filled, no-show rate, staff hours recovered"]},
  },
  "Better Follow-Up":{
    phase1:{title:"Quick Wins (Days 1–7)",actions:["Set up missed call text-back to respond to every missed inquiry within 60 seconds","Create lead capture form that auto-enters contacts into CRM","Activate immediate 'Thank you for reaching out' automated response to all new leads"]},
    phase2:{title:"Nurture Sequence (Days 8–21)",actions:["Build 7-touch email + SMS follow-up sequence over 21 days for every new lead","Segment contacts by service interest to send relevant follow-up content","Set up automated win-back sequence for leads that went cold after initial contact"]},
    phase3:{title:"Optimise & Scale (Days 22–30)",actions:["Review sequence open rates and click rates; rewrite underperforming emails","Identify the follow-up touchpoint with highest conversion and double down on it","Pull full-funnel report: leads in, follow-ups sent, meetings booked, revenue closed"]},
  },
  "More Reviews":{
    phase1:{title:"Quick Wins (Days 1–7)",actions:["Set up Podium SMS review request triggered automatically after each completed job","Optimise Google Business Profile with current photos, hours, and service descriptions","Create simple internal checklist to prompt team to ask for reviews during checkout"]},
    phase2:{title:"Review Engine (Days 8–21)",actions:["Build automated sequence to re-request reviews from recent customers who didn't respond","Set up social proof automation to share new 5-star reviews on social media","Respond to all existing reviews (positive and negative) to signal active engagement to Google"]},
    phase3:{title:"Optimise & Scale (Days 22–30)",actions:["Analyse review request open and conversion rates; test new SMS copy variations","Review map pack ranking changes and document keyword improvements","Generate 30-day review growth report: requests sent, response rate, new rating average"]},
  },
  "Save Staff Time":{
    phase1:{title:"Quick Wins (Days 1–7)",actions:["Deploy online booking to eliminate all inbound 'what times are available?' calls","Set up automated appointment confirmation and reminder emails to remove manual follow-up","Activate missed call text-back so no inquiry requires a return call from staff"]},
    phase2:{title:"Workflow Automation (Days 8–21)",actions:["Map all manual staff tasks and identify the top 5 automatable workflows","Build CRM pipeline with auto-routing so leads land with the right team member","Set up automated invoice and payment follow-up to eliminate manual billing chases"]},
    phase3:{title:"Optimise & Scale (Days 22–30)",actions:["Audit remaining manual touchpoints and identify next wave of automation targets","Survey staff on which tasks are still creating the most friction or wasted time","Pull staff time-savings report: hours recovered per week by automation type"]},
  },
};

function generateAudit(form) {
  const { bizName, url, industry, city, goal, tools, email } = form;
  const seed = bizName + industry + url + goal;
  const rand = mkRand(seed);
  const rng  = (min, max) => Math.floor(rand() * (max - min + 1)) + min;

  const overallScore  = rng(55, 92);
  const leadScore     = Math.max(32, Math.min(96, overallScore + rng(-18, 12)));
  const websiteScore  = Math.max(32, Math.min(96, overallScore + rng(-12, 14)));

  // Revenue
  const [revMin, revMax] = INDUSTRY_REV[industry] || [1000, 5000];
  const revenueAmount    = rng(revMin, revMax);
  const revenueOpportunity = `$${revenueAmount.toLocaleString()}/month`;
  const status = overallScore >= 80 ? "hot" : overallScore >= 65 ? "warm" : "cold";

  // Lead findings — ratio depends on leadScore
  const lBad  = shuffle(LEAD_FINDINGS_POOL.filter(f=>f.status==="bad"),  rand);
  const lWarn = shuffle(LEAD_FINDINGS_POOL.filter(f=>f.status==="warn"), rand);
  const lGood = shuffle(LEAD_FINDINGS_POOL.filter(f=>f.status==="good"), rand);
  let leadFindings;
  if      (leadScore < 55) leadFindings = [...lBad.slice(0,3), ...lWarn.slice(0,2), ...lGood.slice(0,1)];
  else if (leadScore < 70) leadFindings = [...lBad.slice(0,2), ...lWarn.slice(0,2), ...lGood.slice(0,2)];
  else if (leadScore < 82) leadFindings = [...lBad.slice(0,1), ...lWarn.slice(0,2), ...lGood.slice(0,2)];
  else                     leadFindings = [...lWarn.slice(0,1), ...lGood.slice(0,4)];

  // Website findings
  const wBad  = shuffle(WEBSITE_FINDINGS_POOL.filter(f=>f.status==="bad"),  rand);
  const wWarn = shuffle(WEBSITE_FINDINGS_POOL.filter(f=>f.status==="warn"), rand);
  const wGood = shuffle(WEBSITE_FINDINGS_POOL.filter(f=>f.status==="good"), rand);
  let websiteFindings;
  if      (websiteScore < 55) websiteFindings = [...wBad.slice(0,3), ...wWarn.slice(0,2), ...wGood.slice(0,1)];
  else if (websiteScore < 70) websiteFindings = [...wBad.slice(0,2), ...wWarn.slice(0,2), ...wGood.slice(0,2)];
  else if (websiteScore < 82) websiteFindings = [...wBad.slice(0,1), ...wWarn.slice(0,2), ...wGood.slice(0,2)];
  else                        websiteFindings = [...wWarn.slice(0,1), ...wGood.slice(0,4)];

  // Automations — 4 picks, biased toward goal
  const goalAutoMap = {
    "More Leads":       ["AI Website Chat Assistant","Missed Call Text Back","Lead Follow-Up System","Reactivation SMS Campaign","Review Request Automation"],
    "More Appointments":["Appointment Reminder System","Online Booking System","Missed Call Text Back","Lead Follow-Up System","Review Request Automation"],
    "Better Follow-Up": ["Lead Follow-Up System","CRM Pipeline Automation","Reactivation SMS Campaign","Email Nurture Campaign","Appointment Reminder System"],
    "More Reviews":     ["Review Request Automation","Email Nurture Campaign","Reactivation SMS Campaign","Online Booking System","AI Website Chat Assistant"],
    "Save Staff Time":  ["Online Booking System","Appointment Reminder System","CRM Pipeline Automation","Missed Call Text Back","Email Nurture Campaign"],
  };
  const preferredNames = goalAutoMap[goal] || goalAutoMap["More Leads"];
  const preferred  = AUTOMATION_POOL.filter(a => preferredNames.includes(a.name));
  const remaining  = shuffle(AUTOMATION_POOL.filter(a => !preferredNames.includes(a.name)), rand);
  const autoPool   = [...shuffle(preferred, rand), ...remaining];
  const automations = autoPool.slice(0, 4).map((a, i) => {
    const multipliers = [0.32, 0.22, 0.16, 0.12];
    const roiAmt = Math.round(revenueAmount * multipliers[i] / 100) * 100;
    return { ...a, priority: i + 1, roi: `$${roiAmt.toLocaleString()}/mo` };
  });

  const totalRev = automations.reduce((s, a) => s + parseInt(a.roi.replace(/\D/g,"")), 0);
  const totalMonthlyOpportunity = `$${totalRev.toLocaleString()}/month`;

  // Recommendation
  const recommendation = RECOMMENDATIONS[goal] || RECOMMENDATIONS["More Leads"];

  // Quick wins (always practical, specific to business)
  const allQW = [
    `Add a click-to-call button in the top header of ${url||"your website"} — takes under 30 minutes`,
    `Claim and fully optimise your Google Business Profile with current photos and service list`,
    `Set up a free Calendly account and add the booking link to your website header today`,
    `Text your last 20 customers asking for a Google review — expect a 30–40% response rate`,
    `Install a free live chat widget (Tidio free plan) on your homepage this week`,
    `Create a 'New Patient / New Client Special' offer and add it above the fold on your homepage`,
    `Set up a simple missed call text-back using GoHighLevel's 14-day free trial`,
  ];
  const quickWins = shuffle(allQW, rand).slice(0, 3);

  // Tech stack (educated guess based on industry)
  const stacks = {
    Healthcare:["WordPress or Squarespace","Google Analytics","Jane App / Mindbody"],
    Legal:["WordPress","Clio or MyCase","Google Business Profile"],
    "Real Estate":["IDX WordPress","Follow Up Boss / Kvcore","Mailchimp"],
    "Home Services":["ServiceTitan / Jobber","Google Local Services Ads","WordPress"],
    Restaurant:["Toast POS","OpenTable / Yelp","Instagram Business"],
    Automotive:["DealerSocket","Google Ads","Reynolds & Reynolds"],
    Retail:["Shopify / WooCommerce","Google Analytics 4","Klaviyo"],
    Fitness:["Mindbody","Instagram Business","Mailchimp"],
    Finance:["Redtail / Wealthbox","Calendly","WordPress"],
    Education:["WordPress","Google Workspace","Mailchimp"],
    "Beauty & Salon":["Vagaro / Booksy","Instagram Business","Square"],
    Childcare:["Brightwheel","Facebook Business","WordPress"],
  };
  const techStack = stacks[industry] || ["WordPress","Google Analytics","Facebook Business Page"];

  // Competitor gap
  const competitorGap = `Top-ranked ${industry} businesses in ${city||"this market"} respond to new enquiries in under 4 minutes via automated text, maintain 4.7+ star Google ratings with 120+ reviews, and use multi-step follow-up sequences that contact leads 5–7 times before closing the file. Most are already using AI chat on their websites.`;

  // Executive summary
  const scoreLabel = overallScore >= 80 ? "strong" : overallScore >= 65 ? "moderate" : "below-average";
  const executiveSummary = `${bizName} demonstrates ${scoreLabel} overall digital performance with an audit score of ${overallScore}/100, but has significant gaps in ${leadScore < 70 ? "lead capture and" : ""} follow-up automation that are costing the business an estimated ${revenueOpportunity} in recoverable revenue every month. The primary goal of "${goal}" aligns directly with the highest-impact opportunities identified — specifically around ${automations[0].name.toLowerCase()} and ${automations[1].name.toLowerCase()}. Competitors in the ${industry} space in ${city||"this market"} have already implemented these systems and are capturing leads that ${bizName} is currently losing. Closing these gaps within 30 days is the single highest-leverage action available right now.`;

  // Thirty-day plan
  const thirtyDayPlan = THIRTY_DAY_BY_GOAL[goal] || THIRTY_DAY_BY_GOAL["More Leads"];

  // Weaknesses (derived from findings, for HTML export)
  const sevMap = {bad:"critical",warn:"high",good:"medium"};
  const allBadFindings = [...leadFindings, ...websiteFindings].filter(f => f.status !== "good");
  const weaknesses = allBadFindings.slice(0, 4).map(f => ({
    category: leadFindings.includes(f) ? "Lead Generation" : "Website Quality",
    severity: sevMap[f.status],
    confidence: f.status === "bad" ? "high" : "medium",
    issue: f.label,
    evidence: f.detail,
    impact: f.detail,
    lostRevenue: `$${Math.round(revenueAmount * (f.status==="bad"?0.18:0.10) / 50) * 50}/mo`,
  }));

  return {
    id: uid(),
    createdAt: new Date().toISOString(),
    businessName: bizName, website: url, industry, city, goal, tools, email,
    overallScore, leadScore, websiteScore,
    revenueOpportunity, revenueAmount, status,
    leadFindings, websiteFindings,
    automations, totalMonthlyOpportunity,
    recommendation,
    executiveSummary,
    quickWins,
    competitorGap, techStack,
    thirtyDayPlan, weaknesses,
    estimatedRevenue: `$${(revenueAmount * 8).toLocaleString()}–$${(revenueAmount * 14).toLocaleString()}`,
    employees: industry === "Legal" || industry === "Finance" ? "5–25" : industry === "Healthcare" ? "10–50" : "5–30",
    disclaimer: "Financial estimates are AI-generated projections based on industry benchmarks and are not guaranteed. Actual results depend on implementation quality, market conditions, and business-specific factors.",
  };
}

// ── Shared UI (unchanged) ─────────────────────────────────────────────────────
function ScoreRing({score,size=64,stroke=5}){
  const r=(size-stroke*2)/2,circ=2*Math.PI*r;
  const color=score>=80?"#00d68f":score>=60?"#f5a623":"#ff4757";
  return(
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={circ*(1-score/100)} strokeLinecap="round"
        style={{transform:"rotate(-90deg)",transformOrigin:"50% 50%",transition:"stroke-dashoffset 1.2s ease"}}/>
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        fill={color} fontSize={size*0.22} fontFamily="IBM Plex Mono" fontWeight="600">{score}</text>
    </svg>
  );
}
function Tag({children,color}){
  return <span style={{fontSize:10,letterSpacing:"0.08em",textTransform:"uppercase",fontWeight:600,padding:"3px 8px",borderRadius:3,border:`1px solid ${color}40`,color,background:`${color}12`}}>{children}</span>;
}
function StatCard({label,value,delta,accent}){
  return(
    <div style={{background:"var(--panel)",border:"1px solid var(--border)",borderRadius:8,padding:"20px 24px",position:"relative",overflow:"hidden"}}>
      <div style={{width:2,height:"100%",background:accent,position:"absolute",left:0,top:0,borderRadius:"4px 0 0 4px"}}/>
      <div style={{fontSize:11,color:"var(--muted)",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>{label}</div>
      <div style={{fontSize:28,fontWeight:700,fontFamily:"Syne",color:"var(--text)"}}>{value}</div>
      {delta&&<div style={{fontSize:11,color:"var(--green)",marginTop:4}}>{delta}</div>}
    </div>
  );
}
function Field({label,value,onChange,placeholder,type="text",disabled}){
  const [f,setF]=useState(false);
  return(
    <div>
      <label style={{fontSize:11,color:"var(--muted)",letterSpacing:"0.1em",textTransform:"uppercase",display:"block",marginBottom:6}}>{label}</label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
        onFocus={()=>setF(true)} onBlur={()=>setF(false)}
        style={{width:"100%",background:"var(--surface)",borderRadius:6,padding:"10px 14px",color:"var(--text)",fontFamily:"IBM Plex Mono",fontSize:13,outline:"none",border:`1px solid ${f?"var(--amber)":"var(--border)"}`,transition:"border-color .2s"}}/>
    </div>
  );
}
function Select({label,value,onChange,options,disabled}){
  return(
    <div>
      <label style={{fontSize:11,color:"var(--muted)",letterSpacing:"0.1em",textTransform:"uppercase",display:"block",marginBottom:6}}>{label}</label>
      <select value={value} onChange={e=>onChange(e.target.value)} disabled={disabled}
        style={{width:"100%",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:6,padding:"10px 14px",color:"var(--text)",fontFamily:"IBM Plex Mono",fontSize:13,outline:"none"}}>
        {options.map(o=><option key={o}>{o}</option>)}
      </select>
    </div>
  );
}
function Btn({children,onClick,variant="primary",full,small,disabled,href}){
  const base={border:"none",borderRadius:6,cursor:disabled?"not-allowed":"pointer",fontFamily:"IBM Plex Mono",letterSpacing:"0.04em",fontWeight:600,transition:"all .18s",opacity:disabled?.5:1,padding:small?"7px 14px":"10px 18px",fontSize:small?11:12,width:full?"100%":undefined,textDecoration:"none",display:"inline-block"};
  const v={primary:{background:"var(--amber)",color:"var(--ink)"},ghost:{background:"transparent",color:"var(--text)",border:"1px solid var(--border-bright)"},success:{background:"rgba(0,214,143,0.12)",color:"var(--green)",border:"1px solid rgba(0,214,143,0.3)"},muted:{background:"var(--dim)",color:"var(--muted)"}};
  const s={...base,...(disabled?v.muted:v[variant])};
  if(href) return <a href={href} target="_blank" rel="noopener noreferrer" style={s}>{children}</a>;
  return <button onClick={onClick} disabled={disabled} style={s}>{children}</button>;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({audits,onScan,onViewReport,onDeleteAudit}){
  const hot   = audits.filter(a=>a.status==="hot").length;
  const avgRev= audits.length ? Math.round(audits.reduce((s,a)=>s+(a.revenueAmount||0),0)/audits.length) : 0;
  const stats = [
    {label:"Total Audits Run",   value:audits.length||0, delta: audits.length ? `${audits.length} business${audits.length!==1?"es":""} analysed` : null, accent:"#f5a623"},
    {label:"Hot Leads",          value:hot,               delta: hot ? `${hot} high-score audit${hot!==1?"s":""}` : null,                accent:"#ff4757"},
    {label:"Avg Opportunity",    value:avgRev?`$${avgRev.toLocaleString()}/mo`:"—", delta: avgRev ? "across all audits" : null,         accent:"#00d68f"},
    {label:"Reports Saved",      value:audits.length||0, delta: null,                                                                   accent:"#4a9eff"},
  ];
  return(
    <div className="page-pad" style={{animation:"fadeUp .4s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28,flexWrap:"wrap",gap:12}}>
        <div>
          <h1 style={{fontFamily:"Syne",fontSize:26,fontWeight:800,letterSpacing:"-0.02em"}}>Intelligence Dashboard</h1>
          <p style={{color:"var(--muted)",fontSize:13,marginTop:4}}>Preset &amp; Profit · Audit Command Centre</p>
        </div>
        <Btn onClick={onScan}>+ NEW AUDIT</Btn>
      </div>

      <div className="stats-grid">
        {stats.map(s=><StatCard key={s.label} {...s}/>)}
      </div>

      <div style={{background:"var(--panel)",border:"1px solid var(--border)",borderRadius:8,overflow:"hidden"}}>
        <div style={{padding:"14px 24px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontFamily:"Syne",fontWeight:700,fontSize:14}}>Recent Audits</span>
          <span style={{fontSize:11,color:"var(--muted)"}}>{audits.length} audit{audits.length!==1?"s":""} saved</span>
        </div>

        {audits.length === 0 ? (
          <div style={{padding:"60px 24px",textAlign:"center"}}>
            <div style={{fontSize:32,marginBottom:12}}>◈</div>
            <div style={{fontFamily:"Syne",fontWeight:700,fontSize:16,marginBottom:8}}>No audits yet</div>
            <div style={{color:"var(--muted)",fontSize:13,marginBottom:20}}>Run your first audit to see results here.</div>
            <Btn onClick={onScan}>Run First Audit</Btn>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="lead-table">
              <thead>
                <tr style={{borderBottom:"1px solid var(--border)"}}>
                  {["Business","Industry / City","Overall","Lead","Website","Opportunity","Goal","Date",""].map(h=>(
                    <th key={h} style={{padding:"10px 16px",textAlign:"left",fontSize:10,color:"var(--muted)",letterSpacing:"0.1em",textTransform:"uppercase",fontWeight:600,whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {audits.map(a=>(
                  <tr key={a.id} style={{borderBottom:"1px solid var(--border)",transition:"background .15s"}}
                    onMouseEnter={e=>e.currentTarget.style.background="var(--surface)"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td style={{padding:"12px 16px"}}>
                      <div style={{fontWeight:600,fontSize:13}}>{a.businessName}</div>
                      <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{a.website}</div>
                    </td>
                    <td style={{padding:"12px 16px"}}>
                      <div style={{fontSize:12}}>{a.industry}</div>
                      <div style={{fontSize:11,color:"var(--muted)",marginTop:2}}>{a.city||"—"}</div>
                    </td>
                    <td style={{padding:"12px 16px"}}><ScoreRing score={a.overallScore} size={38} stroke={3.5}/></td>
                    <td style={{padding:"12px 16px"}}><ScoreRing score={a.leadScore} size={38} stroke={3.5}/></td>
                    <td style={{padding:"12px 16px"}}><ScoreRing score={a.websiteScore} size={38} stroke={3.5}/></td>
                    <td style={{padding:"12px 16px",fontFamily:"IBM Plex Mono",fontSize:12,color:"var(--green)",fontWeight:600,whiteSpace:"nowrap"}}>{a.revenueOpportunity}</td>
                    <td style={{padding:"12px 16px"}}><Tag color={STATUS_COLORS[a.status]||"#6b6b85"}>{a.status}</Tag></td>
                    <td style={{padding:"12px 16px",fontSize:11,color:"var(--muted)",whiteSpace:"nowrap"}}>{timeAgo(a.createdAt)}</td>
                    <td style={{padding:"12px 16px"}}>
                      <div style={{display:"flex",gap:6}}>
                        <Btn onClick={()=>onViewReport(a)} variant="ghost" small>View →</Btn>
                        <button onClick={()=>onDeleteAudit(a.id)} style={{background:"none",border:"none",color:"var(--dim)",cursor:"pointer",fontSize:14,padding:"4px 6px",borderRadius:4}} title="Delete">✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Audit Scanner ─────────────────────────────────────────────────────────────
function AuditScanner({onComplete}){
  const [form,setForm]=useState({bizName:"",url:"",industry:"Healthcare",city:"",goal:"More Leads",tools:"",email:""});
  const [scanning,setScanning]=useState(false);
  const [phase,setPhase]=useState(0);
  const [log,setLog]=useState([]);
  const logRef=useRef(null);
  const set=k=>v=>setForm(f=>({...f,[k]:v}));

  const phases=[
    "Initialising audit engine…","Crawling website structure…",
    "Checking page speed & mobile optimisation…","Scanning for lead capture mechanisms…",
    "Detecting booking & scheduling tools…","Auditing review platform presence…",
    "Analysing CRM & follow-up infrastructure…","Checking competitor landscape…",
    "Running weakness detection matrix…","Building automation opportunity model…",
    "Calculating ROI projections…","Compiling Preset & Profit report…",
  ];
  const addLog=msg=>setLog(p=>[...p,{t:new Date().toLocaleTimeString(),msg}]);
  const ready=form.bizName.trim()&&form.url.trim();

  const runScan=async()=>{
    if(!ready)return;
    setScanning(true);setLog([]);
    for(let i=0;i<phases.length;i++){
      setPhase(i);addLog(phases[i]);
      await new Promise(r=>setTimeout(r,480));
    }
    // Generate audit entirely on the client — no backend call needed
    const report = generateAudit(form);
    setScanning(false);
    onComplete(report);
  };

  useEffect(()=>{if(logRef.current)logRef.current.scrollTop=logRef.current.scrollHeight;},[log]);

  return(
    <div className="page-pad" style={{maxWidth:760,margin:"0 auto",animation:"fadeUp .4s ease"}}>
      <h1 style={{fontFamily:"Syne",fontSize:24,fontWeight:800,marginBottom:6}}>New Business Audit</h1>
      <p style={{color:"var(--muted)",fontSize:13,marginBottom:28}}>AI weakness detection &amp; automation opportunity mapping · Preset &amp; Profit</p>

      <div style={{background:"var(--panel)",border:"1px solid var(--border)",borderRadius:8,padding:28,display:"grid",gap:16}}>
        <div className="form-grid-2">
          <Field label="Business Name *" value={form.bizName} onChange={set("bizName")} placeholder="e.g. Riverside Dental Group" disabled={scanning}/>
          <Field label="Website URL *" value={form.url} onChange={set("url")} placeholder="e.g. riversidedental.com" disabled={scanning}/>
        </div>
        <div className="form-grid-2">
          <Select label="Industry" value={form.industry} onChange={set("industry")} options={INDUSTRIES} disabled={scanning}/>
          <Field label="City / Service Area" value={form.city} onChange={set("city")} placeholder="e.g. Austin, TX" disabled={scanning}/>
        </div>
        <div className="form-grid-2">
          <Select label="Primary Goal" value={form.goal} onChange={set("goal")} options={GOALS} disabled={scanning}/>
          <Field label="Current Tools (CRM, booking, website…)" value={form.tools} onChange={set("tools")} placeholder="e.g. WordPress, Calendly" disabled={scanning}/>
        </div>
        <Field label="Contact Email (for sending report)" type="email" value={form.email} onChange={set("email")} placeholder="owner@business.com" disabled={scanning}/>
        <button onClick={runScan} disabled={scanning||!ready}
          style={{width:"100%",padding:13,borderRadius:6,border:"none",
            cursor:(!ready||scanning)?"not-allowed":"pointer",
            background:scanning?"var(--dim)":ready?"var(--amber)":"var(--dim)",
            color:(scanning||!ready)?"var(--muted)":"var(--ink)",
            fontFamily:"IBM Plex Mono",fontSize:13,fontWeight:600,letterSpacing:"0.05em",transition:"all .2s"}}>
          {scanning?"◈  SCANNING IN PROGRESS…":"◈  RUN AI AUDIT"}
        </button>
      </div>

      {scanning&&(
        <div style={{marginTop:20,background:"var(--panel)",border:"1px solid var(--border)",borderRadius:8,overflow:"hidden"}}>
          <div style={{padding:"11px 20px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:"var(--amber)",animation:"pulse-amber 1.5s infinite"}}/>
            <span style={{fontSize:11,color:"var(--amber)",letterSpacing:"0.1em"}}>LIVE SCAN · {phases[phase]}</span>
          </div>
          <div ref={logRef} style={{padding:16,maxHeight:200,overflowY:"auto"}}>
            {log.map((l,i)=>(
              <div key={i} style={{fontSize:11,color:i===log.length-1?"var(--amber)":"var(--muted)",padding:"3px 0",display:"flex",gap:12}}>
                <span style={{opacity:.5}}>{l.t}</span>
                <span>{i===log.length-1?"▶ ":"✓ "}{l.msg}</span>
              </div>
            ))}
          </div>
          <div style={{height:2,background:"var(--surface)"}}>
            <div style={{height:"100%",background:"var(--amber)",width:`${((phase+1)/phases.length)*100}%`,transition:"width .5s ease"}}/>
          </div>
        </div>
      )}
    </div>
  );
}

// ── HTML Export builder ───────────────────────────────────────────────────────
function buildHTML(r){
  const sc=n=>n>=80?"#00875a":n>=60?"#c47d0e":"#c0392b";
  const findingIcon=s=>s==="good"?"✓":s==="warn"?"⚠":"✗";
  const findingColor=s=>s==="good"?"#00875a":s==="warn"?"#c47d0e":"#c0392b";
  return`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Preset & Profit Audit — ${r.businessName}</title>
<style>
body{font-family:'Segoe UI',Arial,sans-serif;background:#f7f7f5;color:#1a1a2e;margin:0;padding:0}
.hdr{background:#0a0a0f;color:#fff;padding:36px 48px}
.brand{font-size:12px;letter-spacing:.12em;color:#f5a623;text-transform:uppercase;margin-bottom:8px}
h1{font-size:26px;margin:0 0 4px;font-weight:800}.sub{font-size:13px;color:#6b6b85}
.body{max-width:860px;margin:0 auto;padding:40px 24px}
h2{font-size:15px;font-weight:700;border-bottom:2px solid #f5a623;padding-bottom:8px;margin:32px 0 16px}
.scores{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:20px}
.sc{background:#fff;border-radius:8px;padding:18px 20px;border:1px solid #e0e0e8;flex:1;min-width:130px;text-align:center}
.sc-n{font-size:32px;font-weight:800}.sc-l{font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:#6b6b85;margin-top:4px}
.exec{background:#fffbf0;border-left:4px solid #f5a623;padding:14px 18px;border-radius:0 8px 8px 0;margin-bottom:16px;font-size:14px;line-height:1.7}
.disc{background:#f0f0f8;border-radius:6px;padding:10px 14px;font-size:12px;color:#6b6b85;margin-bottom:24px}
.rec{background:#fff;border:2px solid #f5a623;border-radius:10px;padding:20px 24px;margin-bottom:20px}
.rec-name{font-size:18px;font-weight:800;margin:4px 0 8px}.rec-pkg{font-size:11px;color:#b37700;letter-spacing:.08em;text-transform:uppercase}
.finding{display:flex;gap:12px;padding:10px 0;border-bottom:1px solid #f0f0f0;align-items:flex-start}
.f-icon{width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;margin-top:1px}
.auto{background:#fff;border-radius:8px;padding:16px 18px;margin-bottom:10px;border:1px solid #e0e0e8}
.auto h3{margin:0 0 4px;font-size:15px}.roi{font-size:22px;font-weight:800;color:#00875a;float:right}
.profit{font-size:13px;color:#00875a;margin-top:6px}
.preset{font-size:11px;background:#fff8ec;border:1px solid #f5a623;border-radius:4px;padding:3px 9px;display:inline-block;margin-top:8px;color:#b37700}
.phase{background:#fff;border-radius:8px;padding:16px 18px;margin-bottom:10px;border:1px solid #e0e0e8}
.phase h3{margin:0 0 10px;font-size:14px;color:#f5a623}.phase li{font-size:13px;line-height:1.8}
.cta-box{background:#0a0a0f;color:#fff;border-radius:10px;padding:28px;text-align:center;margin-top:36px}
.cta-btn{background:#f5a623;color:#0a0a0f;padding:12px 28px;border-radius:6px;font-weight:700;font-size:14px;text-decoration:none;display:inline-block}
.foot{text-align:center;padding:22px;font-size:11px;color:#aaa;border-top:1px solid #e0e0e8;margin-top:36px}
@media print{body{background:#fff}}
</style></head><body>
<div class="hdr">
  <div class="brand">Preset &amp; Profit · Business Automation Agency</div>
  <h1>${r.businessName} — Automation Audit Report</h1>
  <p class="sub">${r.website}${r.industry?" · "+r.industry:""}${r.city?" · "+r.city:""} · ${new Date().toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}</p>
</div>
<div class="body">
  <div class="scores">
    <div class="sc"><div class="sc-n" style="color:${sc(r.overallScore)}">${r.overallScore}</div><div class="sc-l">Overall Score</div></div>
    <div class="sc"><div class="sc-n" style="color:${sc(r.leadScore)}">${r.leadScore}</div><div class="sc-l">Lead Score</div></div>
    <div class="sc"><div class="sc-n" style="color:${sc(r.websiteScore)}">${r.websiteScore}</div><div class="sc-l">Website Score</div></div>
    <div class="sc"><div class="sc-n" style="color:#00875a">${r.revenueOpportunity}</div><div class="sc-l">Monthly Opportunity</div></div>
  </div>
  <div class="exec">${r.executiveSummary}</div>
  <div class="disc">⚠ ${r.disclaimer}</div>

  <h2>Recommended Solution</h2>
  <div class="rec">
    <div class="rec-pkg">Preset &amp; Profit: ${r.recommendation?.package} · ${r.recommendation?.price}</div>
    <div class="rec-name">${r.recommendation?.name}</div>
    <div style="font-size:14px">${r.recommendation?.description}</div>
  </div>

  <h2>Lead Generation Findings</h2>
  ${(r.leadFindings||[]).map(f=>`<div class="finding"><div class="f-icon" style="background:${findingColor(f.status)}20;color:${findingColor(f.status)}">${findingIcon(f.status)}</div><div><div style="font-size:14px;font-weight:600;margin-bottom:3px">${f.label}</div><div style="font-size:12px;color:#666">${f.detail}</div></div></div>`).join("")}

  <h2>Website Quality Findings</h2>
  ${(r.websiteFindings||[]).map(f=>`<div class="finding"><div class="f-icon" style="background:${findingColor(f.status)}20;color:${findingColor(f.status)}">${findingIcon(f.status)}</div><div><div style="font-size:14px;font-weight:600;margin-bottom:3px">${f.label}</div><div style="font-size:12px;color:#666">${f.detail}</div></div></div>`).join("")}

  <h2>Automation Opportunities (${(r.automations||[]).length})</h2>
  ${(r.automations||[]).map(a=>`<div class="auto"><span class="roi">${a.roi}/mo</span><div style="font-size:11px;color:#999;margin-bottom:6px;text-transform:uppercase;letter-spacing:.07em">#${a.priority} · ${a.category} · ${a.effort} effort</div><h3>${a.name}</h3><p style="font-size:13px;margin:5px 0">${a.description}</p><p style="font-size:13px;color:#555">Tool: <strong>${a.tool}</strong> · Saves ${a.timesSaved}</p><p class="profit">💡 ${a.profitAngle}</p><div class="preset">Preset &amp; Profit: ${a.presetService}</div></div>`).join("")}

  <h2>30-Day Automation Plan</h2>
  ${r.thirtyDayPlan?[r.thirtyDayPlan.phase1,r.thirtyDayPlan.phase2,r.thirtyDayPlan.phase3].map((p,i)=>`<div class="phase"><h3>Phase ${i+1}: ${p.title}</h3><ul>${p.actions.map(a=>`<li>${a}</li>`).join("")}</ul></div>`).join(""):""}

  <div class="cta-box">
    <h2 style="border:none;color:#fff;font-size:20px;margin-bottom:8px">Ready to implement these automations?</h2>
    <p style="color:#6b6b85;margin:0 0 18px;font-size:14px">Book a free 30-minute strategy call. We build the systems; you collect the revenue.</p>
    <a class="cta-btn" href="https://presetandprofit.com/call">📞 Book Automation Strategy Call</a>
  </div>
</div>
<div class="foot">Prepared by Preset &amp; Profit · presetandprofit.com · Projections are estimates and not guaranteed.</div>
</body></html>`;
}

// ── Report / Results View ─────────────────────────────────────────────────────
function ReportView({report:r,onBack,onSave}){
  const [tab,setTab]=useState("overview");
  const [saved,setSaved]=useState(false);
  const [sent,setSent]=useState(false);
  if(!r)return null;

  const handleSave=()=>{ onSave(r); setSaved(true); };
  const exportReport=()=>{
    const blob=new Blob([buildHTML(r)],{type:"text/html"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download=`preset-profit-audit-${(r.businessName||"report").replace(/\s+/g,"-").toLowerCase()}.html`;
    a.click();URL.revokeObjectURL(a.href);
  };
  const sendToClient=()=>{
    alert(`Demo: In production this sends the branded HTML audit report to ${r.email||"the client's email"} via SendGrid or Resend.\n\nWire up: POST /api/send-report on your server.`);
    setSent(true);
  };

  const TABS=["overview","findings","automations","30-day plan"];
  const phaseColors=["#00d68f","#f5a623","#4a9eff"];
  const findingIcon=s=>s==="good"?"✓":s==="warn"?"⚠":"✗";
  const findingColor=s=>s==="good"?"var(--green)":s==="warn"?"var(--amber)":"var(--red)";
  const findingBorder=s=>s==="good"?"rgba(0,214,143,0.2)":s==="warn"?"rgba(245,166,35,0.2)":"rgba(255,71,87,0.2)";

  return(
    <div className="page-pad" style={{animation:"fadeUp .4s ease"}}>
      {/* ── Header ── */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:22}}>
        <div>
          <button onClick={onBack} style={{background:"none",border:"none",color:"var(--muted)",cursor:"pointer",fontSize:12,marginBottom:8,fontFamily:"IBM Plex Mono"}}>← Back to Dashboard</button>
          <h1 style={{fontFamily:"Syne",fontSize:22,fontWeight:800,letterSpacing:"-0.01em"}}>{r.businessName}</h1>
          <div style={{display:"flex",gap:10,marginTop:6,alignItems:"center",flexWrap:"wrap"}}>
            <span style={{fontSize:12,color:"var(--muted)"}}>{r.website}</span>
            <Tag color="#6b6b85">{r.industry}</Tag>
            {r.city&&<Tag color="#3a3a50">{r.city}</Tag>}
            {r.goal&&<Tag color="var(--amber)">{r.goal}</Tag>}
            <Tag color={STATUS_COLORS[r.status]||"#6b6b85"}>{r.status}</Tag>
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <Btn onClick={handleSave} variant={saved?"success":"ghost"}>{saved?"✓ Saved":"◈ Save Audit"}</Btn>
          <Btn onClick={exportReport} variant="ghost">↓ Export Report</Btn>
          <Btn onClick={sendToClient} variant={sent?"success":"primary"}>{sent?"✓ Sent":"→ Send to Client"}</Btn>
        </div>
      </div>

      {/* ── Score row (4 cards: Overall, Lead, Website, Revenue) ── */}
      <div className="stats-grid" style={{gridTemplateColumns:"repeat(4,1fr)"}}>
        <div style={{background:"var(--panel)",border:"1px solid var(--border)",borderRadius:8,padding:18,display:"flex",alignItems:"center",gap:14}}>
          <ScoreRing score={r.overallScore} size={56} stroke={5}/>
          <div>
            <div style={{fontSize:10,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.1em"}}>Overall Score</div>
            <div style={{fontSize:11,color:"var(--muted)",marginTop:4}}>{r.overallScore>=80?"Strong":r.overallScore>=65?"Moderate":"Needs Work"}</div>
          </div>
        </div>
        <div style={{background:"var(--panel)",border:"1px solid var(--border)",borderRadius:8,padding:18,display:"flex",alignItems:"center",gap:14}}>
          <ScoreRing score={r.leadScore} size={56} stroke={5}/>
          <div>
            <div style={{fontSize:10,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.1em"}}>Lead Score</div>
            <div style={{fontSize:11,color:"var(--muted)",marginTop:4}}>Lead Generation</div>
          </div>
        </div>
        <div style={{background:"var(--panel)",border:"1px solid var(--border)",borderRadius:8,padding:18,display:"flex",alignItems:"center",gap:14}}>
          <ScoreRing score={r.websiteScore} size={56} stroke={5}/>
          <div>
            <div style={{fontSize:10,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.1em"}}>Website Score</div>
            <div style={{fontSize:11,color:"var(--muted)",marginTop:4}}>Site Quality</div>
          </div>
        </div>
        <div style={{background:"var(--panel)",border:"1px solid var(--border)",borderRadius:8,padding:18}}>
          <div style={{fontSize:10,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6}}>Revenue Opportunity</div>
          <div style={{fontSize:22,fontFamily:"Syne",fontWeight:800,color:"var(--green)"}}>{r.revenueOpportunity}</div>
          <div style={{fontSize:11,color:"var(--muted)",marginTop:4}}>estimated monthly recovery</div>
        </div>
      </div>

      {/* ── Exec summary ── */}
      <div style={{background:"var(--panel)",border:"1px solid rgba(245,166,35,0.25)",borderLeft:"3px solid var(--amber)",borderRadius:8,padding:"16px 20px",marginBottom:14}}>
        <div style={{fontSize:10,color:"var(--amber)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:6}}>Executive Summary</div>
        <p style={{fontSize:13,lineHeight:1.75}}>{r.executiveSummary}</p>
      </div>

      {/* ── Disclaimer ── */}
      <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:6,padding:"9px 16px",marginBottom:20,display:"flex",gap:10,alignItems:"flex-start"}}>
        <span style={{color:"var(--amber)",fontSize:12,flexShrink:0}}>⚠</span>
        <span style={{fontSize:11,color:"var(--muted)",lineHeight:1.6}}>{r.disclaimer}</span>
      </div>

      {/* ── Tabs ── */}
      <div style={{display:"flex",gap:2,marginBottom:18,background:"var(--panel)",border:"1px solid var(--border)",borderRadius:8,padding:4,width:"fit-content",flexWrap:"wrap"}}>
        {TABS.map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:"7px 14px",borderRadius:6,border:"none",cursor:"pointer",fontFamily:"IBM Plex Mono",fontSize:11,letterSpacing:"0.05em",textTransform:"uppercase",background:tab===t?"var(--amber)":"transparent",color:tab===t?"var(--ink)":"var(--muted)",fontWeight:tab===t?600:400,transition:"all .15s",whiteSpace:"nowrap"}}>{t}</button>
        ))}
      </div>

      {/* ══ OVERVIEW TAB ══ */}
      {tab==="overview"&&(
        <div style={{display:"grid",gap:16}}>
          {/* Recommendation card */}
          <div style={{background:"var(--panel)",border:"1px solid rgba(245,166,35,0.4)",borderRadius:10,padding:"22px 24px",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:0,right:0,width:200,height:200,background:"radial-gradient(circle at top right,rgba(245,166,35,0.06),transparent 70%)",pointerEvents:"none"}}/>
            <div style={{fontSize:10,color:"var(--amber)",textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:6}}>
              ◈ Recommended Preset &amp; Profit Solution
            </div>
            <div style={{fontFamily:"Syne",fontSize:20,fontWeight:800,marginBottom:8}}>{r.recommendation?.name}</div>
            <p style={{fontSize:13,color:"var(--muted)",lineHeight:1.7,marginBottom:14}}>{r.recommendation?.description}</p>
            <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
              <div style={{background:"var(--amber-glow)",border:"1px solid rgba(245,166,35,0.3)",borderRadius:4,padding:"4px 12px",fontSize:11,color:"var(--amber)",fontWeight:600}}>
                {r.recommendation?.package} · {r.recommendation?.price}
              </div>
              <a href="https://presetandprofit.com/call" target="_blank" rel="noopener noreferrer"
                style={{background:"var(--amber)",color:"var(--ink)",padding:"8px 18px",borderRadius:6,fontFamily:"IBM Plex Mono",fontSize:11,fontWeight:700,letterSpacing:"0.04em",textDecoration:"none",display:"inline-block"}}>
                📞 Book Strategy Call
              </a>
            </div>
          </div>

          {/* Quick wins + Competitor gap */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div style={{background:"var(--panel)",border:"1px solid var(--border)",borderRadius:8,padding:20}}>
              <div style={{fontSize:11,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14}}>Quick Wins — Start Today</div>
              <div style={{display:"grid",gap:12}}>
                {(r.quickWins||[]).map((q,i)=>(
                  <div key={i} style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                    <div style={{width:22,height:22,borderRadius:"50%",background:"var(--amber-glow)",border:"1px solid var(--amber)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"var(--amber)",flexShrink:0}}>{i+1}</div>
                    <span style={{fontSize:12,lineHeight:1.6,paddingTop:2}}>{q}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{background:"var(--panel)",border:"1px solid var(--border)",borderRadius:8,padding:20}}>
              <div style={{fontSize:11,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:14}}>Competitor Gap</div>
              <p style={{fontSize:13,lineHeight:1.75,color:"var(--text)"}}>{r.competitorGap}</p>
              <div style={{marginTop:16}}>
                <div style={{fontSize:11,color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Detected Tech Stack</div>
                {(r.techStack||[]).map(t=>(
                  <div key={t} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 0",borderBottom:"1px solid var(--border)"}}>
                    <div style={{width:5,height:5,borderRadius:"50%",background:"var(--blue)",flexShrink:0}}/>
                    <span style={{fontSize:12}}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ FINDINGS TAB ══ */}
      {tab==="findings"&&(
        <div style={{display:"grid",gap:20}}>
          {/* Lead Generation */}
          <div style={{background:"var(--panel)",border:"1px solid var(--border)",borderRadius:8,overflow:"hidden"}}>
            <div style={{padding:"14px 20px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontFamily:"Syne",fontWeight:700,fontSize:14}}>Lead Generation</div>
              <ScoreRing score={r.leadScore} size={40} stroke={4}/>
            </div>
            <div style={{padding:"0 20px"}}>
              {(r.leadFindings||[]).map((f,i)=>(
                <div key={i} style={{display:"flex",gap:14,alignItems:"flex-start",padding:"14px 0",borderBottom:i<(r.leadFindings.length-1)?"1px solid var(--border)":"none"}}>
                  <div style={{width:26,height:26,borderRadius:"50%",background:findingBorder(f.status),border:`1px solid ${findingColor(f.status)}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:findingColor(f.status),flexShrink:0,marginTop:1}}>
                    {findingIcon(f.status)}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,marginBottom:4,color:f.status==="good"?"var(--text)":"var(--text)"}}>{f.label}</div>
                    <div style={{fontSize:11,color:"var(--muted)",lineHeight:1.6}}>{f.detail}</div>
                  </div>
                  <Tag color={findingColor(f.status)}>{f.status==="good"?"Pass":f.status==="warn"?"Review":"Action"}</Tag>
                </div>
              ))}
            </div>
          </div>

          {/* Website Quality */}
          <div style={{background:"var(--panel)",border:"1px solid var(--border)",borderRadius:8,overflow:"hidden"}}>
            <div style={{padding:"14px 20px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div style={{fontFamily:"Syne",fontWeight:700,fontSize:14}}>Website Quality</div>
              <ScoreRing score={r.websiteScore} size={40} stroke={4}/>
            </div>
            <div style={{padding:"0 20px"}}>
              {(r.websiteFindings||[]).map((f,i)=>(
                <div key={i} style={{display:"flex",gap:14,alignItems:"flex-start",padding:"14px 0",borderBottom:i<(r.websiteFindings.length-1)?"1px solid var(--border)":"none"}}>
                  <div style={{width:26,height:26,borderRadius:"50%",background:findingBorder(f.status),border:`1px solid ${findingColor(f.status)}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:findingColor(f.status),flexShrink:0,marginTop:1}}>
                    {findingIcon(f.status)}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>{f.label}</div>
                    <div style={{fontSize:11,color:"var(--muted)",lineHeight:1.6}}>{f.detail}</div>
                  </div>
                  <Tag color={findingColor(f.status)}>{f.status==="good"?"Pass":f.status==="warn"?"Review":"Action"}</Tag>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ AUTOMATIONS TAB ══ */}
      {tab==="automations"&&(
        <div style={{display:"grid",gap:12}}>
          <div style={{background:"var(--panel)",border:"1px solid var(--border)",borderRadius:6,padding:"11px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
            <span style={{fontSize:12,color:"var(--muted)"}}>Total automation ROI potential across {r.automations?.length} opportunities</span>
            <span style={{fontFamily:"Syne",fontWeight:800,fontSize:18,color:"var(--green)"}}>{r.totalMonthlyOpportunity}</span>
          </div>
          {(r.automations||[]).map((a,i)=>(
            <div key={i} style={{background:"var(--panel)",border:"1px solid var(--border)",borderRadius:8,padding:"18px 20px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,flexWrap:"wrap"}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap",alignItems:"center"}}>
                    <span style={{fontSize:11,color:"var(--muted)",fontWeight:600}}>#{a.priority}</span>
                    <Tag color="#4a9eff">{a.category}</Tag>
                    <Tag color={EFFORT_COLOR[a.effort]}>{a.effort} effort</Tag>
                    <Tag color={CONF_COLOR[a.confidence]}>confidence: {a.confidence}</Tag>
                  </div>
                  <div style={{fontSize:15,fontWeight:700,fontFamily:"Syne",marginBottom:5}}>{a.name}</div>
                  <div style={{fontSize:12,color:"var(--muted)",marginBottom:8,lineHeight:1.6}}>{a.description}</div>
                  <div style={{fontSize:12,color:"var(--blue)",marginBottom:8}}>Tool: {a.tool} &nbsp;·&nbsp; Saves {a.timesSaved}</div>
                  <div style={{fontSize:12,color:"var(--green)",marginBottom:10}}>💡 {a.profitAngle}</div>
                  <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"var(--amber-glow)",border:"1px solid rgba(245,166,35,0.3)",borderRadius:4,padding:"4px 10px",fontSize:11,color:"var(--amber)"}}>
                    Preset &amp; Profit: {a.presetService}
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontSize:10,color:"var(--muted)",marginBottom:3}}>MONTHLY ROI</div>
                  <div style={{fontSize:22,fontFamily:"Syne",fontWeight:800,color:"var(--green)"}}>{a.roi}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ 30-DAY PLAN TAB ══ */}
      {tab==="30-day plan"&&r.thirtyDayPlan&&(
        <div style={{display:"grid",gap:14}}>
          {[r.thirtyDayPlan.phase1,r.thirtyDayPlan.phase2,r.thirtyDayPlan.phase3].map((phase,idx)=>(
            <div key={idx} style={{background:"var(--panel)",border:`1px solid ${phaseColors[idx]}30`,borderLeft:`3px solid ${phaseColors[idx]}`,borderRadius:8,padding:"20px 24px"}}>
              <div style={{fontSize:13,fontWeight:700,color:phaseColors[idx],fontFamily:"Syne",marginBottom:14}}>Phase {idx+1}: {phase.title}</div>
              <div style={{display:"grid",gap:10}}>
                {phase.actions.map((action,ai)=>(
                  <div key={ai} style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                    <div style={{width:20,height:20,borderRadius:"50%",background:`${phaseColors[idx]}20`,border:`1px solid ${phaseColors[idx]}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:phaseColors[idx],flexShrink:0,marginTop:2}}>{ai+1}</div>
                    <span style={{fontSize:13,lineHeight:1.6}}>{action}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div style={{background:"var(--panel)",border:"1px solid rgba(245,166,35,0.4)",borderRadius:10,padding:"28px 24px",textAlign:"center"}}>
            <div style={{fontFamily:"Syne",fontSize:18,fontWeight:800,marginBottom:8}}>Ready to execute this plan?</div>
            <p style={{color:"var(--muted)",fontSize:13,lineHeight:1.7,marginBottom:20,maxWidth:480,margin:"0 auto 20px"}}>We implement these automations done-for-you, typically within 7 days. No tech skills required.</p>
            <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}>
              <a href="https://presetandprofit.com/call" target="_blank" rel="noopener noreferrer"
                style={{background:"var(--amber)",color:"var(--ink)",padding:"12px 24px",borderRadius:6,fontFamily:"IBM Plex Mono",fontSize:12,fontWeight:700,letterSpacing:"0.04em",textDecoration:"none",display:"inline-block"}}>
                📞 Book Automation Strategy Call
              </a>
              <Btn onClick={sendToClient} variant="ghost">{sent?"✓ Report Sent":"✉ Send to Client"}</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Services View (unchanged) ─────────────────────────────────────────────────
function ServicesView(){
  return(
    <div className="page-pad" style={{animation:"fadeUp .4s ease"}}>
      <div style={{textAlign:"center",marginBottom:40}}>
        <div style={{fontSize:11,color:"var(--amber)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8}}>Preset &amp; Profit</div>
        <h1 style={{fontFamily:"Syne",fontSize:28,fontWeight:800,letterSpacing:"-0.02em"}}>Automation Services &amp; Packages</h1>
        <p style={{color:"var(--muted)",marginTop:8,fontSize:14,maxWidth:500,margin:"8px auto 0"}}>Done-for-you business automation. We build the systems; you collect the revenue.</p>
      </div>
      <div className="pricing-grid">
        {SERVICE_PACKAGES.map(pkg=>(
          <div key={pkg.name} style={{background:"var(--panel)",border:`1px solid ${pkg.highlight?pkg.color:"var(--border)"}`,borderRadius:12,padding:"28px 24px",position:"relative",boxShadow:pkg.highlight?`0 0 40px ${pkg.color}20`:"none"}}>
            {pkg.highlight&&(
              <div style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",background:pkg.color,color:"var(--ink)",padding:"4px 14px",borderRadius:20,fontSize:10,fontWeight:700,letterSpacing:"0.1em",whiteSpace:"nowrap"}}>{pkg.tag}</div>
            )}
            <div style={{fontSize:10,color:pkg.color,letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:6,fontWeight:600}}>{pkg.tag}</div>
            <div style={{fontFamily:"Syne",fontSize:22,fontWeight:800,marginBottom:4}}>{pkg.name}</div>
            <div style={{display:"flex",alignItems:"baseline",gap:6,marginBottom:16}}>
              <span style={{fontFamily:"Syne",fontSize:38,fontWeight:800,color:pkg.color}}>{pkg.price}</span>
              <span style={{color:"var(--muted)",fontSize:13}}>{pkg.priceNote}</span>
            </div>
            <div style={{borderTop:"1px solid var(--border)",margin:"0 0 16px"}}/>
            <div style={{display:"grid",gap:10,marginBottom:24}}>
              {pkg.deliverables.map(d=>(
                <div key={d} style={{display:"flex",gap:8,alignItems:"flex-start",fontSize:13}}>
                  <span style={{color:pkg.color,flexShrink:0,marginTop:1}}>✓</span><span>{d}</span>
                </div>
              ))}
            </div>
            <button style={{width:"100%",padding:11,borderRadius:6,cursor:"pointer",fontFamily:"IBM Plex Mono",fontSize:12,fontWeight:600,letterSpacing:"0.05em",transition:"all .2s",border:`1px solid ${pkg.color}`,background:pkg.highlight?pkg.color:"transparent",color:pkg.highlight?"var(--ink)":pkg.color}}>{pkg.cta}</button>
          </div>
        ))}
      </div>
      <div style={{maxWidth:980,margin:"28px auto 0",background:"var(--panel)",border:"1px solid var(--border)",borderRadius:10,padding:"20px 28px",display:"flex",gap:20,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{fontSize:28}}>🛡</div>
        <div>
          <div style={{fontFamily:"Syne",fontWeight:700,fontSize:15,marginBottom:4}}>Results-First Guarantee</div>
          <div style={{fontSize:13,color:"var(--muted)",lineHeight:1.6}}>Every setup includes a 30-day check-in. If the automation isn't working, we fix it at no charge. We don't consider a project done until you see results.</div>
        </div>
      </div>
      <div style={{textAlign:"center",marginTop:24,color:"var(--muted)",fontSize:12}}>
        Questions? Email <span style={{color:"var(--amber)"}}>hello@presetandprofit.com</span> · All projects start with a free strategy call
      </div>
    </div>
  );
}

// ── App Shell ─────────────────────────────────────────────────────────────────
const NAV=[
  {id:"dashboard",label:"Dashboard",icon:"◈"},
  {id:"scan",label:"New Audit",icon:"⊕"},
  {id:"services",label:"Services",icon:"◇"},
];

export default function App(){
  const { audits, save, remove } = useAudits();
  const [view,setView]=useState("dashboard");
  const [report,setReport]=useState(null);
  const [open,setOpen]=useState(false);

  const go=v=>{setView(v);setOpen(false);};

  const openReport=audit=>{
    setReport(audit);
    setView("report");
  };

  const handleScanComplete=r=>{
    setReport(r);
    setView("report");
  };

  const handleSaveAudit=r=>{
    save(r);
  };

  const handleDeleteAudit=id=>{
    remove(id);
    // If currently viewing this audit, go back to dashboard
    if(report&&report.id===id){ setReport(null); setView("dashboard"); }
  };

  // Sidebar audit count label
  const used = audits.length;

  return(
    <div className="main-layout">
      <GlobalStyles/>

      {/* Mobile top bar */}
      <div className="mobile-bar" style={{position:"fixed",top:0,left:0,right:0,height:52,background:"var(--panel)",borderBottom:"1px solid var(--border)",zIndex:30,alignItems:"center",justifyContent:"space-between",padding:"0 16px"}}>
        <div style={{fontFamily:"Syne",fontWeight:800,fontSize:16}}><span style={{color:"var(--amber)"}}>PRESET</span><span style={{color:"var(--text)"}}>&amp;PROFIT</span></div>
        <button onClick={()=>setOpen(o=>!o)} style={{background:"none",border:"1px solid var(--border)",borderRadius:6,color:"var(--text)",padding:"6px 10px",cursor:"pointer",fontSize:16}}>☰</button>
      </div>

      {open&&<div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:19}}/>}

      {/* Sidebar */}
      <div className={`sidebar${open?" open":""}`}>
        <div style={{padding:"24px 20px",borderBottom:"1px solid var(--border)"}}>
          <div style={{fontFamily:"Syne",fontWeight:800,fontSize:16,letterSpacing:"-0.02em"}}><span style={{color:"var(--amber)"}}>PRESET</span><span style={{color:"var(--text)"}}>&amp;PROFIT</span></div>
          <div style={{fontSize:10,color:"var(--muted)",marginTop:2,letterSpacing:"0.08em"}}>AUDIT INTELLIGENCE</div>
        </div>
        <nav style={{padding:"12px 10px",flex:1}}>
          {NAV.map(item=>(
            <button key={item.id}
              onClick={()=>{go(item.id);if(item.id!=="report")setReport(null);}}
              style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:6,border:"none",cursor:"pointer",background:view===item.id?"var(--amber-glow)":"transparent",color:view===item.id?"var(--amber)":"var(--muted)",fontFamily:"IBM Plex Mono",fontSize:12,fontWeight:view===item.id?600:400,marginBottom:2,textAlign:"left",letterSpacing:"0.02em",borderLeft:view===item.id?"2px solid var(--amber)":"2px solid transparent",transition:"all .15s"}}>
              <span style={{fontSize:14}}>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div style={{padding:"16px 20px",borderTop:"1px solid var(--border)"}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:"var(--green)",animation:"pulse-amber 2s infinite"}}/>
            <span style={{fontSize:10,color:"var(--green)",letterSpacing:"0.08em"}}>AI ONLINE</span>
          </div>
          <div style={{fontSize:10,color:"var(--muted)",marginBottom:6}}>{used} audit{used!==1?"s":""} saved locally</div>
          <div style={{height:3,background:"var(--surface)",borderRadius:2}}>
            <div style={{height:"100%",width:`${Math.min(100,used*4)}%`,background:"var(--amber)",borderRadius:2,transition:"width .5s ease"}}/>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="main-content">
        <style>{`@media(max-width:640px){.main-content{padding-top:52px!important}}`}</style>
        {view==="dashboard"&&(
          <Dashboard
            audits={audits}
            onScan={()=>go("scan")}
            onViewReport={openReport}
            onDeleteAudit={handleDeleteAudit}
          />
        )}
        {view==="scan"&&(
          <AuditScanner onComplete={handleScanComplete}/>
        )}
        {view==="report"&&report&&(
          <ReportView
            report={report}
            onBack={()=>go("dashboard")}
            onSave={handleSaveAudit}
          />
        )}
        {view==="services"&&<ServicesView/>}
      </div>
    </div>
  );
}