// src/lib/storage.js — audit persistence (Tier 2: server-enforced writes).
//
// Reads stay client-side (RLS lets a user SELECT their own audits). WRITES go
// through serverless endpoints because the audits table no longer accepts
// client INSERT/UPDATE — that's what makes the "Free = 1 audit" credit limit
// impossible to bypass from the browser:
//   • save(audit)  → POST /api/audits/create   (credit-checked server-side)
//   • legacy import → POST /api/audits/import   (one-time migration)
//   • remove(id)   → client DELETE (RLS still permits deleting your own rows)
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabaseClient.js";
import { authedJson } from "./api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { STORAGE_KEY } from "./constants.js";
import { deriveStage } from "./dealEngine.js";

// The report object stored in `data` is the audit; the pipeline columns (added
// in phase2-crm.sql) enrich it into a Deal. We merge them on read so the whole
// app sees one object. Pre-migration rows simply lack the columns and fall back
// to sensible defaults — selecting "*" keeps this resilient to migration order.
function rowToReport(row) {
  const data = row.data || {};
  return {
    ...data,
    stage: row.stage || deriveStage(data),
    crm: row.crm || {},
    next_action_at: row.next_action_at || null,
    last_contact_at: row.last_contact_at || null,
    deal_value_cents: row.deal_value_cents ?? null,
    contact_email: row.contact_email || data.email || null,
    contact_name: row.contact_name || null,
  };
}

function readLegacyLocal() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}

export function useAudits() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const importedFor = useRef(null);

  const refresh = useCallback(async () => {
    if (!userId) { setAudits([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from("audits")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (!error && data) setAudits(data.map(rowToReport));
    setLoading(false);
  }, [userId]);

  // One-time migration of any legacy localStorage audits into the account,
  // through the server (client can't insert directly anymore).
  const importLegacy = useCallback(async () => {
    if (!userId || importedFor.current === userId) return;
    importedFor.current = userId;
    const legacy = readLegacyLocal();
    if (!legacy.length) return;
    const { ok } = await authedJson("/api/audits/import", { body: { audits: legacy } });
    if (ok) {
      try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    }
  }, [userId]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      await importLegacy();
      if (active) await refresh();
    })();
    return () => { active = false; };
  }, [importLegacy, refresh]);

  // Returns { ok, error }. On the server rejecting (e.g. credit limit), the
  // optimistic row is rolled back by re-reading from the DB.
  const save = useCallback(async (audit) => {
    if (!userId) return { ok: false, error: "not-signed-in" };
    setAudits((prev) => [audit, ...prev.filter((a) => a.id !== audit.id)]); // optimistic
    const { ok, status, json } = await authedJson("/api/audits/create", { body: { audit } });
    if (!ok) {
      await refresh(); // roll back optimistic insert
      return { ok: false, error: json?.error || `save-failed-${status}`, status };
    }
    return { ok: true, audit: json?.audit ?? audit };
  }, [userId, refresh]);

  const remove = useCallback(async (id) => {
    if (!userId) return;
    setAudits((prev) => prev.filter((a) => a.id !== id));
    const { error } = await supabase
      .from("audits")
      .delete()
      .eq("user_id", userId)
      .eq("client_id", String(id));
    if (error) await refresh();
  }, [userId, refresh]);

  // Deal/CRM mutation (stage, notes, activity, outreach, next_action_at, …).
  // Routes through the SAME server endpoint as audit writes via {op:'deal_update'}
  // — no new serverless function, no credit consumed. Optimistic; rolls back on
  // server rejection by re-reading. `patch` keys map 1:1 to audit columns.
  const updateDeal = useCallback(async (clientId, patch) => {
    if (!userId || !patch) return { ok: false, error: "no-op" };
    setAudits((prev) => prev.map((a) => (String(a.id) === String(clientId) ? { ...a, ...patch } : a)));
    const { ok, status, json } = await authedJson("/api/audits/create", {
      body: { op: "deal_update", clientId: String(clientId), patch },
    });
    if (!ok) {
      await refresh();
      return { ok: false, error: json?.error || `deal-update-${status}`, status };
    }
    return { ok: true };
  }, [userId, refresh]);

  // Arm the activation nudge sequence on a deal (server validates contact email
  // + booking link, then fires the immediate touch). Optimistic enable.
  const startActivation = useCallback(async (clientId) => {
    if (!userId) return { ok: false, error: "not-signed-in" };
    const { ok, status, json } = await authedJson("/api/audits/create", {
      body: { op: "activation_start", clientId: String(clientId) },
    });
    if (ok) {
      setAudits((prev) => prev.map((a) => (String(a.id) === String(clientId)
        ? { ...a, crm: { ...(a.crm || {}), activation: { ...((a.crm && a.crm.activation) || {}), enabled: true, startedAt: (a.crm?.activation?.startedAt) || new Date().toISOString(), booked: false } } }
        : a)));
    }
    return { ok, error: ok ? null : (json?.error || `activation-${status}`), status };
  }, [userId]);

  return { audits, loading, save, remove, refresh, updateDeal, startActivation };
}
