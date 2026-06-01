import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { Field, Btn } from "../ui/index.jsx";
import AuthShell, { AuthError, AuthNotice } from "./AuthShell.jsx";

export default function Signup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ fullName: "", companyName: "", email: "", password: "" });
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [signupsOff, setSignupsOff] = useState(false);

  // Admin kill-switch: hide/disable the form when signups are paused.
  useEffect(() => {
    let active = true;
    fetch("/api/system/status").then((r) => r.json()).then((d) => { if (active && d?.signupsDisabled) setSignupsOff(true); }).catch(() => {});
    return () => { active = false; };
  }, []);

  const submit = async (e) => {
    e?.preventDefault();
    setError("");
    if (signupsOff) { setError("New signups are temporarily paused. Please check back soon."); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setBusy(true);
    const { data, error } = await signUp({
      email: form.email.trim(),
      password: form.password,
      fullName: form.fullName.trim(),
      companyName: form.companyName.trim(),
    });
    setBusy(false);
    if (error) { setError(error.message); return; }
    // If email confirmation is required, Supabase returns a user with no session.
    if (data?.session) {
      navigate("/", { replace: true });
    } else {
      setNotice("Check your inbox to confirm your email, then sign in.");
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start with 1 free audit — no card required."
      footer={<>Already have an account? <Link to="/login" style={{ color: "var(--amber)" }}>Sign in</Link></>}
    >
      <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
        <AuthError>{error}</AuthError>
        <AuthNotice>{notice}</AuthNotice>
        {signupsOff && <AuthNotice>New signups are temporarily paused. Existing users can still sign in.</AuthNotice>}
        <Field label="Full name" value={form.fullName} onChange={set("fullName")} placeholder="Jane Smith" disabled={busy || signupsOff} />
        <Field label="Business name (optional)" value={form.companyName} onChange={set("companyName")} placeholder="Riverside Dental" disabled={busy || signupsOff} />
        <Field label="Email" type="email" value={form.email} onChange={set("email")} placeholder="you@business.com" disabled={busy || signupsOff} />
        <Field label="Password" type="password" value={form.password} onChange={set("password")} placeholder="At least 8 characters" disabled={busy || signupsOff} />
        <Btn full disabled={busy || signupsOff || !form.email || !form.password}>{busy ? "Creating account…" : "Create account →"}</Btn>
      </form>
    </AuthShell>
  );
}
