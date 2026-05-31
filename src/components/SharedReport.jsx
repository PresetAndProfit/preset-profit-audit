import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import GlobalStyles from "./GlobalStyles.jsx";
import ReportView from "./ReportView.jsx";

// Public, read-only report page at /r/:token. No auth — the token is the
// capability. Renders the audit with the owner's white-label branding and the
// agency-inappropriate Preset & Profit CTAs stripped (shared mode).
export default function SharedReport() {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true, error: "", report: null, branding: null });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/share/get", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const json = await res.json().catch(() => null);
        if (!active) return;
        if (!res.ok) {
          const map = { 404: "This report link is invalid or was removed.", 410: "This report link has expired." };
          setState({ loading: false, error: map[res.status] || "Could not load this report.", report: null, branding: null });
        } else {
          setState({ loading: false, error: "", report: json.audit, branding: json.branding });
        }
      } catch {
        if (active) setState({ loading: false, error: "Could not load this report.", report: null, branding: null });
      }
    })();
    return () => { active = false; };
  }, [token]);

  const { loading, error, report, branding } = state;

  if (loading || error) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--ink)", color: "var(--muted)", fontFamily: "IBM Plex Mono", fontSize: 13, padding: 20, textAlign: "center" }}>
        <GlobalStyles />
        {loading ? "Loading report…" : error}
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--ink)", color: "var(--text)" }}>
      <GlobalStyles />
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <ReportView report={report} branding={branding} shared />
      </div>
    </div>
  );
}
