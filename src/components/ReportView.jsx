import { useState, useMemo } from "react";
import { ScoreRing, Tag, Btn } from "./ui/index.jsx";
import { EFFORT_COLOR } from "../lib/constants.js";
import { downloadReport } from "../lib/exportReport.js";
import { calcROI } from "../lib/roiCalc.js";
import AssumptionsEditor from "./AssumptionsEditor.jsx";

const TABS = ["overview", "findings", "what to fix", "30-day plan"];
const PHASE_COLORS = ["#00d68f", "#f5a623", "#4a9eff"];

// One labelled line inside an evidence finding (Why / Proof / Fix / Impact).
function EvidenceLine({ label, text, mono, accent }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
      <span style={{ flexShrink: 0, width: 108, fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: accent ? "var(--amber)" : "var(--muted)", fontWeight: 700, paddingTop: 2 }}>{label}</span>
      <span style={{ flex: 1, fontSize: 12, lineHeight: 1.55, color: "var(--text)", fontFamily: mono ? "IBM Plex Mono" : "inherit" }}>{text}</span>
    </div>
  );
}

// High-converting call block: what-happens-on-the-call + risk reversal + one
// dominant action. Borderless so it drops cleanly into existing panels.
function BookCallBlock({ monthly }) {
  const steps = [
    ["1", "We confirm your real numbers", "We plug in your actual job value and volume — no guessing."],
    ["2", "We show what fits you", "Exactly which systems move the needle for a business like yours."],
    ["3", "You get exact pricing", "Clear fixed pricing. No obligation, no hard sell."],
  ];
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 14 }}>
        {steps.map(([n, t, d]) => (
          <div key={n} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--amber-glow)", border: "1px solid var(--amber)", color: "var(--amber)", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{n}</div>
              <div style={{ fontSize: 12, fontWeight: 700, fontFamily: "Syne" }}>{t}</div>
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.5 }}>{d}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", background: "rgba(0,214,143,0.08)", border: "1px solid rgba(0,214,143,0.25)", borderRadius: 6, padding: "9px 14px", marginBottom: 16 }}>
        <span style={{ fontSize: 14, flexShrink: 0 }}>🛡</span>
        <span style={{ fontSize: 12, color: "var(--text)", fontWeight: 600 }}>30-day results guarantee — if a system we set up isn't working, we fix it free.</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
        <a href="https://presetandprofit.com/call" target="_blank" rel="noopener noreferrer"
          style={{ background: "var(--amber)", color: "var(--ink)", padding: "13px 28px", borderRadius: 6, fontFamily: "IBM Plex Mono", fontSize: 14, fontWeight: 700, letterSpacing: "0.03em", textDecoration: "none", display: "inline-block", boxShadow: "0 0 24px rgba(245,166,35,0.25)" }}>
          📞 Book My Free Strategy Call →
        </a>
        <div style={{ fontSize: 11, color: "var(--muted)" }}>
          Free · 30 minutes · No obligation{monthly ? ` · Built to capture that ${monthly}` : ""}
        </div>
      </div>
    </div>
  );
}

const findingIcon  = s => s === "good" ? "✓" : s === "warn" ? "⚠" : "✗";
const findingColor = s => s === "good" ? "var(--green)" : s === "warn" ? "var(--amber)" : "var(--red)";
const findingBorder = s => s === "good" ? "rgba(0,214,143,0.2)" : s === "warn" ? "rgba(245,166,35,0.2)" : "rgba(255,71,87,0.2)";

// branding: { name, logoUrl, color } | null  (Agency white-label)
// shared:   true when rendered on a public /r/:token page (read-only, no agency CTAs)
// watermark: true for the free tier (stamps the PDF + shows a banner)
// onShare:  async () => url   (Agency share-link generator)
export default function ReportView({ report: r, onBack, onSave, isAlreadySaved, branding = null, shared = false, watermark = false, onShare = null }) {
  const [tab, setTab]     = useState("overview");
  const [saved, setSaved] = useState(!!isAlreadySaved);
  const [sent, setSent]   = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [sharing, setSharing]   = useState(false);

  // ── Live assumptions state — starts from benchmark, user can adjust ───────
  const [adj, setAdj] = useState({
    avgJobValue:    r.assumptions?.avgJobValue    ?? 150,
    monthlyJobs:    r.assumptions?.monthlyJobs    ?? 20,
    missedCallRate: r.assumptions?.missedCallRate ?? 25,   // integer %
    noShowRate:     r.assumptions?.noShowRate     ?? 15,   // integer %
    leadCloseRate:  r.assumptions?.leadCloseRate  ?? 13,   // integer %
  });
  const benchmarkAdj = {
    avgJobValue:    r.assumptions?.avgJobValue    ?? 150,
    monthlyJobs:    r.assumptions?.monthlyJobs    ?? 20,
    missedCallRate: r.assumptions?.missedCallRate ?? 25,
    noShowRate:     r.assumptions?.noShowRate     ?? 15,
    leadCloseRate:  r.assumptions?.leadCloseRate  ?? 13,
  };

  const updateAdj = (key, val) => setAdj(prev => ({ ...prev, [key]: val }));
  const resetAdj  = () => setAdj({ ...benchmarkAdj });

  // ── Live recalculation — identical math to the engine ────────────────────
  const liveAutomations = useMemo(() => {
    return (r.automations || []).map(a => {
      const bd = calcROI(a.name, {
        avgJobValue:    adj.avgJobValue,
        monthlyJobs:   adj.monthlyJobs,
        missedCallRate: adj.missedCallRate / 100,
        noShowRate:     adj.noShowRate     / 100,
        leadCloseRate:  adj.leadCloseRate  / 100,
        industry:       r.industry,
        bizName:        r.businessName,
      });
      return {
        ...a,
        roi: `$${bd.roiAmt.toLocaleString()}/mo`,
        roiAmt: bd.roiAmt,
        roiBreakdown: bd,
      };
    });
  }, [adj, r.automations, r.industry, r.businessName]);

  const liveTotalRev     = liveAutomations.reduce((s, a) => s + a.roiAmt, 0);
  const liveTotalMonthly = `$${liveTotalRev.toLocaleString()}/month`;
  const liveAnnual       = `$${(liveTotalRev * 12).toLocaleString()}/yr`;
  const benchmarkTotal   = r.totalRev || (r.automations || []).reduce((s, a) => s + (a.roiAmt || 0), 0);

  if (!r) return null;

  const handleSave = () => { onSave(r); setSaved(true); };

  const sendToClient = () => {
    downloadReport(r, { branding, watermark });
    setSent(true);
  };

  const handleShare = async () => {
    if (!onShare) return;
    setSharing(true);
    try {
      const url = await onShare(r);
      if (url) {
        setShareUrl(url);
        try { await navigator.clipboard.writeText(url); } catch { /* clipboard may be blocked */ }
      }
    } finally {
      setSharing(false);
    }
  };

  // Total hours saved (for sticky bar)
  const totalHours = (r.automations || []).reduce((sum, a) => {
    const n = parseInt((a.timesSaved || "").replace(/\D/g, "")) || 0;
    return sum + n;
  }, 0);

  return (
    <>
    <div className="page-pad" style={{ animation: "fadeUp .4s ease", paddingBottom: 100 }}>
      {/* White-label brand bar (Agency) */}
      {branding && (branding.name || branding.logoUrl) && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0 16px", marginBottom: 14, borderBottom: `2px solid ${branding.color || "var(--amber)"}` }}>
          {branding.logoUrl
            ? <img src={branding.logoUrl} alt={branding.name || "logo"} style={{ height: 30, maxWidth: 160, objectFit: "contain" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
            : <div style={{ width: 28, height: 28, borderRadius: 6, background: branding.color || "var(--amber)" }} />}
          {branding.name && <span style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 16, color: "var(--text)" }}>{branding.name}</span>}
        </div>
      )}

      {/* Free-tier watermark banner */}
      {watermark && !shared && (
        <div style={{ background: "rgba(245,166,35,0.1)", border: "1px dashed var(--amber)", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "var(--amber)" }}>
          Free preview — the exported PDF is watermarked. Upgrade to Professional for clean, un-watermarked reports.
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 22 }}>
        <div>
          {!shared && <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 12, marginBottom: 8, fontFamily: "IBM Plex Mono" }}>← Back to Dashboard</button>}
          <h1 style={{ fontFamily: "Syne", fontSize: 22, fontWeight: 800, letterSpacing: "-0.01em" }}>{r.businessName}</h1>
          <div style={{ fontSize: 11, color: "var(--amber)", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 4 }}>
            Automation Opportunity Report{r.createdAt ? ` · Prepared ${new Date(r.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}` : ""}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
            {r.website && r.website !== "their website" && (
              <span style={{ fontSize: 12, color: "var(--muted)" }}>{r.website}</span>
            )}
            <Tag color="#6b6b85">{r.industry}</Tag>
            {r.city && <Tag color="#3a3a50">{r.city}</Tag>}
            {r.goal && <Tag color="var(--amber)">{r.goal}</Tag>}
          </div>
        </div>
        {!shared && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Btn onClick={handleSave} variant={saved ? "success" : "ghost"}>{saved ? "✓ Saved" : "Save Report"}</Btn>
            {onShare && <Btn onClick={handleShare} variant="ghost" disabled={sharing}>{sharing ? "Creating…" : shareUrl ? "✓ Link copied" : "🔗 Share link"}</Btn>}
            <Btn onClick={sendToClient} variant={sent ? "success" : "primary"}>{sent ? "✓ PDF Ready" : "↓ Download PDF Report"}</Btn>
          </div>
        )}
      </div>

      {/* Share URL surface (Agency) */}
      {shareUrl && !shared && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "var(--green)" }}>Public link (copied):</span>
          <a href={shareUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--amber)", fontFamily: "IBM Plex Mono", wordBreak: "break-all" }}>{shareUrl}</a>
        </div>
      )}

      {/* Score row */}
      <div className="stats-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        {[
          { score: r.overallScore, label: "Overall Score",      sub: r.scoreLabels?.overall || "Overall performance" },
          { score: r.leadScore,    label: "Getting Customers",  sub: r.scoreLabels?.lead    || "Lead generation" },
          { score: r.websiteScore, label: "Your Website",       sub: r.scoreLabels?.website || "Website quality" },
        ].map(({ score, label, sub }) => (
          <div key={label} style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: 18, display: "flex", alignItems: "center", gap: 14 }}>
            <ScoreRing score={score} size={56} stroke={5} />
            <div>
              <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4, lineHeight: 1.5 }}>{sub}</div>
            </div>
          </div>
        ))}
        <div style={{ background: "var(--panel)", border: "1px solid rgba(0,214,143,0.3)", borderRadius: 8, padding: 18 }}>
          <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
            Revenue You're Leaving on the Table
          </div>
          <div style={{ fontSize: 22, fontFamily: "Syne", fontWeight: 800, color: "var(--green)" }}>{liveTotalMonthly}</div>
          <div style={{ fontSize: 11, color: "var(--green)", marginTop: 2, fontWeight: 600 }}>≈ {liveAnnual} every year</div>
          <button onClick={() => setTab("what to fix")} style={{ background: "none", border: "none", padding: 0, marginTop: 6, textAlign: "left", cursor: "pointer", fontSize: 10, color: "var(--muted)", lineHeight: 1.5 }}>
            {r.estimateBasis || `Estimated from ~${r.assumptions?.monthlyJobs} jobs/mo`}.{" "}
            <span style={{ color: "var(--amber)", textDecoration: "underline" }}>Not your numbers? Adjust →</span>
          </button>
        </div>
      </div>

      {/* ── Real-scan evidence banner — proof we actually read the live site ── */}
      {r.siteScanned && r.siteSignals && (
        <div style={{ background: "var(--panel)", border: "1px solid rgba(0,214,143,0.3)", borderLeft: "3px solid var(--green)", borderRadius: 8, padding: "14px 18px", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            <span style={{ color: "var(--green)", fontSize: 14 }}>✓</span>
            <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "Syne" }}>We scanned your live website</span>
            <span style={{ fontSize: 11, color: "var(--muted)" }}>{r.siteSignals.finalUrl}{r.scannedAt ? ` · ${new Date(r.scannedAt).toLocaleDateString()}` : ""}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[
              ["Secure (HTTPS)", r.siteSignals.secure],
              ["Mobile-ready", r.siteSignals.hasViewport],
              [`Phone${r.siteSignals.phoneClickable ? " (tap-to-call)" : r.siteSignals.phone ? " (text only)" : ""}`, !!r.siteSignals.phone],
              [`Online booking${r.siteSignals.booking ? `: ${r.siteSignals.booking}` : ""}`, !!r.siteSignals.booking],
              [r.siteSignals.rating ? `Reviews: ${r.siteSignals.rating}★${r.siteSignals.reviewCount ? ` (${r.siteSignals.reviewCount})` : ""}` : "Reviews on site", !!(r.siteSignals.rating || r.siteSignals.reviewWidget)],
              [`Live chat${r.siteSignals.chat ? `: ${r.siteSignals.chat}` : ""}`, !!r.siteSignals.chat],
            ].map(([label, ok], i) => (
              <span key={i} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 20, border: `1px solid ${ok ? "rgba(0,214,143,0.3)" : "rgba(255,71,87,0.3)"}`, color: ok ? "var(--green)" : "var(--red)", background: ok ? "rgba(0,214,143,0.08)" : "rgba(255,71,87,0.06)" }}>
                {ok ? "✓" : "✗"} {label}
              </span>
            ))}
          </div>
          {r.siteSignals.services?.length > 0 && (
            <div style={{ marginTop: 10, fontSize: 11, color: "var(--muted)" }}>
              On-page sections we detected: <span style={{ color: "var(--text)" }}>{r.siteSignals.services.slice(0, 6).join(" · ")}</span>
            </div>
          )}
        </div>
      )}
      {!r.siteScanned && r.scanError && r.website && r.website !== "their website" && (
        <div style={{ background: "var(--panel)", border: "1px solid rgba(245,166,35,0.3)", borderLeft: "3px solid var(--amber)", borderRadius: 8, padding: "12px 18px", marginBottom: 14, fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
          ⚠ We tried to scan <strong style={{ color: "var(--text)" }}>{r.website}</strong> but couldn't reach it ({r.scanError}). The findings below are based on common {r.industry} issues — not a scan of your live site.
        </div>
      )}

      {/* Executive summary */}
      <div style={{ background: "var(--panel)", border: "1px solid rgba(245,166,35,0.25)", borderLeft: "3px solid var(--amber)", borderRadius: 8, padding: "16px 20px", marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: "var(--amber)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
          What This Means for {r.businessName}
        </div>
        <p style={{ fontSize: 13, lineHeight: 1.75 }}>{r.executiveSummary}</p>
        {r.siteScanned && r.siteSignals?.services?.length > 0 && (
          <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.7, marginTop: 10 }}>
            On your site we saw you offer <span style={{ color: "var(--text)", fontWeight: 600 }}>{r.siteSignals.services.slice(0, 4).join(", ")}</span> — the fixes below focus on turning the people already searching for those into booked customers.
          </p>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, marginBottom: 18, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: 4, width: "fit-content", flexWrap: "wrap" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "7px 14px", borderRadius: 6, border: "none", cursor: "pointer",
            fontFamily: "IBM Plex Mono", fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase",
            background: tab === t ? "var(--amber)" : "transparent",
            color: tab === t ? "var(--ink)" : "var(--muted)",
            fontWeight: tab === t ? 600 : 400, transition: "all .15s", whiteSpace: "nowrap",
          }}>{t}</button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ background: "var(--panel)", border: "1px solid rgba(245,166,35,0.4)", borderRadius: 10, padding: "22px 24px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, right: 0, width: 200, height: 200, background: "radial-gradient(circle at top right,rgba(245,166,35,0.06),transparent 70%)", pointerEvents: "none" }} />
            <div style={{ fontSize: 10, color: "var(--amber)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>◈ What We Recommend for {r.businessName}</div>
            <div style={{ fontFamily: "Syne", fontSize: 20, fontWeight: 800, marginBottom: 8 }}>{r.recommendation?.name}</div>
            <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.7, marginBottom: 12 }}>{r.recommendation?.description}</p>
            {r.recommendation?.benefit && (
              <div style={{ background: "rgba(0,214,143,0.08)", border: "1px solid rgba(0,214,143,0.25)", borderRadius: 6, padding: "10px 14px", marginBottom: 16, display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ color: "var(--green)", fontSize: 14, flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: 13, color: "var(--text)", fontWeight: 600 }}>{r.recommendation.benefit}</span>
              </div>
            )}

            {/* Cost vs return — the math visible on one screen */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              {!shared && (
                <div style={{ flex: 1, minWidth: 190, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 16px" }}>
                  <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Starting from</div>
                  <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 24, color: "var(--text)" }}>{r.recommendation?.price}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>one-time setup · no ongoing contract</div>
                </div>
              )}
              {!shared && <div style={{ display: "flex", alignItems: "center", fontSize: 20, color: "var(--amber)", fontWeight: 700 }}>→</div>}
              <div style={{ flex: 1, minWidth: 190, background: "rgba(0,214,143,0.06)", border: "1px solid rgba(0,214,143,0.25)", borderRadius: 8, padding: "12px 16px" }}>
                <div style={{ fontSize: 10, color: "var(--green)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Extra revenue</div>
                <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 24, color: "var(--green)" }}>{liveTotalMonthly}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>≈ {liveAnnual} · every month you wait is another {liveTotalMonthly} gone</div>
              </div>
            </div>

            {!shared && <BookCallBlock monthly={liveTotalMonthly} />}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: 20 }}>
              <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>3 Things {r.businessName} Can Do This Week</div>
              <div style={{ display: "grid", gap: 12 }}>
                {(r.quickWins || []).map((q, i) => (
                  <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--amber-glow)", border: "1px solid var(--amber)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "var(--amber)", flexShrink: 0 }}>{i + 1}</div>
                    <span style={{ fontSize: 12, lineHeight: 1.6, paddingTop: 2 }}>{q}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: 20 }}>
              <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 14 }}>How {r.businessName} Compares{r.city ? ` in ${r.city}` : ""}</div>
              <p style={{ fontSize: 13, lineHeight: 1.75 }}>{r.competitorGap}</p>
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Estimated Tech Stack</div>
                {(r.techStack || []).map(t => (
                  <div key={t} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--blue)", flexShrink: 0 }} />
                    <span style={{ fontSize: 12 }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Findings */}
      {tab === "findings" && (
        <div style={{ display: "grid", gap: 20 }}>
          {[
            { title: `How New Customers Find ${r.businessName}`, findings: r.leadFindings, score: r.leadScore },
            { title: `${r.siteRef || r.businessName + "'s Website"}`, findings: r.websiteFindings, score: r.websiteScore },
          ].map(({ title, findings, score }) => (
            <div key={title} style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 14 }}>{title}</div>
                <ScoreRing score={score} size={40} stroke={4} />
              </div>
              <div style={{ padding: "0 20px" }}>
                {(findings || []).map((f, i) => (
                  <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 0", borderBottom: i < findings.length - 1 ? "1px solid var(--border)" : "none" }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: findingBorder(f.status), border: `1px solid ${findingColor(f.status)}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: findingColor(f.status), flexShrink: 0, marginTop: 1 }}>
                      {findingIcon(f.status)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{f.label}</div>
                      {f.proof ? (
                        /* Evidence finding — observed from the live site scan */
                        <div style={{ display: "grid", gap: 6, marginTop: 4 }}>
                          {f.why && <EvidenceLine label="Why it matters" text={f.why} />}
                          {f.proof && <EvidenceLine label="Proof" text={f.proof} mono accent />}
                          {f.fix && <EvidenceLine label="Recommended fix" text={f.fix} />}
                          {f.impact && <EvidenceLine label="Expected impact" text={f.impact} />}
                        </div>
                      ) : f.personalNote ? (
                        <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.6, marginBottom: 4 }}>{f.personalNote}</div>
                      ) : (
                        <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.6 }}>{f.detail}</div>
                      )}
                    </div>
                    <Tag color={findingColor(f.status)}>{f.status === "good" ? "Pass" : f.status === "warn" ? "Review" : "Action"}</Tag>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* What to fix */}
      {tab === "what to fix" && (
        <div style={{ display: "grid", gap: 16 }}>

          {/* ── Interactive assumptions editor ── */}
          <AssumptionsEditor
            assumptions={adj}
            benchmarks={benchmarkAdj}
            bizName={r.businessName}
            liveTotal={liveTotalRev}
            benchmarkTotal={benchmarkTotal}
            onChange={updateAdj}
            onReset={resetAdj}
          />

          {/* Total bar — live updating */}
          <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 6, padding: "11px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              Combined extra revenue {r.businessName} could add each month with these {liveAutomations.length} systems
            </span>
            <span style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 20, color: "var(--green)", transition: "color .15s" }}>{liveTotalMonthly}</span>
          </div>

          {/* Individual system cards — live updating */}
          {liveAutomations.map((a, i) => (
            <div key={i} style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>

              {/* Card header: name + ROI */}
              <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600 }}>#{a.priority} Priority</span>
                    <Tag color="#4a9eff">{a.category}</Tag>
                    <Tag color={EFFORT_COLOR[a.effort]}>{a.effort === "low" ? "Quick to set up" : a.effort === "medium" ? "Setup in 1–2 weeks" : "Full build"}</Tag>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "Syne", marginBottom: 6 }}>{a.name}</div>
                  {/* Personalized intro — specific to this business */}
                  {a.personalIntro && (
                    <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.65, marginBottom: 6, fontStyle: "italic", borderLeft: "2px solid var(--amber)", paddingLeft: 10 }}>{a.personalIntro}</div>
                  )}
                  <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>{a.description}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginBottom: 2, letterSpacing: "0.06em" }}>EXTRA / MONTH</div>
                  <div style={{ fontSize: 26, fontFamily: "Syne", fontWeight: 800, color: "var(--green)" }}>{a.roi}</div>
                </div>
              </div>

              {/* How we calculated this number */}
              {a.roiBreakdown && (
                <div style={{ borderTop: "1px solid var(--border)", background: "var(--surface)", padding: "14px 20px" }}>
                  <div style={{ fontSize: 10, color: "var(--amber)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                    How we got to {a.roi} — check our working
                  </div>
                  <div style={{ display: "grid", gap: 6 }}>
                    {a.roiBreakdown.steps.map((step, si) => (
                      <div key={si} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <div style={{
                          width: 18, height: 18, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                          background: si === a.roiBreakdown.steps.length - 1 ? "rgba(0,214,143,0.15)" : "var(--panel)",
                          border: `1px solid ${si === a.roiBreakdown.steps.length - 1 ? "var(--green)" : "var(--border)"}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 9, fontWeight: 700,
                          color: si === a.roiBreakdown.steps.length - 1 ? "var(--green)" : "var(--muted)",
                        }}>
                          {si === a.roiBreakdown.steps.length - 1 ? "=" : si + 1}
                        </div>
                        <span style={{
                          fontSize: 12, lineHeight: 1.6,
                          color: si === a.roiBreakdown.steps.length - 1 ? "var(--text)" : "var(--muted)",
                          fontWeight: si === a.roiBreakdown.steps.length - 1 ? 600 : 400,
                        }}>{step}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--dim)", marginTop: 10 }}>
                    Source: {a.roiBreakdown.source}
                  </div>
                </div>
              )}

              {/* Profit angle */}
              <div style={{ borderTop: "1px solid var(--border)", padding: "10px 20px", display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ fontSize: 13, flexShrink: 0 }}>💡</span>
                <span style={{ fontSize: 12, color: "var(--green)", lineHeight: 1.6 }}>{a.profitAngle}</span>
              </div>
            </div>
          ))}

          {/* Honest disclaimer under the numbers */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "14px 18px" }}>
            <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.7 }}>
              <strong style={{ color: "var(--text)" }}>A note on these estimates:</strong> Every number above is calculated from published industry benchmarks — not guessed. We've shown you the exact logic so you can decide whether the assumptions apply to your business. If your job value or volume is different from the estimate, the actual number will be different too. We always confirm real numbers with you on the strategy call before recommending anything.
            </div>
          </div>

        </div>
      )}

      {/* 30-day plan */}
      {tab === "30-day plan" && r.thirtyDayPlan && (
        <div style={{ display: "grid", gap: 14 }}>
          {[r.thirtyDayPlan.phase1, r.thirtyDayPlan.phase2, r.thirtyDayPlan.phase3].map((phase, idx) => (
            <div key={idx} style={{ background: "var(--panel)", border: `1px solid ${PHASE_COLORS[idx]}30`, borderLeft: `3px solid ${PHASE_COLORS[idx]}`, borderRadius: 8, padding: "20px 24px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: PHASE_COLORS[idx], fontFamily: "Syne", marginBottom: 14 }}>Phase {idx + 1}: {phase.title}</div>
              <div style={{ display: "grid", gap: 10 }}>
                {phase.actions.map((action, ai) => (
                  <div key={ai} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: `${PHASE_COLORS[idx]}20`, border: `1px solid ${PHASE_COLORS[idx]}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: PHASE_COLORS[idx], flexShrink: 0, marginTop: 2 }}>{ai + 1}</div>
                    <span style={{ fontSize: 13, lineHeight: 1.6 }}>{action}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!shared && <div style={{ background: "var(--panel)", border: "1px solid rgba(245,166,35,0.4)", borderRadius: 10, padding: "28px 24px", textAlign: "center" }}>
            <div style={{ fontFamily: "Syne", fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Want us to set this up for {r.businessName}?</div>
            <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.7, maxWidth: 480, margin: "0 auto 8px" }}>We handle the full setup — usually done within 7 days. You don't need any tech skills or extra staff.</p>
            <p style={{ color: "var(--muted)", fontSize: 13, lineHeight: 1.7, maxWidth: 480, margin: "0 auto 20px" }}>On the call we'll walk through exactly which systems make sense for your business and give you a clear price — no surprises.</p>
            <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "left" }}>
              <BookCallBlock monthly={liveTotalMonthly} />
            </div>
            <button onClick={sendToClient} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 11, marginTop: 14, textDecoration: "underline" }}>
              {sent ? "✓ Report downloaded" : "Prefer to read it later? Download the report →"}
            </button>
          </div>}
        </div>
      )}
      {/* Footnote disclaimer — quiet, at bottom */}
      <div style={{ marginTop: 32, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
        <p style={{ fontSize: 10, color: "var(--dim)", lineHeight: 1.6 }}>{r.disclaimer}</p>
      </div>
    </div>

    {/* ── Sticky bottom CTA bar — visible on every tab (owner view only) ── */}
    {!shared && <div style={{
      position: "sticky", bottom: 0, zIndex: 15,
      background: "linear-gradient(135deg, #111118 0%, #16161f 100%)",
      borderTop: "1px solid rgba(245,166,35,0.35)",
      boxShadow: "0 -8px 32px rgba(0,0,0,0.5)",
      padding: "14px 40px",
      display: "flex", justifyContent: "space-between", alignItems: "center",
      gap: 16, flexWrap: "wrap",
    }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 15, color: "var(--text)", marginBottom: 2 }}>
          {r.businessName} is leaving ~{liveAnnual} on the table
        </div>
        <div style={{ fontSize: 11, color: "var(--muted)" }}>
          That's {liveTotalMonthly} every month you wait{totalHours > 0 ? ` · saves ${totalHours} hrs/week` : ""} · we build and manage everything
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, flexShrink: 0 }}>
        <a
          href="https://presetandprofit.com/call"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: "var(--amber)", color: "var(--ink)",
            padding: "12px 28px", borderRadius: 6,
            fontFamily: "IBM Plex Mono", fontSize: 13, fontWeight: 700,
            letterSpacing: "0.04em", textDecoration: "none",
            display: "inline-block", whiteSpace: "nowrap",
            boxShadow: "0 0 20px rgba(245,166,35,0.3)",
          }}
        >
          📞 Book My Free Strategy Call →
        </a>
        <div style={{ fontSize: 10, color: "var(--muted)" }}>
          Free · No obligation · Exact pricing on the call
        </div>
      </div>
    </div>}
    </>
  );
}
