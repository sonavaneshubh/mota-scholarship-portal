"""
Validator for scheme data.
Validates every imported scheme before database insertion.
"""

import re
from datetime import datetime
from typing import Any, Optional
from urllib.parse import urlparse

from pydantic import BaseModel, Field, field_validator, model_validator


class ValidationResult(BaseModel):
    """Result of scheme validation."""
    valid: bool
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    scheme_code: Optional[str] = None


class SchemeEligibilityValidator(BaseModel):
    """Validate eligibility fields."""
    category_requirement: Optional[str] = None
    religion_requirement: Optional[str] = None
    gender_requirement: Optional[str] = None
    disability_requirement: Optional[str] = None
    min_age: Optional[int] = None
    max_age: Optional[int] = None
    min_percentage: Optional[float] = None
    max_income: Optional[float] = None
    income_period: Optional[str] = None
    residency_requirement: Optional[str] = None
    qualification_requirement: Optional[str] = None
    course_requirement: Optional[str] = None
    institution_requirement: Optional[str] = None
    attendance_requirement: Optional[str] = None
    admission_requirement: Optional[str] = None
    cap_requirement: Optional[str] = None
    gap_requirement: Optional[str] = None
    other_conditions: Optional[str] = None

    @field_validator("min_age", "max_age")
    @classmethod
    def validate_age(cls, v):
        if v is not None and (v < 0 or v > 100):
            raise ValueError(f"Invalid age: {v}")
        return v

    @field_validator("min_percentage")
    @classmethod
    def validate_percentage(cls, v):
        if v is not None and (v < 0 or v > 100):
            raise ValueError(f"Invalid percentage: {v}")
        return v

    @field_validator("max_income")
    @classmethod
    def validate_income(cls, v):
        if v is not None and v < 0:
            raise ValueError(f"Negative income: {v}")
        return v


class SchemeBenefitValidator(BaseModel):
    """Validate benefit fields."""
    benefit_type: str
    description: Optional[str] = None
    amount: Optional[float] = None
    amount_currency: str = "INR"
    amount_period: Optional[str] = None
    coverage: Optional[str] = None
    hosteller_amount: Optional[float] = None
    day_scholar_amount: Optional[float] = None
    conditions: Optional[str] = None

    @field_validator("amount", "hosteller_amount", "day_scholar_amount")
    @classmethod
    def validate_amount(cls, v):
        if v is not None and v < 0:
            raise ValueError(f"Negative amount: {v}")
        return v


class SchemeDocumentValidator(BaseModel):
    """Validate document fields."""
    document_name: str
    description: Optional[str] = None
    is_mandatory: bool = True
    applicant_type: Optional[str] = None
    academic_year: Optional[str] = None
    source_text: Optional[str] = None


class SchemeSourceValidator(BaseModel):
    """Validate source tracking fields."""
    source_type: str
    source_url: str
    gr_url: Optional[str] = None
    source_title: Optional[str] = None
    verification_status: str = "pending_review"
    notes: Optional[str] = None

    @field_validator("source_url", "gr_url")
    @classmethod
    def validate_url(cls, v):
        if v:
            parsed = urlparse(v)
            if not parsed.scheme or not parsed.netloc:
                raise ValueError(f"Invalid URL: {v}")
        return v

    @field_validator("verification_status")
    @classmethod
    def validate_verification_status(cls, v):
        allowed = ["pending_review", "verified", "rejected"]
        if v not in allowed:
            raise ValueError(f"Invalid verification_status: {v}. Must be one of {allowed}")
        return v


class SchemeNormalizedValidator(BaseModel):
    """Complete validated scheme data."""
    scheme_code: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=255)
    short_name: Optional[str] = Field(None, max_length=100)
    department_code: Optional[str] = None
    category_name: Optional[str] = None
    scheme_type: Optional[str] = None
    description: Optional[str] = None
    overview: Optional[str] = None
    application_mode: Optional[str] = None
    official_scheme_url: Optional[str] = None
    official_application_url: Optional[str] = None
    gr_url: Optional[str] = None
    academic_year: str = Field(..., pattern=r"^\d{4}-\d{4}$")
    application_start_date: Optional[str] = None
    application_end_date: Optional[str] = None
    renewal_available: Optional[bool] = None
    status: str = "draft"
    verification_status: str = "pending_review"
    source_url: str
    source_type: str
    source_last_verified_at: datetime
    eligibility: Optional[SchemeEligibilityValidator] = None
    benefits: list[SchemeBenefitValidator] = Field(default_factory=list)
    documents: list[SchemeDocumentValidator] = Field(default_factory=list)
    sources: list[SchemeSourceValidator] = Field(default_factory=list)

    @field_validator("scheme_code")
    @classmethod
    def validate_scheme_code(cls, v):
        if not re.match(r"^[A-Z0-9\-_]+$", v):
            raise ValueError("scheme_code must be uppercase alphanumeric with hyphens/underscores")
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v):
        allowed = ["draft", "review", "published", "inactive"]
        if v not in allowed:
            raise ValueError(f"Invalid status: {v}. Must be one of {allowed}")
        return v

    @field_validator("verification_status")
    @classmethod
    def validate_verification_status(cls, v):
        allowed = ["pending_review", "verified", "rejected"]
        if v not in allowed:
            raise ValueError(f"Invalid verification_status: {v}. Must be one of {allowed}")
        return v

    @field_validator("official_scheme_url", "official_application_url", "gr_url")
    @classmethod
    def validate_optional_url(cls, v):
        if v:
            parsed = urlparse(v)
            if not parsed.scheme or not parsed.netloc:
                raise ValueError(f"Invalid URL: {v}")
        return v

    @model_validator(mode="after")
    def validate_dates(self):
        if self.application_start_date and self.application_end_date:
            try:
                start = datetime.strptime(self.application_start_date, "%Y-%m-%d")
                end = datetime.strptime(self.application_end_date, "%Y-%m-%d")
                if end < start:
                    raise ValueError("End date must be on or after start date")
            except ValueError as e:
                if "End date" not in str(e):
                    raise ValueError(f"Invalid date format: {e}")
        return self


def validate_scheme_data(data: dict) -> ValidationResult:
    """
    Validate scheme data before database insertion.
    Returns ValidationResult with valid flag, errors, and warnings.
    """
    errors = []
    warnings = []
    scheme_code = data.get("scheme_code", "UNKNOWN")
    
    # Required fields
    required_fields = ["name", "academic_year", "source_url"]
    for field in required_fields:
        if not data.get(field):
            errors.append(f"Missing required field: {field}")
    
    # Validate with Pydantic
    try:
        validated = SchemeNormalizedValidator(**data)
        scheme_code = validated.scheme_code
    except Exception as e:
        errors.append(f"Validation failed: {e}")
    
    # Additional business logic warnings
    if not data.get("department_code"):
        warnings.append("Missing department_code - admin review required")
    
    if not data.get("category_name"):
        warnings.append("Missing category_name - admin review required")
    
    if not data.get("benefits") or len(data.get("benefits", [])) == 0:
        warnings.append("No benefits specified")
    
    if not data.get("documents") or len(data.get("documents", [])) == 0:
        warnings.append("No documents specified")
    
    if not data.get("eligibility") or not data["eligibility"].get("max_income"):
        warnings.append("Income limit not specified")
    
    if not data.get("official_scheme_url") and not data.get("official_application_url"):
        warnings.append("No official application URL provided")
    
    if not data.get("gr_url"):
        warnings.append("No Government Resolution URL provided")
    
    # Suspicious value detection
    if data.get("benefits"):
        for benefit in data["benefits"]:
            if benefit.get("amount") and benefit["amount"] > 10000000:  # 1 crore
                warnings.append(f"Unusually high benefit amount: {benefit['amount']}")
    
    if data.get("eligibility", {}).get("max_income"):
        income = data["eligibility"]["max_income"]
        if income > 5000000:  # 50 lakh
            warnings.append(f"Unusually high income limit: {income}")
        if income < 10000:  # 10 thousand
            warnings.append(f"Unusually low income limit: {income}")
    
    return ValidationResult(
        valid=len(errors) == 0,
        errors=errors,
        warnings=warnings,
        scheme_code=scheme_code if len(errors) == 0 else None,
    )


def validate_import_batch(schemes: list[dict]) -> dict:
    """
    Validate a batch of schemes.
    Returns summary with counts and details.
    """
    results = {
        "total": len(schemes),
        "valid": 0,
        "invalid": 0,
        "warnings": 0,
        "scheme_results": [],
    }
    
    for scheme in schemes:
        result = validate_scheme_data(scheme)
        results["scheme_results"].append({
            "scheme_code": result.scheme_code,
            "valid": result.valid,
            "errors": result.errors,
            "warnings": result.warnings,
        })
        
        if result.valid:
            results["valid"] += 1
        else:
            results["invalid"] += 1
        
        if result.warnings:
            results["warnings"] += 1
    
    return results