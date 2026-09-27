-- 20260927000000_create_scholarship_master_tables.sql
-- Scholarship Scheme Master Database Schema
-- Normalized architecture for official scheme data from MahaDBT and other official sources

-- ============================================================
-- 1. departments
-- ============================================================
create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  description text,
  official_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_departments_name on public.departments(name);
create index if not exists idx_departments_code on public.departments(code);
create index if not exists idx_departments_is_active on public.departments(is_active);

alter table public.departments enable row level security;

create or replace function public.set_departments_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_departments_updated_at on public.departments;
create trigger set_departments_updated_at
before update on public.departments
for each row
execute function public.set_departments_updated_at();

-- ============================================================
-- 2. scheme_categories
-- ============================================================
create table if not exists public.scheme_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_scheme_categories_name on public.scheme_categories(name);
create index if not exists idx_scheme_categories_is_active on public.scheme_categories(is_active);

alter table public.scheme_categories enable row level security;

create or replace function public.set_scheme_categories_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_scheme_categories_updated_at on public.scheme_categories;
create trigger set_scheme_categories_updated_at
before update on public.scheme_categories
for each row
execute function public.set_scheme_categories_updated_at();

-- ============================================================
-- 3. schemes
-- ============================================================
create table if not exists public.schemes (
  id uuid primary key default gen_random_uuid(),
  scheme_code text unique not null,
  name text not null,
  short_name text,
  department_id uuid not null references public.departments(id) on delete restrict,
  category_id uuid not null references public.scheme_categories(id) on delete restrict,
  scheme_type text,
  description text,
  overview text,
  application_mode text,
  official_scheme_url text,
  official_application_url text,
  gr_url text,
  academic_year text not null,
  application_start_date date,
  application_end_date date,
  renewal_available boolean,
  status text not null default 'draft' check (status in ('draft', 'review', 'published', 'inactive')),
  verification_status text not null default 'pending_review' check (verification_status in ('pending_review', 'verified', 'rejected')),
  source_url text,
  source_type text,
  source_last_verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure all columns exist (table might have been created without some columns in a previous failed run)
alter table public.schemes add column if not exists scheme_type text;
alter table public.schemes add column if not exists overview text;
alter table public.schemes add column if not exists application_mode text;
alter table public.schemes add column if not exists official_scheme_url text;
alter table public.schemes add column if not exists official_application_url text;
alter table public.schemes add column if not exists gr_url text;
alter table public.schemes add column if not exists renewal_available boolean;

create index if not exists idx_schemes_name on public.schemes(name);
create index if not exists idx_schemes_scheme_code on public.schemes(scheme_code);
create index if not exists idx_schemes_department_id on public.schemes(department_id);
create index if not exists idx_schemes_category_id on public.schemes(category_id);
create index if not exists idx_schemes_academic_year on public.schemes(academic_year);
create index if not exists idx_schemes_status on public.schemes(status);
create index if not exists idx_schemes_verification_status on public.schemes(verification_status);
create index if not exists idx_schemes_dept_cat_year on public.schemes(department_id, category_id, academic_year);

alter table public.schemes enable row level security;

create or replace function public.set_schemes_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_schemes_updated_at on public.schemes;
create trigger set_schemes_updated_at
before update on public.schemes
for each row
execute function public.set_schemes_updated_at();

-- ============================================================
-- 4. scheme_eligibility
-- ============================================================
create table if not exists public.scheme_eligibility (
  id uuid primary key default gen_random_uuid(),
  scheme_id uuid not null references public.schemes(id) on delete cascade,
  academic_year text not null,
  category_requirement text,
  religion_requirement text,
  gender_requirement text,
  disability_requirement text,
  min_age integer,
  max_age integer,
  min_percentage numeric(5,2),
  max_income numeric(15,2),
  income_period text,
  residency_requirement text,
  qualification_requirement text,
  course_requirement text,
  institution_requirement text,
  attendance_requirement text,
  admission_requirement text,
  cap_requirement text,
  gap_requirement text,
  other_conditions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scheme_id, academic_year)
);

-- Ensure academic_year column exists (table might have been created without it in a previous failed run)
alter table public.scheme_eligibility add column if not exists academic_year text not null default '';

create index if not exists idx_scheme_eligibility_scheme_id on public.scheme_eligibility(scheme_id);
create index if not exists idx_scheme_eligibility_academic_year on public.scheme_eligibility(academic_year);

alter table public.scheme_eligibility enable row level security;

create or replace function public.set_scheme_eligibility_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_scheme_eligibility_updated_at on public.scheme_eligibility;
create trigger set_scheme_eligibility_updated_at
before update on public.scheme_eligibility
for each row
execute function public.set_scheme_eligibility_updated_at();

-- ============================================================
-- 5. scheme_benefits
-- ============================================================
create table if not exists public.scheme_benefits (
  id uuid primary key default gen_random_uuid(),
  scheme_id uuid not null references public.schemes(id) on delete cascade,
  academic_year text not null,
  benefit_type text not null,
  description text,
  amount numeric(15,2),
  amount_currency text not null default 'INR',
  amount_period text,
  coverage text,
  hosteller_amount numeric(15,2),
  day_scholar_amount numeric(15,2),
  conditions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure academic_year column exists (table might have been created without it in a previous failed run)
alter table public.scheme_benefits add column if not exists academic_year text not null default '';

create index if not exists idx_scheme_benefits_scheme_id on public.scheme_benefits(scheme_id);
create index if not exists idx_scheme_benefits_academic_year on public.scheme_benefits(academic_year);
create index if not exists idx_scheme_benefits_benefit_type on public.scheme_benefits(benefit_type);

alter table public.scheme_benefits enable row level security;

create or replace function public.set_scheme_benefits_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_scheme_benefits_updated_at on public.scheme_benefits;
create trigger set_scheme_benefits_updated_at
before update on public.scheme_benefits
for each row
execute function public.set_scheme_benefits_updated_at();

-- ============================================================
-- 6. scheme_documents
-- ============================================================
create table if not exists public.scheme_documents (
  id uuid primary key default gen_random_uuid(),
  scheme_id uuid not null references public.schemes(id) on delete cascade,
  document_name text not null,
  description text,
  is_mandatory boolean not null default true,
  applicant_type text,
  academic_year text,
  source_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure academic_year column exists (table might have been created without it in a previous failed run)
alter table public.scheme_documents add column if not exists academic_year text;

create index if not exists idx_scheme_documents_scheme_id on public.scheme_documents(scheme_id);
create index if not exists idx_scheme_documents_academic_year on public.scheme_documents(academic_year);
create index if not exists idx_scheme_documents_is_mandatory on public.scheme_documents(is_mandatory);

alter table public.scheme_documents enable row level security;

create or replace function public.set_scheme_documents_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_scheme_documents_updated_at on public.scheme_documents;
create trigger set_scheme_documents_updated_at
before update on public.scheme_documents
for each row
execute function public.set_scheme_documents_updated_at();

-- ============================================================
-- 7. scheme_sources
-- ============================================================
create table if not exists public.scheme_sources (
  id uuid primary key default gen_random_uuid(),
  scheme_id uuid not null references public.schemes(id) on delete cascade,
  source_type text not null,
  source_url text not null,
  gr_url text,
  source_title text,
  source_last_checked_at timestamptz not null default now(),
  content_hash text,
  verification_status text not null default 'pending_review' check (verification_status in ('pending_review', 'verified', 'rejected')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_scheme_sources_scheme_id on public.scheme_sources(scheme_id);
create index if not exists idx_scheme_sources_source_type on public.scheme_sources(source_type);
create index if not exists idx_scheme_sources_verification_status on public.scheme_sources(verification_status);

alter table public.scheme_sources enable row level security;

-- ============================================================
-- 8. scheme_versions
-- ============================================================
create table if not exists public.scheme_versions (
  id uuid primary key default gen_random_uuid(),
  scheme_id uuid not null references public.schemes(id) on delete cascade,
  academic_year text not null,
  data_snapshot jsonb not null,
  source_url text,
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (scheme_id, academic_year)
);

-- Ensure academic_year column exists (table might have been created without it in a previous failed run)
alter table public.scheme_versions add column if not exists academic_year text not null default '';

create index if not exists idx_scheme_versions_scheme_id on public.scheme_versions(scheme_id);
create index if not exists idx_scheme_versions_academic_year on public.scheme_versions(academic_year);

alter table public.scheme_versions enable row level security;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Helper function to check if user is admin
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in ('admin', 'super_admin')
  );
$$;

-- departments: authenticated users can read active, admins can do everything
create policy "departments_select_active" on public.departments
for select to authenticated
using (is_active = true);

create policy "departments_admin_all" on public.departments
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- scheme_categories: authenticated users can read active, admins can do everything
create policy "scheme_categories_select_active" on public.scheme_categories
for select to authenticated
using (is_active = true);

create policy "scheme_categories_admin_all" on public.scheme_categories
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- schemes: authenticated users can read published+verified, admins can do everything
create policy "schemes_select_published_verified" on public.schemes
for select to authenticated
using (status = 'published' and verification_status = 'verified');

create policy "schemes_admin_all" on public.schemes
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- scheme_eligibility: authenticated users can read for published+verified schemes, admins can do everything
create policy "scheme_eligibility_select" on public.scheme_eligibility
for select to authenticated
using (
  exists (
    select 1 from public.schemes s
    where s.id = scheme_id
    and s.status = 'published'
    and s.verification_status = 'verified'
  )
);

create policy "scheme_eligibility_admin_all" on public.scheme_eligibility
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- scheme_benefits: authenticated users can read for published+verified schemes, admins can do everything
create policy "scheme_benefits_select" on public.scheme_benefits
for select to authenticated
using (
  exists (
    select 1 from public.schemes s
    where s.id = scheme_id
    and s.status = 'published'
    and s.verification_status = 'verified'
  )
);

create policy "scheme_benefits_admin_all" on public.scheme_benefits
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- scheme_documents: authenticated users can read for published+verified schemes, admins can do everything
create policy "scheme_documents_select" on public.scheme_documents
for select to authenticated
using (
  exists (
    select 1 from public.schemes s
    where s.id = scheme_id
    and s.status = 'published'
    and s.verification_status = 'verified'
  )
);

create policy "scheme_documents_admin_all" on public.scheme_documents
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- scheme_sources: only admins can access (source tracking is internal)
create policy "scheme_sources_admin_all" on public.scheme_sources
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- scheme_versions: only admins can access (version history is internal)
create policy "scheme_versions_admin_all" on public.scheme_versions
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Ensure departments table has official_url column (might have been created without it in a previous failed run)
alter table public.departments add column if not exists official_url text;

-- ============================================================
-- Seed initial departments and categories
-- ============================================================

insert into public.departments (name, code, description, official_url, is_active) values
  ('Social Justice and Special Assistance Department', 'SJSA', 'Department responsible for social justice and special assistance schemes', 'https://sjsa.maharashtra.gov.in/', true),
  ('Tribal Development Department', 'TDD', 'Department for tribal welfare and development schemes', 'https://tribal.maharashtra.gov.in/', true),
  ('Directorate of Higher Education', 'DHE', 'Directorate overseeing higher education scholarships', 'https://dhe.maharashtra.gov.in/', true),
  ('Directorate of Technical Education', 'DTE', 'Directorate for technical education schemes', 'https://dte.maharashtra.gov.in/', true),
  ('Directorate of School Education', 'DSE', 'Directorate for school education scholarships', 'https://schooleducation.maharashtra.gov.in/', true),
  ('OBC, SEBC, VJNT & SBC Welfare Department', 'OBCW', 'Department for OBC, SEBC, VJNT and SBC welfare schemes', 'https://obcw.maharashtra.gov.in/', true),
  ('Ministry of Tribal Affairs (Central)', 'MOTA', 'Central ministry for tribal affairs schemes', 'https://tribal.nic.in/', true),
  ('Mahatma Phule Krishi Vidyapeeth, Rahuri', 'MPKV', 'Agricultural university schemes', 'https://mpkv.ac.in/', true),
  ('Directorate of Art', 'DOA', 'Art education schemes', 'https://art.maharashtra.gov.in/', true),
  ('Directorate of Medical Education and Research', 'DMER', 'Medical education scholarships', 'https://dmer.maharashtra.gov.in/', true)
on conflict (code) do update set
  name = excluded.name,
  description = excluded.description,
  official_url = excluded.official_url,
  is_active = excluded.is_active,
  updated_at = now();

-- Ensure scheme_categories table has updated_at column (might have been created without it in a previous failed run)
alter table public.scheme_categories add column if not exists updated_at timestamptz not null default now();

insert into public.scheme_categories (name, description, is_active) values
  ('Post Matric Scholarship', 'Scholarships for students after matriculation (Class 10+)', true),
  ('Pre Matric Scholarship', 'Scholarships for students before matriculation (Class 1-10)', true),
  ('Freeship', 'Tuition fee waiver schemes', true),
  ('Merit Scholarship', 'Merit-based scholarships for high-performing students', true),
  ('Maintenance Allowance', 'Living expense and hostel allowance schemes', true),
  ('Disability Scholarship', 'Scholarships for students with disabilities', true),
  ('Tribal Scholarship', 'Schemes specifically for Scheduled Tribe students', true),
  ('Fellowship', 'Research and academic fellowships', true),
  ('Overseas Study Support', 'Support for studying abroad', true),
  ('Other', 'Other scholarship and assistance schemes', true)
on conflict (name) do update set
  description = excluded.description,
  is_active = excluded.is_active,
  updated_at = now();