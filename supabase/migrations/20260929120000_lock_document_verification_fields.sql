-- ---------------------------------------------------------------------------
-- Lock the document verification audit fields.
--
-- Why this exists
-- ---------------
-- application_documents is the canonical store for document review. Until now
-- two RLS policies gave an applicant UPDATE on the whole row, and an RLS policy
-- is row-scoped, not column-scoped: `application_documents_update_own` checked
-- only `applicant_id`, which is the one column the applicant cannot usefully
-- change. Every other column was therefore writable, including the audit record
--
--     human_verified_data, human_verified_by, human_verified_at, status
--
-- and the officer's deficiency note in `remarks`. An audit field an applicant
-- can write is not an audit field.
--
-- applicant_documents had the same class of hole, and worse: it had *two*
-- applicant UPDATE policies (`applicant_documents_own`, which is FOR ALL, and
-- `applicant_documents_update_own`). They are permissive, so they are OR-ed
-- together -- removing one would have changed nothing at all.
--
-- Nothing in the codebase updates applicant_documents. documentService.ts
-- inserts and deletes; profileService.ts and applicantRecords.ts only read. The
-- UPDATE grant is therefore dead capability and is removed at the policy level,
-- with the trigger below kept as defence in depth in case an UPDATE path is
-- reintroduced later (the deficiency -> replacement flow in a later step is the
-- obvious candidate, and it should be designed deliberately rather than
-- inherited from a blanket FOR ALL).
--
-- The intended ownership, which is what this migration encodes
-- ------------------------------------------------------------
--   application_documents
--     applicant        may change nothing on the protected columns. The one
--                      column it legitimately updates is `document_id`, via the
--                      upsert in attachSchemeDocument(), which is untouched
--                      here and is still validated by set_application_document_owner.
--     service_role     owns the extraction/OCR pipeline: ai_* (and ocr_* once
--                      those columns exist). Must never write the audit record.
--     admin/super_admin perform human verification and reviewer notes.
--     postgres         break-glass, so migrations and manual repair keep working.
--
--   applicant_documents
--     applicant        SELECT/INSERT/DELETE only; no UPDATE.
--     service_role     may write the machine fields, never the reviewer ones.
--     admin/super_admin full access, as they have today.
--
-- Why a trigger and not only RLS
-- -----------------------------
-- RLS cannot restrict which columns a role may write; that is a property of the
-- statement, not of the row. The policy change below is what actually removes
-- the applicant UPDATE on applicant_documents, because nothing legitimate needs
-- it. On application_documents the UPDATE must stay (the upsert's conflict
-- branch depends on it), so the column-level guarantee has to come from a
-- trigger. The codebase already uses exactly this shape:
-- guard_application_document_detach() is a BEFORE DELETE trigger on this same
-- table, security invoker, with a single applicant-safe raise.
--
-- service_role is not exempt
-- --------------------------
-- service_role bypasses RLS but it does NOT bypass triggers. Every branch below
-- is therefore written to be checked inside the trigger rather than assumed from
-- the grant. Getting this wrong would break the OCR Edge Function on its first
-- real run, which writes ai_extraction/ai_confidence/ocr_* and nothing else.
--
-- Deliberately not protected here: ocr_status, ocr_error, ocr_provider,
-- ocr_model, ocr_processed_at, ocr_attempts. Those columns do not exist yet --
-- they are added by 20260929084339 -- and a PL/pgSQL body naming a missing
-- column will not compile. The AI branch below is extended to cover them in the
-- migration that creates them.
--
-- Forward-only: no historical migration is edited or re-run, and nothing is
-- dropped except two RLS policies, which are replaced wholesale by the
-- existing per-command policies that already cover SELECT, INSERT and DELETE.
-- ---------------------------------------------------------------------------


-- ---------------------------------------------------------------- 1. the guard

create or replace function public.guard_application_document_verification()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  -- Break-glass. These are schema owners rather than request roles, so nothing
  -- else in this function can be reached as them.
  if current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  -- (1) Reviewer-owned columns. A person, and only a person with admin rights,
  --     may write these. service_role is included in the rejection on purpose:
  --     verification is a human act and no automated component may record one.
  if new.status is distinct from old.status
     or new.human_verified_data is distinct from old.human_verified_data
     or new.human_verified_by is distinct from old.human_verified_by
     or new.human_verified_at is distinct from old.human_verified_at
     or new.remarks is distinct from old.remarks then
    if not public.is_admin() then
      raise exception
        'This document record is maintained by the scholarship office. Contact the scholarship office if something needs to be corrected.'
        using errcode = '42501';
    end if;
  end if;

  -- (2) Machine-owned columns. The extraction pipeline runs as service_role;
  --     admins may also correct them. Everyone else is refused. The ocr_*
  --     columns join this branch in 20260929084339's follow-up guard.
  if new.ai_extraction is distinct from old.ai_extraction
     or new.ai_confidence is distinct from old.ai_confidence then
    if current_user <> 'service_role' and not public.is_admin() then
      raise exception
        'Document processing results are maintained by the scholarship office. Contact the scholarship office if something needs to be corrected.'
        using errcode = '42501';
    end if;
  end if;

  -- Everything not named above is the applicant's to change, which in practice
  -- means document_id on the upsert path. applicant_id and document_type are
  -- already overwritten unconditionally by set_application_document_owner().
  return new;
end;
$$;

drop trigger if exists guard_application_document_verification
  on public.application_documents;
create trigger guard_application_document_verification
  before update on public.application_documents
  for each row
  execute function public.guard_application_document_verification();


-- ------------------------------------------- 2. applicant_documents, twice

-- Defence in depth. With the policies in section 3 an applicant cannot reach an
-- UPDATE at all, so this function never fires for them today. It is here so
-- that reintroducing an UPDATE path does not silently reopen the hole.

create or replace function public.guard_applicant_document_verification()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if new.verified_by is distinct from old.verified_by
     or new.verified_at is distinct from old.verified_at
     or new.verification_status is distinct from old.verification_status
     or new.document_number is distinct from old.document_number
     or new.verification_notes is distinct from old.verification_notes then
    raise exception
      'This document record is maintained by the scholarship office. Contact the scholarship office if a verification needs to be corrected.'
      using errcode = '42501';
  end if;

  if current_user <> 'service_role'
     and (new.ai_extracted_data is distinct from old.ai_extracted_data
       or new.ai_confidence is distinct from old.ai_confidence) then
    raise exception
      'Document processing results are maintained by the scholarship office. Contact the scholarship office if something needs to be corrected.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_applicant_document_verification
  on public.applicant_documents;
create trigger guard_applicant_document_verification
  before update on public.applicant_documents
  for each row
  execute function public.guard_applicant_document_verification();


-- ------------------------------------- 3. remove the applicant UPDATE grant

-- Both policies are dropped, not just the FOR ALL one. They are permissive, so
-- application_documents_update_own's sibling on this table would still allow
-- the write if only applicant_documents_own were removed.
--
-- Nothing is lost. The capabilities the applicant workflow actually uses are
-- already granted by the three per-command policies, which are not touched:
--
--   applicant_documents_select_own   SELECT  (applicant_id = current_applicant_id()
--                                                 or current_profile_role() = 'admin')
--   applicant_documents_insert_own   INSERT  (applicant_id = current_applicant_id())
--   applicant_documents_delete_own   DELETE  (applicant_id = current_applicant_id())
--
-- Admin access is unaffected: applicant_documents_admin and
-- applicant_documents_admin_all are both FOR ALL and are not touched.
--
-- The table-level UPDATE grant to `authenticated` is deliberately left in place.
-- It is not the vulnerability -- RLS decides which rows a role may touch, and
-- with no UPDATE policy an applicant matches zero rows. Revoking it as well
-- would be defence in depth, but it is a GRANT/REVOKE rather than a policy
-- change and buys nothing on its own.

drop policy if exists "applicant_documents_own" on public.applicant_documents;
drop policy if exists "applicant_documents_update_own" on public.applicant_documents;
