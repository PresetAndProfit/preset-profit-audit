// scripts/check-classifier.mjs — Phase 2 verification for the ClassifierAgent's
// PURE pipeline (no network): normalizeProfile() parse→validate→enrich and
// renderProfileForPrompt(). Feeds fake raw model JSON and asserts the BIP shape,
// the deterministic leadValue (from constants.js), and blending behavior.
// Run: `node scripts/check-classifier.mjs`.
import { normalizeProfile } from "../api/_lib/agents/classifier.js";
import { renderProfileForPrompt } from "../api/_lib/agents/profile.js";

let failures = 0;
const fail = (m) => { console.error("  ✗ " + m); failures++; };
const ok = (cond, m) => { if (!cond) fail(m); };

const goodInf = (value, basis = "observed", evidence = ["reviewCount"]) => ({ value, confidence: 0.7, basis, evidence });

// 1. Confident single classification → resolved, not blended, economics composed.
{
  const raw = {
    industryCandidates: [{ industry: "Dental", confidence: 0.85 }, { industry: "Healthcare", confidence: 0.1 }],
    businessType: { label: "Family dental practice", confidence: 0.85, reasoning: "booking + reviews present", evidence: ["booking", "reviewWidget"] },
    revenueModel: goodInf("appointment-based"),
    serviceModel: goodInf("service"),
    acquisitionChannels: goodInf(["Google Maps", "reviews"]),
    geoScope: goodInf("local"),
    customerJourney: goodInf("search → reviews → book → visit"),
  };
  const p = normalizeProfile(raw, { signals: { detectedName: "Bright Dental" }, bizName: "Bright Dental", industry: "Dental" });
  ok(p, "confident: profile should be produced");
  ok(p.classification.blended === false, "confident: should not blend");
  ok(p.industry === "Dental", `confident: industry should be Dental, got ${p?.industry}`);
  ok(p.archetype === "appointment_services", `confident: archetype wrong: ${p?.archetype}`);
  ok(p.businessType.archetype === "appointment_services", "confident: businessType.archetype must be set");
  ok(p.leadValue.tier === "medium" && p.leadValue.perCustomerValueUsd === 700 && p.leadValue.basis === "industry_benchmark",
    `confident: leadValue should compose from constants (700/medium), got ${JSON.stringify(p.leadValue)}`);
  ok(Array.isArray(p.acquisitionChannels.value) && p.acquisitionChannels.value.length === 2, "confident: array inference preserved");
  ok(renderProfileForPrompt(p).includes("BUSINESS INTELLIGENCE PROFILE"), "confident: render should include the spine header");
  ok(!renderProfileForPrompt(p).includes("UNCERTAIN"), "confident: render should not be uncertain");
}

// 2. Ambiguous → blended classification + multi-vertical label.
{
  const raw = {
    industryCandidates: [
      { industry: "Med Spa", confidence: 0.4 },
      { industry: "Healthcare", confidence: 0.3 },
      { industry: "Beauty & Salon", confidence: 0.2 },
    ],
    businessType: { label: "Aesthetic clinic", confidence: 0.4, reasoning: "mixed signals", evidence: ["services"] },
  };
  const p = normalizeProfile(raw, { signals: {}, industry: "Med Spa" });
  ok(p.classification.blended === true, "ambiguous: should blend");
  ok(p.industry.includes("/"), `ambiguous: industry label should join candidates, got ${p?.industry}`);
  ok(p.leadValue.perCustomerValueUsd === 600, `ambiguous: leadValue from primary (Med Spa=600), got ${p.leadValue.perCustomerValueUsd}`);
  ok(renderProfileForPrompt(p).includes("UNCERTAIN"), "ambiguous: render should flag uncertainty");
}

// 3. Invalid industries filtered; all-invalid → null (caller falls back).
{
  const mixed = normalizeProfile({ industryCandidates: [{ industry: "Spaceship", confidence: 0.9 }, { industry: "Roofing", confidence: 0.5 }] }, {});
  ok(mixed && mixed.industry === "Roofing", "filter: unknown industry dropped, Roofing kept");
  const allBad = normalizeProfile({ industryCandidates: [{ industry: "Spaceship", confidence: 0.9 }] }, {});
  ok(allBad === null, "filter: all-invalid candidates → null");
}

// 4. Malformed inference → null; never poisons the profile.
{
  const p = normalizeProfile({
    industryCandidates: [{ industry: "Roofing", confidence: 0.9 }],
    revenueModel: { value: "" },        // empty → drop
    serviceModel: { nope: true },        // malformed → drop
    geoScope: goodInf("local"),          // valid → keep
  }, {});
  ok(p.revenueModel === null, "inference: empty value dropped");
  ok(p.serviceModel === null, "inference: malformed dropped");
  ok(p.geoScope && p.geoScope.value === "local", "inference: valid kept");
}

// 5. Forward-looking vertical with no economics row → archetype-default leadValue.
{
  const p = normalizeProfile({ industryCandidates: [{ industry: "SaaS", confidence: 0.7 }] }, {});
  ok(p.archetype === "high_ticket_advisory", `saas: archetype should be high_ticket_advisory, got ${p?.archetype}`);
  ok(p.leadValue.basis === "archetype_default" && p.leadValue.tier === "high" && p.leadValue.perCustomerValueUsd === null,
    `saas: leadValue should be archetype_default/high/null, got ${JSON.stringify(p.leadValue)}`);
}

// 6. Garbage input → null, never throws.
ok(normalizeProfile(null, {}) === null, "garbage: null input → null");
ok(normalizeProfile({}, {}) === null, "garbage: no candidates → null");
ok(renderProfileForPrompt(null) === "", "garbage: render(null) → empty string");

if (failures) {
  console.error(`\nCLASSIFIER CHECK FAILED: ${failures} issue(s).`);
  process.exit(1);
}
console.log("✓ Classifier pipeline OK — BIP normalization, economics, blending, and rendering verified.");
console.log("\n── sample BIP prompt block (confident Dental) ──\n" + renderProfileForPrompt(normalizeProfile({
  industryCandidates: [{ industry: "Dental", confidence: 0.88 }],
  businessType: { label: "Family dental practice", confidence: 0.88, reasoning: "online booking + Google reviews detected", evidence: ["booking", "reviewWidget"] },
  revenueModel: goodInf("appointment-based"),
  serviceModel: goodInf("service"),
  geoScope: goodInf("local"),
  competitiveIntensity: goodInf("high", "best_practice", ["Industry best practice"]),
  primaryConversion: goodInf("book an appointment", "observed", ["booking"]),
  acquisitionChannels: goodInf(["Google Maps", "reviews", "referrals"]),
  customerJourney: goodInf("search → check reviews → book online → visit → recall"),
}, { bizName: "Bright Dental", industry: "Dental" })));
