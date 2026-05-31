-- ============================================================================
-- Preset & Profit — Tier 0 Supabase schema
-- ----------------------------------------------------------------------------
-- Run this in the Supabase SQL editor (or `supabase db push`) ONCE per project.
-- It is idempotent where practical, but is intended as the initial migration.
--
-- Tables: profiles, subscriptions, audits, leads, usage_events, shared_reports
-- Security: Row Level Security on every table so a signed-in user can only ever
--           read/write their OWN rows. The service-role key (server-side only)
--           bypasses RLS for webhooks/admin work.
-- ============================================================================

-- gen_random_uuid()
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- profiles — 1:1 with auth.users, holds app-level profile data
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text,
  full_name    text,
  company_name text,
  -- White-label branding (Agency tier, surfaced in Tier 3). Stored now so the
  -- schema is stable; ignored by the UI until then.
  brand_logo_url text,
  brand_color    text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- subscriptions — one active plan per user. Plan defaults to 'free'.
-- Stripe columns stay null until Tier 1 (Monetization) wires checkout.
-- ----------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null unique references auth.users (id) on delete cascade,
  plan                   text not null default 'free'
                           check (plan in ('free', 'professional', 'agency')),
  status                 text not null default 'active'
                           check (status in ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
  stripe_customer_id     text,
  stripe_subscription_id text,
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  trial_ends_at          timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);

-- ----------------------------------------------------------------------------
-- audits — one row per generated report. The full report object lives in `data`
-- (jsonb) so the existing client shape is preserved verbatim; a few columns are
-- denormalized for cheap listing/metering. client_id is the report.id produced
-- by uid() on the client, used for upsert + dedup against legacy localStorage.
-- ----------------------------------------------------------------------------
create table if not exists public.audits (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  client_id     text not null,
  business_name text,
  url           text,
  overall_score int,
  data          jsonb not null,
  created_at    timestamptz not null default now(),
  unique (user_id, client_id)
);

create index if not exists audits_user_created_idx on public.audits (user_id, created_at desc);

-- ----------------------------------------------------------------------------
-- leads — captured prospect emails (from AuditScanner / LeadCapture). Kept
-- separate from audits so lead capture can outlive a single report.
-- ----------------------------------------------------------------------------
create table if not exists public.leads (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  email         text,
  business_name text,
  source        text,
  audit_id      uuid references public.audits (id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists leads_user_created_idx on public.leads (user_id, created_at desc);

-- ----------------------------------------------------------------------------
-- usage_events — append-only metering log. One row per billable action (today:
-- 'audit_created'). Counting these inside the current billing window enforces
-- per-tier audit limits without trusting the client.
-- ----------------------------------------------------------------------------
create table if not exists public.usage_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  event_type  text not null,
  audit_id    uuid references public.audits (id) on delete set null,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists usage_events_user_type_created_idx
  on public.usage_events (user_id, event_type, created_at desc);

-- ----------------------------------------------------------------------------
-- shared_reports — public share links for white-label (Tier 3). Created now so
-- the schema is stable; token is unguessable and rows can expire.
-- ----------------------------------------------------------------------------
create table if not exists public.shared_reports (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  audit_id   uuid not null references public.audits (id) on delete cascade,
  token      text not null unique default encode(gen_random_bytes(16), 'hex'),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists shared_reports_token_idx on public.shared_reports (token);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles       enable row level security;
alter table public.subscriptions  enable row level security;
alter table public.audits         enable row level security;
alter table public.leads          enable row level security;
alter table public.usage_events   enable row level security;
alter table public.shared_reports enable row level security;

-- profiles ------------------------------------------------------------------
drop policy if exists "own profile select" on public.profiles;
create policy "own profile select" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles
  for update using (auth.uid() = id);
drop policy if exists "own profile insert" on public.profiles;
create policy "own profile insert" on public.profiles
  for insert with check (auth.uid() = id);

-- subscriptions: read-only to the user. Mutations happen server-side via the
-- service-role key (Stripe webhooks) which bypasses RLS.
drop policy if exists "own subscription select" on public.subscriptions;
create policy "own subscription select" on public.subscriptions
  for select using (auth.uid() = user_id);

-- audits --------------------------------------------------------------------
drop policy if exists "own audits select" on public.audits;
create policy "own audits select" on public.audits
  for select using (auth.uid() = user_id);
drop policy if exists "own audits insert" on public.audits;
create policy "own audits insert" on public.audits
  for insert with check (auth.uid() = user_id);
drop policy if exists "own audits update" on public.audits;
create policy "own audits update" on public.audits
  for update using (auth.uid() = user_id);
drop policy if exists "own audits delete" on public.audits;
create policy "own audits delete" on public.audits
  for delete using (auth.uid() = user_id);

-- leads ---------------------------------------------------------------------
drop policy if exists "own leads all" on public.leads;
create policy "own leads all" on public.leads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- usage_events: user may read their own history. Inserts go through the
-- service-role key server-side (authoritative metering), so no insert policy.
drop policy if exists "own usage select" on public.usage_events;
create policy "own usage select" on public.usage_events
  for select using (auth.uid() = user_id);

-- shared_reports: owner manages their own links.
drop policy if exists "own shares all" on public.shared_reports;
create policy "own shares all" on public.shared_reports
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- New-user trigger — on signup, create a profile row and a default free
-- subscription. SECURITY DEFINER so it runs with table-owner rights.
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, company_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'company_name'
  )
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'free', 'active')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- keep updated_at fresh
-- ============================================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists subscriptions_touch on public.subscriptions;
create trigger subscriptions_touch before update on public.subscriptions
  for each row execute function public.touch_updated_at();
