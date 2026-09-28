-- =============================================================================
-- 20260927000230_lock_submitted_applications.sql
--
-- Closing the way *out* of a submitted application.
--
-- The defect this fixes, verified against the live project
-- --------------------------------------------------------
-- 20260927000003 added guard_application_submission(), which refuses a
-- draft -> submitted move unless the declaration is accepted and every mandatory
-- document is linked. That protects the way *in*. Nothing protected the way
-- back *out*, because the RLS policy never had to:
--
--     create policy "applications_update_own" on public.applications
--       for update to authenticated
--       using      (applicant_id = public.current_applicant_id())
--       with check (applicant_id = public.current_applicant_id());
--
-- That policy answers "whose row", never "what may be written to it". So the
-- owning applicant was able to PATCH their own *submitted* application and:
--
--   * set status back to 'draft' and clear submitted_at,
--   * clear declaration_accepted and declaration_accepted_at,
--   * rewrite scheme_answers,
--   * change application_number,
--   * move the application to 'under_review' without an officer ever seeing it,
--   * DELETE rows from application_documents, so the mandatory-document check
--     would have passed on a later re-submission.
--
-- The last two together are the damaging pair: the declaration and the document
-- set that guard_application_submission() relies on are both writable by the
-- applicant, so a submission can be silently retracted, edited and re-submitted
-- with a fresh submitted_at. Any officer decision recorded against the earlier
-- submission would then sit on a record the applicant has since rewritten.
--
-- A PATCH that succeeds this way answers 204, not 200, so it is invisible to a
-- caller checking response codes. The regression test in
-- scripts/applicant-pipeline.e2e.mjs therefore asserts on the re-read row.
--
-- The rule this migration enforces
-- -------------------------------
-- An applicant may only ever write to an application that is still in draft, and
-- may never move the columns that identify it. Once the application has left
-- draft it is frozen for its owner; only a role with administrative rights may
-- move it, and those transitions are the officer workflow's business, not the
-- applicant's.
--
-- The draft -> submitted transition itself is deliberately still allowed, because
-- that is the legitimate submit button. guard_application_submission() already
-- validates it, and the two triggers are ordered so this one runs first and lets
-- it through: Postgres fires BEFORE triggers in name order, and
-- 'guard_application_mutability' sorts before 'guard_application_submission'.
--
-- This deliberately does NOT add a withdrawal feature. Withdrawing needs its own
-- guarded transition and its own decision about what happens to the documents and
-- the deadline; inventing one here would be a product change disguised as a
-- security fix.
--
-- Forward-looking note: profiles.role is a text column constrained to
-- ('applicant','admin'), so 'is this an administrator' is the only distinction
-- available today. When an 'officer' role is added, extend the admin exemption in
-- both functions below, or officers will be locked out of their own workflow.
--
-- On legacy rows with a NULL status: `applications` predates the migration folder
-- (see 20260927000002) and was made by hand, so some historical rows may carry a
-- NULL status. The freeze treats NULL as "not a draft" and therefore locks them,
-- which is the safe direction — an application whose real state cannot be
-- established is not one to let the client rewrite. This migration deliberately
-- does NOT backfill NULL to 'draft', because doing so would hand edit rights to
-- every legacy row that had in fact already been submitted. If any legitimate
-- legacy draft turns out to be locked, correct that row's status explicitly:
--
--   update public.applications set status = 'draft' where id = '<uuid>';
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Freezing the application row
--
-- security inviner, deliberately: the point is to evaluate the caller's own
-- rights, and a SECURITY DEFINER function would resolve current_profile_role()
-- as its owner rather than as the caller. RLS on applications is already enabled,
-- so an officer the trigger does not exempt cannot slip past by reading the row
-- through some other path — the UPDATE itself never arrives.
-- -----------------------------------------------------------------------------
create or replace function public.guard_application_mutability()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  -- Administrators are the officer-side workflow and are out of scope here; the
  -- admin policy on this table is already 'for all'.
  if public.current_profile_role() = 'admin' then
    return new;
  end if;

  -- Identity. application_number is the reference the applicant is shown and an
  -- officer quotes, and it is minted by set_application_reference() on INSERT
  -- precisely so that nothing else can be the author of it. scheme_id is the
  -- other half of applications_applicant_scheme_unique, so moving it would also
  -- let an applicant slide out of the one-application-per-scheme guarantee they
  -- are currently held to. applicant_id is already covered by the policy's WITH
  -- CHECK, but it is named here so the reason is on the record.
  if new.applicant_id is distinct from old.applicant_id
     or new.scheme_id is distinct from old.scheme_id
     or new.application_number is distinct from old.application_number then
    raise exception
      'The applicant, scheme and reference of an application cannot be changed after it is created.';
  end if;

  -- The freeze. old.status = 'draft' is the submit button's own transition and is
  -- deliberately let through; guard_application_submission() decides whether it
  -- is legitimate. Any other starting state means the application has already
  -- been submitted or has been picked up by an officer, and it is no longer the
  -- applicant's to edit.
  if old.status is distinct from 'draft' then
    raise exception
      'This application has already been submitted, so it can no longer be edited. Contact the scholarship office if something needs to be corrected.';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_application_mutability on public.applications;
create trigger guard_application_mutability
  before update on public.applications
  for each row
  execute function public.guard_application_mutability();

-- -----------------------------------------------------------------------------
-- 2. Freezing the document links
--
-- application_documents is the checklist guard_application_submission() counts,
-- and detachSchemeDocument() in the frontend deletes a link on demand. Freezing
-- only the application row would therefore have left the hole open one table
-- across: detach a document from a submitted application, reopen it, re-submit.
--
-- The status is read through a SECURITY DEFINER helper rather than by querying
-- applications inline, because a row-level trigger runs as the caller and an
-- officer acting on somebody else's application would be filtered out of the
-- lookup even though the admin policy permits the delete. Reading through a
-- definer function keeps the exemption above the RLS filter.
-- -----------------------------------------------------------------------------
create or replace function public.application_status_for_link(p_application_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select status from public.applications where id = p_application_id;
$$;

revoke all on function public.application_status_for_link(uuid) from public;
grant execute on function public.application_status_for_link(uuid) to authenticated;

create or replace function public.guard_application_document_detach()
returns trigger
language plpgsql
security inviner
set search_path = public
as $$
declare
  status text;
begin
  if public.current_profile_role() = 'admin' then
    return old;
  end if;

  select public.application_status_for_link(old.application_id) into status;

  if status is distinct from 'draft' then
    raise exception
      'Documents cannot be removed once the application has been submitted. Contact the scholarship office if something needs to be corrected.';
  end if;

  return old;
end;
$$;

drop trigger if exists guard_application_document_detach on public.application_documents;
create trigger guard_application_document_detach
  before delete on public.application_documents
  for each row
  execute function public.guard_application_document_detach();

-- -----------------------------------------------------------------------------
-- 3. Recording the rule where the rest of the file records them
-- -----------------------------------------------------------------------------
comment on function public.guard_application_mutability() is
  'Refuses an applicant UPDATE of an application that has left draft, and refuses any change to applicant_id, scheme_id or application_number. The draft -> submitted transition is allowed through to guard_application_submission(), which validates it. Closes the retraction path that let an applicant reopen, rewrite and re-submit their own submitted application.';

comment on function public.guard_application_document_detach() is
  'Refuses deletion of an application_documents link belonging to an application that has left draft, so the mandatory-document check cannot be satisfied by detaching evidence after submission.';

comment on function public.application_status_for_link(uuid) is
  'Reads applications.status for the detach guard. SECURITY DEFINER so the lookup is not filtered by the caller''s RLS when an officer works on another applicant''s application.';

-- -----------------------------------------------------------------------------
-- 4. A note on what is still open, so it is not mistaken for fixed
--
-- Two related questions this migration intentionally does not answer:
--
--   * applicant_documents rows and the files in the private bucket can still be
--     deleted by their owner after submission (20260926090200 grants DELETE, and
--     the storage policy in 20260926090300 is scoped to the path prefix rather
--     than to the application's status). The link freeze above keeps the
--     submission consistent, but the underlying evidence can still be pulled out
--     from under an officer. That needs a status-aware storage policy, which is
--     a larger change than this one.
--   * public.applications has no DELETE grant and no applicant delete policy, so
--     the draft-pruning delete in applicantRecords.ts cannot currently succeed.
--     That is a separate pre-existing mismatch, left alone here.
-- -----------------------------------------------------------------------------
