import { useState, useMemo } from "react";
import { Btn, Tag } from "./ui/index.jsx";
import { deriveStage, stageColor, stageLabel, pipelineAggregates, isClosed } from "../lib/dealEngine.js";
import { appendActivity } from "../lib/pipeline.js";

const fmtMoney = cents => `$${Math.round((cents || 0) / 100).toLocaleString()}`;
const UNASSIGNED = "Unassigned";

// White-Label Agency command center (Agency tier). The same Deals, grouped by
// client (crm.clientLabel), under the agency's own branding — so a reseller runs
// every client's pipeline from one branded surface and ships white-label share
// links. Multi-tenancy stays soft (client labels) until Phase 3 org workspaces.
export default function AgencyConsole({ audits = [], updateDeal, branding = null, onViewReport, onViewRoadmap, onShare }) {
  const [links, setLinks] = useState({});   // dealId → share url
  const [busy, setBusy] = useState(null);

  const groups = useMemo(() => {
    const g = {};
    for (const a of audits) {
      const label = a.crm?.clientLabel || UNASSIGNED;
      (g[label] ||= []).push(a);
    }
    // Stable order: named clients first (by value), Unassigned last.
    return Object.entries(g).sort((a, b) => {
      if (a[0] === UNASSIGNED) return 1;
      if (b[0] === UNASSIGNED) return -1;
      return b[1].length - a[1].length;
    });
  }, [audits]);

  const assignClient = deal => {
    const label = window.prompt("Assign this deal to a client (leave blank to unassign):", deal.crm?.clientLabel || "");
    if (label === null) return;
    const clean = label.trim();
    updateDeal(deal.id, {
      crm: appendActivity({ ...(deal.crm || {}), clientLabel: clean || undefined }, "client", clean ? `Assigned to ${clean}` : "Unassigned"),
    });
  };

  const makeLink = async deal => {
    if (!onShare) return;
    setBusy(deal.id);
    try {
      const url = await onShare(deal);
      if (url) { setLinks(p => ({ ...p, [deal.id]: url })); try { await navigator.clipboard.writeText(url); } catch { /* clipboard blocked */ } }
    } finally { setBusy(null); }
  };

  return (
    <div className="page-pad" style={{ animation: "fadeUp .4s ease" }}>
      {/* Branded header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        {branding?.logoUrl
          ? <img src={branding.logoUrl} alt={branding.name || "logo"} style={{ height: 30, maxWidth: 160, objectFit: "contain" }} onError={e => { e.currentTarget.style.display = "none"; }} />
          : <div style={{ width: 28, height: 28, borderRadius: 6, background: branding?.color || "var(--amber)" }} />}
        <h1 style={{ fontFamily: "Sora", fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" }}>{branding?.name || "Agency"} Console</h1>
      </div>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 24 }}>Every client's pipeline, white-labeled, in one place. Assign deals to clients and ship branded share links.</p>

      {audits.length === 0 && (
        <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: "60px 24px", textAlign: "center" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>❖</div>
          <div style={{ fontFamily: "Sora", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>No client deals yet</div>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>Run audits for your clients to populate the console.</div>
        </div>
      )}

      <div style={{ display: "grid", gap: 18 }}>
        {groups.map(([client, deals]) => {
          const agg = pipelineAggregates(deals);
          return (
            <div key={client} style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid var(--border)", flexWrap: "wrap", gap: 8 }}>
                <div style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 16 }}>{client}</div>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>{deals.length} deal{deals.length !== 1 ? "s" : ""}</span>
                  <Tag color="var(--amber)">{fmtMoney(agg.openValueCents)} open</Tag>
                  {agg.wonValueCents > 0 && <Tag color="var(--green)">{fmtMoney(agg.wonValueCents)} won</Tag>}
                </div>
              </div>
              <div>
                {deals.map(d => {
                  const stage = deriveStage(d);
                  return (
                    <div key={d.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px", borderBottom: "1px solid var(--border)", flexWrap: "wrap", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{d.businessName}</span>
                        <Tag color={stageColor(stage)}>{stageLabel(stage)}</Tag>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>{d.industry}</span>
                        {d.deal_value_cents ? <span style={{ fontSize: 12, color: "var(--green)", fontWeight: 700 }}>{fmtMoney(d.deal_value_cents)}</span> : null}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <Btn small variant="ghost" onClick={() => assignClient(d)}>{d.crm?.clientLabel ? "Reassign" : "Assign client"}</Btn>
                        <Btn small variant="ghost" onClick={() => onViewReport?.(d)}>Report</Btn>
                        {!isClosed(stage) && <Btn small variant="ghost" onClick={() => onViewRoadmap?.(d)}>Proposal</Btn>}
                        {onShare && <Btn small variant={links[d.id] ? "success" : "primary"} disabled={busy === d.id} onClick={() => makeLink(d)}>{busy === d.id ? "…" : links[d.id] ? "✓ Link copied" : "Share link"}</Btn>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
