# Scholarship Scheme Importer

Official MahaDBT Scholarship Scheme Data Import System for the Scholarship Portal.

## Overview

This package imports, validates, and manages scholarship scheme data from official MahaDBT sources into the Supabase database. It follows a strict data accuracy policy: **never invent scholarship information**.

## Architecture

```
OFFICIAL MAHADBT → SOURCE CONNECTOR → PARSER → NORMALIZER → VALIDATOR → DATABASE IMPORT → ADMIN REVIEW → VERIFIED → APPLICANT PORTAL
```

## Components

| Module | Purpose |
|--------|---------|
| `maha_dbt_source.py` | Connects to official MahaDBT portal, fetches scheme pages |
| `parser.py` | Extracts structured data from HTML pages |
| `normalizer.py` | Standardizes parsed data into database format |
| `validator.py` | Validates all data before insertion |
| `importer.py` | Idempotent database upsert with versioning |
| `seed_schemes.py` | Curated verified seed data + CLI |

## Database Schema

The importer uses these normalized tables:

- `departments` - Government departments
- `scheme_categories` - Scheme categories (Post Matric, Fellowship, etc.)
- `schemes` - Main scheme table with academic_year partitioning
- `scheme_eligibility` - Structured eligibility criteria
- `scheme_benefits` - Benefit amounts and types
- `scheme_documents` - Required documents
- `scheme_sources` - Source tracking with verification status
- `scheme_versions` - Historical snapshots per academic year

## Installation

```bash
cd mota-scholarship-portal-backend/scheme_importer
pip install -r requirements.txt
```

## Environment Variables

Create a `.env` file:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Usage

### Dry Run (Safe Testing)

```bash
# Test MahaDBT import (fetch only, no DB changes)
python -m scheme_importer.seed_schemes --dry-run

# Test JSON import
python -m scheme_importer --source json --json-path ./verified_schemes.json --dry-run
```

### Live Import

```bash
# Import seed schemes (verified from official sources)
python -m scheme_importer.seed_schemes

# Import from MahaDBT live (requires network)
python -m scheme_importer --source mahadbt --max-schemes 50

# Import from verified JSON file
python -m scheme_importer --source json --json-path ./verified_schemes.json
```

### Programmatic Usage

```python
from scheme_importer import SchemeImporter, import_from_mahadbt, import_from_json

# From MahaDBT
result = await import_from_mahadbt(
    supabase_url="https://xxx.supabase.co",
    supabase_service_key="xxx",
    max_schemes=50,
)

# From JSON
result = await import_from_json(
    supabase_url="https://xxx.supabase.co",
    supabase_service_key="xxx",
    json_path="./verified_schemes.json",
)

# Custom importer
importer = SchemeImporter(
    supabase_url="https://xxx.supabase.co",
    supabase_service_key="xxx",
    dry_run=False,
)
result = await importer.import_batch(normalized_schemes)
```

## Data Accuracy Rules

**NEVER INVENT INFORMATION:**

- ❌ Eligibility criteria
- ❌ Income limits
- ❌ Scholarship amounts
- ❌ Caste/category requirements
- ❌ Age limits
- ❌ Documents
- ❌ Application dates
- ❌ Renewal rules
- ❌ Course requirements
- ❌ GR numbers
- ❌ Application URLs
- ❌ Benefits

If official information cannot be verified:
- Store field as `NULL`
- Or mark as: `"Not specified in source"`

Every imported scheme MUST contain:
- `source_url`
- `source_last_verified_at`
- `source_type`
- `verification_status` (pending_review / verified / rejected)

## Verification Workflow

```
1. Import → pending_review
2. Admin reviews in Admin Portal
3. Admin verifies → verified
4. Admin publishes → published
5. Applicants see only: published + verified
```

## Academic Year Handling

Each scheme's eligibility/benefits are versioned per academic year:

- 2024-25 rules ≠ 2025-26 rules
- Historical versions preserved in `scheme_versions`
- Admin can compare changes across years

## Source Change Detection

- Content hash generated from normalized data
- On re-import: compare hash with previous
- If changed: mark `source_changed`, create new version
- Admin reviews changes before publishing

## Testing

```bash
# Run validation tests
python -m pytest tests/

# Run import twice (idempotency test)
python -m scheme_importer.seed_schemes --dry-run
python -m scheme_importer.seed_schemes --dry-run
```

## Adding New Schemes

1. Find official scheme page on MahaDBT
2. Verify all information manually
3. Add to `SEED_SCHEMES` in `seed_schemes.py`
4. Run dry-run: `python -m scheme_importer.seed_schemes --dry-run`
5. Fix validation warnings
6. Run live import: `python -m scheme_importer.seed_schemes`

## API Endpoints (After Import)

The frontend connects to these Supabase queries:

- `GET /api/schemes` - Published + verified schemes with filters
- `GET /api/schemes/:id` - Full scheme detail
- `GET /api/schemes/:id/eligibility` - Structured eligibility
- `GET /api/schemes/:id/benefits` - Benefits
- `GET /api/schemes/:id/documents` - Required documents
- `GET /api/applicant/schemes` - Applicant-matched schemes (future)

## Security

- Service role key NEVER exposed to frontend
- Frontend uses public Supabase config with RLS
- Server-side importer uses secure env vars
- RLS policies enforce:
  - Applicants: only published+verified schemes
  - Admins: full CRUD access

## Important Source Policy

| Source Type | Allowed | Notes |
|-------------|---------|-------|
| MahaDBT official | ✅ | Primary source |
| Official dept websites | ✅ | When scheme originates there |
| Government Resolutions | ✅ | When linked from official |
| Third-party sites | ❌ | Not authoritative |
| Blogs/coaching sites | ❌ | Never use |

## Documentation

- `docs/SCHOLARSHIP_SCHEME_DATA.md` - Full data model documentation
- Migration: `supabase/migrations/20260927000000_create_scholarship_master_tables.sql`