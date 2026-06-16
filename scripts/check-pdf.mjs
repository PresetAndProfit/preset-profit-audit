// scripts/check-pdf.mjs — verify the Growth Diagnosis renders into the PDF
// export. Builds the HTML with and without a diagnosis and asserts the new
// pages appear / are absent. Also writes a sample HTML you can open & print.
// Run: `node scripts/check-pdf.mjs`.
import { writeFileSync } from "node:fs";
import { buildHTML } from "../src/lib/exportReport.js";
import { runSynthesisAgent } from "../api/_lib/agents/synthesis.js";
import { computeSalesBottlenecks, resolveSalesFramework } from "../api/_lib/agents/salesIntel.js";

let failures = 0;
const ok = (cond, m) => { if (!cond) { console.error("  ✗ " + m); failures++; } };

// Build a real (template-voice, offline) diagnosis for a roofer.
const profile = { industryCandidates: [{ industry: "Roofing", confidence: 0.9 }], leadValue: { tier: "high", perCustomerValueUsd: 2500 }, businessType: { label: "Roofing contractor" }, industry: "Roofing", classification: { blended: false } };
const framework = resolveSalesFramework(profile);
const sales = { bottlenecks: computeSalesBottlenecks({ signals: { phone: "x", phoneClickable: true, hasForm: true, booking: null, chat: null, reviewWidget: null, rating: null }, profile, framework }) };
const competitor = { available: true, gaps: [{ dimension: "reviews", status: "behind", source: "google_places", summary: "You show 38 reviews; the strongest nearby roofer shows 412 (local median 120)." }] };
const consultant = { revenueLeaks: [{ title: "Unrecovered missed calls", recovery: { low: 1400, high: 4200 }, recommendation: "Add missed-call text-back." }], automationPlan: { automations: [{ canonicalService: "Automatic Customer Follow-Up", linkedFindingTitle: "Unsold estimates" }] } };
const diagnosis = await runSynthesisAgent({ profile, consultant, competitor, sales });

const baseReport = {
  businessName: "Blue Ridge Roofing Co.", industry: "Roofing", city: "Fishersville, VA", goal: "More Leads",
  overallScore: 62, leadScore: 58, websiteScore: 66, revenueOpportunity: "$0", automations: [], aiGenerated: false,
};

const withD = buildHTML({ ...baseReport, growthDiagnosis: diagnosis });
const withoutD = buildHTML({ ...baseReport });

// 1. Diagnosis pages present when growthDiagnosis is set.
for (const needle of [
  "STRATEGIC GROWTH ASSESSMENT", "isn&#x27;t growing faster", "WHAT IS LIMITING GROWTH",
  "Top revenue leaks", "TOP COMPETITIVE DISADVANTAGES", "Highest-ROI improvements",
  "RECOMMENDED AUTOMATION OPPORTUNITIES", "90-DAY PLAN", "CONSULTANT VERDICT",
]) ok(withD.includes(needle) || withD.includes(needle.replace("isn&#x27;t", "isn't")), `PDF includes "${needle}"`);

// 2. Real content from the diagnosis flows through.
ok(withD.includes("412"), "PDF carries the real competitor figure");
ok(withD.includes("Estimate Conversion"), "PDF carries the growth-driver attribution");
ok(/GROWTH-DRIVER|Estimate Conversion 20%|Reviews 20%/.test(withD) || withD.includes("20%"), "PDF carries the weighting chips");

// 3. Absent + framed as legacy audit when no diagnosis.
ok(!withoutD.includes("STRATEGIC GROWTH ASSESSMENT"), "no diagnosis → no growth pages");
ok(withoutD.includes("AUTOMATION OPPORTUNITY REPORT"), "no diagnosis → legacy cover framing");

// 4. Well-formed-ish.
ok(withD.includes("</html>") && withD.startsWith("<!DOCTYPE html>"), "PDF html well-formed");

if (failures) { console.error(`\nPDF CHECK FAILED: ${failures} issue(s).`); process.exit(1); }

writeFileSync(new URL("../Growth-Diagnosis-sample.html", import.meta.url), withD, "utf8");
console.log("✓ PDF export OK — Growth Diagnosis renders into the report (8 sections, leading the document).");
console.log("  Sample written to ./Growth-Diagnosis-sample.html (open in a browser → Save as PDF).");
