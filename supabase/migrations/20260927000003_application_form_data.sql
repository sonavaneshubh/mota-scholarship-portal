-- =============================================================================
-- 20260927000003_application_form_data.sql
--
-- Storage for the applicant-facing application form.
--
-- Why this file exists
-- --------------------
-- The form has to show three different kinds of thing, and the `applications`
-- table (which predates the migration folder — see 20260927000002) can hold none
-- of them:
--
--   1. Data that already lives in the applicant's profile. That is NOT copied
--      here. Profile stays the single source of truth, and this migration adds
--      no columns that would duplicate it. The form reads applicant_profiles and
--      its ten sibling tables live, so a change in My Profile shows up in every
--      application immediately instead of drifting into a stale per-application
--      copy.
--   2. Scheme-specific answers — the small set of extra questions a particular
--      scholarship asks that the profile does not already answer. This is what
--      scheme_answers holds.
--   3. Which of the applicant's existing documents are attached to which
--      requirement of this particular scheme. This is what application_documents
--      holds.
--
-- So the rule the form is built on:
--   already in profile  -> read it, never ask again
--   required by scheme  -> ask, and store the answer here
--   a required document -> link the document the applicant already uploaded
--
-- Both additions are additive and idempotent. Nothing is dropped, and no
-- existing application is modified except to receive the documented defaults.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Scheme-specific answers and the declaration, on `applications`
--
-- scheme_answers is jsonb rather than a column per question on purpose. The
-- questions are derived from each scheme's own scheme_eligibility row, so they
-- differ per scheme and over time. A jsonb bag keyed by a stable question key
-- means a new scheme can ask a new question with no migration, and an old answer
-- for a question a scheme no longer asks is simply ignored by the form rather
-- than orphaned in a permanent column.
--
-- The keys and the control type of each question are defined in
-- frontend/src/lib/applicationFormRules.ts; the database deliberately does not
-- validate the bag's shape, because the vocabulary of questions is a frontend
-- concern and constraining it here would mean a migration per question.
-- -----------------------------------------------------------------------------
alter table public.applications
  add column if not exists scheme_answers jsonb not null default '{}'::jsonb;

alter table public.applications
  add column if not exists declaration_accepted boolean not null default false;

alter table public.applications
  add column if not exists declaration_accepted_at timestamptz;

alter table public.applications
  add column if not exists draft_saved_at timestamptz;

comment on column public.applications.scheme_answers is
  'Answers to the scheme-specific questions, keyed by question key (see frontend/src/lib/applicationFormRules.ts). Only holds what the applicant profile does not already answer; profile data is never copied here.';

comment on column public.applications.declaration_accepted is
  'True once the applicant has ticked the accuracy declaration. Required before the application can move out of draft.';

-- -----------------------------------------------------------------------------
-- 2. application_documents — which uploaded file satisfies which scheme
--    requirement
--
-- This is deliberately a link table, not a copy. The bytes and the metadata row
-- stay in applicant_documents / the private storage bucket; this table only
-- records the pairing "for application X, requirement Y is satisfied by document
-- Z". That is what lets the form show an already-uploaded certificate as
-- Available instead of demanding the same file again, and it is what stops the
-- same document being attached twice to one application.
--
-- The requirement points at scheme_documents.document_name, which is real data
-- imported per scheme, so the checklist is never hardcoded in the UI.
-- -----------------------------------------------------------------------------
create table if not exists public.application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  -- Derived by the trigger below from the parent application, never sent by the
  -- client. It is denormalised onto the link row on purpose: every RLS policy
  -- needs a column to check, and resolving it through a join to `applications`
  -- on every read of a checklist would mean the policy cannot be a simple
  -- `applicant_id = current_applicant_id()` comparison.
  applicant_id uuid not null references public.applicant_profiles(id) on delete cascade,
  scheme_document_id uuid not null references public.scheme_documents(id) on delete cascade,
  document_id uuid not null references public.applicant_documents(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- One document per requirement per application. Re-attaching the same
  -- requirement is an update of the existing row, not a second row, which is
  -- what keeps the checklist free of duplicates.
  constraint application_documents_unique_requirement
    unique (application_id, scheme_document_id)
);

-- Fix: handle legacy column name 'applicant_document_id' -> 'document_id'
-- The remote database may have the old column name from a previous schema version.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'application_documents'
      AND column_name = 'applicant_document_id'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'application_documents'
      AND column_name = 'document_id'
  ) THEN
    ALTER TABLE public.application_documents
      RENAME COLUMN applicant_document_id TO document_id;
  END IF;
END
$$;

comment on table public.application_documents is
  'Links an applicant''s uploaded document to the scheme requirement it satisfies for one application. Holds no file data.';

-- Defensive, for a table left behind by an earlier revision of this file that
-- predates the applicant_id column. On a fresh create the column is already
-- there and this is a no-op. The backfill is what lets the not-null tightening
-- below succeed instead of erroring on any pre-existing row.
alter table public.application_documents
  add column if not exists applicant_id uuid references public.applicant_profiles(id) on delete cascade;

update public.application_documents ad
set applicant_id = a.applicant_id
from public.applications a
where a.id = ad.application_id
  and ad.applicant_id is null;

alter table public.application_documents
  alter column applicant_id set not null;

comment on column public.application_documents.applicant_id is
  'Denormalised from the parent application by set_application_document_owner(). The client never supplies it; it exists so the RLS policies can be a direct column comparison.';

create index if not exists idx_application_documents_application_id
  on public.application_documents(application_id);
create index if not exists idx_application_documents_document_id
  on public.application_documents(document_id);

-- -----------------------------------------------------------------------------
-- 3. applicant_id is derived, never sent
--
-- The client never supplies applicant_id. It is copied off the parent
-- application here, so the RLS policies below have a real subject to check and a
-- tampered request body cannot attach a row to somebody else's application.
--
-- The same function also proves the document belongs to this applicant. RLS
-- already stops an applicant *reading* another applicant's document, but that
-- alone would not stop a crafted INSERT naming a guessed document uuid — so the
-- ownership of the document is verified server-side at write time.
-- -----------------------------------------------------------------------------
create or replace function public.set_application_document_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select a.applicant_id into new.applicant_id
  from public.applications a
  where a.id = new.application_id;

  if new.applicant_id is null then
    raise exception 'Application % does not exist or has no applicant', new.application_id;
  end if;

  if not exists (
    select 1 from public.applicant_documents d
    where d.id = new.document_id and d.applicant_id = new.applicant_id
  ) then
    raise exception 'Document % does not belong to this applicant', new.document_id;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_application_document_owner on public.application_documents;
create trigger set_application_document_owner
  before insert or update on public.application_documents
  for each row
  execute function public.set_application_document_owner();

revoke all on function public.set_application_document_owner() from public;

-- -----------------------------------------------------------------------------
-- 4. Grants and RLS
--
-- Same subject as every other applicant table in this project: the row's
-- applicant_id compared to public.current_applicant_id(), which resolves
-- auth.uid() to the applicant_profiles row. DELETE is granted because
-- un-attaching a wrongly chosen document is a normal correction; it is still
-- scoped to the applicant's own rows, and it removes only the link — the
-- document itself is untouched and stays in their document library.
-- -----------------------------------------------------------------------------
revoke all on table public.application_documents from anon;
grant select, insert, update, delete on table public.application_documents to authenticated;

alter table public.application_documents enable row level security;

drop policy if exists "application_documents_select_own" on public.application_documents;
create policy "application_documents_select_own" on public.application_documents
  for select to authenticated
  using (applicant_id = public.current_applicant_id());

drop policy if exists "application_documents_insert_own" on public.application_documents;
create policy "application_documents_insert_own" on public.application_documents
  for insert to authenticated
  with check (applicant_id = public.current_applicant_id());

drop policy if exists "application_documents_update_own" on public.application_documents;
create policy "application_documents_update_own" on public.application_documents
  for update to authenticated
  using (applicant_id = public.current_applicant_id())
  with check (applicant_id = public.current_applicant_id());

drop policy if exists "application_documents_delete_own" on public.application_documents;
create policy "application_documents_delete_own" on public.application_documents
  for delete to authenticated
  using (applicant_id = public.current_applicant_id());

drop policy if exists "application_documents_admin_all" on public.application_documents;
create policy "application_documents_admin_all" on public.application_documents
  for all to authenticated
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

-- -----------------------------------------------------------------------------
-- 5. Guarding the draft -> submitted transition
--
-- The RLS policies above only decide *whose* rows an applicant may touch. They
-- say nothing about *what* may be written, so on their own an applicant could
-- PATCH status straight to 'submitted' with no declaration and no documents and
-- RLS would allow it. A client is never a trustworthy place to enforce this,
-- because PostgREST is directly reachable — the rule has to live here.
--
-- This trigger is the authoritative check. It fires only on the transition out
-- of draft, so it costs nothing on ordinary draft saves and never blocks an
-- officer moving an application forward.
--
-- It is deliberately not a substitute for the button state in the UI: the UI
-- still shows the list of what is missing first, because "your application was
-- rejected" is a worse experience than "you still need two documents".
-- -----------------------------------------------------------------------------
create or replace function public.guard_application_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  missing text;
begin
  -- Only the transition out of draft is guarded. Re-saving a draft, or an
  -- officer advancing a submitted application, is untouched.
  if new.status is distinct from 'draft' and old.status = 'draft' then
    if coalesce(new.declaration_accepted, false) is not true then
      raise exception 'The declaration must be accepted before submitting';
    end if;

    -- Every mandatory requirement of this scheme needs a document attached. The
    -- check is per-requirement rather than a count, so the error can name what is
    -- missing, and so a scheme with two mandatory documents needs two rows.
    select string_agg(sd.document_name, ', ' order by sd.document_name)
      into missing
    from public.scheme_documents sd
    where sd.scheme_id = new.scheme_id
      and coalesce(sd.is_mandatory, false) is true
      and not exists (
        select 1
        from public.application_documents ad
        where ad.application_id = new.id
          and ad.scheme_document_id = sd.id
      );

    if missing is not null then
      raise exception 'Missing required document(s): %', missing;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_application_submission on public.applications;
create trigger guard_application_submission
  before update on public.applications
  for each row
  execute function public.guard_application_submission();

revoke all on function public.guard_application_submission() from public;

comment on function public.guard_application_submission() is
  'Refuses a draft -> submitted transition unless the declaration is accepted and every mandatory scheme_documents row for the scheme has a linked applicant document. Makes the submit gate authoritative rather than UI-only.';
