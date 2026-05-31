-- ============================================================================
-- Preset & Profit — Tier 2 migration (security hardening)
-- ----------------------------------------------------------------------------
-- Run AFTER database/schema.sql, once, in the Supabase SQL editor.
--
--  • Lock down `audits` so the browser can no longer INSERT/UPDATE rows. All
--    audit writes now go through the service-role server endpoint, which is
--    where the per-plan credit limit is enforced. (Free = 1 audit total.)
--  • Add profiles.is_admin for the admin usage dashboard.
--  • Add admin_usage_overview view (read by the service-role admin endpoint).
-- ============================================================================

-- ── 1. Make audit writes server-only ────────────────────────────────────────
-- Clients keep SELECT (read their own) and DELETE (remove their own); INSERT and
-- UPDATE policies are removed so the anon/auth key cannot create audits directly
-- and bypass the credit check. The service-role key bypasses RLS server-side.
drop policy if exists "own audits insert" on public.audits;
drop policy if exists "own audits update" on public.audits;

-- (usage_events already has no INSERT policy — it is written server-side only.
--  subscriptions is already read-only to clients. Nothing to change there.)

-- ── 2. Admin flag ────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- ── 3. Admin usage overview ──────────────────────────────────────────────────
-- One row per user with plan + lifetime/30-day usage. Read ONLY by the
-- service-role admin endpoint (which first verifies the caller is an admin).
-- Access is revoked from anon/authenticated so it can never leak via the
-- client anon key.
create or replace view public.admin_usage_overview as
select
  p.id                                                  as user_id,
  p.email,
  p.full_name,
  p.company_name,
  p.is_admin,
  coalesce(s.plan, 'free')                              as plan,
  s.status,
  s.current_period_end,
  (select count(*) from public.audits a
     where a.user_id = p.id)                            as total_audits,
  (select count(*) from public.usage_events e
     where e.user_id = p.id and e.event_type = 'audit_created'
       and e.created_at > now() - interval '30 days')   as audits_30d,
  (select count(*) from public.usage_events e
     where e.user_id = p.id and e.event_type = 'site_scan'
       and e.created_at > now() - interval '30 days')   as scans_30d,
  (select max(a.created_at) from public.audits a
     where a.user_id = p.id)                            as last_audit_at,
  p.created_at                                          as joined_at
from public.profiles p
left join public.subscriptions s on s.user_id = p.id;

revoke all on public.admin_usage_overview from anon, authenticated;

-- To grant yourself admin access, run (with your email):
--   update public.profiles set is_admin = true where email = 'you@example.com';
