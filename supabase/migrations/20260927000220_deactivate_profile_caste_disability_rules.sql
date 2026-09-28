-- =============================================================================
-- Phase 12c : Deactivate the profile completeness rules for religion, caste
--             and disability
-- =============================================================================
-- Requested: strip the religion / caste / disability capture from the profile
-- so the demo profile is shorter. The applicant-facing document requirements
-- are NOT touched: the ST/PVTG and disability *certificates* that schemes
-- genuinely ask for are separate rows in scheme_documents, added in
-- 20260927000160 and normalised in 20260927000200, and they stay.
--
-- What is actually being removed is 14 completeness rules, and only those. The
-- underlying columns on applicant_profiles / applicant_caste / applicant_eligibility
-- are left exactly as they are, so no data is destroyed and this is reversible.
--
-- Deactivated rather than deleted because profileValidation.ts, PersonalSection.tsx
-- and localCompleteness.ts are a hand-maintained mirror of this table; deleting
-- the rows would leave the mirror referencing rules that no longer exist, and the
-- next person to edit it would have no idea what the original values were.
--
-- Two rules matched a naive "category" text search but are deliberately KEPT:
--   current_course.seat_type          "Seat type / category"  (admission seat)
--   hostel.beneficiary_category        "Beneficiary category"  (hosteller/day scholar)
-- Neither is about caste or religion, and dropping them would silently change
-- unrelated eligibility answers.
--
-- Every dependent rule is inside this set, so no rule is left pointing at a
-- condition_key that no longer exists (checked before writing: the only
-- condition_keys used by the removed rules are is_disabled,
-- has_disability_certificate and has_caste_certificate, and all three plus
-- their dependents are listed below).
-- =============================================================================

do $$
declare
  v_removed int;
  v_orphaned int;
begin
  update public.profile_completeness_rules
     set is_active = false
   where is_active
     and field_key in (
       -- religion
       'religion',
       -- disability
       'is_disabled', 'disability_type', 'has_disability_certificate',
       'disability_certificate_number', 'disability_document',
       -- caste / category
       'category', 'caste', 'has_caste_certificate', 'caste_certificate_number',
       'caste_certificate_holder_name', 'caste_issuing_authority',
       'caste_date_of_issue', 'caste_document'
     );

  get diagnostics v_removed = row_count;

  if v_removed <> 14 then
    raise exception 'Expected to deactivate 14 rules, deactivated %', v_removed;
  end if;

  -- A live rule whose condition_key names a deactivated rule is unreachable:
  -- the condition can never be shown, so the field silently never appears.
  select count(*) into v_orphaned
  from public.profile_completeness_rules child
  join public.profile_completeness_rules parent
    on parent.field_key = child.condition_key
 where child.is_active
   and not parent.is_active;

  if v_orphaned > 0 then
    raise exception 'Aborting: % active rules depend on a deactivated rule', v_orphaned;
  end if;

  raise notice 'Deactivated % profile completeness rules', v_removed;
end;
$$;
