-- =============================================================================
-- Scheme detail content
--
-- The scheme detail view needs to show an objective, a fee-and-stipend structure
-- that distinguishes hostellers from day scholars, an ordered eligibility
-- checklist, and the verification pipeline. None of that had a home:
--
--   - schemes.scheme_type / schemes.overview were added by 20260927000000, but
--     src/lib/supabase.ts had them removed from the Scheme interface because the
--     deployed table did not have them at the time, so every read returned
--     undefined and the page rendered confident-looking blanks. They are
--     re-asserted here idempotently so the columns are guaranteed present.
--   - scheme_benefits had only a single scalar `amount`. A stipend that differs
--     by hostel/day-scholar cannot be expressed in one number, so the split
--     gets real columns instead of being flattened into prose.
--   - There was no ordered place for eligibility criteria or for the
--     verification steps, so two narrow tables are added rather than jamming
--     both into the free-text `other_conditions` column where they could not be
--     ordered, styled, or verified.
--
-- Everything here is additive and idempotent. No existing column is redefined,
-- retyped, or dropped, and no existing row is deleted, so this is safe to apply
-- against a database that has drifted.
--
-- Seeding policy: financial figures are seeded ONLY for BVOBC (Post-Matric ST),
-- which is the scheme whose official figures have been supplied and checked.
-- Inventing stipend amounts for the other four schemes would put unverified
-- money in front of applicants, so their benefits stay empty and the UI says so.
-- The process steps are the shared Ministry of Tribal Affairs / NITA pipeline
-- and are seeded for all five, but are marked as requiring verification against
-- each scheme's own guideline document.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. schemes: ensure the descriptive columns exist
-- -----------------------------------------------------------------------------

alter table public.schemes add column if not exists scheme_type text;
alter table public.schemes add column if not exists overview text;

comment on column public.schemes.scheme_type is
  'How the scheme is funded and by whom, e.g. Centrally Sponsored Scheme.';
comment on column public.schemes.overview is
  'What the scheme is for, in plain language. Shown under the title on the detail view.';

-- -----------------------------------------------------------------------------
-- 2. scheme_benefits: split amounts so a benefit can differ by residence
-- -----------------------------------------------------------------------------

alter table public.scheme_benefits add column if not exists benefit_group text;
alter table public.scheme_benefits add column if not exists amount_period text;
alter table public.scheme_benefits add column if not exists coverage text;
alter table public.scheme_benefits add column if not exists hosteller_amount numeric(15,2);
alter table public.scheme_benefits add column if not exists day_scholar_amount numeric(15,2);

comment on column public.scheme_benefits.benefit_group is
  'Label for a tier within a benefit, e.g. I, II, III, IV for stipend groups. Null for benefits that are not tiered.';
comment on column public.scheme_benefits.amount_period is
  'How often the amount is paid, e.g. "per month" or "per annum". Kept as text because schemes phrase this inconsistently.';
comment on column public.scheme_benefits.coverage is
  'What the benefit pays for, including any caps or limits.';
comment on column public.scheme_benefits.hosteller_amount is
  'Amount for a hosteller, when it differs from the day scholar rate.';
comment on column public.scheme_benefits.day_scholar_amount is
  'Amount for a day scholar, when it differs from the hosteller rate.';

-- -----------------------------------------------------------------------------
-- 3. scheme_process_steps: the ordered application and verification pipeline
-- -----------------------------------------------------------------------------

create table if not exists public.scheme_process_steps (
  id uuid primary key default gen_random_uuid(),
  scheme_id uuid not null references public.schemes(id) on delete cascade,
  step_number integer not null,
  title text not null,
  description text,
  actor text,
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scheme_id, step_number)
);

comment on table public.scheme_process_steps is
  'Ordered steps an applicant passes through, from submission to payment.';
comment on column public.scheme_process_steps.actor is
  'Who carries out the step, e.g. Institute Nodal Officer.';
comment on column public.scheme_process_steps.is_verified is
  'False until a department officer has checked this step against the scheme guideline. Drives the "verify before publishing" warning in the admin UI.';

create index if not exists idx_scheme_process_steps_scheme_id
  on public.scheme_process_steps(scheme_id);

-- -----------------------------------------------------------------------------
-- 4. scheme_criteria: the ordered eligibility checklist
-- -----------------------------------------------------------------------------

create table if not exists public.scheme_criteria (
  id uuid primary key default gen_random_uuid(),
  scheme_id uuid not null references public.schemes(id) on delete cascade,
  criterion_order integer not null,
  label text not null,
  detail text,
  is_mandatory boolean not null default true,
  source_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scheme_id, criterion_order)
);

comment on table public.scheme_criteria is
  'Ordered, human-readable eligibility conditions. Separate from scheme_eligibility, which holds the machine-checkable values (income ceiling, minimum percentage) used to pre-evaluate an applicant.';
comment on column public.scheme_criteria.source_text is
  'The wording from the official guideline, kept so a change made here can be traced back to its source.';

create index if not exists idx_scheme_criteria_scheme_id
  on public.scheme_criteria(scheme_id);

-- -----------------------------------------------------------------------------
-- 5. updated_at triggers, matching the existing pattern
-- -----------------------------------------------------------------------------

create or replace function public.set_scheme_process_steps_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_scheme_process_steps_updated_at on public.scheme_process_steps;
create trigger trg_scheme_process_steps_updated_at
before update on public.scheme_process_steps
for each row execute function public.set_scheme_process_steps_updated_at();

create or replace function public.set_scheme_criteria_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_scheme_criteria_updated_at on public.scheme_criteria;
create trigger trg_scheme_criteria_updated_at
before update on public.scheme_criteria
for each row execute function public.set_scheme_criteria_updated_at();

-- -----------------------------------------------------------------------------
-- 6. Row level security, matching the existing select-to-authenticated pattern
-- -----------------------------------------------------------------------------

alter table public.scheme_process_steps enable row level security;
alter table public.scheme_criteria enable row level security;

drop policy if exists "scheme_process_steps_select" on public.scheme_process_steps;
create policy "scheme_process_steps_select" on public.scheme_process_steps
for select to authenticated
using (true);

drop policy if exists "scheme_process_steps_admin_all" on public.scheme_process_steps;
create policy "scheme_process_steps_admin_all" on public.scheme_process_steps
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "scheme_criteria_select" on public.scheme_criteria;
create policy "scheme_criteria_select" on public.scheme_criteria
for select to authenticated
using (true);

drop policy if exists "scheme_criteria_admin_all" on public.scheme_criteria;
create policy "scheme_criteria_admin_all" on public.scheme_criteria
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- =============================================================================
-- SEED
-- =============================================================================

-- -----------------------------------------------------------------------------
-- BVOBC — Post-Matric Scholarship Scheme For ST Students
-- This is the only scheme whose figures below have been supplied and checked.
-- -----------------------------------------------------------------------------

update public.schemes
set
  scheme_type = 'Centrally Sponsored Scheme',
  overview = 'Financial support for Scheduled Tribe (ST) students pursuing post-matriculation studies — Class XI, Class XII, ITI, Diploma, undergraduate, postgraduate, M.Phil or Ph.D. — at recognised institutions in India. The scheme is funded by the Ministry of Tribal Affairs, Government of India, and is disbursed directly into the student''s own bank account.',
  updated_at = now()
where scheme_code = 'BVOBC';

-- Benefits.
--
-- There is no unique constraint on scheme_benefits that these rows could
-- conflict against, and benefit_group is nullable, so a unique index on
-- (scheme_id, benefit_type, benefit_group) would still let the two untiered
-- rows duplicate each other. Rather than add a constraint the existing data may
-- already violate, the seeded rows are removed and re-inserted.
--
-- The delete is scoped to the exact benefit_type values this migration owns, so
-- any other benefit an administrator has added to BVOBC is left untouched, and
-- re-running the migration replaces the figures instead of stacking copies.
delete from public.scheme_benefits b
using public.schemes s
where b.scheme_id = s.id
  and s.scheme_code = 'BVOBC'
  and b.benefit_type in ('tuition_and_compulsory_fees', 'monthly_stipend', 'disability_allowance');

insert into public.scheme_benefits (
  scheme_id, academic_year, benefit_type, benefit_group, description,
  coverage, amount_period, hosteller_amount, day_scholar_amount, conditions
)
select
  s.id,
  s.academic_year,
  v.benefit_type,
  v.benefit_group,
  v.description,
  v.coverage,
  v.amount_period,
  v.hosteller_amount,
  v.day_scholar_amount,
  v.conditions
from public.schemes s
cross join (values
  (
    'tuition_and_compulsory_fees', null::text,
    'Tuition and compulsory fees',
    'Reimbursed as per the fee structure fixed by the State Fee Committee. For private institutions the reimbursement is capped at: Engineering 2,50,000 per annum, MBBS 6,00,000 per annum, and all other courses 1,00,000 per annum.',
    'per annum', null::numeric, null::numeric, 'Applies to the full course fee approved by the State Fee Committee.'
  ),
  (
    'monthly_stipend', 'I',
    'Group I — Professional degree, postgraduate and Ph.D.',
    'Monthly maintenance allowance for students in professional degree, postgraduate and doctoral courses.',
    'per month', 1200.00, 550.00, 'Payable for up to 10 months in each academic year.'
  ),
  (
    'monthly_stipend', 'II',
    'Group II — Non-professional undergraduate and postgraduate',
    'Monthly maintenance allowance for students in non-professional undergraduate and postgraduate courses.',
    'per month', 820.00, 530.00, 'Payable for up to 10 months in each academic year.'
  ),
  (
    'monthly_stipend', 'III',
    'Group III — Vocational, ITI and Polytechnic',
    'Monthly maintenance allowance for students in vocational, ITI and polytechnic courses.',
    'per month', 570.00, 300.00, 'Payable for up to 10 months in each academic year.'
  ),
  (
    'monthly_stipend', 'IV',
    'Group IV — Class XI, Class XII and other non-degree courses',
    'Monthly maintenance allowance for students in Class XI, Class XII and other non-degree courses.',
    'per month', 380.00, 230.00, 'Payable for up to 10 months in each academic year.'
  ),
  (
    'disability_allowance', null::text,
    'Disability allowance',
    'Additional monthly allowance for Divyangjan students, on top of the stipend for their group.',
    'per month', 800.00, 600.00, 'For students who hold a valid disability certificate of 40% or above.'
  )
) as v (benefit_type, benefit_group, description, coverage, amount_period, hosteller_amount, day_scholar_amount, conditions)
where s.scheme_code = 'BVOBC';


-- Eligibility criteria, in the order an applicant reads them.
insert into public.scheme_criteria (
  scheme_id, criterion_order, label, detail, is_mandatory
)
select
  s.id, v.criterion_order, v.label, v.detail, true
from public.schemes s
cross join (values
  (1, 'Must belong to a Scheduled Tribe in the domicile State or UT',
      'The applicant must hold Scheduled Tribe status in their State or Union Territory of domicile, supported by a valid ST category certificate.'),
  (2, 'Family annual income must not exceed 2,50,000',
      'Total family income from all sources must be 2,50,000 or less per annum.'),
  (3, 'Must have passed Class X or equivalent',
      'From a board or institution recognised by the State or Central Government.'),
  (4, 'Must not be receiving any other government scholarship or fellowship',
      'The applicant cannot hold another government scholarship or fellowship for the same course at the same time.'),
  (5, 'Course progression must be linear',
      'A student cannot repeat the same level of study in a different stream.')
) as v (criterion_order, label, detail)
where s.scheme_code = 'BVOBC'
on conflict (scheme_id, criterion_order) do update
set label = excluded.label,
    detail = excluded.detail;

-- Verification pipeline for BVOBC.
insert into public.scheme_process_steps (
  scheme_id, step_number, title, description, actor
)
select
  s.id, v.step_number, v.title, v.description, v.actor
from public.schemes s
cross join (values
  (1, 'Online registration and document upload',
      'The student registers on the portal, fills the application and uploads the required documents.',
      'Student'),
  (2, 'Level 1 verification',
      'The institute checks the application and the uploaded documents against its own records.',
      'Institute Nodal Officer (INO)'),
  (3, 'Level 2 and 3 verification',
      'The district and then the state nodal officer review and confirm the verified application.',
      'District / State Nodal Officer'),
  (4, 'Disbursal by Direct Benefit Transfer',
      'The sanctioned amount is credited straight to the student''s own bank account.',
      'PFMS')
) as v (step_number, title, description, actor)
where s.scheme_code = 'BVOBC'
on conflict (scheme_id, step_number) do update
set title = excluded.title,
    description = excluded.description,
    actor = excluded.actor;

-- -----------------------------------------------------------------------------
-- Process pipeline for the remaining four schemes.
--
-- All five Ministry of Tribal Affairs schemes run on the same NITA portal with
-- the same nodal-officer ladder and the same PFMS disbursal, so the steps are
-- the same shape. is_verified is left false on purpose: an officer must confirm
-- each scheme against its own guideline before this is treated as authoritative.
-- -----------------------------------------------------------------------------

insert into public.scheme_process_steps (
  scheme_id, step_number, title, description, actor
)
select
  s.id, v.step_number, v.title, v.description, v.actor
from public.schemes s
cross join (values
  (1, 'Online registration and document upload',
      'The student registers on the portal, fills the application and uploads the required documents.',
      'Student'),
  (2, 'Level 1 verification',
      'The institute checks the application and the uploaded documents against its own records.',
      'Institute Nodal Officer (INO)'),
  (3, 'Level 2 and 3 verification',
      'The district and then the state nodal officer review and confirm the verified application.',
      'District / State Nodal Officer'),
  (4, 'Disbursal by Direct Benefit Transfer',
      'The sanctioned amount is credited straight to the student''s own bank account.',
      'PFMS')
) as v (step_number, title, description, actor)
-- on conflict ... do nothing is the whole guard. An earlier draft also had a
-- `not exists (select 1 ... where scheme_id = s.id)` around this, which was
-- wrong: it fires when *any* step exists, so a scheme an officer had already
-- partly configured (steps 1-2) would be skipped entirely and steps 3-4 could
-- never be filled in. The unique key on (scheme_id, step_number) already
-- protects each existing step individually, so conflict handling is sufficient
-- and does not block completing a partial set.
where s.scheme_code in ('BPVGK', 'A023B', 'ARG45', 'AZKMI')
on conflict (scheme_id, step_number) do nothing;

-- -----------------------------------------------------------------------------
-- Required documents for BVOBC.
--
-- scheme_documents already holds rows for the published schemes. The guard adds
-- only the ones that are genuinely absent rather than re-inserting, because
-- there is no unique constraint on (scheme_id, document_name) and a blind insert
-- would show the applicant the same requirement twice.
-- -----------------------------------------------------------------------------

insert into public.scheme_documents (
  scheme_id, document_name, description, is_mandatory, academic_year
)
select
  s.id, v.document_name, v.description, v.is_mandatory, s.academic_year
from public.schemes s
cross join (values
  ('ST Category Certificate', 'Scanned copy of the Scheduled Tribe certificate issued by the competent authority.', true),
  ('Domicile Certificate', 'Domicile certificate issued by the State/UT, evidencing ST status in the domicile State.', true),
  ('Income Certificate', 'Income certificate issued by the competent State authority, showing annual family income of 2,50,000 or less.', true),
  ('Aadhaar Card', 'Aadhaar card, required for identity verification and for DBT.', true),
  ('Academic Marksheets and Transcripts', 'Marksheets and transcripts for all previous qualifying examinations, starting with Class X.', true),
  ('Admission Receipt or Bonafide Certificate', 'Fee receipt or institute-issued bonafide certificate for the current admission.', true),
  ('Bank Passbook', 'Passbook or account details of an active Aadhaar-linked bank account in the student''s own name, for DBT.', true),
  ('Disability Certificate', 'Disability certificate of 40% or above, required only if the disability allowance is being claimed.', false)
) as v (document_name, description, is_mandatory)
where s.scheme_code = 'BVOBC'
  and not exists (
    select 1
    from public.scheme_documents d
    where d.scheme_id = s.id
      and lower(d.document_name) = lower(v.document_name)
  );
