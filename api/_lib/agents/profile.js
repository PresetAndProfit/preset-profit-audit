// api/_lib/agents/profile.js — PURE renderer for the Business Intelligence
// Profile (BIP). Lives in its own module (no AI / no aiFindings dependency) so
// the consultant prompt and every future agent (competitor / sales / social /
// synthesis) can inject the same spine context without an import cycle.
//
// The BIP is produced by api/_lib/agents/classifier.js (normalizeProfile).

const infVal = (inf) => {
  if (!inf || inf.value == null) return null;
  const v = Array.isArray(inf.value) ? inf.value.join(", ") : String(inf.value);
  return v.replace(/[.\s]+$/, ""); // trim trailing period/space so we don't double-punctuate
};

// Render the BIP as a compact context block for a downstream agent's prompt. It
// is the SPINE — authoritative classification + business model — but framed as
// confidence-tagged INFERENCE, so the scraped signals remain the only observed
// facts. Ties explicitly back to the V2 diagnostic principle (focus on the leaks
// that cost THIS business model the most).
export function renderProfileForPrompt(profile) {
  if (!profile) return "";
  const lv = profile.leadValue || {};
  const leadStr = lv.perCustomerValueUsd != null
    ? `${lv.tier} (~$${lv.perCustomerValueUsd.toLocaleString()} per won customer, industry benchmark)`
    : `${lv.tier} (archetype estimate)`;

  const lines = [
    "BUSINESS INTELLIGENCE PROFILE (the spine — derived FIRST by the classification agent). Treat its classification as the authoritative starting point and keep your businessType consistent with it unless the scraped signals clearly contradict it. These are confidence-tagged INFERENCES about the business MODEL, not new observed facts — the scraped signals remain the only observed facts. Use this to FOCUS the diagnosis on the revenue leaks that cost THIS business model the most.",
    profile.classification?.blended
      ? `Classification: UNCERTAIN — likely one of ${profile.classification.candidates.map((c) => `${c.industry} (≈${Math.round((c.weight ?? c.confidence) * 100)}%)`).join(", ")}. Do not force one; let the signals decide.`
      : `Classification: ${profile.businessType?.label || profile.industry} / archetype ${profile.archetype} (confidence ${profile.businessType?.confidence ?? "?"}).`,
    `Lead value: ${leadStr} — higher lead value makes speed-to-lead, missed-call, and follow-up gaps disproportionately expensive.`,
    infVal(profile.revenueModel) ? `Revenue model: ${infVal(profile.revenueModel)}.` : null,
    infVal(profile.serviceModel) ? `Service model: ${infVal(profile.serviceModel)}.` : null,
    infVal(profile.geoScope) ? `Geographic scope: ${infVal(profile.geoScope)}.` : null,
    infVal(profile.salesCycle) ? `Sales cycle: ${infVal(profile.salesCycle)}.` : null,
    infVal(profile.competitiveIntensity) ? `Competitive intensity: ${infVal(profile.competitiveIntensity)}.` : null,
    infVal(profile.primaryConversion) ? `Primary conversion: ${infVal(profile.primaryConversion)}.` : null,
    infVal(profile.acquisitionChannels) ? `Likely acquisition channels: ${infVal(profile.acquisitionChannels)}.` : null,
    infVal(profile.customerJourney) ? `Customer journey: ${infVal(profile.customerJourney)}.` : null,
  ];
  return lines.filter(Boolean).join("\n");
}
