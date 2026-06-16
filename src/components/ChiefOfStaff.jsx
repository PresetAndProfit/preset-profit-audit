// src/components/ChiefOfStaff.jsx — the always-on Executive Intelligence
// briefing. Renders the portfolio briefing from chiefOfStaff.js: what matters /
// changed / next / ignore, plus per-business health. Pure presentation.
import { useMemo } from "react";
import { buildPortfolioBriefing } from "../lib/chiefOfStaff.js";
import { NextBestActionCard, OpportunityAlertCard, DepartmentHealthPanel } from "./opportunity/cards.jsx";

const money = (n) => `$${Math.round(Number(n) || 0).toLocaleString()}`;
const healthColor = (s) => (s >= 75 ? "var(--green)" : s >= 55 ? "var(--amber)" : s >= 40 ? "#f5a623" : "var(--red)");

const Card = ({ children, accent, style }) => (
  <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderLeft: accent ? `3px solid ${accent}` : "1px solid var(--border)", borderRadius: 10, padding: 18, ...style }}>{children}</div>
);
const Eyebrow = ({ children, color }) => (
  <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: color || "var(--amber)", fontWeight: 700, marginBottom: 10 }}>{children}</div>
);

export default function ChiefOfStaff({ audits = [], onOpen }) {
  const brief = useMemo(() => buildPortfolioBriefing(audits), [audits]);

  if (!audits.length) return (
    <div className="page-pad" style={{ animation: "fadeUp .4s ease" }}>
      <h1 style={{ fontFamily: "Sora", fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 6 }}>Chief of Staff</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 40 }}>Your always-on executive briefing across every business.</p>
      <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: "60px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>✦</div>
        <div style={{ fontFamily: "Sora", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>No businesses yet</div>
        <div style={{ color: "var(--muted)", fontSize: 13 }}>Run an audit and your Chief of Staff starts briefing you.</div>
      </div>
    </div>
  );

  return (
    <div className="page-pad" style={{ maxWidth: 1100, margin: "0 auto", animation: "fadeUp .4s ease" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "Sora", fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4 }}>Chief of Staff</h1>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>{brief.businesses} {brief.businesses === 1 ? "business" : "businesses"} · briefing for {new Date(brief.generatedAt).toLocaleDateString("en-US", { month: "long", day: "numeric" })}</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: healthColor(brief.portfolioHealth || 0), lineHeight: 1 }}>{brief.portfolioHealth ?? "—"}</div>
            <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Portfolio health</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: "var(--green)", lineHeight: 1 }}>{money(brief.totalOpportunity)}</div>
            <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Modeled opportunity</div>
          </div>
        </div>
      </div>

      {/* Next best action — the hero (rich, with campaign + workflow). */}
      {brief.nextBestAction ? <NextBestActionCard nba={brief.nextBestAction} /> : brief.whatNext && (
        <Card accent="var(--amber)" style={{ marginBottom: 16, background: "rgba(245,166,35,0.06)" }}>
          <Eyebrow>What should happen next</Eyebrow>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>{brief.whatNext.action}</div>
          <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.55 }}><b style={{ color: "var(--text)" }}>{brief.whatNext.business}</b> — {brief.whatNext.rationale}</div>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* What matters */}
        <Card>
          <Eyebrow>What matters</Eyebrow>
          {brief.whatMatters.length ? brief.whatMatters.map((m, i) => (
            <div key={i} onClick={() => onOpen?.(m.id)} style={{ padding: "9px 0", borderBottom: i < brief.whatMatters.length - 1 ? "1px solid var(--border)" : "none", cursor: onOpen ? "pointer" : "default" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{m.action}</span>
                {m.impact != null && <span style={{ fontSize: 10, color: "var(--muted)", fontFamily: "IBM Plex Mono", whiteSpace: "nowrap" }}>impact {m.impact}</span>}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{m.business}</div>
            </div>
          )) : <div style={{ fontSize: 12, color: "var(--muted)" }}>Nothing urgent — the book is healthy.</div>}
        </Card>

        {/* What changed */}
        <Card>
          <Eyebrow color="var(--blue)">What changed</Eyebrow>
          {brief.whatChanged.length ? brief.whatChanged.map((c, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "8px 0", borderBottom: i < brief.whatChanged.length - 1 ? "1px solid var(--border)" : "none" }}>
              <span style={{ fontSize: 12.5, color: "var(--text)" }}><b>{c.business}</b> — {c.change}</span>
            </div>
          )) : <div style={{ fontSize: 12, color: "var(--muted)" }}>No changes in the last 7 days.</div>}
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Threats */}
        <Card accent="var(--red)">
          <Eyebrow color="var(--red)">Threats to act on</Eyebrow>
          {brief.threats.length ? brief.threats.map((t, i) => (
            <div key={i} style={{ padding: "7px 0" }}><div style={{ fontSize: 12.5, fontWeight: 600 }}>{t.title} <span style={{ color: "var(--muted)", fontWeight: 400 }}>· {t.business}</span></div><div style={{ fontSize: 11.5, color: "var(--muted)" }}>{t.detail}</div></div>
          )) : <div style={{ fontSize: 12, color: "var(--muted)" }}>No active threats detected.</div>}
        </Card>
        {/* Opportunities */}
        <Card accent="var(--green)">
          <Eyebrow color="var(--green)">Opportunities to capture</Eyebrow>
          {brief.opportunities.length ? brief.opportunities.map((o, i) => (
            <div key={i} style={{ padding: "7px 0" }}><div style={{ fontSize: 12.5, fontWeight: 600 }}>{o.title} <span style={{ color: "var(--muted)", fontWeight: 400 }}>· {o.business}</span></div><div style={{ fontSize: 11.5, color: "var(--muted)" }}>{o.detail}</div></div>
          )) : <div style={{ fontSize: 12, color: "var(--muted)" }}>No new opportunities surfaced.</div>}
        </Card>
      </div>

      {/* Growth opportunities — the intelligence filter, each with a campaign */}
      {brief.growthOpportunities.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Eyebrow>Growth opportunities · launch-ready</Eyebrow>
          {brief.growthOpportunities.map((o) => <OpportunityAlertCard key={o.id} opp={o} />)}
        </div>
      )}

      {/* Department notes */}
      <DepartmentHealthPanel notes={brief.departmentNotes} />

      {/* 7-day action plan */}
      {brief.sevenDayPlan.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <Eyebrow color="var(--green)">7-day action plan</Eyebrow>
          {brief.sevenDayPlan.map((p, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "7px 0", borderTop: i ? "1px solid var(--border)" : "none" }}>
              <span style={{ flexShrink: 0, width: 52, fontSize: 10, color: "var(--amber)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", paddingTop: 2 }}>{p.day}</span>
              <span style={{ fontSize: 12.5, color: "var(--text)" }}>{p.action} <span style={{ color: "var(--muted)" }}>· {p.business}</span></span>
            </div>
          ))}
        </Card>
      )}

      {/* Roster — per-business health (worst first) */}
      <Card style={{ padding: 0, marginBottom: 16 }}>
        <div style={{ padding: "14px 18px 0" }}><Eyebrow>Business health</Eyebrow></div>
        <div style={{ padding: "0 8px 8px" }}>
          {brief.roster.map((b) => (
            <div key={b.id} onClick={() => onOpen?.(b.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 10px", borderTop: "1px solid var(--border)", cursor: onOpen ? "pointer" : "default" }}>
              <span style={{ width: 34, height: 34, borderRadius: 8, background: `${healthColor(b.health.score)}22`, color: healthColor(b.health.score), display: "grid", placeItems: "center", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{b.health.score}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.business}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>{b.industry || "—"} · {b.health.label}{b.priority ? ` · next: ${b.priority.action}` : ""}</div>
              </div>
              {b.opportunityValue ? <span style={{ fontSize: 11.5, color: "var(--green)", fontFamily: "IBM Plex Mono", whiteSpace: "nowrap" }}>{money(b.opportunityValue)}</span> : null}
            </div>
          ))}
        </div>
      </Card>

      {/* What to ignore */}
      {brief.whatToIgnore.count > 0 && (
        <Card style={{ background: "transparent" }}>
          <Eyebrow color="var(--muted)">Safe to ignore this week</Eyebrow>
          <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6 }}>
            {brief.whatToIgnore.count} {brief.whatToIgnore.count === 1 ? "business is" : "businesses are"} stable and need no attention: {brief.whatToIgnore.stableBusinesses.join(", ")}.
          </div>
        </Card>
      )}
    </div>
  );
}
