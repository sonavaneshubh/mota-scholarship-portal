"""
Scheme Importer Package
Official MahaDBT Scholarship Scheme Data Import System

This package provides tools to import, validate, and manage scholarship scheme data
from official MahaDBT sources into the Supabase database.
"""

__version__ = "1.0.0"
__author__ = "Scholarship Portal Team"

from .importer import (
    SchemeImporter,
    import_from_mahadbt,
    import_from_json,
    dry_run_import,
)

__all__ = [
    "SchemeImporter",
    "import_from_mahadbt",
    "import_from_json",
    "dry_run_import",
]