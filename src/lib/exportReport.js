// ─────────────────────────────────────────────────────────────────────────────
// Premium PDF Export — Preset & Profit
// Outputs a standalone HTML file that converts to a $500-quality consulting PDF
// when printed via browser → Print → Save as PDF
// ─────────────────────────────────────────────────────────────────────────────

const GOLD   = "#f5a623";
const GOLD2  = "#b8760a";
const BLACK  = "#0a0a0f";
const WHITE  = "#ffffff";
const INK    = "#1a1a1a";
const SUBTLE = "#fafaf8";
const BORDER = "#e8e4dc";
const MUTED  = "#6b6b6b";
const GREEN  = "#1a7a4a";
const AMBER  = "#b8760a";
const RED    = "#c0392b";

const scoreColor = n => n >= 80 ? GREEN : n >= 60 ? AMBER : RED;
const scoreLabel = n => n >= 80 ? "Strong" : n >= 60 ? "Moderate" : "Needs Work";

function ring(score, size = 90) {
  const r   = (size - 10) / 2;
  const c   = 2 * Math.PI * r;
  const off = c * (1 - score / 100);
  const col = scoreColor(score);
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="#e8e4dc" stroke-width="5"/>
    <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${col}" stroke-width="5"
      stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${off.toFixed(2)}"
      stroke-linecap="round" transform="rotate(-90 ${size/2} ${size/2})"/>
    <text x="50%" y="46%" text-anchor="middle" dominant-baseline="middle"
      font-size="${Math.round(size * 0.26)}" font-weight="800" fill="${col}"
      font-family="'Inter','Helvetica Neue',sans-serif">${score}</text>
    <text x="50%" y="70%" text-anchor="middle" dominant-baseline="middle"
      font-size="${Math.round(size * 0.11)}" fill="${MUTED}"
      font-family="'Inter','Helvetica Neue',sans-serif">${scoreLabel(score)}</text>
  </svg>`;
}

function badge(status) {
  const map = { bad:["✕","ACTION",RED], warn:["◐","REVIEW",AMBER], good:["✓","PASS",GREEN] };
  const [icon, label, color] = map[status] || ["◦","—",MUTED];
  return { icon, label, color };
}

function esc(s) {
  return String(s || "")
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;");
}

const DATE_STR = new Date().toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" });

// ─────────────────────────────────────────────────────────────────────────────
// PAGE BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

function coverPage(r, brand) {
  const mark = brand.whiteLabel
    ? (brand.logoUrl
        ? `<img src="${esc(brand.logoUrl)}" alt="${esc(brand.name)}" style="height:34px;max-width:220px;object-fit:contain"/>`
        : `<div class="brand-mark"><span class="brand-a">${esc(brand.name)}</span></div>`)
    : `<div class="brand-mark"><span class="brand-p">PRESET</span><span class="brand-amp">&amp;</span><span class="brand-a">PROFIT</span></div>`;
  return `
  <!-- ══ COVER ══ -->
  <div class="page cover">
    <div class="cover-top">
      ${mark}
      <div class="cover-eyebrow">AUTOMATION OPPORTUNITY REPORT</div>
    </div>

    <div class="cover-main">
      <div class="cover-rule"></div>
      <h1 class="cover-biz">${esc(r.businessName)}</h1>
      <div class="cover-sub">
        ${r.industry ? `<span>${esc(r.industry)}</span>` : ""}
        ${r.city     ? `<span class="cover-dot">·</span><span>${esc(r.city)}</span>` : ""}
        ${r.goal     ? `<span class="cover-dot">·</span><span>${esc(r.goal)}</span>` : ""}
      </div>
    </div>

    <div class="cover-bottom">
      <div class="cover-meta">
        <div class="cover-meta-row"><span class="cover-meta-label">Prepared for</span><span>${esc(r.businessName)}</span></div>
        <div class="cover-meta-row"><span class="cover-meta-label">Report date</span><span>${DATE_STR}</span></div>
        <div class="cover-meta-row"><span class="cover-meta-label">Report type</span><span>Full Automation Opportunity Audit</span></div>
      </div>
      <div class="cover-prepared">
        <div class="cover-prepared-by">Prepared by</div>
        <div class="cover-prepared-name">${esc(brand.name)}</div>
        ${brand.url ? `<div class="cover-prepared-url">${esc(brand.url)}</div>` : ""}
      </div>
    </div>

    <div class="cover-confidential">CONFIDENTIAL · FOR ${esc((r.businessName || "").toUpperCase())} ONLY</div>
  </div>`;
}

function summaryPage(r, brand) {
  return `
  <!-- ══ EXECUTIVE SUMMARY ══ -->
  <div class="page interior">
    <div class="page-spine"></div>
    <div class="page-content">
      <div class="section-eyebrow">01 — EXECUTIVE SUMMARY</div>
      <h2 class="section-heading">What This Means for ${esc(r.businessName)}</h2>

      <!-- Score row -->
      <div class="score-row">
        <div class="score-card">
          ${ring(r.overallScore, 96)}
          <div class="score-label">Overall Score</div>
        </div>
        <div class="score-card">
          ${ring(r.leadScore, 96)}
          <div class="score-label">Getting Customers</div>
        </div>
        <div class="score-card">
          ${ring(r.websiteScore, 96)}
          <div class="score-label">Website Quality</div>
        </div>
        <div class="score-card roi-card">
          <div class="roi-number">${esc(r.totalMonthlyOpportunity || r.revenueOpportunity)}</div>
          <div class="roi-label">Extra Revenue / Month</div>
          <div class="roi-sub">across ${(r.automations||[]).length} identified systems</div>
        </div>
      </div>

      <!-- Executive summary text -->
      <div class="exec-box">
        <p class="exec-text">${esc(r.executiveSummary)}</p>
      </div>

      <!-- Recommendation highlight -->
      <div class="rec-highlight">
        <div class="rec-eyebrow">RECOMMENDED SOLUTION FOR ${esc((r.businessName||"").toUpperCase())}</div>
        <div class="rec-name">${esc(r.recommendation?.name)}</div>
        <p class="rec-desc">${esc(r.recommendation?.description)}</p>
        ${r.recommendation?.benefit ? `<div class="rec-benefit"><span class="rec-benefit-icon">✓</span>${esc(r.recommendation.benefit)}</div>` : ""}
        <div class="rec-price">${esc(r.recommendation?.package)} · Starting from ${esc(r.recommendation?.price)}</div>
      </div>

      <div class="page-footer">
        <span>${esc(r.businessName)} · Automation Opportunity Report · ${DATE_STR}</span>
        <span>Prepared by ${esc(brand.name)}${brand.url ? ` · ${esc(brand.url)}` : ""}</span>
      </div>
    </div>
  </div>`;
}

function findingsPage(r, brand) {
  const findingRow = (f) => {
    const b = badge(f.status);
    // Evidence findings (from a real site scan) carry why/proof/fix/impact.
    // Legacy findings carry a single personalNote/detail line.
    let body;
    if (f.proof) {
      const line = (lbl, val) => val
        ? `<div class="finding-evi"><span class="finding-evi-l">${lbl}</span><span>${esc(val)}</span></div>` : "";
      body = `<div class="finding-label">${esc(f.label)}</div>`
        + line("Why it matters", f.why)
        + line("Proof", f.proof)
        + line("Recommended fix", f.fix)
        + line("Expected impact", f.impact);
    } else {
      body = `<div class="finding-label">${esc(f.label)}</div>`
        + `<div class="finding-detail">${esc(f.personalNote || f.detail || "")}</div>`;
    }
    return `
    <div class="finding-row">
      <div class="finding-icon" style="color:${b.color};border-color:${b.color}20;background:${b.color}12">${b.icon}</div>
      <div class="finding-body">${body}</div>
      <div class="finding-badge" style="color:${b.color};border-color:${b.color}30;background:${b.color}10">${b.label}</div>
    </div>`;
  };

  return `
  <!-- ══ FINDINGS ══ -->
  <div class="page interior">
    <div class="page-spine"></div>
    <div class="page-content">
      <div class="section-eyebrow">02 — WHAT WE FOUND</div>
      <h2 class="section-heading">Your Detailed Audit Findings</h2>

      <div class="findings-section">
        <div class="findings-header">
          <div class="findings-title">How New Customers Find ${esc(r.businessName)}</div>
          <div class="findings-score">${ring(r.leadScore, 52)}</div>
        </div>
        <div class="findings-list">
          ${(r.leadFindings||[]).map(findingRow).join("")}
        </div>
      </div>

      <div class="findings-section" style="margin-top:28px">
        <div class="findings-header">
          <div class="findings-title">${esc(r.siteRef || r.businessName + "'s Website")}</div>
          <div class="findings-score">${ring(r.websiteScore, 52)}</div>
        </div>
        <div class="findings-list">
          ${(r.websiteFindings||[]).map(findingRow).join("")}
        </div>
      </div>

      <!-- Competitor gap -->
      <div class="gap-box">
        <div class="gap-eyebrow">HOW ${esc((r.businessName||"").toUpperCase())} COMPARES${r.city ? ` IN ${esc(r.city.toUpperCase())}` : ""}</div>
        <p class="gap-text">${esc(r.competitorGap)}</p>
      </div>

      <div class="page-footer">
        <span>${esc(r.businessName)} · Automation Opportunity Report · ${DATE_STR}</span>
        <span>Prepared by ${esc(brand.name)}${brand.url ? ` · ${esc(brand.url)}` : ""}</span>
      </div>
    </div>
  </div>`;
}

function revenueOpportunitiesPage(r, brand) {
  const totalRev = (r.automations||[]).reduce((s,a) => s + (a.roiAmt||0), 0);

  const autoCard = (a) => `
    <div class="auto-card">
      <div class="auto-header">
        <div class="auto-left">
          <div class="auto-priority">#${a.priority} Priority</div>
          <div class="auto-name">${esc(a.name)}</div>
          <div class="auto-tag">${esc(a.category)} · ${a.effort === "low" ? "Quick to set up" : a.effort === "medium" ? "1–2 weeks to set up" : "Full build"}</div>
        </div>
        <div class="auto-roi-block">
          <div class="auto-roi-label">EXTRA / MONTH</div>
          <div class="auto-roi-value">${esc(a.roi)}</div>
        </div>
      </div>
      ${a.personalIntro ? `<div class="auto-intro">${esc(a.personalIntro)}</div>` : ""}
      <p class="auto-desc">${esc(a.description)}</p>
      ${a.profitAngle ? `<div class="auto-angle">💡 ${esc(a.profitAngle)}</div>` : ""}
      ${a.roiBreakdown?.steps?.length ? `
      <div class="auto-math">
        <div class="auto-math-label">HOW WE CALCULATED THIS</div>
        ${a.roiBreakdown.steps.map((s,i) => `
        <div class="auto-step">
          <span class="auto-step-n">${i === a.roiBreakdown.steps.length-1 ? "=" : i+1}</span>
          <span class="auto-step-text">${esc(s)}</span>
        </div>`).join("")}
        <div class="auto-source">Source: ${esc(a.roiBreakdown.source)}</div>
      </div>` : ""}
    </div>`;

  return `
  <!-- ══ REVENUE OPPORTUNITIES ══ -->
  <div class="page interior">
    <div class="page-spine"></div>
    <div class="page-content">
      <div class="section-eyebrow">03 — REVENUE OPPORTUNITIES</div>
      <h2 class="section-heading">4 Systems That Would Generate Extra Revenue for ${esc(r.businessName)}</h2>

      <div class="total-bar">
        <div class="total-left">
          <div class="total-label">Combined extra revenue per month for ${esc(r.businessName)}</div>
          <div class="total-sub">Based on industry benchmarks — adjust on the call with your real numbers</div>
        </div>
        <div class="total-value">$${totalRev.toLocaleString()}<span class="total-freq">/month</span></div>
      </div>

      <div class="auto-list">
        ${(r.automations||[]).map(autoCard).join("")}
      </div>

      <div class="page-footer">
        <span>${esc(r.businessName)} · Automation Opportunity Report · ${DATE_STR}</span>
        <span>Prepared by ${esc(brand.name)}${brand.url ? ` · ${esc(brand.url)}` : ""}</span>
      </div>
    </div>
  </div>`;
}

function planPage(r, brand) {
  const phases = r.thirtyDayPlan
    ? [r.thirtyDayPlan.phase1, r.thirtyDayPlan.phase2, r.thirtyDayPlan.phase3]
    : [];
  const phaseColors = [GREEN, GOLD, "#2563eb"];
  const phaseEmoji  = ["⚡", "🔧", "📊"];

  return `
  <!-- ══ 30-DAY PLAN ══ -->
  <div class="page interior">
    <div class="page-spine"></div>
    <div class="page-content">
      <div class="section-eyebrow">04 — YOUR 30-DAY ACTION PLAN</div>
      <h2 class="section-heading">How ${esc(r.businessName)} Gets There in 30 Days</h2>
      <p class="plan-intro">This plan is tailored to ${esc(r.businessName)}'s primary goal: <strong>${esc(r.goal)}</strong>. Every action is sequenced for maximum impact with minimum disruption.</p>

      <div class="phases">
        ${phases.map((ph, idx) => `
        <div class="phase-block" style="border-left-color:${phaseColors[idx]}">
          <div class="phase-header" style="color:${phaseColors[idx]}">
            <span class="phase-emoji">${phaseEmoji[idx]}</span>
            Phase ${idx+1}: ${esc(ph.title)}
          </div>
          <ol class="phase-actions">
            ${(ph.actions||[]).map(a => `<li class="phase-action">${esc(a)}</li>`).join("")}
          </ol>
        </div>`).join("")}
      </div>

      <!-- Quick wins -->
      ${r.quickWins?.length ? `
      <div class="quick-wins">
        <div class="qw-eyebrow">3 THINGS ${esc((r.businessName||"").toUpperCase())} CAN DO THIS WEEK</div>
        <div class="qw-list">
          ${r.quickWins.map((q,i) => `
          <div class="qw-item">
            <div class="qw-num">${i+1}</div>
            <div class="qw-text">${esc(q)}</div>
          </div>`).join("")}
        </div>
      </div>` : ""}

      <div class="page-footer">
        <span>${esc(r.businessName)} · Automation Opportunity Report · ${DATE_STR}</span>
        <span>Prepared by ${esc(brand.name)}${brand.url ? ` · ${esc(brand.url)}` : ""}</span>
      </div>
    </div>
  </div>`;
}

function ctaPage(r) {
  const totalRev = (r.automations||[]).reduce((s,a) => s + (a.roiAmt||0), 0);
  return `
  <!-- ══ CTA ══ -->
  <div class="page cta-pg">
    <div class="cta-top-brand">PRESET &amp; PROFIT</div>

    <div class="cta-main">
      <div class="cta-eyebrow">NEXT STEPS</div>
      <h2 class="cta-heading">Ready to implement this<br>for ${esc(r.businessName)}?</h2>

      <div class="cta-number-row">
        <div class="cta-big-num">$${totalRev.toLocaleString()}</div>
        <div class="cta-num-label">extra revenue per month<br>≈ $${(totalRev * 12).toLocaleString()}/year for ${esc(r.businessName)}</div>
      </div>

      <p class="cta-body">
        We build and manage every system in this report. You don't touch a thing.
        Most setups are live within 7 days. No technical knowledge required.
      </p>

      <div class="cta-promises">
        ${["Done-for-you setup — we handle everything", "Live within 7 days of starting", "No tech skills or extra staff needed", "30-day check-in — if it's not working, we fix it free"].map(t =>
          `<div class="cta-promise"><span class="cta-tick">✓</span>${esc(t)}</div>`
        ).join("")}
      </div>

      <a href="https://presetandprofit.com/call" class="cta-btn">
        📞 Request Implementation — Free 30-Min Call
      </a>
      <div class="cta-reassure">Free · No obligation · We walk through your report and give you exact pricing</div>
    </div>

    <div class="cta-footer">
      <div class="cta-rule"></div>
      <div class="cta-footer-row">
        <div>
          <div class="cta-footer-brand">Preset &amp; Profit</div>
          <div class="cta-footer-url">presetandprofit.com</div>
        </div>
        <div class="cta-footer-contact">
          hello@presetandprofit.com<br>
          All projects start with a free strategy call
        </div>
      </div>
      <div class="cta-disclaimer">${esc(r.disclaimer || "Estimates are based on industry benchmarks and are not guaranteed. Actual results depend on implementation quality and market conditions.")}</div>
      <div class="cta-prepared">This report was prepared exclusively for ${esc(r.businessName)} by Preset &amp; Profit on ${DATE_STR}.</div>
    </div>
  </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --gold:   ${GOLD};
  --gold2:  ${GOLD2};
  --black:  ${BLACK};
  --ink:    ${INK};
  --border: ${BORDER};
  --muted:  ${MUTED};
  --subtle: ${SUBTLE};
}

html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

body {
  font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
  background: #e8e4dc;
  color: var(--ink);
  font-size: 13px;
  line-height: 1.6;
}

/* ── SCREEN WRAPPER ── */
.screen-bar {
  background: #111;
  color: #aaa;
  text-align: center;
  padding: 12px;
  font-size: 12px;
  font-family: monospace;
  position: sticky;
  top: 0;
  z-index: 100;
}
.screen-bar a {
  color: ${GOLD};
  text-decoration: none;
  font-weight: 600;
  margin-left: 12px;
}
.screen-bar button {
  background: ${GOLD};
  color: #000;
  border: none;
  border-radius: 4px;
  padding: 6px 16px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  margin-left: 12px;
}
@media print { .screen-bar { display: none; } }

/* ── PAGE BASE ── */
.page {
  width: 794px;
  min-height: 1123px;
  margin: 24px auto;
  position: relative;
  box-shadow: 0 8px 48px rgba(0,0,0,0.20);
}
@media (max-width: 840px) { .page { width: 100%; margin: 0; box-shadow: none; } }
@media print {
  html, body { background: white; }
  .page {
    width: 100%; margin: 0; box-shadow: none;
    page-break-after: always; min-height: 0;
  }
  .page:last-child { page-break-after: avoid; }
  @page { size: A4 portrait; margin: 0; }
}

/* ── COVER PAGE ── */
.cover {
  background: ${BLACK};
  color: white;
  padding: 60px 64px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 1123px;
}
.cover-top { }
.brand-mark {
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  margin-bottom: 10px;
}
.brand-p { color: ${GOLD}; }
.brand-amp { color: ${GOLD}; margin: 0 2px; }
.brand-a { color: ${GOLD}; }
.cover-eyebrow {
  font-size: 10px;
  letter-spacing: 0.2em;
  color: #5a5a6e;
  text-transform: uppercase;
  font-weight: 500;
}
.cover-main { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 60px 0; }
.cover-rule {
  width: 64px; height: 3px;
  background: ${GOLD};
  margin-bottom: 28px;
}
.cover-biz {
  font-size: 44px;
  font-weight: 900;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: white;
  margin-bottom: 16px;
  max-width: 540px;
}
.cover-sub {
  font-size: 14px;
  color: #8888a0;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.cover-dot { color: #333; }
.cover-bottom {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding-top: 40px;
  border-top: 1px solid #1e1e2e;
}
.cover-meta { display: flex; flex-direction: column; gap: 6px; }
.cover-meta-row { display: flex; gap: 16px; font-size: 11px; }
.cover-meta-label { color: #5a5a6e; min-width: 100px; }
.cover-meta-row span:last-child { color: #b0b0c8; }
.cover-prepared { text-align: right; }
.cover-prepared-by { font-size: 10px; color: #5a5a6e; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 4px; }
.cover-prepared-name { font-size: 16px; font-weight: 800; color: ${GOLD}; }
.cover-prepared-url { font-size: 11px; color: #5a5a6e; margin-top: 2px; }
.cover-confidential {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 8px;
  letter-spacing: 0.15em;
  color: #2a2a3a;
  text-transform: uppercase;
  white-space: nowrap;
}

/* ── INTERIOR PAGES ── */
.interior { background: white; display: flex; }
.page-spine { width: 4px; background: ${GOLD}; flex-shrink: 0; min-height: 1123px; }
.page-content { flex: 1; padding: 52px 52px 48px 48px; display: flex; flex-direction: column; }
.section-eyebrow {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: ${GOLD};
  margin-bottom: 10px;
}
.section-heading {
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.2;
  color: ${INK};
  margin-bottom: 28px;
  padding-bottom: 16px;
  border-bottom: 2px solid ${BORDER};
}

/* ── SCORE ROW ── */
.score-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 28px;
}
.score-card {
  background: ${SUBTLE};
  border: 1px solid ${BORDER};
  border-radius: 10px;
  padding: 18px 12px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.score-label { font-size: 10px; color: ${MUTED}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; }
.roi-card { border-color: #d4c89e; background: #fffdf5; }
.roi-number { font-size: 26px; font-weight: 900; color: ${GOLD2}; line-height: 1; font-variant-numeric: tabular-nums; }
.roi-label { font-size: 10px; color: ${GOLD2}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
.roi-sub { font-size: 9px; color: ${MUTED}; margin-top: 2px; }

/* ── EXEC BOX ── */
.exec-box {
  border-left: 3px solid ${GOLD};
  background: #fffdf5;
  padding: 16px 20px;
  border-radius: 0 8px 8px 0;
  margin-bottom: 20px;
}
.exec-text { font-size: 13px; line-height: 1.8; color: ${INK}; }

/* ── RECOMMENDATION ── */
.rec-highlight {
  background: ${BLACK};
  border-radius: 10px;
  padding: 22px 24px;
  margin-bottom: 20px;
}
.rec-eyebrow { font-size: 8px; color: ${GOLD}; letter-spacing: 0.2em; text-transform: uppercase; font-weight: 700; margin-bottom: 8px; }
.rec-name { font-size: 20px; font-weight: 800; color: white; margin-bottom: 8px; }
.rec-desc { font-size: 12px; color: #8888a0; line-height: 1.7; margin-bottom: 12px; }
.rec-benefit {
  display: flex; gap: 8px; align-items: flex-start;
  background: rgba(26,122,74,0.15); border: 1px solid rgba(26,122,74,0.3);
  border-radius: 6px; padding: 8px 12px; margin-bottom: 12px;
  font-size: 12px; color: #5dd39e; font-weight: 600;
}
.rec-benefit-icon { color: #5dd39e; flex-shrink: 0; }
.rec-price { font-size: 11px; color: ${GOLD}; font-weight: 700; letter-spacing: 0.05em; }

/* ── FINDINGS ── */
.findings-section { }
.findings-header {
  display: flex; justify-content: space-between; align-items: center;
  padding-bottom: 10px; border-bottom: 1px solid ${BORDER}; margin-bottom: 4px;
}
.findings-title { font-size: 14px; font-weight: 700; color: ${INK}; }
.findings-score { }
.findings-list { }
.finding-row {
  display: flex; gap: 12px; align-items: flex-start;
  padding: 10px 0; border-bottom: 1px solid #f0ece4;
}
.finding-icon {
  width: 22px; height: 22px; border-radius: 50%; border: 1px solid;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 700; flex-shrink: 0; margin-top: 1px;
}
.finding-body { flex: 1; }
.finding-label { font-size: 12px; font-weight: 600; color: ${INK}; margin-bottom: 2px; }
.finding-detail { font-size: 11px; color: ${MUTED}; line-height: 1.5; }
.finding-evi { display: flex; gap: 8px; align-items: flex-start; margin-top: 3px; font-size: 11px; line-height: 1.45; }
.finding-evi-l { flex-shrink: 0; width: 96px; font-size: 8px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: ${GOLD2}; padding-top: 1px; }
.finding-evi span:last-child { color: ${INK}; }
.finding-badge {
  font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
  border: 1px solid; border-radius: 3px; padding: 2px 6px;
  white-space: nowrap; flex-shrink: 0; align-self: flex-start; margin-top: 2px;
}

/* ── COMPETITOR GAP ── */
.gap-box {
  background: #f8f4eb; border: 1px solid #e0d8c4;
  border-radius: 8px; padding: 16px 20px; margin-top: 24px;
}
.gap-eyebrow { font-size: 9px; font-weight: 700; color: ${GOLD2}; letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 6px; }
.gap-text { font-size: 12px; color: #4a4032; line-height: 1.7; }

/* ── AUTOMATIONS ── */
.total-bar {
  background: ${BLACK}; color: white; border-radius: 8px;
  padding: 16px 20px; margin-bottom: 20px;
  display: flex; justify-content: space-between; align-items: center; gap: 16px;
  flex-wrap: wrap;
}
.total-left { }
.total-label { font-size: 12px; font-weight: 600; color: #c8c8d8; }
.total-sub { font-size: 10px; color: #6666808; margin-top: 3px; color: #55556a; }
.total-value { font-size: 32px; font-weight: 900; color: ${GOLD}; white-space: nowrap; font-variant-numeric: tabular-nums; }
.total-freq { font-size: 14px; font-weight: 400; color: #888; }

.auto-list { display: flex; flex-direction: column; gap: 14px; }
.auto-card {
  border: 1px solid ${BORDER}; border-radius: 10px;
  overflow: hidden;
}
.auto-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding: 16px 18px 12px; gap: 16px;
}
.auto-left { flex: 1; }
.auto-priority { font-size: 9px; color: ${MUTED}; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 4px; }
.auto-name { font-size: 16px; font-weight: 800; color: ${INK}; margin-bottom: 4px; }
.auto-tag { font-size: 10px; color: ${MUTED}; font-weight: 500; }
.auto-roi-block { text-align: right; flex-shrink: 0; }
.auto-roi-label { font-size: 8px; font-weight: 700; color: ${MUTED}; letter-spacing: 0.14em; text-transform: uppercase; margin-bottom: 3px; }
.auto-roi-value { font-size: 28px; font-weight: 900; color: ${GOLD2}; line-height: 1; font-variant-numeric: tabular-nums; }

.auto-intro {
  margin: 0 18px 10px;
  padding: 10px 14px;
  border-left: 3px solid ${GOLD};
  background: #fffdf5;
  font-size: 12px; font-style: italic; color: #4a3a0a; line-height: 1.6;
  border-radius: 0 6px 6px 0;
}
.auto-desc { padding: 0 18px 10px; font-size: 12px; color: ${MUTED}; line-height: 1.6; }
.auto-angle {
  padding: 8px 18px; font-size: 11px; color: ${GREEN}; font-weight: 600;
  background: rgba(26,122,74,0.06); border-top: 1px solid rgba(26,122,74,0.12);
}
.auto-math {
  padding: 12px 18px;
  background: ${SUBTLE};
  border-top: 1px solid ${BORDER};
}
.auto-math-label {
  font-size: 8px; font-weight: 700; color: ${GOLD}; letter-spacing: 0.15em;
  text-transform: uppercase; margin-bottom: 8px;
}
.auto-step { display: flex; gap: 8px; align-items: flex-start; margin-bottom: 5px; font-size: 11px; }
.auto-step-n {
  width: 18px; height: 18px; border-radius: 50%; background: ${GOLD}; color: ${BLACK};
  display: flex; align-items: center; justify-content: center;
  font-size: 9px; font-weight: 800; flex-shrink: 0; margin-top: 1px;
}
.auto-step-text { color: ${INK}; line-height: 1.5; }
.auto-source { font-size: 9px; color: ${MUTED}; margin-top: 6px; font-style: italic; }

/* ── 30-DAY PLAN ── */
.plan-intro { font-size: 13px; color: ${MUTED}; line-height: 1.7; margin-bottom: 24px; }
.phases { display: flex; flex-direction: column; gap: 14px; }
.phase-block {
  border-left: 3px solid;
  padding: 14px 20px;
  background: ${SUBTLE};
  border-radius: 0 8px 8px 0;
}
.phase-header {
  font-size: 13px; font-weight: 700; margin-bottom: 10px;
  display: flex; align-items: center; gap: 8px;
}
.phase-emoji { font-size: 14px; }
.phase-actions { padding-left: 20px; display: flex; flex-direction: column; gap: 6px; }
.phase-action { font-size: 12px; color: ${INK}; line-height: 1.5; }

.quick-wins { margin-top: 24px; }
.qw-eyebrow { font-size: 9px; font-weight: 700; color: ${GOLD}; letter-spacing: 0.18em; text-transform: uppercase; margin-bottom: 10px; }
.qw-list { display: flex; flex-direction: column; gap: 8px; }
.qw-item { display: flex; gap: 12px; align-items: flex-start; }
.qw-num {
  width: 22px; height: 22px; border-radius: 50%;
  background: ${GOLD}; color: ${BLACK};
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 800; flex-shrink: 0;
}
.qw-text { font-size: 12px; color: ${INK}; line-height: 1.5; padding-top: 3px; }

/* ── CTA PAGE ── */
.cta-pg {
  background: ${BLACK}; color: white;
  padding: 60px 64px;
  display: flex; flex-direction: column;
  justify-content: space-between;
  min-height: 1123px;
}
.cta-top-brand {
  font-size: 11px; font-weight: 800; letter-spacing: 0.2em;
  color: ${GOLD}; text-transform: uppercase;
}
.cta-main { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 48px 0; }
.cta-eyebrow { font-size: 9px; font-weight: 700; letter-spacing: 0.22em; color: #55556a; text-transform: uppercase; margin-bottom: 14px; }
.cta-heading {
  font-size: 40px; font-weight: 900; line-height: 1.15;
  letter-spacing: -0.02em; color: white;
  margin-bottom: 28px;
}
.cta-number-row {
  display: flex; align-items: baseline; gap: 16px;
  margin-bottom: 24px; padding-bottom: 24px;
  border-bottom: 1px solid #1e1e2e;
}
.cta-big-num {
  font-size: 56px; font-weight: 900; color: ${GOLD};
  line-height: 1; font-variant-numeric: tabular-nums;
}
.cta-num-label { font-size: 14px; color: #8888a0; line-height: 1.5; }
.cta-body { font-size: 15px; color: #c0c0d0; line-height: 1.8; margin-bottom: 24px; max-width: 520px; }
.cta-promises { display: flex; flex-direction: column; gap: 10px; margin-bottom: 36px; }
.cta-promise { display: flex; gap: 10px; font-size: 13px; color: #a0a0b8; }
.cta-tick { color: ${GOLD}; font-weight: 700; flex-shrink: 0; }
.cta-btn {
  display: inline-block; background: ${GOLD}; color: ${BLACK};
  padding: 16px 36px; border-radius: 8px;
  font-size: 15px; font-weight: 800; text-decoration: none;
  letter-spacing: 0.02em;
  box-shadow: 0 0 40px rgba(245,166,35,0.35);
  align-self: flex-start; margin-bottom: 12px;
}
.cta-reassure { font-size: 11px; color: #55556a; }

.cta-footer { border-top: 1px solid #1e1e2e; padding-top: 24px; }
.cta-rule { display: none; }
.cta-footer-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
.cta-footer-brand { font-size: 14px; font-weight: 800; color: ${GOLD}; }
.cta-footer-url { font-size: 11px; color: #55556a; margin-top: 2px; }
.cta-footer-contact { font-size: 11px; color: #55556a; text-align: right; line-height: 1.7; }
.cta-disclaimer { font-size: 9px; color: #333344; line-height: 1.6; margin-bottom: 8px; }
.cta-prepared { font-size: 9px; color: #2a2a3a; }

/* ── PAGE FOOTER (interior) ── */
.page-footer {
  margin-top: auto; padding-top: 16px;
  border-top: 1px solid ${BORDER};
  display: flex; justify-content: space-between;
  font-size: 9px; color: #aaa; letter-spacing: 0.04em;
}
`;

// ─────────────────────────────────────────────────────────────────────────────
// MAIN BUILDER
// ─────────────────────────────────────────────────────────────────────────────

// Watermark CSS for the free tier — a faint repeating stamp on every page that
// survives print-to-PDF (print-color-adjust keeps it visible).
const WATERMARK_CSS = `
.page { position: relative; }
.page::after {
  content: "PREVIEW";
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  font-family: 'Inter','Helvetica Neue',sans-serif; font-weight: 800;
  font-size: 120px; color: rgba(120,120,120,0.10);
  transform: rotate(-32deg); pointer-events: none; z-index: 9999;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}`;

export function buildHTML(r, { branding = null, watermark = false } = {}) {
  const whiteLabel = !!(branding && (branding.name || branding.logoUrl));
  const brand = {
    name: branding?.name || "Preset & Profit",
    url: whiteLabel ? "" : "presetandprofit.com",
    logoUrl: branding?.logoUrl || null,
    whiteLabel,
  };
  const title = whiteLabel
    ? `${esc(brand.name)} — ${esc(r.businessName)} Report`
    : `Preset &amp; Profit — ${esc(r.businessName)} Automation Report`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>
  <style>${CSS}${watermark ? WATERMARK_CSS : ""}</style>
</head>
<body>

<!-- Screen-only print bar -->
<div class="screen-bar">
  ${esc(brand.name)} — ${esc(r.businessName)} Report &nbsp;·&nbsp;
  <button onclick="window.print()">Save as PDF ↓</button>
</div>

${coverPage(r, brand)}
${summaryPage(r, brand)}
${findingsPage(r, brand)}
${revenueOpportunitiesPage(r, brand)}
${planPage(r, brand)}
${whiteLabel ? "" : ctaPage(r)}

</body>
</html>`;
}

export function downloadReport(r, opts = {}) {
  const html = buildHTML(r, opts);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const prefix = opts.branding?.name
    ? opts.branding.name.replace(/[^\w]+/g, "-")
    : "Preset-Profit";
  const a    = document.createElement("a");
  a.href     = URL.createObjectURL(blob);
  a.download = `${prefix}-Report-${(r.businessName || "Report").replace(/\s+/g,"-")}-${new Date().toISOString().slice(0,10)}.html`;
  a.click();
  URL.revokeObjectURL(a.href);
}
