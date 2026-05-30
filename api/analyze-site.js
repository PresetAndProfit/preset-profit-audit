// api/analyze-site.js — Vercel Serverless Function
// Fetches the real homepage server-side (the browser can't, due to CORS) and
// returns evidence-based signals + findings. All analysis logic lives in the
// shared, pure analyzer so the dev middleware and production use one code path.
//
// POST /api/analyze-site   Body: { url }
// Returns: { ok, signals, findings, scannedAt } | { ok:false, error }

import { scanSite } from "../src/lib/siteAnalyzer.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "method-not-allowed" });
  }

  let url = req.body?.url;
  if (!url && typeof req.body === "string") {
    try { url = JSON.parse(req.body).url; } catch { /* ignore */ }
  }
  if (!url || typeof url !== "string") {
    return res.status(400).json({ ok: false, error: "missing-url" });
  }

  try {
    const result = await scanSite(url);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(200).json({ ok: false, error: "scan-failed", detail: String(e) });
  }
}
