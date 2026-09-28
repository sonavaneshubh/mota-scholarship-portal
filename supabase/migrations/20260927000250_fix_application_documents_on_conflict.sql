-- =============================================================================
-- Fix: make the application_documents unique index usable by ON CONFLICT
-- =============================================================================
-- The reported failure
-- -------------------
-- Attaching an uploaded document to a scheme requirement failed with:
--
--   POST /rest/v1/application_documents
--        ?on_conflict=application_id,scheme_document_id&select=id,...
--   400 Bad Request
--   {"code":"42P10",
--    "message":"there is no unique or exclusion constraint matching the ON CONFLICT specification"}
--
-- The three UUIDs in the payload were all valid and all correctly related, so
-- none of the obvious causes applied. Confirmed against the live database:
--
--   * the application existed and belonged to the applicant
--   * the scheme_document existed and its scheme_id matched the application's
--   * the document_id resolved in public.applicant_documents (the FK target of
--     application_documents.document_id) and its applicant_id matched
--   * RLS was not the problem: on_conflict=id on the same table and the same
--     JWT returned 201
--   * the client is not calling twice: one POST per explicit user action
--
-- What is actually wrong
-- ----------------------
-- 20260927000200 created the uniqueness for this pair as a PARTIAL index:
--
--   create unique index application_documents_app_scheme_doc_uniq
--     on public.application_documents (application_id, scheme_document_id)
--     where scheme_document_id is not null;
--
-- PostgreSQL cannot use a partial unique index to infer a conflict target. The
-- ON CONFLICT clause only works if the inference step finds a matching unique
-- index, and a partial index must be written out with its own predicate:
--
--   on conflict (application_id, scheme_document_id) where scheme_document_id is not null
--
-- PostgREST's on_conflict parameter cannot express a predicate, so no supported
-- spelling of the request can ever match. The live database shows both halves
-- of this at once, which is what makes the diagnosis certain rather than
-- inferred: a plain duplicate INSERT is rejected with
--
--   23505 duplicate key value violates unique constraint
--        "application_documents_app_scheme_doc_uniq"
--
-- so the index exists and is enforced, while the same insert expressed as an
-- upsert is rejected with 42P10 because it cannot be inferred.
--
-- Why the predicate was safe to drop
-- ----------------------------------
-- It was never doing any work. In PostgreSQL NULLs are distinct in a unique
-- index, so (application_id, NULL) never conflicts with (application_id, NULL)
-- and a plain unique index already permits any number of rows with a NULL
-- scheme_document_id. The `where scheme_document_id is not null` clause removed
-- nothing and cost the ON CONFLICT inference. Dropping it makes the index's
-- uniqueness identical to before, and makes the conflict target usable.
--
-- There are currently no rows with a NULL scheme_document_id, so the rebuild
-- has no data to deduplicate and cannot fail.
--
-- No new constraint is added. A table-level UNIQUE constraint would also satisfy
-- the inference, but the index already enforces exactly the intended rule —
-- "one document per requirement per application", per the comment on the table
-- in 20260927000003 — and a second redundant unique object would be a second
-- thing to keep in step. The index is the only object that needs to change.
--
-- Rollback
-- --------
--   drop index public.application_documents_app_scheme_doc_uniq;
--   create unique index application_documents_app_scheme_doc_uniq
--     on public.application_documents (application_id, scheme_document_id)
--     where scheme_document_id is not null;
--
-- which restores the partial form and with it the 42P10 on every attach.
-- =============================================================================

-- Only rebuild when the existing index is the partial form. If it is already
-- non-partial, or absent, the create below is a no-op or does the work, so this
-- migration is safe to run more than once.
do $$
declare
  v_is_partial boolean;
begin
  select (i.indpred is not null) into v_is_partial
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join pg_index i on i.indexrelid = c.oid
  where n.nspname = 'public'
    and c.relname = 'application_documents_app_scheme_doc_uniq';

  if v_is_partial then
    drop index public.application_documents_app_scheme_doc_uniq;
  end if;
end $$;

create unique index if not exists application_documents_app_scheme_doc_uniq
  on public.application_documents (application_id, scheme_document_id);

comment on index public.application_documents_app_scheme_doc_uniq is
  'One document per scheme requirement per application. Deliberately NOT partial: PostgreSQL cannot infer a conflict target from a partial unique index, and applicationFormService.attachSchemeDocument() upserts on exactly these two columns. NULLs remain distinct, so a full unique index permits any number of rows with a NULL scheme_document_id, which is what the removed predicate was there for.';

-- -----------------------------------------------------------------------------
-- Verification, to run after applying:
--
--   -- must be false: the predicate is what blocked the inference
--   select i.indpred is not null as is_partial
--     from pg_class c
--     join pg_namespace n on n.oid = c.relnamespace
--     join pg_index i on i.indexrelid = c.oid
--    where n.nspname = 'public' and c.relname = 'application_documents_app_scheme_doc_uniq';
--
--   -- must be no rows: the rebuild needs no deduplication
--   select application_id, scheme_document_id, count(*)
--     from public.application_documents
--    group by application_id, scheme_document_id
--   having count(*) > 1;
--
--   -- must return 201, not 42P10
--   insert into public.application_documents (application_id, scheme_document_id, document_id)
--   values ('<application>', '<scheme_document>', '<document>')
--   on conflict (application_id, scheme_document_id) do update set document_id = excluded.document_id;
--
--   -- and confirm the trigger still derives the columns the client omits
--   select applicant_id, document_type from public.application_documents
--    where application_id = '<application>';
-- -----------------------------------------------------------------------------
