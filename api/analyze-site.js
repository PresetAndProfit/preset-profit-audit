// api/analyze-site.js — Vercel Serverless Function (HARDENED in Tier 2).
// Fetches the real homepage server-side and returns evidence-based signals.
//
// Security layers added:
//   • Requires an authenticated user (Bearer access token).
//   • Per-user rate limiting (burst + daily) via usage_events.
//   • Credit pre-check: free users who already used their 1 audit can't scan.
//   • SSRF-safe fetch (private-IP / redirect / rebind guarded) via safeFetchPage.
//   • Logs a 'site_scan' usage event for metering + rate limiting + admin view.
//
// POST /api/analyze-site   Body: { url }   Header: Authorization: Bearer <token>
import { scanSite } from "../src/lib/siteAnalyzer.js";
import { safeFetchPage } from "./_lib/safeFetch.js";
import { getUserFromRequest } from "./_lib/supabaseAdmin.js";
import { checkRateLimit, SCAN_LIMITS } from "./_lib/rateLimit.js";
import {
  getUserPlan, countAudits, logUsageEvent, clientIp,
} from "./_lib/usageServer.js";
import { aiEnabled, generateConsultantReport } from "./_lib/aiFindings.js";
import { classifyBusiness } from "./_lib/agents/classifier.js";
import { gatherCompetitiveLandscape } from "./_lib/research/index.js";
import { runCompetitorAgent } from "./_lib/agents/competitor.js";
import { runSalesAgent } from "./_lib/agents/salesIntel.js";
import { runSynthesisAgent } from "./_lib/agents/synthesis.js";
import { validateReport, mustMentionCoverage } from "./_lib/findingsValidation.js";
import { isDisabled } from "./_lib/systemSettings.js";
import { isAdminEmail } from "./_lib/adminAuth.js";

// Layer 2+3: run the AI consultant on a successful scrape, with one corrective
// retry if the validator rejects the first attempt. Returns the validated
// report or null (caller falls back to the deterministic archetype engine).
async function runConsultant({ signals, bizName, industry, city, url, profile }) {
  if (!aiEnabled) return null;
  let corrections = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    let report;
    try {
      report = await generateConsultantReport({ signals, bizName, industry, city, url, corrections, profile });
    } catch (e) {
      console.error("[analyze-site] consultant call failed", attempt, e?.message || e);
      return null; // hard error → deterministic fallback
    }
    // No client-supplied levers in this flow (homepage-only scrape), so the
    // validator rejects any assumption labeled "client_input". city is the
    // LOCATION hint — the validator forbids echoing it as observed geography.
    const { ok, violations } = validateReport(report, { signals, clientInputs: new Set(), locationHint: city });
    if (ok) {
      const coverage = mustMentionCoverage(report);
      console.log("[analyze-site] consultant ok", {
        archetype: report.businessType?.archetype,
        confidence: report.businessType?.confidence,
        findings: report.findings?.length, coverage, attempt,
      });
      return report;
    }
    console.warn("[analyze-site] consultant rejected", { attempt, violations });
    corrections = violations; // feed back for the single retry
  }
  return null; // failed validation twice → deterministic fallback
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method-not-allowed" });
  }

  // 1. Authentication
  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ ok: false, error: "unauthorized" });

  // System control: admin can disable audits platform-wide (admins exempt).
  if (!isAdminEmail(user.email) && await isDisabled("audits_disabled")) {
    return res.status(503).json({ ok: false, error: "audits-disabled" });
  }

  // 2. Input
  const body = typeof req.body === "string" ? safeJson(req.body) : (req.body || {});
  const url = body.url;
  const { bizName = null, industry = null, city = null } = body;

  // 2b. ACTION: competitor research (V2 Phase 3). Runs as a SEPARATE call after
  // the main audit so each request stays well under the function timeout (no new
  // route — action-routing on this endpoint). Consumes no credit; rate-limited
  // because it spends on the Places API. Best-effort: returns available:false
  // rather than erroring when there's no key/data.
  if (body.action === "competitor") {
    const crl = await checkRateLimit(user.id, "competitor_research", SCAN_LIMITS);
    if (!crl.allowed) return res.status(429).json({ ok: false, error: "rate-limited" });
    if (!bizName) return res.status(400).json({ ok: false, error: "missing-business" });
    try {
      const landscape = await gatherCompetitiveLandscape({ profile: body.profile || null, bizName, city, url: url || null });
      const competitor = await runCompetitorAgent({ landscape, profile: body.profile || null });
      await logUsageEvent(user.id, "competitor_research", { metadata: { ip: clientIp(req), available: !!competitor?.available } });
      return res.status(200).json({ ok: true, competitor });
    } catch (e) {
      console.error("[analyze-site] competitor action error", e?.message || e);
      return res.status(200).json({ ok: true, competitor: { available: false, reason: "error" } });
    }
  }

  // 2c. ACTION: sales-process analysis (V2 Phase 4). Separate, parallel-able
  // post-audit call (no new route, no credit). Pure reasoning over the scraped
  // signals + the BIP — ranks the bottlenecks that materially affect growth in
  // this industry by revenue impact (growth-driver weight × lead value × severity).
  if (body.action === "sales") {
    const srl = await checkRateLimit(user.id, "sales_intel", SCAN_LIMITS);
    if (!srl.allowed) return res.status(429).json({ ok: false, error: "rate-limited" });
    try {
      const sales = await runSalesAgent({ signals: body.signals || {}, profile: body.profile || null });
      await logUsageEvent(user.id, "sales_intel", { metadata: { ip: clientIp(req), bottlenecks: sales?.bottlenecks?.length || 0 } });
      return res.status(200).json({ ok: true, sales });
    } catch (e) {
      console.error("[analyze-site] sales action error", e?.message || e);
      return res.status(200).json({ ok: true, sales: { available: false, reason: "error" } });
    }
  }

  // 2d. ACTION: synthesis (V2 Phase 7, the capstone). Assembles the GROWTH
  // DIAGNOSIS from every prior stage the client has gathered (BIP + consultant
  // blocks + competitor + sales). Separate post-audit call (no new route, no
  // credit, rate-limited). Structured sections are deterministic/weight-ranked;
  // the AI writes only the consultant-voice sections.
  if (body.action === "synthesis") {
    const yrl = await checkRateLimit(user.id, "synthesis", SCAN_LIMITS);
    if (!yrl.allowed) return res.status(429).json({ ok: false, error: "rate-limited" });
    try {
      const diagnosis = await runSynthesisAgent({
        profile: body.profile || null,
        consultant: body.consultant || null,
        competitor: body.competitor || null,
        sales: body.sales || null,
      });
      await logUsageEvent(user.id, "synthesis", { metadata: { ip: clientIp(req) } });
      return res.status(200).json({ ok: true, diagnosis });
    } catch (e) {
      console.error("[analyze-site] synthesis action error", e?.message || e);
      return res.status(200).json({ ok: true, diagnosis: { available: false, reason: "error" } });
    }
  }

  if (!url || typeof url !== "string") {
    return res.status(400).json({ ok: false, error: "missing-url" });
  }

  // 3. Rate limiting (abuse protection)
  const rl = await checkRateLimit(user.id, "site_scan", SCAN_LIMITS);
  if (!rl.allowed) {
    return res.status(429).json({
      ok: false, error: "rate-limited",
      detail: `Too many scans — limit ${rl.limit} per ${rl.windowSeconds >= 3600 ? "day" : "minute"}.`,
    });
  }

  // 4. Credit pre-check — a free user at their audit limit may not scan again.
  const { plan, subscription } = await getUserPlan(user.id);
  if (plan.auditLimit != null) {
    const used = await countAudits(user.id, plan, subscription);
    if (used >= plan.auditLimit) {
      return res.status(402).json({ ok: false, error: "limit-reached", plan: plan.id });
    }
  }

  // 5. Log the scan attempt (counts toward rate limit + admin metrics)
  await logUsageEvent(user.id, "site_scan", { metadata: { ip: clientIp(req), url } });

  // 6. SSRF-safe scan
  let result;
  try {
    result = await scanSite(url, { fetchPage: safeFetchPage });
  } catch (e) {
    return res.status(200).json({ ok: false, error: "scan-failed", detail: String(e?.message || e) });
  }

  // 7. AI pipeline (Layers 0–3). Only when the scrape produced real signals.
  //    Any failure leaves `result` untouched → deterministic fallback downstream.
  if (result.ok && result.signals) {
    try {
      // Stage 0 — Business Classification Agent. Produces the Business
      // Intelligence Profile (the spine) BEFORE analysis, so the consultant
      // reasons from one shared understanding of the business model. Null on
      // any failure → consultant falls back to the user's industry hint.
      const profile = await classifyBusiness({ signals: result.signals, bizName, industry, city, url });
      if (profile) result.profile = profile;

      const ai = await runConsultant({ signals: result.signals, bizName, industry, city, url, profile });
      if (ai) {
        // Persist the spine inside the report blob (→ audits.data) so the
        // competitor / sales / social agents in later phases can consume it.
        if (profile) ai.businessIntelligenceProfile = profile;
        result.ai = ai;
        result.aiGenerated = true;
      }
    } catch (e) {
      console.error("[analyze-site] consultant orchestration error", e?.message || e);
    }
  }

  return res.status(200).json(result);
}

function safeJson(s) {
  try { return JSON.parse(s || "{}"); } catch { return {}; }
}
