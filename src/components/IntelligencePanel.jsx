import { ScoreRing, Tag } from "./ui/index.jsx";
import { STATUS_COLORS } from "../lib/constants.js";
import { STAGES, pipelineAggregates } from "../lib/dealEngine.js";

const fmtMoney = cents => `$${Math.round((cents || 0) / 100).toLocaleString()}`;

export default function IntelligencePanel({ audits }) {
  if (!audits.length) return (
    <div className="page-pad" style={{ animation: "fadeUp .4s ease" }}>
      <h1 style={{ fontFamily: "Syne", fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 6 }}>Intelligence Panel</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 40 }}>Aggregated insights across all audited businesses</p>
      <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: "60px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>◆</div>
        <div style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>No data yet</div>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>Run at least one audit to unlock intelligence insights.</div>
      </div>
    </div>
  );

  const avgScore = Math.round(audits.reduce((s, a) => s + a.overallScore, 0) / audits.length);
  const avgRevenue = Math.round(audits.reduce((s, a) => s + (a.revenueAmount || 0), 0) / audits.length);
  const topGoals = audits.reduce((acc, a) => { acc[a.goal] = (acc[a.goal] || 0) + 1; return acc; }, {});
  const sortedGoals = Object.entries(topGoals).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const industries = audits.reduce((acc, a) => { acc[a.industry] = (acc[a.industry] || 0) + 1; return acc; }, {});
  const sortedIndustries = Object.entries(industries).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const hotAudits = audits.filter(a => a.status === "hot").slice(0, 3);
  const agg = pipelineAggregates(audits);
  const maxStageCount = Math.max(1, ...STAGES.map(s => agg.byStage[s.key]));

  return (
    <div className="page-pad" style={{ animation: "fadeUp .4s ease" }}>
      <h1 style={{ fontFamily: "Syne", fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 6 }}>Intelligence Panel</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 28 }}>Aggregated insights across {audits.length} audited businesses</p>

      {/* Pipeline funnel + value — the Growth OS at a glance */}
      <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: "20px 24px", marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Pipeline Funnel</div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>Open <strong style={{ color: "var(--amber)" }}>{fmtMoney(agg.openValueCents)}</strong></span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>Won <strong style={{ color: "var(--green)" }}>{fmtMoney(agg.wonValueCents)}</strong></span>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>Win rate <strong style={{ color: "var(--text)" }}>{agg.winRate}%</strong></span>
            {agg.dueFollowups > 0 && <span style={{ fontSize: 12, color: "var(--red)" }}>⏰ {agg.dueFollowups} due</span>}
          </div>
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          {STAGES.map(s => {
            const count = agg.byStage[s.key];
            return (
              <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 90, fontSize: 11, color: "var(--muted)", flexShrink: 0 }}>{s.label}</span>
                <div style={{ flex: 1, height: 18, background: "var(--surface)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.round((count / maxStageCount) * 100)}%`, minWidth: count ? 3 : 0, background: s.color, borderRadius: 4, transition: "width .5s ease" }} />
                </div>
                <span style={{ width: 28, textAlign: "right", fontSize: 12, fontWeight: 600, color: count ? "var(--text)" : "var(--dim)" }}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: "20px 24px", display: "flex", alignItems: "center", gap: 16 }}>
          <ScoreRing score={avgScore} size={64} stroke={5} />
          <div>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Avg Overall Score</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>across all audits</div>
          </div>
        </div>
        <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: "20px 24px" }}>
          <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Avg Monthly Opportunity</div>
          <div style={{ fontFamily: "Syne", fontSize: 28, fontWeight: 800, color: "var(--green)" }}>${avgRevenue.toLocaleString()}/mo</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: "20px 24px" }}>
          <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>Top Goals</div>
          {sortedGoals.map(([goal, count]) => (
            <div key={goal} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 12 }}>{goal}</span>
              <Tag color="var(--amber)">{count}</Tag>
            </div>
          ))}
        </div>
        <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: "20px 24px" }}>
          <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>Top Industries</div>
          {sortedIndustries.map(([industry, count]) => (
            <div key={industry} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
              <span style={{ fontSize: 12 }}>{industry}</span>
              <Tag color="var(--blue)">{count}</Tag>
            </div>
          ))}
        </div>
      </div>

      {hotAudits.length > 0 && (
        <div style={{ background: "var(--panel)", border: "1px solid rgba(255,71,87,0.3)", borderRadius: 8, padding: "20px 24px" }}>
          <div style={{ fontSize: 11, color: "#ff4757", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>🔥 Hot Leads — Act Now</div>
          <div style={{ display: "grid", gap: 12 }}>
            {hotAudits.map(a => (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{a.businessName}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{a.industry} · {a.goal}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 16, color: "var(--green)" }}>{a.revenueOpportunity}</div>
                  <Tag color={STATUS_COLORS[a.status]}>{a.status}</Tag>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
