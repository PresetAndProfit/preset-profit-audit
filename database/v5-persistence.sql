-- ============================================================================
-- Preset & Profit — V5 Persistence Foundation (Layers 7 & 8 substrate)
-- ----------------------------------------------------------------------------
-- Transforms the platform from STATELESS audits into a system that permanently
-- stores audit history, recommendations, outcomes, and industry benchmarks —
-- the structured data a future learning/market-intelligence system will need.
--
-- IMPORTANT: this collects & structures data only. NO autonomous learning runs
-- off these tables yet.
--
-- Design notes:
--   • The audits table stays the source of truth (full report blob in data jsonb).
--     `audit_snapshots` is a DENORMALIZED, INDEXED projection of the few metrics
--     we aggregate on — so industry benchmarking never has to scan jsonb.
--   • recommendations / outcomes are 1-to-many per audit → their own tables.
--   • industry_benchmarks is a DERIVED table (recomputed by a service-role job),
--     anonymized: aggregates only, gated behind a minimum sample size in code.
--   • Writes are service-role only (api/audits/create.js, admin/console.js,
--     send-report.js cron) — mirrors the audits write model. RLS grants OWN-ROW
--     reads; benchmarks are admin/service-role read only.
--   • Idempotent + additive — safe to run on a live DB.
-- ============================================================================

-- ── Phase A — AUDIT MEMORY (snapshot projection of each audit) ───────────────
create table if not exists public.audit_snapshots (
  id              uuid primary key default gen_random_uuid(),
  audit_id        uuid not null references public.audits(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  client_id       text not null,
  business_name   text,
  industry        text,
  archetype       text,
  business_size   text,                      -- modeled bucket: micro | small | midmarket
  created_at      timestamptz not null default now(),
  -- extracted metrics (for fast cross-audit aggregation)
  overall_score          int,
  lead_score             int,
  website_score          int,
  finding_count          int,
  severity_score         numeric,            -- weighted severity index
  revenue_leak_low       int,
  revenue_leak_high      int,
  competitor_review_gap  int,                -- leader reviews − yours (null if no data)
  competitor_rank        int,
  forecast_12mo_low      int,
  forecast_12mo_high     int,
  top_workflow           text,               -- #1 prescribed canonical automation
  ai_generated           boolean default false,
  unique (audit_id)
);
create index if not exists audit_snapshots_industry_idx on public.audit_snapshots (industry, created_at desc);
create index if not exists audit_snapshots_user_idx     on public.audit_snapshots (user_id, created_at desc);

-- ── Phase B — RECOMMENDATION TRACKING (1 audit → many recommendations) ───────
create table if not exists public.recommendations (
  id                 uuid primary key default gen_random_uuid(),
  audit_id           uuid not null references public.audits(id) on delete cascade,
  user_id            uuid not null references auth.users(id) on delete cascade,
  client_id          text not null,
  business_name      text,
  industry           text,
  workflow           text not null,          -- canonical automation prescribed
  rank               int,
  priority           text,                   -- now | next | later
  growth_driver      text,
  impact_score       int,
  estimated_roi      jsonb,                  -- { impactScore, effort, ... }
  forecasted_outcome jsonb,                  -- forecast snapshot at audit time
  status             text not null default 'recommended'
    check (status in ('recommended','viewed','accepted','declined','deployed','completed')),
  status_changed_at  timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  unique (audit_id, workflow)                -- one row per workflow per audit (idempotent re-save)
);
create index if not exists recommendations_user_status_idx  on public.recommendations (user_id, status);
create index if not exists recommendations_industry_wf_idx   on public.recommendations (industry, workflow);
create index if not exists recommendations_audit_idx         on public.recommendations (audit_id);

-- ── Phase C — OUTCOME TRACKING (measured results of deployed workflows) ──────
create table if not exists public.outcomes (
  id                  uuid primary key default gen_random_uuid(),
  recommendation_id   uuid references public.recommendations(id) on delete set null,
  audit_id            uuid references public.audits(id) on delete set null,
  user_id             uuid not null references auth.users(id) on delete cascade,
  client_id           text,
  business_name       text,
  industry            text,
  workflow            text not null,
  start_date          date,
  completion_date     date,
  before_metrics      jsonb,
  after_metrics       jsonb,
  measured_improvement jsonb,                -- { metric, pctChange, absChange }
  revenue_impact_cents bigint,
  time_to_result_days int,
  confidence          numeric,               -- 0..1 data/measurement confidence
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists outcomes_user_idx        on public.outcomes (user_id);
create index if not exists outcomes_industry_wf_idx on public.outcomes (industry, workflow);

-- ── Phase D — BENCHMARK FRAMEWORK (derived, anonymized aggregates) ───────────
-- Recomputed by a service-role job; each row is an aggregate over many audits.
-- A minimum sample size is enforced in code before a row is written/exposed, so
-- no individual business is identifiable.
create table if not exists public.industry_benchmarks (
  id            uuid primary key default gen_random_uuid(),
  industry      text not null,
  business_size text not null default 'all',
  metric        text not null,               -- overall_score | lead_gen | seo | severity
                                             -- | revenue_leak | forecast_12mo
                                             -- | review_gap | competitor_position
  sample_size   int not null default 0,
  p25           numeric,
  p50           numeric,
  p75           numeric,
  mean          numeric,
  updated_at    timestamptz not null default now(),
  unique (industry, business_size, metric)
);
create index if not exists industry_benchmarks_idx on public.industry_benchmarks (industry, metric);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.audit_snapshots      enable row level security;
alter table public.recommendations      enable row level security;
alter table public.outcomes             enable row level security;
alter table public.industry_benchmarks  enable row level security;

-- Own-row reads (writes are service-role only, which bypasses RLS).
drop policy if exists "own snapshots select"  on public.audit_snapshots;
create policy "own snapshots select" on public.audit_snapshots
  for select using (auth.uid() = user_id);

drop policy if exists "own recommendations select" on public.recommendations;
create policy "own recommendations select" on public.recommendations
  for select using (auth.uid() = user_id);

drop policy if exists "own outcomes select" on public.outcomes;
create policy "own outcomes select" on public.outcomes
  for select using (auth.uid() = user_id);

-- industry_benchmarks: NO client policy → readable only via service-role/admin
-- (the anonymized Market Intelligence Network surface). RLS enabled with no
-- permissive policy denies all direct client access by default.
