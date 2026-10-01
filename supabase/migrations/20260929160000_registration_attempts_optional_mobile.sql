-- =============================================================================
-- 20260929160000_registration_attempts_optional_mobile.sql
-- Lets a registration be proved by email alone.
-- =============================================================================
-- Why this change exists
--   Registration previously required two proofs: an email OTP and an SMS OTP.
--   The mobile number is now optional on the registration form. An applicant who
--   leaves it blank registers and completes on the email proof alone; an
--   applicant who fills it in still has to prove the number, because a number
--   that is stored but unverified is not an identity.
--
--   `registration-start` therefore stores NULL here when no number was given, and
--   the three `registration-*` functions read "this attempt has a mobile number"
--   off the NULL rather than off a separate flag. There is no new column and no
--   new table, so there is no new thing to keep consistent.
--
-- What has to change in the schema
--   Only one thing: `mobile_e164` was declared NOT NULL, so a mobile-less
--   attempt could not be opened at all.
--
--   The two constraints that mention the column already behave correctly for
--   NULL, and are deliberately left in place:
--
--     * `registration_attempts_mobile_e164_check` is a CHECK, and a CHECK is
--       satisfied by a NULL result. A NULL `mobile_e164` passes it, which is
--       exactly the intent: no number was claimed, so there is no shape to check.
--       A number that *is* claimed is still held to E.164.
--
--     * `registration_attempts_active_mobile_uniq` is a unique index, and
--       PostgreSQL treats NULLs as distinct, so any number of mobile-less
--       attempts can coexist. Two attempts for the same *email* are still
--       stopped, by `registration_attempts_active_email_uniq`, which is the
--       constraint that actually matters here: the email is the identifier the
--       applicant signs in with.
--
-- This is an additive, forward-only change. It moves no data, adds no column,
-- and tightens nothing: rows that already exist are all non-NULL and are
-- untouched. Re-running it is a no-op.
-- =============================================================================

begin;

alter table public.registration_attempts
  alter column mobile_e164 drop not null;

comment on column public.registration_attempts.mobile_e164 is
  'E.164 form, or NULL when the applicant chose not to give a mobile number at registration. A NULL here means no SMS was sent and no mobile proof is required before completion.';

commit;
