import { useState, useMemo } from "react";
import { Tag } from "./ui/index.jsx";
import { STAGES, deriveStage, pipelineAggregates, isFollowupDue, isClosed, activationMetrics } from "../lib/dealEngine.js";
import { setStage } from "../lib/pipeline.js";
import { timeAgo } from "../lib/helpers.js";
import DealDrawer from "./DealDrawer.jsx";

const fmtMoney = cents => `$${Math.round((cents || 0) / 100).toLocaleString()}`;

// The unified pipeline. Every audit is a Deal card living in a stage column;
// the operator works them left→right to Closed Won → Automation Sold. Replaces
// the read-only hot/warm/cold LeadsView with a worked sales board.
export default function PipelineBoard({ audits, updateDeal, onViewReport, onViewRoadmap, onViewOutreach, onDeleteAudit, onStartActivation }) {
  const [selected, setSelected] = useState(null);

  const agg = useMemo(() => pipelineAggregates(audits), [audits]);
  const actm = useMemo(() => activationMetrics(audits), [audits]);
  const grouped = useMemo(() => {
    const g = Object.fromEntries(STAGES.map(s => [s.key, []]));
    for (const a of audits) (g[deriveStage(a)] ||= []).push(a);
    return g;
  }, [audits]);

  // Keep the drawer in sync with the latest audit object after a mutation.
  const liveSelected = selected ? audits.find(a => a.id === selected.id) || selected : null;

  const stat = (label, value, color) => (
    <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 16px", minWidth: 130 }}>
      <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 20, color: color || "var(--text)" }}>{value}</div>
    </div>
  );

  return (
    <div className="page-pad" style={{ animation: "fadeUp .4s ease" }}>
      <h1 style={{ fontFamily: "Syne", fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 6 }}>Sales Pipeline</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 18 }}>Every audit is a deal. Work it from lead to closed-won to automation sold.</p>

      {/* Aggregate header */}
      <div style={{ display: "flex", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
        {stat("Open pipeline", fmtMoney(agg.openValueCents), "var(--amber)")}
        {stat("Won (first-yr)", fmtMoney(agg.wonValueCents), "var(--green)")}
        {stat("Active deals", agg.total - agg.byStage.closed_won - agg.byStage.closed_lost)}
        {stat("Win rate", `${agg.winRate}%`)}
        {agg.dueFollowups > 0 && stat("⏰ Due now", agg.dueFollowups, "var(--red)")}
      </div>

      {/* Activation funnel — Audit → Booked Call at a glance */}
      {actm.active > 0 && (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 16px", marginBottom: 12, fontSize: 12, color: "var(--muted)" }}>
          <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--amber)" }}>Activation funnel</span>
          <span>🎯 Active <strong style={{ color: "var(--text)" }}>{actm.active}</strong></span>
          <span>📤 Sent <strong style={{ color: "var(--text)" }}>{actm.sent}</strong></span>
          <span>👁 Opened <strong style={{ color: "var(--text)" }}>{actm.opened}</strong></span>
          <span>🔗 Clicked <strong style={{ color: "var(--text)" }}>{actm.clicked}</strong></span>
          <span>📞 Booked <strong style={{ color: "var(--green)" }}>{actm.booked}</strong></span>
          {actm.sent > 0 && <span style={{ marginLeft: "auto" }}>Book rate <strong style={{ color: "var(--green)" }}>{Math.round((actm.booked / actm.active) * 100)}%</strong></span>}
        </div>
      )}

      {audits.length === 0 && (
        <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: "60px 24px", textAlign: "center", marginTop: 16 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>◎</div>
          <div style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>No deals yet</div>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>Run an audit to drop your first prospect into the pipeline.</div>
        </div>
      )}

      {/* Kanban columns (horizontal scroll) */}
      {audits.length > 0 && (
        <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 16, marginTop: 12 }}>
          {STAGES.map(s => {
            const deals = grouped[s.key] || [];
            const colValue = deals.reduce((sum, d) => sum + (d.deal_value_cents || 0), 0);
            return (
              <div key={s.key} style={{ flex: "0 0 250px", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderBottom: `2px solid ${s.color}`, marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color }} />
                    <span style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 12 }}>{s.label}</span>
                    <span style={{ fontSize: 10, color: "var(--muted)" }}>{deals.length}</span>
                  </div>
                  {colValue > 0 && <span style={{ fontSize: 10, color: "var(--muted)" }}>{fmtMoney(colValue)}</span>}
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {deals.map(d => {
                    const due = isFollowupDue(d);
                    return (
                      <div key={d.id} onClick={() => setSelected(d)} style={{ cursor: "pointer", background: "var(--panel)", border: `1px solid ${due ? "var(--red)" : "var(--border)"}`, borderLeft: `3px solid ${s.color}`, borderRadius: 8, padding: "12px 14px" }}>
                        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{d.businessName}</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                          <Tag color="#6b6b85">{d.industry}</Tag>
                          {d.goal && <Tag color="var(--amber)">{d.goal}</Tag>}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--green)" }}>{d.deal_value_cents ? fmtMoney(d.deal_value_cents) : d.revenueOpportunity || ""}</span>
                          <span style={{ fontSize: 10, color: due ? "var(--red)" : "var(--dim)" }}>{due ? "⏰ due" : timeAgo(d.createdAt)}</span>
                        </div>
                        {!isClosed(s.key) && (
                          <select
                            value={s.key}
                            onClick={e => e.stopPropagation()}
                            onChange={e => { e.stopPropagation(); setStage(updateDeal, d, e.target.value); }}
                            style={{ marginTop: 10, width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 5, padding: "5px 8px", color: "var(--muted)", fontFamily: "IBM Plex Mono", fontSize: 10, outline: "none", cursor: "pointer" }}
                          >
                            {STAGES.map(opt => <option key={opt.key} value={opt.key}>→ {opt.label}</option>)}
                          </select>
                        )}
                      </div>
                    );
                  })}
                  {!deals.length && <div style={{ fontSize: 11, color: "var(--dim)", padding: "8px 4px" }}>—</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {liveSelected && (
        <DealDrawer
          deal={liveSelected}
          updateDeal={updateDeal}
          onClose={() => setSelected(null)}
          onViewReport={onViewReport}
          onViewRoadmap={onViewRoadmap}
          onViewOutreach={onViewOutreach}
          onDeleteAudit={onDeleteAudit}
          onStartActivation={onStartActivation}
        />
      )}
    </div>
  );
}
