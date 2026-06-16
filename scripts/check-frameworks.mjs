// scripts/check-frameworks.mjs — Phase 1 verification for the industry framework
// registry. Asserts every selectable industry resolves to a complete,
// diagnosis-first framework, every automationPrior is a real canonical service,
// and the prompt block renders. Run: `node scripts/check-frameworks.mjs`.
import { INDUSTRIES } from "../src/lib/constants.js";
import {
  getFramework,
  getBlendedFramework,
  renderFrameworkForPrompt,
  FRAMEWORK_INDUSTRIES,
  CANONICAL_AUTOMATIONS,
} from "../src/lib/frameworks/index.js";

const REQUIRED_LISTS = ["kpis", "criticalChannels", "leakPoints", "growthLevers", "redFlags", "automationPriors"];
const REQUIRED_BENCH = ["reviewCount", "rating", "postsPerWeek", "leadResponseMins"];
const canonical = new Set(CANONICAL_AUTOMATIONS);

// Every selectable industry, plus the forward-looking ones the registry adds.
const ALL = Array.from(new Set([...INDUSTRIES, ...FRAMEWORK_INDUSTRIES]));

let failures = 0;
const fail = (msg) => { console.error("  ✗ " + msg); failures++; };

for (const industry of ALL) {
  const f = getFramework(industry);
  if (!f.archetype) fail(`${industry}: no archetype resolved`);
  if (!f.customerNoun) fail(`${industry}: no customerNoun`);

  for (const key of REQUIRED_LISTS) {
    if (!Array.isArray(f[key]) || f[key].length === 0) fail(`${industry}: empty/missing "${key}"`);
  }
  for (const key of REQUIRED_BENCH) {
    if (f.benchmarks?.[key] == null) fail(`${industry}: missing benchmark "${key}"`);
  }
  for (const a of f.automationPriors || []) {
    if (!canonical.has(a)) fail(`${industry}: automationPrior "${a}" is not a canonical service`);
  }
  const block = renderFrameworkForPrompt(industry);
  if (!block.includes("LEAK REVENUE")) fail(`${industry}: prompt block missing the leak section`);
  if (!block.includes("GROWTH-DRIVER WEIGHTING")) fail(`${industry}: prompt block missing growth-driver weighting`);

  // Growth-driver weights must be a coherent, impact-ranked set summing to ~100.
  const gd = f.growthDrivers;
  if (!Array.isArray(gd) || gd.length < 3) fail(`${industry}: needs >=3 growthDrivers`);
  else {
    const sum = gd.reduce((s, d) => s + (d.weight || 0), 0);
    if (sum < 95 || sum > 105) fail(`${industry}: growthDriver weights sum to ${sum} (expected ~100)`);
    if (gd.some((d) => !d.driver || typeof d.weight !== "number")) fail(`${industry}: malformed growthDriver entry`);
  }
}

// Two verticals must read DIFFERENTLY (the whole point of the registry).
const dentist = JSON.stringify(getFramework("Dental").leakPoints);
const roofer = JSON.stringify(getFramework("Roofing").leakPoints);
if (dentist === roofer) fail("Dental and Roofing produced identical leakPoints — not differentiated");

// ── Blending / confidence / fallback (Justin's pre-Phase-2 requirement) ──────

// 1. Confident top pick → single framework, no blend.
{
  const f = getBlendedFramework([{ industry: "Dental", confidence: 0.9 }, { industry: "Healthcare", confidence: 0.1 }]);
  if (f.classification.blended) fail("blend: confident top pick should NOT blend");
  if (f.classification.primary !== "Dental") fail("blend: confident primary should be Dental");
  if (JSON.stringify(f.leakPoints) !== dentist) fail("blend: confident pick should equal pure Dental framework");
}

// 2. Low-confidence ambiguous → blend the top matches.
{
  const f = getBlendedFramework([
    { industry: "Med Spa", confidence: 0.45 },
    { industry: "Healthcare", confidence: 0.3 },
    { industry: "Beauty & Salon", confidence: 0.2 },
  ]);
  if (!f.classification.blended) fail("blend: ambiguous classification should blend");
  if (!f.industry.includes("/")) fail("blend: blended industry label should join candidates");
  if (f.classification.candidates.length < 2) fail("blend: should carry >=2 weighted candidates");
  const medSpaLeaks = getFramework("Med Spa").leakPoints;
  const hasMedSpa = f.leakPoints.some((x) => medSpaLeaks.includes(x));
  const beautyLeaks = getFramework("Beauty & Salon").leakPoints;
  const hasBeauty = f.leakPoints.some((x) => beautyLeaks.includes(x));
  if (!hasMedSpa || !hasBeauty) fail("blend: blended leakPoints should draw from multiple candidates");
  // Weighted-average benchmark must sit between the inputs, not equal any single one verbatim by luck.
  const r = f.benchmarks.reviewCount;
  if (!(r >= 100 && r <= 120)) fail(`blend: blended reviewCount ${r} outside expected weighted range`);
  for (const a of f.automationPriors) {
    if (!new Set(CANONICAL_AUTOMATIONS).has(a)) fail(`blend: non-canonical automationPrior "${a}"`);
  }
  if (!renderFrameworkForPrompt([
    { industry: "Med Spa", confidence: 0.45 },
    { industry: "Healthcare", confidence: 0.3 },
  ]).includes("UNCERTAIN CLASSIFICATION")) fail("blend: low-confidence prompt should flag uncertainty");
}

// 3. Empty / garbage classification → safe archetype fallback, never throws.
{
  const f = getBlendedFramework([]);
  if (f.classification.blended) fail("blend: empty candidates should not blend");
  if (!Array.isArray(f.leakPoints) || f.leakPoints.length === 0) fail("blend: empty candidates should still resolve a fallback framework");
}

// 4. String back-compat: single industry still renders the non-blended block.
if (renderFrameworkForPrompt("Dental").includes("UNCERTAIN")) fail("blend: string input must not render as uncertain");

if (failures) {
  console.error(`\nFRAMEWORK CHECK FAILED: ${failures} issue(s) across ${ALL.length} industries.`);
  process.exit(1);
}
console.log(`✓ Framework registry OK — ${ALL.length} industries resolve completely and differentiate.`);

// Sample so a human can eyeball specificity.
for (const sample of ["Dental", "Roofing", "Restaurant", "SaaS"]) {
  console.log("\n" + "─".repeat(72) + "\n" + renderFrameworkForPrompt(sample));
}
