-- =============================================================================
-- Repair: columns the live database is missing because the creating migrations
-- are not self-healing.
--
-- WHY THIS FILE EXISTS
--
-- Every table in this project is declared with `create table if not exists`. That
-- is a no-op when the table already exists, so a column added to a `create table`
-- block after the table was first deployed is NEVER added to an existing database.
-- On a fresh database the schema comes out correct and the bug is invisible; on
-- this project the tables predate the current column lists, so the columns are
-- missing and the app gets Postgres 42703 on every query that names them.
--
-- Re-running the creating migrations does not fix this. Confirmed against the live
-- project: `schemes` has `academic_year` but `scheme_eligibility`,
-- `scheme_benefits` and `scheme_documents` do not, and `application_documents` has
-- only id, application_id and created_at.
--
--   fixed here ....... academic_year on scheme_eligibility, scheme_benefits,
--                      scheme_documents
--                      scheme_document_id, document_id on application_documents
--   already fixed by
--   20260927000003 ... applications.scheme_answers, declaration_accepted,
--                      declaration_accepted_at, draft_saved_at
--                      application_documents.applicant_id
--   deliberately NOT
--   changed here ..... the master-data tables (religions, caste_categories,
--                      course_levels, disability_types, states). Those were a
--                      frontend bug -- the queries named `name` where the schema
--                      says `label` -- and were corrected in the client. The
--                      database is correct and must not be renamed to match a bug.
--
-- This file is idempotent and additive. It adds columns, backfills what can be
-- derived, and never drops or deletes a row.
--
-- ORDERING: run after 20260927000003.
--
-- IF THIS FILE RAISES
--
-- Two blocks raise instead of guessing, because a wrong guess here would either
-- lose data or silently grant document ownership to the wrong applicant. Both
-- messages say what to do. Nothing is deleted automatically.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. academic_year on the three scheme child tables.
--
-- Backfilled from the parent scheme, which is the only defensible source: a child
-- row belongs to exactly one scheme, and the scheme carries the year. Rows whose
-- scheme is missing (orphans) or whose scheme has a null year cannot be resolved
-- and are reported rather than filled with a placeholder that would then be shown
-- to applicants as a real academic year.
-- -----------------------------------------------------------------------------

alter table public.scheme_eligibility add column if not exists academic_year text;
alter table public.scheme_benefits   add column if not exists academic_year text;
alter table public.scheme_documents  add column if not exists academic_year text;

-- Fix: scheme_documents is missing updated_at column, but the trigger
-- set_scheme_documents_updated_at tries to set NEW.updated_at = now().
-- Add the column and backfill before any UPDATE fires the trigger.
alter table public.scheme_documents
  add column if not exists updated_at timestamptz;

update public.scheme_documents
   set updated_at = created_at
 where updated_at is null;

alter table public.scheme_documents
  alter column updated_at set default now();

comment on column public.scheme_eligibility.academic_year is
  'Academic year this eligibility rule applies to. Backfilled from the parent scheme when added to an existing database.';
comment on column public.scheme_benefits.academic_year is
  'Academic year this benefit applies to. Backfilled from the parent scheme when added to an existing database.';
comment on column public.scheme_documents.academic_year is
  'Academic year this required document applies to. Nullable: a document requirement may span years. Backfilled from the parent scheme when added to an existing database.';

update public.scheme_eligibility t
   set academic_year = s.academic_year
  from public.schemes s
 where t.scheme_id = s.id
   and t.academic_year is null
   and s.academic_year is not null;

update public.scheme_benefits t
   set academic_year = s.academic_year
  from public.schemes s
 where t.scheme_id = s.id
   and t.academic_year is null
   and s.academic_year is not null;

update public.scheme_documents t
   set academic_year = s.academic_year
  from public.schemes s
 where t.scheme_id = s.id
   and t.academic_year is null
   and s.academic_year is not null;

-- scheme_documents.academic_year is nullable in the schema definition, so it stops
-- here. The other two are `not null` there, and are only tightened once the
-- backfill has actually succeeded -- tightening first would fail on any row the
-- UPDATE could not resolve, and failing on that alone would hide the real problem.
do $$
declare
  v_unresolved bigint;
begin
  select count(*) into v_unresolved
    from public.scheme_eligibility
   where academic_year is null;

  if v_unresolved > 0 then
    -- Concatenation, not a `%` placeholder: in PL/pgSQL a bare `%` starts a format
    -- specifier, so text like "% row(s)" is parsed as format type `r` and silently
    -- mangles the sentence. `||` leaves nothing to misparse.
    raise exception using
      message =
        'scheme_eligibility has ' || v_unresolved::text ||
        ' unresolved row(s) with no academic_year, so the not null constraint was not applied. '
        'Each one references a scheme that is missing or has a null academic_year. '
        'Fix or remove those rows, then re-run this migration.';
  end if;

  alter table public.scheme_eligibility alter column academic_year set not null;
end $$;

do $$
declare
  v_unresolved bigint;
begin
  select count(*) into v_unresolved
    from public.scheme_benefits
   where academic_year is null;

  if v_unresolved > 0 then
    raise exception using
      message =
        'scheme_benefits has ' || v_unresolved::text ||
        ' unresolved row(s) with no academic_year, so the not null constraint was not applied. '
        'Each one references a scheme that is missing or has a null academic_year. '
        'Fix or remove those rows, then re-run this migration.';
  end if;

  alter table public.scheme_benefits alter column academic_year set not null;
end $$;

create index if not exists idx_scheme_eligibility_academic_year
  on public.scheme_eligibility (academic_year);
create index if not exists idx_scheme_benefits_academic_year
  on public.scheme_benefits (academic_year);

-- -----------------------------------------------------------------------------
-- 2. application_documents.scheme_document_id and .document_id.
--
-- These two are different in kind from everything above: there is no source to
-- derive them from. A link row records "this application attached that document to
-- that scheme requirement", and nothing else in the database holds that fact. The
-- parent `applications` row gives applicant_id (already backfilled by 0003) but not
-- which document was attached.
--
-- So the columns are added as nullable, and the not null constraints are applied
-- only if no unrepairable row exists. The foreign keys can be attached to a column
-- whose existing rows are still null -- a null reference always satisfies a
-- foreign key -- so they are declared inline and are not held back by the
-- validation. If any row survives without a value, this raises and says so. That
-- is deliberate:
--
--   * Inventing a document_id would attach an applicant's file to a requirement it
--     was never uploaded for, which is worse than a missing row.
--   * Deleting the rows silently would destroy applicant uploads on a scholarship
--     portal, and would do it without anyone having decided that is acceptable.
--
-- These rows can only come from a partial or abandoned deployment of
-- 20260927000003, because that migration is what first creates this table and the
-- feature is not reachable in the app while the columns are missing. If this block
-- raises, the intended resolution is to clear the table and let applicants
-- re-attach, which is a decision for a human, not for this file:
--
--   -- inspect first
--   select count(*) from public.application_documents;
--   -- then, only if confirmed acceptable
--   truncate table public.application_documents;
--   -- and re-run this migration
-- -----------------------------------------------------------------------------

-- 2a. The columns, each with its foreign key declared inline.
--
-- Declaring REFERENCES here rather than as a separate `add constraint` means the
-- column and its referential integrity arrive together and a fresh database ends
-- up correct from one statement. PostgreSQL auto-names an inline column
-- reference `<table>_<column>_fkey` -- that is
-- `application_documents_scheme_document_id_fkey` and
-- `application_documents_document_id_fkey`, which are exactly the conname values
-- the pg_constraint guards further below test for. So a re-run recognises the
-- constraints it created last time instead of adding a second, duplicate pair.
--
-- `add column if not exists` is a no-op when the column already exists, so on a
-- database that already has one of these columns *without* its foreign key the
-- inline clause is skipped entirely. That is precisely why the guarded
-- `add constraint` blocks are still required: the two mechanisms cover each
-- other, and neither is redundant.
--
-- The columns are left nullable on purpose. They are tightened to not null in the
-- validation block below, and only after the orphan check has confirmed every
-- row can carry a value.
alter table public.application_documents
  add column if not exists scheme_document_id uuid
  references public.scheme_documents(id) on delete cascade;
alter table public.application_documents
  add column if not exists document_id uuid
  references public.applicant_documents(id) on delete cascade;
alter table public.application_documents
  add column if not exists updated_at timestamptz;

-- 2b. updated_at: backfill, then default.
--
-- Ordered before any other statement that writes to this table, because an
-- update that fires a row trigger would otherwise see a null updated_at. The
-- `where updated_at is null` guard is what makes re-running safe: a second pass
-- finds nothing to do rather than overwriting a real modification timestamp with
-- the original creation one.
update public.application_documents
   set updated_at = created_at
 where updated_at is null;

alter table public.application_documents
  alter column updated_at set default now();

comment on column public.application_documents.scheme_document_id is
  'The scheme requirement this attachment satisfies. Added by 20260927000004 to an existing database; not derivable for rows created before it existed.';
comment on column public.application_documents.document_id is
  'The uploaded applicant document that satisfies the requirement. Added by 20260927000004 to an existing database; not derivable for rows created before it existed.';

do $$
declare
  v_orphan bigint;
begin
  select count(*) into v_orphan
    from public.application_documents
   where scheme_document_id is null
      or document_id is null;

  if v_orphan > 0 then
    raise exception using
      message =
        'application_documents has ' || v_orphan::text ||
        ' row(s) with no scheme_document_id or document_id, and neither can be derived from any '
        'other table, so the not null constraints were not applied. The foreign keys are in place '
        'and accept these nulls, so the table is usable; only the not null guarantees are missing. '
        'These rows predate the columns. '
        'Inspect with "select * from public.application_documents", then either delete them '
        '(applicants re-attach their documents) or populate the two columns by hand, then '
        're-run this migration. Nothing has been deleted.';
  end if;

  alter table public.application_documents alter column scheme_document_id set not null;
  alter table public.application_documents alter column document_id set not null;

  -- Postgres has no "add constraint if not exists", so check the catalog first.
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.application_documents'::regclass
       and conname = 'application_documents_scheme_document_id_fkey'
  ) then
    alter table public.application_documents
      add constraint application_documents_scheme_document_id_fkey
      foreign key (scheme_document_id)
      references public.scheme_documents (id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.application_documents'::regclass
       and conname = 'application_documents_document_id_fkey'
  ) then
    alter table public.application_documents
      add constraint application_documents_document_id_fkey
      foreign key (document_id)
      references public.applicant_documents (id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.application_documents'::regclass
       and conname = 'application_documents_applicant_id_fkey'
  ) then
    -- 20260927000003 adds applicant_id with this reference; re-asserted here so
    -- the file is safe to run on its own.
    alter table public.application_documents
      add constraint application_documents_applicant_id_fkey
      foreign key (applicant_id)
      references public.applicant_profiles (id) on delete cascade;
  end if;
end $$;

create index if not exists idx_application_documents_scheme_document_id
  on public.application_documents (scheme_document_id);

commit;
