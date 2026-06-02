import { useMemo } from "react";
import { Btn, Tag } from "./ui/index.jsx";
import { generateRoadmap, usd } from "../lib/roadmapEngine.js";
import { appendActivity } from "../lib/pipeline.js";

// The monetization close: at (or near) Closed-Won, surface the automation
// package matched to THIS deal's audit and let the operator mark services sold
// (and, when wired, check out). Reuses the roadmap engine's matching + bundle.
export default function DealUpsell({ deal, updateDeal, won = false }) {
  const rm = useMemo(() => { try { return generateRoadmap(deal); } catch { return null; } }, [deal]);
  if (!rm || !rm.solutions?.length) return null;

  const crm = deal.crm || {};
  const sold = new Set(crm.soldAutomations || []);
  const offer = rm.bundle
    ? { name: rm.bundle.name, setup: rm.bundle.setup, monthly: rm.bundle.monthly, ids: rm.bundle.present }
    : { name: rm.solutions[0].consumerName, setup: rm.solutions[0].setup, monthly: rm.solutions[0].monthly, ids: [rm.solutions[0].id] };

  const monthlyRecurring = rm.solutions.filter(s => sold.has(s.id)).reduce((sum, s) => sum + s.monthly, 0);

  const toggleSold = id => {
    const next = new Set(sold);
    next.has(id) ? next.delete(id) : next.add(id);
    const ids = [...next];
    const svc = rm.solutions.find(s => s.id === id);
    updateDeal(deal.id, {
      crm: appendActivity({ ...crm, soldAutomations: ids }, "sold", `${next.has(id) ? "Sold" : "Removed"}: ${svc?.consumerName || id}`),
    });
  };

  return (
    <div style={{ background: won ? "rgba(0,214,143,0.06)" : "var(--surface)", border: `1px solid ${won ? "rgba(0,214,143,0.3)" : "var(--border)"}`, borderRadius: 8, padding: "14px 16px" }}>
      <div style={{ fontSize: 10, color: won ? "var(--green)" : "var(--amber)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
        {won ? "💰 Sell the Automation" : "Recommended Package"}
      </div>
      <div style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 15, marginBottom: 4 }}>{offer.name}</div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>{usd(offer.setup)} setup + {usd(offer.monthly)}/mo</div>

      <div style={{ display: "grid", gap: 6, marginBottom: 10 }}>
        {rm.solutions.map(s => (
          <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 12 }}>
            <input type="checkbox" checked={sold.has(s.id)} onChange={() => toggleSold(s.id)} />
            <span style={{ flex: 1, textDecoration: sold.has(s.id) ? "none" : "none", color: sold.has(s.id) ? "var(--green)" : "var(--text)" }}>{s.consumerName}</span>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>{usd(s.monthly)}/mo</span>
          </label>
        ))}
      </div>

      {monthlyRecurring > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 8 }}>
          <span style={{ fontSize: 11, color: "var(--muted)" }}>Recurring sold</span>
          <Tag color="var(--green)">{usd(monthlyRecurring)}/mo</Tag>
        </div>
      )}
      {won && monthlyRecurring === 0 && (
        <Btn small variant="primary" full onClick={() => toggleSold(offer.ids[0])}>Mark {offer.name} sold</Btn>
      )}
    </div>
  );
}
