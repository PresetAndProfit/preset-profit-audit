// ─────────────────────────────────────────────────────────────────────────────
// Sales-Ready Automation Roadmap & Proposal — PDF export
// Outputs a standalone HTML file that prints to a closing-quality consulting
// proposal (browser → Print → Save as PDF). Deliberately mirrors the visual
// language of exportReport.js (gold/black, A4 pages) so the audit and the
// proposal feel like one premium product. White-label + watermark aware.
//
// Input is the object returned by roadmapEngine.generateRoadmap(report).
// ─────────────────────────────────────────────────────────────────────────────

const GOLD   = "#f5a623";
const GOLD2  = "#b8760a";
const BLACK  = "#0a0a0f";
const INK    = "#1a1a1a";
const SUBTLE = "#fafaf8";
const BORDER = "#e8e4dc";
const MUTED  = "#6b6b6b";
const GREEN  = "#1a7a4a";
const RED    = "#c0392b";

const usd = n => `$${Math.round(Number(n) || 0).toLocaleString()}`;

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const DATE_STR = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
const VALID_STR = (() => {
  const d = new Date(); d.setDate(d.getDate() + 30);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
})();

const phaseColor = i => [GREEN, GOLD, "#2563eb"][i] || GOLD2;

// ── COVER ────────────────────────────────────────────────────────────────────
function coverPage(rm, brand) {
  const mark = brand.whiteLabel
    ? (brand.logoUrl
        ? `<img src="${esc(brand.logoUrl)}" alt="${esc(brand.name)}" style="height:34px;max-width:220px;object-fit:contain"/>`
        : `<div class="brand-mark"><span class="brand-a">${esc(brand.name)}</span></div>`)
    : `<div class="brand-mark"><span class="brand-p">PRESET</span><span class="brand-amp">&amp;</span><span class="brand-a">PROFIT</span></div>`;
  const b = rm.business;
  return `
  <div class="page cover">
    <div class="cover-top">
      ${mark}
      <div class="cover-eyebrow">AI AUTOMATION ROADMAP &amp; PROPOSAL</div>
    </div>
    <div class="cover-main">
      <div class="cover-rule"></div>
      <h1 class="cover-biz">${esc(b.name)}</h1>
      <div class="cover-sub">
        ${b.industry ? `<span>${esc(b.industry)}</span>` : ""}
        ${b.city ? `<span class="cover-dot">·</span><span>${esc(b.city)}</span>` : ""}
        ${b.goal ? `<span class="cover-dot">·</span><span>Goal: ${esc(b.goal)}</span>` : ""}
      </div>
      <div class="cover-headline">
        A sequenced plan to recover <span class="hl">${esc(usd(rm.totals.monthlyImpact))}/month</span>
        in leaking revenue — and the systems that do it on autopilot.
      </div>
    </div>
    <div class="cover-bottom">
      <div class="cover-meta">
        <div class="cover-meta-row"><span class="cover-meta-label">Prepared for</span><span>${esc(b.name)}</span></div>
        <div class="cover-meta-row"><span class="cover-meta-label">Date</span><span>${DATE_STR}</span></div>
        <div class="cover-meta-row"><span class="cover-meta-label">Valid until</span><span>${VALID_STR}</span></div>
        <div class="cover-meta-row"><span class="cover-meta-label">Systems proposed</span><span>${rm.solutions.length}</span></div>
      </div>
      <div class="cover-prepared">
        <div class="cover-prepared-by">Prepared by</div>
        <div class="cover-prepared-name">${esc(brand.name)}</div>
        ${brand.url ? `<div class="cover-prepared-url">${esc(brand.url)}</div>` : ""}
      </div>
    </div>
    <div class="cover-confidential">CONFIDENTIAL PROPOSAL · FOR ${esc((b.name || "").toUpperCase())} ONLY</div>
  </div>`;
}

// ── OPPORTUNITY + ECONOMICS ──────────────────────────────────────────────────
function opportunityPage(rm, brand) {
  const t = rm.totals;
  const stat = (label, value, sub, accent) => `
    <div class="stat-card${accent ? " stat-accent" : ""}">
      <div class="stat-label">${esc(label)}</div>
      <div class="stat-value">${esc(value)}</div>
      ${sub ? `<div class="stat-sub">${esc(sub)}</div>` : ""}
    </div>`;
  return `
  <div class="page interior">
    <div class="page-spine"></div>
    <div class="page-content">
      <div class="section-eyebrow">01 — THE OPPORTUNITY</div>
      <h2 class="section-heading">What's at stake for ${esc(rm.business.name)}</h2>
      <div class="exec-box"><p class="exec-text">${esc(rm.proposal.opportunityStatement)}</p></div>

      <div class="stat-grid">
        ${stat("Recoverable / month", usd(t.monthlyImpact), "across all proposed systems", true)}
        ${stat("Recoverable / year", usd(t.annualImpact), "across all proposed systems", true)}
        ${stat("First-year return", `${t.roiMultiple}×`, "revenue vs. total investment")}
        ${stat("Investment recouped", t.paybackMonths != null ? `${t.paybackMonths} mo` : "—", "blended payback on setup")}
      </div>

      <div class="invest-bar">
        <div class="invest-col">
          <div class="invest-l">One-time setup</div>
          <div class="invest-v">${usd(t.setup)}</div>
        </div>
        <div class="invest-col">
          <div class="invest-l">Monthly management</div>
          <div class="invest-v">${usd(t.monthly)}<span class="invest-freq">/mo</span></div>
        </div>
        <div class="invest-col">
          <div class="invest-l">Staff time saved</div>
          <div class="invest-v">~${t.hoursPerWeek} hrs<span class="invest-freq">/wk</span></div>
        </div>
        <div class="invest-col invest-net">
          <div class="invest-l">Net first-year gain</div>
          <div class="invest-v">${usd(t.firstYearNet)}</div>
        </div>
      </div>
      <p class="fineprint">Net first-year gain = modeled recovered revenue (${usd(t.annualImpact)}) − total first-year investment (${usd(t.firstYearCost)} = ${usd(t.setup)} setup + ${usd(t.monthly)}×12 management). Figures are confirmed against your real numbers on the kickoff call.</p>

      <div class="page-footer">
        <span>${esc(rm.business.name)} · Automation Roadmap &amp; Proposal · ${DATE_STR}</span>
        <span>Prepared by ${esc(brand.name)}${brand.url ? ` · ${esc(brand.url)}` : ""}</span>
      </div>
    </div>
  </div>`;
}

// ── PROBLEM → SOLUTION MAPPING ───────────────────────────────────────────────
function mappingPage(rm, brand) {
  const rows = rm.proposal.problemSolution.map(ps => `
    <div class="map-row">
      <div class="map-problem">
        <div class="map-tag map-tag-red">GAP</div>
        <div class="map-text">${esc(ps.problem)}</div>
        ${ps.evidence ? `<div class="map-evi">${esc(ps.evidence)}</div>` : ""}
      </div>
      <div class="map-arrow">→</div>
      <div class="map-solution">
        <div class="map-tag map-tag-green">SOLVED BY</div>
        <div class="map-text">${esc(ps.solution)}</div>
        <div class="map-impact">${esc(ps.impact)}</div>
      </div>
    </div>`).join("");
  return `
  <div class="page interior">
    <div class="page-spine"></div>
    <div class="page-content">
      <div class="section-eyebrow">02 — DIAGNOSIS → PRESCRIPTION</div>
      <h2 class="section-heading">Every gap mapped to the system that fixes it</h2>
      <p class="plan-intro">We don't sell software — we close specific, measured gaps. Each weakness the audit surfaced is paired below with the exact automation that resolves it and the revenue it's modeled to recover.</p>
      <div class="map-list">${rows}</div>
      <div class="page-footer">
        <span>${esc(rm.business.name)} · Automation Roadmap &amp; Proposal · ${DATE_STR}</span>
        <span>Prepared by ${esc(brand.name)}${brand.url ? ` · ${esc(brand.url)}` : ""}</span>
      </div>
    </div>
  </div>`;
}

// ── SOLUTION DETAIL CARDS (with economics) ───────────────────────────────────
function solutionsPage(rm, brand) {
  const card = (s, i) => `
    <div class="sol-card">
      <div class="sol-head">
        <div class="sol-left">
          <div class="sol-num">SYSTEM ${i + 1} · ${esc(s.category).toUpperCase()}</div>
          <div class="sol-name">${esc(s.consumerName)}</div>
          <div class="sol-build">${s.effort === "low" ? "Live in days" : s.effort === "medium" ? "1–2 week build" : "Premium build"} · ${esc(s.buildLabel)} · saves ~${s.hoursPerWeek} hrs/wk${s.grounded ? ` · <span class="sol-grounded">audit-verified</span>` : ""}</div>
        </div>
        <div class="sol-roi">
          <div class="sol-roi-l">RECOVERS</div>
          <div class="sol-roi-v">${usd(s.monthlyImpact)}</div>
          <div class="sol-roi-s">/month</div>
        </div>
      </div>
      <div class="sol-body">
        <div class="sol-pp"><b style="color:${RED}">The problem:</b> ${esc(s.problem)}</div>
        <div class="sol-pp"><b style="color:${GREEN}">What we build:</b> ${esc(s.solution)}</div>
      </div>
      <div class="sol-econ">
        <div class="econ-cell"><span class="econ-l">Setup</span><span class="econ-v">${usd(s.setup)}</span></div>
        <div class="econ-cell"><span class="econ-l">Monthly</span><span class="econ-v">${usd(s.monthly)}</span></div>
        <div class="econ-cell"><span class="econ-l">Payback</span><span class="econ-v">${s.paybackMonths != null ? `${s.paybackMonths} mo` : "—"}</span></div>
        <div class="econ-cell econ-hl"><span class="econ-l">1-yr ROI</span><span class="econ-v">${s.roiMultiple}×</span></div>
      </div>
    </div>`;
  return `
  <div class="page interior">
    <div class="page-spine"></div>
    <div class="page-content">
      <div class="section-eyebrow">03 — RECOMMENDED SYSTEMS</div>
      <h2 class="section-heading">The ${rm.solutions.length} automations we'd build for ${esc(rm.business.name)}</h2>
      <div class="sol-list">${rm.solutions.map(card).join("")}</div>
      <div class="page-footer">
        <span>${esc(rm.business.name)} · Automation Roadmap &amp; Proposal · ${DATE_STR}</span>
        <span>Prepared by ${esc(brand.name)}${brand.url ? ` · ${esc(brand.url)}` : ""}</span>
      </div>
    </div>
  </div>`;
}

// ── ROADMAP (phased) + BUNDLE OFFER ──────────────────────────────────────────
function roadmapPage(rm, brand) {
  const byId = Object.fromEntries(rm.solutions.map(s => [s.id, s]));
  const phases = rm.roadmap.phases.map((p, i) => `
    <div class="phase-block" style="border-left-color:${phaseColor(i)}">
      <div class="phase-header" style="color:${phaseColor(i)}">
        <span>${esc(p.title)}</span><span class="phase-time">${esc(p.timeframe)}</span>
      </div>
      <div class="phase-obj">${esc(p.objective)}</div>
      <div class="phase-items">
        ${p.services.map(id => byId[id]).filter(Boolean).map(s => `
          <div class="phase-item">
            <span class="phase-dot" style="background:${phaseColor(i)}"></span>
            <span class="phase-item-name">${esc(s.consumerName)}</span>
            <span class="phase-item-roi">${usd(s.monthlyImpact)}/mo</span>
          </div>`).join("")}
      </div>
    </div>`).join("");

  const bundle = rm.bundle ? `
    <div class="bundle-box">
      <div class="bundle-eyebrow">RECOMMENDED PACKAGE</div>
      <div class="bundle-name">${esc(rm.bundle.name)}</div>
      <p class="bundle-blurb">${esc(rm.bundle.blurb)}</p>
      <div class="bundle-price-row">
        <div class="bundle-price"><span class="bundle-price-v">${usd(rm.bundle.setup)}</span><span class="bundle-price-l">one-time setup</span></div>
        <div class="bundle-plus">+</div>
        <div class="bundle-price"><span class="bundle-price-v">${usd(rm.bundle.monthly)}</span><span class="bundle-price-l">per month</span></div>
        ${rm.bundle.savings > 0 ? `<div class="bundle-save">Save ${usd(rm.bundle.savings)} vs. à la carte</div>` : ""}
      </div>
    </div>` : "";

  return `
  <div class="page interior">
    <div class="page-spine"></div>
    <div class="page-content">
      <div class="section-eyebrow">04 — IMPLEMENTATION ROADMAP</div>
      <h2 class="section-heading">The sequence — fastest payback first</h2>
      <div class="phases">${phases}</div>
      ${bundle}
      <div class="page-footer">
        <span>${esc(rm.business.name)} · Automation Roadmap &amp; Proposal · ${DATE_STR}</span>
        <span>Prepared by ${esc(brand.name)}${brand.url ? ` · ${esc(brand.url)}` : ""}</span>
      </div>
    </div>
  </div>`;
}

// ── CLOSE / TERMS / CTA ──────────────────────────────────────────────────────
function closePage(rm, brand) {
  const t = rm.totals;
  return `
  <div class="page cta-pg">
    <div class="cta-top-brand">${esc(brand.name).toUpperCase()}</div>
    <div class="cta-main">
      <div class="cta-eyebrow">YOUR INVESTMENT &amp; NEXT STEP</div>
      <h2 class="cta-heading">Recover ${usd(t.monthlyImpact)}/mo<br>for ${esc(rm.business.name)}.</h2>

      <div class="cta-number-row">
        <div class="cta-big-num">${t.roiMultiple}×</div>
        <div class="cta-num-label">first-year return on investment<br>${usd(t.annualImpact)} recovered vs. ${usd(t.firstYearCost)} invested</div>
      </div>

      <p class="cta-body">${esc(rm.proposal.recommendation)}</p>

      <div class="cta-terms">
        ${rm.proposal.terms.map(term => `<div class="cta-term"><span class="cta-tick">✓</span>${esc(term)}</div>`).join("")}
      </div>

      <div class="cta-guarantee">🛡 ${esc(rm.proposal.guarantee)}</div>

      <a href="${brand.callUrl}" class="cta-btn">📞 Book the Kickoff Call</a>
      <div class="cta-reassure">${esc(rm.proposal.cta)}</div>
    </div>
    <div class="cta-footer">
      <div class="cta-footer-row">
        <div>
          <div class="cta-footer-brand">${esc(brand.name)}</div>
          ${brand.url ? `<div class="cta-footer-url">${esc(brand.url)}</div>` : ""}
        </div>
        <div class="cta-footer-contact">
          ${brand.email ? `${esc(brand.email)}<br>` : ""}
          Proposal valid until ${VALID_STR}
        </div>
      </div>
      <div class="cta-disclaimer">All revenue figures are modeled from published industry benchmarks and the business inputs in your audit. They are estimates, not guarantees — actual results depend on implementation quality, market conditions, and how the systems are used. Final pricing is confirmed in writing at kickoff.</div>
      <div class="cta-prepared">Prepared exclusively for ${esc(rm.business.name)} by ${esc(brand.name)} on ${DATE_STR}.</div>
    </div>
  </div>`;
}

// ── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { font-family:'Inter','Helvetica Neue',Arial,sans-serif; background:#e8e4dc; color:${INK}; font-size:13px; line-height:1.6; }

.screen-bar { background:#111; color:#aaa; text-align:center; padding:12px; font-size:12px; font-family:monospace; position:sticky; top:0; z-index:100; }
.screen-bar button { background:${GOLD}; color:#000; border:none; border-radius:4px; padding:6px 16px; font-size:12px; font-weight:700; cursor:pointer; margin-left:12px; }
@media print { .screen-bar { display:none; } }

.page { width:794px; min-height:1123px; margin:24px auto; position:relative; box-shadow:0 8px 48px rgba(0,0,0,0.20); }
@media (max-width:840px){ .page{ width:100%; margin:0; box-shadow:none; } }
@media print {
  html, body { background:white; }
  .page { width:100%; margin:0; box-shadow:none; page-break-after:always; min-height:0; }
  .page:last-child { page-break-after:avoid; }
  @page { size:A4 portrait; margin:0; }
}

/* COVER */
.cover { background:${BLACK}; color:white; padding:60px 64px; display:flex; flex-direction:column; justify-content:space-between; min-height:1123px; }
.brand-mark { font-size:13px; font-weight:800; letter-spacing:0.18em; text-transform:uppercase; margin-bottom:10px; }
.brand-p,.brand-amp,.brand-a { color:${GOLD}; }
.brand-amp { margin:0 2px; }
.cover-eyebrow { font-size:10px; letter-spacing:0.2em; color:#5a5a6e; text-transform:uppercase; font-weight:500; }
.cover-main { flex:1; display:flex; flex-direction:column; justify-content:center; padding:48px 0; }
.cover-rule { width:64px; height:3px; background:${GOLD}; margin-bottom:28px; }
.cover-biz { font-size:44px; font-weight:900; line-height:1.1; letter-spacing:-0.02em; color:white; margin-bottom:16px; max-width:560px; }
.cover-sub { font-size:14px; color:#8888a0; display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
.cover-dot { color:#333; }
.cover-headline { margin-top:36px; font-size:20px; line-height:1.5; color:#c8c8d8; max-width:580px; font-weight:500; }
.cover-headline .hl { color:${GOLD}; font-weight:800; }
.cover-bottom { display:flex; justify-content:space-between; align-items:flex-end; padding-top:40px; border-top:1px solid #1e1e2e; }
.cover-meta { display:flex; flex-direction:column; gap:6px; }
.cover-meta-row { display:flex; gap:16px; font-size:11px; }
.cover-meta-label { color:#5a5a6e; min-width:110px; }
.cover-meta-row span:last-child { color:#b0b0c8; }
.cover-prepared { text-align:right; }
.cover-prepared-by { font-size:10px; color:#5a5a6e; letter-spacing:0.1em; text-transform:uppercase; margin-bottom:4px; }
.cover-prepared-name { font-size:16px; font-weight:800; color:${GOLD}; }
.cover-prepared-url { font-size:11px; color:#5a5a6e; margin-top:2px; }
.cover-confidential { position:absolute; bottom:20px; left:50%; transform:translateX(-50%); font-size:8px; letter-spacing:0.15em; color:#2a2a3a; text-transform:uppercase; white-space:nowrap; }

/* INTERIOR */
.interior { background:white; display:flex; }
.page-spine { width:4px; background:${GOLD}; flex-shrink:0; min-height:1123px; }
.page-content { flex:1; padding:52px 52px 48px 48px; display:flex; flex-direction:column; }
.section-eyebrow { font-size:9px; font-weight:700; letter-spacing:0.2em; text-transform:uppercase; color:${GOLD}; margin-bottom:10px; }
.section-heading { font-size:26px; font-weight:800; letter-spacing:-0.02em; line-height:1.2; color:${INK}; margin-bottom:24px; padding-bottom:16px; border-bottom:2px solid ${BORDER}; }
.plan-intro { font-size:13px; color:${MUTED}; line-height:1.7; margin-bottom:22px; }
.exec-box { border-left:3px solid ${GOLD}; background:#fffdf5; padding:16px 20px; border-radius:0 8px 8px 0; margin-bottom:24px; }
.exec-text { font-size:13.5px; line-height:1.8; color:${INK}; }

/* STAT GRID */
.stat-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:20px; }
.stat-card { background:${SUBTLE}; border:1px solid ${BORDER}; border-radius:10px; padding:16px 14px; text-align:center; }
.stat-accent { border-color:#d4c89e; background:#fffdf5; }
.stat-label { font-size:9px; color:${MUTED}; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:8px; }
.stat-value { font-size:24px; font-weight:900; color:${GOLD2}; line-height:1; font-variant-numeric:tabular-nums; }
.stat-sub { font-size:9px; color:${MUTED}; margin-top:6px; line-height:1.4; }

/* INVEST BAR */
.invest-bar { display:grid; grid-template-columns:repeat(4,1fr); background:${BLACK}; border-radius:10px; overflow:hidden; margin-bottom:10px; }
.invest-col { padding:16px 18px; border-right:1px solid #1e1e2e; }
.invest-col:last-child { border-right:none; }
.invest-l { font-size:9px; color:#8888a0; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:6px; }
.invest-v { font-size:20px; font-weight:900; color:white; font-variant-numeric:tabular-nums; }
.invest-freq { font-size:11px; font-weight:400; color:#888; }
.invest-net .invest-v { color:${GOLD}; }
.fineprint { font-size:9.5px; color:${MUTED}; line-height:1.6; margin-bottom:8px; }

/* MAPPING */
.map-list { display:flex; flex-direction:column; gap:10px; }
.map-row { display:grid; grid-template-columns:1fr 24px 1fr; gap:8px; align-items:center; }
.map-problem, .map-solution { border:1px solid ${BORDER}; border-radius:8px; padding:11px 14px; }
.map-problem { background:#fdf6f5; border-color:#f0d8d4; }
.map-solution { background:#f0f9f4; border-color:#cce8d8; }
.map-tag { font-size:8px; font-weight:800; letter-spacing:0.1em; padding:1px 6px; border-radius:3px; display:inline-block; margin-bottom:6px; }
.map-tag-red { color:${RED}; background:rgba(192,57,43,0.1); }
.map-tag-green { color:${GREEN}; background:rgba(26,122,74,0.1); }
.map-text { font-size:12px; font-weight:600; color:${INK}; line-height:1.45; }
.map-evi { font-size:10px; color:${MUTED}; line-height:1.5; margin-top:5px; }
.map-impact { font-size:13px; font-weight:800; color:${GREEN}; margin-top:7px; font-variant-numeric:tabular-nums; }
.map-arrow { text-align:center; font-size:18px; color:${GOLD}; font-weight:700; }

/* SOLUTION CARDS */
.sol-list { display:flex; flex-direction:column; gap:12px; }
.sol-card { border:1px solid ${BORDER}; border-radius:10px; overflow:hidden; }
.sol-head { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; padding:14px 18px 10px; }
.sol-num { font-size:9px; color:${MUTED}; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; margin-bottom:4px; }
.sol-name { font-size:17px; font-weight:800; color:${INK}; margin-bottom:4px; }
.sol-build { font-size:10px; color:${MUTED}; }
.sol-grounded { color:${GREEN}; font-weight:700; }
.sol-roi { text-align:right; flex-shrink:0; }
.sol-roi-l { font-size:8px; font-weight:700; color:${MUTED}; letter-spacing:0.12em; }
.sol-roi-v { font-size:26px; font-weight:900; color:${GOLD2}; line-height:1; font-variant-numeric:tabular-nums; }
.sol-roi-s { font-size:9px; color:${MUTED}; }
.sol-body { padding:0 18px 12px; display:flex; flex-direction:column; gap:5px; }
.sol-pp { font-size:11.5px; line-height:1.55; color:${INK}; }
.sol-econ { display:grid; grid-template-columns:repeat(4,1fr); border-top:1px solid ${BORDER}; background:${SUBTLE}; }
.econ-cell { padding:9px 14px; border-right:1px solid ${BORDER}; display:flex; flex-direction:column; gap:3px; }
.econ-cell:last-child { border-right:none; }
.econ-l { font-size:8.5px; color:${MUTED}; text-transform:uppercase; letter-spacing:0.06em; }
.econ-v { font-size:14px; font-weight:800; color:${INK}; font-variant-numeric:tabular-nums; }
.econ-hl { background:#fffdf5; }
.econ-hl .econ-v { color:${GOLD2}; }

/* ROADMAP PHASES */
.phases { display:flex; flex-direction:column; gap:12px; }
.phase-block { border-left:3px solid; padding:14px 20px; background:${SUBTLE}; border-radius:0 8px 8px 0; }
.phase-header { font-size:14px; font-weight:800; margin-bottom:6px; display:flex; justify-content:space-between; align-items:baseline; }
.phase-time { font-size:10px; color:${MUTED}; font-weight:600; letter-spacing:0.06em; text-transform:uppercase; }
.phase-obj { font-size:11.5px; color:${MUTED}; line-height:1.6; margin-bottom:10px; }
.phase-items { display:flex; flex-direction:column; gap:5px; }
.phase-item { display:flex; align-items:center; gap:10px; }
.phase-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
.phase-item-name { flex:1; font-size:12.5px; font-weight:600; color:${INK}; }
.phase-item-roi { font-size:12px; font-weight:800; color:${GREEN}; font-variant-numeric:tabular-nums; }

/* BUNDLE */
.bundle-box { margin-top:18px; background:${BLACK}; border-radius:10px; padding:22px 24px; }
.bundle-eyebrow { font-size:8px; color:${GOLD}; letter-spacing:0.2em; text-transform:uppercase; font-weight:700; margin-bottom:8px; }
.bundle-name { font-size:21px; font-weight:800; color:white; margin-bottom:8px; }
.bundle-blurb { font-size:12px; color:#a0a0b8; line-height:1.7; margin-bottom:16px; }
.bundle-price-row { display:flex; align-items:center; gap:16px; flex-wrap:wrap; }
.bundle-price { display:flex; flex-direction:column; }
.bundle-price-v { font-size:26px; font-weight:900; color:${GOLD}; line-height:1; }
.bundle-price-l { font-size:10px; color:#8888a0; margin-top:3px; }
.bundle-plus { font-size:20px; color:#55556a; }
.bundle-save { margin-left:auto; background:rgba(26,122,74,0.18); border:1px solid rgba(26,122,74,0.4); color:#5dd39e; font-size:11px; font-weight:700; padding:7px 14px; border-radius:20px; }

/* CTA */
.cta-pg { background:${BLACK}; color:white; padding:56px 64px; display:flex; flex-direction:column; justify-content:space-between; min-height:1123px; }
.cta-top-brand { font-size:11px; font-weight:800; letter-spacing:0.2em; color:${GOLD}; text-transform:uppercase; }
.cta-main { flex:1; display:flex; flex-direction:column; justify-content:center; padding:36px 0; }
.cta-eyebrow { font-size:9px; font-weight:700; letter-spacing:0.22em; color:#55556a; text-transform:uppercase; margin-bottom:14px; }
.cta-heading { font-size:38px; font-weight:900; line-height:1.15; letter-spacing:-0.02em; color:white; margin-bottom:24px; }
.cta-number-row { display:flex; align-items:baseline; gap:16px; margin-bottom:22px; padding-bottom:22px; border-bottom:1px solid #1e1e2e; }
.cta-big-num { font-size:52px; font-weight:900; color:${GOLD}; line-height:1; font-variant-numeric:tabular-nums; }
.cta-num-label { font-size:13px; color:#8888a0; line-height:1.5; }
.cta-body { font-size:14px; color:#c0c0d0; line-height:1.8; margin-bottom:20px; max-width:560px; }
.cta-terms { display:flex; flex-direction:column; gap:9px; margin-bottom:18px; }
.cta-term { display:flex; gap:10px; font-size:12.5px; color:#a0a0b8; line-height:1.5; }
.cta-tick { color:${GOLD}; font-weight:700; flex-shrink:0; }
.cta-guarantee { background:rgba(26,122,74,0.12); border:1px solid rgba(26,122,74,0.3); border-radius:8px; padding:12px 16px; font-size:12.5px; color:#5dd39e; line-height:1.6; margin-bottom:24px; }
.cta-btn { display:inline-block; background:${GOLD}; color:${BLACK}; padding:16px 36px; border-radius:8px; font-size:15px; font-weight:800; text-decoration:none; letter-spacing:0.02em; box-shadow:0 0 40px rgba(245,166,35,0.35); align-self:flex-start; margin-bottom:12px; }
.cta-reassure { font-size:11.5px; color:#8888a0; line-height:1.6; max-width:520px; }
.cta-footer { border-top:1px solid #1e1e2e; padding-top:22px; }
.cta-footer-row { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; }
.cta-footer-brand { font-size:14px; font-weight:800; color:${GOLD}; }
.cta-footer-url { font-size:11px; color:#55556a; margin-top:2px; }
.cta-footer-contact { font-size:11px; color:#55556a; text-align:right; line-height:1.7; }
.cta-disclaimer { font-size:9px; color:#333344; line-height:1.6; margin-bottom:8px; }
.cta-prepared { font-size:9px; color:#2a2a3a; }

/* FOOTER */
.page-footer { margin-top:auto; padding-top:16px; border-top:1px solid ${BORDER}; display:flex; justify-content:space-between; font-size:9px; color:#aaa; letter-spacing:0.04em; }
`;

const WATERMARK_CSS = `
.page { position:relative; }
.page::after {
  content:"PREVIEW"; position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  font-family:'Inter','Helvetica Neue',sans-serif; font-weight:800; font-size:120px;
  color:rgba(120,120,120,0.10); transform:rotate(-32deg); pointer-events:none; z-index:9999;
  -webkit-print-color-adjust:exact; print-color-adjust:exact;
}`;

// ─────────────────────────────────────────────────────────────────────────────
export function buildRoadmapHTML(rm, { branding = null, watermark = false } = {}) {
  const whiteLabel = !!(branding && (branding.name || branding.logoUrl));
  const brand = {
    name: branding?.name || "Preset & Profit",
    url: whiteLabel ? (branding?.url || "") : "presetprofit.com",
    logoUrl: branding?.logoUrl || null,
    email: whiteLabel ? (branding?.email || "") : "justin@presetprofit.com",
    callUrl: branding?.callUrl || "https://presetandprofit.com/call",
    whiteLabel,
  };
  const title = `${esc(brand.name)} — ${esc(rm.business.name)} Automation Proposal`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>
  <style>${CSS}${watermark ? WATERMARK_CSS : ""}</style>
</head>
<body>
<div class="screen-bar">
  ${esc(brand.name)} — ${esc(rm.business.name)} Automation Proposal &nbsp;·&nbsp;
  <button onclick="window.print()">Save as PDF ↓</button>
</div>
${coverPage(rm, brand)}
${opportunityPage(rm, brand)}
${mappingPage(rm, brand)}
${solutionsPage(rm, brand)}
${roadmapPage(rm, brand)}
${closePage(rm, brand)}
</body>
</html>`;
}

export function downloadRoadmap(rm, opts = {}) {
  const html = buildRoadmapHTML(rm, opts);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const prefix = opts.branding?.name
    ? opts.branding.name.replace(/[^\w]+/g, "-")
    : "Preset-Profit";
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${prefix}-Automation-Proposal-${(rm.business.name || "Proposal").replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.html`;
  a.click();
  URL.revokeObjectURL(a.href);
}
