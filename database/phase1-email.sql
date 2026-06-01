-- ============================================================================
-- Preset & Profit — Phase 1 migration (Lifecycle Email System)
-- ----------------------------------------------------------------------------
-- Run AFTER database/schema.sql, database/tier2.sql and database/admin.sql,
-- once, in the Supabase SQL editor.
--
--   • email_log — one row per lifecycle email. Tracks delivery status fed by
--     the Resend webhook (delivered/opened/clicked/bounced/...). dedupe_key
--     makes every send idempotent so retries / repeated cron sweeps are safe.
--     Service-role only (RLS on, no policies), exactly like admin_events.
--
-- Re-engagement and trial-ending sweeps need NO new columns: inactivity is
-- derived from audits/usage_events and trial windows from
-- subscriptions.trial_ends_at (all already exist).
-- ============================================================================

create table if not exists public.email_log (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references auth.users (id) on delete set null,
  -- Reserved for Phase 3 (agency-customer / multi-tenant workspaces). Unused in
  -- Phase 1 so the column is in place and no later migration is required.
  org_id              uuid,
  to_email            text not null,
  template            text not null,          -- 'audit_complete' | 'trial_started' | ...
  subject             text,
  status              text not null default 'pending'
                        check (status in ('pending','sent','delivered','opened',
                                          'clicked','bounced','complained','failed')),
  provider_message_id text,                   -- Resend id; matched by the delivery webhook
  dedupe_key          text unique,            -- e.g. 'trial_ending_3d:<sub_id>' (idempotency)
  error               text,
  metadata            jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  delivered_at        timestamptz,
  opened_at           timestamptz,
  clicked_at          timestamptz
);

create index if not exists email_log_status_idx    on public.email_log (status);
create index if not exists email_log_template_idx   on public.email_log (template);
create index if not exists email_log_created_idx    on public.email_log (created_at desc);
create index if not exists email_log_msgid_idx      on public.email_log (provider_message_id);
create index if not exists email_log_user_idx       on public.email_log (user_id, created_at desc);

alter table public.email_log enable row level security;
-- No policies → only the service-role key (server-side endpoints) can read/write.

-- keep updated_at fresh (reuses public.touch_updated_at() from schema.sql)
drop trigger if exists email_log_touch on public.email_log;
create trigger email_log_touch before update on public.email_log
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- Daily lifecycle sweep (trial-ending 3d/1d + re-engagement)
-- ----------------------------------------------------------------------------
-- The sweep is implemented in api/send-report.js ({ action: 'cron' }) and must
-- be invoked once a day. RECOMMENDED: Supabase pg_cron + pg_net hitting the
-- endpoint with the shared CRON_SECRET. Run this block ONCE after setting the
-- two GUCs below (or inline the literals). Vercel Cron is the documented
-- fallback if pg_cron/pg_net are unavailable on the plan.
--
--   select cron.schedule(
--     'lifecycle-email-sweep',
--     '0 14 * * *',                       -- 14:00 UTC daily
--     $$
--       select net.http_post(
--         url     := current_setting('app.cron_target_url'),    -- https://<app>/api/send-report
--         headers := '{"Content-Type":"application/json"}'::jsonb,
--         body    := jsonb_build_object(
--                      'action', 'cron',
--                      'secret', current_setting('app.cron_secret')
--                    )
--       );
--     $$
--   );
--
-- Requires: create extension if not exists pg_cron; create extension if not exists pg_net;
-- ============================================================================
