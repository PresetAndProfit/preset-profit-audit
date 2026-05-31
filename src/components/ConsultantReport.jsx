// src/components/ConsultantReport.jsx — the premium, top-to-bottom consultant
// document shown ABOVE the detail tabs when the report was AI-generated (V3).
// Reads like a $5k engagement: Executive Summary → Business Intelligence →
// Revenue Leaks → Competitive Benchmark → Priority Matrix → Automations →
// Implementation Roadmap → 30-Day Plan. Every section is defensive — it renders
// only when its data block is present, so the deterministic fallback path (which
// has none of these) simply shows nothing here and relies on the tabs.
import { Tag } from "./ui/index.jsx";

const money = (n) => `$${Math.round(Number(n) || 0).toLocaleString()}`;
const range = (lo, hi) => `${money(lo)}–${money(hi)}/mo`;
const titleCase = (s) => String(s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// ── shared bits ──────────────────────────────────────────────────────────────
const Eyebrow = ({ children }) => (
  <div style={{ fontSize: 10, color: "var(--amber)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6, fontWeight: 700 }}>{children}</div>
);
const SectionHead = ({ children }) => (
  <h2 style={{ fontFamily: "Syne", fontSize: 19, fontWeight: 800, letterSpacing: "-0.01em", margin: "0 0 14px" }}>{children}</h2>
);
const Section = ({ children }) => (
  <section style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, padding: "22px 24px", marginBottom: 16 }}>{children}</section>
);
const Modeled = ({ lo, hi }) => (
  <span style={{ display: "inline-block", fontSize: 11, fontWeight: 700, color: "var(--green)", background: "rgba(0,214,143,0.1)", border: "1px solid rgba(0,214,143,0.3)", borderRadius: 20, padding: "2px 10px" }}>
    modeled opportunity: {range(lo, hi)}
  </span>
);
const GroundBadge = ({ grounded, title }) => (
  <span title={title || ""} style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", padding: "2px 7px", borderRadius: 4, color: grounded ? "var(--green)" : "var(--muted)", border: `1px solid ${grounded ? "rgba(0,214,143,0.35)" : "var(--border)"}`, background: grounded ? "rgba(0,214,143,0.08)" : "var(--surface)" }}>
    {grounded ? "Observed" : "Best practice"}
  </span>
);
const ConfChip = ({ level }) => {
  const c = level === "high" ? "var(--green)" : level === "medium" ? "var(--amber)" : "var(--muted)";
  return <span style={{ fontSize: 9, color: c, border: `1px solid ${c}`, borderRadius: 4, padding: "1px 6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{level} confidence</span>;
};
const statusColor = (s) => (s === "good" ? "var(--green)" : s === "warn" ? "var(--amber)" : "var(--red)");

export default function ConsultantReport({ r }) {
  if (!r?.aiGenerated) return null;
  const bi = r.businessIntelligence;
  const brief = r.executiveBrief;
  const leaks = Array.isArray(r.revenueLeaks) ? r.revenueLeaks : [];
  const leakSum = r.revenueLeakSummary;
  const bench = r.competitiveBenchmark;
  const matrix = r.priorityMatrix;
  const autos = r.automationPlan?.automations || [];
  const roadmap = r.implementationRoadmap?.items || [];
  const bt = r.detectedBusinessType || r.businessType;

  const biFields = bi ? [
    ["Revenue Model", bi.revenueModel], ["Revenue Sources", bi.revenueSources],
    ["Customer Acquisition", bi.acquisitionChannels], ["Geographic Market", bi.geographicMarket],
    ["Primary Conversion", bi.primaryConversion], ["Secondary Conversions", bi.secondaryConversions],
    ["Service Model", bi.serviceModel], ["Online / Offline Mix", bi.onlineOfflineMix],
  ].filter(([, v]) => v && v.value != null && (!Array.isArray(v.value) || v.value.length)) : [];

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0 14px" }}>
        <div style={{ height: 1, flex: 1, background: "var(--border)" }} />
        <span style={{ fontSize: 11, color: "var(--amber)", letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: "IBM Plex Mono" }}>Consultant Report</span>
        <div style={{ height: 1, flex: 1, background: "var(--border)" }} />
      </div>

      {/* 1 — EXECUTIVE SUMMARY */}
      <Section>
        <Eyebrow>Executive Summary</Eyebrow>
        <SectionHead>What this means for {r.businessName}</SectionHead>
        {brief?.headline && (
          <p style={{ fontFamily: "Syne", fontSize: 16, fontWeight: 700, lineHeight: 1.5, color: "var(--text)", borderLeft: "3px solid var(--amber)", paddingLeft: 14, margin: "0 0 14px" }}>{brief.headline}</p>
        )}
        {String(r.executiveSummary || "").split(/\n\s*\n/).filter(Boolean).map((p, i) => (
          <p key={i} style={{ fontSize: 13.5, lineHeight: 1.75, marginBottom: 10, color: "var(--text)" }}>{p}</p>
        ))}
        {(brief?.topRisks?.length || brief?.topOpportunities?.length) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 8 }}>
            {[["Biggest Risks", brief.topRisks, "whyItMatters", "var(--red)"], ["Biggest Opportunities", brief.topOpportunities, "payoff", "var(--green)"]].map(([label, items, key, col]) => (
              <div key={label}>
                <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>{label}</div>
                {(items || []).map((it, i) => (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ color: col, fontSize: 12 }}>{key === "payoff" ? "▲" : "▼"}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 600 }}>{it.title}</span>
                      <GroundBadge grounded={it.grounded} title={it.signalId || ""} />
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.5, marginLeft: 18 }}>{it[key]}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
        {brief?.priorityAction && (
          <div style={{ marginTop: 12, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 16px" }}>
            <div style={{ fontSize: 10, color: "var(--amber)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Do this first</div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{brief.priorityAction.action}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 8px", lineHeight: 1.5 }}>{brief.priorityAction.rationale}</div>
            <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.7, color: "var(--text)" }}>
              {(brief.priorityAction.sequence || []).map((s, i) => <li key={i}>{s}</li>)}
            </ol>
            {brief.modeledOpportunity?.high != null && (
              <div style={{ marginTop: 10 }}><Modeled lo={brief.modeledOpportunity.low} hi={brief.modeledOpportunity.high} /></div>
            )}
          </div>
        )}
      </Section>

      {/* 2 — BUSINESS INTELLIGENCE PROFILE */}
      {bi && (
        <Section>
          <Eyebrow>Business Intelligence Profile</Eyebrow>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <SectionHead>{bi.businessType?.label || bt?.label}</SectionHead>
            {typeof (bi.businessType?.confidence ?? bt?.confidence) === "number" && (
              <Tag color="var(--green)">confidence {(Math.round((bi.businessType?.confidence ?? bt?.confidence) * 100))}%</Tag>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
            {biFields.map(([label, inf]) => (
              <div key={label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
                  <GroundBadge grounded={inf.basis === "observed"} title={(inf.evidence || []).join(", ")} />
                </div>
                {Array.isArray(inf.value) ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {inf.value.map((v, i) => <span key={i} style={{ fontSize: 11, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, padding: "2px 9px" }}>{titleCase(v)}</span>)}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{titleCase(inf.value)}</div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 3 — REVENUE LEAK ANALYSIS */}
      {leakSum && (
        <Section>
          <Eyebrow>Revenue Leak Analysis</Eyebrow>
          <SectionHead>Where {r.businessName} may be leaving money on the table</SectionHead>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, background: "rgba(0,214,143,0.06)", border: "1px solid rgba(0,214,143,0.25)", borderRadius: 8, padding: "12px 16px", marginBottom: 14 }}>
            <span style={{ fontSize: 12.5, color: "var(--text)", lineHeight: 1.5, maxWidth: 460 }}>{leakSum.headline}</span>
            <Modeled lo={leakSum.totalLow} hi={leakSum.totalHigh} />
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {leaks.map((lk) => (
              <div key={lk.id} style={{ border: `1px solid ${statusColor(lk.status)}30`, borderLeft: `3px solid ${statusColor(lk.status)}`, borderRadius: 8, padding: "12px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{lk.title}</div>
                  <Modeled lo={lk.recovery?.low} hi={lk.recovery?.high} />
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.55, margin: "6px 0" }}>{lk.whatsMissing}</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
                  <GroundBadge grounded={lk.grounded} title={(lk.signalRefs || []).join(", ")} />
                  <span style={{ fontSize: 9, color: "var(--muted)", border: "1px solid var(--border)", borderRadius: 4, padding: "1px 6px", textTransform: "uppercase" }}>volume: {lk.volumeLeverObserved ? "observed" : "assumed"}</span>
                  <ConfChip level={lk.confidence} />
                </div>
                <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.55 }}><strong style={{ color: "var(--amber)" }}>Recommendation:</strong> {lk.recommendation}</div>
                {lk.recovery?.basis && <div style={{ fontSize: 10.5, color: "var(--dim)", marginTop: 4 }}>Basis: {lk.recovery.basis}</div>}
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10.5, color: "var(--dim)", marginTop: 10, lineHeight: 1.6 }}>{leakSum.method}</div>
        </Section>
      )}

      {/* 4 — COMPETITIVE BENCHMARK */}
      {bench?.dimensions?.length > 0 && (
        <Section>
          <Eyebrow>Competitive Benchmark</Eyebrow>
          <SectionHead>{r.businessName} vs. industry norms</SectionHead>
          <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, marginBottom: 12 }}>{bench.summary}</p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--muted)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  <th style={{ padding: "6px 8px" }}>Dimension</th><th style={{ padding: "6px 8px" }}>Your Business</th><th style={{ padding: "6px 8px" }}>Industry Average</th><th style={{ padding: "6px 8px" }}>Gap</th>
                </tr>
              </thead>
              <tbody>
                {bench.dimensions.map((d) => {
                  const gc = d.gap?.status === "ahead" ? "var(--green)" : d.gap?.status === "behind" ? "var(--red)" : "var(--muted)";
                  const unknown = d.yours?.state === "unknown";
                  return (
                    <tr key={d.id} style={{ borderTop: "1px solid var(--border)" }}>
                      <td style={{ padding: "8px", fontWeight: 600 }}>{d.label}</td>
                      <td style={{ padding: "8px", color: unknown ? "var(--muted)" : "var(--text)" }}>{unknown ? "Not verified" : d.yours?.value}</td>
                      <td style={{ padding: "8px", color: "var(--muted)" }}><span style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "1px 8px", fontSize: 11 }}>{d.industryAverage?.value}</span></td>
                      <td style={{ padding: "8px", color: gc }}>{d.gap?.status === "behind" ? "▼ " : d.gap?.status === "ahead" ? "▲ " : "• "}{d.gap?.summary}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 10.5, color: "var(--dim)", marginTop: 8 }}>{bench.benchmarkBasis}</div>
        </Section>
      )}

      {/* 5 — PRIORITY MATRIX */}
      {matrix?.items?.length > 0 && (
        <Section>
          <Eyebrow>Priority Matrix</Eyebrow>
          <SectionHead>What to do, in order of return</SectionHead>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 12 }}>
            {[["Quick Wins", "quick_win", "var(--green)"], ["Strategic Improvements", "strategic_improvement", "var(--amber)"], ["Long-Term", "long_term_opportunity", "var(--blue)"]].map(([label, key, col]) => (
              <div key={key} style={{ background: "var(--surface)", border: `1px solid ${col}40`, borderTop: `2px solid ${col}`, borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontSize: 10, color: col, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, fontWeight: 700 }}>{label}</div>
                {((matrix.buckets?.[key]) || []).map((id) => {
                  const it = matrix.items.find((x) => x.findingId === id);
                  return it ? <div key={id} style={{ fontSize: 11.5, lineHeight: 1.4, marginBottom: 4 }}>• {it.title}</div> : null;
                })}
                {(!(matrix.buckets?.[key]) || matrix.buckets[key].length === 0) && <div style={{ fontSize: 11, color: "var(--muted)" }}>—</div>}
              </div>
            ))}
          </div>
          <div style={{ display: "grid", gap: 4 }}>
            {[...matrix.items].sort((a, b) => (a.rank || 99) - (b.rank || 99)).map((it) => (
              <div key={it.findingId} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, padding: "5px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ width: 18, color: "var(--muted)", fontFamily: "IBM Plex Mono" }}>{it.rank}</span>
                <span style={{ flex: 1 }}>{it.title}</span>
                <span style={{ fontSize: 10, color: "var(--muted)" }}>impact {it.impact} · effort {it.effort}</span>
                <Tag color={statusColor(it.status)}>{it.priority}</Tag>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10.5, color: "var(--dim)", marginTop: 8 }}>{matrix.methodology}</div>
        </Section>
      )}

      {/* 6 — AUTOMATION OPPORTUNITIES */}
      {autos.length > 0 && (
        <Section>
          <Eyebrow>Automation Opportunities</Eyebrow>
          <SectionHead>Systems that fix the gaps automatically</SectionHead>
          {r.automationPlan?.sequenceRationale && <p style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, marginBottom: 12 }}>{r.automationPlan.sequenceRationale}</p>}
          <div style={{ display: "grid", gap: 12 }}>
            {[...autos].sort((a, b) => (a.sequencePriority || 0) - (b.sequencePriority || 0)).map((a) => (
              <div key={a.sequencePriority} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "12px 16px" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "IBM Plex Mono" }}>Step {a.sequencePriority}</span>
                  {a.canonicalService && <Tag color="var(--amber)">{a.canonicalService}</Tag>}
                  <GroundBadge grounded={a.grounded} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12, lineHeight: 1.55 }}>
                  <div><strong style={{ color: "var(--red)" }}>Problem:</strong> {a.problem}</div>
                  <div><strong style={{ color: "var(--green)" }}>Automation:</strong> {a.automation}</div>
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.55, marginTop: 6 }}>{a.howItWorks}</div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
                  {a.timeSaved?.hoursPerWeek ? <span style={{ fontSize: 11, color: "var(--blue)" }}>⏱ saves ~{a.timeSaved.hoursPerWeek} hrs/week</span> : null}
                  {a.businessImpact?.modeledMonthlyHigh > 0 && <Modeled lo={a.businessImpact.modeledMonthlyLow} hi={a.businessImpact.modeledMonthlyHigh} />}
                  {a.businessImpact?.confidence && <ConfChip level={a.businessImpact.confidence} />}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 7 — IMPLEMENTATION ROADMAP */}
      {roadmap.length > 0 && (
        <Section>
          <Eyebrow>Implementation Roadmap</Eyebrow>
          <SectionHead>The plan, sequenced</SectionHead>
          {["now", "next", "later"].map((phase) => {
            const items = roadmap.filter((i) => i.priority === phase).sort((a, b) => (a.priorityRank || 0) - (b.priorityRank || 0));
            if (!items.length) return null;
            const col = phase === "now" ? "var(--green)" : phase === "next" ? "var(--amber)" : "var(--blue)";
            return (
              <div key={phase} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: col, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700, marginBottom: 8 }}>{phase}</div>
                <div style={{ display: "grid", gap: 8 }}>
                  {items.map((it, i) => (
                    <div key={i} style={{ borderLeft: `3px solid ${col}`, background: "var(--surface)", borderRadius: 6, padding: "10px 14px" }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{it.issue}</span>
                        <GroundBadge grounded={it.grounded} />
                        {it.presetProfitCanDeploy && <Tag color="var(--green)">Preset &amp; Profit can deploy</Tag>}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.55 }}>{it.recommendedFix}</div>
                      {it.automationName && <div style={{ fontSize: 11, color: "var(--amber)", marginTop: 4 }}>↳ {it.automationName}</div>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </Section>
      )}

      {/* 8 — 30-DAY ACTION PLAN */}
      {r.thirtyDayPlan && (
        <Section>
          <Eyebrow>30-Day Action Plan</Eyebrow>
          <SectionHead>Your first month, week by week</SectionHead>
          <div style={{ display: "grid", gap: 10 }}>
            {[r.thirtyDayPlan.phase1, r.thirtyDayPlan.phase2, r.thirtyDayPlan.phase3].filter(Boolean).map((phase, idx) => {
              const col = ["var(--green)", "var(--amber)", "var(--blue)"][idx];
              return (
                <div key={idx} style={{ borderLeft: `3px solid ${col}`, background: "var(--surface)", borderRadius: 6, padding: "12px 16px" }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: col, fontFamily: "Syne", marginBottom: 8 }}>Phase {idx + 1}: {phase.title}</div>
                  <ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 5 }}>
                    {(phase.actions || []).map((a, i) => <li key={i} style={{ fontSize: 12.5, lineHeight: 1.55 }}>{a}</li>)}
                  </ol>
                </div>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}
