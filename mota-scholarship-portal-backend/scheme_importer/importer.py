"""
Idempotent Importer for Scheme Data.
Imports normalized, validated scheme data into Supabase database.
"""

import asyncio
import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Optional

from supabase import create_client, Client

from .maha_dbt_source import MahaDBTSource, ManualJSONSource
from .normalizer import normalize_scheme_data
from .parser import parse_scheme_page
from .validator import validate_scheme_data, ValidationResult


class SchemeImporter:
    """Idempotent scheme importer for Supabase."""
    
    def __init__(
        self,
        supabase_url: str,
        supabase_service_key: str,
        dry_run: bool = False,
    ):
        self.dry_run = dry_run
        self.supabase: Client = create_client(supabase_url, supabase_service_key)
        self.stats = {
            "total": 0,
            "new": 0,
            "updated": 0,
            "unchanged": 0,
            "errors": 0,
            "warnings": 0,
        }
        self.results = []
    
    def _generate_content_hash(self, data: dict) -> str:
        """Generate hash of normalized data for change detection."""
        # Exclude fields that change on every import
        filtered = {k: v for k, v in data.items() 
                   if k not in ["source_last_verified_at", "created_at", "updated_at"]}
        content = json.dumps(filtered, sort_keys=True, default=str)
        return hashlib.sha256(content.encode()).hexdigest()[:16]
    
    async def _get_department_id(self, code: Optional[str]) -> Optional[str]:
        """Get department UUID by code."""
        if not code:
            return None
        
        response = self.supabase.table("departments").select("id").eq("code", code).execute()
        if response.data:
            return response.data[0]["id"]
        return None
    
    async def _get_category_id(self, name: Optional[str]) -> Optional[str]:
        """Get category UUID by name."""
        if not name:
            return None
        
        response = self.supabase.table("scheme_categories").select("id").eq("name", name).execute()
        if response.data:
            return response.data[0]["id"]
        return None
    
    async def _get_existing_scheme(self, scheme_code: str) -> Optional[dict]:
        """Get existing scheme by scheme_code."""
        response = self.supabase.table("schemes").select("*").eq("scheme_code", scheme_code).execute()
        if response.data:
            return response.data[0]
        return None
    
    async def _create_scheme_version(self, scheme_id: str, data: dict, academic_year: str, source_url: str, verified_by: Optional[str] = None):
        """Create a version snapshot of the scheme."""
        # Prepare snapshot data
        snapshot_data = {
            "scheme_code": data.get("scheme_code"),
            "name": data.get("name"),
            "short_name": data.get("short_name"),
            "department_code": data.get("department_code"),
            "category_name": data.get("category_name"),
            "scheme_type": data.get("scheme_type"),
            "description": data.get("description"),
            "overview": data.get("overview"),
            "application_mode": data.get("application_mode"),
            "official_scheme_url": data.get("official_scheme_url"),
            "official_application_url": data.get("official_application_url"),
            "gr_url": data.get("gr_url"),
            "academic_year": data.get("academic_year"),
            "application_start_date": data.get("application_start_date"),
            "application_end_date": data.get("application_end_date"),
            "renewal_available": data.get("renewal_available"),
            "status": data.get("status"),
            "verification_status": data.get("verification_status"),
            "source_url": data.get("source_url"),
            "source_type": data.get("source_type"),
            "source_last_verified_at": data.get("source_last_verified_at"),
            "eligibility": data.get("eligibility"),
            "benefits": data.get("benefits"),
            "documents": data.get("documents"),
            "sources": data.get("sources"),
        }
        
        if not self.dry_run:
            self.supabase.table("scheme_versions").upsert({
                "scheme_id": scheme_id,
                "academic_year": academic_year,
                "version_number": 1,
                "snapshot": snapshot_data,
            }, on_conflict="scheme_id,version_number").execute()
    
    async def import_scheme(self, normalized_data: dict, validation: ValidationResult, verified_by: Optional[str] = None) -> dict:
        """Import a single scheme (upsert)."""
        scheme_code = normalized_data["scheme_code"]
        academic_year = normalized_data["academic_year"]
        source_url = normalized_data["source_url"]
        
        result = {
            "scheme_code": scheme_code,
            "academic_year": academic_year,
            "action": "skipped",
            "changes": [],
        }
        
        if not validation.valid:
            result["action"] = "validation_failed"
            result["errors"] = validation.errors
            self.stats["errors"] += 1
            return result
        
        # Check warnings
        if validation.warnings:
            result["warnings"] = validation.warnings
            self.stats["warnings"] += 1
        
        # Resolve foreign keys
        department_id = await self._get_department_id(normalized_data.get("department_code"))
        category_id = await self._get_category_id(normalized_data.get("category_name"))
        
        if not department_id:
            result["warnings"] = result.get("warnings", []) + ["Department not found, using NULL"]
        
        if not category_id:
            result["warnings"] = result.get("warnings", []) + ["Category not found, using NULL"]
        
        # Prepare scheme data for DB - only include columns that exist in the database
        scheme_data = {
            "scheme_code": normalized_data["scheme_code"],
            "name": normalized_data["name"],
            "short_name": normalized_data.get("short_name"),
            "department_id": department_id,
            "category_id": category_id,
            "description": normalized_data.get("description"),
            "academic_year": normalized_data["academic_year"],
            "application_start_date": normalized_data.get("application_start_date"),
            "application_end_date": normalized_data.get("application_end_date"),
            "status": normalized_data.get("status", "draft"),
            "verification_status": normalized_data.get("verification_status", "pending_review"),
        }
        
        if self.dry_run:
            existing = await self._get_existing_scheme(scheme_code)
            if existing:
                # Check if data changed
                content_hash = hashlib.sha256(json.dumps(scheme_data, sort_keys=True, default=str).encode()).hexdigest()[:16]
                existing_hash = hashlib.sha256(json.dumps({
                    k: v for k, v in existing.items() 
                    if k not in ["id", "created_at", "updated_at", "verified_by", "source_last_verified_at"]
                }, sort_keys=True, default=str).encode()).hexdigest()[:16]
                
                if content_hash == existing_hash:
                    result["action"] = "unchanged"
                    self.stats["unchanged"] += 1
                else:
                    result["action"] = "would_update"
                    self.stats["updated"] += 1
            else:
                result["action"] = "would_create"
                self.stats["new"] += 1
            
            result["scheme_data"] = scheme_data
            return result
        
        # Check existing scheme
        existing = await self._get_existing_scheme(scheme_code)
        
        if existing:
            # Create version snapshot before updating
            await self._create_scheme_version(
                existing["id"], 
                {**existing, **scheme_data}, 
                academic_year, 
                source_url,
                verified_by
            )
            
            # Update existing scheme
            update_data = {**scheme_data, "updated_at": datetime.now(timezone.utc).isoformat()}
            response = self.supabase.table("schemes").update(update_data).eq("id", existing["id"]).execute()
            
            if response.data:
                result["action"] = "updated"
                self.stats["updated"] += 1
                result["scheme_id"] = existing["id"]
            else:
                result["action"] = "error"
                result["errors"] = ["Failed to update scheme"]
                self.stats["errors"] += 1
        else:
            # Create new scheme
            now = datetime.now(timezone.utc).isoformat()
            scheme_data["created_at"] = now
            scheme_data["updated_at"] = now
            
            response = self.supabase.table("schemes").insert(scheme_data).execute()
            
            if response.data:
                scheme_id = response.data[0]["id"]
                result["action"] = "created"
                self.stats["new"] += 1
                result["scheme_id"] = scheme_id
                
                # Create initial version
                await self._create_scheme_version(
                    scheme_id, scheme_data, academic_year, source_url, verified_by
                )
            else:
                result["action"] = "error"
                result["errors"] = ["Failed to create scheme"]
                self.stats["errors"] += 1
        
        # Import related data (eligibility, benefits, documents, sources)
        if result.get("scheme_id"):
            await self._import_related_data(
                result["scheme_id"], 
                validation.errors if validation.valid else [],
                normalized_data
            )
        
        return result
    
    async def _import_related_data(self, scheme_id: str, warnings: list, normalized_data: dict):
        """Import eligibility, benefits, documents, and sources for a scheme."""
        academic_year = normalized_data["academic_year"]
        
        # Import eligibility - map to actual database schema
        if normalized_data.get("eligibility"):
            elig_data = normalized_data["eligibility"].copy()
            # Map fields to actual database schema
            cat_req = elig_data.get("category_requirement")
            course_req = elig_data.get("course_requirement")
            residency_req = elig_data.get("residency_requirement")
            # Convert to array format
            eligible_cats = [cat_req] if cat_req else None
            eligible_course_types = [course_req] if course_req else None
            eligible_states = [residency_req] if residency_req else None
            
            mapped_elig = {
                "scheme_id": scheme_id,
                "minimum_age": elig_data.get("min_age"),
                "maximum_age": elig_data.get("max_age"),
                "eligible_categories": eligible_cats,
                "eligible_gender": elig_data.get("gender_requirement"),
                "eligible_course_levels": None,
                "eligible_course_types": eligible_course_types,
                "eligible_states": eligible_states,
                "maximum_family_income": elig_data.get("max_income"),
                "minimum_percentage": elig_data.get("min_percentage"),
                "required_domicile": bool(elig_data.get("residency_requirement")),
                "required_hosteller": False,
                "other_rules": elig_data.get("other_conditions"),
            }
            
            self.supabase.table("scheme_eligibility").upsert(
                mapped_elig, 
                on_conflict="scheme_id"
            ).execute()
        
        # Import benefits
        if normalized_data.get("benefits"):
            for benefit in normalized_data.get("benefits", []):
                benefit_data = {
                    "scheme_id": scheme_id,
                    "benefit_type": benefit.get("benefit_type"),
                    "description": benefit.get("description"),
                    "amount": benefit.get("amount"),
                    "frequency": benefit.get("amount_period"),
                    "conditions": benefit.get("conditions"),
                }
                # Check for existing benefit to avoid duplicates
                existing = self.supabase.table("scheme_benefits").select("id").eq("scheme_id", scheme_id).eq("benefit_type", benefit.get("benefit_type")).execute()
                if not existing.data:
                    self.supabase.table("scheme_benefits").insert({
                        "scheme_id": scheme_id,
                        "benefit_type": benefit.get("benefit_type"),
                        "description": benefit.get("description"),
                        "amount": benefit.get("amount"),
                        "frequency": benefit.get("amount_period"),
                        "conditions": benefit.get("conditions"),
                    }).execute()
        
        # Import documents
        if normalized_data.get("documents"):
            for doc in normalized_data.get("documents", []):
                doc_data = {
                    "scheme_id": scheme_id,
                    "document_name": doc.get("document_name"),
                    "document_type": doc.get("type", "Other"),
                    "description": doc.get("description"),
                    "is_mandatory": doc.get("is_mandatory", True),
                }
                # Check for existing document to avoid duplicates
                existing = self.supabase.table("scheme_documents").select("id").eq("scheme_id", scheme_id).eq("document_name", doc.get("document_name")).execute()
                if not existing.data:
                    self.supabase.table("scheme_documents").insert(doc_data).execute()
        
        # Import sources
        for source in normalized_data.get("sources", []):
            source["scheme_id"] = scheme_id
            # Remove gr_url as it doesn't exist in the database
            source.pop("gr_url", None)
        
        if normalized_data.get("sources"):
            # Check for existing sources to avoid duplicates since there's no unique constraint on (scheme_id, source_url)
            for source in normalized_data["sources"]:
                existing = self.supabase.table("scheme_sources").select("id").eq("scheme_id", scheme_id).eq("source_url", source["source_url"]).execute()
                if not existing.data:
                    self.supabase.table("scheme_sources").insert(source).execute()
    
    async def import_batch(self, schemes: list[dict], verified_by: Optional[str] = None) -> dict:
        """Import a batch of schemes."""
        self.stats = {
            "total": len(schemes),
            "new": 0,
            "updated": 0,
            "unchanged": 0,
            "errors": 0,
            "warnings": 0,
        }
        self.results = []
        
        for scheme_data in schemes:
            # Check if data is already normalized (has sources array with proper structure)
            is_normalized = (
                isinstance(scheme_data.get("sources"), list) and
                all(isinstance(s, dict) and "source_url" in s for s in scheme_data.get("sources", []))
            )
            
            if is_normalized:
                normalized = scheme_data
            else:
                # Normalize
                normalized = normalize_scheme_data(scheme_data)
            
            # Validate
            validation = validate_scheme_data(normalized)
            
            # Import
            result = await self.import_scheme(normalized, validation)
            self.results.append(result)
        
        return {
            "stats": self.stats,
            "results": self.results,
        }


async def import_from_mahadbt(
    supabase_url: str,
    supabase_service_key: str,
    max_schemes: int = 50,
    dry_run: bool = False,
) -> dict:
    """Import schemes from MahaDBT official portal."""
    async with MahaDBTSource() as source:
        # Fetch scheme list
        scheme_list = await source.fetch_schemes_list()
        
        # Limit for testing
        scheme_urls = [s["source_url"] for s in scheme_list[:max_schemes]]
        
        # Fetch detail pages
        detail_results = await source.fetch_multiple_schemes(scheme_urls)
        
        # Import
        importer = SchemeImporter(
            supabase_url=supabase_url,
            supabase_service_key=supabase_service_key,
            dry_run=dry_run,
        )
        
        valid_results = [r for r in detail_results if "parsed" in r and not r.get("error")]
        return await importer.import_batch([r["parsed"] for r in valid_results])


async def import_from_json(
    supabase_url: str,
    supabase_service_key: str,
    json_path: str,
    dry_run: bool = False,
) -> dict:
    """Import schemes from a verified JSON file."""
    json_source = ManualJSONSource(json_path)
    schemes = json_source.load_schemes()
    
    importer = SchemeImporter(
        supabase_url=supabase_url,
        supabase_service_key=supabase_service_key,
        dry_run=dry_run,
    )
    
    # Normalize and validate
    normalized_schemes = []
    for scheme in schemes:
        normalized = normalize_scheme_data({"extracted": scheme, "source_url": "manual-import"})
        schemes.append(normalized)
    
    return await importer.import_batch(normalized_schemes)


async def dry_run_import(
    supabase_url: str,
    supabase_service_key: str,
    source: str = "mahadbt",
    **kwargs
) -> dict:
    """Run importer in dry-run mode."""
    if source == "mahadbt":
        return await import_from_mahadbt(supabase_url, supabase_service_key, dry_run=True, **kwargs)
    elif source == "json":
        return await import_from_json(supabase_url, supabase_service_key, kwargs.get("json_path"), dry_run=True)
    else:
        raise ValueError(f"Unknown source: {source}")