-- =============================================================================
-- Fix: the submission guard must agree with the UI about which documents apply
-- =============================================================================
-- Symptom
--   An applicant at a year of study below a requirement's
--   `required_from_course_year` could never submit. The UI hid the requirement
--   (see `filterDocumentsForCourseYear` in the frontend), so it was never shown,
--   so it was never attached, and yet the guard still demanded it. The applicant
--   ticked the declaration, pressed Submit, and received
--   "Missing required document(s): Previous / Last Year Marksheet" for a file
--   the form had deliberately not asked for. There was no way to satisfy it, so
--   the application stayed a draft forever.
--
--   This affects "Previous / Last Year Marksheet" on BPVGK and BVOBC, which are
--   the only two requirements with `required_from_course_year = 2`. BPVGK is a
--   pre-matric scheme, so a first-year applicant is its normal case - this is not
--   a theoretical edge.
--
-- Cause
--   `guard_application_submission` (added in 20260927000003) required *every*
--   mandatory row of the scheme and never looked at `required_from_course_year`.
--
-- Fix
--   Exempt a requirement when the applicant's course year is below the year the
--   requirement starts applying to, mirroring the frontend exactly. An unknown
--   course year keeps every requirement, on purpose: showing too few documents
--   because data is missing would let an incomplete application through, which is
--   worse than asking for one extra file. That is the same trade-off the
--   frontend makes, so the two cannot disagree.
--
-- Scope
--   Replaces the guard's body only. The trigger itself stays
--   `before update on public.applications` and still guards only the transition
--   out of draft, so re-saving a draft and any officer-side transition are
--   untouched. No RLS, policy, table or column is changed by this migration.
-- =============================================================================
create or replace function public.guard_application_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  missing text;
  course_year smallint;
begin
  -- Only the transition out of draft is guarded. Re-saving a draft, or an
  -- officer advancing a submitted application, is untouched.
  if new.status is distinct from 'draft' and old.status = 'draft' then
    if coalesce(new.declaration_accepted, false) is not true then
      raise exception 'The declaration must be accepted before submitting';
    end if;

    -- The applicant's course year, if we know it. A missing or absent course
    -- row leaves this null, which (like the frontend) keeps every requirement.
    select cc.year_of_study
      into course_year
    from public.current_courses cc
    where cc.applicant_id = new.applicant_id
    order by cc.created_at desc nulls last, cc.id desc
    limit 1;

    -- Every mandatory requirement of this scheme that applies at this course
    -- year needs a document attached. The check is per-requirement rather than a
    -- count, so the error can name what is missing, and so a scheme with two
    -- mandatory documents needs two rows.
    select string_agg(sd.document_name, ', ' order by sd.document_name)
      into missing
    from public.scheme_documents sd
    where sd.scheme_id = new.scheme_id
      and coalesce(sd.is_mandatory, false) is true
      -- Matches filterDocumentsForCourseYear(): a requirement that only starts
      -- applying in a later year does not apply to this applicant. An unknown
      -- course year (null) is not known to be below the threshold, so the
      -- requirement still stands.
      and (
        sd.required_from_course_year is null
        or course_year is null
        or course_year >= sd.required_from_course_year
      )
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

-- Re-point the trigger at the replaced function. The trigger was never dropped,
-- so this only needs to exist for databases where it is absent; the drop/create
-- pair keeps the migration safe to re-run.
drop trigger if exists guard_application_submission on public.applications;
create trigger guard_application_submission
before update on public.applications
for each row
execute function public.guard_application_submission();
