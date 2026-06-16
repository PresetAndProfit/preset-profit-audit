// scripts/demo-diagnosis.mjs — DEMO: run the REAL pipeline (classifier → sales →
// synthesis) and print the complete 8-section GROWTH DIAGNOSIS for three
// Fishersville, VA businesses. Competitor + consultant-leak blocks are
// representative (those stages need the Places API / full Opus consultant); the
// classifier, sales ranking, and synthesis are real AI calls.
// Run: `node scripts/demo-diagnosis.mjs`
import { readFileSync } from "node:fs";
try {
  for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
} catch { /* none */ }

const { classifyBusiness } = await import("../api/_lib/agents/classifier.js");
const { runSalesAgent } = await import("../api/_lib/agents/salesIntel.js");
const { runSynthesisAgent } = await import("../api/_lib/agents/synthesis.js");

const CITY = "Fishersville, VA";
const CASES = [
  {
    tag: "DENTIST", industry: "Dental", bizName: "Fishersville Family Dentistry",
    signals: { detectedName: "Fishersville Family Dentistry", title: "Fishersville Family Dentistry | Dentist in Fishersville, VA", h1: "Gentle Family & Cosmetic Dentistry", services: ["General Dentistry", "Cosmetic", "Implants"], ctaTexts: ["Request an Appointment", "Call Us"], secure: true, hasViewport: true, phone: "(540) 555-0142", phoneClickable: true, hasForm: true, booking: null, chat: null, reviewWidget: "Google", rating: 4.8, reviewCount: 64, hasHours: true, hasAddress: true, social: ["facebook"] },
    competitor: { available: true, providersUsed: ["google_places"], gaps: [{ dimension: "reviews", status: "behind", source: "google_places", summary: "You show 64 reviews; the strongest nearby practice shows 210 (local median 130)." }], metrics: { yourReviews: 64, reviewLeader: 210 } },
    consultant: { revenueLeaks: [{ title: "No online booking — after-hours demand lost", recovery: { low: 900, high: 2700 }, recommendation: "Add self-serve scheduling so patients can book without calling." }], automationPlan: { automations: [{ canonicalService: "Appointment Reminder Messages", linkedFindingTitle: "No-shows" }] } },
  },
  {
    tag: "RESTAURANT", industry: "Restaurant", bizName: "The Mill Street Tavern",
    signals: { detectedName: "The Mill Street Tavern", title: "The Mill Street Tavern | Farm-to-Table in Fishersville, VA", h1: "Farm-to-Table Dining", services: ["Lunch", "Dinner", "Brunch", "Catering"], ctaTexts: ["View Menu", "Order Online", "Reservations"], secure: true, hasViewport: true, phone: "(540) 555-0188", phoneClickable: true, hasForm: true, ordering: "Toast", hasMenu: true, hasCateringEvents: true, hasCart: true, pricingVisible: true, priceCount: 22, reviewWidget: "Yelp", rating: 4.5, reviewCount: 318, hasHours: true, hasAddress: true, social: ["instagram", "facebook"] },
    competitor: { available: true, providersUsed: ["google_places"], gaps: [{ dimension: "reviews", status: "behind", source: "google_places", summary: "You show 318 reviews; the top nearby restaurant shows 720 (local median 410)." }], metrics: { yourReviews: 318, reviewLeader: 720 } },
    consultant: { revenueLeaks: [{ title: "No owned email/SMS list to drive slow nights", recovery: { low: 800, high: 2400 }, recommendation: "Capture diners into an email/SMS list to fill weeknights." }], automationPlan: { automations: [{ canonicalService: "Automatic Review Requests", linkedFindingTitle: "Review velocity" }] } },
  },
  {
    tag: "ROOFER", industry: "Roofing", bizName: "Blue Ridge Roofing Co.",
    signals: { detectedName: "Blue Ridge Roofing Co.", title: "Blue Ridge Roofing | Roof Replacement & Storm Repair in Fishersville, VA", h1: "Trusted Roof Replacement & Storm Repair", services: ["Roof Replacement", "Repair", "Storm Damage", "Free Inspections"], ctaTexts: ["Get a Free Estimate", "Call Now", "Financing Available"], secure: true, hasViewport: true, phone: "(540) 555-0177", phoneClickable: true, hasForm: true, booking: null, chat: null, reviewWidget: "Google", rating: 4.9, reviewCount: 38, hasAddress: true, social: ["facebook"] },
    competitor: { available: true, providersUsed: ["google_places"], gaps: [{ dimension: "reviews", status: "behind", source: "google_places", summary: "You show 38 reviews; the strongest nearby roofer shows 412 (local median 120)." }], metrics: { yourReviews: 38, reviewLeader: 412 } },
    consultant: { revenueLeaks: [{ title: "Unrecovered missed & after-hours calls", recovery: { low: 1400, high: 4200 }, recommendation: "Add missed-call text-back so storm-season demand isn't lost." }], automationPlan: { automations: [{ canonicalService: "Automatic Customer Follow-Up", linkedFindingTitle: "Unsold estimates" }] } },
  },
];

const bullet = (s) => "    • " + s;
for (const c of CASES) {
  console.log("\n\n" + "█".repeat(80) + `\n  GROWTH DIAGNOSIS — ${c.bizName}  (${c.tag}, ${CITY})\n` + "█".repeat(80));
  const profile = await classifyBusiness({ signals: c.signals, bizName: c.bizName, industry: c.industry, city: CITY });
  if (!profile) { console.log("  (classifier null — skipped)"); continue; }
  const sales = await runSalesAgent({ signals: c.signals, profile });
  const d = await runSynthesisAgent({ profile, consultant: c.consultant, competitor: c.competitor, sales });

  console.log(`\n  [classified as ${profile.businessType.label} · lead value ${profile.leadValue.tier} · synthesis by ${d.generatedBy}]`);
  console.log("\n  1. EXECUTIVE SUMMARY\n    " + d.executiveSummary);
  console.log("\n  2. WHAT IS LIMITING GROWTH");
  d.whatIsLimitingGrowth.forEach((x) => console.log(bullet(`${x.constraint} — ${x.why} [${x.growthDriver}]`)));
  console.log("\n  3. TOP REVENUE LEAKS (ranked by impact)");
  d.topRevenueLeaks.forEach((x) => console.log(bullet(`${x.title} (impact ${x.impact}) — ${x.consequence}${x.dollars ? ` [modeled $${x.dollars.low}-$${x.dollars.high}/mo]` : ""}`)));
  console.log("\n  4. TOP COMPETITIVE DISADVANTAGES");
  d.topCompetitiveDisadvantages.forEach((x) => console.log(bullet(x.summary || x.note)));
  console.log("\n  5. HIGHEST-ROI IMPROVEMENTS (ranked)");
  d.highestRoiImprovements.forEach((x) => console.log(bullet(`#${x.rank} ${x.action} → ${x.addresses} [${x.growthDriver}, impact ${x.impactScore}, ${x.effort} effort]`)));
  console.log("\n  6. RECOMMENDED AUTOMATION OPPORTUNITIES");
  d.automationOpportunities.forEach((x) => console.log(bullet(`${x.name}${x.solves ? ` — solves: ${x.solves}` : ""}`)));
  console.log("\n  7. 90-DAY GROWTH PLAN");
  console.log("    NOW:   " + (d.ninetyDayPlan.now.join("; ") || "—"));
  console.log("    NEXT:  " + (d.ninetyDayPlan.next.join("; ") || "—"));
  console.log("    LATER: " + (d.ninetyDayPlan.later.join("; ") || "—"));
  console.log("\n  8. CONSULTANT VERDICT\n    " + d.consultantVerdict);
}
console.log("");
