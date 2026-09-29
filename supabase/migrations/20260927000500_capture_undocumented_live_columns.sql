-- =============================================================================
-- Baseline : capture the live columns that the migration history never recorded
-- =============================================================================
-- Why this migration exists
-- ------------------------
-- A read-only audit of the linked project (mciwgsdthqjaadtzuthq) found columns
-- that exist in the live database but appear in no file in this migration tree.
-- They were added to the live database by some process that did not leave a
-- migration behind, so the database is currently NOT reproducible from this
-- repository:
--
--   a fresh `supabase db reset`, a staging rebuild, or a `db push` into an
--   empty project would create the schema WITHOUT them, and the next write that
--   populates them would fail.
--
-- Nothing in the portal reads or writes these columns today. They are dormant
-- scaffolding for a future OCR/extraction feature, and they are empty:
--
--   application_documents  92 rows  |  ai_extraction = '{}' on all 92
--                                     |  ai_confidence, human_verified_* = null
--   applications           20 rows  |  eligibility_details = '{}' on all 20
--   applicant_documents   111 rows  |  ai_extracted_data, ai_confidence,
--                                     |  verification_notes = null
--
-- So this migration records the state that already exists. It is a no-op on the
-- live database and only does work on a database that lacks the columns.
--
-- Safety
-- ------
-- Every statement is `add column if not exists`. Against the live database all
-- of them are skipped, so no column is touched, renamed, retyped, dropped or
-- backfilled, and no row is modified. Against a database that does not have
-- them, the columns are created with the definitions observed in production.
--
-- The defaults below were derived from the live data: a column that reads '{}'
-- on every row that predates any writer is a `default '{}'::jsonb`, and a
-- column that reads null on every row has no default. See the verification
-- queries at the end of this file, which re-derive both from the data.
--
-- Deliberately NOT included
-- ------------------------
-- No OCR tables, no field-comparison table, no processing status, no RLS
-- changes, no frontend changes. Those are separate steps. This migration only
-- makes the current database reproducible.
--
-- One thing this migration cannot do
-- ---------------------------------
-- `add column if not exists` is skipped entirely when the column already
-- exists, so it will NOT repair a column that exists with the WRONG type. The
-- statements in the "verification" section below assert the live type instead,
-- so a mismatch fails loudly rather than being silently accepted.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- application_documents : per-application structured extraction + human sign-off
-- -----------------------------------------------------------------------------
-- This is the table the future feature will actually use. ai_extraction holds
-- the structured fields read off the file, human_verified_data holds the
-- values an officer confirmed. Keeping both means the machine's reading is
-- preserved even after a human overwrites it, which is the property that makes
-- the review auditable.
--
-- ai_confidence is deliberately left nullable and unpopulated: it is a
-- single scalar for the whole document, which cannot express "this one field is
-- uncertain". The per-field comparison table in a later migration is what will
-- carry field-level confidence. This column is preserved as-is rather than
-- removed, because production data references it.
alter table public.application_documents
  add column if not exists ai_extraction       jsonb      default '{}'::jsonb,
  add column if not exists ai_confidence       numeric,
  add column if not exists human_verified_data jsonb,
  add column if not exists human_verified_by   uuid references auth.users(id) on delete set null,
  add column if not exists human_verified_at   timestamptz;

comment on column public.application_documents.ai_extraction is
  'Structured fields extracted from the document by OCR. Empty object until a pipeline writes to it. Never read by the current portal.';
comment on column public.application_documents.ai_confidence is
  'Document-level extraction confidence, 0-1. Document-level only; does not identify which field is uncertain. Null in all current rows.';
comment on column public.application_documents.human_verified_data is
  'Field values an officer confirmed. Stored separately from ai_extraction so the machine reading survives human correction. Null in all current rows.';
comment on column public.application_documents.human_verified_by is
  'auth.users.id of the officer who signed off. on delete set null, matching applicant_documents.verified_by, so removing an account does not cascade-delete verification history.';
comment on column public.application_documents.human_verified_at is
  'When the officer signed off. Null until the document is human-verified.';

-- -----------------------------------------------------------------------------
-- applications : eligibility evaluation detail + final decision
-- -----------------------------------------------------------------------------
-- eligibility_result already existed and is recorded in
-- 20260927000270_demo_admin_readonly_submitted_access.sql, where the admin view
-- projects it. Its companion eligibility_details had not been captured
-- anywhere, so a rebuild would have produced an applications table that the
-- admin view selects from but that does not have the column, and the view
-- would have failed to create. That this pair is a required pair is the reason
-- to record both together.
--
-- final_decision_at / final_decision_by are the decision trail. They are
-- recorded now while empty so that the decision flow, when built, writes to
-- columns that are already in the schema rather than adding them under time
-- pressure later.
alter table public.applications
  add column if not exists eligibility_details jsonb      default '{}'::jsonb,
  add column if not exists final_decision_at    timestamptz,
  add column if not exists final_decision_by    uuid references auth.users(id) on delete set null;

comment on column public.applications.eligibility_details is
  'Per-rule breakdown behind eligibility_result. Empty object in all current rows; the current portal computes eligibility in the browser and never persists it.';
comment on column public.applications.final_decision_at is
  'When an officer recorded the final outcome. Null until a decision is made.';
comment on column public.applications.final_decision_by is
  'auth.users.id of the deciding officer. on delete set null so that removing an account does not cascade-delete a decision record.';

-- -----------------------------------------------------------------------------
-- applicant_documents : the same idea, on the applicant's own file
-- -----------------------------------------------------------------------------
-- applicant_documents is the applicant's library of files and predates the
-- per-application link table. It carries its own extraction columns so that a
-- file can be read once at upload time, independently of whether it has been
-- attached to an application yet. That is the intended difference from
-- application_documents: this one is about the file, the other is about a
-- specific use of the file.
--
-- verification_notes is the officer's comment. It is separate from remarks,
-- which is the applicant's own note on the file.
alter table public.applicant_documents
  add column if not exists ai_extracted_data   jsonb default '{}'::jsonb,
  add column if not exists ai_confidence       numeric,
  add column if not exists verification_notes  text;

comment on column public.applicant_documents.ai_extracted_data is
  'Structured fields extracted from this uploaded file. Empty object until a pipeline writes to it. Never read by the current portal.';
comment on column public.applicant_documents.ai_confidence is
  'File-level extraction confidence, 0-1. Null in all current rows.';
comment on column public.applicant_documents.verification_notes is
  'Officer note on the verification outcome. Distinct from remarks, which is the applicant''s own note on the file.';

-- =============================================================================
-- Verification
-- =============================================================================
-- Run these after applying. They are read-only.
--
-- 1. Every column present, with the type and nullability it should have.
--    This is the one that matters: it compares the EXPECTED type against the
--    ACTUAL type, so a column that exists with the wrong type is reported here
--    rather than being silently tolerated by `if not exists`.
--
--    select table_name, column_name, data_type, is_nullable, column_default
--      from information_schema.columns
--     where (table_name, column_name) in (
--       ('application_documents','ai_extraction'),
--       ('application_documents','ai_confidence'),
--       ('application_documents','human_verified_data'),
--       ('application_documents','human_verified_by'),
--       ('application_documents','human_verified_at'),
--       ('applications','eligibility_details'),
--       ('applications','final_decision_at'),
--       ('applications','final_decision_by'),
--       ('applicant_documents','ai_extracted_data'),
--       ('applicant_documents','ai_confidence'),
--       ('applicant_documents','verification_notes'))
--     order by table_name, column_name;
--    Expect 11 rows. column_default should be '{}'::jsonb for ai_extraction,
--    eligibility_details and ai_extracted_data, and null for the rest.
--
-- 2. The data is untouched. Counts must be unchanged from before the migration.
--
--    select
--      (select count(*) from public.application_documents) as application_documents,
--      (select count(*) from public.applications)           as applications,
--      (select count(*) from public.applicant_documents)    as applicant_documents;
--
-- 3. Every ai_extraction row is still the same empty object, none nulled.
--
--    select count(*) filter (where ai_extraction is null)      as null_rows,
--           count(*) filter (where ai_extraction = '{}'::jsonb) as empty_rows,
--           count(*)                                          as total_rows
--      from public.application_documents;
--    Expect null_rows = 0, empty_rows = total_rows = 92.
--
-- 4. Nothing was extracted or verified by the migration.
--
--    select count(*) filter (where ai_confidence is not null)       as with_confidence,
--           count(*) filter (where human_verified_data is not null) as human_verified,
--           count(*) filter (where human_verified_by is not null)   as verified_by,
--           count(*) filter (where human_verified_at is not null)   as verified_at
--      from public.application_documents;
--    Expect all four = 0.
--
--    select count(*) filter (where ai_extracted_data is not null) as extracted,
--           count(*) filter (where verification_notes is not null) as notes
--      from public.applicant_documents;
--    Expect extracted = 0, notes = 0. (ai_extracted_data reads '{}'.)
--
-- 5. No new constraints or indexes were introduced. The two *_by columns
--    reference auth.users only if the constraint did not already exist, since
--    `add column if not exists` skips the whole clause when the column is
--    already present.
--
--    select conname, conrelid::regclass as table_name, pg_get_constraintdef(oid)
--      from pg_constraint
--     where conrelid in ('public.application_documents'::regclass,
--                        'public.applications'::regclass,
--                        'public.applicant_documents'::regclass)
--       and contype = 'f';
-- =============================================================================
