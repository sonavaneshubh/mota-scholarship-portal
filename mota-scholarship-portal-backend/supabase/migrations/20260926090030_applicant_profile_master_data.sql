-- =============================================================================
-- Applicant profile — configurable master data.
--
-- Design rule: the profile stores FACTS only. Every list an administrator may
-- need to change later (religions, caste categories/names, disability types,
-- course levels, courses, branches, boards, universities, institutions,
-- locations, document types) lives in a master table with an `is_active` flag.
--
-- Seeding policy agreed for this milestone:
--   * SEEDED  — official, non-controversial classifications only (religion
--               categories from the Census of India, reservation categories,
--               Indian states/UTs, standard academic qualification levels, and
--               the structural document-type list).
--   * EMPTY   — caste names, sub-castes, disability types, districts, talukas,
--               boards, universities, courses, branches and institutions.
--               No caste mapping or medical classification is invented. Until an
--               administrator populates them the UI offers free text instead.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Reference lists
-- -----------------------------------------------------------------------------
create table if not exists public.religions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.caste_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.castes (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.caste_categories(id) on delete restrict,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (category_id, name)
);

create table if not exists public.disability_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Location master (states seeded, districts/talukas left for administrators)
-- -----------------------------------------------------------------------------
create table if not exists public.states (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.districts (
  id uuid primary key default gen_random_uuid(),
  state_id uuid references public.states(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (state_id, name)
);

create table if not exists public.talukas (
  id uuid primary key default gen_random_uuid(),
  district_id uuid references public.districts(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (district_id, name)
);

-- -----------------------------------------------------------------------------
-- Academic master
-- -----------------------------------------------------------------------------
create table if not exists public.course_levels (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  level_id uuid references public.course_levels(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (name)
);

create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  course_id uuid references public.courses(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (course_id, name)
);

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  board_type text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.universities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  state_id uuid references public.states(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  board_university_id uuid references public.boards(id) on delete set null,
  state text,
  district text,
  taluka text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (name)
);

-- -----------------------------------------------------------------------------
-- Document types (structural list, not applicant data)
-- -----------------------------------------------------------------------------
create table if not exists public.applicant_document_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  accepts_multiple boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0
);

-- -----------------------------------------------------------------------------
-- Configurable completeness rules.
--
-- One row per conditionally-required profile field. The completion engine
-- (20260926090100_applicant_profile_security.sql) reads this table, so an
-- administrator can add, deactivate or re-weight a requirement without a code
-- change. `condition_key` names the boolean gate that makes the field required;
-- an empty condition_key means the field is always required.
--
-- condition_key values understood by the engine:
--   has_domicile_certificate, has_income_certificate, has_caste_certificate,
--   is_disabled, is_salaried, same_as_permanent, is_hosteller,
--   father_alive, mother_alive
-- -----------------------------------------------------------------------------
create table if not exists public.profile_completeness_rules (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in (
    'personal', 'address', 'other', 'current_course', 'past_qualification', 'hostel'
  )),
  field_key text not null,
  label text not null,
  condition_key text not null default '',
  weight integer not null default 1,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (section, field_key)
);

create index if not exists profile_completeness_rules_section_idx
  on public.profile_completeness_rules (section, sort_order);

-- =============================================================================
-- Seeds — idempotent
-- =============================================================================
insert into public.religions (code, label, sort_order) values
  ('hindu', 'Hindu', 10),
  ('muslim', 'Muslim', 20),
  ('christian', 'Christian', 30),
  ('sikh', 'Sikh', 40),
  ('buddhist', 'Buddhist', 50),
  ('jain', 'Jain', 60),
  ('parsi', 'Parsi', 70),
  ('other', 'Other', 80)
on conflict (code) do update set label = excluded.label, sort_order = excluded.sort_order;

insert into public.caste_categories (code, label, sort_order) values
  ('open', 'Open (General)', 10),
  ('sc', 'Scheduled Caste (SC)', 20),
  ('st', 'Scheduled Tribe (ST)', 30),
  ('obc', 'Other Backward Class (OBC)', 40),
  ('vjnt', 'VJNT', 50),
  ('sbc', 'SBC', 60),
  ('ebc', 'Economically Backward Class (EBC)', 70),
  ('ews', 'EWS', 80),
  ('minority', 'Minority', 90)
on conflict (code) do update set label = excluded.label, sort_order = excluded.sort_order;

-- Dummy castes for testing (linked to caste_categories)
insert into public.castes (category_id, name)
select id, 'Mahar' from public.caste_categories where code = 'sc'
on conflict (category_id, name) do nothing;

insert into public.castes (category_id, name)
select id, 'Mang' from public.caste_categories where code = 'sc'
on conflict (category_id, name) do nothing;

insert into public.castes (category_id, name)
select id, 'Bhil' from public.caste_categories where code = 'st'
on conflict (category_id, name) do nothing;

insert into public.castes (category_id, name)
select id, 'Gond' from public.caste_categories where code = 'st'
on conflict (category_id, name) do nothing;

insert into public.castes (category_id, name)
select id, 'Kunbi' from public.caste_categories where code = 'obc'
on conflict (category_id, name) do nothing;

insert into public.castes (category_id, name)
select id, 'Mali' from public.caste_categories where code = 'obc'
on conflict (category_id, name) do nothing;

insert into public.course_levels (code, label, sort_order) values
  ('secondary', 'Secondary (Class 10)', 10),
  ('higher_secondary', 'Higher Secondary (Class 12)', 20),
  ('certificate', 'Certificate', 30),
  ('diploma', 'Diploma', 40),
  ('pg_diploma', 'Post Graduate Diploma', 50),
  ('bachelors', 'Bachelor''s Degree', 60),
  ('masters', 'Master''s Degree', 70),
  ('doctorate', 'Doctorate', 80)
on conflict (code) do update set label = excluded.label, sort_order = excluded.sort_order;

insert into public.applicant_document_types (code, label, accepts_multiple, sort_order) values
  ('aadhaar', 'Aadhaar', false, 10),
  ('domicile_certificate', 'Domicile Certificate', false, 20),
  ('income_certificate', 'Income Certificate', false, 30),
  ('caste_certificate', 'Caste Certificate', false, 40),
  ('disability_certificate', 'Disability Certificate', false, 50),
  ('marksheet', 'Marksheet', true, 60),
  ('hosteller_certificate', 'Hosteller Certificate', false, 70),
  ('other', 'Other Document', true, 80)
on conflict (code) do update
  set label = excluded.label,
      accepts_multiple = excluded.accepts_multiple,
      sort_order = excluded.sort_order;

insert into public.states (code, name) values
  ('AN', 'Andaman and Nicobar Islands'),
  ('AP', 'Andhra Pradesh'),
  ('AR', 'Arunachal Pradesh'),
  ('AS', 'Assam'),
  ('BR', 'Bihar'),
  ('CH', 'Chandigarh'),
  ('CT', 'Chhattisgarh'),
  ('DH', 'Dadra and Nagar Haveli and Daman and Diu'),
  ('DL', 'Delhi'),
  ('GA', 'Goa'),
  ('GJ', 'Gujarat'),
  ('HR', 'Haryana'),
  ('HP', 'Himachal Pradesh'),
  ('JK', 'Jammu and Kashmir'),
  ('JH', 'Jharkhand'),
  ('KA', 'Karnataka'),
  ('KL', 'Kerala'),
  ('LA', 'Ladakh'),
  ('LD', 'Lakshadweep'),
  ('MP', 'Madhya Pradesh'),
  ('MH', 'Maharashtra'),
  ('MN', 'Manipur'),
  ('ML', 'Meghalaya'),
  ('MZ', 'Mizoram'),
  ('NL', 'Nagaland'),
  ('OD', 'Odisha'),
  ('PY', 'Puducherry'),
  ('PB', 'Punjab'),
  ('RJ', 'Rajasthan'),
  ('SK', 'Sikkim'),
  ('TN', 'Tamil Nadu'),
  ('TG', 'Telangana'),
  ('TR', 'Tripura'),
  ('UP', 'Uttar Pradesh'),
  ('UT', 'Uttarakhand'),
  ('WB', 'West Bengal')
on conflict (code) do update set name = excluded.name;

-- -----------------------------------------------------------------------------
-- Completeness rule seed.
--   weight 0 => the field is tracked for display but never blocks completion.
--   condition_key '' => always required.
--   A condition_key means: required only when that gate is true.
--   Past-qualification rules use the synthetic condition 'has_qualification',
--   satisfied by the existence of at least one applicant_qualifications row.
-- -----------------------------------------------------------------------------
insert into public.profile_completeness_rules (section, field_key, label, condition_key, weight, sort_order) values
  -- 1. Personal Information
  ('personal', 'full_name', 'Full name', '', 1, 10),
  ('personal', 'mobile_number', 'Mobile number', '', 1, 20),
  ('personal', 'email', 'Email ID', '', 1, 30),
  ('personal', 'date_of_birth', 'Date of birth', '', 1, 40),
  ('personal', 'gender', 'Gender', '', 1, 50),
  ('personal', 'religion', 'Religion', '', 1, 60),
  ('personal', 'marital_status', 'Marital status', '', 1, 70),
  ('personal', 'applicant_full_name_as_per_marksheet', 'Name as per marksheet', '', 1, 80),
  ('personal', 'parent_guardian_mobile', 'Parent/guardian mobile', '', 1, 90),
  ('personal', 'aadhaar_last4', 'Aadhaar number', '', 1, 100),
  ('personal', 'is_maharashtra_domicile', 'Maharashtra domicile declared', '', 1, 110),
  ('personal', 'has_domicile_certificate', 'Domicile certificate declared', 'is_maharashtra_domicile', 1, 120),
  ('personal', 'domicile_certificate_number', 'Domicile certificate number', 'has_domicile_certificate', 1, 130),
  ('personal', 'domicile_certificate_holder_name', 'Domicile certificate holder', 'has_domicile_certificate', 1, 140),
  ('personal', 'domicile_issuing_authority', 'Domicile issuing authority', 'has_domicile_certificate', 1, 150),
  ('personal', 'domicile_date_of_issue', 'Domicile certificate date', 'has_domicile_certificate', 1, 160),
  ('personal', 'domicile_document', 'Domicile certificate upload', 'has_domicile_certificate', 1, 170),
  ('personal', 'annual_income', 'Family annual income', '', 1, 180),
  ('personal', 'has_income_certificate', 'Income certificate declared', '', 1, 190),
  ('personal', 'income_certificate_number', 'Income certificate number', 'has_income_certificate', 1, 200),
  ('personal', 'income_certificate_date', 'Income certificate date', 'has_income_certificate', 1, 210),
  ('personal', 'income_issuing_authority', 'Income certificate authority', 'has_income_certificate', 1, 220),
  ('personal', 'income_document', 'Income certificate upload', 'has_income_certificate', 1, 230),
  ('personal', 'is_salaried', 'Salaried status declared', '', 1, 240),
  ('personal', 'job_type', 'Job type', 'is_salaried', 1, 250),
  ('personal', 'is_disabled', 'Disability status declared', '', 1, 260),
  ('personal', 'disability_type', 'Disability type', 'is_disabled', 1, 270),
  ('personal', 'has_disability_certificate', 'Disability certificate declared', 'is_disabled', 1, 280),
  ('personal', 'disability_certificate_number', 'Disability certificate number', 'has_disability_certificate', 1, 290),
  ('personal', 'disability_document', 'Disability certificate upload', 'has_disability_certificate', 1, 300),
  ('personal', 'siblings_count', 'Number of siblings', '', 1, 310),
  ('personal', 'category', 'Caste category', '', 1, 320),
  ('personal', 'caste', 'Caste', '', 1, 330),
  ('personal', 'has_caste_certificate', 'Caste certificate declared', '', 1, 340),
  ('personal', 'caste_certificate_number', 'Caste certificate number', 'has_caste_certificate', 1, 350),
  ('personal', 'caste_certificate_holder_name', 'Caste certificate holder', 'has_caste_certificate', 1, 360),
  ('personal', 'caste_issuing_authority', 'Caste certificate authority', 'has_caste_certificate', 1, 370),
  ('personal', 'caste_date_of_issue', 'Caste certificate date', 'has_caste_certificate', 1, 380),
  ('personal', 'caste_document', 'Caste certificate upload', 'has_caste_certificate', 1, 390),
  ('personal', 'bank_name', 'Bank name', '', 1, 400),
  ('personal', 'account_holder_name', 'Account holder name', '', 1, 410),
  ('personal', 'account_number_last4', 'Bank account number', '', 1, 420),
  ('personal', 'ifsc_code', 'IFSC code', '', 1, 430),
  ('personal', 'branch_name', 'Branch name', '', 1, 440),
  ('personal', 'account_type', 'Account type', '', 1, 450),
  ('personal', 'aadhaar_linked', 'Aadhaar-linked account declared', '', 1, 460),

  -- 2. Address Information
  ('address', 'permanent_address', 'Permanent address', '', 1, 10),
  ('address', 'permanent_state', 'Permanent state', '', 1, 20),
  ('address', 'permanent_district', 'Permanent district', '', 1, 30),
  ('address', 'permanent_taluka', 'Permanent taluka', '', 1, 40),
  ('address', 'permanent_village', 'Village / city', '', 1, 50),
  ('address', 'permanent_pincode', 'Permanent pincode', '', 1, 60),
  ('address', 'same_as_permanent', 'Correspondence address confirmed', '', 1, 70),
  ('address', 'correspondence_address', 'Correspondence address', 'same_as_permanent_false', 1, 80),
  ('address', 'correspondence_state', 'Correspondence state', 'same_as_permanent_false', 1, 90),
  ('address', 'correspondence_district', 'Correspondence district', 'same_as_permanent_false', 1, 100),
  ('address', 'correspondence_taluka', 'Correspondence taluka', 'same_as_permanent_false', 1, 110),
  ('address', 'correspondence_village', 'Correspondence village / city', 'same_as_permanent_false', 1, 120),
  ('address', 'correspondence_pincode', 'Correspondence pincode', 'same_as_permanent_false', 1, 130),

  -- 3. Other Information (parents / guardian)
  ('other', 'father_alive', 'Father status declared', '', 1, 10),
  ('other', 'father_name', 'Father name', 'father_alive', 1, 20),
  ('other', 'father_occupation', 'Father occupation', 'father_alive', 1, 30),
  ('other', 'father_salaried', 'Father salaried status declared', 'father_alive', 1, 40),
  ('other', 'mother_alive', 'Mother status declared', '', 1, 50),
  ('other', 'mother_name', 'Mother name', 'mother_alive', 1, 60),
  ('other', 'mother_occupation', 'Mother occupation', 'mother_alive', 1, 70),
  ('other', 'mother_salaried', 'Mother salaried status declared', 'mother_alive', 1, 80),
  ('other', 'guardian_required', 'Guardian applicability declared', '', 1, 90),
  ('other', 'guardian_name', 'Guardian name', 'guardian_required', 1, 100),
  ('other', 'guardian_relationship', 'Guardian relationship', 'guardian_required', 1, 110),
  ('other', 'guardian_mobile', 'Guardian mobile', 'guardian_required', 1, 120),
  ('other', 'guardian_occupation', 'Guardian occupation', 'guardian_required', 1, 130),

  -- 4. Current Course
  ('current_course', 'academic_year', 'Academic year', '', 1, 10),
  ('current_course', 'course_level', 'Course level', '', 1, 20),
  ('current_course', 'course_name', 'Course name', '', 1, 30),
  ('current_course', 'degree', 'Course / degree', '', 1, 40),
  ('current_course', 'branch', 'Branch / specialisation', '', 1, 50),
  ('current_course', 'year_of_study', 'Year of study', '', 1, 60),
  ('current_course', 'semester', 'Semester', '', 1, 70),
  ('current_course', 'institution_name', 'College / institute', '', 1, 80),
  ('current_course', 'board_university', 'University / board', '', 1, 90),
  ('current_course', 'admission_date', 'Admission date', '', 1, 100),
  ('current_course', 'admission_type', 'Admission type', '', 1, 110),
  ('current_course', 'mode_of_study', 'Mode of study', '', 1, 120),
  ('current_course', 'course_duration_months', 'Course duration', '', 1, 130),
  ('current_course', 'is_professional', 'Professional course declared', '', 1, 140),
  ('current_course', 'cap_admission', 'CAP admission declared', '', 1, 150),
  ('current_course', 'cap_application_number', 'CAP application number', 'cap_admission', 1, 160),
  ('current_course', 'seat_type', 'Seat type / category', '', 1, 170),
  ('current_course', 'institute_state', 'Institute state', '', 1, 180),
  ('current_course', 'institute_district', 'Institute district', '', 1, 190),
  ('current_course', 'institute_taluka', 'Institute taluka', '', 1, 200),

  -- 5. Past Qualification — satisfied by at least one saved record
  ('past_qualification', 'has_qualification', 'At least one past qualification saved', 'always', 1, 10),
  ('past_qualification', 'qualification_core', 'Each qualification has type, board/university, passing year and percentage', 'always', 1, 20),

  -- 6. Hostel Details
  ('hostel', 'beneficiary_category', 'Beneficiary category declared', '', 1, 10),
  ('hostel', 'state', 'Hostel state', 'is_hosteller', 1, 20),
  ('hostel', 'district', 'Hostel district', 'is_hosteller', 1, 30),
  ('hostel', 'taluka', 'Hostel taluka', 'is_hosteller', 1, 40),
  ('hostel', 'hostel_type', 'Hostel type', 'is_hosteller', 1, 50),
  ('hostel', 'hostel_name', 'Hostel name', 'is_hosteller', 1, 60),
  ('hostel', 'is_aided', 'Aided status declared', 'is_hosteller', 1, 70),
  ('hostel', 'hostel_address', 'Hostel address', 'is_hosteller', 1, 80),
  ('hostel', 'admission_date', 'Hostel admission date', 'is_hosteller', 1, 90),
  ('hostel', 'mess_available', 'Mess availability declared', 'is_hosteller', 1, 100),
  ('hostel', 'rent_per_month', 'Rent per month', 'is_hosteller', 1, 110),
  ('hostel', 'certificate_document', 'Hosteller certificate upload', 'is_hosteller', 1, 120)
on conflict (section, field_key) do update
  set label = excluded.label,
      condition_key = excluded.condition_key,
      weight = excluded.weight,
      sort_order = excluded.sort_order;
