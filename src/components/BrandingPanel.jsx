import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { supabase } from "../lib/supabaseClient.js";
import { Field, Btn } from "./ui/index.jsx";

// Agency-only white-label settings. Profiles RLS lets a user update their OWN
// row, so this saves directly via the client (no endpoint needed). The values
// flow into branded reports and public share links.
export default function BrandingPanel() {
  const { user, profile, refreshAccount } = useAuth();
  const [form, setForm] = useState({
    company_name: profile?.company_name || "",
    brand_logo_url: profile?.brand_logo_url || "",
    brand_color: profile?.brand_color || "#f5a623",
  });
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setError(""); setBusy(true); setSaved(false);
    const { error } = await supabase
      .from("profiles")
      .update({
        company_name: form.company_name.trim() || null,
        brand_logo_url: form.brand_logo_url.trim() || null,
        brand_color: form.brand_color || null,
      })
      .eq("id", user.id);
    setBusy(false);
    if (error) { setError(error.message); return; }
    await refreshAccount();
    setSaved(true);
  };

  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 10, padding: 24, marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <h2 style={{ fontFamily: "Syne", fontSize: 16, fontWeight: 800 }}>White-label branding</h2>
        <span style={{ fontSize: 10, color: "var(--green)", letterSpacing: "0.08em" }}>AGENCY</span>
      </div>
      <p style={{ color: "var(--muted)", fontSize: 12, marginBottom: 18 }}>
        Your logo, name, and color appear on reports and on public share links you send to clients.
      </p>

      {error && (
        <div style={{ background: "rgba(255,71,87,0.1)", border: "1px solid rgba(255,71,87,0.3)", borderRadius: 6, padding: "8px 12px", marginBottom: 14, fontSize: 12, color: "#ff4757" }}>{error}</div>
      )}

      <div style={{ display: "grid", gap: 14 }}>
        <Field label="Company name" value={form.company_name} onChange={set("company_name")} placeholder="Acme Marketing Co." disabled={busy} />
        <Field label="Logo URL (https://…)" value={form.brand_logo_url} onChange={set("brand_logo_url")} placeholder="https://yourcdn.com/logo.png" disabled={busy} />
        <div>
          <label style={{ fontSize: 11, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Brand color</label>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input type="color" value={form.brand_color} onChange={(e) => set("brand_color")(e.target.value)} disabled={busy}
              style={{ width: 44, height: 36, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, cursor: "pointer" }} />
            <span style={{ fontFamily: "IBM Plex Mono", fontSize: 12, color: "var(--muted)" }}>{form.brand_color}</span>
          </div>
        </div>
      </div>

      {/* Live preview */}
      <div style={{ marginTop: 18, padding: "14px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderLeft: `3px solid ${form.brand_color}`, borderRadius: 8, display: "flex", alignItems: "center", gap: 12 }}>
        {form.brand_logo_url
          ? <img src={form.brand_logo_url} alt="logo" style={{ height: 28, maxWidth: 120, objectFit: "contain" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
          : <div style={{ width: 28, height: 28, borderRadius: 6, background: form.brand_color }} />}
        <div>
          <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 14, color: "var(--text)" }}>{form.company_name || "Your Company"}</div>
          <div style={{ fontSize: 10, color: "var(--muted)" }}>Report header preview</div>
        </div>
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 10, alignItems: "center" }}>
        <Btn onClick={save} disabled={busy} variant={saved ? "success" : "primary"}>
          {busy ? "Saving…" : saved ? "✓ Saved" : "Save branding"}
        </Btn>
      </div>
    </div>
  );
}
