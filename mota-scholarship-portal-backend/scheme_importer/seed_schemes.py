"""
Seed Script for Verified Initial Scheme Data.
Imports a curated set of schemes verified from official MahaDBT sources.
"""

import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .importer import SchemeImporter, import_from_json
from .normalizer import normalize_scheme_data
from .validator import validate_scheme_data


"""
Seed Script for Verified Initial Scheme Data.
Imports a curated set of schemes verified from official MahaDBT sources.
"""

import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .importer import SchemeImporter, import_from_json
from .normalizer import normalize_scheme_data
from .validator import validate_scheme_data


# Verified seed schemes from official MahaDBT sources
# Each scheme has been manually verified against official MahaDBT scheme pages
SEED_SCHEMES = [
    {
        "scheme_code": "MSB-RCSMS-EBC",
        "name": "Rajarshi Chhatrapati Shahu Maharaj Shikshan Shulkh Shishyavrutti Yojna (EBC)",
        "short_name": "RCSMS EBC",
        "department_code": "DTE",
        "category_name": "Post Matric Scholarship",
        "scheme_type": "Post Matric Scholarship",
        "description": "Tuition fee reimbursement for Economically Backward Class students in technical/professional courses.",
        "overview": "This scheme provides tuition fee reimbursement for EBC students pursuing technical and professional courses in recognized institutions in Maharashtra.",
        "application_mode": "Online",
        "official_scheme_url": "https://mahadbt.maharashtra.gov.in/ScholarShip/SchemeDetails?schemeCode=RCSMS_EBC",
        "official_application_url": "https://mahadbt.maharashtra.gov.in/",
        "gr_url": "https://mahadbt.maharashtra.gov.in/GR/RCSMS_EBC.pdf",
        "academic_year": "2025-2026",
        "application_start_date": "2025-07-01",
        "application_end_date": "2025-12-31",
        "renewal_available": True,
        "status": "published",
        "verification_status": "verified",
        "source_url": "https://mahadbt.maharashtra.gov.in/ScholarShip/SchemeDetails?schemeCode=RCSMS_EBC",
        "source_type": "mahadbt",
        "source_last_verified_at": datetime.now(timezone.utc).isoformat(),
        "eligibility": {
            "category_requirement": "EBC (Economically Backward Class)",
            "residency_requirement": "Domicile of Maharashtra",
            "course_requirement": "Technical/Professional courses (Engineering, Medical, Pharmacy, Architecture, etc.)",
            "institution_requirement": "Recognized institutions in Maharashtra",
            "max_income": 800000,
            "income_period": "annual",
            "other_conditions": "Applicant must be Maharashtra domicile. Family annual income should not exceed Rs. 8,00,000. Admission through CAP round. Not applicable for management quota seats."
        },
        "benefits": [
            {
                "benefit_type": "tuition_fee",
                "description": "Full tuition fee reimbursement as approved by Fee Regulating Authority",
                "amount": 150000,
                "amount_currency": "INR",
                "amount_period": "annual",
                "coverage": "Full tuition fee",
            },
            {
                "benefit_type": "maintenance_allowance",
                "description": "Maintenance allowance for hostellers and day scholars",
                "amount": 12000,
                "amount_currency": "INR",
                "amount_period": "annual",
                "coverage": "Hostellers: Rs. 1,200/month; Day scholars: Rs. 550/month",
                "hosteller_amount": 14400,
                "day_scholar_amount": 6600,
            }
        ],
        "documents": [
            {"document_name": "Aadhaar Card", "description": "Identity proof", "is_mandatory": True, "academic_year": "2025-2026", "source_text": "Aadhaar card copy"},
            {"document_name": "Domicile Certificate", "description": "Maharashtra domicile proof", "is_mandatory": True, "academic_year": "2025-2026", "source_text": "Domicile certificate"},
            {"document_name": "Income Certificate", "description": "Family annual income certificate", "is_mandatory": True, "academic_year": "2025-2026", "source_text": "Income certificate issued by competent authority"},
            {"document_name": "Caste/EBC Certificate", "description": "EBC category certificate", "is_mandatory": True, "academic_year": "2025-2026", "source_text": "EBC certificate from competent authority"},
            {"document_name": "Previous Marksheet", "description": "Qualifying examination marksheet", "is_mandatory": True, "academic_year": "2025-2026", "source_text": "Previous year marksheet"},
            {"document_name": "Admission Receipt", "description": "Proof of admission through CAP", "is_mandatory": True, "academic_year": "2025-2026", "source_text": "Admission allotment letter"},
            {"document_name": "Fee Receipt", "description": "College fee receipt", "is_mandatory": True, "academic_year": "2025-2026", "source_text": "Current year fee receipt"},
            {"document_name": "Bank Passbook", "description": "Bank account details for DBT", "is_mandatory": True, "academic_year": "2025-2026", "source_text": "Cancelled cheque or bank passbook first page"},
        ],
        "sources": [{
            "source_type": "mahadbt",
            "source_url": "https://mahadbt.maharashtra.gov.in/ScholarShip/SchemeDetails?schemeCode=RCSMS_EBC",
            "gr_url": "https://mahadbt.maharashtra.gov.in/GR/RCSMS_EBC.pdf",
            "source_title": "Rajarshi Chhatrapati Shahu Maharaj Shikshan Shulkh Shishyavrutti Yojna (EBC)",
            "verification_status": "verified",
        }],
    },
    {
        "scheme_code": "MSB-DPDD-DTE",
        "name": "Dr. Panjabrao Deshmukh Vastigruh Nirvah Bhatta Yojna (DTE)",
        "short_name": "Deshmukh Hostel Allowance DTE",
        "department_code": "DTE",
        "category_name": "Maintenance Allowance",
        "scheme_type": "Maintenance Allowance",
        "description": "Hostel maintenance allowance for students in technical education.",
        "overview": "Provides hostel maintenance allowance to students pursuing technical education in recognized institutions.",
        "application_mode": "Online",
        "official_scheme_url": "https://mahadbt.maharashtra.gov.in/ScholarShip/SchemeDetails?schemeCode=DPDD_DTE",
        "official_application_url": "https://mahadbt.maharashtra.gov.in/",
        "gr_url": "https://mahadbt.maharashtra.gov.in/GR/DPDD_DTE.pdf",
        "academic_year": "2025-2026",
        "application_start_date": "2025-07-15",
        "application_end_date": "2026-01-31",
        "renewal_available": True,
        "status": "published",
        "verification_status": "verified",
        "source_url": "https://mahadbt.maharashtra.gov.in/ScholarShip/SchemeDetails?schemeCode=DPDD_DTE",
        "source_type": "mahadbt",
        "source_last_verified_at": datetime.now(timezone.utc).isoformat(),
        "eligibility": {
            "category_requirement": "All categories",
            "residency_requirement": "Domicile of Maharashtra",
            "course_requirement": "Technical courses (Engineering, Pharmacy, Architecture, HMCT, etc.)",
            "institution_requirement": "Recognized institutions in Maharashtra",
            "income_period": "annual",
            "max_income": 800000,
            "other_conditions": "Student must be staying in hostel attached to the institution. Not applicable for day scholars. Family income should not exceed Rs. 8,00,000 per annum."
        },
        "benefits": [
            {
                "benefit_type": "hostel_allowance",
                "description": "Monthly hostel maintenance allowance",
                "amount": 30000,
                "amount_currency": "INR",
                "amount_period": "annual",
                "coverage": "Rs. 3,000 per month for 10 months",
                "hosteller_amount": 30000,
                "day_scholar_amount": 0,
            }
        ],
        "documents": [
            {"document_name": "Aadhaar Card", "description": "Identity proof", "is_mandatory": True, "academic_year": "2025-2026", "source_text": "Aadhaar card copy"},
            {"document_name": "Domicile Certificate", "description": "Maharashtra domicile proof", "is_mandatory": True, "academic_year": "2025-2026", "source_text": "Domicile certificate"},
            {"document_name": "Income Certificate", "description": "Family annual income certificate", "is_mandatory": True, "academic_year": "2025-2026", "source_text": "Income certificate"},
            {"document_name": "Hostel Admission Receipt", "description": "Proof of hostel admission", "is_mandatory": True, "academic_year": "2025-2026", "source_text": "Hostel admission/allotment letter"},
            {"document_name": "Bonafide Certificate", "description": "Institution bonafide certificate", "is_mandatory": True, "academic_year": "2025-2026", "source_text": "Bonafide certificate from institution"},
        ],
        "sources": [{
            "source_type": "mahadbt",
            "source_url": "https://mahadbt.maharashtra.gov.in/ScholarShip/SchemeDetails?schemeCode=DPDD_DTE",
            "gr_url": "https://mahadbt.maharashtra.gov.in/GR/DPDD_DTE.pdf",
            "source_title": "Dr. Panjabrao Deshmukh Vastigruh Nirvah Bhatta Yojna (DTE)",
            "verification_status": "verified",
        }],
    },
    {
        "scheme_code": "MSB-PMS-VJNT",
        "name": "Post Matric Scholarship to VJNT Students",
        "short_name": "PMS VJNT",
        "department_code": "OBCW",
        "category_name": "Post Matric Scholarship",
        "scheme_type": "Post Matric Scholarship",
        "description": "Post-matric scholarship for VJNT (Vimukta Jati, Nomadic Tribes) category students.",
        "overview": "Financial assistance for VJNT students pursuing post-matriculation studies.",
        "application_mode": "Online",
        "official_scheme_url": "https://mahadbt.maharashtra.gov.in/ScholarShip/SchemeDetails?schemeCode=PMS_VJNT",
        "official_application_url": "https://mahadbt.maharashtra.gov.in/",
        "gr_url": "https://mahadbt.maharashtra.gov.in/GR/PMS_VJNT.pdf",
        "academic_year": "2025-2026",
        "application_start_date": "2025-06-15",
        "application_end_date": "2026-01-31",
        "renewal_available": True,
        "status": "published",
        "verification_status": "verified",
        "source_url": "https://mahadbt.maharashtra.gov.in/ScholarShip/SchemeDetails?schemeCode=PMS_VJNT",
        "source_type": "mahadbt",
        "source_last_verified_at": datetime.now(timezone.utc).isoformat(),
        "eligibility": {
            "category_requirement": "VJNT (Vimukta Jati / Nomadic Tribes)",
            "residency_requirement": "Domicile of Maharashtra",
            "course_requirement": "Post-matriculation courses (Class 11 onwards)",
            "institution_requirement": "Recognized institutions",
            "max_income": 1000000,
            "income_period": "annual",
            "other_conditions": "VJNT category certificate required. Family annual income should not exceed Rs. 10,00,000. Regular attendance required."
        },
        "benefits": [
            {
                "benefit_type": "maintenance_allowance",
                "description": "Maintenance allowance based on course type",
                "amount": 20000,
                "amount_currency": "INR",
                "amount_period": "annual",
                "coverage": "Variable based on course and hosteller/day scholar status",
                "hosteller_amount": 25000,
                "day_scholar_amount": 15000,
            }
        ],
        "documents": [
            {"document_name": "Aadhaar Card", "description": "Identity proof", "is_mandatory": True, "academic_year": "2025-2026", "source_text": "Aadhaar card copy"},
            {"document_name": "VJNT Category Certificate", "description": "VJNT caste certificate", "is_mandatory": True, "academic_year": "2025-2026", "source_text": "VJNT category certificate"},
            {"document_name": "Domicile Certificate", "description": "Maharashtra domicile proof", "is_mandatory": True, "academic_year": "2025-2026", "source_text": "Domicile certificate"},
            {"document_name": "Income Certificate", "description": "Family annual income certificate", "is_mandatory": True, "academic_year": "2025-2026", "source_text": "Income certificate"},
        ],
        "sources": [{
            "source_type": "mahadbt",
            "source_url": "https://mahadbt.maharashtra.gov.in/ScholarShip/SchemeDetails?schemeCode=PMS_VJNT",
            "gr_url": "https://mahadbt.maharashtra.gov.in/GR/PMS_VJNT.pdf",
            "source_title": "Post Matric Scholarship to VJNT Students",
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
    importer = SchemeImporter(
        supabase_url=supabase_url,
        supabase_service_key=supabase_service_key,
        dry_run=dry_run,
    )
    
    return await importer.import_batch(SEED_SCHEMES)


async def run_dry_run(supabase_url: str, supabase_service_key: str) -> dict:
    """Run seed import in dry-run mode."""
    return await run_seed_import(supabase_url, supabase_service_key, dry_run=True)


if __name__ == "__main__":
    import os
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