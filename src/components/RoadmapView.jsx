import { useState, useMemo } from "react";
import { Btn, Tag } from "./ui/index.jsx";
import { generateRoadmap, usd } from "../lib/roadmapEngine.js";
import { downloadRoadmap } from "../lib/exportRoadmap.js";
import { EFFORT_COLOR } from "../lib/constants.js";
import { dealValueCents } from "../lib/dealEngine.js";
import { stampStage } from "../lib/pipeline.js";

// ─────────────────────────────────────────────────────────────────────────────
// RoadmapView — the conversion surface. Takes a completed audit `report`, runs
// the roadmap engine, and presents the priced, sequenced, ROI-justified plan
// that turns an audit reader into an automation client. The "Download Proposal"
// button hands them (or the agency) a closing-quality PDF.
// ─────────────────────────────────────────────────────────────────────────────

const PHASE_COLORS = ["#00d68f", "#f5a623", "#4a9eff"];
const TABS = ["roadmap", "matched solutions", "investment & roi", "proposal"];

function HeroStat({ label, value, sub, accent }) {
  return (
    <div style={{ background: "var(--panel)", border: `1px solid ${accent ? "rgba(0,214,143,0.3)" : "var(--border)"}`, borderRadius: 8, padding: "16px 18px" }}>
      <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontFamily: "Sora", fontWeight: 800, color: accent ? "var(--green)" : "var(--text)", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 5, lineHeight: 1.4 }}>{sub}</div>}
    </div>
  );
}

export default function RoadmapView({ report: r, onBack, branding = null, watermark = false, updateDeal = null, onGenerateOutreach = null, cta = null }) {
  const [tab, setTab] = useState("roadmap");
  const [sent, setSent] = useState(false);

  const rm = useMemo(() => generateRoadmap(r), [r]);
  if (!rm) return null;

  const t = rm.totals;
  const byId = Object.fromEntries(rm.solutions.map(s => [s.id, s]));

  // Downloading the proposal is the "Proposal Generated" pipeline stage — stamp
  // the deal forward and capture its value (the agency's first-year revenue).
  const download = () => {
    downloadRoadmap(rm, { branding, watermark, cta });
    setSent(true);
    if (updateDeal && r?.id) {
      stampStage(updateDeal, r, "proposal", { deal_value_cents: dealValueCents(rm), detail: "proposal downloaded" });
    }
  };

  // Trust gate: if nothing clears the 3× ROI bar, we DON'T fabricate a proposal.
  // We tell the operator the honest truth and surface what to validate instead.
  if (!rm.hasRecommendations) {
    return (
      <div className="page-pad" style={{ animation: "fadeUp .4s ease", maxWidth: 680 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 12, marginBottom: 8, fontFamily: "IBM Plex Mono" }}>← Back to Report</button>
        <h1 style={{ fontFamily: "Sora", fontSize: 22, fontWeight: 800 }}>{rm.business.name} — Automation Roadmap</h1>
        <div style={{ background: "var(--panel)", border: "1px solid var(--amber)", borderRadius: 10, padding: "22px 24px", marginTop: 16 }}>
          <div style={{ fontSize: 10, color: "var(--amber)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>Honest assessment</div>
          <p style={{ fontSize: 13, lineHeight: 1.75 }}>{rm.proposal.opportunityStatement}</p>
          <p style={{ fontSize: 13, lineHeight: 1.75, marginTop: 12, color: "var(--text)", fontWeight: 600 }}>{rm.proposal.recommendation}</p>
        </div>
        {(rm.futureOpportunities.length > 0 || rm.validateOpportunities.length > 0) && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Opportunities to revisit as you grow</div>
            <div style={{ display: "grid", gap: 8 }}>
              {[...rm.futureOpportunities, ...rm.validateOpportunities].map((f, i) => (
                <div key={i} style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 16px" }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{f.consumerName}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3, lineHeight: 1.5 }}>{f.reason}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="page-pad" style={{ animation: "fadeUp .4s ease", paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 12, marginBottom: 8, fontFamily: "IBM Plex Mono" }}>← Back to Report</button>
          <h1 style={{ fontFamily: "Sora", fontSize: 22, fontWeight: 800, letterSpacing: "-0.01em" }}>{rm.business.name} — Automation Roadmap</h1>
          <div style={{ fontSize: 11, color: "var(--amber)", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 4 }}>
            Sales-Ready Proposal · {rm.solutions.length} systems · {t.roiMultiple}× first-year ROI
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Tag color="#6b6b85">{rm.business.industry}</Tag>
            {rm.business.city && <Tag color="#3a3a50">{rm.business.city}</Tag>}
            {rm.business.goal && <Tag color="var(--amber)">{rm.business.goal}</Tag>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn onClick={download} variant={sent ? "success" : "ghost"}>{sent ? "✓ Proposal Ready" : "↓ Download Proposal"}</Btn>
          {onGenerateOutreach && <Btn onClick={onGenerateOutreach} variant="primary">⚡ Generate Outreach →</Btn>}
        </div>
      </div>

      {watermark && (
        <div style={{ background: "rgba(245,166,35,0.1)", border: "1px dashed var(--amber)", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "var(--amber)" }}>
          Free preview — the exported proposal is watermarked. Upgrade to send clean, client-ready proposals.
        </div>
      )}

      {/* Hero economics — net gain is THE number */}
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 18 }}>
        <HeroStat label="Net gain / month" value={`+${usd(t.monthlyNet)}`} sub="after all costs — what you keep" accent />
        <HeroStat label="Revenue recovered / mo" value={usd(t.monthlyImpact)} sub={`vs ${usd(t.monthly)}/mo cost`} accent />
        <HeroStat label="First-year ROI" value={`${t.roiMultiple}×`} sub={`${usd(t.annualImpact)} return vs ${usd(t.firstYearCost)} cost`} />
        <HeroStat label="Payback" value={t.paybackText} sub="to earn back setup" />
      </div>

      {/* Investment summary bar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 0, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", marginBottom: 18 }}>
        {[
          ["Total setup", usd(t.setup), "one-time, done-for-you"],
          ["Monthly management", `${usd(t.monthly)}/mo`, "hosting, monitoring, optimization"],
          ["Staff time saved", `~${t.hoursPerWeek} hrs/wk`, "across all systems"],
        ].map(([l, v, s], i) => (
          <div key={l} style={{ flex: 1, minWidth: 180, padding: "14px 18px", borderRight: i < 2 ? "1px solid var(--border)" : "none" }}>
            <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>{l}</div>
            <div style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 18 }}>{v}</div>
            <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 3 }}>{s}</div>
          </div>
        ))}
      </div>

      {/* Recommended bundle */}
      {rm.bundle && (
        <div style={{ background: "var(--panel)", border: "1px solid var(--amber)", borderRadius: 10, padding: "20px 22px", marginBottom: 18, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, right: 0, width: 220, height: 220, background: "radial-gradient(circle at top right,rgba(245,166,35,0.08),transparent 70%)", pointerEvents: "none" }} />
          <div style={{ fontSize: 10, color: "var(--amber)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>◈ Recommended Package — best place to start</div>
          <div style={{ fontFamily: "Sora", fontSize: 20, fontWeight: 800, marginBottom: 8 }}>{rm.bundle.name}</div>
          <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.7, marginBottom: 14, maxWidth: 620 }}>{rm.bundle.blurb}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div><span style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 24, color: "var(--amber)" }}>{usd(rm.bundle.setup)}</span> <span style={{ fontSize: 12, color: "var(--muted)" }}>setup</span></div>
            <span style={{ color: "var(--muted)" }}>+</span>
            <div><span style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 24, color: "var(--amber)" }}>{usd(rm.bundle.monthly)}</span> <span style={{ fontSize: 12, color: "var(--muted)" }}>/month</span></div>
            {rm.bundle.savings > 0 && (
              <span style={{ marginLeft: "auto", background: "rgba(0,214,143,0.1)", border: "1px solid rgba(0,214,143,0.3)", color: "var(--green)", fontSize: 12, fontWeight: 700, padding: "6px 14px", borderRadius: 20 }}>
                Save {usd(rm.bundle.savings)} vs à la carte
              </span>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 18, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: 4, width: "fit-content", flexWrap: "wrap" }}>
        {TABS.map(tb => (
          <button key={tb} onClick={() => setTab(tb)} style={{
            padding: "7px 14px", borderRadius: 6, border: "none", cursor: "pointer",
            fontFamily: "IBM Plex Mono", fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase",
            background: tab === tb ? "var(--amber)" : "transparent",
            color: tab === tb ? "var(--ink)" : "var(--muted)",
            fontWeight: tab === tb ? 600 : 400, transition: "all .15s", whiteSpace: "nowrap",
          }}>{tb}</button>
        ))}
      </div>

      {/* ── ROADMAP ── */}
      {tab === "roadmap" && (
        <div style={{ display: "grid", gap: 14 }}>
          {rm.roadmap.phases.map((p, idx) => (
            <div key={p.key} style={{ background: "var(--panel)", border: `1px solid ${PHASE_COLORS[idx]}30`, borderLeft: `3px solid ${PHASE_COLORS[idx]}`, borderRadius: 8, padding: "20px 24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: PHASE_COLORS[idx], fontFamily: "Sora" }}>{p.title}</div>
                <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{p.timeframe}</div>
              </div>
              <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6, marginBottom: 14 }}>{p.objective}</p>
              <div style={{ display: "grid", gap: 8 }}>
                {p.services.map(id => byId[id]).filter(Boolean).map(s => (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "var(--surface)", borderRadius: 6, border: "1px solid var(--border)" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: PHASE_COLORS[idx], flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{s.consumerName}</div>
                      <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 2 }}>{s.buildLabel} · {usd(s.setup)} setup · {usd(s.monthly)}/mo</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 15, fontFamily: "Sora", fontWeight: 800, color: "var(--green)" }}>{usd(s.monthlyImpact)}</div>
                      <div style={{ fontSize: 9, color: "var(--muted)" }}>/mo recovered</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── MATCHED SOLUTIONS ── */}
      {tab === "matched solutions" && (
        <div style={{ display: "grid", gap: 14 }}>
          {rm.solutions.map((s, i) => (
            <div key={s.id} style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>System {i + 1}</span>
                    <Tag color="#4a9eff">{s.category}</Tag>
                    <Tag color={EFFORT_COLOR[s.effort]}>{s.effort === "low" ? "Live in days" : s.effort === "medium" ? "1–2 week build" : "Premium build"}</Tag>
                    <Tag color="var(--green)">{s.roiMultiple}× ROI</Tag>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "Sora", marginBottom: 8 }}>{s.consumerName}</div>
                  {s.addressedWeaknesses.length > 0 && (
                    <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.6, marginBottom: 6, borderLeft: "2px solid var(--red)", paddingLeft: 10 }}>
                      <span style={{ color: "var(--red)", fontWeight: 600 }}>Fixes:</span> {s.addressedWeaknesses.map(w => w.issue).join(" · ")}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>{s.solution}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0, maxWidth: 180 }}>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 2, letterSpacing: "0.06em" }}>RECOVERS / MONTH</div>
                  <div style={{ fontSize: 26, fontFamily: "Sora", fontWeight: 800, color: "var(--green)" }}>{usd(s.monthlyImpact)}</div>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 4, lineHeight: 1.4 }}>{s.impactBasis}</div>
                </div>
              </div>
              <div style={{ borderTop: "1px solid var(--border)", background: "var(--surface)", display: "grid", gridTemplateColumns: "repeat(4,1fr)" }}>
                {[
                  ["Setup", usd(s.setup)],
                  ["Monthly", usd(s.monthly)],
                  ["Payback", s.paybackText],
                  ["Net / mo", `+${usd(s.monthlyNet)}`],
                ].map(([l, v], ci) => (
                  <div key={l} style={{ padding: "11px 16px", borderRight: ci < 3 ? "1px solid var(--border)" : "none" }}>
                    <div style={{ fontSize: 9, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{l}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, fontFamily: "Sora", color: ci === 3 ? "var(--amber)" : "var(--text)" }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── INVESTMENT & ROI ── */}
      {tab === "investment & roi" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "12px 18px", borderBottom: "1px solid var(--border)", fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
              <div>System</div><div style={{ textAlign: "right" }}>Setup</div><div style={{ textAlign: "right" }}>Monthly</div><div style={{ textAlign: "right" }}>Recovers/mo</div><div style={{ textAlign: "right" }}>1-yr ROI</div>
            </div>
            {rm.solutions.map(s => (
              <div key={s.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "12px 18px", borderBottom: "1px solid var(--border)", fontSize: 13, alignItems: "center" }}>
                <div style={{ fontWeight: 600 }}>{s.consumerName}</div>
                <div style={{ textAlign: "right", fontFamily: "IBM Plex Mono" }}>{usd(s.setup)}</div>
                <div style={{ textAlign: "right", fontFamily: "IBM Plex Mono" }}>{usd(s.monthly)}</div>
                <div style={{ textAlign: "right", fontFamily: "IBM Plex Mono", color: "var(--green)" }}>{usd(s.monthlyImpact)}</div>
                <div style={{ textAlign: "right", fontFamily: "IBM Plex Mono", color: "var(--amber)" }}>{s.roiMultiple}×</div>
              </div>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "14px 18px", fontSize: 14, alignItems: "center", background: "var(--surface)", fontWeight: 800 }}>
              <div style={{ fontFamily: "Sora" }}>Total</div>
              <div style={{ textAlign: "right", fontFamily: "IBM Plex Mono" }}>{usd(t.setup)}</div>
              <div style={{ textAlign: "right", fontFamily: "IBM Plex Mono" }}>{usd(t.monthly)}</div>
              <div style={{ textAlign: "right", fontFamily: "IBM Plex Mono", color: "var(--green)" }}>{usd(t.monthlyImpact)}</div>
              <div style={{ textAlign: "right", fontFamily: "IBM Plex Mono", color: "var(--amber)" }}>{t.roiMultiple}×</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ background: "rgba(0,214,143,0.06)", border: "1px solid rgba(0,214,143,0.25)", borderRadius: 8, padding: 20 }}>
              <div style={{ fontSize: 11, color: "var(--green)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Year-one return</div>
              <div style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 30, color: "var(--green)" }}>{usd(t.annualImpact)}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6, lineHeight: 1.6 }}>Net of all setup + 12 months of management: <strong style={{ color: "var(--green)" }}>{usd(t.firstYearNet)}</strong> kept.</div>
            </div>
            <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: 20 }}>
              <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Total year-one investment</div>
              <div style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 30, color: "var(--text)" }}>{usd(t.firstYearCost)}</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6, lineHeight: 1.6 }}>{usd(t.setup)} setup + {usd(t.monthly)}/mo × 12. Blended payback in {t.paybackText}.</div>
            </div>
          </div>

          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "14px 18px" }}>
            <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.7 }}>
              <strong style={{ color: "var(--text)" }}>How these numbers are built:</strong> we estimate {rm.business.name}'s real economics — about {rm.economics.monthlyJobs} jobs/mo, ~{rm.economics.monthlyLeads} inbound leads/mo, a {usd(rm.economics.customerValue)} value per new customer, and industry leak rates — then apply each system to a <em>different</em> leak (missed calls, web leads, no-shows, reviews, quotes…) so nothing is double-counted. We only recommend a system when it clears <strong style={{ color: "var(--text)" }}>≥{`${3}`}× monthly ROI with payback under 6 months</strong>. Anything below that bar is listed as a future opportunity, not recommended. Confirmed against your real numbers on the kickoff call.
            </div>
          </div>
        </div>
      )}

      {/* ── PROPOSAL ── */}
      {tab === "proposal" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ background: "var(--panel)", border: "1px solid rgba(245,166,35,0.25)", borderLeft: "3px solid var(--amber)", borderRadius: 8, padding: "16px 20px" }}>
            <div style={{ fontSize: 10, color: "var(--amber)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>The opportunity</div>
            <p style={{ fontSize: 13, lineHeight: 1.75 }}>{rm.proposal.opportunityStatement}</p>
          </div>

          <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: 20 }}>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>Every gap → the system that fixes it</div>
            <div style={{ display: "grid", gap: 10 }}>
              {rm.proposal.problemSolution.map((ps, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 20px 1fr", gap: 10, alignItems: "center" }}>
                  <div style={{ background: "rgba(255,71,87,0.05)", border: "1px solid rgba(255,71,87,0.2)", borderRadius: 6, padding: "10px 12px" }}>
                    <div style={{ fontSize: 9, color: "var(--red)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>GAP</div>
                    <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.4 }}>{ps.problem}</div>
                  </div>
                  <div style={{ textAlign: "center", color: "var(--amber)", fontSize: 16 }}>→</div>
                  <div style={{ background: "rgba(0,214,143,0.05)", border: "1px solid rgba(0,214,143,0.2)", borderRadius: 6, padding: "10px 12px" }}>
                    <div style={{ fontSize: 9, color: "var(--green)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>SOLVED BY</div>
                    <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.4 }}>{ps.solution}</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "var(--green)", marginTop: 5 }}>{ps.impact}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: 20 }}>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Our recommendation</div>
            <p style={{ fontSize: 13, lineHeight: 1.75, marginBottom: 16 }}>{rm.proposal.recommendation}</p>
            <div style={{ display: "grid", gap: 8 }}>
              {rm.proposal.terms.map((term, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ color: "var(--amber)", flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: 12.5, lineHeight: 1.6, color: "var(--text)" }}>{term}</span>
                </div>
              ))}
            </div>
            <div style={{ background: "rgba(0,214,143,0.08)", border: "1px solid rgba(0,214,143,0.25)", borderRadius: 6, padding: "12px 16px", marginTop: 16, fontSize: 12.5, color: "var(--green)", lineHeight: 1.6 }}>
              🛡 {rm.proposal.guarantee}
            </div>
          </div>

          <div style={{ background: "var(--panel)", border: "1px solid var(--amber)", borderRadius: 10, padding: "22px 24px", textAlign: "center" }}>
            <div style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 18, marginBottom: 8 }}>Ready to recover {usd(t.monthlyImpact)}/month?</div>
            <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.7, marginBottom: 16, maxWidth: 520, margin: "0 auto 16px" }}>{rm.proposal.cta}</p>
            <Btn onClick={download} variant={sent ? "success" : "primary"}>{sent ? "✓ Proposal Downloaded" : "↓ Download the Full Proposal PDF"}</Btn>
          </div>
        </div>
      )}

      {/* Additional + future opportunities — honest, not recommended now */}
      {(rm.additionalOpportunities.length > 0 || rm.futureOpportunities.length > 0 || rm.validateOpportunities.length > 0) && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
            Future Opportunities <span style={{ textTransform: "none", letterSpacing: 0 }}>— not recommended yet (kept honest)</span>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {rm.additionalOpportunities.map((s, i) => (
              <div key={`a${i}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: "11px 16px", flexWrap: "wrap" }}>
                <div><span style={{ fontSize: 13, fontWeight: 600 }}>{s.consumerName}</span> <Tag color="var(--green)">also clears {s.roiMultiple}× ROI</Tag></div>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>{usd(s.monthlyImpact)}/mo · {usd(s.monthly)}/mo cost — add once the top 3 are live</span>
              </div>
            ))}
            {[...rm.futureOpportunities, ...rm.validateOpportunities].map((f, i) => (
              <div key={`f${i}`} style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: "11px 16px" }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{f.consumerName}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3, lineHeight: 1.5 }}>{f.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 32, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
        <p style={{ fontSize: 10, color: "var(--dim)", lineHeight: 1.6 }}>
          All figures are modeled conservatively from published industry benchmarks and this business's audit inputs, applying each system to a distinct revenue leak (no double-counting). We recommend only systems that clear a 3× monthly-ROI bar with payback under 6 months. Estimates, not guarantees; confirmed in writing at kickoff.
        </p>
      </div>
    </div>
  );
}
