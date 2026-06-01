import { useState } from "react";
import { ScoreRing, Tag } from "./ui/index.jsx";
import GlobalStyles from "./GlobalStyles.jsx";
import { INDUSTRIES } from "../lib/constants.js";

// ─────────────────────────────────────────────────────────────────────────────
// PublicAudit — the public, no-login acquisition funnel (/audit).
//
// Flow: submit website → instant audit teaser (scores + revenue leak + 2 gaps,
// rest locked) → email gate → full report unlocks in-browser + a Deal is created
// in the CRM and a summary email is sent. Every CTA drives to the funnel owner's
// booking link. Value-before-capture, single strong CTA — built to convert.
// All server work routes through /api/send-report (no auth, rate-limited).
// ─────────────────────────────────────────────────────────────────────────────

const post = (payload) =>
  fetch("/api/send-report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => ({})) }));

const ERRORS = {
  "missing-url": "Please enter your website address.",
  "invalid-url": "That doesn't look like a valid website address.",
  "scan-failed": "We couldn't reach that site — double-check the address and try again.",
  "rate-limited": "You've run a few audits already — please try again in a little while.",
  busy: "We're running a lot of audits right now. Please try again shortly.",
  "funnel-not-configured": "Free audits are temporarily unavailable. Please check back soon.",
  "invalid-email": "Please enter a valid email address.",
  "disposable-email": "Please use a business email address.",
  "invalid-or-expired": "This audit expired — please re-run it.",
};
const errMsg = (e) => ERRORS[e] || "Something went wrong. Please try again.";

const findingColor = (s) => (s === "good" ? "var(--green)" : s === "warn" ? "var(--amber)" : "var(--red)");
const findingIcon = (s) => (s === "good" ? "✓" : s === "warn" ? "⚠" : "✗");

function FindingRow({ f }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "12px 0", borderBottom: "1px solid var(--border)" }}>
      <div style={{ width: 24, height: 24, borderRadius: "50%", border: `1px solid ${findingColor(f.status)}`, color: findingColor(f.status), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{findingIcon(f.status)}</div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{f.label}</div>
        <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.55 }}>{f.personalNote || f.proof || f.detail || f.why || ""}</div>
      </div>
    </div>
  );
}

export default function PublicAudit() {
  const [phase, setPhase] = useState("form"); // form | scanning | teaser | submitting | unlocked
  const [form, setForm] = useState({ url: "", industry: "Home Services", bizName: "", website: "" /* honeypot */ });
  const [res, setRes] = useState(null); // { report, ts, sig, bookingUrl, ownerCompany }
  const [email, setEmail] = useState("");
  const [hp, setHp] = useState(""); // honeypot
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const runAudit = async (e) => {
    e?.preventDefault();
    if (!form.url.trim()) { setError(errMsg("missing-url")); return; }
    if (form.website) { return; } // honeypot tripped — silently ignore
    setError(""); setPhase("scanning");
    const { json } = await post({ action: "public_audit", url: form.url.trim(), industry: form.industry, bizName: form.bizName.trim() });
    if (json.ok) { setRes(json); setPhase("teaser"); }
    else { setError(errMsg(json.error)); setPhase("form"); }
  };

  const unlock = async (e) => {
    e?.preventDefault();
    setError(""); setPhase("submitting");
    const { json } = await post({ action: "public_lead", email: email.trim(), hp, report: res.report, ts: res.ts, sig: res.sig });
    if (json.ok) {
      if (json.bookingUrl && !res.bookingUrl) setRes((r) => ({ ...r, bookingUrl: json.bookingUrl }));
      setPhase("unlocked");
    } else { setError(errMsg(json.error)); setPhase("teaser"); }
  };

  const r = res?.report;
  const lockedCount = r ? [...(r.leadFindings || []), ...(r.websiteFindings || [])].filter((f) => f.status !== "good").length : 0;
  const bookCta = (label) => res?.bookingUrl
    ? <a href={res.bookingUrl} target="_blank" rel="noopener noreferrer" style={ctaBtn}>{label}</a>
    : <a href="mailto:hello@presetprofit.com" style={ctaBtn}>{label}</a>;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg, #0a0a0f)" }}>
      <GlobalStyles />
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px 80px" }}>
        {/* Brand */}
        <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 18, marginBottom: 32 }}>
          <span style={{ color: "var(--amber)" }}>PRESET</span><span style={{ color: "var(--text)" }}>&amp;PROFIT</span>
        </div>

        {/* ── FORM ── */}
        {(phase === "form" || phase === "scanning") && (
          <div style={{ animation: "fadeUp .4s ease" }}>
            <div style={{ fontSize: 11, color: "var(--amber)", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 14, fontWeight: 600 }}>Free 30-second business audit</div>
            <h1 style={{ fontFamily: "Syne", fontSize: 34, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.15, marginBottom: 16 }}>
              See exactly where your business is losing customers
            </h1>
            <p style={{ color: "var(--muted)", fontSize: 15, lineHeight: 1.7, maxWidth: 520, marginBottom: 28 }}>
              Enter your website. We'll scan it live and show you the gaps costing you customers every month — and what fixing them is worth. Free, no signup to see your score.
            </p>

            <form onSubmit={runAudit} style={{ display: "grid", gap: 14, maxWidth: 520 }}>
              <input value={form.url} onChange={set("url")} placeholder="yourbusiness.com" disabled={phase === "scanning"} style={inputBig} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <select value={form.industry} onChange={set("industry")} disabled={phase === "scanning"} style={input}>
                  {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
                </select>
                <input value={form.bizName} onChange={set("bizName")} placeholder="Business name (optional)" disabled={phase === "scanning"} style={input} />
              </div>
              {/* Honeypot — hidden from humans, bots fill it */}
              <input value={form.website} onChange={set("website")} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0, width: 0 }} />
              <button type="submit" disabled={phase === "scanning"} style={{ ...ctaBtn, border: "none", cursor: phase === "scanning" ? "default" : "pointer", opacity: phase === "scanning" ? 0.7 : 1 }}>
                {phase === "scanning" ? "Scanning your site…" : "Get My Free Audit →"}
              </button>
              {error && <div style={{ fontSize: 13, color: "var(--red)" }}>{error}</div>}
              <div style={{ fontSize: 12, color: "var(--muted)" }}>✓ Live scan of your real website · ✓ No credit card · ✓ Results in seconds</div>
            </form>

            {/* How it works — credibility for a cold visitor */}
            <div style={{ marginTop: 44, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14 }}>
              {[
                ["1", "We scan your live site", "Not a checklist — we read your actual homepage for the gaps costing you customers."],
                ["2", "See what it's costing you", "Your scores plus an estimate of the revenue slipping away every month."],
                ["3", "Get your fix plan", "The specific systems to recover it — and a call to have it done for you."],
              ].map(([n, h2, b]) => (
                <div key={n} style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 10, padding: "18px 20px" }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--amber-glow)", border: "1px solid var(--amber)", color: "var(--amber)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, marginBottom: 10 }}>{n}</div>
                  <div style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 14, marginBottom: 5 }}>{h2}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>{b}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TEASER + UNLOCKED ── */}
        {(phase === "teaser" || phase === "submitting" || phase === "unlocked") && r && (
          <div style={{ animation: "fadeUp .4s ease" }}>
            <button onClick={() => { setPhase("form"); setRes(null); }} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 12, marginBottom: 12, fontFamily: "IBM Plex Mono" }}>← Run another</button>
            <h1 style={{ fontFamily: "Syne", fontSize: 26, fontWeight: 800, letterSpacing: "-0.01em", marginBottom: 4 }}>{r.businessName}</h1>
            <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
              <Tag color="#6b6b85">{r.industry}</Tag>{r.website && <Tag color="#3a3a50">{r.website}</Tag>}
            </div>

            {/* Scores + revenue */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 18 }}>
              {[["Overall", r.overallScore], ["Getting Customers", r.leadScore], ["Website", r.websiteScore]].map(([l, s]) => (
                <div key={l} style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 10, padding: 18, display: "flex", alignItems: "center", gap: 12 }}>
                  <ScoreRing score={s} size={48} stroke={4.5} />
                  <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{l}</div>
                </div>
              ))}
              <div style={{ background: "rgba(0,214,143,0.06)", border: "1px solid rgba(0,214,143,0.3)", borderRadius: 10, padding: 18 }}>
                <div style={{ fontSize: 10, color: "var(--green)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Revenue you're leaving on the table</div>
                <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 22, color: "var(--green)" }}>{r.revenueOpportunity || r.totalMonthlyOpportunity}</div>
              </div>
            </div>

            {/* Executive line */}
            {r.executiveSummary && (
              <div style={{ background: "var(--panel)", border: "1px solid rgba(245,166,35,0.25)", borderLeft: "3px solid var(--amber)", borderRadius: 8, padding: "14px 18px", marginBottom: 18, fontSize: 13, lineHeight: 1.7 }}>{r.executiveSummary}</div>
            )}

            {/* Findings — 2 shown, rest gated until email */}
            <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 20px 16px", marginBottom: 18 }}>
              <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", padding: "14px 0 4px" }}>What we found</div>
              {[...(r.leadFindings || []), ...(r.websiteFindings || [])].filter((f) => f.status !== "good").slice(0, phase === "unlocked" ? 99 : 2).map((f, i) => <FindingRow key={i} f={f} />)}

              {phase !== "unlocked" && lockedCount > 2 && (
                <div style={{ position: "relative", marginTop: 8 }}>
                  <div style={{ filter: "blur(5px)", opacity: 0.5, pointerEvents: "none", userSelect: "none" }}>
                    {[...(r.leadFindings || []), ...(r.websiteFindings || [])].filter((f) => f.status !== "good").slice(2, 4).map((f, i) => <FindingRow key={i} f={f} />)}
                  </div>
                  <div style={{ textAlign: "center", padding: "16px 0 4px" }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>🔒 {lockedCount - 2} more gaps + your full fix plan</div>
                  </div>
                </div>
              )}
            </div>

            {/* Email gate */}
            {phase !== "unlocked" ? (
              <div style={{ background: "var(--panel)", border: "1px solid var(--amber)", borderRadius: 10, padding: "22px 24px" }}>
                <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 17, marginBottom: 6 }}>Unlock your full audit + fix plan</div>
                <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, marginBottom: 16 }}>See every gap, the recommended fixes, and exactly how to recover that {r.revenueOpportunity || r.totalMonthlyOpportunity}. We'll email you a copy too.</p>
                <form onSubmit={unlock} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder="you@business.com" disabled={phase === "submitting"} style={{ ...input, flex: 1, minWidth: 220 }} />
                  <input value={hp} onChange={(e) => setHp(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0, width: 0 }} />
                  <button type="submit" disabled={phase === "submitting"} style={{ ...ctaBtn, border: "none", cursor: "pointer" }}>{phase === "submitting" ? "Unlocking…" : "Unlock Full Audit →"}</button>
                </form>
                {error && <div style={{ fontSize: 13, color: "var(--red)", marginTop: 10 }}>{error}</div>}
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 10 }}>No spam. Your audit, your results.</div>
              </div>
            ) : (
              <>
                {/* Quick wins + recommendation */}
                {r.quickWins?.length > 0 && (
                  <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 10, padding: "18px 22px", marginBottom: 18 }}>
                    <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>3 things you can do this week</div>
                    {r.quickWins.map((q, i) => (
                      <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 10 }}>
                        <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--amber-glow)", border: "1px solid var(--amber)", color: "var(--amber)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{i + 1}</div>
                        <span style={{ fontSize: 13, lineHeight: 1.6 }}>{q}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Booked-call CTA — the conversion goal */}
                <div style={{ background: "var(--panel)", border: "1px solid var(--amber)", borderRadius: 12, padding: "28px 26px", textAlign: "center" }}>
                  <div style={{ fontFamily: "Syne", fontWeight: 800, fontSize: 20, marginBottom: 8 }}>Want us to fix this for you?</div>
                  <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7, maxWidth: 440, margin: "0 auto 20px" }}>
                    Book a free 15-minute call. We'll walk through your audit and the exact systems to recover {r.revenueOpportunity || r.totalMonthlyOpportunity} — done for you, no tech work on your end.
                  </p>
                  {bookCta("📞 Book My Free Strategy Call")}
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 14 }}>✓ Check your inbox — we emailed your full audit.</div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Footer — trust + legal (required for a public commercial page) */}
        <div style={{ marginTop: 56, paddingTop: 20, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            <span style={{ fontFamily: "Syne", fontWeight: 700, color: "var(--text)" }}>Preset &amp; Profit</span> · Live website audits for local businesses
          </div>
          <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
            <a href="/terms" style={{ color: "var(--muted)", textDecoration: "none" }}>Terms</a>
            <a href="/privacy" style={{ color: "var(--muted)", textDecoration: "none" }}>Privacy</a>
            <a href="/refund" style={{ color: "var(--muted)", textDecoration: "none" }}>Refunds</a>
          </div>
        </div>
        <div style={{ fontSize: 11, color: "var(--dim)", marginTop: 10, lineHeight: 1.6 }}>
          We only use your website to generate your audit and your email to send your results. We never sell your data. Estimates are based on industry benchmarks and your live site — actual results vary.
        </div>
      </div>
    </div>
  );
}

const input = { width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 14px", color: "var(--text)", fontFamily: "IBM Plex Mono", fontSize: 14, outline: "none" };
const inputBig = { ...input, fontSize: 16, padding: "15px 16px" };
const ctaBtn = { display: "inline-block", background: "var(--amber)", color: "var(--ink)", padding: "15px 30px", borderRadius: 8, fontFamily: "IBM Plex Mono", fontSize: 15, fontWeight: 700, letterSpacing: "0.02em", textDecoration: "none", boxShadow: "0 0 32px rgba(245,166,35,0.3)" };
