-- =============================================================================
-- 20260927000240_create_applicant_profile_on_signup.sql
--
-- Making a brand-new signup usable, in any order.
--
-- The gap, verified against the live project
-- ----------------------------------------
-- handle_new_user() (20260925120000) creates the public.profiles row on signup and
-- stops there. It does not create public.applicant_profiles. That row is created
-- by ensureApplicantProfile() in src/services/profileService.ts, and the only
-- caller of that function in the whole frontend is ApplicantProfilePage.
--
-- So the anchor row's existence depends on which page the applicant happens to
-- open first, and every other table in the schema is scoped by applicant_id:
--
--   * applications.applicant_id          references applicant_profiles(id)
--   * application_documents.applicant_id references applicant_profiles(id)
--   * every 1:1 section table is keyed on it and its RLS compares it to
--     public.current_applicant_id()
--
-- current_applicant_id() resolves applicant_profiles.user_id = auth.uid(), so with
-- no anchor row it returns NULL and the applicant can do nothing. A new user who
-- signs up and clicks Apply before ever visiting My Profile is therefore stopped
-- at "Could not match your sign-in to an applicant profile" — a message that
-- describes a server problem and gives them no idea what to do.
--
-- Making the client create the row it depends on is the wrong fix: it keeps a
-- correctness requirement ("every applicant has an anchor row") alive only on one
-- code path, so the next page or script that assumes the row exists will silently
-- inherit the bug. The row is a consequence of having an account, so it belongs
-- next to the account.
--
-- This also removes a second, quieter race: two requests through
-- ensureApplicantProfile() at once both see no row and both try to insert.
--
-- What this changes
-- -----------------
-- handle_new_user() gains a second insert. It stays idempotent in both
-- directions: the profiles upsert is left exactly as it was, and the anchor insert
-- is on conflict do nothing, so re-running this migration over existing accounts
-- and re-signing in cannot produce a second anchor row.
--
-- The applicant_id reference is still minted by set_applicant_reference()
-- (20260926090100) on INSERT, so the anchor row gets its MOTA-2026-XXXXXXXX
-- reference from the same trigger every other row uses. Nothing is generated
-- here.
--
-- The regression test for this is "a brand-new signup already has its
-- applicant_profiles anchor row" in scripts/applicant-pipeline.e2e.mjs.
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Unchanged from 20260925120000: the identity and role row. 'applicant' is
  -- written literally and never taken from raw_user_meta_data, so a signup payload
  -- cannot nominate itself an administrator.
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    new.email,
    'applicant'
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(excluded.full_name, public.profiles.full_name),
      updated_at = now();

  -- Added by this migration: the anchor row every applicant-scoped table hangs
  -- off. profile_status starts at 'incomplete', the same value
  -- ensureApplicantProfile() writes, so a signup-created row and a
  -- page-created row are indistinguishable to everything downstream.
  --
  -- Only applicant_id is set. It is minted by set_applicant_reference() and is
  -- deliberately left null here so the trigger owns it, exactly as it does for a
  -- row created from the profile page.
  --
  -- do nothing, not do update: this row is the applicant's own record and is
  -- never refreshed from the auth payload. A later signup or a profile edit must
  -- not clobber applicant data with whatever the auth metadata happens to say.
  insert into public.applicant_profiles (user_id, profile_status)
  values (new.id, 'incomplete')
  on conflict (id) do nothing;

  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Backfilling the accounts that signed up before this existed
--
-- Without this, every existing applicant's portal would keep working only for as
-- long as they happen not to have visited the profile page yet, and the fix would
-- look like it had not been applied. on conflict do nothing keeps this safe to
-- re-run and safe against accounts that already have an anchor row.
--
-- A row is only inserted for an account that genuinely has none; nothing existing
-- is modified.
-- -----------------------------------------------------------------------------
insert into public.applicant_profiles (user_id, profile_status)
select
  u.id,
  'incomplete'
from auth.users u
where exists (select 1 from public.profiles p where p.id = u.id)
  and not exists (select 1 from public.applicant_profiles ap where ap.user_id = u.id);

comment on function public.handle_new_user() is
  'AFTER INSERT on auth.users. Creates the profiles identity/role row and the applicant_profiles anchor row in the same transaction, so every applicant is able to act the moment they sign up rather than only after they visit the My Profile page. The anchor row is what applicant_id-scoped tables and public.current_applicant_id() resolve against.';

-- The trigger itself is unchanged and is re-asserted so that a project where
-- 20260925120000 was never applied still ends up with the new function attached.
-- The same note as in 20260926090000: this trigger is what makes the function
-- above effective, so re-creating it is not redundant.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
