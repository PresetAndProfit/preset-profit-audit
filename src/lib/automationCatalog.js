// ─────────────────────────────────────────────────────────────────────────────
// automationCatalog.js
// The productized service catalog — the *sellable* layer beneath the audit.
//
// The audit (auditEngine.js) DIAGNOSES weaknesses and produces 4 consumer-named
// "automations" (AUTOMATION_POOL) each with a modeled monthly roiAmt. THIS file
// is the agency's actual price list: the 10 done-for-you services from
// automations/MASTER-CATALOG.md, with real setup fees, monthly retainers, build
// times, and bundle plays.
//
// The roadmap engine (roadmapEngine.js) is the bridge: it maps audit findings +
// audit automations onto these priced services, turning a free diagnosis into a
// quoted proposal. Keeping the catalog as plain data (no React, no engine logic)
// means it stays the single source of truth for pricing across the in-app
// roadmap AND the exported proposal PDF.
//
// `mapsFrom`  — AUTOMATION_POOL soft-names whose modeled roiAmt should flow into
//               this service's revenue impact (grounds the quote in the audit).
// `signals`   — lowercase substrings matched against finding labels to detect the
//               weakness this service fixes (used when no soft-automation maps).
// `liftFactor`— fallback monthly-impact multiplier (× monthlyJobs × avgJobValue)
//               used ONLY when no audit automation supplies a real roiAmt.
// ─────────────────────────────────────────────────────────────────────────────

export const CATALOG = [
  {
    id: "missed-call-recovery",
    num: "01",
    name: "Missed Call Recovery System",
    consumerName: "Missed-Call Recovery",
    category: "Capture",
    setupLow: 750, setupHigh: 1000, monthly: 397,
    buildLabel: "0.5–1 day", effort: "low", hoursPerWeek: 8,
    defaultPhase: 1,
    problem: "20–40% of inbound calls go unanswered and those callers dial the next business in the search results.",
    solution: "Texts every missed caller back within ~60 seconds, qualifies them with AI, alerts the owner, and follows up until they book.",
    howItWorks: "Twilio detects the missed call → instant AI text-back → conversation logged → owner alerted → follow-up cadence runs automatically.",
    mapsFrom: ["Missed Call Text Back"],
    signals: ["missed call", "phone number is hard", "no automatic follow-up", "call us", "book now"],
    goalFit: ["More Leads", "Better Follow-Up"],
    idealIndustries: ["HVAC", "Plumbing", "Roofing", "Electrician", "Home Services", "Automotive", "Dental", "Healthcare", "Restaurant", "Med Spa", "Chiropractic", "Legal", "Real Estate"],
    liftFactor: 0.05,
  },
  {
    id: "speed-to-lead",
    num: "02",
    name: "Lead Capture & Follow-Up Engine",
    consumerName: "Speed-to-Lead & Follow-Up",
    category: "Convert",
    setupLow: 750, setupHigh: 1000, monthly: 397,
    buildLabel: "0.5–1 day", effort: "low", hoursPerWeek: 12,
    defaultPhase: 1,
    problem: "Web-form, Google LSA and Facebook leads go cold within minutes — responding in 5 min vs 30 min can 10× contact rates.",
    solution: "Instantly texts + emails every new lead, qualifies them, books the appointment, and keeps following up for 14 days until they convert or opt out.",
    howItWorks: "New lead hits the webhook → instant multi-channel reply → AI qualifies → calendar booking → multi-touch follow-up with HOT/WARM/COLD tagging.",
    mapsFrom: ["Automatic Customer Follow-Up", "Customer Enquiry Tracker"],
    signals: ["no automatic follow-up", "contact form", "contact button", "nothing stops people from leaving", "follow-up", "enquiry"],
    goalFit: ["More Leads", "Better Follow-Up"],
    idealIndustries: ["Roofing", "Real Estate", "Dental", "Med Spa", "HVAC", "Plumbing", "Legal", "Finance", "Home Services", "Fitness", "Automotive"],
    liftFactor: 0.06,
  },
  {
    id: "review-engine",
    num: "03",
    name: "Review & Reputation Engine",
    consumerName: "Automatic Reviews & Reputation",
    category: "Reputation",
    setupLow: 500, setupHigh: 750, monthly: 297,
    buildLabel: "0.5 day", effort: "low", hoursPerWeek: 5,
    defaultPhase: 1,
    problem: "Happy customers rarely leave reviews and bad ones blindside the owner — so the map-pack ranking and call volume stall.",
    solution: "Automatically requests a Google review after every completed job and privately intercepts unhappy customers before they post.",
    howItWorks: "Job marked complete → review request text/email → 5-star routed to Google, anything lower routed to a private apology flow → owner alerted.",
    mapsFrom: ["Automatic Review Requests"],
    signals: ["reviews only appear", "reviews", "google business listing", "trust", "star rating", "hours or reviews"],
    goalFit: ["More Reviews"],
    idealIndustries: ["Dental", "Restaurant", "Barbershop", "Beauty & Salon", "Automotive", "Home Services", "Med Spa", "Chiropractic", "Healthcare", "Fitness", "Legal"],
    liftFactor: 0.04,
  },
  {
    id: "appointment-reminders",
    num: "04",
    name: "Appointment Reminder & No-Show Recovery",
    consumerName: "Appointment Reminders & No-Show Recovery",
    category: "Operations",
    setupLow: 500, setupHigh: 750, monthly: 297,
    buildLabel: "0.5–1 day", effort: "low", hoursPerWeek: 10,
    defaultPhase: 1,
    problem: "No-shows waste chairs, bays and staff time, and empty slots rarely get refilled.",
    solution: "Sends SMS/email reminders, confirms attendance, and automatically re-books no-shows and cancellations from a waitlist.",
    howItWorks: "Booking syncs from the calendar → day-before + 1-hour reminders → confirmation capture → no-show triggers a re-book offer and waitlist fill.",
    mapsFrom: ["Appointment Reminder Messages", "Online Booking"],
    signals: ["booking confirmations are sent manually", "no way for people to book", "book online", "appointment", "contact form is too far"],
    goalFit: ["More Appointments", "Save Staff Time"],
    idealIndustries: ["Dental", "Chiropractic", "Med Spa", "Barbershop", "Beauty & Salon", "Automotive", "Healthcare", "Fitness", "Legal", "Real Estate"],
    liftFactor: 0.05,
  },
  {
    id: "database-reactivation",
    num: "05",
    name: "Database Reactivation Campaign",
    consumerName: "Past-Customer Reactivation",
    category: "Retain",
    setupLow: 1000, setupHigh: 1500, monthly: 250,
    buildLabel: "1 day", effort: "medium", hoursPerWeek: 4,
    defaultPhase: 3,
    problem: "Every business has a list of past customers and dead leads doing nothing — pure dormant revenue.",
    solution: "Runs an AI-personalized win-back SMS/email campaign across the whole list and hands the owner the conversations that heat up.",
    howItWorks: "Import the customer list → AI personalizes each message → staged send → replies classified → booked conversations routed to the owner.",
    mapsFrom: ["Win-Back Messages"],
    signals: ["win-back", "past customers", "haven't been back", "monthly customer emails"],
    goalFit: ["Better Follow-Up", "More Appointments"],
    idealIndustries: ["HVAC", "Dental", "Barbershop", "Beauty & Salon", "Automotive", "Med Spa", "Chiropractic", "Fitness", "Restaurant", "Home Services"],
    liftFactor: 0.05,
  },
  {
    id: "quote-followup",
    num: "06",
    name: "Estimate / Quote Follow-Up Engine",
    consumerName: "Quote & Estimate Follow-Up",
    category: "Convert",
    setupLow: 600, setupHigh: 900, monthly: 297,
    buildLabel: "0.5–1 day", effort: "low", hoursPerWeek: 6,
    defaultPhase: 2,
    problem: "Quotes get sent and forgotten — most contractors never follow up past the first try, leaving high-ticket jobs on the table.",
    solution: "Runs a polite Day 1/3/7/14/21 follow-up sequence on every estimate, AI-classifies replies, and alerts the owner the moment a quote heats up.",
    howItWorks: "Estimate captured from any source → multi-touch sequence → replies tagged HOT/WARM/COLD/DECLINED → stops on accept/decline → owner alerted on HOT.",
    mapsFrom: [],
    signals: ["follow-up", "quote", "estimate", "no free offer"],
    goalFit: ["Better Follow-Up", "More Leads"],
    idealIndustries: ["Roofing", "HVAC", "Plumbing", "Electrician", "Home Services", "Automotive"],
    liftFactor: 0.07,
  },
  {
    id: "ai-receptionist",
    num: "07",
    name: "AI Receptionist (24/7 Voice + Chat)",
    consumerName: "24/7 AI Receptionist",
    category: "Capture",
    setupLow: 1500, setupHigh: 3000, monthly: 797,
    buildLabel: "3–5 days", effort: "high", hoursPerWeek: 20,
    defaultPhase: 3,
    problem: "No one answers calls or chats after hours or during the rush, so overflow and emergency jobs walk to a competitor.",
    solution: "An AI voice + web-chat agent that answers, qualifies, books onto the real calendar, captures leads, and escalates genuine emergencies to a human.",
    howItWorks: "Voice/chat layer answers 24/7 → AI qualifies and books on the live calendar → leads logged → emergencies escalated → everything handed to the team.",
    mapsFrom: ["24/7 Website Chat"],
    signals: ["no chat window", "chat", "after hours", "google business listing isn't set up"],
    goalFit: ["More Leads", "Save Staff Time"],
    idealIndustries: ["HVAC", "Plumbing", "Dental", "Real Estate", "Restaurant", "Roofing", "Med Spa", "Legal", "Home Services"],
    liftFactor: 0.08,
  },
  {
    id: "referral-generator",
    num: "08",
    name: "Referral Generator Engine",
    consumerName: "Referral Generator",
    category: "Reputation",
    setupLow: 500, setupHigh: 750, monthly: 247,
    buildLabel: "0.5 day", effort: "low", hoursPerWeek: 4,
    defaultPhase: 3,
    problem: "Word-of-mouth is the best lead source but happens randomly and never gets asked for.",
    solution: "Asks every delighted, completed-job customer for a referral on a polite 3-touch cadence, captures the referred lead, and alerts the owner.",
    howItWorks: "Happy customer detected → Day 0/3/7 referral asks → referred lead captured by reply or form → owner alerted → never pushy, never fabricated.",
    mapsFrom: [],
    signals: ["referral", "reviews", "trust", "monthly customer emails"],
    goalFit: ["More Reviews", "More Leads"],
    idealIndustries: ["Dental", "Barbershop", "Beauty & Salon", "HVAC", "Plumbing", "Roofing", "Automotive", "Real Estate", "Med Spa", "Chiropractic"],
    liftFactor: 0.04,
  },
  {
    id: "invoice-reminder",
    num: "09",
    name: "Invoice & Payment Reminder (AR)",
    consumerName: "Invoice & Payment Reminders",
    category: "Operations",
    setupLow: 500, setupHigh: 800, monthly: 297,
    buildLabel: "0.5–1 day", effort: "low", hoursPerWeek: 5,
    defaultPhase: 3,
    problem: "Unpaid invoices tie up cash and chasing them by hand is nobody's job.",
    solution: "Sends an escalating-but-respectful reminder sequence anchored to the due date with pay links, and stops the instant an invoice is paid or disputed.",
    howItWorks: "Invoice captured → due-date reminder cadence with pay links → replies classified PAID/DISPUTE/PROMISE → stops on payment → AR dashboard for the owner.",
    mapsFrom: [],
    signals: ["invoice", "payment"],
    goalFit: ["Save Staff Time"],
    idealIndustries: ["Roofing", "HVAC", "Plumbing", "Electrician", "Home Services", "Automotive", "Legal", "Finance"],
    liftFactor: 0.03,
  },
  {
    id: "nurture-newsletter",
    num: "10",
    name: "Long-Term Nurture & Newsletter Engine",
    consumerName: "Long-Term Nurture & Newsletter",
    category: "Retain",
    setupLow: 750, setupHigh: 1000, monthly: 347,
    buildLabel: "1 day", effort: "medium", hoursPerWeek: 6,
    defaultPhase: 3,
    problem: "Leads who aren't ready today get forgotten and drift to whoever stays in front of them.",
    solution: "Keeps the business top-of-mind with AI-generated seasonal/maintenance SMS + email touches, then hands the owner a hot lead the moment someone replies with intent.",
    howItWorks: "Contacts segmented → seasonal/maintenance drip → AI writes each touch → intent reply pauses the drip → hot lead handed to the owner.",
    mapsFrom: ["Monthly Customer Emails"],
    signals: ["monthly", "newsletter", "nurture", "past customers", "hasn't been updated"],
    goalFit: ["More Reviews", "Better Follow-Up", "Save Staff Time"],
    idealIndustries: ["HVAC", "Dental", "Real Estate", "Med Spa", "Chiropractic", "Fitness", "Finance", "Beauty & Salon", "Restaurant"],
    liftFactor: 0.03,
  },
];

export const CATALOG_BY_ID = Object.fromEntries(CATALOG.map(s => [s.id, s]));

// Pre-defined bundle plays from the catalog. `members` are service ids. A bundle
// is offered when ENOUGH of its members are already in the recommended set
// (`triggerMin`), priced below the à-la-carte sum to make the package the
// obvious yes.
export const BUNDLES = [
  {
    id: "never-lose-a-lead",
    name: "“Never Lose a Lead” Suite",
    members: ["missed-call-recovery", "speed-to-lead", "review-engine"],
    triggerMin: 2,
    setup: 1500,
    monthly: 897,
    blurb: "Capture every call, respond to every lead in seconds, and turn every finished job into a 5-star review. The three systems most local businesses need on day one — packaged so nothing slips through.",
  },
  {
    id: "growth-flywheel",
    name: "Growth Flywheel",
    members: ["database-reactivation", "nurture-newsletter", "review-engine", "referral-generator"],
    triggerMin: 3,
    setup: 2200,
    monthly: 997,
    blurb: "Wake the dormant list, keep it warm forever, earn the review, then ask the delighted customer for a referral — a compounding loop that grows lifetime value without new ad spend.",
  },
];

// Soft-automation-name → service id, derived from each service's `mapsFrom`.
export const AUTOMATION_TO_SERVICE = CATALOG.reduce((acc, s) => {
  for (const name of s.mapsFrom) acc[name] = s.id;
  return acc;
}, {});

export function serviceForAutomation(name) {
  const id = AUTOMATION_TO_SERVICE[name];
  return id ? CATALOG_BY_ID[id] : null;
}

// Forward-compat: the Stripe price env var a service/bundle would resolve to once
// the marketplace products are created in Stripe. Derived (not stored per-entry)
// so adding a service needs no env plumbing. e.g. "missed-call-recovery" →
// STRIPE_PRICE_SVC_MISSED_CALL_RECOVERY. Until those products exist, the
// marketplace monetizes via CRM sold-tracking on a deal.
export const servicePriceEnv = id => `STRIPE_PRICE_SVC_${String(id).toUpperCase().replace(/-/g, "_")}`;
