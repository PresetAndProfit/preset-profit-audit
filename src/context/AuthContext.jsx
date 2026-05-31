// src/context/AuthContext.jsx — app-wide auth + subscription state.
// Wraps Supabase Auth: tracks the session, and loads the user's profile and
// subscription row so the rest of the app can gate features by plan.
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { effectivePlan } from "../lib/plans.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  const user = session?.user ?? null;

  const loadAccount = useCallback(async (uid) => {
    if (!uid) {
      setProfile(null);
      setSubscription(null);
      return;
    }
    // Never let a failed/slow fetch reject — the caller gates the app's loading
    // state on this, so a throw here would otherwise hang the whole app on the
    // loading spinner. Degrade to nulls (plan falls back to free) instead.
    try {
      const [{ data: prof }, { data: sub }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("subscriptions").select("*").eq("user_id", uid).maybeSingle(),
      ]);
      setProfile(prof ?? null);
      setSubscription(sub ?? null);
    } catch (e) {
      console.error("[auth] loadAccount failed", e);
      setProfile(null);
      setSubscription(null);
    }
  }, []);

  useEffect(() => {
    let active = true;

    // Drive auth state from onAuthStateChange ONLY. It emits an INITIAL_SESSION
    // event immediately on subscribe (with the current session, or null), so we
    // never call supabase.auth.getSession() — which can hang indefinitely on the
    // auth lock and leave `loading` stuck true (→ ProtectedRoute spins forever →
    // blank authenticated app).
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!active) return;
      setSession(newSession ?? null);
      setLoading(false); // always clear the gate on the first auth event
      // Defer DB reads OUT of the auth callback — calling supabase.from()/auth
      // synchronously inside this callback can deadlock the auth lock.
      setTimeout(() => { if (active) loadAccount(newSession?.user?.id); }, 0);
    });

    // Safety net: never let the app hang on the loader if no event arrives.
    const t = setTimeout(() => { if (active) setLoading(false); }, 3000);

    return () => {
      active = false;
      clearTimeout(t);
      sub.subscription.unsubscribe();
    };
  }, [loadAccount]);

  const signUp = useCallback(async ({ email, password, fullName, companyName }) => {
    return supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, company_name: companyName } },
    });
  }, []);

  const signIn = useCallback(async ({ email, password }) => {
    return supabase.auth.signInWithPassword({ email, password });
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const sendPasswordReset = useCallback(async (email) => {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
  }, []);

  const updatePassword = useCallback(async (password) => {
    return supabase.auth.updateUser({ password });
  }, []);

  const refreshAccount = useCallback(() => loadAccount(user?.id), [loadAccount, user?.id]);

  // Entitlement (and the plan shown in the UI) must account for status, not just
  // the stored plan id — a canceled/unpaid subscriber drops back to free. Mirrors
  // the authoritative server-side check in api/_lib/usageServer.js.
  const plan = effectivePlan(subscription);

  const value = {
    session,
    user,
    profile,
    subscription,
    plan,
    loading,
    signUp,
    signIn,
    signOut,
    sendPasswordReset,
    updatePassword,
    refreshAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
