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

function rowToReport(row) {
  return row.data || {};
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
      .select("data, created_at")
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

  return { audits, loading, save, remove, refresh };
}
