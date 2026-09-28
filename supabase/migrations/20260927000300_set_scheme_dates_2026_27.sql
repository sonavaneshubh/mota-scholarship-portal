-- =============================================================================
-- 20260927000300_set_scheme_dates_2026_27.sql
--
-- Moving the five official schemes from the 2025-2026 cycle to 2026-2027.
--
-- The problem
-- -----------
-- All five official schemes were seeded with one cycle and never moved since:
--
--     academic_year          = '2025-2026'
--     application_start_date = 2025-07-01
--     application_end_date   = 2025-12-31
--
-- (20260927000001_sync_scholarship_master_data.sql; 20260927000120 corrected
-- eleven other scheme fields and left the window alone, and nothing later has
-- touched these columns).
--
-- `public.schemes.application_end_date` is the only deadline column in the
-- schema - `applications` has no deadline of its own - and the applicant form
-- treats it as a hard close:
--
--     const remaining = daysUntil(scheme?.scheme.application_end_date ?? null);
--     const closed = remaining !== null && remaining < 0;
--     ...
--     <Button disabled={... || closed === true}>Submit application</Button>
--
-- So the window shut on 2026-01-01 and the button has been disabled on every
-- scheme since: the form reports "The deadline for this scheme has passed. You
-- can still save a draft, but it cannot be submitted", no application can reach
-- status 'submitted', and the department sees nothing, because
-- demo_admin_submitted_applications filters `a.status = 'submitted'`.
--
-- The change
-- ----------
-- One cycle forward, for the five official schemes only:
--
--     academic_year          '2025-2026'  ->  '2026-2027'
--     application_start_date 2025-07-01   ->  2026-07-01
--     application_end_date   2025-12-31   ->  2027-12-31
--
-- The stored calendar pattern is preserved exactly: a 1 July opening and a
-- 31 December closing, which is what the seeded data had, moved forward one
-- year. No new kind of date is invented.
--
-- Nothing else is written
-- -----------------------
-- scheme_code, name, short_name, description, overview, status,
-- verification_status, eligibility, benefits, document requirements, renewal
-- flags, source metadata - untouched. No row is inserted, updated outside these
-- five, or deleted.
--
-- `academic_year` on the child tables (scheme_eligibility, scheme_benefits,
-- scheme_documents, scheme_versions) is deliberately NOT changed: they are read
-- by scheme_id alone (services/schemes.ts), and no query filters them by
-- academic_year, so a scheme's own cycle value is self-contained. If a future
-- cycle wants per-year eligibility rows, that is its own migration.
--
-- No application logic changed
-- ----------------------------
-- The form still derives the closed state from this column and nothing else;
-- no start-date gate is introduced (application_start_date is display-only
-- today, and stays that way), and the submission guards, the compare-and-set in
-- submitApplication, the RLS policies and the document guard are all untouched.
-- The database remains the source of truth and no date is hardcoded anywhere in
-- the frontend.
--
-- Safety
-- ------
--   - `scheme_code in (...)` names the five schemes explicitly, so no other row
--     can be written.
--   - The re-run guard means a row that already holds all three target values is
--     not rewritten, so re-applying this migration is a no-op that does not even
--     touch updated_at.
--   - `updated_at` is not in the statement: the existing BEFORE UPDATE trigger
--     set_schemes_updated_at maintains it, as it does for any other edit.
--
-- Verify
-- ------
--   select scheme_code, name, academic_year,
--          application_start_date, application_end_date, status
--     from public.schemes
--    where scheme_code in ('BPVGK','BVOBC','A023B','ARG45','AZKMI')
--    order by scheme_code;
-- =============================================================================

update public.schemes
   set academic_year = '2026-2027',
       application_start_date = date '2026-07-01',
       application_end_date = date '2027-12-31'
 where scheme_code in ('BPVGK', 'BVOBC', 'A023B', 'ARG45', 'AZKMI')
   and (
         academic_year is distinct from '2026-2027'
      or application_start_date is distinct from date '2026-07-01'
      or application_end_date is distinct from date '2027-12-31'
       );

comment on column public.schemes.application_end_date is
  'Last date an application may be submitted, or NULL when no closing date has been published. The applicant form derives the closed state from this column alone (daysUntil()), and the database is the source of truth: no date is hardcoded in the frontend. 20260927000300 moved the five official schemes from the 2025-2026 cycle to 2026-2027, keeping the 1 July - 31 December pattern.';
