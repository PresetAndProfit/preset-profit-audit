// api/_lib/intelligence.js — SERVER-ONLY. V5 persistence foundation (Layers 7/8
// substrate). COLLECTS & STRUCTURES data; it does NOT learn. Two halves:
//   • PURE extractors/aggregators (exported, unit-tested in check-intelligence.mjs)
//   • service-role writers/readers that persist to the v5-persistence.sql tables.
//
// Writes are fired as best-effort side effects from existing functions
// (audits/create.js, admin/console.js, send-report.js cron) — NO new route.
import { supabaseAdmin } from "./supabaseAdmin.js";

const MIN_BENCHMARK_SAMPLE = 5; // anonymity guard: no benchmark row below this

// ── PURE extractors ──────────────────────────────────────────────────────────

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

// Modeled size bucket from lead value (proxy until firmographics exist).
function deriveBusinessSize(audit) {
  const tier = audit?.businessIntelligenceProfile?.leadValue?.tier;
  if (tier === "high") return "midmarket";
  if (tier === "medium") return "small";
  if (tier === "low") return "micro";
  return null;
}

// Weighted severity index from the diagnosis / findings (higher = worse).
function severityIndex(audit) {
  const bn = audit?.salesIntelligence?.bottlenecks;
  if (Array.isArray(bn) && bn.length) return Math.round(bn.reduce((s, b) => s + (b.impactScore || 0), 0));
  const fs = [...(audit?.leadFindings || []), ...(audit?.websiteFindings || [])];
  if (fs.length) return fs.reduce((s, f) => s + (f.status === "bad" ? 15 : f.status === "warn" ? 7 : 0), 0);
  return null;
}

// Phase A — project an audit into its queryable snapshot row.
export function extractSnapshot(audit, { auditRowId, userId } = {}) {
  const profile = audit?.businessIntelligenceProfile || null;
  const gd = audit?.growthDiagnosis || null;
  const comp = audit?.competitorIntelligence?.metrics || null;
  const leak = audit?.revenueLeakSummary || null;
  const f12 = gd?.forecast?.portfolio?.m12 || null;
  const topRec = gd?.highestRoiImprovements?.[0] || null;

  return {
    audit_id: auditRowId || null,
    user_id: userId || null,
    client_id: String(audit?.id ?? ""),
    business_name: audit?.businessName ?? null,
    industry: profile?.industry || audit?.industry || null,
    archetype: profile?.archetype || null,
    business_size: deriveBusinessSize(audit),
    overall_score: num(audit?.overallScore),
    lead_score: num(audit?.leadScore),
    website_score: num(audit?.websiteScore),
    finding_count: (audit?.leadFindings?.length || 0) + (audit?.websiteFindings?.length || 0) || null,
    severity_score: severityIndex(audit),
    revenue_leak_low: num(leak?.totalLow),
    revenue_leak_high: num(leak?.totalHigh),
    competitor_review_gap: comp && comp.reviewLeader != null && comp.yourReviews != null ? comp.reviewLeader - comp.yourReviews : null,
    competitor_rank: num(comp?.rank),
    forecast_12mo_low: num(f12?.low),
    forecast_12mo_high: num(f12?.high),
    top_workflow: topRec?.canonical || gd?.automationOpportunities?.[0]?.name || null,
    ai_generated: !!audit?.aiGenerated,
  };
}

// Phase B — every prescribed workflow → a recommendation row (status=recommended).
export function extractRecommendations(audit, { auditRowId, userId } = {}) {
  const gd = audit?.growthDiagnosis;
  const improvements = gd?.highestRoiImprovements || [];
  const plan = gd?.ninetyDayPlan || { now: [], next: [], later: [] };
  const fcByCanonical = Object.fromEntries((gd?.forecast?.recommendations || []).filter((r) => r.canonical).map((r) => [r.canonical, r]));
  const priorityOf = (action) =>
    plan.now?.includes(action) ? "now" : plan.next?.includes(action) ? "next" : plan.later?.includes(action) ? "later" : null;

  const rows = [];
  const seen = new Set();
  for (const imp of improvements) {
    const workflow = imp.canonical;
    if (!workflow || seen.has(workflow)) continue; // only canonical, deployable workflows; dedupe
    seen.add(workflow);
    rows.push({
      audit_id: auditRowId || null,
      user_id: userId || null,
      client_id: String(audit?.id ?? ""),
      business_name: audit?.businessName ?? null,
      industry: audit?.businessIntelligenceProfile?.industry || audit?.industry || null,
      workflow,
      rank: imp.rank ?? null,
      priority: priorityOf(imp.action),
      growth_driver: imp.growthDriver || null,
      impact_score: num(imp.impactScore),
      estimated_roi: { impactScore: num(imp.impactScore), effort: imp.effort || null },
      forecasted_outcome: fcByCanonical[workflow] || null,
      status: "recommended",
    });
  }
  return rows;
}

// ── PURE aggregators ─────────────────────────────────────────────────────────

export function percentiles(values) {
  const xs = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!xs.length) return null;
  const at = (p) => xs[Math.min(xs.length - 1, Math.max(0, Math.round(p * (xs.length - 1))))];
  return {
    n: xs.length,
    p25: at(0.25), p50: at(0.5), p75: at(0.75),
    mean: Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100,
  };
}

// Snapshot field → benchmark metric name.
const BENCHMARK_METRICS = {
  overall_score: "overall_score",
  lead_score: "lead_gen",
  website_score: "seo",
  severity_score: "severity",
  revenue_leak_high: "revenue_leak",
  forecast_12mo_high: "forecast_12mo",
  competitor_review_gap: "review_gap",
  competitor_rank: "competitor_position",
};

// Phase D — compute anonymized benchmark rows from snapshots. Groups by industry
// (and by industry×business_size), one row per metric, gated by MIN sample.
export function computeBenchmarks(snapshots, { minSample = MIN_BENCHMARK_SAMPLE } = {}) {
  const groups = new Map(); // key: industry||size  → snapshots[]
  const add = (industry, size, snap) => {
    if (!industry) return;
    const k = `${industry}||${size}`;
    if (!groups.has(k)) groups.set(k, { industry, size, rows: [] });
    groups.get(k).rows.push(snap);
  };
  for (const s of snapshots || []) {
    add(s.industry, "all", s);
    if (s.business_size) add(s.industry, s.business_size, s);
  }

  const out = [];
  for (const { industry, size, rows } of groups.values()) {
    for (const [field, metric] of Object.entries(BENCHMARK_METRICS)) {
      const p = percentiles(rows.map((r) => num(r[field])).filter((v) => v != null));
      if (p && p.n >= minSample) {
        out.push({ industry, business_size: size, metric, sample_size: p.n, p25: p.p25, p50: p.p50, p75: p.p75, mean: p.mean });
      }
    }
  }
  return out;
}

// Phase E — forecast accuracy: compare a recommendation's modeled $ vs the
// measured outcome. Only completed outcomes with both numbers count.
export function forecastAccuracy(recommendations, outcomes) {
  const recById = new Map((recommendations || []).map((r) => [r.id, r]));
  const ratios = [];
  for (const o of outcomes || []) {
    const rec = o.recommendation_id ? recById.get(o.recommendation_id) : null;
    const forecastHigh = rec?.forecasted_outcome?.portfolioShareHigh ?? rec?.estimated_roi?.modeledHigh ?? null;
    const measured = o.revenue_impact_cents != null ? o.revenue_impact_cents / 100 : null;
    if (forecastHigh && measured != null && forecastHigh > 0) ratios.push(measured / forecastHigh);
  }
  if (!ratios.length) return { samples: 0, medianRatio: null, withinBandPct: null };
  const sorted = ratios.slice().sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const within = ratios.filter((r) => r >= 0.5 && r <= 1.5).length;
  return { samples: ratios.length, medianRatio: Math.round(median * 100) / 100, withinBandPct: Math.round((within / ratios.length) * 100) };
}

// ── Service-role writers ──────────────────────────────────────────────────────

// Fired (best-effort) after a brand-new audit is saved. Persists the snapshot +
// recommendation rows. Idempotent via unique constraints (re-save updates).
export async function recordAuditIntelligence({ userId, audit, auditRowId }) {
  if (!auditRowId || !audit) return;
  try {
    const snap = extractSnapshot(audit, { auditRowId, userId });
    await supabaseAdmin.from("audit_snapshots").upsert(snap, { onConflict: "audit_id" });
    const recs = extractRecommendations(audit, { auditRowId, userId });
    if (recs.length) await supabaseAdmin.from("recommendations").upsert(recs, { onConflict: "audit_id,workflow" });
  } catch (e) {
    console.error("[intelligence] recordAuditIntelligence", e?.message || e);
  }
}

const REC_STATUSES = new Set(["recommended", "viewed", "accepted", "declined", "deployed", "completed"]);

// User-scoped recommendation status transition (recommended→viewed→accepted…).
export async function setRecommendationStatus({ userId, recId, status }) {
  if (!userId || !recId || !REC_STATUSES.has(status)) return { ok: false, error: "invalid" };
  const { data, error } = await supabaseAdmin
    .from("recommendations")
    .update({ status, status_changed_at: new Date().toISOString() })
    .eq("id", recId).eq("user_id", userId)
    .select("id").maybeSingle();
  if (error) return { ok: false, error: "update-failed" };
  if (!data) return { ok: false, error: "not-found" };
  return { ok: true };
}

// User-scoped outcome record (operator-entered before/after metrics). No learning
// — just structured capture for the future Market Intelligence Network.
export async function upsertOutcome({ userId, outcome }) {
  if (!userId || !outcome?.workflow) return { ok: false, error: "invalid" };
  const row = {
    id: outcome.id || undefined,
    user_id: userId,
    recommendation_id: outcome.recommendationId || null,
    audit_id: outcome.auditId || null,
    client_id: outcome.clientId || null,
    business_name: outcome.businessName || null,
    industry: outcome.industry || null,
    workflow: outcome.workflow,
    start_date: outcome.startDate || null,
    completion_date: outcome.completionDate || null,
    before_metrics: outcome.beforeMetrics || null,
    after_metrics: outcome.afterMetrics || null,
    measured_improvement: outcome.measuredImprovement || null,
    revenue_impact_cents: Number.isFinite(outcome.revenueImpactCents) ? outcome.revenueImpactCents : null,
    time_to_result_days: Number.isFinite(outcome.timeToResultDays) ? outcome.timeToResultDays : null,
    confidence: Number.isFinite(outcome.confidence) ? outcome.confidence : null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabaseAdmin.from("outcomes").upsert(row);
  return error ? { ok: false, error: "upsert-failed" } : { ok: true };
}

// Recompute the anonymized industry benchmarks from all snapshots. Called by the
// daily cron + an admin manual trigger. Service-role.
export async function rebuildBenchmarks() {
  const { data: snaps } = await supabaseAdmin
    .from("audit_snapshots")
    .select("industry, business_size, overall_score, lead_score, website_score, severity_score, revenue_leak_high, forecast_12mo_high, competitor_review_gap, competitor_rank")
    .limit(20000);
  const rows = computeBenchmarks(snaps || []).map((r) => ({ ...r, updated_at: new Date().toISOString() }));
  if (rows.length) await supabaseAdmin.from("industry_benchmarks").upsert(rows, { onConflict: "industry,business_size,metric" });
  return { benchmarks: rows.length, snapshots: (snaps || []).length };
}

// ── Service-role reader: the Executive Intelligence Dashboard (admin) ────────
export async function intelligenceDashboard() {
  const [{ count: totalAudits }, { data: snaps }, { data: recs }, { data: outs }, { data: benches }] = await Promise.all([
    supabaseAdmin.from("audit_snapshots").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("audit_snapshots").select("industry, overall_score, revenue_leak_high, top_workflow").limit(5000),
    supabaseAdmin.from("recommendations").select("id, workflow, status, industry, forecasted_outcome, estimated_roi").limit(10000),
    supabaseAdmin.from("outcomes").select("id, recommendation_id, workflow, revenue_impact_cents, time_to_result_days").limit(5000),
    supabaseAdmin.from("industry_benchmarks").select("*").order("sample_size", { ascending: false }).limit(40),
  ]);

  const tally = (arr, key) => {
    const m = new Map();
    for (const x of arr || []) { const k = x[key]; if (!k) continue; m.set(k, (m.get(k) || 0) + 1); }
    return [...m.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  };

  // Industry trends: per-industry count + avg overall + avg modeled leak.
  const byIndustry = new Map();
  for (const s of snaps || []) {
    if (!s.industry) continue;
    const g = byIndustry.get(s.industry) || { industry: s.industry, audits: 0, scoreSum: 0, scoreN: 0, leakSum: 0, leakN: 0 };
    g.audits++;
    if (s.overall_score != null) { g.scoreSum += s.overall_score; g.scoreN++; }
    if (s.revenue_leak_high != null) { g.leakSum += s.revenue_leak_high; g.leakN++; }
    byIndustry.set(s.industry, g);
  }
  const industryTrends = [...byIndustry.values()].map((g) => ({
    industry: g.industry, audits: g.audits,
    avgScore: g.scoreN ? Math.round(g.scoreSum / g.scoreN) : null,
    avgLeakHigh: g.leakN ? Math.round(g.leakSum / g.leakN) : null,
  })).sort((a, b) => b.audits - a.audits);

  const statusFunnel = Object.fromEntries(["recommended", "viewed", "accepted", "declined", "deployed", "completed"].map((s) => [s, (recs || []).filter((r) => r.status === s).length]));
  const outcomeStats = {
    recorded: (outs || []).length,
    avgRevenueImpact: (outs || []).length ? Math.round((outs.reduce((a, o) => a + (o.revenue_impact_cents || 0), 0) / outs.length) / 100) : 0,
    avgTimeToResultDays: (() => { const v = (outs || []).map((o) => o.time_to_result_days).filter((x) => x != null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; })(),
  };

  return {
    totalAudits: totalAudits || 0,
    topFindings: tally(snaps, "top_workflow").slice(0, 8),
    mostRecommendedWorkflows: tally(recs, "workflow").slice(0, 8),
    acceptanceFunnel: statusFunnel,
    mostAccepted: tally((recs || []).filter((r) => ["accepted", "deployed", "completed"].includes(r.status)), "workflow").slice(0, 8),
    industryTrends: industryTrends.slice(0, 12),
    outcomeStats,
    forecastAccuracy: forecastAccuracy(recs, outs),
    benchmarks: benches || [],
  };
}
