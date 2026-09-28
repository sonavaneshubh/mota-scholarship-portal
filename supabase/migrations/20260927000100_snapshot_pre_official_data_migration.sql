-- =============================================================================
-- Phase 0 : Reversible pre-migration snapshot of the five official MoTA schemes
-- =============================================================================
-- Run this BEFORE any DDL or DML of the official-data migration.
-- Captures the complete current state of every in-scope table into
-- scheme_versions.snapshot (jsonb) at version_number = 2, so the official-data
-- migration can be rolled back exactly.
-- The database was inspected read-only before this file was written; no row in
-- any scheme table is modified here.
-- =============================================================================

insert into scheme_versions (scheme_id, version_number, academic_year, snapshot, change_summary)
select
  s.id,
  2,
  s.academic_year,
  jsonb_build_object(
    'capture_kind',        'pre_official_data_migration',
    'captured_at',         now(),
    'audit_reference',     'OFFICIAL_SCHEME_DATA_RESEARCH_2026-09-27.md',
    'schemes',             jsonb_build_array(to_jsonb(s)),
    'scheme_eligibility',  coalesce((select jsonb_agg(to_jsonb(e) order by e.id)
                                       from scheme_eligibility e
                                      where e.scheme_id = s.id), '[]'::jsonb),
    'scheme_benefits',     coalesce((select jsonb_agg(to_jsonb(b) order by b.id)
                                       from scheme_benefits b
                                      where b.scheme_id = s.id), '[]'::jsonb),
    'scheme_documents',    coalesce((select jsonb_agg(to_jsonb(d) order by d.id)
                                       from scheme_documents d
                                      where d.scheme_id = s.id), '[]'::jsonb),
    'scheme_sources',      coalesce((select jsonb_agg(to_jsonb(src) order by src.id)
                                       from scheme_sources src
                                      where src.scheme_id = s.id), '[]'::jsonb)
  ),
  'Pre-migration snapshot captured 2026-09-27 before the official scheme-data migration '
  '(eligibility, benefits, documents, process steps and criteria aligned to the four official '
  'MoTA guidelines). Restore from this snapshot to roll the migration back.'
from schemes s
where s.scheme_code in ('BPVGK', 'BVOBC', 'A023B', 'ARG45', 'AZKMI')
on conflict (scheme_id, version_number) do nothing;
