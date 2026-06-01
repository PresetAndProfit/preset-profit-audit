-- ============================================================================
-- Preset & Profit — Admin Command Center migration
-- Run AFTER database/schema.sql and database/tier2.sql, once, in the Supabase
-- SQL editor.
--
--   • system_settings — singleton row of operational toggles (maintenance mode,
--     disable signups / checkout / audits). Service-role only.
--   • admin_events — append-only billing/lifecycle activity feed (upgrades,
--     cancellations, failed payments), written by the Stripe webhook.
--   • Grants the admin flag to justin@presetprofit.com.
-- ============================================================================

-- ── 1. System settings (operational kill-switches) ──────────────────────────
create table if not exists public.system_settings (
  id                int primary key default 1 check (id = 1),  -- singleton
  maintenance_mode  boolean not null default false,
  signups_disabled  boolean not null default false,
  checkout_disabled boolean not null default false,
  audits_disabled   boolean not null default false,
  updated_at        timestamptz not null default now(),
  updated_by        uuid references auth.users (id) on delete set null
);
insert into public.system_settings (id) values (1) on conflict (id) do nothing;

alter table public.system_settings enable row level security;
-- No policies → only the service-role key (server-side admin endpoints) can
-- read or write. The public status endpoint also uses the service role.

-- ── 2. Admin activity events (billing lifecycle feed) ───────────────────────
-- Signups and audits are derived directly from profiles/audits; this table
-- captures the Stripe-driven events that aren't otherwise stored.
create table if not exists public.admin_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users (id) on delete set null,
  type       text not null,            -- 'upgrade' | 'cancellation' | 'failed_payment' | ...
  email      text,                     -- denormalized for the feed (user may be deleted)
  detail     jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_events_created_idx on public.admin_events (created_at desc);

alter table public.admin_events enable row level security;
-- No policies → service-role only.

-- ── 3. Grant admin to the owner ─────────────────────────────────────────────
update public.profiles set is_admin = true where email = 'justin@presetprofit.com';
