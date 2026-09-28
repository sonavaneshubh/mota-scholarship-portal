-- =============================================================================
-- Phase 4 : scheme_criteria - official rules that do not fit a scalar column
-- =============================================================================
-- 15 rows:
--   AZKMI maximum_age    3  (course-dependent: a single column cannot express this)
--   ARG45 slot_allocation 4 (Divyangjan / PVTG / Female / ST Others, total 750)
--   AZKMI field_allocation 4 (total 20)
--   BVOBC course_group   4  (Group I-IV official course mapping)
-- Idempotent: (scheme_id, criteria_type, criteria_key) is unique.
-- =============================================================================

delete from public.scheme_criteria
where scheme_id in (select id from public.schemes where scheme_code in ('BPVGK','BVOBC','A023B','ARG45','AZKMI'));

-- ---------------------------------------------------------------------------
-- AZKMI - course-dependent maximum age, as on 1 July of the selection year
-- national-overseas-scholarship.pdf p.3-4 §2.2
-- ---------------------------------------------------------------------------
insert into public.scheme_criteria
  (scheme_id, criteria_type, criteria_key, title, description, numeric_value, text_value, applies_to, source_ref)
select s.id, 'maximum_age', v.criteria_key, v.title, v.description, v.numeric_value, v.text_value, v.applies_to, v.source_ref
from (values
 ('masters','Maximum age for Master''s course',
  'Maximum age as on 1 July of the selection year. Qualification: 55% or equivalent in the relevant Bachelor''s Degree.',
  32::numeric,'55% or equivalent in the relevant Bachelor''s Degree','Masters (1 or 2 years)','national-overseas-scholarship.pdf p.3-4 §2.2'),
 ('phd','Maximum age for Ph.D course',
  'Maximum age as on 1 July of the selection year. Qualification: 55% or equivalent in the relevant Master''s Degree.',
  35::numeric,'55% or equivalent in the relevant Master''s Degree','Ph.D (4 years)','national-overseas-scholarship.pdf p.3-4 §2.2'),
 ('post_doctoral_research','Maximum age for Post-Doctoral Research',
  'Maximum age as on 1 July of the selection year. Qualification: 55% or equivalent in the relevant Master''s Degree, with awarded Ph.D.',
  38::numeric,'55% or equivalent in the relevant Master''s Degree, with awarded Ph.D','Post-Doctoral Research (2 years)','national-overseas-scholarship.pdf p.3-4 §2.2')
) as v(criteria_key,title,description,numeric_value,text_value,applies_to,source_ref)
cross join public.schemes s
where s.scheme_code = 'AZKMI';

-- ---------------------------------------------------------------------------
-- ARG45 - slot sub-categories and priority, out of 750 total awards
-- national-fellowship-scholarship.pdf p.6-7 §2.4
-- ---------------------------------------------------------------------------
insert into public.scheme_criteria
  (scheme_id, criteria_type, criteria_key, title, description, numeric_value, text_value, applies_to, source_ref)
select s.id, 'slot_allocation', v.criteria_key, v.title, v.description, v.numeric_value, v.text_value, v.applies_to, v.source_ref
from (values
 ('divyangjan','Divyangjan slots (priority 1)',
  '5% of 750. Divyangjan applicants must produce a Disability Certificate certifying minimum 40% disability from the State/UT-designated authority.',
  38::numeric,'5% of 750','All courses','national-fellowship-scholarship.pdf p.6-7 §2.4, p.6 Note-2'),
 ('pvtg','PVTG slots (priority 2)',
  'Particularly Vulnerable Tribal Groups as listed in Annexure-VIII.',
  25::numeric,null,'All courses','national-fellowship-scholarship.pdf p.6-7 §2.4, Annexure-VIII'),
 ('female','Female slots (priority 3)',
  '30% of 750. Unutilised female slots are open to eligible male candidates.',
  225::numeric,'30% of 750','All courses','national-fellowship-scholarship.pdf p.6-7 §2.4'),
 ('st_others','ST Others slots (priority 4)',
  'Residual slots. Reduced proportionately when a candidate with an offer of admission from IITs/AIIMS/IIMs/IISERs is given priority.',
  462::numeric,null,'All courses','national-fellowship-scholarship.pdf p.6-7 §2.4, §2.5(iv)')
) as v(criteria_key,title,description,numeric_value,text_value,applies_to,source_ref)
cross join public.schemes s
where s.scheme_code = 'ARG45';

-- ---------------------------------------------------------------------------
-- AZKMI - allocation by field of study, out of 20 awards
-- national-overseas-scholarship.pdf §3; separate merit list per field
-- Report 7.6: the guideline gives Fine Arts a 2-slot allocation together with
-- Humanities/Social Science, while the MoTA FAQ does not list Fine Arts as a
-- covered field. The guideline value is stored and the FAQ variant recorded.
-- ---------------------------------------------------------------------------
insert into public.scheme_criteria
  (scheme_id, criteria_type, criteria_key, title, description, numeric_value, text_value, applies_to, source_ref)
select s.id, 'field_allocation', v.criteria_key, v.title, v.description, v.numeric_value, v.text_value, v.applies_to, v.source_ref
from (values
 ('stem','STEM field allocation',
  'Separate merit list is drawn per field of study.',
  10::numeric,'Separate merit list per field','All course levels','national-overseas-scholarship.pdf §3'),
 ('management_economics_finance_law','Management, Economics, Finance and Law allocation',
  'Separate merit list is drawn per field of study.',
  4::numeric,'Separate merit list per field','All course levels','national-overseas-scholarship.pdf §3'),
 ('agriculture_medicine','Agriculture and Medicine allocation',
  'Separate merit list is drawn per field of study.',
  4::numeric,'Separate merit list per field','All course levels','national-overseas-scholarship.pdf §3'),
 ('humanities_social_science_fine_arts','Humanities, Social Science and Fine Arts allocation',
  'Separate merit list is drawn per field of study. Open conflict (report 7.6): the MoTA FAQ does not list Fine Arts as a separate covered field, whereas this guideline shares the 2-slot allocation with Humanities and Social Science. The guideline value is applied and the FAQ variant is recorded, not silently resolved.',
  2::numeric,'Separate merit list per field','All course levels','national-overseas-scholarship.pdf §3; report 7.6')
) as v(criteria_key,title,description,numeric_value,text_value,applies_to,source_ref)
cross join public.schemes s
where s.scheme_code = 'AZKMI';

-- ---------------------------------------------------------------------------
-- BVOBC - official course groups I-IV used for the fee and stipend components
-- post-matric-scholarship.pdf p.5 §3.4 Table 1
-- ---------------------------------------------------------------------------
insert into public.scheme_criteria
  (scheme_id, criteria_type, criteria_key, title, description, numeric_value, text_value, applies_to, source_ref)
select s.id, 'course_group', v.criteria_key, v.title, v.description, v.numeric_value, v.text_value, v.applies_to, v.source_ref
from (values
 ('group_i','Group I - degree and professional courses',
  'Graduate and Post Graduate courses leading to a degree; PG Diploma; MPhil; PhD; professional courses in various streams.',
  null::numeric,null,'Fee component and stipend','post-matric-scholarship.pdf p.5 §3.4 Table 1'),
 ('group_ii','Group II - non-professional degree courses',
  'All non-professional recognized courses leading to a Graduate/Post Graduate Degree not covered under Group I: Arts, Science, Commerce (BA/B.Sc/B.Com, MA/MSc/M.Com etc.).',
  null::numeric,null,'Fee component and stipend','post-matric-scholarship.pdf p.5 §3.4 Table 1'),
 ('group_iii','Group III - vocational and diploma courses',
  'Vocational stream, ITI courses, 3-year diploma courses in Polytechnics etc.',
  null::numeric,null,'Fee component and stipend','post-matric-scholarship.pdf p.5 §3.4 Table 1'),
 ('group_iv','Group IV - post-matriculation non-degree courses',
  'All post-matriculation level non-degree courses for which the entrance qualification is High School (Class X), e.g. senior secondary certificate (Class XI and XII).',
  null::numeric,null,'Fee component and stipend','post-matric-scholarship.pdf p.5 §3.4 Table 1')
) as v(criteria_key,title,description,numeric_value,text_value,applies_to,source_ref)
cross join public.schemes s
where s.scheme_code = 'BVOBC';
