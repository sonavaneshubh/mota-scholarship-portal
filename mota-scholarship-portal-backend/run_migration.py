import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
supabase = create_client(url, key)

# Step 1: Deactivate old published schemes
print('Step 1: Deactivating old published schemes...')
result = supabase.table('schemes').update({'status': 'archived', 'is_active': False, 'updated_at': 'now()'}).eq('status', 'published').eq('verification_status', 'verified').not_.in_('scheme_code', ['BVOBC', 'BPVGK', 'A023B', 'ARG45', 'AZKMI']).execute()
print(f'Deactivated: {len(result.data)} schemes')
for s in result.data:
    print(f'  Archived: {s["scheme_code"]} - {s["name"]}')

# Step 2: Upsert the 5 official MoTA schemes
print('\nStep 2: Upserting 5 official MoTA schemes...')

# Get department and category IDs
departments = supabase.table('departments').select('id, code').execute()
departments_dict = {d['code']: d['id'] for d in departments.data}

categories = supabase.table('scheme_categories').select('id, name').execute()
categories_dict = {c['name']: c['id'] for c in categories.data}

print(f'Departments: {departments_dict}')
print(f'Categories: {categories_dict}')

mota_dept_id = departments_dict.get('MOTA')
scholarship_cat_id = None
fellowship_cat_id = None
for cat in categories.data:
    if cat['name'] == 'Scholarship':
        scholarship_cat_id = cat['id']
    elif cat['name'] == 'Fellowship':
        fellowship_cat_id = cat['id']

print(f'MOTA dept ID: {mota_dept_id}')
print(f'Scholarship cat ID: {scholarship_cat_id}')
print(f'Fellowship cat ID: {fellowship_cat_id}')

# Now upsert the 5 schemes
schemes_to_upsert = [
    {
        'scheme_code': 'BVOBC',
        'name': 'Post-Matric Scholarship Scheme For ST Students',
        'short_name': 'Post-Matric ST',
        'department_id': mota_dept_id,
        'category_id': None,  # Will be set below
        'scheme_type': 'Centrally Sponsored Scheme',
        'description': 'Post-Matric Scholarship for ST students pursuing studies at post-matriculation level.',
        'overview': 'Financial assistance for ST students pursuing post-matriculation studies in recognized institutions.',
        'application_mode': 'Online',
        'official_scheme_url': 'https://dbttribal.gov.in/AllScheme.aspx',
        'official_application_url': 'https://dbttribal.gov.in/',
        'gr_url': None,
        'academic_year': '2025-2026',
        'application_start_date': '2025-07-01',
        'application_end_date': '2025-12-31',
        'renewal_available': True,
        'status': 'published',
        'verification_status': 'verified',
        'source_url': 'https://dbttribal.gov.in/AllScheme.aspx',
        'source_type': 'dbt_tribal',
        'source_last_verified_at': '2025-01-15T00:00:00+00:00',
        'is_active': True,
    },
    {
        'scheme_code': 'BPVGK',
        'name': 'Pre-Matric Scholarship Scheme For ST Student',
        'short_name': 'Pre-Matric ST',
        'department_id': None,
        'category_id': None,
        'scheme_type': 'Centrally Sponsored Scheme',
        'description': 'Pre-Matric Scholarship for ST students studying in Class 9 and 10.',
        'overview': 'Financial assistance for ST students studying in Class 9 and 10 to reduce dropout rates.',
        'application_mode': 'Online',
        'official_scheme_url': 'https://dbttribal.gov.in/AllScheme.aspx',
        'official_application_url': 'https://dbttribal.gov.in/',
        'gr_url': None,
        'academic_year': '2025-2026',
        'application_start_date': '2025-07-01',
        'application_end_date': '2025-12-31',
        'renewal_available': True,
        'status': 'published',
        'verification_status': 'verified',
        'source_url': 'https://dbttribal.gov.in/AllScheme.aspx',
        'source_type': 'dbt_tribal',
        'source_last_verified_at': '2025-01-15T00:00:00+00:00',
        'is_active': True,
    },
    {
        'scheme_code': 'A023B',
        'name': 'Top Class Education For ST Students',
        'short_name': 'Top Class ST',
        'department_id': None,
        'category_id': None,
        'scheme_type': 'Central Sector Scheme',
        'description': 'Top Class Education scheme for ST students pursuing professional courses in premier institutions.',
        'overview': 'Financial support for meritorious ST students pursuing professional courses in premier institutions like IITs, IIMs, NITs, etc.',
        'application_mode': 'Online',
        'official_scheme_url': 'https://dbttribal.gov.in/AllScheme.aspx',
        'official_application_url': 'https://dbttribal.gov.in/',
        'gr_url': None,
        'academic_year': '2025-2026',
        'application_start_date': '2025-07-01',
        'application_end_date': '2025-12-31',
        'renewal_available': True,
        'status': 'published',
        'verification_status': 'verified',
        'source_url': 'https://dbttribal.gov.in/AllScheme.aspx',
        'source_type': 'dbt_tribal',
        'source_last_verified_at': '2025-01-15T00:00:00+00:00',
        'is_active': True,
    },
    {
        'scheme_code': 'ARG45',
        'name': 'National Fellowship for ST Students',
        'short_name': 'National Fellowship ST',
        'department_id': None,
        'category_id': None,
        'scheme_type': 'Central Sector Scheme',
        'description': 'National Fellowship for ST students pursuing M.Phil/Ph.D. in universities/institutions.',
        'overview': 'Fellowship for ST students pursuing higher research studies (M.Phil/Ph.D.) in recognized universities.',
        'application_mode': 'Online',
        'official_scheme_url': 'https://dbttribal.gov.in/AllScheme.aspx',
        'official_application_url': 'https://dbttribal.gov.in/',
        'gr_url': None,
        'academic_year': '2025-2026',
        'application_start_date': '2025-07-01',
        'application_end_date': '2025-12-31',
        'renewal_available': True,
        'status': 'published',
        'verification_status': 'verified',
        'source_url': 'https://dbttribal.gov.in/AllScheme.aspx',
        'source_type': 'dbt_tribal',
        'source_last_verified_at': '2025-01-15T00:00:00+00:00',
        'is_active': True,
    },
    {
        'scheme_code': 'AZKMI',
        'name': 'National Overseas Scholarship Scheme',
        'short_name': 'Overseas Scholarship ST',
        'department_id': None,
        'category_id': None,
        'scheme_type': 'Central Sector Scheme',
        'description': 'National Overseas Scholarship for ST students for higher studies abroad.',
        'overview': 'Financial assistance for ST students selected for higher studies (Masters/Ph.D.) abroad in specified fields.',
        'application_mode': 'Online',
        'official_scheme_url': 'https://dbttribal.gov.in/AllScheme.aspx',
        'official_application_url': 'https://dbttribal.gov.in/',
        'gr_url': None,
        'academic_year': '2025-2026',
        'application_start_date': '2025-07-01',
        'application_end_date': '2025-12-31',
        'renewal_available': True,
        'status': 'published',
        'verification_status': 'verified',
        'source_url': 'https://dbttribal.gov.in/AllScheme.aspx',
        'source_type': 'dbt_tribal',
        'source_last_verified_at': '2025-01-15T00:00:00+00:00',
        'is_active': True,
    },
]

# Fill in department_id and category_id for each scheme
for scheme in schemes_to_upsert:
    if scheme['scheme_code'] in ['BVOBC', 'BPVGK']:
        scheme['department_id'] = mota_dept_id
        scheme['category_id'] = scholarship_cat_id
        scheme['scheme_type'] = 'Centrally Sponsored Scheme'
    elif scheme['scheme_code'] in ['A023B', 'ARG45', 'AZKMI']:
        scheme['department_id'] = mota_dept_id
        scheme['category_id'] = fellowship_cat_id
        scheme['scheme_type'] = 'Central Sector Scheme'

# Upsert each scheme
for scheme in schemes_to_upsert:
    print(f'Upserting {scheme["scheme_code"]}...')
    result = supabase.table('schemes').upsert(scheme, on_conflict='scheme_code').execute()
    if result.data:
        print(f'  Upserted: {scheme["scheme_code"]} - {scheme["name"]}')
    else:
        print(f'  FAILED: {scheme["scheme_code"]} - {result}')

# Final verification
print('\n=== FINAL VERIFICATION ===')
result = supabase.table('schemes').select('scheme_code, name, status, verification_status, is_active').eq('status', 'published').eq('verification_status', 'verified').eq('is_active', True).execute()
print(f'\nPublished + Verified + Active schemes: {len(result.data)}')
for s in result.data:
    print(f'  {s["scheme_code"]}: {s["name"]} | {s["status"]}/{s["verification_status"]} is_active={s["is_active"]}')