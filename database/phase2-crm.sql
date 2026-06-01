-- ============================================================================
-- Preset & Profit — Phase 2: CRM / Growth OS pipeline
-- ----------------------------------------------------------------------------
-- THE DEAL IS THE AUDIT ROW, ENRICHED. Rather than a parallel `deals` table,
-- we add pipeline columns to the existing `audits` table so the credit-gated
-- upsert path (api/audits/create.js), RLS, and the useAudits() hook stay intact.
-- A "lead" (leads table) becomes a "deal" the moment an audit is generated for
-- it; the audit row then moves through the pipeline stages below.
--
-- Idempotent + additive only — safe to run on a live DB. No destructive change.
-- RLS is unchanged: the existing "own audits" select/insert/update/delete
-- policies already cover these new columns. Stage/crm mutations route through
-- the service-role server endpoint (create.js {op:'deal_update'}), same as the
-- audit write path, because tier2.sql removed client INSERT/UPDATE.
-- ============================================================================

-- Pipeline stage the deal currently sits in.
alter table public.audits
  add column if not exists stage text not null default 'audit';

-- Enforce the stage vocabulary (drop+add so re-runs stay idempotent).
alter table public.audits drop constraint if exists audits_stage_check;
alter table public.audits add constraint audits_stage_check
  check (stage in ('lead','audit','roadmap','proposal','outreach','followup','closed_won','closed_lost'));

-- Deal economics + scheduling.
alter table public.audits add column if not exists deal_value_cents int;        -- agency revenue = roadmap first-year cost
alter table public.audits add column if not exists next_action_at timestamptz;  -- powers follow-up cron + board sort
alter table public.audits add column if not exists last_contact_at timestamptz;
alter table public.audits add column if not exists contact_email text;          -- prospect email for outreach send
alter table public.audits add column if not exists contact_name text;

-- All free-form CRM state in one jsonb blob (notes, activity log, generated
-- outreach copy, follow-up schedule, sold automations, white-label client tag).
-- Structured copy only — never store rendered HTML here (keeps the row lean).
alter table public.audits add column if not exists crm jsonb not null default '{}'::jsonb;

-- Board queries (by stage) and the follow-up cron sweep (any open deal with a
-- due next_action_at — operators can schedule a follow-up at any stage).
create index if not exists audits_user_stage_idx on public.audits (user_id, stage);
create index if not exists audits_due_action_idx on public.audits (next_action_at)
  where next_action_at is not null;

-- Booking CTA: the operator's own scheduling link, embedded into outreach copy
-- and the proposal's "Book the call" button so every artifact drives a real,
-- trackable booked call. Client-updatable via the existing "own profile update"
-- RLS policy (no server endpoint needed).
alter table public.profiles add column if not exists calendar_url text;
