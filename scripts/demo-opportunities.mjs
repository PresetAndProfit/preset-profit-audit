// scripts/demo-opportunities.mjs — V6 Phase 12: demo scenarios. Runs the
// Opportunity Intelligence pipeline on 8 realistic situations and prints the
// Chief-of-Staff-grade output. Deterministic, no APIs.
// Run: `node scripts/demo-opportunities.mjs`
import { detectOpportunities, surfacedOpportunities, topOpportunity } from "../src/lib/opportunity/opportunityEngine.js";
import { nextBestAction } from "../src/lib/nextBestAction.js";
import { departmentIntelligence, weakestDepartment } from "../src/lib/departmentEngine.js";

const biz = (over) => ({
  overallScore: 60, city: "Fishersville, VA",
  businessIntelligenceProfile: { leadValue: { tier: "medium" } },
  growthDiagnosis: { highestRoiImprovements: [{ rank: 1, action: "Deploy Automatic Customer Follow-Up", canonical: "Automatic Customer Follow-Up", addresses: "no follow-up", rationale: "leads go cold", impactScore: 60, growthDriver: "Conversion", effort: "medium" }], forecast: { portfolio: { m12: { low: 6000, high: 18000 } } }, topRevenueLeaks: [] },
  ...over,
  businessIntelligenceProfile: { industry: over.industry, archetype: over.archetype, leadValue: { tier: over.tier || "medium" } },
});
const evt = (label, vertical) => ({ category: "Local Event", label, detail: `${label} near you.`, confidence: 0.72, vertical });

const SCENARIOS = [
  { name: "Sports bar near a biker rally", audit: biz({ businessName: "The Depot Sports Bar", industry: "Restaurant", archetype: "hospitality" }), opts: { month: 7, injected: [evt("Motorcycle rally routed near you", "restaurant")] } },
  { name: "Roofer after storm activity", audit: biz({ businessName: "Blue Ridge Roofing", industry: "Roofing", archetype: "quote_trades", tier: "high", competitorIntelligence: { metrics: { reviewLeader: 412, yourReviews: 38, rank: 4 } } }), opts: { month: 6 } },
  { name: "Dentist before back-to-school", audit: biz({ businessName: "Fishersville Family Dentistry", industry: "Dental", archetype: "appointment_services" }), opts: { month: 8 } },
  { name: "Barber before college move-in", audit: biz({ businessName: "Main St Barbers", industry: "Barbershop", archetype: "appointment_services" }), opts: { month: 8, injected: [evt("College move-in week approaching", "barber_salon")] } },
  { name: "Auto shop before holiday travel", audit: biz({ businessName: "Valley Auto Care", industry: "Automotive", archetype: "retail_ecommerce" }), opts: { month: 11 } },
  { name: "Restaurant before concert weekend", audit: biz({ businessName: "Mill Street Tavern", industry: "Restaurant", archetype: "hospitality" }), opts: { month: 9, injected: [evt("Concert / festival weekend in the area", "restaurant")] } },
  { name: "Agency with weak offer positioning", audit: biz({ businessName: "Northstar Agency", industry: "Agency", archetype: "high_ticket_advisory", tier: "high" }), opts: { month: 1 } },
  { name: "Contractor losing estimates", audit: biz({ businessName: "Shenandoah Contracting", industry: "Home Services", archetype: "quote_trades", competitorIntelligence: { metrics: { reviewLeader: 180, yourReviews: 60, rank: 3 } } }), opts: { month: 4 } },
];

for (const s of SCENARIOS) {
  console.log("\n" + "═".repeat(76) + `\n  ${s.name.toUpperCase()} — ${s.audit.businessName}\n` + "═".repeat(76));
  const opps = surfacedOpportunities(s.audit, s.opts);
  const top = topOpportunity(s.audit, s.opts);
  const nba = nextBestAction(s.audit, opps);
  const depts = departmentIntelligence(s.audit, opps);
  const weak = weakestDepartment(depts);

  if (top) {
    console.log(`  🎯 OPPORTUNITY: ${top.title}  [${top.tier} · score ${top.score}]`);
    console.log(`     Trigger: ${top.triggerSignal}`);
    console.log(`     Why: ${top.whyItMatters}`);
    console.log(`     Revenue: $${top.estimatedRevenueRange.low.toLocaleString()}–$${top.estimatedRevenueRange.high.toLocaleString()} · ${top.timeWindow} · ${top.departmentOwner}`);
    console.log(`     Workflow: ${top.recommendedWorkflow || "—"} · Campaign: ${top.recommendedCampaign || "—"}`);
    if (top.campaign) {
      console.log(`     📣 ${top.campaign.campaignName}`);
      console.log(`        FB ad: ${top.campaign.facebookAd}`);
      console.log(`        SMS: ${top.campaign.smsBlast}`);
    }
  } else console.log("  (no surfaced opportunity this month)");
  console.log(`\n  ★ NEXT BEST ACTION: ${nba?.actionTitle || "—"} (${nba?.source}) · ${nba?.timeToLaunch || ""}`);
  console.log(`  🏢 WEAKEST DEPARTMENT: ${weak ? `${weak.name} (${weak.currentHealthScore}) → ${weak.nextBestAction}` : "—"}`);
  console.log(`  📊 ${opps.length} surfaced opportunities · departments: ${depts.map((d) => `${d.name.split(" ")[0]} ${d.currentHealthScore}`).slice(0, 5).join(", ")}`);
}
console.log("");
