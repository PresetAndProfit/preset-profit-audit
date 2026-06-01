import { useState } from "react";
import { Btn } from "./ui/index.jsx";
import { startCheckout } from "../lib/billing.js";

// One-click path to Stripe Checkout from any conversion surface — removes the
// "go to Account → pick a plan" detour so the upgrade is a single tap. Reuses
// the existing billing client (no new endpoint, no billing setup). On failure it
// surfaces the error inline rather than silently failing.
export default function UpgradeButton({ planId = "professional", children = "Upgrade →", variant = "primary", full = false, small = false }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const go = async () => {
    setErr(""); setBusy(true);
    try {
      const { url } = await startCheckout(planId);
      if (url) window.location.assign(url);
      else throw new Error("no-checkout-url");
    } catch (e) {
      setErr(`Couldn't start checkout (${e.message}).`);
      setBusy(false);
    }
  };

  return (
    <div style={{ display: full ? "block" : "inline-block" }}>
      <Btn variant={variant} full={full} small={small} disabled={busy} onClick={go}>
        {busy ? "Redirecting…" : children}
      </Btn>
      {err && <div style={{ fontSize: 11, color: "var(--red)", marginTop: 6 }}>{err}</div>}
    </div>
  );
}
