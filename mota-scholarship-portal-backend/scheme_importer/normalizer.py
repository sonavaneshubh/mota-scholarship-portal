"""
Normalizer for scheme data.
Converts parsed/extracted data into standardized format for database insertion.
"""

import re
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urlparse

from .validator import validate_scheme_data


# Academic year patterns
ACADEMIC_YEAR_PATTERNS = [
    r"(\d{4})\s*[-–]\s*(\d{2,4})",
    r"(\d{4})\s*[-–]\s*(\d{4})",
    r"AY\s*(\d{4})\s*[-–]\s*(\d{2,4})",
    r"Academic\s+Year\s+(\d{4})\s*[-–]\s*(\d{2,4})",
    r"(\d{4})\s*[-–]\s*(\d{4})",
]


# Department mapping (from page content to standardized codes)
DEPARTMENT_MAPPING = {
    "social justice": "SJSA",
    "tribal development": "TDD",
    "higher education": "DHE",
    "technical education": "DTE",
    "school education": "DSE",
    "obc": "OBCW",
    "sebc": "OBCW",
    "vjnt": "OBCW",
    "sbc": "OBCW",
    "tribal affairs": "MOTA",
    "mahatma phule": "MPKV",
    "krishi vidyapeeth": "MPKV",
    "directorate of art": "DOA",
    "medical education": "DMER",
    "dmer": "DMER",
}


# Category mapping
CATEGORY_MAPPING = {
    "post matric": "Post Matric Scholarship",
    "post-matric": "Post Matric Scholarship",
    "pre matric": "Pre Matric Scholarship",
    "pre-matric": "Pre Matric Scholarship",
    "freeship": "Freeship",
    "merit": "Merit Scholarship",
    "maintenance": "Maintenance Allowance",
    "disability": "Disability Scholarship",
    "tribal": "Tribal Scholarship",
    "fellowship": "Fellowship",
    "overseas": "Overseas Study Support",
    "research": "Fellowship",
    "grant": "Fellowship",
}


def normalize_whitespace(text: str) -> str:
    """Normalize whitespace in text."""
    if not text:
        return ""
    return re.sub(r"\s+", " ", text).strip()


def normalize_academic_year(text: str) -> Optional[str]:
    """Extract and normalize academic year from text."""
    if not text:
        return None
    
    for pattern in ACADEMIC_YEAR_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            start = match.group(1)
            end = match.group(2)
            
            # Normalize end year to 4 digits
            if len(end) == 2:
                end = "20" + end if int(end) < 50 else "19" + end
            
            return f"{start}-{end}"
    
    # Try to find just a year
    year_match = re.search(r"\b(20\d{2})\b", text)
    if year_match:
        year = int(year_match.group(1))
        return f"{year}-{year+1}"
    
    return None


def normalize_amount(text: str) -> tuple[Optional[float], Optional[str]]:
    """Normalize amount string to float."""
    if not text:
        return None, None
    
    # Remove currency symbols and commas
    cleaned = re.sub(r"[₹$,Rs\.INR\s]", "", text, flags=re.IGNORECASE)
    cleaned = cleaned.replace(",", "").strip()
    
    try:
        return float(cleaned), "INR"
    except ValueError:
        pass
    
    return None, None


def normalize_percentage(text: str) -> Optional[float]:
    """Normalize percentage string to float."""
    if not text:
        return None
    
    match = re.search(r"(\d+(?:\.\d+)?)\s*%", text)
    if match:
        try:
            return float(match.group(1))
        except ValueError:
            pass
    
    return None


def normalize_date(text: str) -> Optional[str]:
    """Normalize date string to YYYY-MM-DD format."""
    if not text:
        return None
    
    # Try multiple formats
    formats = [
        "%d-%m-%Y",
        "%d/%m/%Y",
        "%d %b %Y",
        "%d %B %Y",
        "%Y-%m-%d",
        "%d-%b-%Y",
        "%b %d, %Y",
        "%B %d, %Y",
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(text.strip(), fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    
    return None


def normalize_department(text: str) -> Optional[str]:
    """Normalize department name to standard code."""
    if not text:
        return None
    
    text_lower = text.lower()
    for keyword, code in DEPARTMENT_MAPPING.items():
        if keyword in text_lower:
            return code
    
    return None


def normalize_category(text: str) -> Optional[str]:
    """Normalize category name to standard category."""
    if not text:
        return None
    
    text_lower = text.lower()
    for keyword, category in CATEGORY_MAPPING.items():
        if keyword in text_lower:
            return category
    
    return None


def normalize_boolean(text: str) -> Optional[bool]:
    """Normalize text to boolean."""
    if not text:
        return None
    
    text_lower = text.lower().strip()
    if text_lower in ["yes", "true", "y", "1", "available", "applicable", "provided"]:
        return True
    if text_lower in ["no", "false", "n", "0", "not available", "not applicable", "not provided"]:
        return False
    
    return None


def deduplicate_documents(documents: list[dict]) -> list[dict]:
    """Remove duplicate documents based on name."""
    seen = set()
    unique = []
    
    for doc in documents:
        name = doc.get("document_name", "").lower().strip()
        if name and name not in seen:
            seen.add(name)
            unique.append(doc)
    
    return unique


def deduplicate_benefits(benefits: list[dict]) -> list[dict]:
    """Remove duplicate benefits based on type and description."""
    seen = set()
    unique = []
    
    for benefit in benefits:
        key = (benefit.get("benefit_type", "").lower(), benefit.get("description", "").lower()[:50])
        if key not in seen:
            seen.add(key)
            unique.append(benefit)
    
    return unique


def normalize_scheme_data(parsed: dict) -> dict:
    """
    Normalize parsed scheme data into standardized format for database.
    """
    extracted = parsed.get("extracted", {})
    raw_sections = parsed.get("raw_sections", {})
    
    # Basic info
    scheme_code = parsed.get("source_url", "").split("/")[-1].split("?")[0]
    if not scheme_code or scheme_code in ["", "FindEligibleSchemes"]:
        scheme_code = f"scheme-{hash(parsed.get('source_url', '')) % 1000000}"
    
    name = extracted.get("heading") or extracted.get("page_title") or "Unknown Scheme"
    name = normalize_whitespace(name)
    
    # Academic year
    academic_year = None
    # First check if academic_year is already provided in extracted data with correct format
    if "academic_year" in extracted and extracted["academic_year"]:
        ay = extracted["academic_year"]
        if re.match(r"^\d{4}-\d{4}$", ay):
            academic_year = ay
    
    if not academic_year:
        for key in ["overview", "eligibility_raw", "benefits_raw", "application_raw"]:
            if key in extracted:
                ay = normalize_academic_year(extracted[key])
                if ay:
                    academic_year = ay
                    break
    
    if not academic_year:
        academic_year = "2025-2026"  # Default
    
    # Department
    department_code = None
    dept_text = extracted.get("overview", "") + " " + str(raw_sections.get("overview", ""))
    department_code = normalize_department(dept_text)
    
    # Category
    category_name = None
    cat_text = " ".join([
        extracted.get("overview", ""),
        extracted.get("eligibility_raw", ""),
        name,
    ])
    category_name = normalize_category(cat_text)
    
    # Scheme type
    scheme_type = category_name or "Scholarship"
    
    # Description
    description = raw_sections.get("overview", "")[:1000] if "overview" in raw_sections else None
    overview = raw_sections.get("overview", "")[:3000] if "overview" in raw_sections else None
    
    # Eligibility
    eligibility = {}
    if "eligibility_raw" in extracted:
        elig_text = extracted["eligibility_raw"]
        
        # Category requirement
        if re.search(r"\b(sc|st|obc|sebc|vjnt|sbc|scheduled\s+tribe|scheduled\s+caste)\b", elig_text, re.IGNORECASE):
            eligibility["category_requirement"] = "As per scheme guidelines"
        
        # Income
        income = extract_income_limit(elig_text) if 'extract_income_limit' in globals() else None
        if income:
            eligibility["max_income"] = income
            eligibility["income_period"] = "annual"
        
        # Age
        min_age, max_age = extract_age_range(elig_text) if 'extract_age_range' in globals() else (None, None)
        if min_age:
            eligibility["min_age"] = min_age
        if max_age:
            eligibility["max_age"] = max_age
        
        # Percentage
        pct = normalize_percentage(elig_text)
        if pct:
            eligibility["min_percentage"] = pct
        
        # Store raw
        eligibility["other_conditions"] = elig_text[:5000]
    
    # Benefits
    benefits = []
    if "benefits_raw" in extracted:
        benefits_text = extracted["benefits_raw"]
        amount, currency = extract_amount(benefits_text) if 'extract_amount' in globals() else (None, None)
        
        benefits.append({
            "benefit_type": "maintenance_allowance",
            "description": benefits_text[:1000],
            "amount": amount,
            "amount_currency": currency or "INR",
            "amount_period": "annual",
        })
    
    # Documents
    documents = []
    if "documents_raw" in extracted:
        docs_text = extracted["documents_raw"]
        # Try to extract document names from bullet points
        for line in docs_text.split("\n"):
            line = line.strip("•-* \t")
            if line and len(line) > 3:
                documents.append({
                    "document_name": line[:100],
                    "description": line,
                    "is_mandatory": True,
                    "academic_year": academic_year,
                    "source_text": docs_text[:2000],
                })
    
    # Application info
    application = {}
    if "application_raw" in extracted:
        application["mode"] = extracted["application_raw"][:500]
    if "application_links" in extracted:
        application["official_url"] = extracted["application_links"][0]["url"]
    
    # GR URL
    gr_url = None
    if "gr_links" in extracted and extracted["gr_links"]:
        gr_url = extracted["gr_links"][0]["url"]
    elif "gr_raw" in extracted:
        gr_url = extracted.get("gr_raw", "")[:200]
    
    # Source info
    source_url = parsed.get("source_url", "")
    source_type = "mahadbt" if "mahadbt" in source_url else "government"
    
    return {
        "scheme_code": scheme_code.upper(),
        "name": name,
        "short_name": None,
        "department_code": department_code,
        "category_name": category_name,
        "scheme_type": scheme_type,
        "description": description,
        "overview": overview,
        "application_mode": application.get("mode"),
        "official_scheme_url": application.get("official_url"),
        "official_application_url": application.get("official_url"),
        "gr_url": gr_url,
        "academic_year": academic_year,
        "application_start_date": None,
        "application_end_date": None,
        "renewal_available": normalize_boolean(extracted.get("renewal_raw", "")),
        "status": "draft",
        "verification_status": "pending_review",
        "source_url": source_url,
        "source_type": source_type,
        "source_last_verified_at": datetime.now(timezone.utc).isoformat(),
        "eligibility": eligibility,
        "benefits": benefits,
        "documents": deduplicate_documents(documents),
        "sources": [{
            "source_type": source_type,
            "source_url": source_url,
            "gr_url": gr_url,
            "source_title": name,
            "verification_status": "pending_review",
        }],
    }


# Re-import for use in normalizer
from .parser import extract_income_limit, extract_age_range, extract_amount