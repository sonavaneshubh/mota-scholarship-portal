-- =============================================================================
-- Applicant profile — security functions and the completeness engine.
--
-- Sensitive-data rules enforced here (not just in the UI):
--   * The full Aadhaar is NEVER stored. It transits once to set_applicant_aadhaar(),
--     which keeps only a masked value, the last 4 digits and a salted SHA-256
--     fingerprint used for duplicate detection.
--   * The full bank account number is NEVER stored in plaintext. It transits once
--     to set_bank_account(), which keeps a real pgcrypto AES-256 ciphertext
--     (reversible, so a future disbursement job can read it) plus the last 4
--     digits, then locks the legacy plaintext column to NULL.
--   * Neither function ever returns the sensitive input.
--   * Both are SECURITY DEFINER, are callable only by authenticated, and resolve
--     the applicant from auth.uid() only — a caller can never write to another
--     applicant's row.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Shared helpers
-- -----------------------------------------------------------------------------
create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

-- The applicant_profiles row that belongs to the caller, or NULL.
create or replace function public.current_applicant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.applicant_profiles p
  where p.user_id = (select auth.uid())
  limit 1;
$$;

-- Renders a 12-digit Aadhaar as 'XXXX XXXX 1234'. Safe to expose.
create or replace function public.mask_aadhaar(digits text)
returns text
language sql
immutable
parallel safe
as $$
  select case
    when digits is null or length(digits) <> 12 then null
    else 'XXXX XXXX ' || right(digits, 4)
  end;
$$;

-- Deterministic, server-salted digest. The salt lives in a database setting and
-- is never committed:  ALTER DATABASE postgres SET app.secret_hash_salt = '…';
-- When the salt is absent the fingerprint is NULL rather than a weak hash.
create or replace function public.salted_fingerprint(value text)
returns text
language plpgsql
stable
as $$
declare
  v_salt text := current_setting('app.secret_hash_salt', true);
begin
  if value is null or v_salt is null or v_salt = '' then
    return null;
  end if;

  return encode(sha256(convert_to(v_salt || ':' || value, 'UTF8')), 'hex');
end;
$$;

-- pgcrypto lives in the `extensions` schema on Supabase, `public` on a plain
-- PostgreSQL server, and either may drift. Resolve it once per call rather than
-- hard-coding a schema, so this migration does not depend on hosting layout.
create or replace function public.pgcrypto_schema()
returns text
language sql
stable
as $$
  select n.nspname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where p.proname = 'pgp_sym_encrypt'
     and p.pronargs = 3
   order by (n.nspname = 'extensions') desc, (n.nspname = 'public') desc
   limit 1;
$$;

-- Real symmetric encryption (AES-256) for the bank account number, keyed by the
-- uncommitted database setting. Reversible on purpose: disbursement needs the
-- account number back, which a one-way hash could never provide.
create or replace function public.encrypt_bank_account(value text)
returns text
language plpgsql
volatile
as $$
declare
  v_key    text := current_setting('app.secret_hash_salt', true);
  v_schema text;
  v_cipher text;
begin
  if value is null then
    return null;
  end if;

  if v_key is null or v_key = '' then
    raise exception
      'app.secret_hash_salt is not configured on this database. Run: ALTER DATABASE postgres SET app.secret_hash_salt = ''<random 64-char secret>''';
  end if;

  v_schema := public.pgcrypto_schema();

  if v_schema is null then
    raise exception 'pgcrypto is not installed on this database; run: create extension if not exists pgcrypto';
  end if;

  execute format('select %I.pgp_sym_encrypt($1, $2, $3)', v_schema)
    into v_cipher
    using value, v_key, 'cipher-algo=aes256';

  return v_cipher;
end;
$$;

-- The only path back to a plaintext account number. Restricted to the admin role
-- so an applicant can never read their own ciphertext back, and so a leaked
-- publishable key is not enough to reverse the value.
create or replace function public.decrypt_bank_account(ciphertext text)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_key    text := current_setting('app.secret_hash_salt', true);
  v_schema text;
  v_plain  text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if coalesce(public.current_profile_role(), '') <> 'admin' then
    raise exception 'Only administrators may decrypt a bank account number.' using errcode = '42501';
  end if;

  if ciphertext is null or ciphertext = '' then
    return null;
  end if;

  if v_key is null or v_key = '' then
    raise exception 'app.secret_hash_salt is not configured on this database.';
  end if;

  v_schema := public.pgcrypto_schema();

  if v_schema is null then
    raise exception 'pgcrypto is not installed on this database.';
  end if;

  execute format('select %I.pgp_sym_decrypt($1, $2)', v_schema)
    into v_plain
    using ciphertext, v_key;

  return v_plain;
end;
$$;

-- -----------------------------------------------------------------------------
-- Aadhaar writer. Accepts 12 digits, stores mask + last4 + fingerprint only.
-- -----------------------------------------------------------------------------
create or replace function public.set_applicant_aadhaar(p_aadhaar text)
returns table (aadhaar_masked text, aadhaar_last4 text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_digits text;
  v_applicant uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  v_digits := regexp_replace(coalesce(p_aadhaar, ''), '\D', '', 'g');

  if length(v_digits) <> 12 then
    raise exception 'Aadhaar number must be 12 digits.' using errcode = '22023';
  end if;

  if v_digits ~ '^(.)\1{11}$' then
    raise exception 'Aadhaar number is not valid.' using errcode = '22023';
  end if;

  v_applicant := public.current_applicant_id();

  if v_applicant is null then
    raise exception 'Applicant profile not found.' using errcode = 'P0002';
  end if;

  -- aadhaar_verified_at is deliberately NOT set here. Saving a number is not
  -- verifying it; only a real verification flow may stamp that column.
  update public.applicant_profiles
     set aadhaar_masked      = public.mask_aadhaar(v_digits),
         aadhaar_last4       = right(v_digits, 4),
         aadhaar_fingerprint = public.salted_fingerprint(v_digits),
         updated_at          = now()
   where id = v_applicant;

  aadhaar_masked := public.mask_aadhaar(v_digits);
  aadhaar_last4  := right(v_digits, 4);
  return next;
end;
$$;

-- -----------------------------------------------------------------------------
-- Bank account writer. Accepts 6–20 digits, stores ciphertext + last4 only.
-- -----------------------------------------------------------------------------
create or replace function public.set_bank_account(p_account_number text)
returns table (account_number_last4 text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_digits text;
  v_applicant uuid;
  v_row_id uuid;
  v_last4 text;
  v_cipher text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  v_digits := regexp_replace(coalesce(p_account_number, ''), '\D', '', 'g');

  if length(v_digits) < 6 or length(v_digits) > 20 then
    raise exception 'Account number must be between 6 and 20 digits.' using errcode = '22023';
  end if;

  v_applicant := public.current_applicant_id();

  if v_applicant is null then
    raise exception 'Applicant profile not found.' using errcode = 'P0002';
  end if;

  select b.id into v_row_id from public.bank_details b where b.applicant_id = v_applicant limit 1;

  v_last4 := right(v_digits, 4);
  v_cipher := public.encrypt_bank_account(v_digits);

  if v_row_id is null then
    insert into public.bank_details (applicant_id, account_number_ciphertext, account_number_last4)
    values (v_applicant, v_cipher, v_last4);
  else
    update public.bank_details
       set account_number_ciphertext = v_cipher,
           account_number_last4      = v_last4,
           updated_at                = now()
     where id = v_row_id;
  end if;

  account_number_last4 := v_last4;
  return next;
end;
$$;

-- -----------------------------------------------------------------------------
-- applicant_profiles housekeeping: generate the human-readable reference and
-- keep updated_at fresh.
-- -----------------------------------------------------------------------------
create or replace function public.set_applicant_reference()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.applicant_id is null or new.applicant_id = '' then
    new.applicant_id := 'MOTA-' || to_char(now(), 'YYYY') || '-'
      || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_applicant_reference on public.applicant_profiles;
create trigger set_applicant_reference
before insert or update on public.applicant_profiles
for each row
execute function public.set_applicant_reference();

-- updated_at triggers for the remaining child tables
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'applicant_profiles', 'domicile_details', 'income_details', 'personal_eligibility',
    'caste_details', 'address_details', 'parent_guardian_details', 'bank_details',
    'current_courses', 'applicant_qualifications', 'hostel_details', 'applicant_documents'
  ] loop
    execute format('drop trigger if exists touch_updated_at on public.%I', t);
    execute format(
      'create trigger touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()',
      t
    );
  end loop;
end;
$$;

-- =============================================================================
-- Completeness engine
--
-- applicant_profile_completeness() is the single server-side source of truth for
-- "how complete is this profile". It is data-driven: the required field set comes
-- from public.profile_completeness_rules, and the applicability gates are
-- evaluated against the applicant's own saved rows.
--
-- Returns jsonb:
--   { overall, status, sections: { personal, address, other, current_course,
--                                  past_qualification, hostel },
--     missing: [ "personal.religion", ... ] }
--
-- SECURITY: the applicant_id argument is IGNORED. The function always evaluates
-- the calling user's own profile, so it can never be used to probe another
-- applicant's completion state.
-- =============================================================================
create or replace function public.applicant_profile_completeness()
returns jsonb
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_applicant uuid := public.current_applicant_id();
  v_profile public.applicant_profiles%rowtype;
  v_domicile public.domicile_details%rowtype;
  v_income public.income_details%rowtype;
  v_eligibility public.personal_eligibility%rowtype;
  v_caste public.caste_details%rowtype;
  v_address public.address_details%rowtype;
  v_parents public.parent_guardian_details%rowtype;
  v_course public.current_courses%rowtype;
  v_hostel public.hostel_details%rowtype;
  v_qualification_count integer := 0;
  v_incomplete_qualifications integer := 0;
  v_sections jsonb := '{}'::jsonb;
  v_missing jsonb := '[]'::jsonb;
  v_rule record;
  v_section text;
  v_total_weight integer;
  v_done_weight integer;
  v_percent integer;
  v_applicable boolean;
  v_present boolean;
  v_overall integer := 0;
  v_complete_sections integer := 0;
begin
  if v_applicant is null then
    return jsonb_build_object(
      'overall', 0,
      'status', 'incomplete',
      'sections', jsonb_build_object(
        'personal', 0, 'address', 0, 'other', 0,
        'current_course', 0, 'past_qualification', 0, 'hostel', 0
      ),
      'missing', '[]'::jsonb
    );
  end if;

  select * into v_profile     from public.applicant_profiles      where id = v_applicant;
  select * into v_domicile    from public.domicile_details        where applicant_id = v_applicant limit 1;
  select * into v_income      from public.income_details          where applicant_id = v_applicant limit 1;
  select * into v_eligibility from public.personal_eligibility    where applicant_id = v_applicant limit 1;
  select * into v_caste       from public.caste_details           where applicant_id = v_applicant limit 1;
  select * into v_address     from public.address_details         where applicant_id = v_applicant limit 1;
  select * into v_parents     from public.parent_guardian_details where applicant_id = v_applicant limit 1;
  select * into v_course      from public.current_courses         where applicant_id = v_applicant limit 1;
  select * into v_hostel      from public.hostel_details          where applicant_id = v_applicant limit 1;

  select count(*) into v_qualification_count
    from public.applicant_qualifications
   where applicant_id = v_applicant;

  select count(*) into v_incomplete_qualifications
    from public.applicant_qualifications
   where applicant_id = v_applicant
     and (
       qualification_type is null or btrim(qualification_type) = ''
       or board_university is null or btrim(board_university) = ''
       or passing_year is null
       or percentage is null
     );

  for v_section in
    select distinct r.section
      from public.profile_completeness_rules r
     where r.is_active
     order by 1
  loop
    v_total_weight := 0;
    v_done_weight  := 0;

    for v_rule in
      select r.*
        from public.profile_completeness_rules r
       where r.is_active and r.section = v_section
       order by r.sort_order
    loop
      -- Applicability gate -----------------------------------------------------
      v_applicable := true;

      case v_rule.condition_key
        when '' then v_applicable := true;
        when 'always' then v_applicable := true;
        when 'is_maharashtra_domicile' then v_applicable := coalesce(v_domicile.is_maharashtra_domicile, false);
        when 'has_domicile_certificate' then v_applicable := coalesce(v_domicile.has_domicile_certificate, false);
        when 'has_income_certificate'   then v_applicable := coalesce(v_income.has_income_certificate, false);
        when 'has_caste_certificate'    then v_applicable := coalesce(v_caste.has_caste_certificate, false);
        when 'is_disabled'              then v_applicable := coalesce(v_eligibility.is_disabled, false);
        when 'has_disability_certificate' then
          v_applicable := coalesce(v_eligibility.is_disabled, false)
                          and coalesce(v_eligibility.has_disability_certificate, false);
        when 'is_salaried'              then v_applicable := coalesce(v_eligibility.is_salaried, false);
        when 'same_as_permanent_false'  then v_applicable := not coalesce(v_address.same_as_permanent, true);
        when 'father_alive'             then v_applicable := coalesce(v_parents.father_alive, false);
        when 'mother_alive'             then v_applicable := coalesce(v_parents.mother_alive, false);
        when 'guardian_required'        then v_applicable := coalesce(v_parents.guardian_required, false);
        when 'cap_admission'            then v_applicable := coalesce(v_course.cap_admission, false);
        when 'is_hosteller'             then
          v_applicable := lower(coalesce(v_hostel.beneficiary_category, '')) = 'hosteller';
        else v_applicable := true;
      end case;

      if not v_applicable then
        continue;
      end if;

      v_total_weight := v_total_weight + greatest(v_rule.weight, 0);

      -- Presence check ---------------------------------------------------------
      v_present := case v_rule.field_key
        -- Personal
        when 'full_name' then nullif(btrim(v_profile.full_name), '') is not null
        when 'mobile_number' then nullif(btrim(v_profile.mobile_number), '') is not null
        when 'email' then nullif(btrim(v_profile.email), '') is not null
        when 'date_of_birth' then v_profile.date_of_birth is not null
        when 'gender' then nullif(btrim(v_profile.gender), '') is not null
        when 'religion' then nullif(btrim(v_profile.religion), '') is not null
        when 'marital_status' then nullif(btrim(v_profile.marital_status), '') is not null
        when 'applicant_full_name_as_per_marksheet' then nullif(btrim(v_profile.applicant_full_name_as_per_marksheet), '') is not null
        when 'parent_guardian_mobile' then nullif(btrim(v_profile.parent_guardian_mobile), '') is not null
        when 'aadhaar_last4' then nullif(btrim(v_profile.aadhaar_last4), '') is not null

        -- Domicile
        when 'is_maharashtra_domicile' then v_domicile.is_maharashtra_domicile is not null
        when 'has_domicile_certificate' then v_domicile.has_domicile_certificate is not null
        when 'domicile_certificate_number' then nullif(btrim(v_domicile.certificate_number), '') is not null
        when 'domicile_certificate_holder_name' then nullif(btrim(v_domicile.certificate_holder_name), '') is not null
        when 'domicile_issuing_authority' then nullif(btrim(v_domicile.issuing_authority), '') is not null
        when 'domicile_date_of_issue' then v_domicile.date_of_issue is not null
        when 'domicile_document' then v_domicile.document_id is not null

        -- Income
        when 'annual_income' then v_income.annual_income is not null
        when 'has_income_certificate' then v_income.has_income_certificate is not null
        when 'income_certificate_number' then nullif(btrim(v_income.certificate_number), '') is not null
        when 'income_certificate_date' then v_income.certificate_date is not null
        when 'income_issuing_authority' then nullif(btrim(v_income.issuing_authority), '') is not null
        when 'income_document' then v_income.document_id is not null

        -- Personal eligibility
        when 'is_salaried' then v_eligibility.is_salaried is not null
        when 'job_type' then nullif(btrim(v_eligibility.job_type), '') is not null
        when 'is_disabled' then v_eligibility.is_disabled is not null
        when 'disability_type' then nullif(btrim(v_eligibility.disability_type), '') is not null
        when 'has_disability_certificate' then v_eligibility.has_disability_certificate is not null
        when 'disability_certificate_number' then nullif(btrim(v_eligibility.disability_certificate_number), '') is not null
        when 'disability_document' then v_eligibility.disability_document_id is not null
        when 'siblings_count' then v_eligibility.siblings_count is not null

        -- Caste
        when 'category' then nullif(btrim(v_caste.category), '') is not null
        when 'caste' then nullif(btrim(v_caste.caste), '') is not null
        when 'has_caste_certificate' then v_caste.has_caste_certificate is not null
        when 'caste_certificate_number' then nullif(btrim(v_caste.certificate_number), '') is not null
        when 'caste_certificate_holder_name' then nullif(btrim(v_caste.certificate_holder_name), '') is not null
        when 'caste_issuing_authority' then nullif(btrim(v_caste.issuing_authority), '') is not null
        when 'caste_date_of_issue' then v_caste.date_of_issue is not null
        when 'caste_document' then v_caste.document_id is not null

        -- Bank
        when 'aadhaar_linked' then exists (
          select 1 from public.bank_details b where b.applicant_id = v_applicant and b.aadhaar_linked is not null
        )
        when 'bank_name' then exists (
          select 1 from public.bank_details b where b.applicant_id = v_applicant and nullif(btrim(b.bank_name), '') is not null
        )
        when 'account_holder_name' then exists (
          select 1 from public.bank_details b where b.applicant_id = v_applicant and nullif(btrim(b.account_holder_name), '') is not null
        )
        when 'account_number_last4' then exists (
          select 1 from public.bank_details b where b.applicant_id = v_applicant and nullif(btrim(b.account_number_last4), '') is not null
        )
        when 'ifsc_code' then exists (
          select 1 from public.bank_details b where b.applicant_id = v_applicant and b.ifsc_code ~ '^[A-Z]{4}0[A-Z0-9]{6}$'
        )
        when 'branch_name' then exists (
          select 1 from public.bank_details b where b.applicant_id = v_applicant and nullif(btrim(b.branch_name), '') is not null
        )
        when 'account_type' then exists (
          select 1 from public.bank_details b where b.applicant_id = v_applicant and nullif(btrim(b.account_type), '') is not null
        )

        -- Address
        when 'permanent_address' then nullif(btrim(v_address.permanent_address), '') is not null
        when 'permanent_state' then nullif(btrim(v_address.permanent_state), '') is not null
        when 'permanent_district' then nullif(btrim(v_address.permanent_district), '') is not null
        when 'permanent_taluka' then nullif(btrim(v_address.permanent_taluka), '') is not null
        when 'permanent_village' then nullif(btrim(v_address.permanent_village), '') is not null
        when 'permanent_pincode' then v_address.permanent_pincode ~ '^[0-9]{6}$'
        when 'same_as_permanent' then v_address.same_as_permanent is not null
        when 'correspondence_address' then nullif(btrim(v_address.correspondence_address), '') is not null
        when 'correspondence_state' then nullif(btrim(v_address.correspondence_state), '') is not null
        when 'correspondence_district' then nullif(btrim(v_address.correspondence_district), '') is not null
        when 'correspondence_taluka' then nullif(btrim(v_address.correspondence_taluka), '') is not null
        when 'correspondence_village' then nullif(btrim(v_address.correspondence_village), '') is not null
        when 'correspondence_pincode' then v_address.correspondence_pincode ~ '^[0-9]{6}$'

        -- Parents / guardian
        when 'father_alive' then v_parents.father_alive is not null
        when 'father_name' then nullif(btrim(v_parents.father_name), '') is not null
        when 'father_occupation' then nullif(btrim(v_parents.father_occupation), '') is not null
        when 'father_salaried' then v_parents.father_salaried is not null
        when 'mother_alive' then v_parents.mother_alive is not null
        when 'mother_name' then nullif(btrim(v_parents.mother_name), '') is not null
        when 'mother_occupation' then nullif(btrim(v_parents.mother_occupation), '') is not null
        when 'mother_salaried' then v_parents.mother_salaried is not null
        when 'guardian_required' then v_parents.guardian_required is not null
        when 'guardian_name' then nullif(btrim(v_parents.guardian_name), '') is not null
        when 'guardian_relationship' then nullif(btrim(v_parents.guardian_relationship), '') is not null
        when 'guardian_mobile' then nullif(btrim(v_parents.guardian_mobile), '') is not null
        when 'guardian_occupation' then nullif(btrim(v_parents.guardian_occupation), '') is not null

        -- Current course
        when 'academic_year' then nullif(btrim(v_course.academic_year), '') is not null
        when 'course_level' then nullif(btrim(v_course.course_level), '') is not null
        when 'course_name' then nullif(btrim(v_course.course_name), '') is not null
        when 'degree' then nullif(btrim(v_course.degree), '') is not null
        when 'branch' then nullif(btrim(v_course.branch), '') is not null
        when 'year_of_study' then v_course.year_of_study is not null
        when 'semester' then v_course.semester is not null
        when 'institution_name' then nullif(btrim(v_course.institution_name), '') is not null
        when 'board_university' then nullif(btrim(coalesce(v_course.board_university, v_course.university_name)), '') is not null
        when 'admission_date' then v_course.admission_date is not null
        when 'admission_type' then nullif(btrim(v_course.admission_type), '') is not null
        when 'mode_of_study' then nullif(btrim(v_course.mode_of_study), '') is not null
        when 'course_duration_months' then v_course.course_duration_months is not null
        when 'is_professional' then v_course.is_professional is not null
        when 'cap_admission' then v_course.cap_admission is not null
        when 'cap_application_number' then nullif(btrim(v_course.cap_application_number), '') is not null
        when 'seat_type' then nullif(btrim(v_course.seat_type), '') is not null
        when 'institute_state' then nullif(btrim(v_course.institute_state), '') is not null
        when 'institute_district' then nullif(btrim(v_course.institute_district), '') is not null
        when 'institute_taluka' then nullif(btrim(v_course.institute_taluka), '') is not null

        -- Past qualifications
        when 'has_qualification' then v_qualification_count > 0
        when 'qualification_core' then v_qualification_count > 0 and v_incomplete_qualifications = 0

        -- Hostel
        when 'beneficiary_category' then nullif(btrim(v_hostel.beneficiary_category), '') is not null
        when 'state' then nullif(btrim(v_hostel.state), '') is not null
        when 'district' then nullif(btrim(v_hostel.district), '') is not null
        when 'taluka' then nullif(btrim(v_hostel.taluka), '') is not null
        when 'hostel_type' then nullif(btrim(v_hostel.hostel_type), '') is not null
        when 'hostel_name' then nullif(btrim(v_hostel.hostel_name), '') is not null
        when 'is_aided' then v_hostel.is_aided is not null
        when 'hostel_address' then nullif(btrim(v_hostel.hostel_address), '') is not null
        when 'admission_date' then v_hostel.admission_date is not null
        when 'mess_available' then v_hostel.mess_available is not null
        when 'rent_per_month' then v_hostel.rent_per_month is not null
        when 'certificate_document' then v_hostel.certificate_document_id is not null

        else false
      end case;

      if v_present then
        v_done_weight := v_done_weight + greatest(v_rule.weight, 0);
      else
        v_missing := v_missing || jsonb_build_array(v_section || '.' || v_rule.field_key);
      end if;
    end loop;

    if v_total_weight = 0 then
      v_percent := 100;
    else
      v_percent := round(v_done_weight * 100.0 / v_total_weight)::integer;
    end if;

    v_sections := v_sections || jsonb_build_object(v_section, v_percent);

    if v_percent >= 100 then
      v_complete_sections := v_complete_sections + 1;
    end if;
  end loop;

  -- Overall = mean of the six section percentages, so an applicant who has
  -- finished five sections and skipped one is never shown as "almost done".
  if jsonb_object_length(v_sections) > 0 then
    select round(
             sum(value::numeric)
             / count(*)
           )::integer
      into v_overall
      from jsonb_each_text(v_sections) as t(key, value);
  end if;

  return jsonb_build_object(
    'overall', coalesce(v_overall, 0),
    'status', case when coalesce(v_overall, 0) >= 100 then 'complete' else 'incomplete' end,
    'complete_sections', v_complete_sections,
    'section_count', coalesce(jsonb_object_length(v_sections), 0),
    'sections', v_sections,
    'missing', v_missing
  );
end;
$$;

-- Convenience: profile completion stored on the row for dashboard widgets that
-- only need a number. Refreshed on every profile write.
create or replace function public.refresh_applicant_completeness()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_applicant uuid := public.current_applicant_id();
  v_result jsonb;
begin
  if v_applicant is null then
    return;
  end if;

  v_result := public.applicant_profile_completeness();

  update public.applicant_profiles
     set completeness_percent = (v_result ->> 'overall')::smallint,
         profile_status       = v_result ->> 'status',
         last_saved_at        = now()
   where id = v_applicant;
end;
$$;

-- =============================================================================
-- Lock the legacy plaintext bank account column.
--
-- If any plaintext row predates this migration it is encrypted first, but only
-- after the key is confirmed — otherwise the backfill would raise mid-statement
-- and abort the whole migration with an opaque error.
-- =============================================================================
do $$
begin
  if exists (select 1 from public.bank_details where account_number is not null) then
    if coalesce(current_setting('app.secret_hash_salt', true), '') = '' then
      raise exception
        'bank_details still holds % plaintext account number(s) and app.secret_hash_salt is not set. Configure the key and re-run.',
        (select count(*) from public.bank_details where account_number is not null);
    end if;

    update public.bank_details
       set account_number_ciphertext = coalesce(account_number_ciphertext, public.encrypt_bank_account(account_number)),
           account_number_last4      = coalesce(account_number_last4, right(account_number, 4)),
           account_number            = null
     where account_number is not null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'bank_details_account_number_not_plaintext'
  ) then
    alter table public.bank_details
      add constraint bank_details_account_number_not_plaintext check (account_number is null);
  end if;
end;
$$;

-- =============================================================================
-- Admin bank verification
--
-- decrypt_bank_account(ciphertext) needs the caller to already hold the
-- ciphertext, but the column grants in 20260926090200_applicant_profile_rls.sql
-- deliberately withhold SELECT on bank_details.account_number_ciphertext from
-- the authenticated role — which includes admins, because they authenticate as
-- the same database role and are distinguished only by profiles.role.
--
-- So without this function admin bank verification has no working path: the
-- ciphertext cannot be read and therefore cannot be passed in. This closes that
-- gap without loosening the grant. The lookup and the decryption both happen
-- inside SECURITY DEFINER, so the encrypted value is never sent to a client and
-- the admin browser never handles it.
--
-- Grants are still enforced per role inside the function, and the role is read
-- through current_profile_role(), which is itself SECURITY DEFINER — so the
-- check cannot be spoofed by a row the applicant can write.
-- =============================================================================
create or replace function public.admin_bank_account(p_applicant_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_ciphertext text;
  v_key        text := current_setting('app.secret_hash_salt', true);
  v_schema     text;
  v_plain      text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if coalesce(public.current_profile_role(), '') <> 'admin' then
    raise exception 'Only administrators may read a stored bank account number.'
      using errcode = '42501';
  end if;

  if p_applicant_id is null then
    return null;
  end if;

  select b.account_number_ciphertext
    into v_ciphertext
    from public.bank_details b
   where b.applicant_id = p_applicant_id;

  -- No row, or an applicant who has not saved an account number yet.
  if v_ciphertext is null or v_ciphertext = '' then
    return null;
  end if;

  if v_key is null or v_key = '' then
    raise exception 'app.secret_hash_salt is not configured on this database.';
  end if;

  v_schema := public.pgcrypto_schema();

  if v_schema is null then
    raise exception 'pgcrypto is not installed on this database.';
  end if;

  execute format('select %I.pgp_sym_decrypt($1, $2)', v_schema)
    into v_plain
    using v_ciphertext, v_key;

  return v_plain;
end;
$$;

-- =============================================================================
-- Function privileges. PostgreSQL grants EXECUTE to PUBLIC by default, which
-- would expose every SECURITY DEFINER writer to anon. Close that, then hand the
-- profile flow exactly what it needs.
-- =============================================================================
revoke execute on function
  public.current_profile_role(),
  public.current_applicant_id(),
  public.mask_aadhaar(text),
  public.salted_fingerprint(text),
  public.pgcrypto_schema(),
  public.encrypt_bank_account(text),
  public.decrypt_bank_account(text),
  public.admin_bank_account(uuid),
  public.set_applicant_aadhaar(text),
  public.set_bank_account(text),
  public.applicant_profile_completeness(),
  public.refresh_applicant_completeness()
from public;

grant execute on function
  public.current_profile_role(),
  public.current_applicant_id(),
  public.mask_aadhaar(text),
  public.set_applicant_aadhaar(text),
  public.set_bank_account(text),
  public.applicant_profile_completeness(),
  public.refresh_applicant_completeness()
to authenticated;

-- Admin-only. The role check lives inside the function, so granting EXECUTE to
-- the shared authenticated role is safe: an applicant calling either function
-- gets errcode 42501 rather than a value.
--   decrypt_bank_account  caller supplies ciphertext (e.g. imported from a
--                         legacy dump), decrypts it
--   admin_bank_account    caller supplies an applicant id, gets the plaintext
--                         without ever seeing the ciphertext
grant execute on function
  public.decrypt_bank_account(text),
  public.admin_bank_account(uuid)
to authenticated;
