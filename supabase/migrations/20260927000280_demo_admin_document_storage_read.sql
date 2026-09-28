-- =============================================================================
-- Demo Admin: read-only access to submitted applicants' documents
-- =============================================================================
-- Why this migration exists
--   20260926090300_applicant_documents_storage.sql gives read access to
--   storage.objects on exactly two conditions: the first path segment equals the
--   caller's own applicant id, or the caller's profile role is 'admin'.
--
--   The Demo Admin satisfies neither. It has no applicant_profiles row of its
--   own, so `current_applicant_id()` is null, and its role is 'demo_admin', not
--   'admin'. So the "View" button on a document raised
--   `new row violates row-level security policy` on storage.objects even though
--   the Demo Admin could read the storage_path through the views. The policy is
--   the missing half of the feature, not a bug in it.
--
--   Adding the policy to that existing file instead would rewrite a migration
--   that has already run on the live project, where migrations are applied by
--   hand through the SQL editor and re-running is a no-op. A new file is the only
--   thing that actually lands.
--
-- Why this does not reference a Demo Admin view
--   An earlier revision scoped the policy with
--
--     exists (select 1 from public.demo_admin_submitted_documents d
--             where d.storage_path = storage.objects.name)
--
--   which failed with
--
--     ERROR: 42P01: relation "public.demo_admin_submitted_documents" does not exist
--
--   Two things are wrong with that, and only the first is cosmetic.
--
--   1. It couples this file to whatever migration 270 happens to have created on
--      the day it is applied. Migrations here are applied by hand, in whatever
--      order the operator reaches for them, and 270 has been revised more than
--      once. A storage policy should not inherit that fragility.
--
--   2. Worse, it is order-dependent in a way that fails *silently*. Migration 270
--      opens with `drop view if exists ... cascade`, because it has to. `cascade`
--      drops anything that depends on the view — including this policy. So running
--      280 and then re-running 270 removes document access again, with no error
--      anywhere, and the Demo Admin's View button starts failing at runtime. That
--      is a worse failure than the 42P01, because it looks like a working
--      deployment.
--
--   The requirement can be expressed directly against the base tables instead,
--   which is both independent of migration 270 and immune to the cascade. That is
--   what this file does.
--
-- The real storage path
--   documentService.ts builds every key as
--
--     `${applicantId}/${documentCode}/${crypto.randomUUID()}${extension}`
--
--   i.e. applicant-profile id, then a sanitised document code, then a unique file
--   name. The first segment is the ownership boundary the applicant policies
--   already test with `storage.foldername(name))[1]`.
--
--   That shape is deliberately NOT what this policy keys on. Matching on the
--   first segment would only tell us *whose* file it is, never whether that
--   applicant has a *submitted* application, so it would be a far weaker rule.
--   Instead the policy resolves the object name through
--   application_documents -> applications, which is the actual relationship that
--   makes a document belong to a submitted application.
--
-- Why a SECURITY DEFINER function is required
--   The obvious policy - an `exists` subquery against `applications` and
--   `application_documents` in the policy body - does not work. The policy is
--   evaluated as the calling role, so the subquery is subject to those tables'
--   own RLS, and the Demo Admin deliberately has no grant or policy on either.
--   It would fail closed with a permission error rather than open, which is safe
--   but useless.
--
--   Wrapping the lookup in a SECURITY DEFINER function owned by the migration
--   runner makes it read past that RLS, exactly as `public.current_profile_role()`
--   already does for the role lookup. The function is a boolean gate: it returns
--   true only for a path that belongs to a document linked to a submitted
--   application, and only for a caller whose own profile role is 'demo_admin'.
--   Neither condition can be satisfied by a crafted path.
--
-- Why it is safe
--   * `for select` only. There is no with check, so this grants no write, update
--     or delete — not even on a path that matches.
--   * The role test is inside the function, not merely beside the policy, so the
--     function cannot be used as a data oracle by any other role. `public` and
--     `anon` are revoked execute explicitly, because a function is executable by
--     PUBLIC by default and that default would be a hole.
--   * The reachable set is exactly the documents linked to submitted
--     applications. A draft's document is not reachable even if its path were
--     guessed, because the `status = 'submitted'` test is on the application's
--     own row.
--   * Reads are still short-lived signed URLs. Nothing here makes an object
--     public; the bucket stays private and `public` is never touched.
--   * No applicant policy is changed or removed. The applicant read policy, the
--     admin policy and the insert/update/delete policies are all left exactly as
--     they were, and no base table grant is added.
--   * Role 'admin' is not accepted here. This policy is narrower than the
--     existing admin one and cannot widen it.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- The gate
-- -----------------------------------------------------------------------------
--   `create or replace` so a re-run is a no-op rather than a duplicate. The
--   search_path is pinned so the function body cannot be redirected through a
--   caller-controlled schema.
--
--   SECURITY DEFINER is what lets this read applicant-owned tables at all, so it
--   is the security-critical property of the function and is commented as such.
--   It returns nothing but a boolean and takes one text argument, so it exposes no
--   data even to a caller that passes an arbitrary path: the answer is always
--   either "you are the Demo Admin and this exact path is attached to a submitted
--   application" or "no".
create or replace function public.demo_admin_can_read_document(p_object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_profile_role() = 'demo_admin'
    and exists (
      select 1
      from public.application_documents ad
      join public.applications a
        on a.id = ad.application_id
      join public.applicant_documents d
        on d.id = ad.document_id
      where a.status = 'submitted'
        and d.storage_path is not null
        and d.storage_path = p_object_name
    );
$$;

comment on function public.demo_admin_can_read_document(text) is
  'True only for a demo_admin caller and only for a storage path attached to a submitted application. Used as the sole gate on the Demo Admin storage read policy.';

--   New functions are executable by PUBLIC by default. A boolean gate that is
--   only safe for one role must not be executable by anon, so both are revoked
--   before authenticated is granted it.
revoke all on function public.demo_admin_can_read_document(text) from public;
revoke all on function public.demo_admin_can_read_document(text) from anon;
grant execute on function public.demo_admin_can_read_document(text) to authenticated;

-- -----------------------------------------------------------------------------
-- The policy
-- -----------------------------------------------------------------------------
--   `drop ... if exists` first, matching the style of
--   20260926090300_applicant_documents_storage.sql, so re-running replaces the
--   rule instead of failing on a duplicate name or leaving a stale version
--   behind.
drop policy if exists "demo_admin_submitted_documents_storage_read" on storage.objects;

create policy "demo_admin_submitted_documents_storage_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'applicant-documents'
    and public.demo_admin_can_read_document(storage.objects.name)
  );

notify pgrst, 'reload schema';
