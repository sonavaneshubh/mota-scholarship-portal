-- -----------------------------------------------------------------------------
-- 20260929153000_allow_applicant_draft_delete.sql
--
-- Lets an applicant delete an application they have not submitted yet.
--
-- Why nothing allowed this before
-- ------------------------------
-- 20260927000002_create_applications.sql granted `select, insert, update` on this
-- table and created policies for exactly those three verbs. There was no DELETE
-- grant and no DELETE policy, so an applicant's session could not remove an
-- application row at all, however the request was written. That was a deliberate
-- position rather than an oversight: `removeDuplicateApplications()` in
-- applicantRecords refuses to delete any non-draft row for exactly this reason —
-- a submitted row is the record of an act the applicant took, and destroying it
-- because of a stray draft beside it would be unrecoverable loss on a
-- scholarship portal.
--
-- What this changes
-- -----------------
-- Only the ability to remove one's own *draft*. The predicate below is the whole
-- safety property, and it lives here rather than in the UI on purpose: PostgREST
-- is directly reachable, so a button that is merely hidden is not a control.
--
--   applicant_id = public.current_applicant_id()  -- whose row it is
--   status = 'draft'                             -- and that it is still a draft
--
-- Both halves are required. The first is the same ownership test every other
-- applicant policy on this table uses, resolved from auth.uid() to the
-- applicant_profiles row. The second is the new part, and it is what keeps a
-- submitted application undeletable by its own applicant once it exists: the
-- moment the row moves out of draft, this predicate stops matching and the delete
-- matches no rows. An applicant withdrawing an application after submission is a
-- separate, deliberate workflow with its own status, not a delete — the
-- `withdrawn` status in applications.status already means that, and inventing a
-- second way to make a submission disappear would leave officers reviewing
-- nothing with no record of why.
--
-- `applications.status` is a text column whose live values are snake_case
-- ('draft', 'submitted', 'under_verification', ...), so the comparison is against
-- 'draft' exactly, not a UI label. An unrecognised status fails the comparison and
-- is therefore preserved.
--
-- The document links go with it, and the uploaded files stay
-- ------------------------------------------------------------------
-- application_documents.application_id is declared `on delete cascade`
-- (20260927000003), so removing a draft removes the links that pointed at it.
-- That is the correct scope: the link says "this file covers this requirement on
-- this application", which is meaningless once the application is gone.
--
-- The files themselves do not go. The bytes are in the private
-- applicant-documents bucket and the metadata row is in applicant_documents,
-- which is the applicant's own document library shared across every application.
-- An applicant who deletes a draft and then applies again reuses their library
-- rather than re-uploading their certificates — the same reasoning that already
-- governs detachSchemeDocument().
--
-- Officers keep the unchanged ability to read and move applications, and
-- applications_admin_all is untouched.
-- -----------------------------------------------------------------------------

grant delete on table public.applications to authenticated;

drop policy if exists "applications_delete_own_draft" on public.applications;
create policy "applications_delete_own_draft" on public.applications
  for delete to authenticated
  using (applicant_id = public.current_applicant_id() and status = 'draft');

-- -----------------------------------------------------------------------------
-- Making the cascade above survivable
--
-- application_documents has its own `before delete` trigger,
-- guard_application_document_detach, added by 20260927000230 to stop an applicant
-- detaching a document from a submitted application. It fires for cascaded
-- deletes too, and as written it cannot tell a cascade from a detach:
--
--   select public.application_status_for_link(old.application_id) into status;
--   if status is distinct from 'draft' then raise exception ...
--
-- Postgres deletes the parent application row first and only then runs this
-- trigger against each child link, so the lookup above returns NULL — the
-- application it is asking about has just been deleted. `NULL is distinct from
-- 'draft'` is TRUE, so the trigger raises, and the delete of a draft that has any
-- document attached fails with "Documents cannot be removed once the application
-- has been submitted", which describes the opposite of what happened.
--
-- So without the change below the feature would appear to work — a draft with no
-- documents would delete fine — and fail on exactly the drafts an applicant
-- actually wants to clear, with a message blaming a submission that never
-- happened. Worth being explicit that this is a bug in the existing trigger
-- rather than a new rule: a trigger cannot protect a submitted application that
-- no longer exists, and application_documents.application_id is NOT NULL with a
-- foreign key, so NULL is reachable only via this cascade.
--
-- The rewrite guards a *surviving* non-draft parent. A real detach from a
-- submitted application still raises, unchanged, and admins still bypass it. The
-- trigger stays attached because this is `create or replace`.
-- -----------------------------------------------------------------------------
create or replace function public.guard_application_document_detach()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  status text;
begin
  if public.current_profile_role() = 'admin' then
    return old;
  end if;

  select public.application_status_for_link(old.application_id) into status;

  if status is not null and status is distinct from 'draft' then
    raise exception
      'Documents cannot be removed once the application has been submitted. Contact the scholarship office if something needs to be corrected.';
  end if;

  return old;
end;
$$;

-- Sanity check, readable in psql after applying. Expect one row.
--   select policyname, cmd, qual
--   from pg_policies
--   where tablename = 'applications' and policyname = 'applications_delete_own_draft';
