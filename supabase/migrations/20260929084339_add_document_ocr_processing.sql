-- =============================================================================
-- Document OCR processing state
-- =============================================================================
-- What this migration adds
-- ------------------------
-- A row in public.application_documents is an *attachment*: it says "this
-- uploaded file, attached to this application, satisfies this scheme
-- requirement". It carries no processing state, so there is nowhere to record
-- that OCR was asked for, is running, has finished, or has failed.
--
-- These six columns are that state machine. They are additive bookkeeping
-- about the pipeline, nothing more.
--
-- What this migration deliberately does NOT do
-- -------------------------------------------
-- * It does NOT touch ai_extraction, ai_confidence, human_verified_data,
--   human_verified_by or human_verified_at. All five already exist in the live
--   database. They are the *result* of processing; these columns are the
--   *progress* of it, and conflating the two is how a half-finished run ends up
--   looking like a verified document. Re-declaring any of them here would be a
--   duplicate column, and `add column if not exists` would silently skip it
--   anyway -- which is precisely the class of drift this file exists to avoid.
--
-- * It does NOT add a foreign key on any column. The live database already has
--   a deliberate mismatch of its own here: application_documents.
--   human_verified_by and applications.final_decision_by both reference
--   public.profiles(id), while the unapplied migration
--   20260927000500_capture_undocumented_live_columns.sql declares them as
--   references auth.users(id). Rather than guess a third answer, no constraint
--   is added. ocr_* columns hold no identity, so there is nothing to reference.
--
-- * It does NOT add an index. Nothing in this step polls for work: the Edge
--   Function processes one document per invocation, in the request. An index on
--   ocr_status would be indexing a queue that does not exist yet. Add it in the
--   same migration that introduces the worker.
--
-- * It does NOT add or change any RLS policy. The existing SELECT policies on
--   application_documents (application_documents_own,
--   application_documents_select_own, application_documents_admin,
--   application_documents_admin_all) are row-level, so they already permit
--   reading these new columns on any row an applicant or admin may see. A
--   second policy would widen access, not reflect it.
--
-- Column-by-column
-- ---------------
-- ocr_status         the state. Constrained to the five values below, because an
--                    unconstrained status is how a queue grows a sixth state
--                    that nothing knows how to handle. 'pending' is the default,
--                    which is correct for the rows that already exist: their
--                    ai_extraction is '{}', so they have genuinely never been
--                    processed. This is a column default, not a data migration;
--                    no existing row is read, rewritten or backfilled.
-- ocr_error          last failure, in operator-facing words. Never contains a
--                    provider response body, a key, a file path or a stack
--                    trace -- ocr_error is selectable by the applicant under the
--                    existing policies, so it is treated as applicant-visible.
-- ocr_provider       which integration produced the extraction, e.g. 'gemini'.
--                    Recorded so a different provider can be compared later
--                    without re-running anything.
-- ocr_model          the specific model version, e.g. 'gemini-2.0-flash'.
-- ocr_processed_at   when the run finished. Null until ocr_status is
--                    'completed'; not cleared on failure, so a document that
--                    succeeded once and later failed is distinguishable.
-- ocr_attempts       how many times processing has been attempted. Incremented
--                    by the Edge Function at claim time so that retry storms are
--                    visible and so a caller cannot silently loop on one file.
--
-- Safety
-- ------
-- The only DDL is one `alter table ... add column if not exists` statement
-- carrying six add-column clauses, one set of `comment on column` statements,
-- and one guarded `add constraint`. Every one of them is a no-op on a database
-- that already has them, so running this against production changes nothing if a
-- previous run succeeded. No row is inserted, updated, deleted or selected. No
-- existing column is retyped, renamed, dropped, or given a new default. No
-- existing index, policy, trigger or function is touched.
--
-- The check constraint is added inside a do block because PostgreSQL has no
-- `add constraint if not exists`, and the guard is what keeps the file
-- re-runnable.
-- =============================================================================

alter table public.application_documents
  add column if not exists ocr_status        text        not null default 'pending',
  add column if not exists ocr_error         text,
  add column if not exists ocr_provider      text,
  add column if not exists ocr_model         text,
  add column if not exists ocr_processed_at  timestamptz,
  add column if not exists ocr_attempts      integer     not null default 0;

comment on column public.application_documents.ocr_status is
  'OCR processing state: pending | queued | processing | completed | failed. Defaults to pending, which is also the correct value for rows that predate OCR, because their ai_extraction is still the empty object.';
comment on column public.application_documents.ocr_error is
  'Applicant-visible message from the most recent failed run. Never a provider response body, credential, file path or stack trace.';
comment on column public.application_documents.ocr_provider is
  'Which integration produced ai_extraction, e.g. ''gemini''. Null until a run completes.';
comment on column public.application_documents.ocr_model is
  'The specific model version that produced ai_extraction, e.g. ''gemini-2.0-flash''. Kept separate from ocr_provider so a provider change is visible without a schema change.';
comment on column public.application_documents.ocr_processed_at is
  'When the most recent run finished. Null until ocr_status reaches ''completed''. Not cleared on failure, so a document that has succeeded at least once stays distinguishable from one that never has.';
comment on column public.application_documents.ocr_attempts is
  'How many times processing has been attempted. Incremented at claim time by process-document-ocr so retries and retry storms are visible.';

-- Postgres has no `add constraint if not exists`, so the catalog is consulted
-- first. The name is fixed rather than derived so a re-run recognises the
-- constraint it created last time.
do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conrelid = 'public.application_documents'::regclass
       and conname = 'application_documents_ocr_status_check'
  ) then
    alter table public.application_documents
      add constraint application_documents_ocr_status_check
      check (ocr_status in ('pending', 'queued', 'processing', 'completed', 'failed'));
  end if;
end
$$;
