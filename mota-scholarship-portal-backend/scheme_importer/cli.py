#!/usr/bin/env python3
"""
CLI Entry Point for Scheme Importer.
"""

import asyncio
import json
import os
import sys
from pathlib import Path

import typer
from dotenv import load_dotenv
from rich.console import Console
from rich.table import Table

from .importer import SchemeImporter, import_from_mahadbt, import_from_json
from . import seed_schemes

load_dotenv()

app = typer.Typer(
    name="scheme-importer",
    help="Scholarship Scheme Importer - Import official MahaDBT scheme data",
    add_completion=False,
)

console = Console()

def get_env(key: str) -> str:
    value = os.getenv(key)
    if not value:
        console.print(f"[red]Error: {key} not set in environment[/red]")
        sys.exit(1)
    return value

@app.command()
def seed(
    dry_run: bool = typer.Option(False, "--dry-run", "-d", help="Run in dry-run mode (no DB changes)"),
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Verbose output"),
):
    """Import curated seed schemes verified from official MahaDBT sources."""
    supabase_url = get_env("SUPABASE_URL")
    supabase_service_key = get_env("SUPABASE_SERVICE_ROLE_KEY")
    
    console.print(f"[bold]{'DRY RUN' if dry_run else 'LIVE IMPORT'}[/bold]: Importing {len(seed_schemes.SEED_SCHEMES)} seed schemes...")
    
    result = asyncio.run(seed_schemes.run_seed_import(supabase_url, supabase_service_key, dry_run=dry_run))
    
    print_import_report(result, verbose)

@app.command()
def mahadbt(
    max_schemes: int = typer.Option(50, "--max-schemes", "-m", help="Maximum schemes to import"),
    dry_run: bool = typer.Option(False, "--dry-run", "-d", help="Run in dry-run mode"),
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Verbose output"),
):
    """Import schemes directly from MahaDBT portal."""
    supabase_url = get_env("SUPABASE_URL")
    supabase_service_key = get_env("SUPABASE_SERVICE_ROLE_KEY")
    
    console.print(f"[bold]{'DRY RUN' if dry_run else 'LIVE IMPORT'}[/bold]: Fetching from MahaDBT (max {max_schemes} schemes)...")
    
    result = asyncio.run(import_from_mahadbt(
        supabase_url=supabase_url,
        supabase_service_key=supabase_service_key,
        max_schemes=max_schemes,
        dry_run=dry_run,
    ))
    
    print_import_report(result, verbose)

@app.command()
def json(
    json_path: str = typer.Argument(..., help="Path to JSON file with schemes"),
    dry_run: bool = typer.Option(False, "--dry-run", "-d", help="Run in dry-run mode"),
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Verbose output"),
):
    """Import schemes from a verified JSON file."""
    supabase_url = get_env("SUPABASE_URL")
    supabase_service_key = get_env("SUPABASE_SERVICE_ROLE_KEY")
    
    if not Path(json_path).exists():
        console.print(f"[red]Error: File not found: {json_path}[/red]")
        sys.exit(1)
    
    console.print(f"[bold]{'DRY RUN' if dry_run else 'LIVE IMPORT'}[/bold]: Importing from {json_path}...")
    
    result = asyncio.run(import_from_json(
        supabase_url=supabase_url,
        supabase_service_key=supabase_service_key,
        json_path=json_path,
        dry_run=dry_run,
    ))
    
    print_import_report(result, verbose)

@app.command()
def validate(
    json_path: str = typer.Argument(..., help="Path to JSON file to validate"),
):
    """Validate a JSON scheme file without importing."""
    if not Path(json_path).exists():
        console.print(f"[red]Error: File not found: {json_path}[/red]")
        sys.exit(1)
    
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    schemes = data.get("schemes", data) if isinstance(data, dict) else data
    
    console.print(f"Validating {len(schemes)} schemes...")
    
    all_valid = True
    for i, scheme in enumerate(schemes):
        from .validator import validate_scheme_data
        result = validate_scheme_data(scheme)
        
        if result.valid:
            console.print(f"  [green]✓[/green] Scheme {i+1} ({result.scheme_code}): Valid")
        else:
            console.print(f"  [red]✗[/red] Scheme {i+1} ({result.scheme_code}): Invalid")
            for err in result.errors:
                console.print(f"    [red]Error:[/red] {err}")
            all_valid = False
        
        if result.warnings:
            for warn in result.warnings:
                console.print(f"    [yellow]Warning:[/yellow] {warn}")
    
    if all_valid:
        console.print("\n[green]All schemes valid![/green]")
    else:
        console.print("\n[red]Some schemes failed validation[/red]")
        sys.exit(1)

def print_import_report(result: dict, verbose: bool):
    """Print formatted import report."""
    stats = result["stats"]
    
    table = Table(title="IMPORT REPORT")
    table.add_column("Metric", style="cyan")
    table.add_column("Count", style="magenta")
    
    table.add_row("Total", str(stats["total"]))
    table.add_row("New", str(stats["new"]))
    table.add_row("Updated", str(stats["updated"]))
    table.add_row("Unchanged", str(stats["unchanged"]))
    table.add_row("Errors", str(stats["errors"]))
    table.add_row("Warnings", str(stats["warnings"]))
    
    console.print(table)
    
    if stats["errors"] > 0:
        console.print("\n[red]ERRORS:[/red]")
        for r in result["results"]:
            if r.get("errors"):
                console.print(f"  [red]{r['scheme_code']}:[/red] {r['errors']}")
    
    if stats["warnings"] > 0 and verbose:
        console.print("\n[yellow]WARNINGS:[/yellow]")
        for r in result["results"]:
            if r.get("warnings"):
                console.print(f"  [yellow]{r['scheme_code']}:[/yellow] {r['warnings']}")
    
    if dry_run := "dry_run" in globals() and globals()["dry_run"]:
        console.print("\n[yellow]This was a dry run. No changes were made to the database.[/yellow]")
        console.print("Run without --dry-run to perform actual import.")

if __name__ == "__main__":
    app()