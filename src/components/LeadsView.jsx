import { Tag, Btn } from "./ui/index.jsx";
import { STATUS_COLORS } from "../lib/constants.js";
import { timeAgo } from "../lib/helpers.js";

export default function LeadsView({ audits, onViewReport, onDeleteAudit }) {
  const hot  = audits.filter(a => a.status === "hot");
  const warm = audits.filter(a => a.status === "warm");
  const cold = audits.filter(a => a.status === "cold");

  const sections = [
    { label: "Hot Leads",  color: "#ff4757", items: hot  },
    { label: "Warm Leads", color: "#f5a623", items: warm },
    { label: "Cold Leads", color: "#4a9eff", items: cold },
  ];

  return (
    <div className="page-pad" style={{ animation: "fadeUp .4s ease" }}>
      <h1 style={{ fontFamily: "Syne", fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 6 }}>Lead Pipeline</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 28 }}>All audited businesses sorted by conversion priority</p>

      {audits.length === 0 && (
        <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: "60px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>◈</div>
          <div style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>No leads yet</div>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>Run your first audit to populate the pipeline.</div>
        </div>
      )}

      <div style={{ display: "grid", gap: 24 }}>
        {sections.map(({ label, color, items }) => items.length > 0 && (
          <div key={label}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
              <span style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 14 }}>{label}</span>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>({items.length})</span>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {items.map(a => (
                <div key={a.id} style={{ background: "var(--panel)", border: `1px solid ${color}30`, borderLeft: `3px solid ${color}`, borderRadius: 8, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{a.businessName}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Tag color="#6b6b85">{a.industry}</Tag>
                      {a.city && <Tag color="#3a3a50">{a.city}</Tag>}
                      <Tag color="var(--amber)">{a.goal}</Tag>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 18, color: "var(--green)", marginBottom: 4 }}>{a.revenueOpportunity}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 8 }}>{timeAgo(a.createdAt)}</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Btn onClick={() => onViewReport(a)} small>View Report</Btn>
                      <button
                        onClick={() => { if (window.confirm(`Delete the audit for "${a.businessName}"? This cannot be undone.`)) onDeleteAudit(a.id); }}
                        style={{ background: "none", border: "none", color: "var(--dim)", cursor: "pointer", fontSize: 14, padding: "4px 6px", borderRadius: 4, transition: "color .15s" }}
                        onMouseEnter={e => e.currentTarget.style.color = "var(--red)"}
                        onMouseLeave={e => e.currentTarget.style.color = "var(--dim)"}
                        title="Delete audit"
                      >✕</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
