import { useState } from "react";
import { Btn, Tag, ScoreRing } from "./ui/index.jsx";
import { STAGES, deriveStage, stageColor, stageLabel, isClosed, dealActivation } from "../lib/dealEngine.js";
import { setStage, appendNote, appendActivity } from "../lib/pipeline.js";
import { timeAgo } from "../lib/helpers.js";
import DealUpsell from "./DealUpsell.jsx";

const fmtMoney = cents => `$${Math.round((cents || 0) / 100).toLocaleString()}`;
const toLocalInput = iso => {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
};

// Side panel for working ONE deal: contact, stage, follow-up scheduling, notes,
// activity log, jump-to-engine links, and the close-time automation upsell.
export default function DealDrawer({ deal, updateDeal, onClose, onViewReport, onViewRoadmap, onViewOutreach, onDeleteAudit, onStartActivation }) {
  const [email, setEmail] = useState(deal.contact_email || "");
  const [name, setName] = useState(deal.contact_name || "");
  const [note, setNote] = useState("");
  const [when, setWhen] = useState(toLocalInput(deal.next_action_at));
  const [busy, setBusy] = useState(false);
  const [seqBusy, setSeqBusy] = useState(false);
  const [seqErr, setSeqErr] = useState("");

  const stage = deriveStage(deal);
  const crm = deal.crm || {};
  const activity = [...(crm.activity || [])].reverse();
  const notes = [...(crm.notes || [])].reverse();

  const persist = async patch => { setBusy(true); try { await updateDeal(deal.id, patch); } finally { setBusy(false); } };

  // Booked call = the funnel's money event. Log it, pull the deal into the
  // active "follow-up" stage, and STOP the activation sequence (mark booked).
  const markCallBooked = () => {
    const base = crm.activation ? { ...crm, activation: { ...crm.activation, booked: true } } : crm;
    return persist({
      stage: isClosed(stage) ? stage : "followup",
      crm: appendActivity(base, "call", "📞 Call booked"),
    });
  };

  const act = dealActivation(deal);
  const startSeq = async () => {
    if (!onStartActivation) return;
    setSeqErr(""); setSeqBusy(true);
    const r = await onStartActivation(deal);
    setSeqBusy(false);
    if (!r?.ok) {
      setSeqErr(
        r?.error === "missing-booking-link" ? "Set your booking link in Account → Booking & outreach identity first."
        : r?.error === "missing-contact-email" ? "Add the prospect's email above and save first."
        : "Couldn't start the sequence. Try again."
      );
    }
  };

  const saveContact = () => persist({ contact_email: email || null, contact_name: name || null });
  const changeStage = e => setStage(updateDeal, deal, e.target.value);
  const addNote = () => { if (!note.trim()) return; persist({ crm: appendNote(crm, note.trim()) }); setNote(""); };
  const scheduleFollowup = () => {
    const iso = when ? new Date(when).toISOString() : null;
    persist({
      next_action_at: iso,
      crm: appendActivity(crm, "followup", iso ? `Follow-up set for ${new Date(iso).toLocaleString()}` : "Follow-up cleared"),
    });
  };
  const quick = days => {
    const d = new Date(); d.setDate(d.getDate() + days);
    setWhen(toLocalInput(d.toISOString()));
    persist({ next_action_at: d.toISOString(), crm: appendActivity(crm, "followup", `Follow-up in ${days}d`) });
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 40 }} />
      <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "min(460px, 100vw)", background: "var(--bg, #08080a)", borderLeft: "1px solid var(--border)", zIndex: 41, overflowY: "auto", boxShadow: "-12px 0 48px rgba(0,0,0,0.5)" }}>
        <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, background: "var(--panel)", zIndex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "Sora", fontWeight: 800, fontSize: 18 }}>{deal.businessName}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
                <Tag color={stageColor(stage)}>{stageLabel(stage)}</Tag>
                <Tag color="#6b6b85">{deal.industry}</Tag>
                {deal.deal_value_cents ? <Tag color="var(--green)">{fmtMoney(deal.deal_value_cents)} deal</Tag> : null}
              </div>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
          </div>
        </div>

        <div style={{ padding: "18px 22px", display: "grid", gap: 18 }}>
          {/* Stage */}
          <Section label="Pipeline Stage">
            <select value={stage} onChange={changeStage} disabled={busy} style={selectStyle}>
              {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </Section>

          {/* Jump to engines — the connected workflow */}
          <Section label="Work the Deal">
            <div style={{ display: "grid", gap: 8 }}>
              <Btn small variant="ghost" onClick={() => onViewReport?.(deal)}>① View Audit Report</Btn>
              <Btn small variant="ghost" onClick={() => onViewRoadmap?.(deal)}>② Build Roadmap &amp; Proposal →</Btn>
              <Btn small variant="ghost" onClick={() => onViewOutreach?.(deal)}>③ Generate Outreach →</Btn>
              {!isClosed(stage) && <Btn small variant="primary" onClick={markCallBooked} disabled={busy}>📞 Mark call booked</Btn>}
            </div>
          </Section>

          {/* Contact */}
          <Section label="Contact">
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Contact name" style={inputStyle} />
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="prospect@email.com" style={{ ...inputStyle, marginTop: 8 }} />
            <Btn small variant="ghost" onClick={saveContact} disabled={busy}>Save contact</Btn>
          </Section>

          {/* Follow-up scheduling */}
          <Section label="Next Action / Follow-up">
            <input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} style={inputStyle} />
            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
              <Btn small variant="ghost" onClick={() => quick(1)}>+1d</Btn>
              <Btn small variant="ghost" onClick={() => quick(3)}>+3d</Btn>
              <Btn small variant="ghost" onClick={() => quick(7)}>+7d</Btn>
              <Btn small variant="primary" onClick={scheduleFollowup} disabled={busy}>Set</Btn>
            </div>
            {deal.next_action_at && (
              <div style={{ fontSize: 11, color: new Date(deal.next_action_at) <= new Date() ? "var(--red)" : "var(--muted)", marginTop: 6 }}>
                {new Date(deal.next_action_at) <= new Date() ? "⏰ Due " : "Scheduled "}{new Date(deal.next_action_at).toLocaleString()}
              </div>
            )}
          </Section>

          {/* Activation nudge sequence — Audit → Booked Call */}
          <Section label="Activation Sequence">
            {!act ? (
              <>
                <div style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.6, marginBottom: 8 }}>
                  Auto-nudge {email || "the prospect"} until they book: an immediate email, then 24-hour and 7-day reminders — each with their audit numbers and your booking link. Stops the moment a call is booked.
                </div>
                <Btn small variant="primary" disabled={seqBusy || !deal.contact_email} onClick={startSeq}>
                  {seqBusy ? "Starting…" : "▶ Start activation sequence"}
                </Btn>
                {!deal.contact_email && <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>Add the prospect's email above first.</div>}
                {seqErr && <div style={{ fontSize: 11, color: "var(--red)", marginTop: 6 }}>{seqErr}</div>}
              </>
            ) : (
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: act.booked ? "var(--green)" : "var(--amber)" }}>
                    {act.booked ? "✅ Call booked — sequence stopped" : "● Sequence active"}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--muted)" }}>{act.sent}/3 sent</span>
                </div>
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 11, color: "var(--muted)" }}>
                  <span>📤 Sent <strong style={{ color: "var(--text)" }}>{act.sent}</strong></span>
                  <span>👁 Opened <strong style={{ color: "var(--text)" }}>{act.opened}</strong></span>
                  <span>🔗 Clicked <strong style={{ color: act.clicked ? "var(--green)" : "var(--text)" }}>{act.clicked}</strong></span>
                  <span>📞 Booked <strong style={{ color: act.booked ? "var(--green)" : "var(--text)" }}>{act.booked ? "Yes" : "No"}</strong></span>
                </div>
              </div>
            )}
          </Section>

          {/* Close-time upsell */}
          {!isClosed(stage) && stage !== "lead" && <DealUpsell deal={deal} updateDeal={updateDeal} />}
          {stage === "closed_won" && <DealUpsell deal={deal} updateDeal={updateDeal} won />}

          {/* Notes */}
          <Section label="Notes">
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Log a call, an objection, a next step…" rows={2} style={{ ...inputStyle, resize: "vertical" }} />
            <Btn small variant="ghost" onClick={addNote} disabled={busy || !note.trim()}>Add note</Btn>
            <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
              {notes.map((n, i) => (
                <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 10px" }}>
                  <div style={{ fontSize: 12, lineHeight: 1.5 }}>{n.text}</div>
                  <div style={{ fontSize: 9, color: "var(--dim)", marginTop: 4 }}>{timeAgo(n.at)}</div>
                </div>
              ))}
              {!notes.length && <div style={{ fontSize: 11, color: "var(--dim)" }}>No notes yet.</div>}
            </div>
          </Section>

          {/* Activity */}
          <Section label="Activity">
            <div style={{ display: "grid", gap: 6 }}>
              {activity.slice(0, 12).map((ev, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 11, color: "var(--muted)" }}>
                  <span>{ev.detail}</span><span style={{ color: "var(--dim)", flexShrink: 0 }}>{timeAgo(ev.at)}</span>
                </div>
              ))}
              {!activity.length && <div style={{ fontSize: 11, color: "var(--dim)" }}>No activity logged yet.</div>}
            </div>
          </Section>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8, borderTop: "1px solid var(--border)" }}>
            <ScoreRing score={deal.overallScore || 0} size={40} stroke={4} />
            <button onClick={() => { if (window.confirm(`Delete the deal for "${deal.businessName}"? This removes the audit too.`)) { onDeleteAudit?.(deal.id); onClose(); } }}
              style={{ background: "none", border: "1px solid var(--border-bright)", borderRadius: 6, color: "var(--muted)", padding: "6px 12px", cursor: "pointer", fontFamily: "IBM Plex Mono", fontSize: 11 }}>Delete deal</button>
          </div>
        </div>
      </div>
    </>
  );
}

function Section({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}

const inputStyle = { width: "100%", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 6, padding: "9px 12px", color: "var(--text)", fontFamily: "IBM Plex Mono", fontSize: 12, outline: "none" };
const selectStyle = { ...inputStyle };
