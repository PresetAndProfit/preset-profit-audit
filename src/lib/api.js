// src/lib/api.js — authenticated client → serverless calls.
// Attaches the Supabase access token so server endpoints can authenticate the
// user (and enforce credits, rate limits, admin checks) on every request.
import { supabase } from "./supabaseClient.js";

export async function authedFetch(path, { method = "POST", body } = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
}

// Convenience wrapper returning { status, ok, json } (never throws on HTTP errors).
export async function authedJson(path, opts) {
  const res = await authedFetch(path, opts);
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, ok: res.ok, json };
}
