import { useState, useRef, useEffect } from "react";
import { Field, Select } from "./ui/index.jsx";
import { INDUSTRIES, GOALS } from "../lib/constants.js";
import { generateAudit } from "../lib/auditEngine.js";
import { authedFetch } from "../lib/api.js";

const PHASES = [
  "Initialising audit engine…",
  "Analysing your business profile…",
  "Evaluating mobile & digital presence signals…",
  "Identifying lead generation gaps…",
  "Reviewing scheduling & booking setup…",
  "Assessing review & reputation profile…",
  "Mapping follow-up & CRM usage…",
  "Benchmarking against industry competitors…",
  "Scoring automation readiness…",
  "Building automation opportunity model…",
  "Calculating ROI projections…",
  "Compiling your Preset & Profit report…",
];

export default function AuditScanner({ onComplete, onScanStart, onScanEnd }) {
  const [form, setForm] = useState({
    bizName: "", url: "", industry: "Healthcare",
    city: "", goal: "More Leads", tools: "", email: "",
  });
  const [scanning, setScanning] = useState(false);
  const [phase, setPhase]       = useState(0);
  const [log, setLog]           = useState([]);
  const logRef = useRef(null);
  const set = k => v => setForm(f => ({ ...f, [k]: v }));
  const ready = form.bizName.trim(); // URL is optional — not all businesses have a website

  const addLog = msg => setLog(p => [...p, { t: new Date().toLocaleTimeString(), msg }]);

  const runScan = async () => {
    if (!ready) return;
    setScanning(true);
    onScanStart?.();
    setLog([]);

    // Kick off the REAL website scan in parallel with the progress animation,
    // so the analysis happens while the phases play out.
    const trimmedUrl = form.url.trim();
    const scanPromise = trimmedUrl
      ? authedFetch("/api/analyze-site", {
          // Pass the business context so the server can run the AI consultant
          // analysis (classification + site-grounded findings) on the scrape.
          body: { url: trimmedUrl, bizName: form.bizName, industry: form.industry, city: form.city },
        })
          .then(r => r.json()).catch(() => null)
      : Promise.resolve(null);

    for (let i = 0; i < PHASES.length; i++) {
      setPhase(i);
      addLog(PHASES[i]);
      await new Promise(r => setTimeout(r, 480));
    }

    let siteAnalysis;
    try { siteAnalysis = await scanPromise; } catch { siteAnalysis = null; }
    if (trimmedUrl && siteAnalysis?.ok) {
      addLog(`✓ Read your live site: ${siteAnalysis.signals?.finalUrl || trimmedUrl}`);
    } else if (trimmedUrl) {
      addLog(`⚠ Couldn't reach ${trimmedUrl} — falling back to industry benchmarks`);
    }

    const report = generateAudit(form, siteAnalysis);

    // Phases 3 & 4 — Competitor Intelligence + Sales Process Analysis. Fired as
    // SEPARATE, PARALLEL requests (keeps each call under the function timeout)
    // once we have the Business Intelligence Profile. Best-effort: neither blocks
    // or fails the report.
    const profile = siteAnalysis?.profile || report.businessIntelligenceProfile || null;
    if (profile && form.bizName.trim()) {
      addLog("Comparing you against local competitors & analysing your sales process…");
      const post = (body) => authedFetch("/api/analyze-site", { body }).then(res => res.json()).catch(() => null);
      const [comp, sales] = await Promise.all([
        post({ action: "competitor", profile, bizName: form.bizName, city: form.city, url: trimmedUrl || null }),
        post({ action: "sales", profile, signals: siteAnalysis?.signals || null }),
      ]);
      if (comp?.ok && comp.competitor?.available) {
        report.competitorIntelligence = comp.competitor;
        const m = comp.competitor.metrics || {};
        addLog(`✓ Compared against ${comp.competitor.competitors?.length || 0} nearby competitors`);
        if (m.reviewLeader != null && m.yourReviews != null) addLog(`  Reviews — you: ${m.yourReviews} · local leader: ${m.reviewLeader}`);
      }
      if (sales?.ok && sales.sales?.available) {
        report.salesIntelligence = sales.sales;
        const top = sales.sales.topPriority;
        addLog(`✓ Ranked ${sales.sales.bottlenecks?.length || 0} sales bottlenecks by revenue impact`);
        if (top) addLog(`  Top sales priority: ${top.label} (impact ${top.impactScore})`);
      }

      // Phase 7 — Synthesis. The capstone: assemble the 8-section Growth
      // Diagnosis from every stage gathered above. Fired last (needs all inputs).
      addLog("Synthesising your Growth Diagnosis…");
      const syn = await post({
        action: "synthesis",
        profile,
        consultant: report.aiGenerated ? {
          revenueLeaks: report.revenueLeaks, revenueLeakSummary: report.revenueLeakSummary,
          automationPlan: report.automationPlan,
        } : null,
        competitor: report.competitorIntelligence || null,
        sales: report.salesIntelligence || null,
      });
      if (syn?.ok && syn.diagnosis?.available) {
        report.growthDiagnosis = syn.diagnosis;
        addLog("✓ Growth Diagnosis ready");
      }
    }

    setScanning(false);
    onScanEnd?.();
    onComplete(report);
  };

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  const deliverables = [
    { icon: "◎", label: "Where you stand", detail: "3 plain-English scores showing your strengths and where customers are leaking out" },
    { icon: "⚑", label: "What's costing you money", detail: "8+ specific problems found — each one tied to lost customers or wasted time" },
    { icon: "◆", label: "4 ways to fix it", detail: "The highest-impact things to set up first, with estimated extra revenue each one adds" },
    { icon: "▶", label: "A 30-day game plan", detail: "Exact steps for the next 30 days — matched to what you told us your biggest goal is" },
  ];

  return (
    <div className="page-pad" style={{ maxWidth: 760, margin: "0 auto", animation: "fadeUp .4s ease" }}>
      <h1 style={{ fontFamily: "Sora", fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Free Business Report</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>Tell us about the business and we'll show you exactly where customers are slipping through the cracks — and how much it's costing. Takes 30 seconds.</p>

      {/* What you'll receive */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10,
        marginBottom: 24,
      }}>
        {deliverables.map(d => (
          <div key={d.label} style={{
            background: "var(--panel)", border: "1px solid var(--border)",
            borderRadius: 8, padding: "14px 16px",
            display: "flex", gap: 12, alignItems: "flex-start",
          }}>
            <span style={{ fontSize: 16, color: "var(--amber)", flexShrink: 0, marginTop: 1 }}>{d.icon}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "Sora", marginBottom: 2 }}>{d.label}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>{d.detail}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: 28, display: "grid", gap: 16 }}>
        <div className="form-grid-2">
          <Field label="Business Name *" value={form.bizName} onChange={set("bizName")} placeholder="e.g. Riverside Dental Group" disabled={scanning} />
          <Field label="Website URL (optional)" value={form.url} onChange={set("url")} placeholder="e.g. riversidedental.com" disabled={scanning} />
        </div>
        <div className="form-grid-2">
          <Select label="Industry" value={form.industry} onChange={set("industry")} options={INDUSTRIES} disabled={scanning} />
          <Field label="City / Service Area" value={form.city} onChange={set("city")} placeholder="e.g. Austin, TX" disabled={scanning} />
        </div>
        <div className="form-grid-2">
          <Select label="Biggest priority right now" value={form.goal} onChange={set("goal")} options={GOALS} disabled={scanning} />
          <Field label="How do you manage bookings &amp; customers? (optional)" value={form.tools} onChange={set("tools")} placeholder="e.g. phone calls, a booking app, nothing yet" disabled={scanning} />
        </div>
        <Field label="Client Email Address (optional)" type="email" value={form.email} onChange={set("email")} placeholder="owner@business.com" disabled={scanning} />
        <p style={{ fontSize: 11, color: "var(--muted)", marginTop: -4 }}>* Business name is the only required field. All other fields improve the accuracy of your report.</p>
        <button onClick={runScan} disabled={scanning || !ready}
          style={{
            width: "100%", padding: 13, borderRadius: 6, border: "none",
            cursor: (!ready || scanning) ? "not-allowed" : "pointer",
            background: scanning ? "var(--dim)" : ready ? "var(--amber)" : "var(--dim)",
            color: (scanning || !ready) ? "var(--muted)" : "var(--ink)",
            fontFamily: "IBM Plex Mono", fontSize: 13, fontWeight: 600,
            letterSpacing: "0.05em", transition: "all .2s",
          }}>
          {scanning ? "Analysing your business…" : "Show Me My Free Report →"}
        </button>
      </div>

      {scanning && (
        <div style={{ marginTop: 20, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ padding: "11px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--amber)", animation: "pulse-amber 1.5s infinite" }} />
            <span style={{ fontSize: 11, color: "var(--amber)", letterSpacing: "0.1em" }}>BUILDING YOUR REPORT · {PHASES[phase]}</span>
          </div>
          <div ref={logRef} style={{ padding: 16, maxHeight: 200, overflowY: "auto" }}>
            {log.map((l, i) => (
              <div key={i} style={{ fontSize: 11, color: i === log.length - 1 ? "var(--amber)" : "var(--muted)", padding: "3px 0", display: "flex", gap: 12 }}>
                <span style={{ opacity: 0.5 }}>{l.t}</span>
                <span>{i === log.length - 1 ? "▶ " : "✓ "}{l.msg}</span>
              </div>
            ))}
          </div>
          <div style={{ height: 2, background: "var(--surface)" }}>
            <div style={{ height: "100%", background: "var(--amber)", width: `${((phase + 1) / PHASES.length) * 100}%`, transition: "width .5s ease" }} />
          </div>
        </div>
      )}
    </div>
  );
}
