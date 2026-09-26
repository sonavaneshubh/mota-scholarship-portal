"""
Seed Script for Verified Initial Scheme Data.
Imports a curated set of schemes verified from official MahaDBT/DBT sources.

Official source: https://dbttribal.gov.in/AllScheme.aspx
The 5 official MoTA schemes for ST students.
"""

import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .importer import SchemeImporter, import_from_json
from .normalizer import normalize_scheme_data
from .validator import validate_scheme_data


# Official 5 MoTA Schemes for ST Students (from https://dbttribal.gov.in/AllScheme.aspx)
# Only these 5 should be active/published
SEED_SCHEMES = [
    {
        "scheme_code": "BVOBC",
        "name": "Post-Matric Scholarship Scheme For ST Students",
        "short_name": "Post-Matric ST",
        "department_code": "MOTA",
        "category_name": "Post Matric Scholarship",
        "scheme_type": "Centrally Sponsored Scheme",
        "description": "Post-Matric Scholarship for ST students pursuing studies at post-matriculation level.",
        "overview": "Financial assistance for ST students pursuing post-matriculation studies in recognized institutions.",
        "application_mode": "Online",
        "official_scheme_url": "https://dbttribal.gov.in/AllScheme.aspx",
        "official_application_url": "https://dbttribal.gov.in/",
        "gr_url": None,
        "academic_year": "2025-2026",
        "application_start_date": "2025-07-01",
        "application_end_date": "2025-12-31",
        "renewal_available": True,
        "status": "published",
        "verification_status": "verified",
        "source_url": "https://dbttribal.gov.in/AllScheme.aspx",
        "source_type": "dbt_tribal",
        "source_last_verified_at": "2025-01-15T00:00:00+00:00",
        "eligibility": {
            "category_requirement": "ST (Scheduled Tribe)",
            "residency_requirement": "As per state/UT norms",
            "course_requirement": "Post-matriculation courses (Class 11 onwards)",
            "institution_requirement": "Recognized institutions",
            "max_income": 250000,
            "income_period": "annual",
            "other_conditions": "ST category certificate required. Family annual income should not exceed Rs. 2,50,000. Regular attendance required."
        },
        "benefits": [
            {
                "benefit_type": "maintenance_allowance",
                "description": "Maintenance allowance for hostellers and day scholars",
                "amount": None,
                "amount_currency": "INR",
                "amount_period": "annual",
                "coverage": "As per scheme norms",
                "hosteller_amount": None,
                "day_scholar_amount": None,
            }
        ],
        "documents": [
            {"document_name": "Aadhaar Card", "description": "Identity proof", "is_mandatory": True, "academic_year": "2025-2026", "source_text": "Aadhaar card copy"},
            {"document_name": "Caste Certificate", "description": "ST category certificate", "is_mandatory": True, "academic_year": "2025-2026", "source_text": "ST caste certificate"},
            {"document_name": "Domicile Certificate", "description": "State domicile proof", "is_mandatory": True, "academic_year": "2025-2026", "source_text": "Domicile certificate"},
            {"document_name": "Income Certificate", "description": "Family annual income certificate", "is_mandatory": True, "academic_year": "2025-2026", "source_text": "Income certificate"},
            {"document_name": "Previous Marksheet", "description": "Qualifying examination marksheet", "is_mandatory": True, "academic_year": "2025-2026", "source_text": "Previous year marksheet"},
        ],
        "sources": [{
            "source_type": "dbt_tribal",
            "source_url": "https://dbttribal.gov.in/AllScheme.aspx",
            "gr_url": None,
            "source_title": "Post-Matric Scholarship Scheme For ST Students",
            "verification_status": "verified",
        }],
    },
    {
        "scheme_code": "BPVGK",
        "name": "Pre-Matric Scholarship Scheme For ST Student",
        "short_name": "Pre-Matric ST",
        "department_code": "MOTA",
        "category_name": "Pre Matric Scholarship",
        "scheme_type": "Centrally Sponsored Scheme",
        "description": "Pre-Matric Scholarship for ST students studying in Class 9 and 10.",
        "overview": "Financial assistance for ST students studying in Class 9 and 10 to reduce dropout rates.",
        "application_mode": "Online",
        "official_scheme_url": "https://dbttribal.gov.in/AllScheme.aspx",
        "official_application_url": "https://dbttribal.gov.in/",
        "gr_url": None,
        "academic_year": "2025-2026",
        "application_start_date": "2025-07-01",
        "application_end_date": "2025-12-31",
        "renewal_available": True,
        "status": "published",
        "verification_status": "verified",
        "source_url": "https://dbttribal.gov.in/AllScheme.aspx",
        "source_type": "dbt_tribal",
        "source_last_verified_at": "2025-01-15T00:00:00+00:00",
        "eligibility": {
            "category_requirement": "ST (Scheduled Tribe)",
            "residency_requirement": "As per state/UT norms",
            "course_requirement": "Class 9 and 10",
            "institution_requirement": "Recognized schools",
            "max_income": 200000,
            "income_period": "annual",
            "other_conditions": "ST category certificate required. Family annual income should not exceed Rs. 2,00,000. Regular attendance required."
        },
        "benefits": [
            {
                "benefit_type": "maintenance_allowance",
                "description": "Monthly maintenance allowance for hostellers and day scholars",
                "amount": None,
                "amount_currency": "INR",
                "amount_period": "monthly",
                "coverage": "As per scheme norms",
                "hosteller_amount": None,
                "day_scholar_amount": None,
            }
        ],
        "documents": [
            {"document_name": "Aadhaar Card", "description": "Identity proof", "is_mandatory": True, "academic_year": "2025-2026", "source_text": "Aadhaar card copy"},
            {"document_name": "Caste Certificate", "description": "ST category certificate", "is_mandatory": True, "academic_year": "2025-2026", "source_text": "ST caste certificate"},
            {"document_name": "Domicile Certificate", "description": "State domicile proof", "is_mandatory": True, "academic_year": "2025-2026", "source_text": "Domicile certificate"},
            {"document_name": "Income Certificate", "description": "Family annual income certificate", "is_mandatory": True, "academic_year": "2025-2026", "source_text": "Income certificate"},
        ],
        "sources": [{
            "source_type": "dbt_tribal",
            "source_url": "https://dbttribal.gov.in/AllScheme.aspx",
            "gr_url": None,
            "source_title": "Pre-Matric Scholarship Scheme For ST Student",
            "verification_status": "verified",
        }],
    },
    {
        "scheme_code": "A023B",
        "name": "Top Class Education For ST Students",
        "short_name": "Top Class ST",
        "department_code": "MOTA",
        "category_name": "Fellowship",
        "scheme_type": "Central Sector Scheme",
        "description": "Top Class Education scheme for ST students pursuing professional courses in premier institutions.",
        "overview": "Financial support for meritorious ST students pursuing professional courses in premier institutions like IITs, IIMs, NITs, etc.",
        "application_mode": "Online",
        "official_scheme_url": "https://dbttribal.gov.in/AllScheme.aspx",
        "official_application_url": "https://dbttribal.gov.in/",
        "gr_url": None,
        "academic_year": "2025-2026",
        "application_start_date": "2025-07-01",
        "application_end_date": "2025-12-31",
        "renewal_available": True,
        "status": "published",
        "verification_status": "verified",
        "source_url": "https://dbttribal.gov.in/AllScheme.aspx",
        "source_type": "dbt_tribal",
        "source_last_verified_at": "2025-01-15T00:00:00+00:00",
        "eligibility": {
            "category_requirement": "ST (Scheduled Tribe)",
            "residency_requirement": "As per scheme norms",
            "course_requirement": "Professional courses in notified institutions (IITs, IIMs, NITs, etc.)",
            "institution_requirement": "Notified top-class institutions",
            "max_income": 800000,
            "income_period": "annual",
            "other_conditions": "Admission in notified institutions. Family annual income should not exceed Rs. 8,00,000. Merit-based selection."
        },
        "benefits": [
            {
                "benefit_type": "tuition_fee",
                "description": "Full tuition fee and non-refundable charges",
                "amount": None,
                "amount_currency": "INR",
                "amount_period": "annual",
                "coverage": "Full tuition fee as per actuals",
            },
            {
                "benefit_type": "living_expenses",
                "description": "Living expenses allowance",
                "amount": None,
                "amount_currency": "INR",
                "amount_period": "annual",
                "coverage": "As per scheme norms",
            }
        ],
        "documents": [
            {"document_name": "Aadhaar Card", "description": "Identity proof", "is_mandatory": True, "academic_year": "2025-2026", "source_text": "Aadhaar card copy"},
            {"document_name": "Caste Certificate", "description": "ST category certificate", "is_mandatory": True, "academic_year": "2025-2026", "source_text": "ST caste certificate"},
            {"document_name": "Income Certificate", "description": "Family annual income certificate", "is_mandatory": True, "academic_year": "2025-2026", "source_text": "Income certificate"},
            {"document_name": "Admission Letter", "description": "Admission proof in notified institution", "is_mandatory": True, "academic_year": "2025-2026", "source_text": "Admission letter from notified institution"},
        ],
        "sources": [{
            "source_type": "dbt_tribal",
            "source_url": "https://dbttribal.gov.in/AllScheme.aspx",
            "gr_url": None,
            "source_title": "Top Class Education For ST Students",
            "verification_status": "verified",
        }],
    },
    {
        "scheme_code": "ARG45",
        "name": "National Fellowship for ST Students",
        "short_name": "National Fellowship ST",
        "department_code": "MOTA",
        "category_name": "Fellowship",
        "scheme_type": "Central Sector Scheme",
        "description": "National Fellowship for ST students pursuing M.Phil/Ph.D. in universities/institutions.",
        "overview": "Fellowship for ST students pursuing higher research studies (M.Phil/Ph.D.) in recognized universities.",
        "application_mode": "Online",
        "official_scheme_url": "https://dbttribal.gov.in/AllScheme.aspx",
        "official_application_url": "https://dbttribal.gov.in/",
        "gr_url": None,
        "academic_year": "2025-2026",
        "application_start_date": "2025-07-01",
        "application_end_date": "2025-12-31",
        "renewal_available": True,
        "status": "published",
        "verification_status": "verified",
        "source_url": "https://dbttribal.gov.in/AllScheme.aspx",
        "source_type": "dbt_tribal",
        "source_last_verified_at": "2025-01-15T00:00:00+00:00",
        "eligibility": {
            "category_requirement": "ST (Scheduled Tribe)",
            "residency_requirement": "As per scheme norms",
            "course_requirement": "M.Phil/Ph.D. in recognized universities",
            "institution_requirement": "Recognized universities/institutions",
            "max_income": None,
            "income_period": "annual",
            "other_conditions": "For M.Phil/Ph.D. students. NET/JRF qualified or as per UGC norms. No income ceiling for fellowship."
        },
        "benefits": [
            {
                "benefit_type": "fellowship",
                "description": "Monthly fellowship amount for research scholars",
                "amount": None,
                "amount_currency": "INR",
                "amount_period": "monthly",
                "coverage": "As per UGC norms for JRF/SRF",
            }
        ],
        "documents": [
            {"document_name": "Aadhaar Card", "description": "Identity proof", "is_mandatory": True, "academic_year": "2025-2026", "source_text": "Aadhaar card copy"},
            {"document_name": "Caste Certificate", "description": "ST category certificate", "is_mandatory": True, "academic_year": "2025-2026", "source_text": "ST caste certificate"},
            {"document_name": "Income Certificate", "description": "Family annual income certificate", "is_mandatory": True, "academic_year": "2025-2026", "source_text": "Income certificate (if applicable)"},
            {"document_name": "Admission Letter", "description": "Proof of admission in M.Phil/Ph.D.", "is_mandatory": True, "academic_year": "2025-2026", "source_text": "Admission letter from university"},
        ],
        "sources": [{
            "source_type": "dbt_tribal",
            "source_url": "https://dbttribal.gov.in/AllScheme.aspx",
            "gr_url": None,
            "source_title": "National Fellowship for ST Students",
            "verification_status": "verified",
        }],
    },
    {
        "scheme_code": "AZKMI",
        "name": "National Overseas Scholarship Scheme",
        "short_name": "Overseas Scholarship ST",
        "department_code": "MOTA",
        "category_name": "Fellowship",
        "scheme_type": "Central Sector Scheme",
        "description": "National Overseas Scholarship for ST students for higher studies abroad.",
        "overview": "Financial assistance for ST students selected for higher studies (Masters/Ph.D.) abroad in specified fields.",
        "application_mode": "Online",
        "official_scheme_url": "https://dbttribal.gov.in/AllScheme.aspx",
        "official_application_url": "https://dbttribal.gov.in/",
        "gr_url": None,
        "academic_year": "2025-2026",
        "application_start_date": "2025-07-01",
        "application_end_date": "2025-12-31",
        "renewal_available": True,
        "status": "published",
        "verification_status": "verified",
        "source_url": "https://dbttribal.gov.in/AllScheme.aspx",
        "source_type": "dbt_tribal",
        "source_last_verified_at": "2025-01-15T00:00:00+00:00",
        "eligibility": {
            "category_requirement": "ST (Scheduled Tribe)",
            "residency_requirement": "Indian national",
            "course_requirement": "Masters/Ph.D. in specified fields abroad",
            "institution_requirement": "Accredited foreign universities",
            "max_income": 800000,
            "income_period": "annual",
            "other_conditions": "For Masters/Ph.D. abroad in specified fields. Family income should not exceed Rs. 8,00,000. Age limit as per scheme guidelines."
        },
        "benefits": [
            {
                "benefit_type": "tuition_fee",
                "description": "Tuition fee as per actuals",
                "amount": None,
                "amount_currency": "INR",
                "amount_period": "annual",
                "coverage": "Actual tuition fee",
            },
            {
                "benefit_type": "maintenance_allowance",
                "description": "Monthly maintenance allowance",
                "amount": None,
                "amount_currency": "INR",
                "amount_period": "monthly",
                "coverage": "As per scheme norms",
            }
        ],
        "documents": [
            {"document_name": "Aadhaar Card", "description": "Identity proof", "is_mandatory": True, "academic_year": "2025-2026", "source_text": "Aadhaar card copy"},
            {"document_name": "Caste Certificate", "description": "ST category certificate", "is_mandatory": True, "academic_year": "2025-2026", "source_text": "ST caste certificate"},
            {"document_name": "Income Certificate", "description": "Family annual income certificate", "is_mandatory": True, "academic_year": "2025-2026", "source_text": "Income certificate"},
            {"document_name": "Admission Letter", "description": "Admission offer from foreign university", "is_mandatory": True, "academic_year": "2025-2026", "source_text": "Admission letter from accredited foreign university"},
        ],
        "sources": [{
            "source_type": "dbt_tribal",
            "source_url": "https://dbttribal.gov.in/AllScheme.aspx",
            "gr_url": None,
            "source_title": "National Overseas Scholarship Scheme",
            "verification_status": "verified",
        }],
    },
]


async def run_seed_import(
    supabase_url: str,
    supabase_service_key: str,
    dry_run: bool = False,
) -> dict:
    """Run the seed import with verified schemes."""
    from .importer import SchemeImporter
    importer = SchemeImporter(
        supabase_url=supabase_url,
        supabase_service_key=supabase_service_key,
        dry_run=dry_run,
    )
    
    return await importer.import_batch(SEED_SCHEMES)


async def run_dry_run(supabase_url: str, supabase_service_key: str) -> dict:
    """Run seed import in dry-run mode."""
    from .importer import SchemeImporter
    importer = SchemeImporter(
        supabase_url=supabase_url,
        supabase_service_key=supabase_service_key,
        dry_run=True,
    )
    return await SchemeImporter(supabase_url, supabase_service_key, dry_run=True).import_batch(SEED_SCHEMES)


if __name__ == "__main__":
    import os
    import sys
    from dotenv import load_dotenv
    
    load_dotenv()
    
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not supabase_url or not supabase_service_key:
        print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment")
        exit(1)
    
    import sys
    dry_run = "--dry-run" in sys.argv
    
    print(f"{'DRY RUN' if dry_run else 'LIVE IMPORT'}: Importing {len(SEED_SCHEMES)} seed schemes...")
    result = asyncio.run(run_seed_import(supabase_url, supabase_service_key, dry_run=dry_run))
    
    print(f"\nIMPORT REPORT")
    print(f"=============")
    print(f"Total: {result['stats']['total']}")
    print(f"New: {result['stats']['new']}")
    print(f"Updated: {result['stats']['updated']}")
    print(f"Unchanged: {result['stats']['unchanged']}")
    print(f"Errors: {result['stats']['errors']}")
    print(f"Warnings: {result['stats']['warnings']}")
    
    if result['stats']['errors'] > 0:
        print("\nERRORS:")
        for r in result['results']:
            if r.get('errors'):
                print(f"  {r['scheme_code']}: {r['errors']}")
    
    if dry_run:
        print("\nThis was a dry run. No changes were made to the database.")
        print("Run without --dry-run to perform actual import.")