import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { PLANS, PLAN_ORDER } from "../lib/plans.js";
import { computeUsage } from "../lib/usage.js";
import { startCheckout, openBillingPortal, syncSubscription } from "../lib/billing.js";
import { Btn, Tag } from "./ui/index.jsx";
import BrandingPanel from "./BrandingPanel.jsx";

export default function AccountView({ audits }) {
  const { user, profile, subscription, plan, signOut, refreshAccount } = useAuth();
  const usage = computeUsage(audits, plan, subscription);
  const pct = usage.limit > 0 ? Math.min(100, Math.round((usage.used / usage.limit) * 100)) : 0;
  const periodLabel = usage.period === "month" ? "this month" : "total";

  const [busy, setBusy] = useState(null); // plan id being processed, or 'portal'
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  // Handle the return from Stripe Checkout (success_url carries ?checkout=...).
  // On success we pull the subscription from Stripe immediately so the plan
  // updates without waiting for the webhook, then strip the query params.
  const handleReturn = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("checkout");
    if (!status) return;
    // Resolve the result before touching React state so we never call setState
    // synchronously inside the mount effect (avoids cascading renders).
    let message = "";
    if (status === "success") {
      try {
        await syncSubscription();
        await refreshAccount();
        message = "You're all set — your plan is active. 🎉";
      } catch {
        message = "Payment received. Your plan will update momentarily.";
      }
    } else if (status === "cancel") {
      await Promise.resolve();
      message = "Checkout canceled — no charge was made.";
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("checkout");
    url.searchParams.delete("plan");
    window.history.replaceState({}, "", url.pathname + url.search);
    setNotice(message);
  }, [refreshAccount]);

  // One-shot sync with an external system (the Stripe Checkout return URL) on
  // mount; state updates happen only after the async work completes.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { handleReturn(); }, [handleReturn]);

  const upgrade = async (planId) => {
    setError(""); setBusy(planId);
    try {
      const { url } = await startCheckout(planId);
      if (url) window.location.assign(url);
      else throw new Error("no-checkout-url");
    } catch (e) {
      setError(`Couldn't start checkout (${e.message}). Check Stripe keys/prices.`);
      setBusy(null);
    }
  };

  const manageBilling = async () => {
    setError(""); setBusy("portal");
    try {
      const { url } = await openBillingPortal();
      if (url) window.location.assign(url);
      else throw new Error("no-portal-url");
    } catch (e) {
      setError(`Couldn't open billing portal (${e.message}).`);
      setBusy(null);
    }
  };

  const isPaid = plan.id !== "free";

  // Human-readable subscription status. Professional shows "Trial · ends <date>";
  // Agency (no trial) and recovered subs show "Active"; other statuses are shown
  // capitalized (e.g. "Past_due", "Canceled").
  const statusLabel = (() => {
    const s = subscription?.status;
    if (s === "trialing") {
      const ends = subscription?.trial_ends_at;
      return ends ? `Trial · ends ${new Date(ends).toLocaleDateString()}` : "Trial";
    }
    if (!s) return "Active";
    return s.charAt(0).toUpperCase() + s.slice(1);
  })();

  return (
    <div className="page-pad" style={{ maxWidth: 860, margin: "0 auto", animation: "fadeUp .4s ease" }}>
      <h1 style={{ fontFamily: "Syne", fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Account & Plan</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 24 }}>
        Manage your subscription and track your audit usage.
      </p>

      {notice && (
        <div style={{ background: "rgba(0,214,143,0.1)", border: "1px solid rgba(0,214,143,0.3)", borderRadius: 6, padding: "10px 12px", marginBottom: 16, fontSize: 12, color: "var(--green)" }}>{notice}</div>
      )}
      {error && (
        <div style={{ background: "rgba(255,71,87,0.1)", border: "1px solid rgba(255,71,87,0.3)", borderRadius: 6, padding: "10px 12px", marginBottom: 16, fontSize: 12, color: "#ff4757" }}>{error}</div>
      )}

      {/* Current plan + usage */}
      <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 10, padding: 24, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Signed in as</div>
            <div style={{ fontSize: 14, color: "var(--text)" }}>{profile?.full_name || user?.email}</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>{user?.email}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ marginBottom: 6 }}><Tag color="var(--amber)">{plan.name} plan</Tag></div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>
              {statusLabel}
            </div>
            {isPaid && (
              <div style={{ marginTop: 8 }}>
                <Btn small variant="ghost" onClick={manageBilling} disabled={busy === "portal"}>
                  {busy === "portal" ? "Opening…" : "Manage billing"}
                </Btn>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
            <span style={{ color: "var(--muted)" }}>Audits used ({periodLabel})</span>
            <span style={{ color: "var(--text)", fontFamily: "IBM Plex Mono" }}>
              {usage.unlimited ? `${usage.used} · Unlimited` : `${usage.used} / ${usage.limit}`}
            </span>
          </div>
          <div style={{ height: 6, background: "var(--surface)", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: usage.unlimited ? "100%" : `${pct}%`, background: usage.unlimited ? "var(--green)" : usage.atLimit ? "var(--red)" : "var(--amber)", borderRadius: 3, transition: "width .5s ease" }} />
          </div>
          {usage.atLimit && (
            <div style={{ fontSize: 11, color: "var(--red)", marginTop: 8 }}>
              You've used all audits on the {plan.name} plan. Upgrade for unlimited audits.
            </div>
          )}
        </div>
      </div>

      {/* White-label branding (Agency) */}
      {plan.whiteLabel && <BrandingPanel />}

      {/* Plan comparison */}
      <div style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Plans</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 24 }}>
        {PLAN_ORDER.map((id) => {
          const p = PLANS[id];
          const current = plan.id === id;
          return (
            <div key={id} style={{
              background: "var(--panel)", borderRadius: 10, padding: 20,
              border: `1px solid ${current ? "var(--amber)" : "var(--border)"}`,
              position: "relative",
            }}>
              {current && <div style={{ position: "absolute", top: 14, right: 14 }}><Tag color="var(--green)">Current</Tag></div>}
              <div style={{ fontFamily: "Syne", fontSize: 16, fontWeight: 800 }}>{p.name}</div>
              <div style={{ margin: "6px 0 12px" }}>
                <span style={{ fontSize: 24, fontWeight: 700, fontFamily: "Syne" }}>{p.price}</span>
                <span style={{ fontSize: 12, color: "var(--muted)" }}> {p.priceNote}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12, minHeight: 32 }}>{p.blurb}</div>
              {id !== "free" && (
                <div style={{ fontSize: 11, fontWeight: 600, color: p.trialDays ? "var(--green)" : "var(--muted)", marginBottom: 10 }}>
                  {p.trialDays ? `Start with a ${p.trialDays}-day free trial.` : "Immediate activation. No trial required."}
                </div>
              )}
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px", display: "grid", gap: 6 }}>
                {p.features.map((f) => (
                  <li key={f} style={{ fontSize: 11, color: "var(--text)", display: "flex", gap: 8 }}>
                    <span style={{ color: "var(--green)" }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              {current ? (
                <Btn full variant="muted" disabled>Current plan</Btn>
              ) : id === "free" ? (
                <Btn full variant="ghost" disabled>Free tier</Btn>
              ) : (
                <Btn full onClick={() => upgrade(id)} disabled={busy === id}>
                  {busy === id ? "Redirecting…" : `Upgrade to ${p.name} →`}
                </Btn>
              )}
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: 11, color: "var(--muted)", marginBottom: 20 }}>
        Secure checkout by Stripe. Cancel anytime from Manage billing.
      </p>

      <Btn variant="ghost" onClick={signOut}>Sign out</Btn>
    </div>
  );
}
