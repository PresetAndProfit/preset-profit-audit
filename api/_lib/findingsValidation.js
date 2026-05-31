// api/_lib/findingsValidation.js — SERVER-ONLY guardrails on the LLM output.
// The model is instructed to follow these rules; this is the trust-but-verify
// layer. validateReport() returns the list of violations; the orchestrator uses
// them for one corrective retry, then falls back to the deterministic engine.
import { getArchetype } from "../../src/lib/industryProfiles.js";

const BEST_PRACTICE_PREFIX = /^industry best practice:/i;

// Phrases that assert specific-competitor behaviour (banned — we never scrape
// competitors). General "top performers / most restaurants" framing is fine.
const FAKE_COMPETITOR = /\b(your |local |nearby |other )?competitors?\b[^.]*\b(offer|have|do|use|provide|let|are)\b/i;

function fieldsOf(report) {
  const f = [];
  for (const x of report.findings || []) {
    f.push(x.title || "", x.recommendation || "", x.observation || "", x.impact || "");
  }
  f.push(report.executiveSummary || "", report.competitorBenchmark || "");
  for (const q of report.quickWins || []) f.push(q || "");
  return f;
}

function termRegex(term) {
  // Word-boundary, case-insensitive, whitespace-tolerant for multi-word phrases.
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`\\b${escaped}\\b`, "i");
}

export function validateReport(report, { signals } = {}) {
  const violations = [];

  if (!report || !Array.isArray(report.findings) || report.findings.length < 4) {
    violations.push("Report must contain at least 4 findings.");
    return { ok: false, violations };
  }
  if (!report.businessType?.archetype) {
    violations.push("businessType.archetype is required.");
    return { ok: false, violations };
  }

  const archetype = getArchetype(report.businessType.archetype);

  // 1. Grounding contract.
  report.findings.forEach((f, i) => {
    const ev = (f.evidence || "").trim();
    if (f.grounded === false) {
      if (!BEST_PRACTICE_PREFIX.test(ev)) {
        violations.push(`Finding ${i + 1} ("${f.title}") is grounded:false but its evidence does not begin with "Industry best practice:".`);
      }
    } else {
      if (!ev) {
        violations.push(`Finding ${i + 1} ("${f.title}") is grounded:true but cites no evidence signal.`);
      } else if (BEST_PRACTICE_PREFIX.test(ev)) {
        violations.push(`Finding ${i + 1} ("${f.title}") is grounded:true but its evidence is labelled "Industry best practice:" — set grounded:false instead.`);
      }
    }
  });

  // 2. Archetype vocabulary fit. Hospitality may use consultation/quote-style
  //    language ONLY when the site actually shows catering/events.
  const cateringException = archetype.id === "hospitality" && signals?.hasCateringEvents;
  if (!cateringException) {
    const haystacks = fieldsOf(report);
    for (const term of archetype.forbidden) {
      const re = termRegex(term);
      if (haystacks.some((h) => re.test(h))) {
        violations.push(`Forbidden vocabulary for a ${archetype.label}: "${term}". Use this archetype's vocabulary (${archetype.conversionActions.join("; ")}).`);
      }
    }
  }

  // 3. No fabricated competitor claims.
  for (const h of fieldsOf(report)) {
    if (FAKE_COMPETITOR.test(h)) {
      violations.push(`Specific-competitor claim detected ("${h.match(FAKE_COMPETITOR)[0]}…"). Frame benchmarks as general industry norms, not what competitors do.`);
      break;
    }
  }

  return { ok: violations.length === 0, violations };
}

// Soft quality signal (not a hard failure): how many of the archetype's
// must-mention topics the report touches. Logged, not enforced.
export function mustMentionCoverage(report) {
  const archetype = getArchetype(report.businessType?.archetype);
  const text = fieldsOf(report).join(" ").toLowerCase();
  const hit = archetype.mustMention.filter((t) => {
    const head = t.split(/[/(]/)[0].trim().toLowerCase();
    return head && text.includes(head);
  });
  return { covered: hit.length, total: archetype.mustMention.length };
}
