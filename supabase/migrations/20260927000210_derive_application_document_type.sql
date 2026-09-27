-- =============================================================================
-- Phase 12b : Derive application_documents.document_type from the requirement
-- =============================================================================
-- Found while auditing the RLS policies on the table that Phase 12 extended.
--
-- The bug
-- -------
-- public.application_documents.document_type is NOT NULL with no default, but
-- the only writer of this table, attachSchemeDocument() in
-- mota-scholarship-portal-frontend/src/services/applicationFormService.ts, sends:
--
--     { application_id, scheme_document_id, document_id }
--
-- so every attach was rejected with
--     null value in column "document_type" violates not-null constraint.
-- The attach flow has therefore never worked. Adding scheme_document_id in
-- 20260927000200 fixed the missing column but not this, so the flow was still
-- broken after it.
--
-- Why the trigger rather than the client
-- -------------------------------------
-- The requirement the applicant attached the file to already knows its own type:
-- that is scheme_documents.document_type, which is the controlled vocabulary the
-- rest of the portal keys off. Deriving it here makes the database the single
-- source of truth, so a hand-crafted or outdated client cannot label a link with
-- a type that contradicts the requirement it points at.
--
-- The existing trigger set_application_document_owner() is the right place: it is
-- already the server-side guard that re-derives applicant_id and refuses links to
-- another applicant's file, and it fires BEFORE INSERT OR UPDATE, i.e. before the
-- RLS WITH CHECK clause is evaluated.
--
-- The frontend needs no change; its existing payload becomes correct as a result.
--
-- Rollback
-- --------
-- null out the type only if every row can be re-derived, then restore the
-- previous function body:
--   update public.application_documents ad
--      set document_type = sd.document_type
--     from public.scheme_documents sd
--    where sd.id = ad.scheme_document_id;
-- =============================================================================

create or replace function public.set_application_document_owner()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_owner uuid;
  v_requirement_type text;
begin
  select a.applicant_id into v_owner
  from public.applications a
  where a.id = new.application_id;

  if v_owner is null then
    raise exception 'Application % does not exist or has no applicant', new.application_id;
  end if;

  if not exists (
    select 1 from public.applicant_documents d
    where d.id = new.document_id and d.applicant_id = v_owner
  ) then
    raise exception 'Document % does not belong to this applicant', new.document_id;
  end if;

  -- Phase 12b: the requirement defines the type. An unqualified link is not a
  -- valid row, so say which field is missing instead of letting the NOT NULL
  -- constraint fail with a column name the applicant developer cannot act on.
  if new.scheme_document_id is null then
    raise exception 'A document link must name the requirement it satisfies (scheme_document_id)';
  end if;

  select sd.document_type into v_requirement_type
  from public.scheme_documents sd
  where sd.id = new.scheme_document_id
    and sd.scheme_id = (select a.scheme_id from public.applications a where a.id = new.application_id);

  if v_requirement_type is null then
    raise exception 'Requirement % does not belong to application %', new.scheme_document_id, new.application_id;
  end if;

  new.applicant_id := v_owner;
  new.document_type := v_requirement_type;
  new.updated_at := now();
  return new;
end;
$$;
