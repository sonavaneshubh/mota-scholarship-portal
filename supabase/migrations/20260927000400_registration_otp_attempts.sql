-- =============================================================================
-- 20260927000400_registration_otp_attempts.sql
-- Transient server-side state for the Email OTP + Mobile OTP registration flow.
-- =============================================================================
-- Why this table exists
--   Registration now requires two out-of-band proofs (an email OTP and an SMS
--   OTP) before an applicant account is usable. The browser is not a trusted
--   party for that decision, so the state has to live somewhere the browser can
--   neither read nor write. This is that somewhere: it is written only by the
--   three `registration-*` Edge Functions, which hold the service-role key.
--
--   It is deliberately *not* a copy of the applicant record. The applicant row
--   and the `profiles` row are still created by the existing
--   `on_auth_user_created` / `handle_new_user()` trigger, and the applicant's
--   `role` is still assigned there as the literal 'applicant'. Nothing here
--   touches roles, permissions or RLS.
--
-- What is NOT stored here
--   No OTP, and no password. One-time codes are generated and verified by
--   Supabase Auth (GoTrue) and never reach this database. The password is held
--   in the applicant's browser only for the lifetime of the form and is sent
--   once, over TLS, to `registration-complete`.
--
-- Lifecycle
--   A row is created by `registration-start`, moved forward by
--   `registration-verify`, and *deleted* by `registration-complete`. On
--   successful registration there is deliberately nothing left behind, so the
--   temporary verification state does not outlive the flow that created it.
--   Abandoned rows go stale and stop blocking the same email or number once
--   `expires_at` passes, because the uniqueness indexes below are partial.
--
-- This is an additive change. It creates no new user-facing table, adds no
-- column to `profiles` or `applicant_profiles`, and moves no existing data.
-- Re-running it is a no-op.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. The table
-- -----------------------------------------------------------------------------
create table if not exists public.registration_attempts (
  id uuid primary key default gen_random_uuid(),

  -- Stored already normalised: `email` lower-cased and trimmed, `mobile_e164`
  -- in E.164 form. The functions normalise before inserting, so uniqueness is
  -- decided on the canonical value rather than on whatever the applicant typed.
  email text not null,
  mobile_e164 text not null,

  -- Carried through to the auth user's metadata and to `profiles.full_name` at
  -- completion. Not the source of truth for either; the trigger is.
  full_name text not null,
  username text,

  -- `auth.users.id`, recorded once the email OTP has been verified. GoTrue
  -- creates the auth user when it sends the signup OTP, so this column is
  -- discovered rather than chosen, and `registration-complete` has to look the
  -- user up anyway to survive an abandoned first attempt.
  auth_user_id uuid,

  -- 'pending'        neither channel proven yet
  -- 'email_verified' email proven, mobile still outstanding
  -- 'mobile_verified' mobile proven, email still outstanding
  -- 'expired'        the applicant window closed; harmless, and no longer
  --                  blocks a fresh attempt
  -- 'completed'      written only inside the completing transaction and then
  --                  deleted in the same transaction, so it is never observable
  status text not null default 'pending',

  -- The two independent proof-of-possession timestamps. Completion requires
  -- both to be non-null. These columns are the whole security boundary: there
  -- is no code path that sets either one without GoTrue having first accepted
  -- the corresponding one-time code.
  email_verified_at timestamptz,
  mobile_verified_at timestamptz,

  -- When the current code for each channel was last dispatched, which is what
  -- the resend cooldown is measured from. Deliberately not the code itself.
  email_otp_sent_at timestamptz,
  mobile_otp_sent_at timestamptz,

  -- Separate budgets per channel, so a brute-force attempt against the SMS
  -- code cannot spend the email allowance and vice versa.
  email_resend_count integer not null default 0,
  mobile_resend_count integer not null default 0,
  email_verify_failures integer not null default 0,
  mobile_verify_failures integer not null default 0,

  -- The whole flow has to fit in one sitting; this is the hard ceiling the
  -- functions enforce regardless of what the applicant does.
  expires_at timestamptz not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint registration_attempts_status_check
    check (status in ('pending', 'email_verified', 'mobile_verified', 'expired', 'completed')),

  -- A stored value that is not a usable address is a programming error upstream,
  -- not applicant input, so it is caught here rather than producing an
  -- unmatchable lookup later.
  constraint registration_attempts_email_shape_check
    check (email = lower(btrim(email)) and position('@' in email) > 1),

  -- E.164: a leading '+', a non-zero country digit, then 9-14 more digits. This
  -- is also the exact form GoTrue stores in `auth.users.phone`, so a successful
  -- SMS verification is guaranteed to line up with what is persisted here.
  constraint registration_attempts_mobile_e164_check
    check (mobile_e164 ~ '^\+[1-9][0-9]{9,14}$'),

  constraint registration_attempts_expiry_check
    check (expires_at > created_at)
);

comment on table public.registration_attempts is
  'Transient server-side registration state for the email-OTP + mobile-OTP flow. Written only by the registration-* Edge Functions (service role). Contains no OTP and no password. Deleted on successful completion.';

-- -----------------------------------------------------------------------------
-- 2. Uniqueness
-- -----------------------------------------------------------------------------
-- Partial, on live rows only. A stale `expired` row must not stop the same
-- person from registering again a minute later, and it must not stop a
-- different person from reusing a number that was mistyped into a dead attempt.
--
-- These are NOT a substitute for the duplicate checks in `registration-start`.
-- They only stop two in-flight attempts colliding; they say nothing about an
-- applicant who registered last month, which is what `profiles` is for.
create unique index if not exists registration_attempts_active_email_uniq
  on public.registration_attempts (email)
  where status <> 'expired';

create unique index if not exists registration_attempts_active_mobile_uniq
  on public.registration_attempts (mobile_e164)
  where status <> 'expired';

-- Supports the "how many times has this address been used to start a
-- registration recently" throttle, which has to count rows rather than read
-- a mutable counter that an applicant could reset by abandoning an attempt.
create index if not exists registration_attempts_email_created_idx
  on public.registration_attempts (email, created_at desc);

create index if not exists registration_attempts_created_idx
  on public.registration_attempts (created_at);

-- -----------------------------------------------------------------------------
-- 3. updated_at
-- -----------------------------------------------------------------------------
create or replace function public.set_registration_attempts_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_registration_attempts_updated_at on public.registration_attempts;
create trigger set_registration_attempts_updated_at
  before update on public.registration_attempts
  for each row
  execute function public.set_registration_attempts_updated_at();

-- -----------------------------------------------------------------------------
-- 4. Access control: service role only
-- -----------------------------------------------------------------------------
-- RLS is enabled and then *no policy is created at all*. That is the point.
-- `service_role` bypasses RLS, so the Edge Functions still work; `anon` and
-- `authenticated` have no policy that grants them anything, so the table is
-- invisible and un-writable to the browser through the REST API even if
-- someone learns its name. The revocation below additionally removes the
-- grants the default `authenticated` role would otherwise inherit.
--
-- This is why the verification state cannot be forged from the client: there
-- is no client path to `email_verified_at` or `mobile_verified_at` at all.
alter table public.registration_attempts enable row level security;

revoke all on table public.registration_attempts from anon, authenticated;

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'registration_attempts'
  ) then
    raise exception using
      message = 'registration_attempts must have no RLS policies: it is reachable only with the service-role key.';
  end if;
end $$;

commit;
