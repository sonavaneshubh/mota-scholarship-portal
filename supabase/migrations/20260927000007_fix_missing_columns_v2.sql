-- Fix missing columns from previous failed migration runs (v2 - adds missing columns)

-- Ensure departments table has official_url column
alter table public.departments add column if not exists official_url text;

-- Ensure scheme_categories table has updated_at column
alter table public.scheme_categories add column if not exists updated_at timestamptz not null default now();

-- Ensure schemes table has all columns
alter table public.schemes add column if not exists scheme_type text;
alter table public.schemes add column if not exists overview text;
alter table public.schemes add column if not exists application_mode text;
alter table public.schemes add column if not exists official_scheme_url text;
alter table public.schemes add column if not exists official_application_url text;
alter table public.schemes add column if not exists gr_url text;
alter table public.schemes add column if not exists renewal_available boolean;
alter table public.schemes add column if not exists source_url text;
alter table public.schemes add column if not exists source_type text;
alter table public.schemes add column if not exists source_last_verified_at timestamptz;

-- Ensure scheme_categories table has updated_at column
alter table public.scheme_categories add column if not exists updated_at timestamptz not null default now();

-- Ensure schemes table has all columns
alter table public.schemes add column if not exists scheme_type text;
alter table public.schemes add column if not exists overview text;
alter table public.schemes add column if not exists application_mode text;
alter table public.schemes add column if not exists official_scheme_url text;
alter table public.schemes add column if not exists official_application_url text;
alter table public.schemes add column if not exists gr_url text;
alter table public.schemes add column if not exists renewal_available boolean;
alter table public.schemes add column if not exists source_url text;
alter table public.schemes add column if not exists source_type text;
alter table public.schemes add column if not exists source_last_verified_at timestamptz;

-- Ensure scheme_eligibility has academic_year column
alter table public.scheme_eligibility add column if not exists academic_year text not null default '';

-- Ensure scheme_benefits has academic_year column
alter table public.scheme_benefits add column if not exists academic_year text not null default '';

-- Ensure scheme_documents has academic_year column
alter table public.scheme_documents add column if not exists academic_year text;

-- Ensure scheme_versions has academic_year column
alter table public.scheme_versions add column if not exists academic_year text not null default '';

-- Recreate indexes that might have failed due to missing columns
create index if not exists idx_scheme_eligibility_academic_year on public.scheme_eligibility(academic_year);
create index if not exists idx_scheme_benefits_academic_year on public.scheme_benefits(academic_year);
create index if not exists idx_scheme_documents_academic_year on public.scheme_documents(academic_year);
create index if not exists idx_scheme_versions_academic_year on public.scheme_versions(academic_year);