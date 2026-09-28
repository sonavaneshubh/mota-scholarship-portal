-- =============================================================================
-- Demo Admin: read-only access to real submitted applications
-- =============================================================================
-- Goal
--   Let a clearly-labelled Demo Admin read genuinely submitted applications,
--   their applicant profile, their scheme and their documents, without a
--   service-role key in the browser, without loosening any applicant policy,
--   and without giving it a single byte of write access.
--
-- Why views instead of policies on the base tables
--   The admin panel needs a curated projection: a subset of columns from four
--   tables, joined, and only for submitted applications. RLS is row-level only,
--   so a policy on `applicant_profiles` would hand the panel every column of
--   every applicant's row - including `aadhaar_fingerprint`, `aadhaar_masked`,
--   `mobile_number`, `date_of_birth` and `religion` - whether or not the panel
--   renders them. A view is the tool for choosing columns.
--
--   The views are deliberately NOT `security_invoker`, so they run as their
--   owner and read past the base tables' RLS. That is what lets the projection
--   span four tables, and it is also why the authorisation check has to live
--   inside the view body rather than beside it.
--
-- Why the role check is inside the view, not on it
--   PostgreSQL does not support row level security on an ordinary VIEW. Both of
--   these are errors, not warnings:
--
--     alter table demo_admin_submitted_applications enable row level security;
--       ERROR: 42809: ALTER action ENABLE ROW SECURITY cannot be performed on
--              relation "..." DETAIL: This operation is not supported for views.
--
--     create policy ... on demo_admin_submitted_applications;
--       ERROR: "policies for views" is not supported
--
--   So every view below carries the gate as a `where` clause of its own:
--
--     public.current_profile_role() = 'demo_admin'
--
--   `current_profile_role()` is already SECURITY DEFINER and already reads
--   `auth.uid()`, so it resolves the *calling* user even though the view body
--   executes as the view owner. The consequences:
--     - a signed-in applicant, an officer, or the service role querying a view
--       gets zero rows, because none of their profiles carry 'demo_admin';
--     - the `anon` role is not granted at all, so an unauthenticated request is
--       refused by the grant before the body ever runs.
--
--   This is not a weakening of the design. The check is the same check, evaluated
--   in the same transaction, by the same function, against the same `profiles`
--   row. Moving it from the relation into the query is the only place PostgreSQL
--   permits it on a view.
--
-- Read-only, three times over
--   1. Only `select` is granted, so there is no write statement that could be
--      issued against the view.
--   2. `insert`/`update`/`delete`/`truncate` are explicitly revoked as well, so
--      a later careless `grant all` elsewhere in the schema is not enough on its
--      own. (A simple view is auto-updatable, so a stray UPDATE grant would
--      otherwise be immediately exploitable against the base table.)
--   3. The projection selects only the intended columns, and no base table grant
--      is added, so there is no path from these views back to a base table write.
--
--   A Demo Admin session additionally cannot write anywhere else: it holds no
--   grant on `applications`, `applicant_profiles`, `application_documents` or
--   `applicant_documents` at all. Only migration 280 grants it a `for select`
--   storage policy, and that is a read.
--
-- Scope
--   `status = 'submitted'` only. Drafts, and anything an officer later moves to
--   a decision state, are not visible to the Demo Admin - it is a read-only
--   window onto what a submitted application looks like, not a review queue.
--
-- Provisioning (run once, by a human or via the Auth admin API)
--   update public.profiles
--      set role = 'demo_admin'
--    where email = 'demo.admin@example.com';
--
--   `handle_new_user` creates every account with role 'applicant', so this
--   promotion is the one deliberate change. `current_profile_role()` reads the
--   table on every query, so access starts on the next request - no re-login and
--   no JWT claim refresh needed. Note this is stricter than a production admin:
--   role 'admin' is deliberately NOT accepted below.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Re-runnable
-- -----------------------------------------------------------------------------
--   `create or replace view` can only change the *body* of a view, never its
--   column list or their order, so a re-run after an earlier version shipped with
--   fewer columns fails with "cannot change name of view column". Dropping first
--   is the only way to make this safe to re-apply, and it also clears the grants
--   below so they are rebuilt from scratch. Nothing depends on these views, so
--   the cascade is safe here. `cascade` also clears the storage policy from
--   migration 280 that references a view, which is exactly what a re-run wants.
drop view if exists public.demo_admin_submitted_documents cascade;
drop view if exists public.demo_admin_submitted_applications cascade;
drop view if exists public.demo_admin_submitted_requirements cascade;

-- -----------------------------------------------------------------------------
-- Submitted applications, with the applicant, course and scheme beside them
-- -----------------------------------------------------------------------------
create view public.demo_admin_submitted_applications as
select
  -- application
  a.id,
  a.application_number,
  a.status,
  a.submitted_at,
  a.declaration_accepted,
  a.declaration_accepted_at,
  a.draft_saved_at,
  a.scheme_answers,
  a.eligibility_result,
  a.created_at,
  a.updated_at,
  -- applicant (id only; the auth user id is never exposed)
  p.id as applicant_id,
  p.first_name,
  p.middle_name,
  p.last_name,
  p.full_name,
  p.applicant_full_name_as_per_marksheet,
  p.email,
  p.mobile_number,
  p.alternate_mobile,
  p.date_of_birth,
  p.gender,
  p.marital_status,
  p.nationality,
  p.religion,
  p.disability_status,
  p.disability_percentage,
  p.profile_status,
  p.profile_completion_percentage,
  -- the only aadhaar value exposed: four digits, never the fingerprint or the
  -- masked string, and never the underlying document
  p.aadhaar_last4,
  p.profile_photo_path,
  -- course: the most recent row, so an applicant with a history does not
  -- duplicate this application once per enrolment
  c.course_name,
  c.course_level,
  c.degree,
  c.branch,
  c.year_of_study,
  c.institution_name,
  c.university_name,
  c.academic_year,
  -- scheme
  s.id as scheme_id,
  s.scheme_code,
  s.name as scheme_name,
  s.short_name as scheme_short_name,
  s.status as scheme_status,
  s.academic_year as scheme_academic_year,
  s.renewal_available
from public.applications a
join public.applicant_profiles p
  on p.id = a.applicant_id
left join public.schemes s
  on s.id = a.scheme_id
left join lateral (
  select cc.course_name,
         cc.course_level,
         cc.degree,
         cc.branch,
         cc.year_of_study,
         cc.institution_name,
         cc.university_name,
         cc.academic_year
  from public.current_courses cc
  where cc.applicant_id = p.id
  order by cc.created_at desc nulls last, cc.id desc
  limit 1
) c on true
where a.status = 'submitted'
  -- The gate. PostgreSQL refuses RLS on a view, so authorisation is a predicate
  -- in the query itself. `public`, `anon`, or a non-demo `authenticated` role
  -- all read zero rows here.
  and public.current_profile_role() = 'demo_admin';

-- -----------------------------------------------------------------------------
-- The documents attached to those applications
-- -----------------------------------------------------------------------------
create view public.demo_admin_submitted_documents as
select
  ad.id,
  ad.application_id,
  a.application_number,
  ad.applicant_id,
  ad.scheme_document_id,
  ad.document_type,
  ad.status as link_status,
  -- the requirement this document satisfies
  sd.document_name as requirement_name,
  sd.is_mandatory,
  sd.required_from_course_year,
  -- the uploaded file
  d.id as document_id,
  d.document_name as file_document_name,
  d.file_name,
  d.mime_type,
  d.file_size,
  d.storage_path,
  d.verification_status,
  d.document_number,
  d.uploaded_at
from public.application_documents ad
join public.applications a
  on a.id = ad.application_id
left join public.scheme_documents sd
  on sd.id = ad.scheme_document_id
left join public.applicant_documents d
  on d.id = ad.document_id
where a.status = 'submitted'
  and public.current_profile_role() = 'demo_admin';

-- -----------------------------------------------------------------------------
-- The full requirement list for those applications
-- -----------------------------------------------------------------------------
-- Why this is separate from the documents view above
--   The documents view lists what the applicant actually uploaded, one row per
--   attachment. A reviewer also needs to know what the scheme *asked* for: a
--   mandatory document that was never attached is simply absent from an
--   attachments-only list, and an optional document the applicant chose not to
--   send looks like nothing was ever required. `application_documents` cannot
--   answer either question, because a requirement with no attachment has no row
--   there at all.
--
--   So this view is driven from `scheme_documents` and left-joined to the
--   attachment, giving one row per requirement with an explicit status instead of
--   inferring absence from a missing row. It applies the same
--   `required_from_course_year` rule as the applicant form and the submit guard,
--   so a first-year applicant's year-2-only marksheet reads as "not required at
--   this course year" rather than as a missing document.
create view public.demo_admin_submitted_requirements as
select
  a.id as application_id,
  a.application_number,
  sd.id as scheme_document_id,
  sd.document_type,
  sd.document_name as requirement_name,
  sd.description as requirement_description,
  sd.is_mandatory,
  sd.required_from_course_year,
  -- resolved against the applicant's own course year, using the same comparison
  -- as guard_application_submission: an unknown year keeps every requirement
  case
    when sd.required_from_course_year is null then 'required'
    when course.year_of_study is null then 'required'
    when course.year_of_study >= sd.required_from_course_year then 'required'
    else 'not_required_at_this_course_year'
  end as requirement_status,
  -- the attachment satisfying it, if any
  ad.id as application_document_id,
  ad.status as link_status,
  d.id as document_id,
  d.file_name,
  d.file_size,
  d.mime_type,
  d.storage_path,
  d.verification_status,
  d.document_number,
  d.uploaded_at
from public.applications a
join public.schemes s
  on s.id = a.scheme_id
join public.scheme_documents sd
  on sd.scheme_id = s.id
left join lateral (
  select cc.year_of_study
  from public.current_courses cc
  where cc.applicant_id = a.applicant_id
  order by cc.created_at desc nulls last, cc.id desc
  limit 1
) course on true
left join public.application_documents ad
  on ad.application_id = a.id
 and ad.scheme_document_id = sd.id
left join public.applicant_documents d
  on d.id = ad.document_id
where a.status = 'submitted'
  and public.current_profile_role() = 'demo_admin';

-- -----------------------------------------------------------------------------
-- Grants: read, and only read
-- -----------------------------------------------------------------------------
--   `authenticated` rather than a role named demo_admin. The Demo Admin is a
--   Supabase Auth account, so every request it makes arrives as `authenticated`;
--   a grant to a Postgres role it does not assume would be unexercisable. The
--   distinction between a Demo Admin and any other signed-in user is therefore
--   made by the view predicate above, not by the grant - and that is the only
--   place it needs to be made, because no other grant is issued.
grant select on public.demo_admin_submitted_applications to authenticated;
grant select on public.demo_admin_submitted_documents to authenticated;
grant select on public.demo_admin_submitted_requirements to authenticated;

--   Belt and braces against a future `grant all on all tables in schema public`
--   elsewhere in this project. A simple view is auto-updatable, so an UPDATE
--   grant would reach the base table directly; revoking the write privileges means
--   a mistaken grant is not immediately exploitable.
revoke insert, update, delete, truncate on public.demo_admin_submitted_applications from authenticated;
revoke insert, update, delete, truncate on public.demo_admin_submitted_documents from authenticated;
revoke insert, update, delete, truncate on public.demo_admin_submitted_requirements from authenticated;

--   `anon` gets nothing, so an unauthenticated request is refused by the grant.
--   `public` is revoked for the same reason: on a freshly created view the
--   default is no privileges at all, and this states it rather than assuming it.
revoke all on public.demo_admin_submitted_applications from anon, public;
revoke all on public.demo_admin_submitted_documents from anon, public;
revoke all on public.demo_admin_submitted_requirements from anon, public;

--   No base table is touched. `applications`, `applicant_profiles`,
--   `application_documents`, `applicant_documents`, `current_courses`,
--   `scheme_documents` and `schemes` keep exactly the grants and policies they
--   already had, so applicant isolation is unchanged by this file.

-- PostgREST caches the schema; without this the new views are invisible to the
-- API until the next reload. Harmless if the project reloads on its own.
notify pgrst, 'reload schema';
