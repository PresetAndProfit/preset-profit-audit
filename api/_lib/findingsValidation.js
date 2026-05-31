// api/_lib/findingsValidation.js — SERVER-ONLY guardrails on the V3 consultant
// output. Trust-but-verify: the model is instructed to follow these rules; this
// layer enforces them. validateReport() returns the violations; the orchestrator
// uses them for ONE corrective retry, then falls back to the deterministic engine.
//
// The contract is honest only if the signals are honest, so the core of this file
// is the signal-reliability layer: secure is true|false|null (null = unknown, NOT
// present and NOT absent); provider signals must carry a real brand (not the
// "booking link" sentinel); free-text quotes must be substrings of the scrape;
// money is always a modeled low–high range, never presented as measured.
import { getArchetype } from "../../src/lib/industryProfiles.js";

const BEST_PRACTICE_PREFIX = /^industry best practice:/i;

// ── Controlled vocabulary (mirrors aiFindings.compactSignals / ALLOWED_SIGNAL_KEYS) ──
export const ALLOWED_SIGNAL_KEYS = new Set([
  "detectedName", "title", "metaDescription", "h1", "services", "ctaTexts", "secure",
  "mobileViewport", "phone", "phoneTapToCall", "email", "contactForm", "booking",
  "reservation", "onlineOrdering", "menuPresent", "cateringOrEvents", "ecommercePlatform",
  "cartOrCheckout", "pricingVisible", "visiblePriceCount", "rating", "reviewCount",
  "reviewWidget", "liveChat", "hoursPresent", "addressPresent", "social", "homepageBytes",
  "scriptCount", "imageCount",
]);

export const KNOWN_AUTOMATIONS = new Set([
  "Missed Call Text Back", "Appointment Reminder Messages", "Automatic Review Requests",
  "Automatic Customer Follow-Up", "24/7 Website Chat", "Customer Enquiry Tracker",
  "Monthly Customer Emails", "Win-Back Messages", "Online Booking", "Online Ordering",
]);

const PROVIDER_SIGNALS = new Set(["booking", "reservation", "onlineOrdering", "ecommercePlatform", "reviewWidget", "liveChat", "social"]);
const CAPABILITY_SIGNALS = new Set(["booking", "reservation", "onlineOrdering"]);
const SENTINELS = { booking: "booking link" };
const COUNT_KEYS = new Set(["visiblePriceCount", "reviewCount", "scriptCount", "imageCount", "homepageBytes"]);
const REVENUE_RELEVANT = new Set(["reviewCount", "rating", "onlineOrdering", "reservation", "booking", "ecommercePlatform"]);

// compactSignals key -> raw siteAnalyzer field name (validateReport receives RAW signals).
const KEY_TO_RAW = {
  mobileViewport: "hasViewport", onlineOrdering: "ordering", contactForm: "hasForm",
  cartOrCheckout: "hasCart", menuPresent: "hasMenu", cateringOrEvents: "hasCateringEvents",
  visiblePriceCount: "priceCount", phoneTapToCall: "phoneClickable", liveChat: "chat",
  homepageBytes: "bytes", imageCount: "imgCount", addressPresent: "hasAddress", hoursPresent: "hasHours",
};
const rawValue = (signals, key) => (signals ? signals[KEY_TO_RAW[key] || key] : undefined);

const norm = (s) => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
const isSentinel = (key, value) => !!SENTINELS[key] && norm(value) === SENTINELS[key];

// A signal is "present/observed" per the contract's definition.
function isPresent(signals, key) {
  if (key === "secure") return rawValue(signals, "secure") === true; // null/false are NOT present
  const v = rawValue(signals, key);
  if (v == null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "boolean") return v === true;
  if (typeof v === "number") return COUNT_KEYS.has(key) ? v > 0 : true; // rating present if != null
  return String(v).trim() !== "";
}
const isProviderDetected = (signals, key) =>
  PROVIDER_SIGNALS.has(key) && isPresent(signals, key) && !isSentinel(key, rawValue(signals, key));

// Recursively collect every string in the report — the no-fabrication / forbidden
// scans run over ALL of it so a newly added field can never silently escape.
function allStrings(node, out = []) {
  if (typeof node === "string") out.push(node);
  else if (Array.isArray(node)) for (const x of node) allStrings(x, out);
  else if (node && typeof node === "object") for (const k of Object.keys(node)) allStrings(node[k], out);
  return out;
}

function termRegex(term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`\\b${escaped}\\b`, "i");
}

// Specific-competitor / named-rival claims (rule 8). General "top performers" is fine.
const FAKE_COMPETITOR = /\b(your |local |nearby |other |the )?(competitor|rival)s?\b[^.]{0,60}\b(offer|offers|have|has|do|does|use|uses|provide|provides|let|charge|charges|run|runs|are|win|wins)\b/i;
const RIVAL_PHRASE = /\bthe (shop|place|store|restaurant|practice|firm|salon|business)\s+(down|across|near)\b|\bbusinesses (near|around)\b/i;
const MEASURED_MONEY = /\b(you (are|'re) losing|currently los(e|ing)|actual(ly)? los|measured (loss|revenue)|lost revenue of)\b/i;

// First quoted substring (or token after "= ") in a bullet's text.
function quotedValue(text) {
  const m = String(text || "").match(/["“']([^"”']{2,})["”']/) || String(text || "").match(/=\s*(.+)$/);
  return m ? m[1] : null;
}

export function validateReport(report, { signals, clientInputs = new Set(), locationHint = null } = {}) {
  const v = [];
  const push = (msg) => v.push(msg);

  if (!report || typeof report !== "object") return { ok: false, violations: ["Empty report."] };
  if (!Array.isArray(report.findings) || report.findings.length < 6 || report.findings.length > 9) {
    push("findings must be an array of 6–9 items.");
  }
  const bt = report.businessType || report.businessIntelligence?.businessType;
  const archetypeId = bt?.archetype;
  const archetype = getArchetype(archetypeId);
  if (!archetype || getArchetype(archetypeId).id !== archetypeId) push("businessType.archetype must be one of the 5 archetype ids.");
  if (typeof bt?.confidence !== "number" || bt.confidence < 0 || bt.confidence > 1) push("businessType.confidence must be a number in [0,1].");

  const everyString = allStrings(report);

  // 7 — forbidden archetype vocabulary (hospitality catering exception).
  const cateringException = archetype.id === "hospitality" && !!rawValue(signals, "hasCateringEvents");
  if (!cateringException) {
    for (const term of archetype.forbidden) {
      const re = termRegex(term);
      if (everyString.some((s) => re.test(s))) push(`Forbidden vocabulary for a ${archetype.label}: "${term}". Use this archetype's vocabulary (${archetype.conversionActions.join("; ")}).`);
    }
  }

  // 8 — fabricated / named competitor claims. Whitelist real observed provider
  // values AND the audited business's own name (it legitimately appears with
  // verbs like "has/offers" all over the report).
  const providerValues = new Set(
    [...PROVIDER_SIGNALS].flatMap((k) => {
      const val = rawValue(signals, k);
      return Array.isArray(val) ? val.map(norm) : val ? [norm(val)] : [];
    })
  );
  const selfNames = [rawValue(signals, "detectedName"), rawValue(signals, "title"), bt?.label]
    .filter(Boolean).map(norm);
  const isSelfName = (n) => selfNames.some((sn) => sn.includes(n) || n.includes(sn));
  for (const s of everyString) {
    if (FAKE_COMPETITOR.test(s) || RIVAL_PHRASE.test(s)) { push(`Specific/implied-competitor claim detected ("${(s.match(FAKE_COMPETITOR) || s.match(RIVAL_PHRASE))[0]}…"). Frame benchmarks as industry-wide, never what competitors do.`); break; }
    const named = s.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b[^.]{0,40}\b(offer|offers|charges?|provides?)\b/);
    if (named && !providerValues.has(norm(named[1])) && !isSelfName(norm(named[1]))) { push(`Possible named-competitor claim ("${named[1]}…"). Only observed provider values may be named; benchmarks are industry-wide.`); break; }
  }

  // 45 — money presented as measured fact.
  if (everyString.some((s) => MEASURED_MONEY.test(s))) push('Money presented as measured ("you are losing / lost revenue of …"). All dollars are "modeled opportunity" ranges, never measured.');

  // ── Findings (9–17) ─────────────────────────────────────────────────────────
  (report.findings || []).forEach((f, i) => {
    const tag = `Finding ${i + 1} ("${f.title || f.id || "?"}")`;
    if (f.id !== `f${i + 1}`) push(`${tag}: id must be "f${i + 1}" (sequential, no gaps).`);
    if (!Array.isArray(f.evidence) || f.evidence.length < 1 || f.evidence.length > 4) { push(`${tag}: evidence must be 1–4 bullets.`); return; }
    let groundedBullet = false;
    for (const b of f.evidence) {
      if (!["signal", "absence", "best_practice"].includes(b.type)) { push(`${tag}: evidence.type must be signal|absence|best_practice.`); continue; }
      if (b.type === "best_practice") {
        if (b.signal != null) push(`${tag}: best_practice bullet must have signal:null.`);
        if (!BEST_PRACTICE_PREFIX.test(b.text || "")) push(`${tag}: best_practice bullet text must start "Industry best practice:".`);
        continue;
      }
      groundedBullet = true;
      if (!ALLOWED_SIGNAL_KEYS.has(b.signal)) { push(`${tag}: ${b.type} bullet cites unknown signal "${b.signal}".`); continue; }
      if (b.type === "signal") {
        if (!isPresent(signals, b.signal)) push(`${tag}: claims signal "${b.signal}" present but the scrape shows it empty/unknown${b.signal === "secure" ? " (secure must be true)" : ""}.`);
        // 12d capability/sentinel
        if (CAPABILITY_SIGNALS.has(b.signal) && /\b(book|booking|reserve|reservation|order|ordering|schedul)\w*/i.test(b.text || "") && !isProviderDetected(signals, b.signal)) {
          push(`${tag}: cites "${b.signal}" as a working capability but it is a sentinel/absent — sentinels ("booking link") are intent-only.`);
        }
      } else { // absence
        if (b.signal === "secure" ? rawValue(signals, "secure") !== false : isPresent(signals, b.signal)) {
          push(`${tag}: claims "${b.signal}" missing but the scrape shows it present${b.signal === "secure" ? " or unmeasured (cannot claim insecure when secure is null)" : ""}.`);
        }
      }
      // 12c free-text substring
      if (["title", "h1", "metaDescription", "detectedName"].includes(b.signal)) {
        const q = quotedValue(b.text);
        if (q && !norm(rawValue(signals, b.signal)).includes(norm(q))) push(`${tag}: quotes a ${b.signal} value ("${q}") not found in the scraped ${b.signal}.`);
      }
    }
    if (f.grounded !== groundedBullet) push(`${tag}: grounded must be ${groundedBullet} (true iff a signal/absence bullet exists).`);

    const im = f.impact || {};
    if (!Number.isInteger(im.lostRevenueLow) || !Number.isInteger(im.lostRevenueHigh) || im.lostRevenueLow < 0 || im.lostRevenueHigh < im.lostRevenueLow) push(`${tag}: impact.lostRevenue must be integers 0<=low<=high.`);
    if (im.lostRevenueHigh > 50000) push(`${tag}: impact.lostRevenueHigh exceeds the $50,000/mo per-finding ceiling.`);
    if (im.revenueLabel !== "modeled opportunity") push(`${tag}: impact.revenueLabel must be "modeled opportunity".`);
    if (!["low", "medium", "high"].includes(im.confidence)) push(`${tag}: impact.confidence must be low|medium|high.`);
    if (f.status === "good" && (im.lostRevenueLow !== 0 || im.lostRevenueHigh !== 0)) push(`${tag}: good findings must have lostRevenue 0/0.`);
    // 16 high-confidence allow-list
    if (im.confidence === "high") {
      const hasRevenueSignal = (f.evidence || []).some((b) => (b.type === "signal" || b.type === "absence") && REVENUE_RELEVANT.has(b.signal) && !(b.signal === "booking" && b.type === "signal" && !isProviderDetected(signals, "booking")));
      if (!hasRevenueSignal) push(`${tag}: impact.confidence "high" requires a grounded revenue-relevant signal (reviewCount/rating/onlineOrdering/reservation/provider-booking/ecommercePlatform).`);
    }
  });

  // ── Business intelligence inferences (18–25) ─────────────────────────────────
  const bi = report.businessIntelligence;
  if (bi && typeof bi === "object") {
    const INF_FIELDS = ["revenueModel", "revenueSources", "acquisitionChannels", "geographicMarket", "primaryConversion", "secondaryConversions", "serviceModel", "onlineOfflineMix"];
    for (const fld of INF_FIELDS) {
      const inf = bi[fld];
      if (inf == null) continue;
      if (typeof inf !== "object") { push(`businessIntelligence.${fld} must be null or an Inference.`); continue; }
      if (typeof inf.confidence !== "number") push(`businessIntelligence.${fld}.confidence must be numeric.`);
      if (!["observed", "best_practice"].includes(inf.basis)) push(`businessIntelligence.${fld}.basis must be observed|best_practice.`);
      if (!Array.isArray(inf.evidence) || inf.evidence.length === 0) { push(`businessIntelligence.${fld}.evidence must be a non-empty array.`); continue; }
      if (inf.basis === "best_practice") {
        if (inf.evidence.length !== 1 || norm(inf.evidence[0]) !== "industry best practice") push(`businessIntelligence.${fld}: best_practice evidence must be ["Industry best practice"].`);
      } else {
        for (const tok of inf.evidence) {
          if (!ALLOWED_SIGNAL_KEYS.has(tok)) push(`businessIntelligence.${fld}: observed evidence token "${tok}" not in the controlled vocabulary.`);
          else if (!isPresent(signals, tok)) push(`businessIntelligence.${fld}: observed evidence "${tok}" is not present in the scrape.`);
        }
      }
    }
    // 24 primaryConversion
    const pc = bi.primaryConversion;
    if (pc && typeof pc.value === "string") {
      const legal = archetype.conversionActions.map(norm);
      const providerBacked = ["booking", "reservation", "onlineOrdering"].some((k) => isProviderDetected(signals, k) && norm(pc.value).includes(norm(rawValue(signals, k))))
        || (/(add to cart|check ?out)/i.test(pc.value) && (isPresent(signals, "cartOrCheckout") || isPresent(signals, "ecommercePlatform")));
      if (!legal.some((a) => norm(pc.value).includes(a) || a.includes(norm(pc.value))) && !providerBacked) push("businessIntelligence.primaryConversion must be an archetype conversion action or a provider-backed conversion (never a sentinel, text-only phone, or keyword flag).");
    }
    // 23 geographicMarket honesty
    const gm = bi.geographicMarket;
    if (gm && gm.basis === "observed" && typeof gm.value === "string") {
      const placeOk = [rawValue(signals, "title"), rawValue(signals, "detectedName")].some((src) => norm(src).includes(norm(gm.value)));
      if (!placeOk) push("businessIntelligence.geographicMarket asserts a place not found in the scraped address/title.");
      if (locationHint && norm(gm.value) === norm(locationHint) && !placeOk) push("businessIntelligence.geographicMarket echoes the LOCATION hint, which is not an observed signal.");
    }
  }

  // ── Competitive benchmark (26–35 core) ───────────────────────────────────────
  const cb = report.competitiveBenchmark;
  if (cb && typeof cb === "object") {
    if (!Array.isArray(cb.dimensions) || cb.dimensions.length < 5 || cb.dimensions.length > 8) push("competitiveBenchmark.dimensions must be 5–8 rows.");
    if (!/industry[- ]wide|industry benchmark|not (a )?(measured )?competitor/i.test(`${cb.summary} ${cb.benchmarkBasis}`)) push("competitiveBenchmark.summary/benchmarkBasis must assert industry-wide framing.");
    const ALLOWED_DIM_SIGNALS = {
      reviews: ["reviewCount", "reviewWidget"], rating: ["rating"],
      website_quality: ["secure", "mobileViewport", "metaDescription", "homepageBytes", "scriptCount"],
      trust_signals: ["rating", "reviewWidget", "hoursPresent", "addressPresent", "secure", "social"],
      booking: ["booking"], ordering: ["onlineOrdering"], reservation: ["reservation"],
      conversion_features: ["contactForm", "ctaTexts", "cartOrCheckout", "ecommercePlatform"],
    };
    for (const d of cb.dimensions || []) {
      if (d.industryAverage && /\b\d{2,}\b/.test(`${d.industryAverage.value} ${d.industryAverage.note}`)) push(`competitiveBenchmark "${d.id}": industryAverage must be a qualitative band, not a fabricated count.`);
      if (d.industryAverage && !/^industry benchmark:/i.test(d.industryAverage.note || "")) push(`competitiveBenchmark "${d.id}": industryAverage.note must start "Industry benchmark:".`);
      const yours = d.yours || {};
      if (yours.state === "unknown") {
        if (yours.signal != null || !/^not determinable from homepage:/i.test(yours.evidence || "")) push(`competitiveBenchmark "${d.id}": unknown row must have signal:null and evidence starting "Not determinable from homepage:".`);
      } else if (ALLOWED_DIM_SIGNALS[d.id]) {
        if (!ALLOWED_DIM_SIGNALS[d.id].includes(yours.signal)) push(`competitiveBenchmark "${d.id}": yours.signal "${yours.signal}" not allowed for this dimension.`);
        else if (yours.signal === "secure" && rawValue(signals, "secure") == null) push(`competitiveBenchmark "${d.id}": a secure-backed row must be "unknown" when secure is null.`);
        else if ((yours.state === "observed_present" || yours.state === "observed_value") && !isPresent(signals, yours.signal)) push(`competitiveBenchmark "${d.id}": claims observed_present but signal not present.`);
        else if (yours.state === "observed_absent" && isPresent(signals, yours.signal)) push(`competitiveBenchmark "${d.id}": claims observed_absent but signal is present.`);
        else if (["booking", "reservation", "ordering"].includes(d.id) && yours.state === "observed_present" && !isProviderDetected(signals, ALLOWED_DIM_SIGNALS[d.id][0])) push(`competitiveBenchmark "${d.id}": observed_present requires a real provider, not a sentinel.`);
      }
      // 33 archetype/dimension fit
      if (archetype.id === "hospitality" && d.id === "booking") push('competitiveBenchmark: hospitality must not use a "booking" row (use reservation).');
      if (["quote_trades", "appointment_services", "high_ticket_advisory"].includes(archetype.id) && ["ordering", "reservation"].includes(d.id)) push(`competitiveBenchmark: ${archetype.id} must not use an "${d.id}" row.`);
    }
  }

  // ── Revenue leaks (36–45 core) ───────────────────────────────────────────────
  const leaks = report.revenueLeaks;
  if (Array.isArray(leaks)) {
    if (leaks.length > 6) push("revenueLeaks must be 0–6 items.");
    const ids = new Set();
    for (const lk of leaks) {
      const tag = `revenueLeak "${lk.title || lk.id || "?"}"`;
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(lk.id || "") || ids.has(lk.id)) push(`${tag}: id must be a unique kebab-case slug.`);
      ids.add(lk.id);
      if (!["bad", "warn"].includes(lk.status)) push(`${tag}: status must be bad|warn (never good).`);
      if (lk.grounded === false) {
        if (!BEST_PRACTICE_PREFIX.test(lk.evidence || "") || (lk.signalRefs || []).length) push(`${tag}: grounded:false requires evidence "Industry best practice:" and empty signalRefs.`);
      } else {
        if (!lk.evidence || BEST_PRACTICE_PREFIX.test(lk.evidence) || !(lk.signalRefs || []).length) push(`${tag}: grounded:true requires real evidence and >=1 signalRef.`);
        (lk.signalRefs || []).forEach((k) => { if (!ALLOWED_SIGNAL_KEYS.has(k)) push(`${tag}: signalRef "${k}" not in vocabulary.`); });
      }
      // 40 signal-consistency
      if (lk.leakType === "missing_booking_automation" && isProviderDetected(signals, "booking")) push(`${tag}: cannot claim missing booking — a real booking provider is detected.`);
      if (lk.leakType === "missing_ordering_automation" && isProviderDetected(signals, "onlineOrdering")) push(`${tag}: cannot claim missing ordering — onlineOrdering provider detected.`);
      if (lk.leakType === "poor_lead_capture" && (isPresent(signals, "contactForm") || isPresent(signals, "phoneTapToCall"))) push(`${tag}: cannot claim poor lead capture — a contact form or tap-to-call is present.`);
      if (lk.leakType === "missing_trust_signals" && rawValue(signals, "secure") === true && isPresent(signals, "rating") && isPresent(signals, "reviewWidget")) push(`${tag}: cannot claim missing trust signals — secure, rating, and review widget are all present.`);
      // 41 recovery range
      const rec = lk.recovery || {};
      if (rec.label !== "modeled opportunity") push(`${tag}: recovery.label must be "modeled opportunity".`);
      const lo = rec.low, hi = rec.high;
      if (!Number.isInteger(lo) || !Number.isInteger(hi) || lo < 0 || hi < lo || hi > lo * 3 + 50 || lo % 50 !== 0 || hi % 50 !== 0) push(`${tag}: recovery low/high must be $50-multiples, 0<=low<=high<=~3x low.`);
      // 42/42a assumptions + client_input grounding
      if (!Array.isArray(rec.assumptions) || !rec.assumptions.length) push(`${tag}: recovery.assumptions must be non-empty.`);
      for (const a of rec.assumptions || []) {
        if (!["ratio", "usd", "count", "stars"].includes(a.unit)) push(`${tag}: assumption "${a.name}" unit invalid.`);
        if (!["client_input", "industry_benchmark"].includes(a.source)) push(`${tag}: assumption "${a.name}" source must be client_input|industry_benchmark.`);
        if (a.source === "client_input" && !clientInputs.has(a.name)) push(`${tag}: assumption "${a.name}" labeled client_input but the client supplied no such value — use industry_benchmark.`);
        if (a.unit === "ratio" && !(a.value > 0 && a.value <= 1)) push(`${tag}: ratio assumption "${a.name}" must be 0<value<=1.`);
      }
      // 43 confidence
      if (lk.confidence === "high" && !(lk.grounded === true && lk.volumeLeverObserved === true && (rec.assumptions || []).every((a) => a.source))) push(`${tag}: confidence "high" requires grounded:true, volumeLeverObserved:true, and sourced assumptions.`);
      if (lk.grounded === false && lk.confidence !== "low") push(`${tag}: grounded:false leaks must have confidence "low".`);
      if (lk.volumeLeverObserved === false && lk.confidence === "high") push(`${tag}: volumeLeverObserved:false caps confidence at "medium".`);
    }
    // 44 summary totals
    const sum = report.revenueLeakSummary || {};
    const tl = leaks.reduce((s, l) => s + (l.recovery?.low || 0), 0);
    const th = leaks.reduce((s, l) => s + (l.recovery?.high || 0), 0);
    if (sum.leakCount !== leaks.length || sum.totalLow !== tl || sum.totalHigh !== th) push("revenueLeakSummary totals/leakCount must equal the sum of leaks.");
    if (sum.label !== "modeled opportunity" || !/modeled opportunity/i.test(sum.headline || "")) push('revenueLeakSummary headline/label must carry "modeled opportunity".');
  }

  // ── Automation plan (46–51 core) ─────────────────────────────────────────────
  const ap = report.automationPlan;
  if (ap && Array.isArray(ap.automations)) {
    if (ap.automations.length < 3 || ap.automations.length > 6) push("automationPlan.automations must be 3–6.");
    const issueTitles = new Map((report.findings || []).filter((f) => ["warn", "bad"].includes(f.status)).map((f) => [f.title, f]));
    const usedServices = new Set();
    for (const a of ap.automations) {
      const tag = `automation "${a.automation || a.linkedFindingTitle || "?"}"`;
      const linked = issueTitles.get(a.linkedFindingTitle);
      if (!linked) push(`${tag}: linkedFindingTitle must exactly match a warn/bad finding title.`);
      else if (a.linkedFindingArea !== linked.area) push(`${tag}: linkedFindingArea must mirror the linked finding.`);
      if (linked && a.grounded !== linked.grounded) push(`${tag}: grounded must equal the linked finding's grounded.`);
      if (a.canonicalService != null) {
        if (!KNOWN_AUTOMATIONS.has(a.canonicalService)) push(`${tag}: canonicalService "${a.canonicalService}" is not a known service.`);
        if (usedServices.has(a.canonicalService)) push(`${tag}: canonicalService used twice.`);
        usedServices.add(a.canonicalService);
        if (a.grounded === false) push(`${tag}: canonicalService must be null when grounded:false.`);
      }
      const bi2 = a.businessImpact || {};
      if (a.grounded === false && (bi2.modeledMonthlyLow !== 0 || bi2.modeledMonthlyHigh !== 0)) push(`${tag}: grounded:false automations carry no modeled dollars (0/0).`);
      if ((bi2.modeledMonthlyHigh || 0) > 0 && !/modeled/i.test(bi2.modeledBasis || "")) push(`${tag}: modeledBasis must contain "modeled" when High>0.`);
    }
  }

  // ── Priority matrix (53–60 core) ─────────────────────────────────────────────
  const pm = report.priorityMatrix;
  if (pm && Array.isArray(pm.items)) {
    const issue = (report.findings || []).filter((f) => ["warn", "bad"].includes(f.status));
    const issueIds = new Set(issue.map((f) => f.id));
    if (pm.items.length !== issueIds.size) push("priorityMatrix must contain exactly the warn/bad findings.");
    for (const it of pm.items) {
      const tag = `priorityMatrix "${it.title || it.findingId || "?"}"`;
      if (!issueIds.has(it.findingId)) push(`${tag}: findingId must reference a warn/bad finding.`);
      if (!Number.isInteger(it.impact) || it.impact < 1 || it.impact > 10 || !Number.isInteger(it.effort) || it.effort < 1 || it.effort > 10) push(`${tag}: impact/effort must be integers 1–10.`);
      const expected = it.effort ? Math.round((it.impact * it.impact) / it.effort * 100) / 100 : null;
      if (expected != null && Math.abs((it.roiScore || 0) - expected) > 0.01) push(`${tag}: roiScore must equal round(impact^2/effort,2).`);
      if (/[$]|\b\d+(\.\d+)?\s?(%|percent)\b/.test(`${it.impactRationale} ${it.effortRationale}`)) push(`${tag}: rationales must not contain $ or % figures.`);
    }
  }

  // ── Roadmap (61–66 core) ─────────────────────────────────────────────────────
  const rm = report.implementationRoadmap;
  if (rm && Array.isArray(rm.items)) {
    if (rm.items.length < 3 || rm.items.length > 7) push("implementationRoadmap must be 3–7 items.");
    const titles = new Set((report.findings || []).map((f) => f.title));
    let addOns = 0;
    for (const it of rm.items) {
      const tag = `roadmap "${it.issue || it.findingRef || "?"}"`;
      if (it.findingRef == null) addOns++;
      else if (!titles.has(it.findingRef)) push(`${tag}: findingRef must match a finding title or be null.`);
      if (it.grounded === false && !BEST_PRACTICE_PREFIX.test(it.evidence || "")) push(`${tag}: grounded:false requires evidence "Industry best practice:".`);
      if (it.automationName != null && !KNOWN_AUTOMATIONS.has(it.automationName)) push(`${tag}: automationName "${it.automationName}" not a known service.`);
      if (/[$]\s?\d/.test(allStrings(it).join(" "))) push(`${tag}: roadmap items must not contain dollar amounts.`);
      if (it.presetProfitCanDeploy === false && it.deployNote != null) push(`${tag}: deployNote must be null when presetProfitCanDeploy is false.`);
    }
    if (addOns > 2) push("implementationRoadmap allows at most 2 best-practice add-ons (findingRef null).");
  }

  // ── Executive summary / brief (67–74 core) ───────────────────────────────────
  const es = report.executiveSummary;
  if (typeof es !== "string" || !es.trim()) push("executiveSummary is required.");
  else {
    const paras = es.split(/\n\s*\n/).filter((p) => p.trim());
    if (paras.length < 4 || paras.length > 8) push("executiveSummary must be 4–8 paragraphs.");
  }
  // 68 voice guard + 73 modeled-money guard across summary + brief strings
  const summaryStrings = [es, ...allStrings(report.executiveBrief || {})].filter((s) => typeof s === "string");
  for (const s of summaryStrings) {
    if (/\b(AI|artificial intelligence|language model|as an assistant|I ran (a |an )?(scan|analysis|tool))\b/i.test(s)) { push('Voice guard: executive summary/brief must not mention AI/assistant/"ran a scan".'); break; }
  }
  for (const s of summaryStrings) {
    const dollars = s.match(/\$[\d,]+/g) || [];
    if (dollars.length === 1 && !/modeled opportunity/i.test(s)) { push('Executive summary money must be a labeled "modeled opportunity" range, not a lone figure.'); break; }
  }

  return { ok: v.length === 0, violations: v };
}

// Soft quality signal (not a hard failure): archetype must-mention coverage.
export function mustMentionCoverage(report) {
  const archetype = getArchetype(report.businessType?.archetype || report.businessIntelligence?.businessType?.archetype);
  const text = allStrings(report).join(" ").toLowerCase();
  const hit = archetype.mustMention.filter((t) => {
    const head = t.split(/[/(]/)[0].trim().toLowerCase();
    return head && text.includes(head);
  });
  return { covered: hit.length, total: archetype.mustMention.length };
}
