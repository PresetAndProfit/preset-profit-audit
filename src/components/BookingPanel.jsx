import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { supabase } from "../lib/supabaseClient.js";
import { Field, Btn } from "./ui/index.jsx";

// Booking & outreach identity — available on EVERY plan (this is the funnel, not
// a white-label nicety). The calendar link is embedded into generated outreach
// and the proposal's "Book the call" button so prospects book a real call. Saves
// directly via the client (profiles RLS "own profile update"), like BrandingPanel.
export default function BookingPanel() {
  const { user, profile, refreshAccount } = useAuth();
  const [form, setForm] = useState({
    calendar_url: profile?.calendar_url || "",
    company_name: profile?.company_name || "",
  });
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const save = async () => {
    setError(""); setBusy(true); setSaved(false);
    const url = form.calendar_url.trim();
    // Light validation: a booking link should be a URL. Empty is allowed (falls
    // back to a "reply to book" CTA — never a dead placeholder).
    if (url && !/^https?:\/\//i.test(url)) {
      setBusy(false); setError("Booking link must start with http:// or https://"); return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ calendar_url: url || null, company_name: form.company_name.trim() || null })
      .eq("id", user.id);
    setBusy(false);
    if (error) { setError(error.message); return; }
    await refreshAccount();
    setSaved(true);
  };

  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 10, padding: 24, marginBottom: 24 }}>
      <h2 style={{ fontFamily: "Sora", fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Booking &amp; outreach identity</h2>
      <p style={{ color: "var(--muted)", fontSize: 12, marginBottom: 18, lineHeight: 1.6 }}>
        Your booking link is embedded into generated outreach and your proposal's "Book the call" button — so every prospect can book a real call with you. Set it once.
      </p>

      {error && (
        <div style={{ background: "rgba(255,71,87,0.1)", border: "1px solid rgba(255,71,87,0.3)", borderRadius: 6, padding: "8px 12px", marginBottom: 14, fontSize: 12, color: "#ff4757" }}>{error}</div>
      )}

      <div style={{ display: "grid", gap: 14 }}>
        <Field label="Booking link (Calendly, etc.)" value={form.calendar_url} onChange={set("calendar_url")} placeholder="https://calendly.com/you/15min" disabled={busy} />
        <Field label="Your name / business (shown on outreach & proposals)" value={form.company_name} onChange={set("company_name")} placeholder="Acme Automation Co." disabled={busy} />
        <div style={{ fontSize: 11, color: "var(--muted)" }}>Prospects reply to: <span style={{ color: "var(--text)", fontFamily: "IBM Plex Mono" }}>{user?.email}</span></div>
      </div>

      <div style={{ marginTop: 16 }}>
        <Btn onClick={save} disabled={busy} variant={saved ? "success" : "primary"}>
          {busy ? "Saving…" : saved ? "✓ Saved" : "Save booking details"}
        </Btn>
      </div>
    </div>
  );
}
