-- =============================================================================
-- Phase 1 : Schema for the official scheme-data migration
-- =============================================================================
-- Adds the approved columns to existing detail tables and creates the two
-- tables the current schema cannot express (ordered process steps and
-- non-scalar rules). Idempotent: safe to re-run.
-- Preceded by 20260927000100_snapshot_pre_official_data_migration.sql.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1a. scheme_eligibility : qualifying examination + institution requirement
-- ---------------------------------------------------------------------------
alter table public.scheme_eligibility
  add column if not exists qualifying_examination text[],
  add column if not exists institution_requirement text[];

comment on column public.scheme_eligibility.qualifying_examination is
  'Official qualifying examination(s) required to be eligible. NULL when not specified officially.';
comment on column public.scheme_eligibility.institution_requirement is
  'Official institution / institute eligibility categories. NULL when not specified officially.';

-- ---------------------------------------------------------------------------
-- 1b. scheme_documents : fresh vs renewal requirement matrix
-- ---------------------------------------------------------------------------
alter table public.scheme_documents
  add column if not exists is_required_fresh   boolean not null default true,
  add column if not exists is_required_renewal boolean not null default true;

comment on column public.scheme_documents.is_required_fresh is
  'Official requirement for a fresh (first-time) application. Defaults true.';
comment on column public.scheme_documents.is_required_renewal is
  'Official requirement for a renewal application. Defaults true.';

-- ---------------------------------------------------------------------------
-- 1c. scheme_benefits : non-INR currency and variable amount bases
-- ---------------------------------------------------------------------------
alter table public.scheme_benefits
  add column if not exists currency      text,
  add column if not exists amount_basis  text;

comment on column public.scheme_benefits.currency is
  'ISO currency of the amount: INR, USD, GBP. NULL when not stated officially.';
comment on column public.scheme_benefits.amount_basis is
  'fixed | state_fixed | percentage | actual | pro_rated. Describes how amount must be read.';

-- ---------------------------------------------------------------------------
-- 1d. scheme_process_steps : ordered application / verification / disbursement
-- ---------------------------------------------------------------------------
create table if not exists public.scheme_process_steps (
  id             uuid primary key default gen_random_uuid(),
  scheme_id      uuid not null references public.schemes(id) on delete cascade,
  step_order     integer not null check (step_order > 0),
  title          text not null,
  description    text,
  actor          text,
  sla_or_timeline text,
  source_ref     text,
  created_at     timestamptz not null default now(),
  constraint scheme_process_steps_scheme_order_key unique (scheme_id, step_order)
);

comment on table public.scheme_process_steps is
  'Ordered, official application process steps per scheme.';
comment on column public.scheme_process_steps.sla_or_timeline is
  'Official suggested date or timeline text. NULL when the guideline states no fixed date.';

create index if not exists scheme_process_steps_scheme_id_idx
  on public.scheme_process_steps (scheme_id);

-- ---------------------------------------------------------------------------
-- 1e. scheme_criteria : rules that do not fit a scalar column
-- ---------------------------------------------------------------------------
create table if not exists public.scheme_criteria (
  id           uuid primary key default gen_random_uuid(),
  scheme_id    uuid not null references public.schemes(id) on delete cascade,
  criteria_type text not null,
  criteria_key  text not null,
  title         text not null,
  description   text,
  numeric_value numeric,
  text_value    text,
  applies_to    text,
  source_ref    text,
  created_at   timestamptz not null default now(),
  constraint scheme_criteria_type_key_key unique (scheme_id, criteria_type, criteria_key)
);

comment on table public.scheme_criteria is
  'Official non-scalar scheme rules (course-dependent ages, slot allocations, course groups).';
comment on column public.scheme_criteria.numeric_value is
  'Numeric rule value, e.g. a maximum age or a slot count. NULL for text-only rules.';
comment on column public.scheme_criteria.applies_to is
  'Course, stream or category the rule applies to. NULL when it applies scheme-wide.';

create index if not exists scheme_criteria_scheme_id_idx
  on public.scheme_criteria (scheme_id);

-- ---------------------------------------------------------------------------
-- 1f. RLS parity for the two new tables
-- Mirrors the existing published_*_read + *_admin_all policy pattern exactly.
-- Read access only for published/verified/active schemes; no private data.
-- ---------------------------------------------------------------------------
alter table public.scheme_process_steps enable row level security;
alter table public.scheme_criteria       enable row level security;

drop policy if exists scheme_process_steps_admin_all on public.scheme_process_steps;
create policy scheme_process_steps_admin_all on public.scheme_process_steps
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists published_process_steps_read on public.scheme_process_steps;
create policy published_process_steps_read on public.scheme_process_steps
  for select using (
    exists (
      select 1 from public.schemes s
      where s.id = scheme_process_steps.scheme_id
        and s.status = 'published'
        and s.verification_status = 'verified'
        and s.is_active
    )
  );

drop policy if exists scheme_criteria_admin_all on public.scheme_criteria;
create policy scheme_criteria_admin_all on public.scheme_criteria
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists published_criteria_read on public.scheme_criteria;
create policy published_criteria_read on public.scheme_criteria
  for select using (
    exists (
      select 1 from public.schemes s
      where s.id = scheme_criteria.scheme_id
        and s.status = 'published'
        and s.verification_status = 'verified'
        and s.is_active
    )
  );
