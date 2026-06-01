// ─────────────────────────────────────────────────────────────────────────────
// pipeline.js
// Integration glue between the engines (audit, roadmap, proposal, outreach) and
// the persisted Deal. Each engine transition calls stampStage() to advance the
// deal forward (never backward) and append an activity record, persisting via
// useAudits().updateDeal → api/audits/create.js {op:'deal_update'}.
//
// crm jsonb shape: { notes:[{at,text}], activity:[{at,type,detail}],
//   outreach:{...}, followups:[{at,channel,sent}], soldAutomations:[id],
//   clientLabel:string, autoSend:bool }
// ─────────────────────────────────────────────────────────────────────────────

import { deriveStage, maxStage } from "./dealEngine.js";

const ISO = () => new Date().toISOString();
const ACTIVITY_CAP = 60; // keep the jsonb lean

export function appendActivity(crm, type, detail) {
  const activity = [...((crm && crm.activity) || []), { at: ISO(), type, detail }].slice(-ACTIVITY_CAP);
  return { ...(crm || {}), activity };
}

export function appendNote(crm, text) {
  const notes = [...((crm && crm.notes) || []), { at: ISO(), text }];
  return { ...(crm || {}), notes };
}

// Advance a deal to `stage` (forward-only along the main flow; closed stages are
// set explicitly via setStage). Logs an activity line. `extra` carries column
// patches (deal_value_cents, contact_*, next_action_at, crm). Returns the
// updateDeal promise so callers can await persistence.
export function stampStage(updateDeal, deal, stage, { detail, ...extra } = {}) {
  if (!deal || typeof updateDeal !== "function") return Promise.resolve({ ok: false });
  const current = deriveStage(deal);
  const target = maxStage(current, stage);
  // Merge an activity record into whatever crm the caller passed (or the deal's).
  const baseCrm = extra.crm || deal.crm || {};
  const crm = target !== current
    ? appendActivity(baseCrm, "stage", `${current} → ${target}${detail ? ` · ${detail}` : ""}`)
    : (extra.crm ? baseCrm : undefined);
  const patch = { ...extra, stage: target };
  if (crm) patch.crm = crm;
  // No-op guard: nothing changed and no extra fields → skip the network call.
  if (target === current && Object.keys(extra).length === 0 && !crm) return Promise.resolve({ ok: true, noop: true });
  return updateDeal(deal.id, patch);
}

// Explicit stage set (used by the board for manual moves incl. closed_won/lost).
export function setStage(updateDeal, deal, stage, detail) {
  if (!deal || typeof updateDeal !== "function") return Promise.resolve({ ok: false });
  const crm = appendActivity(deal.crm || {}, "stage", `${deriveStage(deal)} → ${stage}${detail ? ` · ${detail}` : ""}`);
  return updateDeal(deal.id, { stage, crm });
}
