-- =============================================================================
-- Phase 2 : Scheme-level corrections and eligibility backfill
-- =============================================================================
-- Aligns schemes + scheme_eligibility with the four official MoTA guidelines
-- (research report OFFICIAL_SCHEME_DATA_RESEARCH_2026-09-27.md).
--
-- Deliberately NOT changed:
--   * schemes.academic_year and application_start_date / application_end_date
--     stay as-is. They are per-State / per-cycle values, not static scheme
--     attributes (report 1.8, 7.7), and no successor 2026-27 guideline exists.
--   * Genuinely unspecified official values stay NULL, never defaulted.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 2a. Scheme-level fields
-- ---------------------------------------------------------------------------
update public.schemes s set
  official_application_url = case s.scheme_code
    when 'BPVGK' then 'https://scholarships.gov.in'
    when 'BVOBC' then 'https://scholarships.gov.in'
    when 'A023B' then 'https://scholarships.gov.in'
    when 'ARG45' then 'https://fellowship.tribal.gov.in'
    when 'AZKMI' then 'https://overseas.tribal.gov.in'
  end,
  gr_url = 'https://tribal.nic.in/Grievance/',
  official_scheme_url = case s.scheme_code
    when 'BPVGK' then 'https://tribal.nic.in/Scholarship.aspx'
    when 'BVOBC' then 'https://tribal.nic.in/Scholarship.aspx'
    when 'A023B' then 'https://dbttribal.gov.in/AllScheme.aspx'
    when 'ARG45' then 'https://fellowship.tribal.gov.in'
    when 'AZKMI' then 'https://overseas.tribal.gov.in'
  end,
  source_last_verified_at = '2026-09-27 00:00:00+00'::timestamptz,
  updated_at = now()
where s.scheme_code in ('BPVGK','BVOBC','A023B','ARG45','AZKMI')
  and s.status = 'published';

-- AZKMI description omitted Post-Doctoral Research and did not exclude
-- Bachelor's level (report 5.8). Both statements are official (5.2 item 1).
update public.schemes s set
  description = 'Financial assistance to Scheduled Tribe students for post-graduate level studies '
             || '(Masters, Ph.D and Post-Doctoral Research) at reputed universities abroad. '
             || 'Bachelor-level courses in any discipline are not covered.',
  overview = 'Centrally sponsored support for ST students pursuing Masters, Ph.D or Post-Doctoral '
          || 'Research abroad, with foreign-currency maintenance, contingency and actual-cost '
          || 'components disbursed through the Indian Mission.',
  updated_at = now()
where s.scheme_code = 'AZKMI';

-- ---------------------------------------------------------------------------
-- 2b. BPVGK - Pre-Matric Scholarship Scheme For ST Student
-- Income 200000 -> 250000 (200000 was the superseded 2012 ceiling, report 7.8).
-- ---------------------------------------------------------------------------
update public.scheme_eligibility e set
  maximum_family_income = 250000,
  minimum_percentage = null,
  minimum_age = null,
  maximum_age = null,
  eligible_gender = null,
  eligible_categories = array['ST (Scheduled Tribe)'],
  eligible_course_levels = array['Class IX','Class X'],
  eligible_course_types = array['Class 9 and 10'],
  eligible_states = array['As per state/UT norms'],
  required_domicile = true,
  required_hosteller = false,
  qualifying_examination = null,
  institution_requirement = array[
    'Government School',
    'School recognized by Government or a Central/State Board of Secondary Education'
  ],
  other_rules = jsonb_build_object(
    'source_ref', 'pre-matric-scholarship.pdf p.3-4 §3.2, §3.3; p.7 §5',
    'category_basis', 'Belong to the Scheduled Tribe as specified in relation to the Domicile State/UT the student actually belongs to.',
    'bank_account', 'Valid account in a Scheduled Bank, linked with Aadhaar and mobile number.',
    'other_scholarship', 'Not receiving any other scholarship.',
    'one_year_rule', 'Scholarship for any class is available for only one year; not payable twice for the same class; renewable on promotion.',
    'income_computation', jsonb_build_array(
      'Both parents working: combined income of both.',
      'Any other earning family member: income excluded.',
      'Only one parent alive: that parent''s income.',
      'Orphan supported by a guardian: income criteria does not apply.'
    ),
    'income_definition', 'Gross income from all sources, without any exemption or deduction available under the Income Tax Act.',
    'income_certificate', 'Taken once only, at admission to Class IX; valid for Class X too. For a salaried parent, income of the previous financial year is used.',
    'renewal_conditions', 'Award continues subject to good conduct and regularity in attendance; renewed for Class X after passing Class IX.',
    'self_declaration_income', 'Not acceptable. Self-declarations or affidavits of self-assessment of income are rejected.',
    'digilocker', 'DigiLocker integration is permitted for ST, family income and disability certificates.',
    'not_specified_officialy', array['Minimum percentage','Minimum age','Maximum age','Accepted file formats','Maximum file size'],
    'open_conflict', 'Report 7.8: the superseded 2012 guideline stated Rs. 2,00,000; the current guideline (2021-22 to 2025-26) states Rs. 2,50,000. Report 7.9: a linked "upward revision of annual parental income" circular could not be retrieved, so Rs. 2,50,000 stands as the guideline value only.'
  ),
  updated_at = now()
where e.scheme_id = (select id from public.schemes where scheme_code = 'BPVGK');

-- ---------------------------------------------------------------------------
-- 2c. BVOBC - Post-Matric Scholarship Scheme For ST Students
-- ---------------------------------------------------------------------------
update public.scheme_eligibility e set
  maximum_family_income = 250000,
  minimum_percentage = null,
  minimum_age = null,
  maximum_age = null,
  eligible_gender = null,
  eligible_categories = array['ST (Scheduled Tribe)'],
  eligible_course_levels = array['Class XI to Post Graduation (studies in India)'],
  eligible_course_types = array['Post-matriculation courses (Class 11 onwards)'],
  eligible_states = array['As per state/UT norms'],
  required_domicile = true,
  required_hosteller = false,
  qualifying_examination = array[
    'Matriculation or Higher Secondary or any higher examination of a recognized University or Board of Secondary Education'
  ],
  institution_requirement = array[
    'All Government Institutes/Colleges/Universities',
    'Institutions of National Importance',
    'Central/State universities, autonomous colleges recognized by UGC, and universities/colleges recognized under §2(f) and/or 12(B) of the UGC Act',
    'Deemed Universities',
    'Private Universities recognized by State/Centre with ''A'' level or equivalent NAAC/NBA accreditation',
    'Private Professional Institutions affiliated to a recognized Central/State University',
    'Schools/colleges recognized by Government or Government-aided, for Classes XI-XII',
    'Diploma-granting Institutions recognized by State/UT Governments',
    'Vocational Training Institutes affiliated to NCVT',
    'Institutions affiliated/approved by MCI/AICTE or any regulatory body established by State/Centre'
  ],
  other_rules = jsonb_build_object(
    'source_ref', 'post-matric-scholarship.pdf p.3-5 §3.2, §3.2.1, §3.2.2, §3.3; p.10 §5.b',
    'category_basis', 'Belong to the Scheduled Tribe as specified in relation to the Domicile State/UT.',
    'bank_account', 'Valid account in a Scheduled Bank linked with Aadhaar and mobile number, held in the student''s own name, active and non-dormant.',
    'other_scholarship', 'Not receiving any other scholarship. A scholar may hold only one scholarship/stipend at a time; if awarded another, the student chooses the more beneficial and informs the awarding authority through the Head of the Institution.',
    'top_class_exclusion', 'Students admitted from AY 2021-22 onwards to a notified Top Class Institute are not eligible for Post-Matric and receive the Top Class Scholarship instead. Students registered up to 2020-21 continue till course completion.',
    'different_stream_rule', 'A candidate who has completed a course in one stream is not eligible for a diploma/degree in a different stream.',
    'state_empanelment', 'The State empanels eligible institutes within and outside the State, maps courses to Groups I-IV, and shares the list with MoTA. Non-Government institutes are inspected in coordination with the destination State. Admission to a non-Government institute is allowed only in an empanelled institute.',
    'nirf_shift', 'States are to shift gradually towards institutions ranking high under NIRF.',
    'income_computation', jsonb_build_array(
      'Both parents working: combined income of both.',
      'Any other earning family member: income excluded.',
      'Only one parent alive: that parent''s income.',
      'Orphan supported by a guardian: income criteria does not apply.'
    ),
    'income_certificate', 'Taken once only at admission, valid for the entire duration of the course; a fresh income certificate is not required at renewal. Salaried parents: previous financial year.',
    'self_declaration_income', 'Not acceptable. Self-declarations or affidavits of self-assessment of income are rejected.',
    'deemed_hostel', 'Where the college cannot provide hostel accommodation, an approved place of residence may be treated as hostel with a certificate from the Head of the Institution; it must consist of accommodation hired by at least 5 students living together, usually with a common mess.',
    'not_specified_officialy', array['Minimum percentage','Minimum age','Maximum age','Accepted file formats','Maximum file size'],
    'open_conflict', 'Report 2.4: a State/NSP notice (J&K Directorate of Tribal Affairs 2026-27) requires PDF/JPG/JPEG of 150-200 KB. That is a State/NSP rule, not a central scheme rule, and is deliberately not stored as a scheme attribute.'
  ),
  updated_at = now()
where e.scheme_id = (select id from public.schemes where scheme_code = 'BVOBC');

-- ---------------------------------------------------------------------------
-- 2d. A023B - Top Class Education For ST Students
-- Income 800000 -> 600000; required_domicile true -> NULL (unsupported, report 3.2).
-- ---------------------------------------------------------------------------
update public.scheme_eligibility e set
  maximum_family_income = 600000,
  minimum_percentage = null,
  minimum_age = null,
  maximum_age = null,
  eligible_gender = null,
  eligible_categories = array['ST (Scheduled Tribe)'],
  eligible_course_levels = array['Graduate','Post Graduate'],
  eligible_course_types = array[
    'Notified graduate and post-graduate courses in institutions and courses approved by the Ministry of Tribal Affairs'
  ],
  eligible_states = null,
  required_domicile = null,
  required_hosteller = false,
  qualifying_examination = array[
    'Intermediate (12th standard) for Graduate level admission',
    'Graduation (Degree) for Post Graduate level admission'
  ],
  institution_requirement = array[
    'Notified institution, with a course approved by the Ministry of Tribal Affairs',
    'Admission secured on merit to the identified premier institute, verified by the Institute and the Ministry'
  ],
  other_rules = jsonb_build_object(
    'source_ref', 'national-fellowship-scholarship.pdf Part-B p.17-18 §2.1-§2.4; p.18 Note 2',
    'admission', 'Admission in a notified institution and a course approved by MoTA, taken on merit, verified by the Institute and the Ministry.',
    'course_duration', 'Graduate level duration is fixed by the Institute; Post Graduate level as per the Institute/course.',
    'other_scholarship', 'Not eligible for any other scholarship of the Centre/State for the same study.',
    'post_matric_duplication', 'Students admitted in notified institutions are not eligible for the Post-Matric Scholarship Scheme.',
    'management_quota', 'Students admitted in the management quota of a private Institute are not entitled to the scholarship.',
    'continuation', 'Once awarded, continues till completion of the course subject to satisfactory performance as certified by the Institute.',
    'no_slot_ceiling', 'No Institute-wise, State-wise or stream-wise ceiling on slots. MoTA selects and notifies the list of premier institutions.',
    'income_computation', 'The standard four rules, plus: for married candidates, spousal income is also added.',
    'income_certificate', 'Taken once at admission for courses continuing beyond one year, for the financial year immediately preceding the selection year. Form 16 accepted for salaried employees; otherwise a certificate from the State/UT designated authority. Income is gross; Income Tax Act deductions and exemptions do not apply.',
    'not_specified_officialy', array['Minimum percentage','Minimum age','Maximum age','Domicile requirement','Accepted file formats','Maximum file size'],
    'open_conflict', 'Report 7.1: notified-institution count is 252 in Annexure-I (07-10-2022 revision) vs 265 and 246 on tribal.nic.in. Report 7.2: no numeric annual ceiling in the current guideline vs 1,000 (superseded 2017) vs 3,211 selected for 2024-25. No count or ceiling is hard-coded here.'
  ),
  updated_at = now()
where e.scheme_id = (select id from public.schemes where scheme_code = 'A023B');

-- ---------------------------------------------------------------------------
-- 2e. ARG45 - National Fellowship for ST Students
-- Removes the fabricated "NET/JRF qualified" requirement (report 4.2, 8.1).
-- ---------------------------------------------------------------------------
update public.scheme_eligibility e set
  maximum_family_income = null,
  minimum_percentage = 55,
  minimum_age = null,
  maximum_age = 36,
  eligible_gender = array[
    'All',
    '30% of 750 awards (225) earmarked for female candidates'
  ],
  eligible_categories = array['ST (Scheduled Tribe)','PVTG (Particularly Vulnerable Tribal Groups)'],
  eligible_course_levels = array['M.Phil (2 years)','M.Phil + Ph.D (5 years)','Ph.D (5 years)'],
  eligible_course_types = array[
    'Regular and full-time M.Phil, M.Phil+Ph.D, or Ph.D research programmes'
  ],
  eligible_states = null,
  required_domicile = null,
  required_hosteller = false,
  qualifying_examination = array[
    'Post-graduation / Master Degree examination',
    'Minimum 55% marks at the final examination/grading at PG level'
  ],
  institution_requirement = array[
    'Universities/Institutes/Colleges under §2(f)/12(B) of the UGC Act',
    'Deemed Universities under Section 3 of the UGC Act, 1956, eligible for UGC grant-in-aid',
    'Universities/Institutes/Colleges receiving grants from Central/State Government',
    'Institutes of National Importance as notified by Ministry of Higher Education'
  ],
  other_rules = jsonb_build_object(
    'source_ref', 'national-fellowship-scholarship.pdf Part-A p.5-7 §2.1-§2.5; p.6-7 §2.5; p.7-8 §2.6, §2.6.1',
    'income_criterion', 'NONE. The guideline states: "There is no income criteria for eligibility in respect of this scholarship." Never use income as an ARG45 eligibility filter.',
    'course_tenure', jsonb_build_object(
      'M.Phil', '2 years, or date of submission of dissertation, whichever is earlier',
      'M.Phil + Ph.D', '2 + 3 = 5 years, or date of submission of dissertation, whichever is earlier',
      'Ph.D', '5 years, or date of submission of dissertation, whichever is earlier'
    ),
    'age_basis', 'Maximum age 36 years as on the first day of July of the relevant year of award.',
    'full_time', 'The research programme must be regular and full-time.',
    'other_fellowship', 'Research scholars must not hold any other fellowship or scholarship of the Union or a State Government for the same study.',
    'iit_aiims_iim_iiser_priority', 'Applicants with an offer of admission from IITs/AIIMS/IIMs/IISERs get priority and ST-Others slots are reduced proportionately. The student must state this in the application and upload the offer letter.',
    'divyangjan_requirement', 'Divyangjan applicants must produce a Disability Certificate certifying minimum 40% disability from the State/UT-designated authority.',
    'slot_cascade', 'If a sub-category is under-subscribed, unfilled slots go to the next priority category, then to ST research applicants not in any of the three categories on inter-se PG merit.',
    'hra_note', 'The fellowship is not conditioned on hostel status, but HRA is. A student provided hostel accommodation by the university is not eligible for HRA.',
    'not_specified_officialy', array['Domicile requirement'],
    'removed_unsupported_rule', 'The previous DB value "NET/JRF qualified or as per UGC norms" was fabricated and is not in the guideline. It has been removed.',
    'open_conflict', 'Report 7.3: the MoTA FAQ asks for Family Income and BPL certificates although the guideline sets no income criterion; those documents are kept but marked FAQ-sourced and non-gatekeeping. Report 7.4: the guideline allows M.Phil in any discipline, while the live portal restricts M.Phil to Psychiatric Social Work and Clinical Psychology. The guideline value is stored and the portal restriction is recorded, not silently resolved.'
  ),
  updated_at = now()
where e.scheme_id = (select id from public.schemes where scheme_code = 'ARG45');

-- ---------------------------------------------------------------------------
-- 2f. AZKMI - National Overseas Scholarship Scheme
-- Income 800000 -> 600000; domicile true -> NULL; states "Indian national" -> NULL.
-- Course-dependent ages are stored in scheme_criteria, not in maximum_age.
-- ---------------------------------------------------------------------------
update public.scheme_eligibility e set
  maximum_family_income = 600000,
  minimum_percentage = 55,
  minimum_age = null,
  maximum_age = null,
  eligible_gender = array[
    'All',
    '30% of 20 awards earmarked for female candidates; unutilised female slots open to eligible male candidates'
  ],
  eligible_categories = array['ST (Scheduled Tribe)','PVTG (Particularly Vulnerable Tribal Groups)'],
  eligible_course_levels = array['Masters (1 or 2 years)','Ph.D (4 years)','Post-Doctoral Research (2 years)'],
  eligible_course_types = array[
    'Post-graduate level only: Masters, Ph.D and Post-Doctoral Research abroad. Bachelor-level courses in any discipline are not covered.'
  ],
  eligible_states = null,
  required_domicile = null,
  required_hosteller = false,
  qualifying_examination = array[
    'Master''s Degree with 55% or equivalent, with awarded Ph.D - for Post-Doctoral Research',
    'Master''s Degree with 55% or equivalent - for Ph.D',
    'Bachelor''s Degree with 55% or equivalent - for Master''s'
  ],
  institution_requirement = array[
    'Reputed university abroad',
    'Admission at a top 1,000 QS World ranked institute (required for the award and for merit tier (a))'
  ],
  other_rules = jsonb_build_object(
    'source_ref', 'national-overseas-scholarship.pdf p.3-4 §2.2; p.6-7 §3.2 Note 1-3; p.7-8 §4.3',
    'level_of_study', 'Post-graduate level only. Bachelor-level courses in any discipline are not covered.',
    'qualification_basis', 'Qualification, marks and maximum age are as on 1 July of the selection year.',
    'course_dependent_ages', 'Maximum age is course-dependent: Master''s 32 years, Ph.D 35 years, Post-Doctoral Research 38 years. Stored in scheme_criteria; maximum_age is intentionally NULL because a single scalar cannot express it.',
    'marks_exemption', 'The marks criterion does not apply to candidates who have already obtained admission in a top 1,000 institute by QS World ranking (latest available report).',
    'one_child_one_award', 'Not more than one child of the same parents is eligible, and the candidate must furnish a self-certification to that effect. An individual is eligible for only one award and cannot be considered for any other award, or for the same/higher level of award, a second time.',
    'other_scholarship', 'A student considered for this scholarship is not entitled to any other scholarship of the Centre/State for the same study.',
    'income_computation', 'The standard four rules (both parents working: combined; other earning members excluded; only one parent alive: that parent; orphan supported by a guardian: income criteria does not apply). Income certificate taken once only at admission, valid for the entire duration of the course. Salaried parents: previous financial year.',
    'prospective_from', 'The scholarship is prospective from the date of issuance of the award letter. No reimbursement of fees already paid to the University or of insurance expenses. Maintenance and contingency allowance for the remaining financial year are pro-rated to the number of months.',
    'disbursement_channel', 'The Indian Embassy/Mission disburses the financial assistance to the Institute and the student; MoTA reimburses the Ministry of External Affairs.',
    'not_specified_officialy', array['Domicile requirement','Minimum age','Overall maximum age (it is course-dependent)'],
    'open_conflict', 'Report 7.5: the 07-10-2022 guideline says top 1,000 QS-ranked institutes while the MoTA FAQ references the top 10. The guideline value is applied. Report 7.6: the guideline gives Fine Arts a 2-slot allocation with Humanities/Social Science, while the FAQ does not list Fine Arts as a covered field. Report 7.7: the guideline period 2021-22 to 2025-26 has expired while the portal runs a 2026-27 cycle and no successor guideline was found.'
  ),
  updated_at = now()
where e.scheme_id = (select id from public.schemes where scheme_code = 'AZKMI');
