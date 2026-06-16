-- ============================================================================
-- Preset & Profit — V6 Opportunity Intelligence persistence (migration-ready)
-- ----------------------------------------------------------------------------
-- Stores generated opportunity alerts, campaign packages, department health
-- snapshots, executive briefings, and action items. All of these are DERIVABLE
-- from the audit blob by the client engines (src/lib/opportunity/*, chiefOfStaff,
-- departmentEngine) — so the app works fully without this migration (client-side
-- fallback). These tables exist to PERSIST history + power future cross-audit
-- intelligence, written service-role from existing functions (no new route).
--
-- Idempotent + additive. RLS = own-row reads, mirroring the audits model.
-- ============================================================================

create table if not exists public.opportunity_alerts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  audit_id       uuid references public.audits(id) on delete cascade,
  client_id      text,
  business_name  text,
  industry       text,
  opp_key        text,                 -- engine-stable opportunity id
  title          text not null,
  category       text,
  tier           text,                 -- urgent | opportunity | watch | ignore
  score          int,
  department_owner text,
  recommended_workflow text,
  recommended_campaign text,
  revenue_low    int,
  revenue_high   int,
  time_window    text,
  status         text not null default 'surfaced'
    check (status in ('surfaced','viewed','launched','dismissed','completed')),
  payload        jsonb,                -- full alert + campaign
  created_at     timestamptz not null default now()
);
create index if not exists opportunity_alerts_user_idx     on public.opportunity_alerts (user_id, created_at desc);
create index if not exists opportunity_alerts_industry_idx on public.opportunity_alerts (industry, category);

create table if not exists public.campaign_recommendations (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  opportunity_id uuid references public.opportunity_alerts(id) on delete cascade,
  audit_id       uuid references public.audits(id) on delete set null,
  campaign_name  text not null,
  channel        text,
  budget_low     int,
  budget_high    int,
  assets         jsonb,                -- the full launch-ready package
  status         text not null default 'generated'
    check (status in ('generated','approved','launched','archived')),
  created_at     timestamptz not null default now()
);
create index if not exists campaign_recs_user_idx on public.campaign_recommendations (user_id, created_at desc);

create table if not exists public.department_health_snapshots (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  audit_id       uuid references public.audits(id) on delete cascade,
  business_name  text,
  industry       text,
  department     text not null,        -- sales | marketing | reputation | ...
  health_score   int,
  issue_count    int,
  opportunity_count int,
  next_best_action text,
  gated          boolean default false,
  created_at     timestamptz not null default now()
);
create index if not exists dept_health_user_idx on public.department_health_snapshots (user_id, created_at desc);

create table if not exists public.executive_briefings (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  scope           text not null default 'portfolio',   -- portfolio | business
  business_name   text,
  portfolio_health int,
  total_opportunity bigint,
  briefing        jsonb not null,      -- the full Chief of Staff briefing
  created_at      timestamptz not null default now()
);
create index if not exists exec_briefings_user_idx on public.executive_briefings (user_id, created_at desc);

create table if not exists public.action_items (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  audit_id       uuid references public.audits(id) on delete set null,
  source         text,                 -- diagnosis | opportunity | department
  title          text not null,
  department     text,
  revenue_low    int,
  revenue_high   int,
  recommended_workflow text,
  recommended_campaign text,
  status         text not null default 'open'
    check (status in ('open','in_progress','done','dismissed')),
  due_at         timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists action_items_user_idx on public.action_items (user_id, status);

-- ── RLS (own-row reads; writes are service-role) ─────────────────────────────
alter table public.opportunity_alerts          enable row level security;
alter table public.campaign_recommendations    enable row level security;
alter table public.department_health_snapshots enable row level security;
alter table public.executive_briefings         enable row level security;
alter table public.action_items                enable row level security;

drop policy if exists "own opp_alerts select" on public.opportunity_alerts;
create policy "own opp_alerts select" on public.opportunity_alerts for select using (auth.uid() = user_id);
drop policy if exists "own campaign_recs select" on public.campaign_recommendations;
create policy "own campaign_recs select" on public.campaign_recommendations for select using (auth.uid() = user_id);
drop policy if exists "own dept_health select" on public.department_health_snapshots;
create policy "own dept_health select" on public.department_health_snapshots for select using (auth.uid() = user_id);
drop policy if exists "own exec_briefings select" on public.executive_briefings;
create policy "own exec_briefings select" on public.executive_briefings for select using (auth.uid() = user_id);
drop policy if exists "own action_items all" on public.action_items;
create policy "own action_items all" on public.action_items for select using (auth.uid() = user_id);
