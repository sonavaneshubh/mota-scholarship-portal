-- =============================================================================
-- Applicant profile — row level security.
--
-- Threat model: the browser holds a Supabase publishable (anon) key and talks to
-- PostgREST directly, so EVERYTHING below is the security boundary. The UI's
-- role checks are cosmetic by design; the rules live here.
--
-- For every applicant-owned table the policy is:
--     applicant_id = public.current_applicant_id()
-- which resolves from auth.uid() on the server. Consequences:
--   * An applicant can read / insert / update / delete only their own rows.
--   * Reading another applicant's profile returns zero rows (not an error, and
--     no data leak).
--   * Writing another applicant's row violates the WITH CHECK and is rejected.
--   * There is no applicant-writable column that names another applicant,
--     because applicant_id itself is the policy subject and is not updatable.
--
-- Administrator access follows the project's existing authorisation model: the
-- `profiles.role` value, readable only through the SECURITY DEFINER function
-- public.current_profile_role(). Role assignment is a database/admin action —
-- registration metadata can never grant it.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Grants. The anonymous role gets nothing on any table this feature owns;
-- authenticated gets exactly the DML the profile flow needs, and nothing on the
-- legacy plaintext bank column.
--
-- The anon revoke is deliberately scoped to a named table list rather than
-- `revoke all on all tables in schema public`. A feature migration should not
-- silently change the privileges of unrelated tables it knows nothing about —
-- a public schemes or announcements table read by an unauthenticated visitor
-- would break with no diff pointing here. Any table added to the portal's
-- public surface gets its own grant and its own migration.
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'applicant_profiles', 'domicile_details', 'income_details', 'personal_eligibility',
    'caste_details', 'address_details', 'parent_guardian_details', 'bank_details',
    'current_courses', 'applicant_qualifications', 'hostel_details', 'applicant_documents',
    'religions', 'caste_categories', 'castes', 'disability_types', 'states', 'districts',
    'talukas', 'course_levels', 'courses', 'branches', 'boards', 'universities',
    'institutions', 'applicant_document_types', 'profile_completeness_rules'
  ] loop
    execute format('revoke all on table public.%I from anon', t);
  end loop;
end;
$$;

grant usage on schema public to authenticated;

grant select, insert, update on table
  public.applicant_profiles,
  public.domicile_details,
  public.income_details,
  public.personal_eligibility,
  public.caste_details,
  public.address_details,
  public.parent_guardian_details,
  public.current_courses,
  public.hostel_details
to authenticated;

-- The profile flow only ever removes two kinds of row: a qualification the
-- applicant deleted from the repeatable list, and a certificate they replaced.
-- Everything else in the profile is corrected by updating the row, never by
-- deleting it, so DELETE is granted here and nowhere else.
grant delete on table
  public.applicant_qualifications,
  public.applicant_documents
to authenticated;

grant select on table
  public.religions,
  public.caste_categories,
  public.castes,
  public.disability_types,
  public.states,
  public.districts,
  public.talukas,
  public.course_levels,
  public.courses,
  public.branches,
  public.boards,
  public.universities,
  public.institutions,
  public.applicant_document_types,
  public.profile_completeness_rules
to authenticated;

-- -----------------------------------------------------------------------------
-- bank_details — column-level privileges, not table-level.
--
-- A column-level REVOKE does not subtract anything from a table-level GRANT:
-- `grant select on table bank_details` conveys SELECT on every column, so
-- `revoke select (account_number)` after it changes nothing and the plaintext
-- column stays readable. The only correct order is to remove the table-level
-- privilege and re-grant it per column.
--
-- So the table-level grant for bank_details is revoked entirely, and SELECT,
-- INSERT and UPDATE are re-granted for each individual column except the two
-- that can hold a bank account number. The column list is discovered at apply
-- time rather than hard-coded, so a future ALTER TABLE cannot silently widen
-- the grant.
--   * account_number            legacy plaintext, locked to NULL by a constraint
--   * account_number_ciphertext must only ever be written by encrypt_bank_account()
--                                inside a SECURITY DEFINER writer; a client-writable
--                                ciphertext column could be overwritten with junk and
--                                silently corrupt what an admin later decrypts.
-- The applicant still reads account_number_last4, which is the display suffix,
-- and writes the account number only through public.set_bank_account(text).
--
-- Withholding the ciphertext from authenticated does not strand admin
-- verification, because admins are the same database role: they reach the value
-- through public.admin_bank_account(uuid), which looks the row up and decrypts it
-- server-side, so the ciphertext never enters an admin's browser either.
-- -----------------------------------------------------------------------------
revoke select, insert, update on table public.bank_details from authenticated;

do $$
declare
  c text;
begin
  for c in
    select a.attname::text
      from pg_attribute a
     where a.attrelid = 'public.bank_details'::regclass
       and a.attnum > 0
       and not a.attisdropped
       and a.attname not in ('account_number', 'account_number_ciphertext')
  loop
    -- Column-level grants require parentheses: GRANT SELECT (column) ON table TO role
    execute format('grant select (%I) on public.bank_details to authenticated', c);
    execute format('grant insert (%I) on public.bank_details to authenticated', c);
    execute format('grant update (%I) on public.bank_details to authenticated', c);
  end loop;
end;
$$;

-- Sensitive writers are callable but not readable as tables.
grant execute on function
  public.set_applicant_aadhaar(text),
  public.set_bank_account(text),
  public.applicant_profile_completeness(),
  public.current_applicant_id(),
  public.current_profile_role(),
  public.refresh_applicant_completeness(),
  public.mask_aadhaar(text)
to authenticated;

revoke execute on function
  public.salted_fingerprint(text),
  public.encrypt_bank_account(text)
from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- profiles (auth identity + role)
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id and role = 'applicant');

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id and role = public.current_profile_role());

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles
  for all to authenticated
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

-- -----------------------------------------------------------------------------
-- applicant_profiles — the anchor row every other table hangs off.
-- -----------------------------------------------------------------------------
alter table public.applicant_profiles enable row level security;

drop policy if exists "applicant_profiles_select_own" on public.applicant_profiles;
create policy "applicant_profiles_select_own" on public.applicant_profiles
  for select to authenticated
  using (user_id = (select auth.uid()) or public.current_profile_role() = 'admin');

drop policy if exists "applicant_profiles_insert_own" on public.applicant_profiles;
create policy "applicant_profiles_insert_own" on public.applicant_profiles
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "applicant_profiles_update_own" on public.applicant_profiles;
create policy "applicant_profiles_update_own" on public.applicant_profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "applicant_profiles_admin_all" on public.applicant_profiles;
create policy "applicant_profiles_admin_all" on public.applicant_profiles
  for all to authenticated
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

-- ----------------------------------------------------------------------------- 
-- The 1:1 section tables.
-- ----------------------------------------------------------------------------- 
do $$
declare
  t text;
begin
  foreach t in array array[
    'domicile_details', 'income_details', 'personal_eligibility', 'caste_details',
    'address_details', 'parent_guardian_details', 'bank_details', 'current_courses',
    'hostel_details'
  ] loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "%I_select_own" on public.%I', t, t);
    execute format(
      'create policy "%I_select_own" on public.%I for select to authenticated using (applicant_id = public.current_applicant_id() or public.current_profile_role() = ''admin'')',
      t, t
    );

    execute format('drop policy if exists "%I_insert_own" on public.%I', t, t);
    execute format(
      'create policy "%I_insert_own" on public.%I for insert to authenticated with check (applicant_id = public.current_applicant_id())',
      t, t
    );

    execute format('drop policy if exists "%I_update_own" on public.%I', t, t);
    execute format(
      'create policy "%I_update_own" on public.%I for update to authenticated using (applicant_id = public.current_applicant_id()) with check (applicant_id = public.current_applicant_id())',
      t, t
    );

    execute format('drop policy if exists "%I_delete_own" on public.%I', t, t);
    execute format(
      'create policy "%I_delete_own" on public.%I for delete to authenticated using (applicant_id = public.current_applicant_id())',
      t, t
    );

    execute format('drop policy if exists "%I_admin_all" on public.%I', t, t);
    execute format(
      'create policy "%I_admin_all" on public.%I for all to authenticated using (public.current_profile_role() = ''admin'') with check (public.current_profile_role() = ''admin'')',
      t, t
    );
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- applicant_qualifications — many rows per applicant (10th, 12th, diploma, …)
-- -----------------------------------------------------------------------------
alter table public.applicant_qualifications enable row level security;

drop policy if exists "applicant_qualifications_select_own" on public.applicant_qualifications;
create policy "applicant_qualifications_select_own" on public.applicant_qualifications
  for select to authenticated
  using (applicant_id = public.current_applicant_id() or public.current_profile_role() = 'admin');

drop policy if exists "applicant_qualifications_insert_own" on public.applicant_qualifications;
create policy "applicant_qualifications_insert_own" on public.applicant_qualifications
  for insert to authenticated
  with check (applicant_id = public.current_applicant_id());

drop policy if exists "applicant_qualifications_update_own" on public.applicant_qualifications;
create policy "applicant_qualifications_update_own" on public.applicant_qualifications
  for update to authenticated
  using (applicant_id = public.current_applicant_id())
  with check (applicant_id = public.current_applicant_id());

drop policy if exists "applicant_qualifications_delete_own" on public.applicant_qualifications;
create policy "applicant_qualifications_delete_own" on public.applicant_qualifications
  for delete to authenticated
  using (applicant_id = public.current_applicant_id());

drop policy if exists "applicant_qualifications_admin_all" on public.applicant_qualifications;
create policy "applicant_qualifications_admin_all" on public.applicant_qualifications
  for all to authenticated
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

-- -----------------------------------------------------------------------------
-- applicant_documents — metadata only. The bytes live in a private bucket and
-- are reached through storage.objects policies that scope the path prefix to
-- the caller's own applicant id.
-- -----------------------------------------------------------------------------
alter table public.applicant_documents enable row level security;

drop policy if exists "applicant_documents_select_own" on public.applicant_documents;
create policy "applicant_documents_select_own" on public.applicant_documents
  for select to authenticated
  using (applicant_id = public.current_applicant_id() or public.current_profile_role() = 'admin');

drop policy if exists "applicant_documents_insert_own" on public.applicant_documents;
create policy "applicant_documents_insert_own" on public.applicant_documents
  for insert to authenticated
  with check (applicant_id = public.current_applicant_id());

drop policy if exists "applicant_documents_update_own" on public.applicant_documents;
create policy "applicant_documents_update_own" on public.applicant_documents
  for update to authenticated
  using (applicant_id = public.current_applicant_id())
  with check (applicant_id = public.current_applicant_id());

drop policy if exists "applicant_documents_delete_own" on public.applicant_documents;
create policy "applicant_documents_delete_own" on public.applicant_documents
  for delete to authenticated
  using (applicant_id = public.current_applicant_id());

drop policy if exists "applicant_documents_admin_all" on public.applicant_documents;
create policy "applicant_documents_admin_all" on public.applicant_documents
  for all to authenticated
  using (public.current_profile_role() = 'admin')
  with check (public.current_profile_role() = 'admin');

-- -----------------------------------------------------------------------------
-- Master data — read-only for applicants. Administrators manage these rows.
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'religions', 'caste_categories', 'castes', 'disability_types',
    'states', 'districts', 'talukas',
    'course_levels', 'courses', 'branches', 'boards', 'universities', 'institutions',
    'applicant_document_types', 'profile_completeness_rules'
  ] loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "%I_select_active" on public.%I', t, t);
    execute format(
      'create policy "%I_select_active" on public.%I for select to authenticated using (is_active)',
      t, t
    );

    execute format('drop policy if exists "%I_admin_all" on public.%I', t, t);
    execute format(
      'create policy "%I_admin_all" on public.%I for all to authenticated using (public.current_profile_role() = ''admin'') with check (public.current_profile_role() = ''admin'')',
      t, t
    );
  end loop;
end;
$$;
