import { useState, useEffect } from "react";
import { authedJson } from "../lib/api.js";
import { StatCard, Tag } from "./ui/index.jsx";

// Admin-only usage dashboard. Data comes from /api/admin/usage, which verifies
// is_admin server-side — this component is just the view.
export default function AdminView() {
  const [state, setState] = useState({ loading: true, error: "", totals: null, rows: [] });

  useEffect(() => {
    let active = true;
    (async () => {
      const { ok, status, json } = await authedJson("/api/admin/usage", { method: "POST" });
      if (!active) return;
      if (!ok) {
        setState({ loading: false, error: json?.error || `error-${status}`, totals: null, rows: [] });
      } else {
        setState({ loading: false, error: "", totals: json.totals, rows: json.rows || [] });
      }
    })();
    return () => { active = false; };
  }, []);

  const { loading, error, totals, rows } = state;

  return (
    <div className="page-pad" style={{ maxWidth: 1000, margin: "0 auto", animation: "fadeUp .4s ease" }}>
      <h1 style={{ fontFamily: "Syne", fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Admin · Usage</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 24 }}>
        Per-account usage and plan overview across all users.
      </p>

      {loading && <div style={{ color: "var(--muted)", fontSize: 12 }}>Loading…</div>}
      {error && (
        <div style={{ background: "rgba(255,71,87,0.1)", border: "1px solid rgba(255,71,87,0.3)", borderRadius: 6, padding: "10px 12px", fontSize: 12, color: "#ff4757" }}>
          {error === "forbidden" ? "You don't have admin access." : `Could not load admin data (${error}).`}
        </div>
      )}

      {!loading && !error && totals && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
            <StatCard label="Users" value={totals.users} accent="var(--amber)" />
            <StatCard label="Paid users" value={totals.paid} accent="var(--green)" />
            <StatCard label="Total audits" value={totals.audits} accent="var(--blue)" />
            <StatCard label="Scans (30d)" value={totals.scans30d} accent="var(--amber)" />
          </div>

          <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "var(--muted)", fontSize: 10, letterSpacing: "0.08em" }}>
                    {["EMAIL", "PLAN", "STATUS", "AUDITS", "30D", "SCANS 30D", "LAST AUDIT", "JOINED"].map((h) => (
                      <th key={h} style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.user_id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 14px" }}>
                        {r.email}{r.is_admin ? " ★" : ""}
                        <div style={{ color: "var(--muted)", fontSize: 10 }}>{r.company_name || r.full_name || ""}</div>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <Tag color={r.plan === "free" ? "var(--muted)" : "var(--amber)"}>{r.plan}</Tag>
                      </td>
                      <td style={{ padding: "10px 14px", color: "var(--muted)" }}>{r.status || "—"}</td>
                      <td style={{ padding: "10px 14px", fontFamily: "IBM Plex Mono" }}>{r.total_audits}</td>
                      <td style={{ padding: "10px 14px", fontFamily: "IBM Plex Mono" }}>{r.audits_30d}</td>
                      <td style={{ padding: "10px 14px", fontFamily: "IBM Plex Mono" }}>{r.scans_30d}</td>
                      <td style={{ padding: "10px 14px", color: "var(--muted)" }}>{r.last_audit_at ? new Date(r.last_audit_at).toLocaleDateString() : "—"}</td>
                      <td style={{ padding: "10px 14px", color: "var(--muted)" }}>{r.joined_at ? new Date(r.joined_at).toLocaleDateString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
