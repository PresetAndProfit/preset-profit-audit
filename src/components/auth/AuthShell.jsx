// Shared centered card + branding for the auth screens (login / signup / reset).
import GlobalStyles from "../GlobalStyles.jsx";

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--ink)", padding: 20,
    }}>
      <GlobalStyles />
      <div style={{ width: "100%", maxWidth: 400, animation: "fadeUp .4s ease" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 22, letterSpacing: "-0.02em" }}>
            <span style={{ color: "var(--amber)" }}>PRESET</span>
            <span style={{ color: "var(--text)" }}>&amp;PROFIT</span>
          </div>
          <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2, letterSpacing: "0.08em" }}>
            BUSINESS AUDIT PLATFORM
          </div>
        </div>

        <div style={{
          background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 10,
          padding: 28,
        }}>
          <h1 style={{ fontFamily: "Syne", fontSize: 20, fontWeight: 800, marginBottom: 4 }}>{title}</h1>
          {subtitle && <p style={{ color: "var(--muted)", fontSize: 12, marginBottom: 20 }}>{subtitle}</p>}
          {children}
        </div>

        {footer && (
          <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: "var(--muted)" }}>
            {footer}
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 18, fontSize: 11, color: "var(--muted)" }}>
          <a href="/terms" style={{ color: "var(--muted)", marginRight: 12 }}>Terms</a>
          <a href="/privacy" style={{ color: "var(--muted)", marginRight: 12 }}>Privacy</a>
          <a href="/refund" style={{ color: "var(--muted)" }}>Refunds</a>
        </div>
      </div>
    </div>
  );
}

export function AuthError({ children }) {
  if (!children) return null;
  return (
    <div style={{
      background: "rgba(255,71,87,0.1)", border: "1px solid rgba(255,71,87,0.3)",
      borderRadius: 6, padding: "10px 12px", marginBottom: 14,
      fontSize: 12, color: "#ff4757",
    }}>{children}</div>
  );
}

export function AuthNotice({ children }) {
  if (!children) return null;
  return (
    <div style={{
      background: "rgba(0,214,143,0.1)", border: "1px solid rgba(0,214,143,0.3)",
      borderRadius: 6, padding: "10px 12px", marginBottom: 14,
      fontSize: 12, color: "var(--green)",
    }}>{children}</div>
  );
}
