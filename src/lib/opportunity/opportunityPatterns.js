// src/lib/opportunity/opportunityPatterns.js — V6 Phase 2: the INDUSTRY
// OPPORTUNITY LIBRARY. Maps a raw signal (+ the business) to a concrete,
// business-owner-ready opportunity template: what to do, which workflow pairs
// with it, which campaign to generate, who owns it, and the modeled revenue.
// PURE. recommendedWorkflow values are canonical automation names so they map
// straight into the marketplace; recommendedCampaign keys drive campaignGenerator.

// vertical → category → template. `*` matches any vertical (cross-industry,
// usually grounded signals). The first matching, most-specific template wins.
const PATTERNS = {
  restaurant: {
    "Local Event": (s) => ({
      title: s.label.includes("rally") ? "Rider Stop Food & Drink Special" : s.label.includes("Concert") ? "Concert Weekend Crowd Capture" : "Game-Day Special Campaign",
      whyItMatters: "A crowd is heading to your area on a known date. A timed offer + local ad converts that foot traffic into covers instead of letting competitors catch it.",
      recommendedActions: ["Launch a limited event special", "Run a geo-targeted social ad", "Blast your SMS list the morning of"],
      recommendedWorkflow: "Monthly Customer Emails", recommendedCampaign: s.label.includes("rally") ? "rider_stop" : s.label.includes("Concert") ? "concert_weekend" : "game_day",
      requiredAssets: ["event special", "Facebook ad", "Instagram story", "SMS blast", "30-sec video script"],
      departmentOwner: "Marketing", implementationComplexity: "low", baseRevenue: [800, 3500], timeWindow: "this weekend", urgencyBias: 0.85,
    }),
    "Demand Spike": () => ({
      title: "Nearby Crew Lunch Program", whyItMatters: "A multi-week crew nearby is a predictable daily lunch order. A standing group deal captures recurring revenue.",
      recommendedActions: ["Offer a crew lunch bundle", "Drop flyers at the job site", "Set up call-ahead ordering"],
      recommendedWorkflow: "Online Ordering", recommendedCampaign: "crew_lunch", requiredAssets: ["lunch bundle offer", "flyer", "SMS"],
      departmentOwner: "Sales", implementationComplexity: "low", baseRevenue: [600, 2400], timeWindow: "next 2 weeks", urgencyBias: 0.6,
    }),
    Seasonal: (s) => ({
      title: s.label.includes("Holiday") ? "Holiday Party & Catering Push" : "Summer Patio Promotion",
      whyItMatters: "A seasonal demand window is open now. A campaign timed to it books groups before competitors fill their calendars.",
      recommendedActions: ["Publish a seasonal/group offer", "Run a booking-focused ad", "Email past guests"],
      recommendedWorkflow: "Monthly Customer Emails", recommendedCampaign: s.label.includes("Holiday") ? "holiday_catering" : "summer_patio",
      requiredAssets: ["seasonal offer", "Facebook ad", "email", "landing headline"], departmentOwner: "Marketing", implementationComplexity: "medium", baseRevenue: [1200, 5000], timeWindow: "this season", urgencyBias: 0.55,
    }),
  },
  roofing: {
    "Weather-Driven": () => ({
      title: "Storm Damage Inspection Campaign", whyItMatters: "Recent storm activity creates a short, high-intent window where homeowners search for inspections. Being first to respond wins the high-ticket jobs.",
      recommendedActions: ["Launch a free storm-inspection offer", "Run an emergency-response ad in affected zips", "Add missed-call text-back for the call surge"],
      recommendedWorkflow: "Missed Call Text Back", recommendedCampaign: "storm_inspection",
      requiredAssets: ["free inspection offer", "Facebook ad", "Google LSA suggestion", "landing page", "30-sec storm commercial", "SMS"],
      departmentOwner: "Marketing", implementationComplexity: "medium", baseRevenue: [4000, 18000], timeWindow: "next 10 days", urgencyBias: 0.95,
    }),
    Seasonal: () => ({
      title: "Pre-Winter Roof Inspection Drive", whyItMatters: "Homeowners book inspections before winter. A neighborhood campaign now fills the fall schedule.",
      recommendedActions: ["Offer a pre-winter inspection", "Send a neighborhood mailer", "Follow up every estimate automatically"],
      recommendedWorkflow: "Automatic Customer Follow-Up", recommendedCampaign: "roof_inspection", requiredAssets: ["inspection offer", "mailer", "Facebook ad", "follow-up workflow"],
      departmentOwner: "Marketing", implementationComplexity: "medium", baseRevenue: [3000, 12000], timeWindow: "next 30 days", urgencyBias: 0.6,
    }),
  },
  dental: {
    Seasonal: (s) => ({
      title: s.label.includes("insurance") ? "Year-End Insurance Benefits Recall" : s.label.includes("school") ? "Back-to-School Family Checkup Campaign" : "Whitening Season Campaign",
      whyItMatters: s.label.includes("insurance") ? "Patients lose unused benefits on Dec 31 — a recall now recovers high-intent appointments before they expire." : "A seasonal demand window is open; a recall/checkup campaign fills the schedule.",
      recommendedActions: ["Send a recall/benefits-expiring campaign", "Text overdue patients", "Add online booking for self-scheduling"],
      recommendedWorkflow: s.label.includes("insurance") ? "Win-Back Messages" : "Appointment Reminder Messages",
      recommendedCampaign: s.label.includes("insurance") ? "year_end_insurance" : s.label.includes("school") ? "back_to_school_dental" : "whitening",
      requiredAssets: ["recall offer", "SMS", "email", "landing headline"], departmentOwner: "Customer Success", implementationComplexity: "low", baseRevenue: [1500, 6000], timeWindow: s.label.includes("insurance") ? "before Dec 31" : "this season", urgencyBias: s.label.includes("insurance") ? 0.9 : 0.6,
    }),
  },
  barber_salon: {
    "Local Event": () => ({
      title: "College Move-In Student Cut Promotion", whyItMatters: "A wave of students is arriving. A student offer captures a recurring young clientele before competitors.",
      recommendedActions: ["Launch a student-cut offer", "Run a campus-geo social ad", "Add online booking"],
      recommendedWorkflow: "Online Booking", recommendedCampaign: "student_cut", requiredAssets: ["student offer", "Instagram ad", "SMS"], departmentOwner: "Marketing", implementationComplexity: "low", baseRevenue: [500, 2000], timeWindow: "next 2 weeks", urgencyBias: 0.7,
    }),
    Seasonal: (s) => ({
      title: s.label.includes("Prom") ? "Prom & Wedding Styling Package" : s.label.includes("Holiday") ? "Holiday Grooming Package" : "Back-to-School Cut Promotion",
      whyItMatters: "Event styling demand peaks now; a package offer lifts average ticket and books the calendar.",
      recommendedActions: ["Bundle an event styling package", "Promote on Instagram", "Add a referral incentive"],
      recommendedWorkflow: "Online Booking", recommendedCampaign: "styling_package", requiredAssets: ["package offer", "Instagram reel", "SMS"], departmentOwner: "Marketing", implementationComplexity: "low", baseRevenue: [600, 2400], timeWindow: "this season", urgencyBias: 0.55,
    }),
  },
  auto: {
    "Weather-Driven": (s) => ({
      title: s.label.includes("AC") || s.label.includes("Summer") ? "Summer AC Service Campaign" : s.label.includes("Cold") || s.label.includes("Winter") ? "Winter Battery & Tire Check" : "Seasonal Vehicle Health Check",
      whyItMatters: "Weather is about to spike a specific failure type. A timed service campaign captures that demand before drivers search a competitor.",
      recommendedActions: ["Launch a seasonal service special", "Run a local ad", "Text due-for-service customers"],
      recommendedWorkflow: "Appointment Reminder Messages", recommendedCampaign: s.label.includes("AC") ? "ac_service" : "winter_check", requiredAssets: ["service offer", "Facebook ad", "SMS"], departmentOwner: "Marketing", implementationComplexity: "low", baseRevenue: [800, 3000], timeWindow: "next 2 weeks", urgencyBias: 0.7,
    }),
    Seasonal: () => ({
      title: "Holiday Travel Safety Inspection", whyItMatters: "Drivers prep vehicles before holiday road trips. A pre-travel brake/tire campaign captures predictable demand.",
      recommendedActions: ["Offer a travel safety inspection", "Run a pre-holiday ad", "Remind customers due for service"],
      recommendedWorkflow: "Appointment Reminder Messages", recommendedCampaign: "holiday_travel_auto", requiredAssets: ["inspection offer", "Facebook ad", "SMS"], departmentOwner: "Marketing", implementationComplexity: "low", baseRevenue: [900, 3200], timeWindow: "next 30 days", urgencyBias: 0.65,
    }),
  },
  contractor: {
    "Weather-Driven": () => ({
      title: "Storm Response & Repair Campaign", whyItMatters: "Storm activity creates urgent repair demand. Fast, targeted response wins the jobs competitors are too slow to chase.",
      recommendedActions: ["Launch a storm-repair offer", "Run an emergency ad", "Recover missed calls automatically"],
      recommendedWorkflow: "Missed Call Text Back", recommendedCampaign: "storm_repair", requiredAssets: ["repair offer", "Facebook ad", "landing page", "SMS"], departmentOwner: "Marketing", implementationComplexity: "medium", baseRevenue: [2000, 9000], timeWindow: "next 10 days", urgencyBias: 0.85,
    }),
    Seasonal: () => ({
      title: "Seasonal Maintenance Plan Promotion", whyItMatters: "A maintenance-plan push now converts one-time jobs into recurring revenue before the seasonal demand window.",
      recommendedActions: ["Promote a maintenance plan", "Email past customers", "Add estimate follow-up"],
      recommendedWorkflow: "Automatic Customer Follow-Up", recommendedCampaign: "seasonal_service", requiredAssets: ["plan offer", "email", "Facebook ad"], departmentOwner: "Sales", implementationComplexity: "medium", baseRevenue: [1500, 6000], timeWindow: "this season", urgencyBias: 0.5,
    }),
  },
  agency_saas: {
    Seasonal: () => ({
      title: "Budget-Season Authority Campaign", whyItMatters: "Buyers are setting budgets now. An authority + case-study push positions you before the decision window closes.",
      recommendedActions: ["Publish an authority/case-study asset", "Run a retargeting ad", "Add a demo-booking workflow"],
      recommendedWorkflow: "Automatic Customer Follow-Up", recommendedCampaign: "authority_content", requiredAssets: ["case study", "LinkedIn ad", "email", "demo booking"], departmentOwner: "Business Development", implementationComplexity: "medium", baseRevenue: [2000, 10000], timeWindow: "this quarter", urgencyBias: 0.5,
    }),
  },
};

// Cross-industry grounded templates (apply to any vertical).
const GROUNDED = {
  "Competitor Gap": (s) => ({
    title: "Close the Competitive Review Gap", whyItMatters: `${s.detail} Review volume drives local ranking and the click before a prospect ever reaches you.`,
    recommendedActions: ["Turn on automated review requests after every job/visit", "Respond to every existing review", "Promote your best reviews in ads"],
    recommendedWorkflow: "Automatic Review Requests", recommendedCampaign: "review_engine", requiredAssets: ["review-request SMS", "response templates"], departmentOwner: "Reputation", implementationComplexity: "low", baseRevenue: [600, 2500], timeWindow: "ongoing", urgencyBias: 0.6,
  }),
  Reputation: () => ({
    title: "Reputation Acceleration Campaign", whyItMatters: "A thin review base suppresses trust and ranking. A steady review engine compounds both.",
    recommendedActions: ["Automate post-service review requests", "Recover lapsed-customer reviews"],
    recommendedWorkflow: "Automatic Review Requests", recommendedCampaign: "review_engine", requiredAssets: ["review-request SMS"], departmentOwner: "Reputation", implementationComplexity: "low", baseRevenue: [500, 2000], timeWindow: "ongoing", urgencyBias: 0.5,
  }),
  Retention: () => ({
    title: "Dormant Customer Reactivation", whyItMatters: "Past customers are your warmest, cheapest revenue — and right now nothing brings them back.",
    recommendedActions: ["Launch a win-back campaign to lapsed customers", "Stand up a monthly customer email"],
    recommendedWorkflow: "Win-Back Messages", recommendedCampaign: "reactivation", requiredAssets: ["win-back SMS", "email"], departmentOwner: "Customer Success", implementationComplexity: "low", baseRevenue: [700, 3000], timeWindow: "ongoing", urgencyBias: 0.55,
  }),
};

// Resolve the best opportunity template for a signal (vertical-specific first,
// then grounded cross-industry). Returns null if no pattern applies.
export function matchPattern(signal, audit) {
  const v = signal.vertical || "generic";
  const byVertical = PATTERNS[v]?.[signal.category];
  if (byVertical) return byVertical(signal, audit);
  if (GROUNDED[signal.category]) return GROUNDED[signal.category](signal, audit);
  return null;
}
