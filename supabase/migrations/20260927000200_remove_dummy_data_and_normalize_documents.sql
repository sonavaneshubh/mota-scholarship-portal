-- =============================================================================
-- Phase 12 : Remove dummy/seed data and normalise document requirements
-- =============================================================================
-- Scope, decided after inspecting the live database rather than assuming names:
--
--   * 11 schemes existed, not 5. Six were seed/demo rows with zero applications:
--       MSB-DPDD-DTE, MSB-PMS-VJNT, MSB-RCSMS-EBC  (archived, Maharashtra schemes
--                                                  that are not MoTA schemes)
--       SCHEMEDETAILS "Unknown Scheme"              (draft, pending_review)
--       TEST-001 "Test Scheme" / TEST-DUP "Test Dup"
--     They contributed 18 scheme_documents, all with document_type 'Other' or
--     'Test', plus 4 scheme_eligibility rows. None is referenced by an
--     application, so they are deleted here rather than hidden in the UI.
--
--   * The five real MoTA schemes are NOT touched: their scheme rows,
--     eligibility, benefits, process steps, criteria and sources are left alone.
--     Only document *naming* and *mandatory flags* are normalised, per the
--     instruction to simplify the document layer.
--
--   * Document names are normalised onto one canonical spelling so the same
--     document cannot appear twice under two labels (10th Certificate vs
--     10th Marksheet vs SSC Marksheet, etc.).
--
--   * Documents that a guideline genuinely requires are KEPT even though they
--     appear on the "remove if not officially required" list:
--       - ST / PVTG (caste) certificate : mandatory for all five tribal schemes.
--       - Disability / Divyangjan certificate : BPVGK and BVOBC both pay an
--         Additional Disability Allowance, so the certificate is required. It is
--         only applicable to applicants claiming that allowance, so it is marked
--         is_mandatory = false and shown under "If applicable" rather than
--         demanding it from every applicant.
--       - A023B bona fide certificate, fee receipt and bank passbook : the
--         guideline requires enrolment proof and a payment account.
--       - ARG45 offer letter and income certificate : both are conditional
--         (institute-priority tier, FAQ-sourced respectively), so both are
--         is_mandatory = false.
--
--   * "Previous / Last Year Marksheet" is added ONLY to BPVGK and BVOBC, the two
--     yearly-progression schemes where the source defines a multi-year course and
--     the document is meaningful from the second year. It is NOT added to the
--     three fellowships, because no guideline states such a requirement and
--     inventing one is not permitted.
--
-- Preceded by 20260927000160_official_scheme_data_documents.sql.
-- A version 3 snapshot of the five schemes' document lists is taken first, so
-- this migration is reversible.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Snapshot the current document state of the five schemes (version 3)
--    version 2 (20260927000100) predates the official-data migration; this is
--    the rollback point for the document normalisation below.
-- -----------------------------------------------------------------------------
insert into public.scheme_versions (scheme_id, version_number, academic_year, snapshot, change_summary)
select s.id, 3, s.academic_year,
       jsonb_build_object(
         'scheme_documents', coalesce((select jsonb_agg(to_jsonb(d) order by d.document_name)
                                       from public.scheme_documents d where d.scheme_id = s.id), '[]'::jsonb),
         'schemes',          jsonb_build_array(to_jsonb(s))
       ),
       'Phase 12 pre-cleanup snapshot: dummy schemes removed and scheme document names normalised (2026-09-27).'
from public.schemes s
where s.scheme_code in ('BPVGK','BVOBC','A023B','ARG45','AZKMI')
on conflict (scheme_id, version_number) do nothing;

-- -----------------------------------------------------------------------------
-- 1. Delete the six dummy / seed schemes.
--    applications.scheme_id is ON DELETE RESTRICT, so this would fail loudly if
--    any application referenced one of these; verified first that none does.
--    All child rows cascade (scheme_documents, eligibility, benefits, criteria,
--    process steps, sources).
-- -----------------------------------------------------------------------------
do $$
declare
  v_protected text;
begin
  select string_agg(s.scheme_code, ', ')
    into v_protected
  from public.schemes s
  join public.applications a on a.scheme_id = s.id
  where s.scheme_code in ('MSB-DPDD-DTE','MSB-PMS-VJNT','MSB-RCSMS-EBC',
                          'SCHEMEDETAILS','TEST-001','TEST-DUP');
  if v_protected is not null then
    raise exception 'Aborting: dummy schemes have real applications: %', v_protected;
  end if;
end $$;

delete from public.schemes
where scheme_code in ('MSB-DPDD-DTE','MSB-PMS-VJNT','MSB-RCSMS-EBC',
                      'SCHEMEDETAILS','TEST-001','TEST-DUP');

-- -----------------------------------------------------------------------------
-- 2. DDL: course-year gate on a document requirement.
--    required_from_course_year = 2 means "only required from the second year of
--    the course onwards". NULL means required regardless of year. This is what
--    makes "First Year -> no Previous/Last Year Marksheet" expressible in data
--    rather than in React, so the API and the UI cannot disagree.
-- -----------------------------------------------------------------------------
alter table public.scheme_documents
  add column if not exists required_from_course_year smallint;

comment on column public.scheme_documents.required_from_course_year is
  'Lowest course year (1-based) at which this document is required. NULL = required at every year.';

-- -----------------------------------------------------------------------------
-- 3. DDL: application_documents.scheme_document_id.
--    The application form queries and upserts on this column
--    (applicationFormService.ts, onConflict 'application_id,scheme_document_id')
--    but it was never created, so attaching an uploaded document to a scheme
--    requirement failed at runtime with a missing-column error. Nothing references
--    scheme_documents today, so the dependency can be introduced safely.
--    ON DELETE CASCADE: a link to a deleted requirement is meaningless.
-- -----------------------------------------------------------------------------
alter table public.application_documents
  add column if not exists scheme_document_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'application_documents_scheme_document_id_fkey'
  ) then
    alter table public.application_documents
      add constraint application_documents_scheme_document_id_fkey
      foreign key (scheme_document_id) references public.scheme_documents(id) on delete cascade;
  end if;
end $$;

create unique index if not exists application_documents_app_scheme_doc_uniq
  on public.application_documents (application_id, scheme_document_id)
  where scheme_document_id is not null;

-- -----------------------------------------------------------------------------
-- 4. Normalise document names onto one canonical spelling per document.
--    Renamed in place rather than deleted and re-inserted so that descriptions,
--    formats, size limits and provenance survive untouched.
-- -----------------------------------------------------------------------------

-- 4a. Identity / income / category, shared by the school-level schemes.
update public.scheme_documents d
set document_name = 'Aadhaar Card'
from public.schemes s
where s.id = d.scheme_id
  and d.document_name = 'Aadhaar Number';

update public.scheme_documents d
set document_name = 'Income Certificate'
from public.schemes s
where s.id = d.scheme_id
  and d.document_name = 'Family Income Certificate';

-- 4b. Marksheet normalisation. Every spelling of the same document collapses onto
--     one name so no scheme can show "10th Certificate" and "10th Marksheet".
update public.scheme_documents d
set document_name = '10th Marksheet', document_type = 'Marksheet'
from public.schemes s
where s.id = d.scheme_id
  and d.document_name in ('10th / Matriculation / Equivalent Certificate',
                          '10th Certificate / Marksheet');

update public.scheme_documents d
set document_name = 'Previous / Last Year Marksheet', document_type = 'Marksheet'
from public.schemes s
where s.id = d.scheme_id
  and d.document_name = 'Last Qualified Marks';

update public.scheme_documents d
set document_name = 'Post-Graduation Marksheet'
from public.schemes s
where s.id = d.scheme_id
  and d.document_name = 'Post-Graduation Mark Sheet';

update public.scheme_documents d
set document_name = 'Graduation / Post-Graduation Marksheet'
from public.schemes s
where s.id = d.scheme_id
  and d.document_name = 'Graduation / Post-Graduation Mark Sheet';

-- BVOBC's "all examinations passed" bundle is the 10th+12th qualification proof.
update public.scheme_documents d
set document_name = '12th Marksheet',
    document_type = 'Marksheet',
    description = 'Mark sheet of the last qualifying examination passed, or the equivalent degree certificate where the qualification was a degree. All examinations passed are recorded on the portal.'
from public.schemes s
where s.id = d.scheme_id
  and d.document_name = 'Certificates, Diplomas and Degrees for All Examinations Passed';

-- A023B's qualifying-examination bundle keeps its own name: for a PG scheme it
-- is neither the 10th nor the 12th, and forcing it to "12th Marksheet" would be
-- wrong.
update public.scheme_documents d
set document_name = 'Qualifying Examination Marksheet'
from public.schemes s
where s.id = d.scheme_id
  and d.document_name = 'Mark Sheet / Certificate of Qualifying Examination';

-- 4c. Scheme-specific documents: renamed to the wording used in the cleanup brief
--     so they read consistently, but retained because the guideline requires them.
update public.scheme_documents d
set document_name = 'College Enrollment / Bonafide Certificate'
from public.schemes s
where s.id = d.scheme_id
  and d.document_name = 'Bona fide Certificate';

update public.scheme_documents d
set document_name = 'Bank Passbook'
from public.schemes s
where s.id = d.scheme_id
  and d.document_name = 'Scanned Copy of the Bank Passbook';

update public.scheme_documents d
set document_name = 'Offer of Admission'
from public.schemes s
where s.id = d.scheme_id
  and d.document_name = 'Offer of Admission from IITs/AIIMS/IIMs/IISERs';

update public.scheme_documents d
set document_name = 'ST Certificate', document_type = 'Category Certificate'
from public.schemes s
where s.id = d.scheme_id
  and d.document_name = 'ST Certificate';

update public.scheme_documents d
set document_name = 'ST / PVTG Certificate', document_type = 'Category Certificate'
from public.schemes s
where s.id = d.scheme_id
  and d.document_name = 'ST Certificate / PVTG Certificate';

-- ARG45's photograph row is already named per the guideline; align the remaining
-- schemes so the label is identical everywhere.
update public.scheme_documents d
set document_name = 'Passport-size Photograph'
from public.schemes s
where s.id = d.scheme_id
  and d.document_name = 'Latest Coloured Passport-size Photograph';

-- -----------------------------------------------------------------------------
-- 5. Remove the one genuine duplicate: AZKMI listed the ST certificate and the
--    PVTG certificate as two separate requirements. Both are the same category
--    certificate for the same applicant, so they collapse into one row. The
--    mandatory ST row is kept and its name widened to cover both.
-- -----------------------------------------------------------------------------
delete from public.scheme_documents d
using public.schemes s
where s.id = d.scheme_id
  and s.scheme_code = 'AZKMI'
  and d.document_name = 'PVTG Certificate';

-- With the separate PVTG row gone, every scheme must use the same category
-- certificate label, otherwise AZKMI's mandatory row still read "ST Certificate"
-- while ARG45 and A023B read "ST / PVTG Certificate" for the same document.
update public.scheme_documents d
set document_name = 'ST / PVTG Certificate'
from public.schemes s
where s.id = d.scheme_id
  and d.document_name = 'ST Certificate';

-- -----------------------------------------------------------------------------
-- 6. Mark genuinely conditional documents as not mandatory.
--    These stay listed so the applicant can see them, but they move into the
--    "If applicable" group instead of blocking submission for everyone.
-- -----------------------------------------------------------------------------
update public.scheme_documents d
set is_mandatory = false
from public.schemes s
where s.id = d.scheme_id
  and d.document_type = 'Disability Certificate';

update public.scheme_documents d
set is_mandatory = false
from public.schemes s
where s.id = d.scheme_id
  and d.document_name = 'Offer of Admission'
  and s.scheme_code = 'ARG45';

-- ARG45's income certificate is FAQ-sourced and explicitly non-gatekeeping.
update public.scheme_documents d
set is_mandatory = false
from public.schemes s
where s.id = d.scheme_id
  and s.scheme_code = 'ARG45'
  and d.document_type = 'Income Certificate';

-- -----------------------------------------------------------------------------
-- 7. "Previous / Last Year Marksheet", from the second year of the course.
--    Added to the two yearly-progression schemes only (see header note). The
--    row carries required_from_course_year = 2, which is what makes the
--    first-year applicant not be asked for it.
--
--    BVOBC already had this document, renamed from "Last Qualified Marks" in 4b.
--    The update below therefore also applies the year gate to the renamed row,
--    which would otherwise keep NULL and be demanded in the first year.
-- -----------------------------------------------------------------------------
insert into public.scheme_documents
  (scheme_id, document_type, document_name, description, is_mandatory,
   accepted_formats, max_file_size_mb, academic_year, is_required_fresh,
   is_required_renewal, required_from_course_year)
select s.id, 'Marksheet', 'Previous / Last Year Marksheet',
       v.description, true,
       null::text[], null::numeric, null, true, true, 2
from public.schemes s
join (values
  ('BPVGK', 'Mark sheet of the previous year of study. Required from the second year of the course onwards, so a class IX applicant is not asked for it.'),
  ('BVOBC', 'Mark sheet of the previous year of study, used to confirm the award is continued on regularity of attendance and performance. Required from the second year of the course onwards.')
) as v(scheme_code, description) on v.scheme_code = s.scheme_code
where s.scheme_code in ('BPVGK','BVOBC')
  and s.status = 'published'
  and not exists (
    select 1 from public.scheme_documents d2
    where d2.scheme_id = s.id and d2.document_name = 'Previous / Last Year Marksheet'
  );

update public.scheme_documents d
set required_from_course_year = 2,
    description = 'Mark sheet of the previous year of study, used to confirm the award is continued on regularity of attendance and performance. Required from the second year of the course onwards.'
from public.schemes s
where s.id = d.scheme_id
  and s.scheme_code in ('BPVGK','BVOBC')
  and d.document_name = 'Previous / Last Year Marksheet'
  and d.required_from_course_year is distinct from 2;

-- -----------------------------------------------------------------------------
-- 8. Remove the dummy 'Other' document type from the applicant lookup table.
--    'other' is no longer used by any scheme_documents row, and it is the label
--    that let undifferentiated documents accumulate.
-- -----------------------------------------------------------------------------
delete from public.applicant_document_types
where code = 'other'
  and not exists (
    select 1 from public.scheme_documents d
    where d.document_type = 'Other'
  );
