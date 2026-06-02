import { useState, useEffect, useCallback } from "react";
import { authedJson } from "../lib/api.js";
import { StatCard, Tag, Btn, Field, Select } from "./ui/index.jsx";

// ── Admin Command Center ──────────────────────────────────────────────────────
// Single guarded API (/api/admin/console) verifies admin server-side; this is
// the operator console: Overview · Activity · Users · Audits · Revenue · Controls.
const call = (action, params = {}) => authedJson("/api/admin/console", { body: { action, ...params } });

const money = (n) => `$${Math.round(Number(n) || 0).toLocaleString()}`;
const ago = (d) => {
  const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const TABS = ["Overview", "Activity", "Users", "Audits", "Revenue", "Emails", "Controls"];

const Panel = ({ children, style }) => (
  <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 10, padding: 20, ...style }}>{children}</div>
);
const Th = ({ children }) => <th style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap", textAlign: "left", color: "var(--muted)", fontSize: 10, letterSpacing: "0.08em" }}>{children}</th>;
const Td = ({ children, mono }) => <td style={{ padding: "9px 12px", fontFamily: mono ? "IBM Plex Mono" : "inherit", fontSize: 12 }}>{children}</td>;
const planColor = (p) => (p === "agency" ? "var(--green)" : p === "professional" ? "var(--amber)" : "var(--muted)");

export default function AdminView() {
  const [tab, setTab] = useState("Overview");
  return (
    <div className="page-pad" style={{ maxWidth: 1100, margin: "0 auto", animation: "fadeUp .4s ease" }}>
      <h1 style={{ fontFamily: "Sora", fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Admin Command Center</h1>
      <p style={{ color: "var(--muted)", fontSize: 13, marginBottom: 20 }}>Operate the Preset &amp; Profit platform — metrics, users, audits, revenue, and system controls.</p>

      <div style={{ display: "flex", gap: 2, marginBottom: 20, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: 4, width: "fit-content", flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "7px 14px", borderRadius: 6, border: "none", cursor: "pointer",
            fontFamily: "IBM Plex Mono", fontSize: 11, letterSpacing: "0.05em", textTransform: "uppercase",
            background: tab === t ? "var(--amber)" : "transparent", color: tab === t ? "var(--ink)" : "var(--muted)",
            fontWeight: tab === t ? 600 : 400, whiteSpace: "nowrap",
          }}>{t}</button>
        ))}
      </div>

      {tab === "Overview" && <Overview />}
      {tab === "Activity" && <Activity />}
      {tab === "Users" && <Users />}
      {tab === "Audits" && <Audits />}
      {tab === "Revenue" && <Revenue />}
      {tab === "Emails" && <Emails />}
      {tab === "Controls" && <Controls />}
    </div>
  );
}

function useFetch(action, params) {
  const [state, setState] = useState({ loading: true, error: "", data: null });
  const paramsKey = JSON.stringify(params || {});
  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    const { ok, status, json } = await call(action, JSON.parse(paramsKey));
    setState({ loading: false, error: ok ? "" : json?.error || `error-${status}`, data: ok ? json : null });
  }, [action, paramsKey]);
  // one-shot data fetch on mount / param change (external-system subscription)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}

const Loading = () => <div style={{ color: "var(--muted)", fontSize: 12 }}>Loading…</div>;
const ErrorBox = ({ error }) => (
  <div style={{ background: "rgba(255,71,87,0.1)", border: "1px solid rgba(255,71,87,0.3)", borderRadius: 6, padding: "10px 12px", fontSize: 12, color: "#ff4757" }}>
    {error === "forbidden" ? "You don't have admin access." : `Could not load (${error}).`}
  </div>
);

// ── OVERVIEW ──────────────────────────────────────────────────────────────────
function Overview() {
  const { loading, error, data } = useFetch("overview");
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  const o = data.overview;
  const cards = [
    ["Total Users", o.totalUsers, "var(--amber)"], ["Active Trials", o.activeTrials, "var(--blue)"],
    ["Paid Subscribers", o.paidSubscribers, "var(--green)"], ["MRR", money(o.mrr), "var(--green)"],
    ["Audits Today", o.auditsToday, "var(--amber)"], ["Audits This Month", o.auditsMonth, "var(--amber)"],
    ["Conversion Rate", `${o.conversionRate}%`, "var(--green)"], ["ARR", money(o.arr), "var(--green)"],
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}>
      {cards.map(([label, value, accent]) => <StatCard key={label} label={label} value={value} accent={accent} />)}
    </div>
  );
}

// ── ACTIVITY ──────────────────────────────────────────────────────────────────
const FEED_ICON = { signup: ["◎", "var(--blue)"], audit: ["⊕", "var(--amber)"], upgrade: ["▲", "var(--green)"], admin_upgrade: ["▲", "var(--green)"], cancellation: ["▼", "var(--red)"], failed_payment: ["✗", "var(--red)"], admin_downgrade: ["▼", "var(--amber)"], admin_reset: ["↺", "var(--muted)"], admin_delete: ["✗", "var(--red)"], settings_changed: ["⚙", "var(--muted)"] };
function Activity() {
  const { loading, error, data } = useFetch("activity", { limit: 50 });
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  return (
    <Panel style={{ padding: 0 }}>
      {(data.feed || []).map((e) => {
        const [icon, color] = FEED_ICON[e.type] || ["•", "var(--muted)"];
        return (
          <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderBottom: "1px solid var(--border)" }}>
            <span style={{ color, fontSize: 14, width: 18, textAlign: "center" }}>{icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <span style={{ fontWeight: 600 }}>{e.who}</span> <span style={{ color: "var(--muted)" }}>{e.text}</span>
              </div>
            </div>
            <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "IBM Plex Mono", whiteSpace: "nowrap" }}>{ago(e.at)}</span>
          </div>
        );
      })}
      {!(data.feed || []).length && <div style={{ padding: 16, color: "var(--muted)", fontSize: 12 }}>No recent activity.</div>}
    </Panel>
  );
}

// ── USERS ─────────────────────────────────────────────────────────────────────
function Users() {
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const { loading, error, data, reload } = useFetch("users", { q: query, limit: 100 });
  const [selected, setSelected] = useState(null);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <form onSubmit={(e) => { e.preventDefault(); setQuery(q); }} style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
        <div style={{ flex: 1, maxWidth: 360 }}><Field label="Search users by email" value={q} onChange={setQ} placeholder="name@example.com" /></div>
        <Btn small onClick={() => setQuery(q)}>Search</Btn>
      </form>

      {loading ? <Loading /> : error ? <ErrorBox error={error} /> : (
        <Panel style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["EMAIL", "PLAN", "STATUS", "AUDITS", "30D", "JOINED", ""].map((h) => <Th key={h}>{h}</Th>)}</tr></thead>
              <tbody>
                {(data.users || []).map((u) => (
                  <tr key={u.user_id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <Td>{u.email}{u.is_admin ? " ★" : ""}<div style={{ color: "var(--muted)", fontSize: 10 }}>{u.company_name || u.full_name || ""}</div></Td>
                    <Td><Tag color={planColor(u.plan)}>{u.plan}</Tag></Td>
                    <Td><span style={{ color: "var(--muted)" }}>{u.status || "—"}</span></Td>
                    <Td mono>{u.total_audits}</Td>
                    <Td mono>{u.audits_30d}</Td>
                    <Td><span style={{ color: "var(--muted)" }}>{u.joined_at ? new Date(u.joined_at).toLocaleDateString() : "—"}</span></Td>
                    <Td><Btn small variant="ghost" onClick={() => setSelected(u)}>Manage</Btn></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!(data.users || []).length && <div style={{ padding: 16, color: "var(--muted)", fontSize: 12 }}>No users found.</div>}
        </Panel>
      )}

      {selected && <UserDrawer user={selected} onClose={() => setSelected(null)} onChanged={() => { setSelected(null); reload(); }} />}
    </div>
  );
}

function UserDrawer({ user, onClose, onChanged }) {
  const [busy, setBusy] = useState("");
  const [plan, setPlan] = useState("professional");
  const [msg, setMsg] = useState("");

  const act = async (op, params = {}) => {
    setBusy(op); setMsg("");
    const { ok, json } = await call("user_action", { userId: user.user_id, op, ...params });
    setBusy("");
    if (ok && json.ok) onChanged();
    else setMsg(json?.error || "action-failed");
  };
  const confirmAct = (op, label, params) => { if (window.confirm(`${label} for ${user.email}? This cannot be undone.`)) act(op, params); };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 40, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(420px, 92vw)", height: "100%", background: "var(--panel)", borderLeft: "1px solid var(--border)", padding: 24, overflowY: "auto", animation: "fadeUp .25s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontFamily: "Sora", fontSize: 18, fontWeight: 800 }}>Manage account</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        <div style={{ fontSize: 13, marginBottom: 4 }}>{user.email}{user.is_admin ? " ★" : ""}</div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>{user.full_name || user.company_name || ""}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          <Tag color={planColor(user.plan)}>{user.plan}</Tag>
          <Tag color="var(--muted)">{user.status || "—"}</Tag>
          <Tag color="var(--blue)">{user.total_audits} audits</Tag>
        </div>

        {msg && <div style={{ background: "rgba(255,71,87,0.1)", border: "1px solid rgba(255,71,87,0.3)", borderRadius: 6, padding: "8px 10px", fontSize: 11, color: "#ff4757", marginBottom: 14 }}>{msg}</div>}

        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Change plan</div>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}><Select label="Set plan" value={plan} onChange={setPlan} options={["professional", "agency"]} /></div>
              <Btn small onClick={() => act("upgrade", { plan })} disabled={busy === "upgrade"}>{busy === "upgrade" ? "…" : "Upgrade"}</Btn>
            </div>
            <div style={{ marginTop: 10 }}><Btn small full variant="ghost" onClick={() => act("downgrade")} disabled={busy === "downgrade"}>{busy === "downgrade" ? "…" : "Downgrade to Free"}</Btn></div>
          </div>

          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 10, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Maintenance</div>
            <Btn small full variant="ghost" onClick={() => confirmAct("reset", "Reset usage (deletes this user's audits)")} disabled={busy === "reset"}>{busy === "reset" ? "…" : "Reset usage"}</Btn>
            <div style={{ marginTop: 10 }}>
              <button onClick={() => confirmAct("delete", "Permanently delete the account")} disabled={busy === "delete"} style={{ width: "100%", background: "rgba(255,71,87,0.1)", border: "1px solid rgba(255,71,87,0.35)", color: "#ff4757", borderRadius: 6, padding: "9px 10px", cursor: "pointer", fontFamily: "IBM Plex Mono", fontSize: 11, fontWeight: 600 }}>{busy === "delete" ? "…" : "Delete account"}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── AUDITS ────────────────────────────────────────────────────────────────────
function Audits() {
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [plan, setPlan] = useState("all");
  const { loading, error, data } = useFetch("audits", { q: query, plan: plan === "all" ? "" : plan, limit: 150 });
  const [detail, setDetail] = useState(null);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <form onSubmit={(e) => { e.preventDefault(); setQuery(q); }} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 220, maxWidth: 360 }}><Field label="Search by business or URL" value={q} onChange={setQ} placeholder="restaurant…" /></div>
        <div style={{ width: 160 }}><Select label="Plan" value={plan} onChange={setPlan} options={["all", "free", "professional", "agency"]} /></div>
        <Btn small onClick={() => setQuery(q)}>Search</Btn>
      </form>

      {loading ? <Loading /> : error ? <ErrorBox error={error} /> : (
        <Panel style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["BUSINESS", "URL", "SCORE", "PLAN", "OWNER", "DATE", ""].map((h) => <Th key={h}>{h}</Th>)}</tr></thead>
              <tbody>
                {(data.audits || []).map((a) => (
                  <tr key={a.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <Td>{a.business_name || "—"}</Td>
                    <Td><span style={{ color: "var(--muted)" }}>{a.url || "—"}</span></Td>
                    <Td mono>{a.overall_score ?? "—"}</Td>
                    <Td><Tag color={planColor(a.plan)}>{a.plan}</Tag></Td>
                    <Td><span style={{ color: "var(--muted)" }}>{a.email}</span></Td>
                    <Td><span style={{ color: "var(--muted)" }}>{new Date(a.created_at).toLocaleDateString()}</span></Td>
                    <Td><Btn small variant="ghost" onClick={() => setDetail(a.id)}>View</Btn></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!(data.audits || []).length && <div style={{ padding: 16, color: "var(--muted)", fontSize: 12 }}>No audits found.</div>}
        </Panel>
      )}
      {detail && <AuditDetail auditId={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function AuditDetail({ auditId, onClose }) {
  const { loading, error, data } = useFetch("audit_detail", { auditId });
  const a = data?.audit;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 40, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(560px, 94vw)", height: "100%", background: "var(--panel)", borderLeft: "1px solid var(--border)", padding: 24, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontFamily: "Sora", fontSize: 18, fontWeight: 800 }}>Audit detail</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        {loading ? <Loading /> : error ? <ErrorBox error={error} /> : !a ? <div style={{ color: "var(--muted)", fontSize: 12 }}>Not found.</div> : (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "Sora" }}>{a.business_name || "—"}</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>{a.url} · Score {a.overall_score ?? "—"} · {new Date(a.created_at).toLocaleString()}</div>
            {a.data?.detectedBusinessType?.label && <div style={{ fontSize: 12 }}><Tag color="var(--amber)">{a.data.detectedBusinessType.label}</Tag></div>}
            {a.data?.executiveSummary && (
              <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: 14, fontSize: 12.5, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{a.data.executiveSummary}</div>
            )}
            <div style={{ fontSize: 11, color: "var(--muted)" }}>{(a.data?.leadFindings?.length || 0) + (a.data?.websiteFindings?.length || 0)} findings · {a.data?.aiGenerated ? "AI-generated" : "deterministic"}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── REVENUE ───────────────────────────────────────────────────────────────────
function Revenue() {
  const { loading, error, data } = useFetch("revenue");
  if (loading) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  const r = data.revenue;
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}>
        <StatCard label="MRR" value={money(r.mrr)} accent="var(--green)" />
        <StatCard label="ARR" value={money(r.arr)} accent="var(--green)" />
        <StatCard label="Paid Subscribers" value={r.paidSubscribers} accent="var(--amber)" />
        <StatCard label="Active Trials" value={r.activeTrials} accent="var(--blue)" />
      </div>
      <Panel>
        <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Revenue run-rate</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
          {[["Daily", r.runRate.daily], ["Weekly", r.runRate.weekly], ["Monthly", r.runRate.monthly]].map(([l, v]) => (
            <div key={l}><div style={{ fontSize: 22, fontFamily: "Sora", fontWeight: 800, color: "var(--green)" }}>{money(v)}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>{l}</div></div>
          ))}
        </div>
        <div style={{ fontSize: 10.5, color: "var(--dim)", marginTop: 10 }}>Run-rate is modeled from active subscriptions (MRR), not Stripe-settled cash.</div>
      </Panel>
      <Panel>
        <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>New upgrades</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 14 }}>
          {[["Today", r.newUpgrades.today], ["7 days", r.newUpgrades.week], ["This month", r.newUpgrades.month]].map(([l, v]) => (
            <div key={l}><div style={{ fontSize: 22, fontFamily: "Sora", fontWeight: 800 }}>{v}</div><div style={{ fontSize: 11, color: "var(--muted)" }}>{l}</div></div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

// ── EMAILS (lifecycle email tracking) ──────────────────────────────────────────
const EMAIL_TEMPLATES = ["audit_complete", "trial_started", "trial_ending_3d", "trial_ending_1d", "payment_succeeded", "payment_failed", "subscription_cancelled", "reengagement"];
const STATUS_COLOR = {
  delivered: "var(--green)", opened: "var(--green)", clicked: "var(--green)",
  sent: "var(--blue)", pending: "var(--muted)",
  bounced: "var(--red)", complained: "var(--red)", failed: "var(--red)",
};

function Emails() {
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [template, setTemplate] = useState("all");
  const metrics = useFetch("email_metrics");
  const list = useFetch("emails", { q: query, status: status === "all" ? "" : status, template: template === "all" ? "" : template, limit: 150 });
  const [detail, setDetail] = useState(null);

  const m = metrics.data?.metrics;
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {metrics.loading ? <Loading /> : metrics.error ? <ErrorBox error={metrics.error} /> : m && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
          <StatCard label="Sent (total)" value={m.total} accent="var(--blue)" />
          <StatCard label="Delivered" value={`${m.rates.delivered}%`} accent="var(--green)" />
          <StatCard label="Opened" value={`${m.rates.opened}%`} accent="var(--green)" />
          <StatCard label="Clicked" value={`${m.rates.clicked}%`} accent="var(--green)" />
          <StatCard label="Bounced" value={m.byStatus.bounced + m.byStatus.complained} accent="var(--red)" />
          <StatCard label="Failed" value={m.byStatus.failed} accent="var(--red)" />
          <StatCard label="Pending" value={m.byStatus.pending} accent="var(--muted)" />
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); setQuery(q); }} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 220, maxWidth: 320 }}><Field label="Search by recipient email" value={q} onChange={setQ} placeholder="name@example.com" /></div>
        <div style={{ width: 150 }}><Select label="Status" value={status} onChange={setStatus} options={["all", "pending", "sent", "delivered", "opened", "clicked", "bounced", "complained", "failed"]} /></div>
        <div style={{ width: 190 }}><Select label="Template" value={template} onChange={setTemplate} options={["all", ...EMAIL_TEMPLATES]} /></div>
        <Btn small onClick={() => setQuery(q)}>Search</Btn>
      </form>

      {list.loading ? <Loading /> : list.error ? <ErrorBox error={list.error} /> : (
        <Panel style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>{["RECIPIENT", "TEMPLATE", "STATUS", "SENT", ""].map((h) => <Th key={h}>{h}</Th>)}</tr></thead>
              <tbody>
                {(list.data.emails || []).map((e) => (
                  <tr key={e.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <Td>{e.to_email}</Td>
                    <Td><span style={{ color: "var(--muted)" }}>{e.template}</span></Td>
                    <Td><Tag color={STATUS_COLOR[e.status] || "var(--muted)"}>{e.status}</Tag></Td>
                    <Td><span style={{ color: "var(--muted)" }}>{ago(e.created_at)}</span></Td>
                    <Td><Btn small variant="ghost" onClick={() => setDetail(e.id)}>View</Btn></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!(list.data.emails || []).length && <div style={{ padding: 16, color: "var(--muted)", fontSize: 12 }}>No emails found.</div>}
        </Panel>
      )}
      {detail && <EmailDetail id={detail} onClose={() => setDetail(null)} onResent={() => { list.reload(); metrics.reload(); }} />}
    </div>
  );
}

const DetailRow = ({ label, value }) => value ? (
  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
    <span style={{ color: "var(--muted)" }}>{label}</span><span style={{ textAlign: "right" }}>{value}</span>
  </div>
) : null;

function EmailDetail({ id, onClose, onResent }) {
  const { loading, error, data } = useFetch("email_detail", { id });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const e = data?.email;

  const resend = async () => {
    setBusy(true); setMsg("");
    const { ok, json } = await call("email_resend", { id });
    setBusy(false);
    if (ok && json.ok) { setMsg("Resent ✓"); onResent?.(); }
    else setMsg(json?.error || "resend-failed");
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 40, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={(ev) => ev.stopPropagation()} style={{ width: "min(480px, 94vw)", height: "100%", background: "var(--panel)", borderLeft: "1px solid var(--border)", padding: 24, overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontFamily: "Sora", fontSize: 18, fontWeight: 800 }}>Email detail</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        {loading ? <Loading /> : error ? <ErrorBox error={error} /> : !e ? <div style={{ color: "var(--muted)", fontSize: 12 }}>Not found.</div> : (
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Tag color={STATUS_COLOR[e.status] || "var(--muted)"}>{e.status}</Tag>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{e.template}</span>
            </div>
            <div style={{ fontSize: 13 }}>{e.subject}</div>
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, padding: "4px 14px" }}>
              <DetailRow label="To" value={e.to_email} />
              <DetailRow label="Created" value={new Date(e.created_at).toLocaleString()} />
              <DetailRow label="Delivered" value={e.delivered_at && new Date(e.delivered_at).toLocaleString()} />
              <DetailRow label="Opened" value={e.opened_at && new Date(e.opened_at).toLocaleString()} />
              <DetailRow label="Clicked" value={e.clicked_at && new Date(e.clicked_at).toLocaleString()} />
              <DetailRow label="Message ID" value={e.provider_message_id} />
            </div>
            {e.error && <div style={{ background: "rgba(255,71,87,0.1)", border: "1px solid rgba(255,71,87,0.3)", borderRadius: 6, padding: "8px 10px", fontSize: 11, color: "#ff4757" }}>{e.error}</div>}
            {msg && <div style={{ fontSize: 12, color: msg.includes("✓") ? "var(--green)" : "#ff4757" }}>{msg}</div>}
            <Btn small variant="ghost" onClick={resend} disabled={busy}>{busy ? "Resending…" : "Resend email"}</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

// ── CONTROLS ──────────────────────────────────────────────────────────────────
const TOGGLES = [
  ["maintenance_mode", "Maintenance mode", "Shows a maintenance screen to all non-admins and pauses the app."],
  ["signups_disabled", "Disable signups", "New users can't create an account."],
  ["checkout_disabled", "Disable checkout", "Blocks new Stripe checkout sessions (admins exempt)."],
  ["audits_disabled", "Disable audits", "Blocks new site scans and audit saves (admins exempt)."],
];
function Controls() {
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");

  useEffect(() => { (async () => {
    const { ok, json } = await call("settings_get");
    if (ok) setSettings(json.settings); else setError(json?.error || "load-failed");
  })(); }, []);

  const toggle = async (key, next) => {
    if (key === "maintenance_mode" && next && !window.confirm("Enable maintenance mode? Non-admins will see a maintenance screen.")) return;
    setSaving(key);
    const { ok, json } = await call("settings_set", { settings: { ...settings, [key]: next } });
    setSaving("");
    if (ok) setSettings(json.settings); else setError(json?.error || "save-failed");
  };

  if (error) return <ErrorBox error={error} />;
  if (!settings) return <Loading />;
  return (
    <Panel>
      <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>System controls</div>
      <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 18 }}>Kill-switches take effect immediately across the platform.</div>
      <div style={{ display: "grid", gap: 12 }}>
        {TOGGLES.map(([key, label, desc]) => {
          const on = !!settings[key];
          const danger = key === "maintenance_mode";
          return (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", background: "var(--surface)", border: `1px solid ${on ? (danger ? "rgba(255,71,87,0.35)" : "var(--amber)") : "var(--border)"}`, borderRadius: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{label}{on && <span style={{ marginLeft: 8 }}><Tag color={danger ? "var(--red)" : "var(--amber)"}>ON</Tag></span>}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{desc}</div>
              </div>
              <button onClick={() => toggle(key, !on)} disabled={saving === key} role="switch" aria-checked={on} style={{
                width: 46, height: 26, borderRadius: 13, border: "none", cursor: "pointer", position: "relative",
                background: on ? (danger ? "var(--red)" : "var(--amber)") : "var(--border-bright)", transition: "background .2s", flexShrink: 0, opacity: saving === key ? 0.5 : 1,
              }}>
                <span style={{ position: "absolute", top: 3, left: on ? 23 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
              </button>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
