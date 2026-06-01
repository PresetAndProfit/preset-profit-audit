// ─────────────────────────────────────────────────────────────────────────────
// dealEngine.js
// The single source of truth for the Growth OS pipeline. A "Deal" is an audit
// row enriched with pipeline columns (stage, crm, next_action_at, ...). This
// module owns the stage machine + derived aggregates. Pure, no React, no network
// — safe to import on the server too (api/audits/create.js validates stages
// against STAGE_KEYS here).
//
// Pipeline: Lead Found → Audit → Roadmap → Proposal → Outreach → Follow-up →
//           Closed Won → (Automation Sold), with Closed Lost as the off-ramp.
// ─────────────────────────────────────────────────────────────────────────────

export const STAGES = [
  { key: "lead",        label: "Lead",        short: "Lead",     color: "#6b6b85", blurb: "Prospect identified" },
  { key: "audit",       label: "Audited",     short: "Audit",    color: "#4a9eff", blurb: "Audit generated" },
  { key: "roadmap",     label: "Roadmap",     short: "Roadmap",  color: "#a78bfa", blurb: "Automation roadmap built" },
  { key: "proposal",    label: "Proposal",    short: "Proposal", color: "#f5a623", blurb: "Proposal delivered" },
  { key: "outreach",    label: "Outreach",    short: "Outreach", color: "#22d3ee", blurb: "Outreach generated/sent" },
  { key: "followup",    label: "Follow-up",   short: "Follow-up",color: "#fb923c", blurb: "Working the deal" },
  { key: "closed_won",  label: "Closed Won",  short: "Won",      color: "#00d68f", blurb: "Client closed" },
  { key: "closed_lost", label: "Closed Lost", short: "Lost",     color: "#ff4757", blurb: "Did not convert" },
];

export const STAGE_KEYS = STAGES.map(s => s.key);
export const STAGE_BY_KEY = Object.fromEntries(STAGES.map(s => [s.key, s]));

// The forward sales flow (Closed Lost is an explicit off-ramp, not in the flow).
export const MAIN_FLOW = ["lead", "audit", "roadmap", "proposal", "outreach", "followup", "closed_won"];
export const OPEN_STAGES = ["lead", "audit", "roadmap", "proposal", "outreach", "followup"];
export const isClosed = stage => stage === "closed_won" || stage === "closed_lost";
export const isWon = stage => stage === "closed_won";

export function stageMeta(key) { return STAGE_BY_KEY[key] || STAGE_BY_KEY.audit; }
export function stageColor(key) { return stageMeta(key).color; }
export function stageLabel(key) { return stageMeta(key).label; }
export function flowIndex(key) { const i = MAIN_FLOW.indexOf(key); return i < 0 ? 1 : i; }

// Every audit row should resolve to a stage. New rows carry one in a column;
// legacy rows (pre-migration) back-fill to 'audit' — they have a report but no
// pipeline history, so 'audit' is the truthful starting point.
export function deriveStage(audit) {
  const s = audit?.stage;
  return s && STAGE_BY_KEY[s] ? s : "audit";
}

// Forward-only: returns the later of two stages along the main flow, so an
// engine transition (e.g. opening the roadmap) can stamp progress without ever
// downgrading a deal the operator already advanced. Closed stages are sticky.
export function maxStage(current, candidate) {
  if (isClosed(current)) return current;
  return flowIndex(candidate) > flowIndex(current) ? candidate : current;
}

export function nextStage(current) {
  const i = MAIN_FLOW.indexOf(current);
  if (i < 0 || i >= MAIN_FLOW.length - 1) return current;
  return MAIN_FLOW[i + 1];
}

// Agency revenue for a deal = the proposal's first-year cost (what the client
// pays). Stored in cents on the deal so pipeline value sums cheaply.
export function dealValueCents(roadmap) {
  const v = roadmap?.totals?.firstYearCost;
  return Number.isFinite(v) ? Math.round(v * 100) : 0;
}

// Roll a list of deals (audits) into pipeline aggregates for the board header,
// the intelligence funnel, and admin analytics.
export function pipelineAggregates(audits = []) {
  const byStage = Object.fromEntries(STAGE_KEYS.map(k => [k, 0]));
  let openValue = 0, wonValue = 0, dueFollowups = 0;
  const now = Date.now();
  for (const a of audits) {
    const stage = deriveStage(a);
    byStage[stage] = (byStage[stage] || 0) + 1;
    const val = a.deal_value_cents || 0;
    if (stage === "closed_won") wonValue += val;
    else if (!isClosed(stage)) openValue += val;
    if (a.next_action_at && new Date(a.next_action_at).getTime() <= now && !isClosed(stage)) dueFollowups++;
  }
  const closed = byStage.closed_won + byStage.closed_lost;
  const winRate = closed > 0 ? Math.round((byStage.closed_won / closed) * 100) : 0;
  return { byStage, openValueCents: openValue, wonValueCents: wonValue, dueFollowups, winRate, total: audits.length };
}

// Is a scheduled follow-up due (or overdue)?
export function isFollowupDue(audit, now = Date.now()) {
  return !!audit?.next_action_at && new Date(audit.next_action_at).getTime() <= now && !isClosed(deriveStage(audit));
}
