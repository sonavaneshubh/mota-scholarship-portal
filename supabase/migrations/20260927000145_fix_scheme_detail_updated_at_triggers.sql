-- =============================================================================
-- Phase 5a : Fix broken updated_at triggers on scheme_benefits / scheme_documents
-- =============================================================================
-- Pre-existing defect, found while running the official-data migration.
--
-- public.scheme_benefits and public.scheme_documents each carry a
-- BEFORE UPDATE trigger whose function unconditionally assigns NEW.updated_at,
-- but NEITHER table has an updated_at column (only created_at). Any single-row
-- UPDATE on those two tables therefore fails with:
--     ERROR: record "new" has no field "updated_at"
--
-- The first symptom was the 7-row benefits rebuild aborting and rolling back.
--
-- Fix: keep the triggers (other code may rely on their presence) but make the
-- functions set updated_at only when the target table actually has that column.
-- No column is added and no data is changed, so this is a no-op for every table
-- that does have updated_at.
-- =============================================================================

create or replace function public.set_scheme_benefits_updated_at()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if to_jsonb(new) ? 'updated_at' then
    new.updated_at = now();
  end if;
  return new;
end;
$function$;

create or replace function public.set_scheme_documents_updated_at()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if to_jsonb(new) ? 'updated_at' then
    new.updated_at = now();
  end if;
  return new;
end;
$function$;
