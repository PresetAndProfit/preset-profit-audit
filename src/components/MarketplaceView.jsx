import { useMemo } from "react";
import { Btn, Tag } from "./ui/index.jsx";
import { CATALOG, BUNDLES, CATALOG_BY_ID } from "../lib/automationCatalog.js";
import { generateRoadmap, usd } from "../lib/roadmapEngine.js";
import { deriveStage, isClosed } from "../lib/dealEngine.js";

// The Automation Marketplace: the 10 productized services + bundles as a
// transactional catalog, with live "matched to your pipeline" intelligence so
// the operator sees exactly which open deals each service fits and the recurring
// revenue waiting to be closed. Selling happens on a deal (CRM sold-tracking).
export default function MarketplaceView({ audits = [], onPipeline }) {
  // Map serviceId → { deals, monthly } across OPEN deals, by running the same
  // matching engine the roadmap uses. Drives the monetization signal.
  const match = useMemo(() => {
    const m = {};
    const open = audits.filter(a => !isClosed(deriveStage(a)));
    for (const a of open) {
      let rm; try { rm = generateRoadmap(a); } catch { continue; }
      for (const s of rm.solutions || []) {
        (m[s.id] ||= { deals: 0, monthly: 0 });
        m[s.id].deals += 1;
        m[s.id].monthly += s.monthly;
      }
    }
    return m;
  }, [audits]);

  const totalRecurring = Object.values(match).reduce((sum, x) => sum + x.monthly, 0);
  const soldRecurring = useMemo(() => {
    let sum = 0;
    for (const a of audits) {
      const ids = a.crm?.soldAutomations || [];
      for (const id of ids) sum += CATALOG_BY_ID[id]?.monthly || 0;
    }
    return sum;
  }, [audits]);

  return (
    <div className="page-pad" style={{ animation: "fadeUp .4s ease" }}>
      <h1 style={{ fontFamily: "Sora", fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 6 }}>Automation Marketplace</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 18 }}>Productized done-for-you systems. Match them to your pipeline and sell the recurring retainer.</p>

      {/* Monetization signal */}
      <div style={{ display: "flex", gap: 12, marginBottom: 22, flexWrap: "wrap" }}>
        <div style={{ background: "var(--panel)", border: "1px solid rgba(0,214,143,0.3)", borderRadius: 8, padding: "14px 18px" }}>
          <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Recurring opportunity in pipeline</div>
          <div style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 22, color: "var(--green)" }}>{usd(totalRecurring)}/mo</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>across your open deals</div>
        </div>
        <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: "14px 18px" }}>
          <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Recurring already sold</div>
          <div style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 22, color: "var(--amber)" }}>{usd(soldRecurring)}/mo</div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>tracked on closed deals</div>
        </div>
        <div style={{ flex: 1, minWidth: 200, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
          <Btn onClick={onPipeline} variant="primary">Sell on a deal →</Btn>
        </div>
      </div>

      {/* Bundles first — highest-value packages */}
      <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>Bundles</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14, marginBottom: 28 }}>
        {BUNDLES.map(b => (
          <div key={b.id} style={{ background: "var(--panel)", border: "1px solid var(--amber)", borderRadius: 10, padding: "18px 20px" }}>
            <div style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 17, marginBottom: 6 }}>{b.name}</div>
            <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6, marginBottom: 12 }}>{b.blurb}</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {b.members.map(id => CATALOG_BY_ID[id] && <Tag key={id} color="#6b6b85">{CATALOG_BY_ID[id].consumerName}</Tag>)}
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 22, color: "var(--amber)" }}>{usd(b.setup)}</span>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>setup +</span>
              <span style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 22, color: "var(--amber)" }}>{usd(b.monthly)}</span>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>/mo</span>
            </div>
          </div>
        ))}
      </div>

      {/* Individual services */}
      <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12 }}>Services</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))", gap: 14 }}>
        {CATALOG.map(s => {
          const mm = match[s.id];
          return (
            <div key={s.id} style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 10, padding: "18px 20px", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                <div>
                  <Tag color="#4a9eff">{s.category}</Tag>
                  <div style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 16, marginTop: 8 }}>{s.consumerName}</div>
                </div>
                {mm && <span style={{ fontSize: 10, color: "var(--green)", border: "1px solid rgba(0,214,143,0.3)", borderRadius: 20, padding: "3px 9px", whiteSpace: "nowrap" }}>● {mm.deals} deal{mm.deals !== 1 ? "s" : ""}</span>}
              </div>
              <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6, marginBottom: 12, flex: 1 }}>{s.problem}</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                <Tag color="#3a3a50">{s.buildLabel}</Tag>
                <Tag color="#3a3a50">saves ~{s.hoursPerWeek}h/wk</Tag>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                <div>
                  <span style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 18 }}>{usd(s.setupLow)}</span>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}> + {usd(s.monthly)}/mo</span>
                </div>
                {mm && <span style={{ fontSize: 11, color: "var(--green)", fontWeight: 700 }}>{usd(mm.monthly)}/mo in pipeline</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 24, padding: "14px 18px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11, color: "var(--muted)", lineHeight: 1.7 }}>
        Each open deal in your pipeline is automatically matched to the services that fix its audit findings. Open a deal and use the close-time upsell to mark services sold — recurring revenue is then tracked here and on the deal.
      </div>
    </div>
  );
}
