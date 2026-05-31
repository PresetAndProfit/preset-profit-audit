// src/context/AuthContext.jsx — app-wide auth + subscription state.
// Wraps Supabase Auth: tracks the session, and loads the user's profile and
// subscription row so the rest of the app can gate features by plan.
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { getPlan } from "../lib/plans.js";

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

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session ?? null);
      // finally guarantees the loading gate clears even if loadAccount throws,
      // so the app can never get stuck on the loading spinner after login.
      try {
        await loadAccount(data.session?.user?.id);
      } finally {
        if (active) setLoading(false);
      }
    }).catch(() => { if (active) setLoading(false); });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
      loadAccount(newSession?.user?.id);
    });

    return () => {
      active = false;
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

  const plan = getPlan(subscription?.plan);

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
