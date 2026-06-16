// src/lib/departmentPackages.js — V6 Phase 11: MARKETPLACE REFRAME. Re-shelves
// the existing automation catalog as DEPARTMENT PACKAGES — "hire a department,"
// not "buy a tool." PURE data; maps to the canonical automations already in the
// catalog so checkout/pricing stays unchanged.
export const DEPARTMENT_PACKAGES = [
  {
    key: "sales", name: "Sales Department", icon: "◎",
    outcome: "Every lead answered, followed up, and converted — nothing falls through.",
    replaces: "A front-desk + sales-development rep",
    businessValue: "Recover leads you already pay to generate; win the speed-to-lead race.",
    includedWorkflows: ["Missed Call Text Back", "Automatic Customer Follow-Up", "Customer Enquiry Tracker", "Online Booking"],
    roiRange: { low: 1500, high: 6000 }, bestFitIndustries: ["Roofing", "HVAC", "Dental", "Home Services", "Legal"],
  },
  {
    key: "marketing", name: "Marketing Department", icon: "▣",
    outcome: "A steady stream of demand, reviews, and timely local campaigns.",
    replaces: "A part-time marketing manager",
    businessValue: "Capture local attention and seasonal/event windows before competitors.",
    includedWorkflows: ["Automatic Review Requests", "Monthly Customer Emails"],
    roiRange: { low: 1000, high: 5000 }, bestFitIndustries: ["Restaurant", "Barbershop", "Beauty & Salon", "Retail", "Med Spa"],
  },
  {
    key: "customer_success", name: "Customer Success Department", icon: "♥",
    outcome: "Customers come back, no-shows drop, and lapsed customers reactivate.",
    replaces: "A customer-success coordinator",
    businessValue: "Repeat revenue is the cheapest growth there is — this protects it.",
    includedWorkflows: ["Appointment Reminder Messages", "Win-Back Messages", "Monthly Customer Emails"],
    roiRange: { low: 1200, high: 4500 }, bestFitIndustries: ["Dental", "Chiropractic", "Fitness", "Restaurant", "Med Spa"],
  },
  {
    key: "executive", name: "Executive Intelligence Department", icon: "✦",
    outcome: "An always-on chief of staff: what matters, what changed, what to do next.",
    replaces: "A fractional COO / business advisor",
    businessValue: "Decisions made for you — weekly briefings, opportunity + threat detection, forecasting.",
    includedWorkflows: ["Weekly CEO Briefing", "Opportunity Detection", "Threat Detection", "Outcome Forecasting", "Competitor Watch"],
    roiRange: { low: 2000, high: 12000 }, bestFitIndustries: ["All"],
  },
  {
    key: "reputation", name: "Reputation Department", icon: "★",
    outcome: "A growing 5-star review base that wins the click before contact.",
    replaces: "A reputation manager",
    businessValue: "Reviews drive local ranking and trust — this compounds both automatically.",
    includedWorkflows: ["Automatic Review Requests", "Review Monitoring"],
    roiRange: { low: 800, high: 3500 }, bestFitIndustries: ["Dental", "Roofing", "Restaurant", "Auto", "Legal"],
  },
  {
    key: "operations", name: "Operations Department", icon: "⚙", comingSoon: true,
    outcome: "SOPs followed, bottlenecks caught, schedules optimized.",
    replaces: "An operations manager",
    businessValue: "Run the business without it running you. (Requires calendar/task integration.)",
    includedWorkflows: ["SOP Monitoring", "Task Accountability", "Bottleneck Detection", "Scheduling Optimization"],
    roiRange: { low: 1500, high: 7000 }, bestFitIndustries: ["Home Services", "Restaurant", "Auto", "Med Spa"],
  },
  {
    key: "finance", name: "Finance Department", icon: "$", comingSoon: true,
    outcome: "Invoices chased, cash flow watched, profitability monitored.",
    replaces: "A bookkeeper + controller",
    businessValue: "Protect cash — the #1 reason small businesses fail. (Requires accounting integration.)",
    includedWorkflows: ["Invoice Follow-Up", "Collections Tracking", "Cash Flow Watch", "Profitability Monitoring"],
    roiRange: { low: 2000, high: 9000 }, bestFitIndustries: ["Contractor", "Agency", "Home Services", "Auto"],
  },
];

export const packageForIndustry = (industry) =>
  DEPARTMENT_PACKAGES.filter((p) => p.bestFitIndustries.includes("All") || p.bestFitIndustries.includes(industry));
