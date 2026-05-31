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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method-not-allowed" });
  }

  // 1. Authentication
  const user = await getUserFromRequest(req);
  if (!user) return res.status(401).json({ ok: false, error: "unauthorized" });

  // 2. Input
  let url = req.body?.url;
  if (!url && typeof req.body === "string") {
    try { url = JSON.parse(req.body).url; } catch { /* ignore */ }
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
  try {
    const result = await scanSite(url, { fetchPage: safeFetchPage });
    return res.status(200).json(result);
  } catch (e) {
    return res.status(200).json({ ok: false, error: "scan-failed", detail: String(e?.message || e) });
  }
}
