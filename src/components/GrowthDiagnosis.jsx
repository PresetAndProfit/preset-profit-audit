// src/components/GrowthDiagnosis.jsx — renders the 8-section GROWTH DIAGNOSIS
// produced by the Synthesis Agent (api/_lib/agents/synthesis.js). Read-only
// presentation; all ranking/weighting is computed server-side.
import { Tag } from "./ui/index.jsx";

const Section = ({ n, title, children }) => (
  <div style={{ marginBottom: 22 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
      <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 6, background: "var(--amber)", color: "#1a1205", fontSize: 12, fontWeight: 800, display: "grid", placeItems: "center" }}>{n}</span>
      <h3 style={{ margin: 0, fontSize: 13, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text)", fontWeight: 800 }}>{title}</h3>
    </div>
    <div style={{ paddingLeft: 32 }}>{children}</div>
  </div>
);

const Para = ({ children }) => <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.65, color: "var(--text)" }}>{children}</p>;

// Small impact bar (0..~100) so the ranking is visible at a glance.
const Impact = ({ score }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
    <span style={{ width: 54, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.08)", overflow: "hidden", display: "inline-block" }}>
      <span style={{ display: "block", height: "100%", width: `${Math.min(100, score)}%`, background: score >= 70 ? "var(--red)" : score >= 45 ? "var(--warn)" : "var(--amber)" }} />
    </span>
    <span style={{ fontSize: 10, color: "var(--muted)", fontFamily: "IBM Plex Mono" }}>{score}</span>
  </span>
);

const Item = ({ children, sub }) => (
  <div style={{ padding: "9px 12px", border: "1px solid var(--border)", borderRadius: 8, marginBottom: 7, background: "var(--panel)" }}>
    <div style={{ fontSize: 13, lineHeight: 1.5, color: "var(--text)" }}>{children}</div>
    {sub && <div style={{ marginTop: 4, fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>{sub}</div>}
  </div>
);

// V5 Layer 5 — outcome forecast panel (30 / 90 / 365-day trajectory).
const fmtRange = (o) => o ? `$${(o.low || 0).toLocaleString()}–$${(o.high || 0).toLocaleString()}` : "—";
function OutcomeForecast({ f }) {
  const p = f.portfolio;
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 6, background: "var(--green)", color: "#04140c", fontSize: 11, fontWeight: 800, display: "grid", placeItems: "center" }}>↗</span>
        <h3 style={{ margin: 0, fontSize: 13, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text)", fontWeight: 800 }}>Expected Outcomes · Forecast</h3>
      </div>
      <div style={{ paddingLeft: 32 }}>
        {p && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 12 }}>
            {[["30 days", p.d30], ["90 days", p.d90], ["12 months", p.m12]].map(([label, o]) => (
              <div key={label} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "11px 13px", background: "var(--panel)" }}>
                <div style={{ fontSize: 10, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--green)", fontWeight: 700, marginBottom: 5 }}>{label}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text)", fontVariantNumeric: "tabular-nums" }}>{fmtRange(o)}</div>
                <div style={{ fontSize: 9.5, color: "var(--muted)", marginTop: 3 }}>{o.note}</div>
              </div>
            ))}
          </div>
        )}
        {(f.recommendations || []).filter((r) => r.canonical).map((r, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "7px 12px", border: "1px solid var(--border)", borderRadius: 8, marginBottom: 6, background: "var(--panel)" }}>
            <div style={{ fontSize: 12, color: "var(--text)" }}>
              <b>{r.canonical}</b> · <span style={{ color: "var(--green)" }}>{r.metric.low}–{r.metric.high}{r.metric.unit} {r.metric.label}</span>
              {r.ranking ? <span style={{ color: "var(--muted)" }}> · {r.ranking}</span> : null}
            </div>
            <div style={{ fontSize: 9.5, color: "var(--muted)", whiteSpace: "nowrap", fontFamily: "IBM Plex Mono" }}>{r.trajectory.d30}% → {r.trajectory.d90}% → 100%</div>
          </div>
        ))}
        <div style={{ fontSize: 9.5, color: "var(--muted)", marginTop: 6, lineHeight: 1.5 }}>{f.method}</div>
      </div>
    </div>
  );
}

export default function GrowthDiagnosis({ diagnosis: d }) {
  if (!d || !d.available) return null;
  const plan = d.ninetyDayPlan || { now: [], next: [], later: [] };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 22, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--amber)", fontWeight: 700, marginBottom: 6 }}>Strategic Growth Diagnosis</div>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>
          {d.businessType} · ranked by industry growth-driver weighting
        </div>
        {Array.isArray(d.weightingUsed) && d.weightingUsed.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {d.weightingUsed.map((w) => (
              <span key={w.driver} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, border: "1px solid var(--border)", color: "var(--muted)" }}>
                {w.driver} <b style={{ color: "var(--text)" }}>{w.weight}%</b>
              </span>
            ))}
          </div>
        )}
      </div>

      <Section n={1} title="Executive Summary"><Para>{d.executiveSummary}</Para></Section>

      <Section n={2} title="What Is Limiting Growth">
        {(d.whatIsLimitingGrowth || []).map((x, i) => (
          <Item key={i} sub={x.growthDriver ? `Growth driver: ${x.growthDriver}` : null}>
            <b>{x.constraint}</b> — {x.why}
          </Item>
        ))}
      </Section>

      <Section n={3} title="Top Revenue Leaks">
        {(d.topRevenueLeaks || []).map((x, i) => (
          <Item key={i} sub={x.consequence}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <span><b>{x.title}</b>{x.dollars ? <span style={{ color: "var(--green)" }}> · modeled ${x.dollars.low?.toLocaleString()}–${x.dollars.high?.toLocaleString()}/mo</span> : null}</span>
              <Impact score={x.impact} />
            </div>
          </Item>
        ))}
      </Section>

      <Section n={4} title="Top Competitive Disadvantages">
        {(d.topCompetitiveDisadvantages || []).map((x, i) => (
          <Item key={i}>{x.summary || x.note}{x.source ? <span style={{ color: "var(--muted)", fontSize: 10 }}> · {x.source}</span> : null}</Item>
        ))}
      </Section>

      <Section n={5} title="Highest-ROI Improvements">
        {(d.highestRoiImprovements || []).map((x) => (
          <Item key={x.rank} sub={x.rationale}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <span><b>#{x.rank} {x.action}</b> <span style={{ color: "var(--muted)" }}>· {x.growthDriver}</span> <Tag color={x.effort === "low" ? "var(--green)" : x.effort === "high" ? "var(--red)" : "var(--warn)"}>{x.effort} effort</Tag></span>
              <Impact score={x.impactScore} />
            </div>
          </Item>
        ))}
      </Section>

      {d.forecast?.available && <OutcomeForecast f={d.forecast} />}

      <Section n={6} title="Recommended Automation Opportunities">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {(d.automationOpportunities || []).map((a, i) => (
            <span key={i} title={a.solves || ""} style={{ fontSize: 12, padding: "5px 11px", borderRadius: 8, border: "1px solid var(--amber)", color: "var(--text)", background: "rgba(245,166,35,0.06)" }}>{a.name}</span>
          ))}
        </div>
      </Section>

      <Section n={7} title="90-Day Growth Plan">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {[["Now · Days 1–30", plan.now], ["Next · Days 31–60", plan.next], ["Later · Days 61–90", plan.later]].map(([label, items]) => (
            <div key={label} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 11, background: "var(--panel)" }}>
              <div style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--amber)", fontWeight: 700, marginBottom: 8 }}>{label}</div>
              {(items && items.length ? items : ["—"]).map((it, i) => (
                <div key={i} style={{ fontSize: 12, lineHeight: 1.45, color: "var(--text)", marginBottom: 6 }}>{it}</div>
              ))}
            </div>
          ))}
        </div>
      </Section>

      <Section n={8} title="Consultant Verdict">
        <div style={{ padding: "14px 16px", borderRadius: 10, border: "1px solid var(--amber)", background: "rgba(245,166,35,0.07)" }}>
          <Para>{d.consultantVerdict}</Para>
        </div>
      </Section>
    </div>
  );
}
