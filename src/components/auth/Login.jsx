import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { Field, Btn } from "../ui/index.jsx";
import AuthShell, { AuthError } from "./AuthShell.jsx";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e?.preventDefault();
    setError("");
    setBusy(true);
    const { error } = await signIn({ email: email.trim(), password });
    setBusy(false);
    if (error) { setError(error.message); return; }
    navigate(from, { replace: true });
  };

  return (
    <AuthShell
      title="Sign in"
      subtitle="Welcome back. Pick up where you left off."
      footer={<>No account? <Link to="/signup" style={{ color: "var(--amber)" }}>Create one</Link></>}
    >
      <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
        <AuthError>{error}</AuthError>
        <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@business.com" disabled={busy} />
        <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" disabled={busy} />
        <div style={{ textAlign: "right", marginTop: -6 }}>
          <Link to="/reset-password" style={{ fontSize: 11, color: "var(--muted)" }}>Forgot password?</Link>
        </div>
        <Btn full disabled={busy || !email || !password}>{busy ? "Signing in…" : "Sign in →"}</Btn>
      </form>
    </AuthShell>
  );
}
