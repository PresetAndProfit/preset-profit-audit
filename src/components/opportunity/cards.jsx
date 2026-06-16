// src/components/opportunity/cards.jsx — V6 Phase 6: executive decision UI.
// NextBestActionCard · OpportunityAlertCard · CampaignPackageCard ·
// DepartmentHealthPanel. Premium, decision-first, low-clutter. Pure presentation.
import { useState } from "react";

const money = (r) => (r ? `$${(r.low || 0).toLocaleString()}–$${(r.high || 0).toLocaleString()}` : "");
const TIER_COLOR = { urgent: "var(--red)", opportunity: "var(--amber)", watch: "var(--blue)", ignore: "var(--muted)" };
const healthColor = (s) => (s >= 75 ? "var(--green)" : s >= 55 ? "var(--amber)" : s >= 40 ? "#f5a623" : "var(--red)");
const Chip = ({ children, color }) => <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, border: `1px solid ${color || "var(--border)"}`, color: color || "var(--muted)", whiteSpace: "nowrap" }}>{children}</span>;
const CampaignRow = ({ label, value }) => value ? (
  <div style={{ display: "flex", gap: 10, padding: "6px 0", borderTop: "1px solid var(--border)" }}>
    <span style={{ flexShrink: 0, width: 120, fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)", fontWeight: 700, paddingTop: 2 }}>{label}</span>
    <span style={{ flex: 1, fontSize: 12, color: "var(--text)", lineHeight: 1.5 }}>{value}</span>
  </div>
) : null;

export function NextBestActionCard({ nba, onLaunch }) {
  if (!nba) return null;
  return (
    <div style={{ background: "linear-gradient(135deg, rgba(245,166,35,0.10), rgba(245,166,35,0.02))", border: "1px solid var(--amber)", borderRadius: 12, padding: "20px 22px", marginBottom: 16 }}>
      <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--amber)", fontWeight: 800, marginBottom: 8 }}>★ Next best action</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>{nba.actionTitle}</div>
      <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, marginBottom: 12 }}>{nba.explanation}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        {nba.revenueRange && <Chip color="var(--green)">{money(nba.revenueRange)} modeled</Chip>}
        <Chip>⏱ {nba.timeToLaunch}</Chip>
        <Chip>{nba.complexity} effort</Chip>
        {nba.recommendedWorkflow && <Chip color="var(--amber)">workflow: {nba.recommendedWorkflow}</Chip>}
        {nba.departmentOwner && <Chip>{nba.departmentOwner}</Chip>}
        {onLaunch && nba.campaign && <button onClick={() => onLaunch(nba)} style={{ marginLeft: "auto", background: "var(--amber)", color: "var(--ink)", border: "none", borderRadius: 6, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>View campaign →</button>}
      </div>
    </div>
  );
}

export function CampaignPackageCard({ campaign }) {
  if (!campaign) return null;
  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--amber)", borderRadius: 10, padding: "14px 16px", marginTop: 8 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>📣 {campaign.campaignName}</div>
      <CampaignRow label="Offer" value={campaign.offer} />
      <CampaignRow label="Channel" value={campaign.recommendedChannel} />
      <CampaignRow label="Facebook ad" value={campaign.facebookAd} />
      <CampaignRow label="Google heads" value={(campaign.googleHeadlines || []).join(" · ")} />
      <CampaignRow label="Instagram" value={campaign.instagramCaption} />
      <CampaignRow label="SMS blast" value={campaign.smsBlast} />
      <CampaignRow label="Email" value={campaign.emailCampaign && `${campaign.emailCampaign.subject} — ${campaign.emailCampaign.body}`} />
      <CampaignRow label="Landing" value={campaign.landingHeadline} />
      <CampaignRow label="30-sec script" value={campaign.commercialScript} />
      <CampaignRow label="Reel/TikTok" value={campaign.reelScript} />
      <CampaignRow label="Budget" value={campaign.budgetRange && money(campaign.budgetRange)} />
      <CampaignRow label="Timeline" value={campaign.launchTimeline} />
      <CampaignRow label="Pairs with" value={campaign.recommendedWorkflowPairing} />
    </div>
  );
}

export function OpportunityAlertCard({ opp }) {
  const [open, setOpen] = useState(false);
  const color = TIER_COLOR[opp.tier] || "var(--muted)";
  return (
    <div style={{ border: "1px solid var(--border)", borderLeft: `3px solid ${color}`, borderRadius: 10, padding: "12px 15px", marginBottom: 8, background: "var(--panel)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text)" }}>{opp.title}</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{opp.business ? `${opp.business} · ` : ""}{opp.triggerSignal}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <Chip color={color}>{opp.tier} · {opp.score}</Chip>
          <div style={{ fontSize: 11, color: "var(--green)", marginTop: 4, fontFamily: "IBM Plex Mono" }}>{money(opp.estimatedRevenueRange)}</div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.55, margin: "8px 0" }}>{opp.whyItMatters}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        <Chip>⏱ {opp.timeWindow}</Chip>
        {opp.recommendedWorkflow && <Chip color="var(--amber)">{opp.recommendedWorkflow}</Chip>}
        <Chip>{opp.departmentOwner}</Chip>
        {opp.campaign && <button onClick={() => setOpen((o) => !o)} style={{ marginLeft: "auto", background: "none", border: "1px solid var(--amber)", color: "var(--amber)", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{open ? "Hide campaign" : "View campaign"}</button>}
      </div>
      {open && <CampaignPackageCard campaign={opp.campaign} />}
    </div>
  );
}

export function DepartmentHealthPanel({ notes }) {
  if (!notes || !notes.length) return null;
  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 10, padding: 18, marginBottom: 16 }}>
      <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--amber)", fontWeight: 700, marginBottom: 12 }}>Department notes</div>
      {notes.map((n, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderTop: i ? "1px solid var(--border)" : "none" }}>
          <span style={{ width: 30, height: 30, borderRadius: 7, background: `${healthColor(n.health)}22`, color: healthColor(n.health), display: "grid", placeItems: "center", fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{n.health}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, color: "var(--text)" }}><b>{n.department}</b> <span style={{ color: "var(--muted)" }}>· {n.business}</span></div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>{n.note}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
