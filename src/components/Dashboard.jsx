import { ScoreRing, Tag, StatCard, Btn } from "./ui/index.jsx";
import { STATUS_COLORS } from "../lib/constants.js";
import { timeAgo } from "../lib/helpers.js";

export default function Dashboard({ audits, onScan, onViewReport, onDeleteAudit }) {
  const hot    = audits.filter(a => a.status === "hot").length;
  const avgRev = audits.length
    ? Math.round(audits.reduce((s, a) => s + (a.revenueAmount || 0), 0) / audits.length)
    : 0;

  const stats = [
    { label: "Reports Run",       value: audits.length, delta: audits.length ? `${audits.length} business${audits.length !== 1 ? "es" : ""} analysed` : null, accent: "#f5a623" },
    { label: "Priority Follow-ups", value: hot, delta: hot ? `${hot} high-opportunity business${hot !== 1 ? "es" : ""}` : null, accent: "#ff4757" },
    { label: "Avg Extra Rev/Mo",  value: avgRev ? `$${avgRev.toLocaleString()}` : "—", delta: avgRev ? "average across all reports" : null, accent: "#00d68f" },
    { label: "Reports Saved",     value: audits.length, delta: null, accent: "#4a9eff" },
  ];

  // ── First-time landing page ─────────────────────────────────────────────────
  if (audits.length === 0) {
    return (
      <div className="page-pad" style={{ animation: "fadeUp .4s ease", maxWidth: 680, margin: "0 auto" }}>

        {/* Hero */}
        <div style={{ textAlign: "center", padding: "48px 0 40px" }}>
          <div style={{ fontSize: 11, color: "var(--amber)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 16, fontWeight: 600 }}>
            Preset &amp; Profit · Free Business Report
          </div>
          <h1 style={{ fontFamily: "Syne", fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 16 }}>
            See exactly where your business<br />is losing customers right now
          </h1>
          <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.75, maxWidth: 480, margin: "0 auto 32px" }}>
            Answer 5 quick questions. We'll show you what's costing you customers each month and the fastest ways to fix it — completely free.
          </p>
          <button
            onClick={onScan}
            style={{
              background: "var(--amber)", color: "var(--ink)",
              border: "none", borderRadius: 8, cursor: "pointer",
              fontFamily: "IBM Plex Mono", fontSize: 15, fontWeight: 700,
              letterSpacing: "0.04em", padding: "16px 36px",
              boxShadow: "0 0 32px rgba(245,166,35,0.3)",
              transition: "all .2s",
            }}
          >
            Get My Free Report →
          </button>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 12 }}>
            Takes 30 seconds · No signup required · 100% free
          </div>
        </div>

        {/* What you'll find out */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 40 }}>
          {[
            { icon: "💸", heading: "Where money is leaking out", body: "We identify the specific gaps causing you to lose customers before they ever contact you." },
            { icon: "📞", heading: "How many calls you're missing", body: "Most businesses miss 30–40% of calls. We show you what that's costing you every month." },
            { icon: "⭐", heading: "How you compare to local competitors", body: "See exactly what nearby businesses are doing that you're not — and what it's worth." },
            { icon: "✅", heading: "The 4 fastest things to fix", body: "Ranked by impact. The first one alone typically recovers several hundred dollars a month." },
          ].map(item => (
            <div key={item.heading} style={{
              background: "var(--panel)", border: "1px solid var(--border)",
              borderRadius: 10, padding: "18px 20px",
              display: "flex", gap: 14, alignItems: "flex-start",
            }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{item.icon}</span>
              <div>
                <div style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 13, marginBottom: 5 }}>{item.heading}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>{item.body}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Reassurance strip */}
        <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 10, padding: "20px 24px", display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap" }}>
          {[
            "No credit card needed",
            "Your info stays private",
            "Results in under 30 seconds",
            "No obligation to buy anything",
          ].map(t => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--muted)" }}>
              <span style={{ color: "var(--green)", fontSize: 14 }}>✓</span> {t}
            </div>
          ))}
        </div>

      </div>
    );
  }

  // ── Returning user — report list ────────────────────────────────────────────
  return (
    <div className="page-pad" style={{ animation: "fadeUp .4s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "Syne", fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em" }}>Your Reports</h1>
          <p style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
            Preset &amp; Profit · {audits.length} business{audits.length !== 1 ? "es" : ""} analysed
          </p>
        </div>
        <Btn onClick={onScan}>+ New Report</Btn>
      </div>

      <div className="stats-grid">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
        <div style={{ padding: "14px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 14 }}>Recent Reports</span>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>{audits.length} saved</span>
        </div>

        <div className="table-wrap">
          <table className="lead-table">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Business", "Industry / City", "Overall", "Lead", "Website", "Extra Rev/Mo", "Status", "Date", ""].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, color: "var(--muted)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {audits.map(a => (
                <tr key={a.id}
                  style={{ borderBottom: "1px solid var(--border)", transition: "background .15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--surface)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{a.businessName}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{a.website}</div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontSize: 12 }}>{a.industry}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{a.city || "—"}</div>
                  </td>
                  <td style={{ padding: "12px 16px" }}><ScoreRing score={a.overallScore} size={38} stroke={3.5} /></td>
                  <td style={{ padding: "12px 16px" }}><ScoreRing score={a.leadScore} size={38} stroke={3.5} /></td>
                  <td style={{ padding: "12px 16px" }}><ScoreRing score={a.websiteScore} size={38} stroke={3.5} /></td>
                  <td style={{ padding: "12px 16px", fontFamily: "IBM Plex Mono", fontSize: 12, color: "var(--green)", fontWeight: 600, whiteSpace: "nowrap" }}>{a.revenueOpportunity}</td>
                  <td style={{ padding: "12px 16px" }}><Tag color={STATUS_COLORS[a.status] || "#6b6b85"}>{a.status}</Tag></td>
                  <td style={{ padding: "12px 16px", fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap" }}>{timeAgo(a.createdAt)}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Btn onClick={() => onViewReport(a)} variant="ghost" small>View →</Btn>
                      <button
                        onClick={() => { if (window.confirm(`Delete the report for "${a.businessName}"? This cannot be undone.`)) onDeleteAudit(a.id); }}
                        style={{ background: "none", border: "none", color: "var(--dim)", cursor: "pointer", fontSize: 14, padding: "4px 6px", borderRadius: 4, transition: "color .15s" }}
                        onMouseEnter={e => e.currentTarget.style.color = "var(--red)"}
                        onMouseLeave={e => e.currentTarget.style.color = "var(--dim)"}
                        title="Delete report"
                      >✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
