// api/admin/console.js — the Admin Command Center API. ONE guarded surface that
// routes by { action }. Every action requires admin (requireAdmin). All reads/
// writes use the service-role client (bypasses RLS); destructive ops are gated
// behind the admin check above.
//
// POST /api/admin/console   Body: { action, ...params }   Header: Authorization: Bearer
import { supabaseAdmin } from "../_lib/supabaseAdmin.js";
import { requireAdmin } from "../_lib/adminAuth.js";
import { getSettings, setSettings, logAdminEvent } from "../_lib/systemSettings.js";
import { PLANS } from "../../src/lib/plans.js";

const PAID = ["professional", "agency"];
const MRR_STATUSES = ["active", "past_due"]; // committed recurring revenue (trials excluded)
const monthlyCents = (plan) => PLANS[plan]?.amountCents || 0;

const startOfDay = () => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d.toISOString(); };
const startOfMonth = () => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString(); };
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();
const count = async (table, build) => {
  let q = supabaseAdmin.from(table).select("id", { count: "exact", head: true });
  if (build) q = build(q);
  const { count: c } = await q;
  return c || 0;
};

// ── OVERVIEW ─────────────────────────────────────────────────────────────────
async function overview() {
  const [{ data: subs }, totalUsers, auditsToday, auditsMonth] = await Promise.all([
    supabaseAdmin.from("subscriptions").select("plan, status"),
    count("profiles"),
    count("audits", (q) => q.gte("created_at", startOfDay())),
    count("audits", (q) => q.gte("created_at", startOfMonth())),
  ]);
  const rows = subs || [];
  const activeTrials = rows.filter((s) => s.status === "trialing" && PAID.includes(s.plan)).length;
  const paidSubscribers = rows.filter((s) => MRR_STATUSES.includes(s.status) && PAID.includes(s.plan)).length;
  const mrrCents = rows.filter((s) => MRR_STATUSES.includes(s.status)).reduce((sum, s) => sum + monthlyCents(s.plan), 0);
  const mrr = Math.round(mrrCents / 100);
  return {
    totalUsers, activeTrials, paidSubscribers,
    mrr, arr: mrr * 12,
    auditsToday, auditsMonth,
    conversionRate: totalUsers ? Math.round((paidSubscribers / totalUsers) * 1000) / 10 : 0,
  };
}

// ── ACTIVITY FEED (signups + audits + billing events, merged) ────────────────
async function activity({ limit = 40 } = {}) {
  const [{ data: signups }, { data: auds }, { data: events }] = await Promise.all([
    supabaseAdmin.from("profiles").select("id, email, created_at").order("created_at", { ascending: false }).limit(limit),
    supabaseAdmin.from("audits").select("id, user_id, business_name, created_at").order("created_at", { ascending: false }).limit(limit),
    supabaseAdmin.from("admin_events").select("id, type, email, detail, created_at").order("created_at", { ascending: false }).limit(limit),
  ]);
  const feed = [
    ...(signups || []).map((s) => ({ id: `s_${s.id}`, type: "signup", at: s.created_at, who: s.email, text: "signed up" })),
    ...(auds || []).map((a) => ({ id: `a_${a.id}`, type: "audit", at: a.created_at, who: a.business_name || "—", text: "audit created" })),
    ...(events || []).map((e) => ({ id: `e_${e.id}`, type: e.type, at: e.created_at, who: e.email || "—", text: e.detail?.message || e.type.replace(/_/g, " ") })),
  ].sort((x, y) => new Date(y.at) - new Date(x.at)).slice(0, limit);
  return feed;
}

// ── USER MANAGEMENT ──────────────────────────────────────────────────────────
async function users({ q = "", limit = 100 } = {}) {
  let query = supabaseAdmin.from("admin_usage_overview").select("*").order("joined_at", { ascending: false }).limit(limit);
  if (q.trim()) query = query.ilike("email", `%${q.trim()}%`);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function userDetail({ userId }) {
  const [{ data: profile }, { data: subscription }, { data: recentAudits }] = await Promise.all([
    supabaseAdmin.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabaseAdmin.from("subscriptions").select("*").eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("audits").select("id, client_id, business_name, url, overall_score, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
  ]);
  return { profile, subscription, recentAudits: recentAudits || [] };
}

async function userAction({ userId, op, plan }, admin) {
  if (!userId) return { ok: false, error: "missing-user" };
  const email = (await supabaseAdmin.from("profiles").select("email").eq("id", userId).maybeSingle()).data?.email || null;

  if (op === "upgrade") {
    if (!PAID.includes(plan)) return { ok: false, error: "invalid-plan" };
    await supabaseAdmin.from("subscriptions").upsert({ user_id: userId, plan, status: "active", updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    await logAdminEvent("admin_upgrade", { userId, email, detail: { message: `admin set plan to ${plan}`, by: admin.email } });
    return { ok: true };
  }
  if (op === "downgrade") {
    await supabaseAdmin.from("subscriptions").upsert({ user_id: userId, plan: "free", status: "active", updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    await logAdminEvent("admin_downgrade", { userId, email, detail: { message: "admin set plan to free", by: admin.email } });
    return { ok: true };
  }
  if (op === "reset") {
    // Reset usage = clear the user's audits + metering log so their credit resets.
    const { count: removed } = await supabaseAdmin.from("audits").delete({ count: "exact" }).eq("user_id", userId);
    await supabaseAdmin.from("usage_events").delete().eq("user_id", userId);
    await logAdminEvent("admin_reset", { userId, email, detail: { message: `admin reset usage (${removed || 0} audits cleared)`, by: admin.email } });
    return { ok: true, removed: removed || 0 };
  }
  if (op === "delete") {
    // Cascade-deletes profile/subscription/audits via FK on delete cascade.
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) return { ok: false, error: error.message };
    await logAdminEvent("admin_delete", { userId: null, email, detail: { message: "admin deleted account", by: admin.email } });
    return { ok: true };
  }
  return { ok: false, error: "unknown-op" };
}

// ── AUDIT DATABASE ───────────────────────────────────────────────────────────
async function audits({ q = "", plan = "", limit = 100 } = {}) {
  let query = supabaseAdmin.from("audits").select("id, user_id, business_name, url, overall_score, created_at").order("created_at", { ascending: false }).limit(limit);
  if (q.trim()) query = query.or(`business_name.ilike.%${q.trim()}%,url.ilike.%${q.trim()}%`);
  const { data: rows, error } = await query;
  if (error) throw error;
  const userIds = [...new Set((rows || []).map((r) => r.user_id))];
  let emailById = {}, planById = {};
  if (userIds.length) {
    const [{ data: profs }, { data: subs }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id, email").in("id", userIds),
      supabaseAdmin.from("subscriptions").select("user_id, plan").in("user_id", userIds),
    ]);
    emailById = Object.fromEntries((profs || []).map((p) => [p.id, p.email]));
    planById = Object.fromEntries((subs || []).map((s) => [s.user_id, s.plan]));
  }
  let out = (rows || []).map((r) => ({ ...r, email: emailById[r.user_id] || "—", plan: planById[r.user_id] || "free" }));
  if (plan) out = out.filter((r) => r.plan === plan);
  return out;
}

async function auditDetail({ auditId }) {
  const { data } = await supabaseAdmin.from("audits").select("id, business_name, url, overall_score, created_at, data").eq("id", auditId).maybeSingle();
  return data || null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method-not-allowed" });
  const admin = await requireAdmin(req);
  if (!admin) return res.status(403).json({ error: "forbidden" });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const { action } = body;

  try {
    switch (action) {
      case "overview":      return res.status(200).json({ ok: true, overview: await overview() });
      case "activity":      return res.status(200).json({ ok: true, feed: await activity(body) });
      case "users":         return res.status(200).json({ ok: true, users: await users(body) });
      case "user_detail":   return res.status(200).json({ ok: true, ...(await userDetail(body)) });
      case "user_action":   return res.status(200).json(await userAction(body, admin));
      case "audits":        return res.status(200).json({ ok: true, audits: await audits(body) });
      case "audit_detail":  return res.status(200).json({ ok: true, audit: await auditDetail(body) });
      case "revenue": {
        const o = await overview();
        const [upToday, upWeek, upMonth] = await Promise.all([
          count("admin_events", (q) => q.eq("type", "upgrade").gte("created_at", startOfDay())),
          count("admin_events", (q) => q.eq("type", "upgrade").gte("created_at", daysAgo(7))),
          count("admin_events", (q) => q.eq("type", "upgrade").gte("created_at", startOfMonth())),
        ]);
        return res.status(200).json({
          ok: true,
          revenue: {
            mrr: o.mrr, arr: o.arr, paidSubscribers: o.paidSubscribers, activeTrials: o.activeTrials,
            // Run-rate slices of MRR (modeled from active subscriptions, not Stripe-settled).
            runRate: { daily: Math.round(o.mrr / 30), weekly: Math.round((o.mrr / 30) * 7), monthly: o.mrr },
            newUpgrades: { today: upToday, week: upWeek, month: upMonth },
          },
        });
      }
      case "settings_get":  return res.status(200).json({ ok: true, settings: await getSettings({ fresh: true }) });
      case "settings_set": {
        const r = await setSettings(body.settings || {}, admin.id);
        if (!r.ok) return res.status(500).json({ error: "settings-failed" });
        await logAdminEvent("settings_changed", { userId: admin.id, email: admin.email, detail: { message: "system settings updated", by: admin.email, settings: r.settings } });
        return res.status(200).json({ ok: true, settings: r.settings });
      }
      default:
        return res.status(400).json({ error: "unknown-action" });
    }
  } catch (e) {
    console.error("[admin/console]", action, e);
    return res.status(500).json({ error: "server-error", detail: String(e?.message || e) });
  }
}
