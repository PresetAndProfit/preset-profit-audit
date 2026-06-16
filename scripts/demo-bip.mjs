// scripts/demo-bip.mjs — DEMO: run the real Stage-0 Business Classification
// Agent on representative Fishersville, VA homepage signals for three business
// types and print the generated Business Intelligence Profile.
// Run: `node scripts/demo-bip.mjs`  (loads .env.local itself)
import { readFileSync } from "node:fs";

// Minimal .env loader — set process.env BEFORE importing the classifier (which
// captures ANTHROPIC_API_KEY at import time). Robust to no trailing newline /
// quotes, where node --env-file proved flaky here.
try {
  for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
} catch { /* no .env.local */ }

const { classifyBusiness } = await import("../api/_lib/agents/classifier.js");
const { renderProfileForPrompt } = await import("../api/_lib/agents/profile.js");

const CITY = "Fishersville, VA";

// Signals use the RAW siteAnalyzer field names (what scanSite emits) — the
// classifier compacts them internally to the controlled vocabulary.
const CASES = [
  {
    tag: "DENTIST", industry: "Dental", bizName: "Fishersville Family Dentistry",
    url: "https://fishersvillefamilydentistry.com",
    signals: {
      detectedName: "Fishersville Family Dentistry",
      title: "Fishersville Family Dentistry | General & Cosmetic Dentist in Fishersville, VA",
      metaDescription: "Gentle family and cosmetic dentistry in Fishersville, VA. New patients welcome.",
      h1: "Gentle Family & Cosmetic Dentistry in Fishersville",
      services: ["General Dentistry", "Cosmetic Dentistry", "Teeth Whitening", "Dental Implants", "Emergency Dental Care"],
      ctaTexts: ["Request an Appointment", "Call Us", "New Patient Forms"],
      secure: true, hasViewport: true,
      phone: "(540) 555-0142", phoneClickable: true, email: "info@fvfdentistry.com", hasForm: true,
      booking: null, reservation: null, ordering: null, hasMenu: false, hasCateringEvents: false,
      ecommercePlatform: null, hasCart: false, pricingVisible: false, priceCount: 0,
      rating: 4.8, reviewCount: 64, reviewWidget: "Google", chat: null,
      hasHours: true, hasAddress: true, social: ["facebook"], bytes: 512000, scriptCount: 19, imgCount: 27,
    },
  },
  {
    tag: "RESTAURANT", industry: "Restaurant", bizName: "The Mill Street Tavern",
    url: "https://millstreettavern.com",
    signals: {
      detectedName: "The Mill Street Tavern",
      title: "The Mill Street Tavern | Farm-to-Table Restaurant in Fishersville, VA",
      metaDescription: "Seasonal farm-to-table dining, craft cocktails, and weekend brunch in Fishersville, VA.",
      h1: "Farm-to-Table Dining in the Heart of Fishersville",
      services: ["Lunch", "Dinner", "Weekend Brunch", "Private Events", "Catering"],
      ctaTexts: ["View Menu", "Order Online", "Make a Reservation"],
      secure: true, hasViewport: true,
      phone: "(540) 555-0188", phoneClickable: true, email: "hello@millstreettavern.com", hasForm: true,
      booking: null, reservation: null, ordering: "Toast", hasMenu: true, hasCateringEvents: true,
      ecommercePlatform: null, hasCart: true, pricingVisible: true, priceCount: 22,
      rating: 4.5, reviewCount: 318, reviewWidget: "Yelp", chat: null,
      hasHours: true, hasAddress: true, social: ["instagram", "facebook"], bytes: 1340000, scriptCount: 34, imgCount: 58,
    },
  },
  {
    tag: "ROOFER", industry: "Roofing", bizName: "Blue Ridge Roofing Co.",
    url: "https://blueridgeroofingva.com",
    signals: {
      detectedName: "Blue Ridge Roofing Co.",
      title: "Blue Ridge Roofing Co. | Roof Replacement & Storm Repair in Fishersville, VA",
      metaDescription: "Licensed roofing contractor serving Fishersville and the Shenandoah Valley. Free inspections, financing available.",
      h1: "Trusted Roof Replacement & Storm Damage Repair",
      services: ["Roof Replacement", "Roof Repair", "Storm Damage", "Gutter Installation", "Free Roof Inspections"],
      ctaTexts: ["Get a Free Estimate", "Call Now", "Financing Available"],
      secure: true, hasViewport: true,
      phone: "(540) 555-0177", phoneClickable: true, email: "office@blueridgeroofingva.com", hasForm: true,
      booking: null, reservation: null, ordering: null, hasMenu: false, hasCateringEvents: false,
      ecommercePlatform: null, hasCart: false, pricingVisible: false, priceCount: 0,
      rating: 4.9, reviewCount: 38, reviewWidget: "Google", chat: null,
      hasHours: false, hasAddress: true, social: ["facebook"], bytes: 690000, scriptCount: 22, imgCount: 31,
    },
  },
];

const inf = (x) => (x ? `${Array.isArray(x.value) ? x.value.join(", ") : x.value}  [conf ${x.confidence}, ${x.basis}]` : "—");

for (const c of CASES) {
  console.log("\n" + "═".repeat(78));
  console.log(`  ${c.tag} — ${c.bizName} (${CITY})`);
  console.log("═".repeat(78));
  const t0 = Date.now();
  let p;
  try {
    p = await classifyBusiness({ signals: c.signals, bizName: c.bizName, industry: c.industry, city: CITY, url: c.url });
  } catch (e) {
    console.log("  classifier error:", e?.message || e);
    continue;
  }
  if (!p) { console.log("  (classifier returned null — would fall back to the industry hint)"); continue; }

  console.log(`  model: ${p.modelUsed}   (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  console.log("\n  ── structured BIP (key fields) ──");
  console.log("  industryCandidates :", p.industryCandidates.map((x) => `${x.industry} ${x.confidence}`).join("  |  "));
  console.log("  resolved industry  :", p.industry, p.classification.blended ? "(BLENDED)" : "");
  console.log("  archetype          :", p.archetype);
  console.log("  businessType       :", `${p.businessType.label} [conf ${p.businessType.confidence}] — ${p.businessType.reasoning}`);
  console.log("  leadValue          :", JSON.stringify(p.leadValue));
  console.log("  revenueModel       :", inf(p.revenueModel));
  console.log("  serviceModel       :", inf(p.serviceModel));
  console.log("  geoScope           :", inf(p.geoScope));
  console.log("  salesCycle         :", inf(p.salesCycle));
  console.log("  competitiveIntens. :", inf(p.competitiveIntensity));
  console.log("  primaryConversion  :", inf(p.primaryConversion));
  console.log("  acquisitionChannels:", inf(p.acquisitionChannels));
  console.log("  customerJourney    :", inf(p.customerJourney));
  console.log("\n  ── BIP as injected into downstream agents (renderProfileForPrompt) ──");
  console.log(renderProfileForPrompt(p).split("\n").map((l) => "  " + l).join("\n"));
}
console.log("");
