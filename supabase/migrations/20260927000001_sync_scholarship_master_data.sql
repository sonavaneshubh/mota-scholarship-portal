-- =============================================================================
-- Synchronize Scholarship Master Data
-- Replace existing schemes with 5 official MoTA schemes for ST students
-- =============================================================================

-- This migration:
-- 1. Deactivates old published schemes that are not in the official 5
-- 2. Inserts/updates the 5 official MoTA schemes for ST students
-- 2. Maintains referential integrity with related tables

-- =============================================================================
-- Step 1: Deactivate old published schemes that are NOT in the official 5
-- =============================================================================
-- The 5 official scheme codes:
-- BVOBC - Post-Matric Scholarship Scheme For ST Students
-- BPVGK - Pre-Matric Scholarship Scheme For ST Student  
-- A023B - Top Class Education For ST Students
-- ARG45 - National Fellowship for ST Students
-- AZKMI - National Overseas Scholarship Scheme

-- Deactivate old published schemes that are not in the official 5
-- Use 'archived' status (allowed by check constraint) with is_active=false
UPDATE public.schemes
SET 
    status = 'archived',
    is_active = false,
    updated_at = now()
WHERE status = 'published'
  AND verification_status = 'verified'
  AND scheme_code NOT IN ('BVOBC', 'BPVGK', 'A023B', 'ARG45', 'AZKMI');

-- =============================================================================
-- Step 2: Upsert the 5 official MoTA schemes
-- =============================================================================
-- Using upsert on scheme_code to handle both insert and update

-- 1. Post-Matric Scholarship Scheme For ST Students
INSERT INTO public.schemes (
    scheme_code, name, short_name, department_id, category_id, scheme_type,
    description, overview, application_mode, official_scheme_url, 
    official_application_url, gr_url, academic_year, 
    application_start_date, application_end_date, 
    renewal_available, status, verification_status, 
    source_url, source_type, source_last_verified_at, 
    is_active, created_at, updated_at
)
SELECT 
    'BVOBC',
    'Post-Matric Scholarship Scheme For ST Students',
    'Post-Matric ST',
    d.id,
    c.id,
    'Centrally Sponsored Scheme',
    'Post-Matric Scholarship for ST students pursuing studies at post-matriculation level.',
    'Financial assistance for ST students pursuing post-matriculation studies in recognized institutions.',
    'Online',
    'https://dbttribal.gov.in/AllScheme.aspx',
    'https://dbttribal.gov.in/',
    NULL,
    '2025-2026',
    '2025-07-01',
    '2025-12-31',
    true,
    'published',
    'verified',
    'https://dbttribal.gov.in/AllScheme.aspx',
    'dbt_tribal',
    '2025-01-15T00:00:00+00:00'::timestamptz,
    true,
    now(),
    now()
FROM public.departments d, public.scheme_categories c
WHERE d.code = 'MOTA' AND c.name = 'Scholarship'
ON CONFLICT (scheme_code) DO UPDATE SET
    name = EXCLUDED.name,
    short_name = EXCLUDED.short_name,
    department_id = EXCLUDED.department_id,
    category_id = EXCLUDED.category_id,
    scheme_type = EXCLUDED.scheme_type,
    description = EXCLUDED.description,
    overview = EXCLUDED.overview,
    application_mode = EXCLUDED.application_mode,
    official_scheme_url = EXCLUDED.official_scheme_url,
    official_application_url = EXCLUDED.official_application_url,
    gr_url = EXCLUDED.gr_url,
    academic_year = EXCLUDED.academic_year,
    application_start_date = EXCLUDED.application_start_date,
    application_end_date = EXCLUDED.application_end_date,
    renewal_available = EXCLUDED.renewal_available,
    status = EXCLUDED.status,
    verification_status = EXCLUDED.verification_status,
    source_url = EXCLUDED.source_url,
    source_type = EXCLUDED.source_type,
    source_last_verified_at = EXCLUDED.source_last_verified_at,
    is_active = EXCLUDED.is_active,
    updated_at = now();

-- 2. Pre-Matric Scholarship Scheme For ST Student
INSERT INTO public.schemes (
    scheme_code, name, short_name, department_id, category_id, scheme_type,
    description, overview, application_mode, official_scheme_url, 
    official_application_url, gr_url, academic_year, 
    application_start_date, application_end_date, 
    renewal_available, status, verification_status, 
    source_url, source_type, source_last_verified_at, 
    is_active, created_at, updated_at
)
SELECT 
    'BPVGK',
    'Pre-Matric Scholarship Scheme For ST Student',
    'Pre-Matric ST',
    d.id,
    c.id,
    'Centrally Sponsored Scheme',
    'Pre-Matric Scholarship for ST students studying in Class 9 and 10.',
    'Financial assistance for ST students studying in Class 9 and 10 to reduce dropout rates.',
    'Online',
    'https://dbttribal.gov.in/AllScheme.aspx',
    'https://dbttribal.gov.in/',
    NULL,
    '2025-2026',
    '2025-07-01',
    '2025-12-31',
    true,
    'published',
    'verified',
    'https://dbttribal.gov.in/AllScheme.aspx',
    'dbt_tribal',
    '2025-01-15T00:00:00+00:00'::timestamptz,
    true,
    now(),
    now()
FROM public.departments d, public.scheme_categories c
WHERE d.code = 'MOTA' AND c.name = 'Scholarship'
ON CONFLICT (scheme_code) DO UPDATE SET
    name = EXCLUDED.name,
    short_name = EXCLUDED.short_name,
    department_id = EXCLUDED.department_id,
    category_id = EXCLUDED.category_id,
    scheme_type = EXCLUDED.scheme_type,
    description = EXCLUDED.description,
    overview = EXCLUDED.overview,
    application_mode = EXCLUDED.application_mode,
    official_scheme_url = EXCLUDED.official_scheme_url,
    official_application_url = EXCLUDED.official_application_url,
    gr_url = EXCLUDED.gr_url,
    academic_year = EXCLUDED.academic_year,
    application_start_date = EXCLUDED.application_start_date,
    application_end_date = EXCLUDED.application_end_date,
    renewal_available = EXCLUDED.renewal_available,
    status = EXCLUDED.status,
    verification_status = EXCLUDED.verification_status,
    source_url = EXCLUDED.source_url,
    source_type = EXCLUDED.source_type,
    source_last_verified_at = EXCLUDED.source_last_verified_at,
    is_active = EXCLUDED.is_active,
    updated_at = now();

-- 3. Top Class Education For ST Students
INSERT INTO public.schemes (
    scheme_code, name, short_name, department_id, category_id, scheme_type,
    description, overview, application_mode, official_scheme_url, 
    official_application_url, gr_url, academic_year, 
    application_start_date, application_end_date, 
    renewal_available, status, verification_status, 
    source_url, source_type, source_last_verified_at, 
    is_active, created_at, updated_at
)
SELECT 
    'A023B',
    'Top Class Education For ST Students',
    'Top Class ST',
    d.id,
    c.id,
    'Central Sector Scheme',
    'Top Class Education scheme for ST students pursuing professional courses in premier institutions.',
    'Financial support for meritorious ST students pursuing professional courses in premier institutions like IITs, IIMs, NITs, etc.',
    'Online',
    'https://dbttribal.gov.in/AllScheme.aspx',
    'https://dbttribal.gov.in/',
    NULL,
    '2025-2026',
    '2025-07-01',
    '2025-12-31',
    true,
    'published',
    'verified',
    'https://dbttribal.gov.in/AllScheme.aspx',
    'dbt_tribal',
    '2025-01-15T00:00:00+00:00'::timestamptz,
    true,
    now(),
    now()
FROM public.departments d, public.scheme_categories c
WHERE d.code = 'MOTA' AND c.name = 'Fellowship'
ON CONFLICT (scheme_code) DO UPDATE SET
    name = EXCLUDED.name,
    short_name = EXCLUDED.short_name,
    department_id = EXCLUDED.department_id,
    category_id = EXCLUDED.category_id,
    scheme_type = EXCLUDED.scheme_type,
    description = EXCLUDED.description,
    overview = EXCLUDED.overview,
    application_mode = EXCLUDED.application_mode,
    official_scheme_url = EXCLUDED.official_scheme_url,
    official_application_url = EXCLUDED.official_application_url,
    gr_url = EXCLUDED.gr_url,
    academic_year = EXCLUDED.academic_year,
    application_start_date = EXCLUDED.application_start_date,
    application_end_date = EXCLUDED.application_end_date,
    renewal_available = EXCLUDED.renewal_available,
    status = EXCLUDED.status,
    verification_status = EXCLUDED.verification_status,
    source_url = EXCLUDED.source_url,
    source_type = EXCLUDED.source_type,
    source_last_verified_at = EXCLUDED.source_last_verified_at,
    is_active = EXCLUDED.is_active,
    updated_at = now();

-- 4. National Fellowship for ST Students
INSERT INTO public.schemes (
    scheme_code, name, short_name, department_id, category_id, scheme_type,
    description, overview, application_mode, official_scheme_url, 
    official_application_url, gr_url, academic_year, 
    application_start_date, application_end_date, 
    renewal_available, status, verification_status, 
    source_url, source_type, source_last_verified_at, 
    is_active, created_at, updated_at
)
SELECT 
    'ARG45',
    'National Fellowship for ST Students',
    'National Fellowship ST',
    d.id,
    c.id,
    'Central Sector Scheme',
    'National Fellowship for ST students pursuing M.Phil/Ph.D. in universities/institutions.',
    'Fellowship for ST students pursuing higher research studies (M.Phil/Ph.D.) in recognized universities.',
    'Online',
    'https://dbttribal.gov.in/AllScheme.aspx',
    'https://dbttribal.gov.in/',
    NULL,
    '2025-2026',
    '2025-07-01',
    '2025-12-31',
    true,
    'published',
    'verified',
    'https://dbttribal.gov.in/AllScheme.aspx',
    'dbt_tribal',
    '2025-01-15T00:00:00+00:00'::timestamptz,
    true,
    now(),
    now()
FROM public.departments d, public.scheme_categories c
WHERE d.code = 'MOTA' AND c.name = 'Fellowship'
ON CONFLICT (scheme_code) DO UPDATE SET
    name = EXCLUDED.name,
    short_name = EXCLUDED.short_name,
    department_id = EXCLUDED.department_id,
    category_id = EXCLUDED.category_id,
    scheme_type = EXCLUDED.scheme_type,
    description = EXCLUDED.description,
    overview = EXCLUDED.overview,
    application_mode = EXCLUDED.application_mode,
    official_scheme_url = EXCLUDED.official_scheme_url,
    official_application_url = EXCLUDED.official_application_url,
    gr_url = EXCLUDED.gr_url,
    academic_year = EXCLUDED.academic_year,
    application_start_date = EXCLUDED.application_start_date,
    application_end_date = EXCLUDED.application_end_date,
    renewal_available = EXCLUDED.renewal_available,
    status = EXCLUDED.status,
    verification_status = EXCLUDED.verification_status,
    source_url = EXCLUDED.source_url,
    source_type = EXCLUDED.source_type,
    source_last_verified_at = EXCLUDED.source_last_verified_at,
    is_active = EXCLUDED.is_active,
    updated_at = now();

-- 5. National Overseas Scholarship Scheme
INSERT INTO public.schemes (
    scheme_code, name, short_name, department_id, category_id, scheme_type,
    description, overview, application_mode, official_scheme_url, 
    official_application_url, gr_url, academic_year, 
    application_start_date, application_end_date, 
    renewal_available, status, verification_status, 
    source_url, source_type, source_last_verified_at, 
    is_active, created_at, updated_at
)
SELECT 
    'AZKMI',
    'National Overseas Scholarship Scheme',
    'Overseas Scholarship ST',
    d.id,
    c.id,
    'Central Sector Scheme',
    'National Overseas Scholarship for ST students for higher studies abroad.',
    'Financial assistance for ST students selected for higher studies (Masters/Ph.D.) abroad in specified fields.',
    'Online',
    'https://dbttribal.gov.in/AllScheme.aspx',
    'https://dbttribal.gov.in/',
    NULL,
    '2025-2026',
    '2025-07-01',
    '2025-12-31',
    true,
    'published',
    'verified',
    'https://dbttribal.gov.in/AllScheme.aspx',
    'dbt_tribal',
    '2025-01-15T00:00:00+00:00'::timestamptz,
    true,
    now(),
    now()
FROM public.departments d, public.scheme_categories c
WHERE d.code = 'MOTA' AND c.name = 'Fellowship'
ON CONFLICT (scheme_code) DO UPDATE SET
    name = EXCLUDED.name,
    short_name = EXCLUDED.short_name,
    department_id = EXCLUDED.department_id,
    category_id = EXCLUDED.category_id,
    scheme_type = EXCLUDED.scheme_type,
    description = EXCLUDED.description,
    overview = EXCLUDED.overview,
    application_mode = EXCLUDED.application_mode,
    official_scheme_url = EXCLUDED.official_scheme_url,
    official_application_url = EXCLUDED.official_application_url,
    gr_url = EXCLUDED.gr_url,
    academic_year = EXCLUDED.academic_year,
    application_start_date = EXCLUDED.application_start_date,
    application_end_date = EXCLUDED.application_end_date,
    renewal_available = EXCLUDED.renewal_available,
    status = EXCLUDED.status,
    verification_status = EXCLUDED.verification_status,
    source_url = EXCLUDED.source_url,
    source_type = EXCLUDED.source_type,
    source_last_verified_at = EXCLUDED.source_last_verified_at,
    is_active = EXCLUDED.is_active,
    updated_at = now();

-- =============================================================================
-- Step 3: Verify the final state
-- =============================================================================
-- This will show the final state of published + verified + active schemes
SELECT 
    scheme_code, 
    name, 
    academic_year, 
    status, 
    verification_status, 
    is_active
FROM public.schemes
WHERE status = 'published' 
  AND verification_status = 'verified' 
  AND is_active = true
ORDER BY scheme_code;