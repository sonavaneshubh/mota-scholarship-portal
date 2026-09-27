-- =============================================================================
-- Phase 5 : scheme_benefits - one row per official component and tier
-- =============================================================================
-- Replaces the 7 incomplete rows (all amounts NULL) with 46 rows aligned to the
-- four official guidelines. Pre-migration state was counted and captured in
-- 20260927000100_snapshot_pre_official_data_migration.sql:
--   BPVGK 1, BVOBC 1, A023B 2, ARG45 1, AZKMI 2  =  7 rows, all amount NULL.
--
-- The incorrect A023B "living_expenses" row is removed by the delete below.
--
-- Rules honoured here:
--   * Hosteller and day-scholar rates are NEVER combined into one row.
--   * Course-specific and group-specific values are NEVER combined.
--   * amount IS NULL whenever the official value is not a fixed number
--     (as-per-actuals items, State-decided fees, UGC percentage rates).
--   * No INR figure is invented for the foreign-currency AZKMI components.
--   * amount_basis explains how a non-fixed amount must be read.
-- =============================================================================

delete from public.scheme_benefits
where scheme_id in (select id from public.schemes where scheme_code in ('BPVGK','BVOBC','A023B','ARG45','AZKMI'));

-- ---------------------------------------------------------------------------
-- BPVGK - 6 rows : pre-matric-scholarship.pdf p.4 §3.4 (Table), p.5 §3.5
-- ---------------------------------------------------------------------------
insert into public.scheme_benefits
  (scheme_id, benefit_type, description, amount, frequency, conditions, academic_year, currency, amount_basis)
select s.id, v.benefit_type, v.description, v.amount, v.frequency, v.conditions, '', v.currency, v.amount_basis
from (values
 ('maintenance_allowance_day_scholar',
  'Monthly maintenance scholarship for day scholars',
  225::numeric,'monthly','INR','fixed',
  'Payable for 10 months in an academic year (Rs. 2,250 per year). Award continues subject to good conduct and regularity in attendance. Source: pre-matric-scholarship.pdf p.4 §3.4, p.5 §3.5.'),
 ('maintenance_allowance_hosteller',
  'Monthly maintenance scholarship for hostellers',
  525::numeric,'monthly','INR','fixed',
  'Payable for 10 months in an academic year (Rs. 5,250 per year). Award continues subject to good conduct and regularity in attendance. Source: pre-matric-scholarship.pdf p.4 §3.4, p.5 §3.5.'),
 ('books_and_ad_hoc_grant_day_scholar',
  'Books and ad hoc grant for day scholars',
  750::numeric,'one_time','INR','fixed',
  'One-off grant. Source: pre-matric-scholarship.pdf p.4 §3.4.'),
 ('books_and_ad_hoc_grant_hosteller',
  'Books and ad hoc grant for hostellers',
  1000::numeric,'one_time','INR','fixed',
  'One-off grant. Source: pre-matric-scholarship.pdf p.4 §3.4.'),
 ('disability_allowance_day_scholar',
  'Additional disability allowance for day scholars',
  600::numeric,'monthly','INR','fixed',
  'Payable for all 12 months (Rs. 7,200 per year). Disability must be certified by a competent medical authority of the State Government or UT Administration. Also applies to leprosy-cured students and students with sickle cell anaemia or Thalassemia, with the necessary certificate. Source: pre-matric-scholarship.pdf p.4 §3.4, p.5 §3.5.'),
 ('disability_allowance_hosteller',
  'Additional disability allowance for hostellers',
  800::numeric,'monthly','INR','fixed',
  'Payable for all 12 months (Rs. 9,600 per year). Disability must be certified by a competent medical authority of the State Government or UT Administration. Also applies to leprosy-cured students and students with sickle cell anaemia or Thalassemia, with the necessary certificate. Source: pre-matric-scholarship.pdf p.4 §3.4, p.5 §3.5.')
) as v(benefit_type,description,amount,frequency,currency,amount_basis,conditions)
cross join public.schemes s
where s.scheme_code = 'BPVGK';

-- ---------------------------------------------------------------------------
-- BVOBC - 14 rows : post-matric-scholarship.pdf p.5-8 §3.4, §3.4.1 Table 1,
-- §3.4.2 Table 2 Note 4, p.13 §7.v
-- ---------------------------------------------------------------------------
insert into public.scheme_benefits
  (scheme_id, benefit_type, description, amount, frequency, conditions, academic_year, currency, amount_basis)
select s.id, v.benefit_type, v.description, v.amount, v.frequency, v.conditions, '', v.currency, v.amount_basis
from (values
 ('course_fee_state_fixed',
  'Compulsory non-refundable course fees, decided by the State Level Fee Fixation Committee',
  null::numeric,'annual','INR','state_fixed',
  'The fee component is decided by the State Level Fee Fixation Committee, so no single central amount exists. Course Groups I-IV are defined in scheme_criteria. States may pay more; any excess is accounted separately in the State portal. Source: post-matric-scholarship.pdf p.5-7 §3.4, §3.4.1 Table 1.'),
 ('course_fee_private_engineering_ceiling',
  'Ceiling on Central support for private institutes - Engineering',
  250000::numeric,'annual','INR','fixed',
  'Government of India support to private institutes is capped at Rs. 2.50 lakh per annum for Engineering. Source: post-matric-scholarship.pdf p.7 §3.4.'),
 ('course_fee_private_medical_ceiling',
  'Ceiling on Central support for private institutes - MBBS, MS and MD',
  600000::numeric,'annual','INR','fixed',
  'Government of India support to private institutes is capped at Rs. 6.00 lakh per annum for MBBS/MS/MD. Source: post-matric-scholarship.pdf p.7 §3.4.'),
 ('course_fee_private_other_ceiling',
  'Ceiling on Central support for private institutes - other courses',
  100000::numeric,'annual','INR','fixed',
  'Government of India support to private institutes is capped at Rs. 1.00 lakh per annum for other courses. Source: post-matric-scholarship.pdf p.7 §3.4.'),
 ('stipend_group_i_hosteller','Monthly stipend for Group I courses - hosteller',
  1200::numeric,'monthly','INR','fixed',
  'Rs. 12,000 per year. Group I: graduate and post graduate degree courses, PG Diploma, MPhil, PhD, professional courses. Source: post-matric-scholarship.pdf p.8 §3.4.2 Table 2; p.5 §3.4.1 Table 1.'),
 ('stipend_group_i_day_scholar','Monthly stipend for Group I courses - day scholar',
  550::numeric,'monthly','INR','fixed',
  'Rs. 5,500 per year. Group I: graduate and post graduate degree courses, PG Diploma, MPhil, PhD, professional courses. Source: post-matric-scholarship.pdf p.8 §3.4.2 Table 2; p.5 §3.4.1 Table 1.'),
 ('stipend_group_ii_hosteller','Monthly stipend for Group II courses - hosteller',
  820::numeric,'monthly','INR','fixed',
  'Rs. 8,200 per year. Group II: non-professional recognised courses leading to a Graduate/Post Graduate Degree not covered under Group I. Source: post-matric-scholarship.pdf p.8 §3.4.2 Table 2; p.5 §3.4.1 Table 1.'),
 ('stipend_group_ii_day_scholar','Monthly stipend for Group II courses - day scholar',
  530::numeric,'monthly','INR','fixed',
  'Rs. 5,300 per year. Group II: non-professional recognised courses leading to a Graduate/Post Graduate Degree not covered under Group I. Source: post-matric-scholarship.pdf p.8 §3.4.2 Table 2; p.5 §3.4.1 Table 1.'),
 ('stipend_group_iii_hosteller','Monthly stipend for Group III courses - hosteller',
  570::numeric,'monthly','INR','fixed',
  'Rs. 5,700 per year. Group III: vocational stream, ITI courses, 3-year diploma courses in Polytechnics etc. Source: post-matric-scholarship.pdf p.8 §3.4.2 Table 2; p.5 §3.4.1 Table 1.'),
 ('stipend_group_iii_day_scholar','Monthly stipend for Group III courses - day scholar',
  300::numeric,'monthly','INR','fixed',
  'Rs. 3,000 per year. Group III: vocational stream, ITI courses, 3-year diploma courses in Polytechnics etc. Source: post-matric-scholarship.pdf p.8 §3.4.2 Table 2; p.5 §3.4.1 Table 1.'),
 ('stipend_group_iv_hosteller','Monthly stipend for Group IV courses - hosteller',
  380::numeric,'monthly','INR','fixed',
  'Rs. 3,800 per year. Group IV: post-matriculation level non-degree courses for which the entrance qualification is High School (Class X). Source: post-matric-scholarship.pdf p.8 §3.4.2 Table 2; p.5 §3.4.1 Table 1.'),
 ('stipend_group_iv_day_scholar','Monthly stipend for Group IV courses - day scholar',
  230::numeric,'monthly','INR','fixed',
  'Rs. 2,300 per year. Group IV: post-matriculation level non-degree courses for which the entrance qualification is High School (Class X). Source: post-matric-scholarship.pdf p.8 §3.4.2 Table 2; p.5 §3.4.1 Table 1.'),
 ('disability_allowance_hosteller','Additional disability allowance - hosteller',
  800::numeric,'monthly','INR','fixed',
  'Rs. 9,600 per year. Also applies to leprosy-cured students and students with sickle cell anaemia or Thalassemia. Source: post-matric-scholarship.pdf p.8 §3.4.2 Note 4.'),
 ('disability_allowance_day_scholar','Additional disability allowance - day scholar',
  600::numeric,'monthly','INR','fixed',
  'Rs. 7,200 per year. Also applies to leprosy-cured students and students with sickle cell anaemia or Thalassemia. Source: post-matric-scholarship.pdf p.8 §3.4.2 Note 4.')
) as v(benefit_type,description,amount,frequency,currency,amount_basis,conditions)
cross join public.schemes s
where s.scheme_code = 'BVOBC';

-- ---------------------------------------------------------------------------
-- A023B - 4 rows : national-fellowship-scholarship.pdf Part-B p.19 §2.5 (Table),
-- p.21-22 §4, §4.1
-- ---------------------------------------------------------------------------
insert into public.scheme_benefits
  (scheme_id, benefit_type, description, amount, frequency, conditions, academic_year, currency, amount_basis)
select s.id, v.benefit_type, v.description, v.amount, v.frequency, v.conditions, '', v.currency, v.amount_basis
from (values
 ('tuition_and_admission_fee',
  'Tuition fees and admission fee - full amount for Government Institutes, Rs. 2.50 lakh ceiling for private institutes',
  250000::numeric,'annual','INR','fixed',
  'Full admission fee, tuition fee and other non-refundable charges are covered for Government Institutes. For private sector Institutes the ceiling is Rs. 2.50 lakh per annum per student. Component II is released to the Institute, or reimbursed to the student''s Aadhaar-seeded account on submission of the receipt or vouchers. Source: national-fellowship-scholarship.pdf Part-B p.19 §2.5, p.21-22 §4.1.'),
 ('books_and_stationery','Books and stationery allowance',
  5000::numeric,'annual','INR','fixed',
  'Rs. 5,000 per annum per student, without bills or vouchers. Component I, released to the student. Source: national-fellowship-scholarship.pdf Part-B p.19 §2.5, p.21 §4.1.'),
 ('stipend','Monthly stipend',
  3000::numeric,'monthly','INR','fixed',
  'Rs. 3,000 per month. Component I, released to the student. Source: national-fellowship-scholarship.pdf Part-B p.19 §2.5, p.21 §4.1.'),
 ('computer_and_accessories','Computer and accessories',
  45000::numeric,'one_time','INR','fixed',
  'Rs. 45,000 one-time during the course tenure, without bills or vouchers. May be a Desktop or a Laptop. Component I, released to the student. Source: national-fellowship-scholarship.pdf Part-B p.19 §2.5, p.21 §4.1.')
) as v(benefit_type,description,amount,frequency,currency,amount_basis,conditions)
cross join public.schemes s
where s.scheme_code = 'A023B';

-- ---------------------------------------------------------------------------
-- ARG45 - 9 rows : national-fellowship-scholarship.pdf Part-A p.7 §2.6,
-- p.8 §2.6.1
-- Ph.D HSS is split into the first-2-years and remaining-3-years rates rather
-- than combined, because the two rates differ (Rs. 31,000 then Rs. 35,000).
-- ---------------------------------------------------------------------------
insert into public.scheme_benefits
  (scheme_id, benefit_type, description, amount, frequency, conditions, academic_year, currency, amount_basis)
select s.id, v.benefit_type, v.description, v.amount, v.frequency, v.conditions, '', v.currency, v.amount_basis
from (values
 ('fellowship_mph_humanities_social_sciences','Monthly fellowship - M.Phil, Humanities and Social Sciences',
  31000::numeric,'monthly','INR','fixed',
  'Tenure 2 years or date of submission of dissertation, whichever is earlier. Source: national-fellowship-scholarship.pdf Part-A p.7 §2.6.'),
 ('fellowship_mph_science_engineering_technology','Monthly fellowship - M.Phil, Science, Engineering and Technology',
  12000::numeric,'monthly','INR','fixed',
  'Tenure 2 years or date of submission of dissertation, whichever is earlier. Source: national-fellowship-scholarship.pdf Part-A p.7 §2.6.'),
 ('fellowship_phd_humanities_social_sciences_first_2_years','Monthly fellowship - Ph.D, Humanities and Social Sciences, first 2 years',
  31000::numeric,'monthly','INR','fixed',
  'First 2 years of the 5-year Ph.D tenure. Source: national-fellowship-scholarship.pdf Part-A p.7 §2.6.'),
 ('fellowship_phd_humanities_social_sciences_remaining_3_years','Monthly fellowship - Ph.D, Humanities and Social Sciences, remaining 3 years',
  35000::numeric,'monthly','INR','fixed',
  'Remaining 3 years of the 5-year Ph.D tenure. Source: national-fellowship-scholarship.pdf Part-A p.7 §2.6.'),
 ('fellowship_phd_science_engineering_technology','Monthly fellowship - Ph.D, Science, Engineering and Technology',
  25000::numeric,'monthly','INR','fixed',
  'Tenure 5 years or date of submission of dissertation, whichever is earlier. Source: national-fellowship-scholarship.pdf Part-A p.7 §2.6.'),
 ('contingency_mph','Annual contingency - M.Phil',
  10000::numeric,'annual','INR','fixed',
  'For books, essential apparatus, study tour, typing and binding of thesis. Source: national-fellowship-scholarship.pdf Part-A p.7 §2.6.'),
 ('contingency_phd','Annual contingency - Ph.D',
  20500::numeric,'annual','INR','fixed',
  'For books, essential apparatus, study tour, typing and binding of thesis. Source: national-fellowship-scholarship.pdf Part-A p.7 §2.6.'),
 ('house_rent_allowance','House Rent Allowance - UGC rate, city-categorised',
  null::numeric,'monthly','INR','percentage',
  'Equal to UGC rates: 8%, 16% or 24% of the basic stipend depending on city categorisation, so no fixed amount is stated officially. A student provided hostel accommodation by the university is NOT eligible for HRA, but may draw only the hostel fees charged by the University and is not entitled to claim mess, electricity or water charges; a certificate to that effect must be furnished through the Registrar/Director/Principal. A student making their own accommodation arrangements may draw HRA per Government of India city categorisation. The University marks the monthly HRA entitlement after Ministry approval of continuation. Source: national-fellowship-scholarship.pdf Part-A p.7 §2.6, p.8 §2.6.1, p.12 §4.3.'),
 ('escort_allowance_divyangjan','Escort Allowance for Divyangjan scholars',
  2000::numeric,'monthly','INR','fixed',
  'At par with UGC rates. Available to Divyangjan research scholars, who must hold a Disability Certificate certifying minimum 40% disability. Source: national-fellowship-scholarship.pdf Part-A p.7 §2.6, p.6 Note-2.')
) as v(benefit_type,description,amount,frequency,currency,amount_basis,conditions)
cross join public.schemes s
where s.scheme_code = 'ARG45';

-- ---------------------------------------------------------------------------
-- AZKMI - 13 rows : national-overseas-scholarship.pdf p.5-6 §3.2
-- All amounts are foreign-currency or as-per-actuals. No INR figure is
-- invented for any component. Foreign rates apply for all course levels.
-- ---------------------------------------------------------------------------
insert into public.scheme_benefits
  (scheme_id, benefit_type, description, amount, frequency, conditions, academic_year, currency, amount_basis)
select s.id, v.benefit_type, v.description, v.amount, v.frequency, v.conditions, '', v.currency, v.amount_basis
from (values
 ('annual_maintenance_allowance_usa','Annual maintenance allowance - United States',
  15400::numeric,'annual','USD','fixed',
  'For all course levels. Source: national-overseas-scholarship.pdf p.5 §3.2.'),
 ('annual_maintenance_allowance_uk','Annual maintenance allowance - United Kingdom',
  9900::numeric,'annual','GBP','fixed',
  'For all course levels. Source: national-overseas-scholarship.pdf p.5 §3.2.'),
 ('annual_maintenance_allowance_other_countries','Annual maintenance allowance - other countries',
  null::numeric,'annual',null,'actual',
  'USD or equivalent, as applicable to the country of study. No official fixed figure is stated for countries other than the US and UK. Source: national-overseas-scholarship.pdf p.5 §3.2.'),
 ('contingency_and_equipment_allowance_usa','Annual contingency and equipment allowance - United States',
  1532::numeric,'annual','USD','fixed',
  'For books, essential apparatus, study tour, typing and binding of thesis. Source: national-overseas-scholarship.pdf p.5-6 §3.2.'),
 ('contingency_and_equipment_allowance_uk','Annual contingency and equipment allowance - United Kingdom',
  1116::numeric,'annual','GBP','fixed',
  'For books, essential apparatus, study tour, typing and binding of thesis. Source: national-overseas-scholarship.pdf p.5-6 §3.2.'),
 ('contingency_and_equipment_allowance_other_countries','Annual contingency and equipment allowance - other countries',
  null::numeric,'annual',null,'actual',
  'Equivalent of the US or UK rate, as applicable. Source: national-overseas-scholarship.pdf p.5-6 §3.2.'),
 ('poll_tax','Poll tax',
  null::numeric,'annual',null,'actual',
  'Actuals, wherever applicable. Source: national-overseas-scholarship.pdf p.5 §3.2.'),
 ('visa_fees','Visa fees',
  null::numeric,'one_time','INR','actual',
  'Actual visa fees, in Indian Rupees. Source: national-overseas-scholarship.pdf p.5 §3.2.'),
 ('incidental_journey_expenses','Incidental journey expenses',
  20::numeric,'one_time','USD','fixed',
  'Up to USD 20 or equivalent in INR. Source: national-overseas-scholarship.pdf p.5 §3.2.'),
 ('tuition_and_other_fees','Tuition and other non-refundable course fees',
  null::numeric,'annual',null,'actual',
  'Fees compulsorily required for completion of the course, as per actuals. Source: national-overseas-scholarship.pdf p.5-6 §3.2.'),
 ('medical_insurance_premium','Medical insurance premium',
  null::numeric,'annual',null,'actual',
  'Actuals as charged. The Indian Embassy or Mission examines the reasonableness of the amount. Source: national-overseas-scholarship.pdf p.5-6 §3.2.'),
 ('cost_of_air_passage','Cost of air passage',
  null::numeric,'one_time',null,'actual',
  'Actual cost, economy class, shortest route, from India to the nearest place to the educational institution and back. Source: national-overseas-scholarship.pdf p.5-6 §3.2.'),
 ('local_travel','Local travel at the place of study',
  null::numeric,'annual',null,'actual',
  'Second-class railway fare from the port of disembarkation to the place of study and back; for far-flung places not connected by rail, bus fare from residence to the nearest railway station; actual ferry crossing charge; air fare to the nearest rail-cum-air station. Source: national-overseas-scholarship.pdf p.5-6 §3.2.')
) as v(benefit_type,description,amount,frequency,currency,amount_basis,conditions)
cross join public.schemes s
where s.scheme_code = 'AZKMI';

-- ---------------------------------------------------------------------------
-- Scheme-wide special provisions that affect how the AZKMI amounts are read.
-- Recorded against the maintenance rows' scheme rather than invented as values.
-- ---------------------------------------------------------------------------
update public.scheme_benefits b set conditions = b.conditions
  || ' Note 1: if the awardee studies online from India because of a pandemic, '
     'natural calamity or war, maintenance allowance is provided at the JRF rate for '
     'Master''s and the SRF rate for Ph.D and Post-Doctorate under the National '
     'Fellowship for ST Students scheme, and foreign rates resume on joining the '
     'university abroad. For field study in India, prior permission from the Institute '
     'and the Indian Embassy with justification is required, JRF/SRF rates apply, and '
     'to-and-fro airfare is allowed only once for the whole course. On stay in India '
     'the foreign maintenance allowance is proportionately reduced. '
     'Source: national-overseas-scholarship.pdf p.6-7 §3.2 Note 1.'
where b.scheme_id = (select id from public.schemes where scheme_code = 'AZKMI')
  and b.benefit_type = 'annual_maintenance_allowance_other_countries';
