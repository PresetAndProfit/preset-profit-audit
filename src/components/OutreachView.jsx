import { useState, useMemo } from "react";
import { Btn, Tag } from "./ui/index.jsx";
import { generateOutreach, outreachSummary } from "../lib/outreachEngine.js";
import { stampStage, appendActivity } from "../lib/pipeline.js";

function CopyBtn({ text, label = "Copy" }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* clipboard blocked */ }
  };
  return <Btn small variant={done ? "success" : "ghost"} onClick={copy}>{done ? "✓ Copied" : label}</Btn>;
}

function Block({ title, meta, text, children }) {
  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--border)", flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontFamily: "Syne", fontWeight: 700, fontSize: 14 }}>{title}</div>
          {meta && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{meta}</div>}
        </div>
        {text != null && <CopyBtn text={text} />}
      </div>
      <div style={{ padding: "14px 16px" }}>
        {children || <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 13, lineHeight: 1.65, color: "var(--text)", margin: 0 }}>{text}</pre>}
      </div>
    </div>
  );
}

// Renders the generated outreach for a Deal, lets the operator copy each asset,
// persists a summary to the Deal (advancing stage → Outreach), and schedules the
// first follow-up. The actual copy is re-derivable, so we store only a summary.
export default function OutreachView({ report: deal, updateDeal, onBack, branding = null, cta = null, onStartActivation = null }) {
  const senderCompany = cta?.senderCompany || branding?.name || "Preset & Profit";
  const senderName = cta?.senderName || "";
  const calendarUrl = cta?.calendarUrl || "";
  const out = useMemo(
    () => generateOutreach(deal, { senderCompany, senderName, calendarUrl, toName: deal.contact_name || "" }),
    [deal, senderCompany, senderName, calendarUrl]
  );
  const [saved, setSaved] = useState(!!deal.crm?.outreach);
  const [seq, setSeq] = useState(deal.crm?.activation?.enabled ? "on" : "");
  const startSeq = async () => {
    if (!onStartActivation) return;
    setSeq("busy");
    const r = await onStartActivation(deal);
    setSeq(r?.ok ? "on" : (r?.error || "err"));
  };

  if (!out) return null;
  const h = out.headline;

  const saveToDeal = async () => {
    const crm = appendActivity({ ...(deal.crm || {}), outreach: outreachSummary(out) }, "outreach", "Outreach generated");
    await stampStage(updateDeal, deal, "outreach", { crm, detail: "outreach ready" });
    setSaved(true);
  };
  const scheduleFollowup = () => {
    const d = new Date(); d.setDate(d.getDate() + 3);
    updateDeal(deal.id, {
      next_action_at: d.toISOString(),
      crm: appendActivity(deal.crm || {}, "followup", "Follow-up #1 scheduled (+3d)"),
    });
  };

  return (
    <div className="page-pad" style={{ animation: "fadeUp .4s ease", paddingBottom: 100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div>
          {onBack && <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 12, marginBottom: 8, fontFamily: "IBM Plex Mono" }}>← Back</button>}
          <h1 style={{ fontFamily: "Syne", fontSize: 22, fontWeight: 800 }}>{deal.businessName} — Outreach</h1>
          <div style={{ fontSize: 11, color: "var(--amber)", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 4 }}>
            Conversion copy · grounded in {h.monthly}/mo leak · {h.roi} ROI
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn variant="ghost" onClick={scheduleFollowup}>⏰ Schedule follow-up</Btn>
          <Btn variant={saved ? "success" : "ghost"} onClick={saveToDeal}>{saved ? "✓ Saved to deal" : "Save to deal"}</Btn>
          {onStartActivation && (
            <Btn variant={seq === "on" ? "success" : "primary"} disabled={seq === "busy" || seq === "on" || !deal.contact_email} onClick={startSeq}>
              {seq === "on" ? "✓ Sequence running" : seq === "busy" ? "Starting…" : "▶ Auto-send sequence"}
            </Btn>
          )}
        </div>
      </div>

      {/* Sequence status / gating hints */}
      {onStartActivation && seq !== "on" && (
        <div style={{ fontSize: 11, color: seq && seq !== "busy" ? "var(--red)" : "var(--muted)", marginBottom: 12 }}>
          {!deal.contact_email
            ? "Add the prospect's email on the deal to auto-send this sequence (immediate + 24h + 7d)."
            : seq === "missing-booking-link" ? "Set your booking link in Account → Booking & outreach identity, then start the sequence."
            : seq === "missing-contact-email" ? "Add the prospect's email on the deal first."
            : seq && seq !== "busy" ? "Couldn't start the sequence — try again."
            : "Auto-send arms a 3-touch sequence to this prospect that stops the moment they book."}
        </div>
      )}

      {/* Booking-link nudge — embeds a real CTA into the copy */}
      {!calendarUrl && (
        <div style={{ background: "rgba(245,166,35,0.08)", border: "1px dashed var(--amber)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "var(--amber)", lineHeight: 1.6 }}>
          💡 Add your booking link in <strong>Account → Booking &amp; outreach identity</strong> and it'll be embedded into every email automatically — so prospects can book a call in one click.
        </div>
      )}

      {/* Subject-line picks */}
      <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: "14px 16px", marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Subject lines — A/B these</div>
        <div style={{ display: "grid", gap: 8 }}>
          {out.subjectLines.map((s, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 12px" }}>
              <span style={{ fontSize: 13 }}>{s}</span>
              <CopyBtn text={s} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        <Block title="Cold Email" meta={`Subject: ${out.coldEmail.subject}`} text={out.coldEmail.body} />
        <Block title="Short Email" meta={`Subject: ${out.shortEmail.subject}`} text={out.shortEmail.body} />

        <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.12em", marginTop: 4 }}>Follow-up sequence</div>
        {out.followUps.map((f, i) => (
          <Block key={i} title={`Follow-up ${i + 1} · Day ${f.day}`} meta={`${f.channel} · Subject: ${f.subject}`} text={f.body} />
        ))}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Block title="LinkedIn / DM" text={out.linkedinDM} />
          <Block title="SMS" text={out.sms} />
        </div>
        <Block title="Voicemail Script" text={out.voicemail} />

        <Block title="Phone Call Script" text={[out.callScript.opener, out.callScript.hook, out.callScript.pitch, out.callScript.objection, out.callScript.close].join("\n\n")}>
          <div style={{ display: "grid", gap: 12 }}>
            {[["Opener", out.callScript.opener], ["The hook", out.callScript.hook], ["Pitch", out.callScript.pitch], ["Objection handler", out.callScript.objection], ["Close", out.callScript.close]].map(([label, txt]) => (
              <div key={label}>
                <Tag color="var(--amber)">{label}</Tag>
                <p style={{ fontSize: 13, lineHeight: 1.6, marginTop: 6 }}>{txt}</p>
              </div>
            ))}
          </div>
        </Block>
      </div>

      <div style={{ marginTop: 24, padding: "14px 18px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 11, color: "var(--muted)", lineHeight: 1.7 }}>
        Every figure above is pulled from this prospect's own audit and roadmap — the {h.monthly}/mo leak, the {h.roi} first-year ROI, and the top fix ({h.topFix}). Swap in your calendar link and sender name before sending.
      </div>
    </div>
  );
}
