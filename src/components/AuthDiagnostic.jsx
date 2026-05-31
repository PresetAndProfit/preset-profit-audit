import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient.js";

// ⚠️ TEMPORARY DIAGNOSTIC — remove once the post-login blank screen is resolved.
// Renders a guaranteed-visible panel (literal styles, no CSS-var dependency) and
// independently exercises the exact Supabase reads the authenticated app relies
// on (profile / subscription / audits), reporting pending/success/error for each.
// It cannot itself go blank, so it will reveal what the app shell is choking on.

const ROW = { display: "flex", gap: 10, padding: "4px 0", fontSize: 13, lineHeight: 1.5 };
const KEY = { color: "#9a9ab0", minWidth: 170, flexShrink: 0 };
const val = (s) =>
  /^error/i.test(s) ? "#ff6b7a" : /success|yes/i.test(s) ? "#00d68f" : /pending/i.test(s) ? "#f5a623" : "#e8e8ef";

export default function AuthDiagnostic() {
  const location = useLocation();
  const [d, setD] = useState({
    session: "pending", userId: "—", email: "—",
    profile: "pending", subscription: "pending", audits: "pending",
    error: "",
  });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: sess, error: sErr } = await supabase.auth.getSession();
        if (sErr) throw sErr;
        const user = sess?.session?.user;
        if (!active) return;
        setD((p) => ({
          ...p,
          session: sess?.session ? "yes" : "no",
          userId: user?.id || "—",
          email: user?.email || "—",
        }));
        if (!user) {
          setD((p) => ({ ...p, profile: "n/a (no user)", subscription: "n/a (no user)", audits: "n/a (no user)" }));
          return;
        }

        const pr = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
        if (active) setD((p) => ({ ...p, profile: pr.error ? `error: ${pr.error.message}` : "success" }));

        const su = await supabase.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle();
        if (active) setD((p) => ({ ...p, subscription: su.error ? `error: ${su.error.message}` : "success" }));

        const au = await supabase
          .from("audits").select("data, created_at").eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (active) setD((p) => ({ ...p, audits: au.error ? `error: ${au.error.message}` : `success (${au.data?.length ?? 0} rows)` }));
      } catch (e) {
        if (active) setD((p) => ({ ...p, error: String(e?.message || e) }));
      }
    })();
    return () => { active = false; };
  }, []);

  const rows = [
    ["session loaded", d.session],
    ["user id", d.userId],
    ["email", d.email],
    ["profile fetch", d.profile],
    ["subscription fetch", d.subscription],
    ["audits fetch", d.audits],
    ["current route", location.pathname + location.search],
    ["caught error.message", d.error || "(none)"],
  ];

  return (
    <div style={{
      background: "#16161f", color: "#e8e8ef", fontFamily: "monospace",
      border: "1px solid #f5a623", borderRadius: 8, margin: 16, padding: "16px 20px",
      maxWidth: 720,
    }}>
      <div style={{ color: "#f5a623", fontWeight: 700, marginBottom: 10, fontSize: 14 }}>
        🩺 AUTH DIAGNOSTIC (temporary)
      </div>
      {rows.map(([k, v]) => (
        <div key={k} style={ROW}>
          <span style={KEY}>{k}</span>
          <span style={{ color: val(String(v)), wordBreak: "break-all" }}>{String(v)}</span>
        </div>
      ))}
    </div>
  );
}
