import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { supabase } from "../../lib/supabaseClient.js";
import { Field, Btn } from "../ui/index.jsx";
import AuthShell, { AuthError, AuthNotice } from "./AuthShell.jsx";

// Two modes:
//  1) Request — enter email, receive a reset link.
//  2) Recovery — arriving from that link, Supabase establishes a temporary
//     recovery session (PASSWORD_RECOVERY); show a "set new password" form.
export default function ResetPassword() {
  const { sendPasswordReset, updatePassword } = useAuth();
  const navigate = useNavigate();

  const [recovery, setRecovery] = useState(
    () => typeof window !== "undefined" && window.location.hash.includes("type=recovery")
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const requestReset = async (e) => {
    e?.preventDefault();
    setError(""); setNotice(""); setBusy(true);
    const { error } = await sendPasswordReset(email.trim());
    setBusy(false);
    if (error) { setError(error.message); return; }
    setNotice("If that email exists, a reset link is on its way.");
  };

  const setNewPassword = async (e) => {
    e?.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setBusy(true);
    const { error } = await updatePassword(password);
    setBusy(false);
    if (error) { setError(error.message); return; }
    setNotice("Password updated. Redirecting…");
    setTimeout(() => navigate("/", { replace: true }), 1200);
  };

  if (recovery) {
    return (
      <AuthShell title="Set a new password" subtitle="Choose a strong password you'll remember.">
        <form onSubmit={setNewPassword} style={{ display: "grid", gap: 14 }}>
          <AuthError>{error}</AuthError>
          <AuthNotice>{notice}</AuthNotice>
          <Field label="New password" type="password" value={password} onChange={setPassword} placeholder="At least 8 characters" disabled={busy} />
          <Btn full disabled={busy || !password}>{busy ? "Saving…" : "Update password"}</Btn>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Reset password"
      subtitle="We'll email you a link to set a new one."
      footer={<Link to="/login" style={{ color: "var(--amber)" }}>← Back to sign in</Link>}
    >
      <form onSubmit={requestReset} style={{ display: "grid", gap: 14 }}>
        <AuthError>{error}</AuthError>
        <AuthNotice>{notice}</AuthNotice>
        <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@business.com" disabled={busy} />
        <Btn full disabled={busy || !email}>{busy ? "Sending…" : "Send reset link"}</Btn>
      </form>
    </AuthShell>
  );
}
