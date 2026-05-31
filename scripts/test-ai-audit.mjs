// scripts/test-ai-audit.mjs — live end-to-end test of the V3 consultant engine.
// Scans a real URL, runs Claude, and runs the output through the SAME validator
// production uses (with one corrective retry). Needs ONLY ANTHROPIC_API_KEY.
//
// Usage (key from .env.local is auto-loaded):
//   node scripts/test-ai-audit.mjs https://a-real-restaurant.com Restaurant "Biz Name" "City, ST"
//
// Prints: scraped signals, validation PASS/FAIL (+ violations), classification,
// finding titles, and the executive summary. Full report -> ai-audit-sample.json
// (scratch file — do not commit).
import fs from "node:fs";
import path from "node:path";

// Minimal .env.local loader (same pattern as scripts/setup-stripe.js).
(function loadEnvLocal() {
  const file = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
})();

const { scanSite } = await import("../src/lib/siteAnalyzer.js");
const { generateConsultantReport, aiEnabled } = await import("../api/_lib/aiFindings.js");
const { validateReport, mustMentionCoverage } = await import("../api/_lib/findingsValidation.js");

const [, , url, industry = "", bizName = "", city = ""] = process.argv;
if (!url) { console.error("usage: node scripts/test-ai-audit.mjs <url> [industry] [bizName] [city]"); process.exit(1); }
if (!aiEnabled) { console.error("✗ ANTHROPIC_API_KEY not set (put it in .env.local)."); process.exit(1); }

console.log(`\nScanning ${url} …`);
const scan = await scanSite(url);
if (!scan.ok) { console.error(`✗ scan failed: ${scan.error}`); process.exit(1); }
console.log("✓ scanned. Key signals:", JSON.stringify({
  detectedName: scan.signals.detectedName, secure: scan.signals.secure,
  booking: scan.signals.booking, reservation: scan.signals.reservation,
  ordering: scan.signals.ordering, hasMenu: scan.signals.hasMenu,
  rating: scan.signals.rating, priceCount: scan.signals.priceCount,
}, null, 0));

let corrections = null, report, result;
for (let attempt = 0; attempt < 2; attempt++) {
  console.log(`\nGenerating consultant report (attempt ${attempt + 1}) …`);
  report = await generateConsultantReport({ signals: scan.signals, bizName, industry, city, url, corrections });
  result = validateReport(report, { signals: scan.signals, clientInputs: new Set(), locationHint: city });
  if (result.ok) break;
  console.log(`Attempt ${attempt + 1} REJECTED by validator:\n${result.violations.map((v) => "  - " + v).join("\n")}`);
  corrections = result.violations;
}

console.log("\n========================================");
console.log("VALIDATION:", result.ok ? "PASS ✅ (would render the AI report)" : "FAIL ❌ (production would FALL BACK to deterministic)");
console.log("must-mention coverage:", mustMentionCoverage(report));
console.log("\nClassification:", JSON.stringify(report.businessType));
console.log("\nFindings (worst-first):");
(report.findings || []).forEach((f) => console.log(`  [${f.status}] ${f.title}  (grounded:${f.grounded})`));
console.log("\nRevenue leaks:", (report.revenueLeaks || []).map((l) => `${l.title} $${l.recovery?.low}-${l.recovery?.high}`).join(" | ") || "(none)");
console.log("\nExecutive summary:\n" + report.executiveSummary);

fs.writeFileSync("ai-audit-sample.json", JSON.stringify(report, null, 2));
console.log("\nFull report written to ai-audit-sample.json (scratch — do not commit).");
process.exit(result.ok ? 0 : 2);
