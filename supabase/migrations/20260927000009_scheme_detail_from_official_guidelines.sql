-- =============================================================================
-- Scheme detail content, reconciled against the official MoTA guidelines
--
-- 20260927000008 created the structure for the detail view and seeded BVOBC
-- from figures that had been supplied informally. This migration replaces that
-- seed with content taken from the guideline PDFs themselves, and extends the
-- same treatment to the three other schemes that have a matching document.
-- A023B is deliberately left alone: no genuine guideline for it exists here.
--
-- -----------------------------------------------------------------------------
-- PROVENANCE
-- -----------------------------------------------------------------------------
-- Source documents (bundled, and linked from public.schemes.gr_url by
-- 20260927000005_populate_scheme_guideline_urls.sql):
--
--   BVOBC  /guidelines/post-matric-scholarship.pdf
--          "Post Matric Scholarship (Centrally Sponsored Scheme) for the
--           Students Belonging to Scheduled Tribe for Studies in India",
--           regulations applicable from 01-04-2022, 19 pages.
--   BPVGK  /guidelines/pre-matric-scholarship.pdf
--          "Guidelines Pre-Matric Scholarship for Scheduled Tribe Students
--           Studying in Classes IX & X [Centrally Sponsored Scheme]",
--           2021-22 to 2025-26, 12 pages.
--   ARG45  /guidelines/national-fellowship-scholarship.pdf
--          "National Fellowship & Scholarship for Higher Education of
--           Scheduled Tribe Students [Central Sector Scheme]",
--           2021-22 to 2025-26, Part-A, 38 pages.
--   AZKMI  /guidelines/national-overseas-scholarship.pdf
--          "Central-Sector Scholarship Scheme of National Overseas Scholarship
--           for ST Students", 2021-22 to 2025-26, 11 pages.
--
-- A023B (Top Class Education For ST Students) has no matching document. The
-- file originally offered for it is byte-identical to the National Fellowship
-- PDF (md5 087ffc34b4fdce61ab4b8f62d445fa35), so it is a copy of the ARG45
-- document and not an A023B guideline. Nothing in this migration touches A023B:
-- publishing ARG45's content under the A023B name would tell applicants they
-- are reading an official Top Class guideline when they are not.
--
-- One PDF covers two schemes. The ARG45 document contains Part-A (National
-- Fellowship, M.Phil/Ph.D) and Part-B (National Scholarship, the 252-institute
-- Top Class list). Only Part-A describes ARG45, so only Part-A is used here.
--
-- -----------------------------------------------------------------------------
-- CONFLICTS FOUND, AND HOW THEY WERE RESOLVED
-- -----------------------------------------------------------------------------
-- Every conflict below is between content seeded by 20260927000008 and the
-- guideline. The guideline is the official document for the same scheme, so it
-- wins; the conflict is recorded here rather than silently overwritten.
--
-- 1. BVOBC criterion "course progression must be linear" said a student
--    "cannot repeat the same level of study in a different stream". The
--    guideline (3.2.1) says something different: a candidate who has COMPLETED
--    a course in one stream is not eligible to take a diploma or degree in a
--    DIFFERENT stream. The old wording would have wrongly refused an
--    M.Phil holder who went on to a Ph.D in another subject.
--
-- 2. BVOBC criterion "must have passed Class X or equivalent" under-stated the
--    rule. The guideline (3.1.b) requires the applicant to have passed
--    Matriculation, Higher Secondary "or any higher examination" of a
--    recognized University or Board.
--
-- 3. BVOBC omitted three eligibility rules that gate real applications:
--    one scholarship/stipend at a time (3.2.2); the account must be in the
--    STUDENT'S own name rather than a parent's; and the Note-1 exclusion of
--    students admitted from 2021-22 onwards to a notified Top Class Institute,
--    who receive the Top Class Scholarship instead.
--
-- 4. BVOBC benefit group descriptions were paraphrases that mixed the fee
--    table (Table 1) with the stipend table (Table 2). They now carry the
--    guideline's own group definitions, plus the annual equivalents that
--    Table 2 prints alongside the monthly rates.
--
-- 5. BVOBC and BPVGK stipend/allowance rows omitted the annual figures and the
--    payment-duration conditions (10 months for scholarship, 12 months for the
--    disability allowance). Those are now stated instead of implied.
--
-- 6. BVOBC eligibility said nothing about the 40% disability question because
--    20260927000008 had removed it as unverified. The guideline confirms the
--    correct position: neither Post-Matric nor Pre-Matric states a minimum
--    percentage, it defers to the applicable Act. A 40% threshold DOES apply,
--    but only under ARG45, where it is written into the Divyangjan slot rules.
--    The two are now stated separately and correctly.
--
-- 7. ARG45 carries no income criterion at all ("There is no income criteria for
--    eligibility in respect of this scholarship"). The 6-lakh ceiling that
--    appears elsewhere in that same PDF belongs to Part-B, the Top Class
--    scholarship, not to the fellowship. max_income is therefore left NULL for
--    ARG45. Setting it would have turned a non-existent income bar into a
--    hard rejection in the applicant's pre-application eligibility check.
--
-- 8. AZKMI's age limit varies by course (38 / 35 / 32 as on 1 July of the
--    selection year) and cannot be expressed in a single max_age column
--    without either over-rejecting or under-rejecting candidates. max_age is
--    left NULL and the three course-specific limits are given as separate
--    criteria rows, so the applicant sees the real table.
--
-- -----------------------------------------------------------------------------
-- CURRENCY
-- -----------------------------------------------------------------------------
-- AZKMI pays in US dollars and pounds sterling, and the detail view formats
-- every numeric amount as rupees. Printing a foreign figure through the INR
-- formatter would label it wrongly, so AZKMI's amounts are recorded in the
-- coverage text with their currency and the numeric columns are left NULL
-- rather than holding a number that cannot be rendered correctly.
--
-- -----------------------------------------------------------------------------
-- ROW HANDLING
-- -----------------------------------------------------------------------------
-- scheme_eligibility, scheme_benefits, scheme_criteria and scheme_process_steps
-- are replaced wholesale for the four verified schemes. None of them is
-- referenced by a foreign key from another table, and they hold only
-- guideline-derived content, so replacing the rows is what makes this migration
-- produce exactly the verified set when it is re-run.
--
-- Their history is not uniform, which is why they are listed together:
-- scheme_eligibility, scheme_benefits and scheme_documents were created by
-- 20260927000000, while scheme_criteria and scheme_process_steps were added by
-- 20260927000008. 00008 is also what seeded the BVOBC eligibility, benefit,
-- criterion and document rows that the values below supersede, along with the
-- shared MoTA/NITA process steps that the per-scheme pipelines here replace.
--
-- scheme_documents is NOT deleted from. application_documents.scheme_document_id
-- references it ON DELETE CASCADE, so removing a row that applicants have
-- already uploaded against would destroy their files. Those rows are updated in
-- place by document name, and only genuinely absent documents are inserted.
--
-- Every figure below is transcribed from the pages named in the comments on
-- each block. Where a guideline prints a table whose layout the text layer does
-- not preserve, that is stated in the row rather than resolved by guessing.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 0. Preconditions
-- -----------------------------------------------------------------------------

do $$
declare
    missing text;
begin
    select string_agg(expected, ', ')
      into missing
      from unnest(array['BVOBC', 'BPVGK', 'ARG45', 'AZKMI']) as expected
     where not exists (
        select 1 from public.schemes s where s.scheme_code = expected
     );

    if missing is not null then
        raise exception
            'Cannot seed scheme detail: scheme codes missing from public.schemes: %',
            missing;
    end if;
end $$;

-- -----------------------------------------------------------------------------
-- 1. scheme_eligibility
--
-- The applicant-facing pre-check reads these columns, so each one is set to the
-- value the guideline actually states, including the deliberate NULLs described
-- in conflicts 7 and 8 above.
-- -----------------------------------------------------------------------------

delete from public.scheme_eligibility e
using public.schemes s
where e.scheme_id = s.id
  and s.scheme_code in ('BVOBC', 'BPVGK', 'ARG45', 'AZKMI');

-- BVOBC — post-matric, guideline 3.1, 3.2, Note 1 to Table 1.
insert into public.scheme_eligibility (
  scheme_id, academic_year, category_requirement, disability_requirement,
  max_age, min_percentage, max_income, income_period, residency_requirement,
  qualification_requirement, course_requirement, institution_requirement,
  attendance_requirement, admission_requirement, cap_requirement,
  other_conditions
)
select
  s.id, s.academic_year,
  'Scheduled Tribe (ST) as specified in relation to the domicile State or Union Territory.',
  'Disability must be as defined under the applicable Act and certified by a competent medical authority of the State Government or UT Administration. The allowance also applies to leprosy-cured students and to students with sickle cell anaemia or thalassemia, with the necessary certificate. No minimum disability percentage is stated.',
  null, null, 250000.00, 'per annum',
  'Domicile in the State or Union Territory that awards the scholarship. Studying outside the domicile State is allowed, but the application must record it and the destination institute is verified separately.',
  'Must have passed the Matriculation, Higher Secondary or any higher examination of a recognized University or Board of Secondary Education.',
  'A recognized post-matriculation or post-secondary course, in one of the ten institution categories listed in the guidelines, from Government senior secondary schools to recognized professional institutes.',
  'The institute must be recognized or empanelled by the State and hold a valid AISHE, U-DISE, NCVT or SCVT code. Private institutes must appear on the State-empanelled list shared with the Ministry portal.',
  'Regular attendance and satisfactory conduct, certified by the Head of the Institute. The Institute reports failure to progress or misconduct, on which the award may be stopped, withheld or cancelled.',
  'Admission confirmed by the Institute. The Institute verifies the admission, the course pursued and the fee structure applicable to the student.',
  'The fee component is fixed by the State Level Fee Fixation Committee. Ceiling on support for private-sector institutes: 2,50,000 per annum per student for Engineering, 6,00,000 per annum for MBBS/MS/MD, and 1,00,000 per annum for other courses. A State may award more and account for it separately.',
  'Not eligible: students admitted from 2021-22 onwards to a notified Top Class Institute, who receive the Top Class Scholarship instead; candidates who have completed a course in one stream and then take a diploma or degree in a different stream; and holders of more than one scholarship or stipend at a time. The income certificate is taken once at admission to the course and remains valid for the whole course, so it is not required again on renewal. Family income means gross income before tax deductions: the combined income of both parents counts, income of other earning relatives is excluded, a single living parent''s income is counted on its own, and the criterion does not apply to an orphan supported by a guardian. The revised guidelines apply to fresh admissions from 01-04-2022; students already enrolled keep the fee fixed at the time of admission.'
from public.schemes s
where s.scheme_code = 'BVOBC';

-- BPVGK — pre-matric, guideline 3.1 to 3.3.
insert into public.scheme_eligibility (
  scheme_id, academic_year, category_requirement, disability_requirement,
  max_age, min_percentage, max_income, income_period, residency_requirement,
  qualification_requirement, course_requirement, institution_requirement,
  attendance_requirement, admission_requirement, cap_requirement,
  other_conditions
)
select
  s.id, s.academic_year,
  'Scheduled Tribe (ST) as specified in relation to the domicile State or Union Territory.',
  'Disability must be as defined under the applicable Act and certified by a competent medical authority of the State Government or UT Administration. The allowance also applies to leprosy-cured students and to students with sickle cell anaemia or thalassemia, with the necessary certificate. No minimum disability percentage is stated.',
  null, null, 250000.00, 'per annum',
  'Domicile in the State or Union Territory that awards the scholarship. The award is made by the State or UT of domicile.',
  null,
  'A regular course of study in Class IX or Class X.',
  'A Government school, or a school recognized by the Central Government, CBSE or the State Board of Education.',
  'Regularity in attendance and good conduct, which the Institute must report for the award to be continued.',
  'Admission to Class IX or Class X in an eligible school.',
  null,
  'The income certificate must be taken at the time of admission to the class, in the same year as the admission, and is valid up to Class X. For a salaried parent the previous financial year''s income is used, so a fresh application for 2021-22 is decided on 2020-21 income. Family income means gross income before tax deductions, computed as for Post-Matric. Scholarship is payable for 10 months in an academic year, and the additional disability allowance for all 12 months. The award continues on renewal for Class X after the student passes Class IX. The award is cancelled and the amount recovered if the award was obtained by false statements.'
from public.schemes s
where s.scheme_code = 'BPVGK';

-- ARG45 — National Fellowship, Part-A, guidelines 2.1 to 2.6.
-- max_income is intentionally null: the guideline states there is no income
-- criterion for the fellowship.
insert into public.scheme_eligibility (
  scheme_id, academic_year, category_requirement, gender_requirement,
  disability_requirement, max_age, min_percentage, max_income, income_period,
  qualification_requirement, course_requirement, institution_requirement,
  other_conditions
)
select
  s.id, s.academic_year,
  'Scheduled Tribe (ST). PVTG and Divyangjan are priority sub-categories with reserved slots.',
  'No restriction on gender. 30% of the annual slots are reserved for female applicants.',
  'Applicants applying under the Divyangjan category must produce a Disability Certificate certifying a minimum of 40% disability, issued by the competent authority designated by the State or UT.',
  36, 55.00, null, null,
  'Must have passed the Post-graduation or Master''s degree examination with a minimum of 55% marks, or the equivalent grade, at the final examination at PG level.',
  'Regular, full-time M.Phil, integrated M.Phil plus Ph.D, or Ph.D research.',
  'A university or institute under section 2(f) and 12(B) of the UGC Act; a deemed university under section 3 of that Act that is eligible for UGC grant-in-aid; an institution receiving Central or State Government grants; or an Institute of National Importance notified by the Ministry of Higher Education.',
  'No income criterion applies to this fellowship. Tenure: 2 years for M.Phil, and 5 years for Ph.D or integrated M.Phil plus Ph.D. There are 750 fresh fellowships a year, allocated by priority as Divyangjan 38, PVTG 25, Female 225 and ST Others 462; unavailed slots carry forward, and applicants with an offer from an IIT, AIIMS, IIM or IISER are given priority from the ST Others category. The fellowship is effective from the year of selection, so no arrears are payable for an earlier part of the course. A research scholar may not hold any other fellowship or scholarship of the Union or a State Government for the same study. Leave: up to 30 days a year with the Head of the Department''s approval; maternity or paternity leave suspends payment and extends the tenure by the same period; a woman research scholar may take an intermittent break of up to 1 year, up to 3 times in the whole tenure; academic leave without fellowship is permitted once, for 1 year, in the whole tenure. Prior approval of the Institute is required for all leave. The rates are equal to UGC rates and change when UGC revises them.'
from public.schemes s
where s.scheme_code = 'ARG45';

-- AZKMI — National Overseas Scholarship, guidelines 2.2, 2.2(i), 3, 3.4.
-- max_age is intentionally null: the age limit is 38, 35 or 32 depending on the
-- course, and the three limits are carried as separate criteria rows instead.
insert into public.scheme_eligibility (
  scheme_id, academic_year, category_requirement, gender_requirement,
  max_age, min_percentage, max_income, income_period,
  qualification_requirement, course_requirement, institution_requirement,
  other_conditions
)
select
  s.id, s.academic_year,
  'Scheduled Tribe (ST). Up to 3 of the 20 annual awards are reserved for Particularly Vulnerable Tribal Groups.',
  'No restriction on gender. 30% of the awards are earmarked for female candidates, and unutilized female slots are open to eligible male candidates if enough female candidates are not available.',
  null, 55.00, 600000.00, 'per annum',
  '55% marks or the equivalent grade in the relevant qualifying degree, as set out per course in the criteria. The marks criterion does not apply to a candidate who already holds an admission from an institute in the QS World top 1,000 ranking.',
  'Postgraduate study abroad only: Master''s degree, Ph.D or Post-Doctoral Research. Bachelor-level courses in any discipline are not covered.',
  'A reputed university or institute abroad. The scheme is implemented through the Indian Embassies and Missions, and the awardee must secure admission and join a top 1,000 QS-ranked institute within 2 years of the award letter.',
  'Twenty awards are made each year: 17 for ST candidates and 3 for PVTG. Only one child of the same parents is eligible, the candidate self-certifies this, and an individual may hold only one award and cannot be considered again for the same or a higher level. Family income from all sources must not exceed 6,00,000 per annum, computed as gross income before tax deductions with other earning relatives excluded, only the surviving parent''s income counted where one parent has died, and no income criterion for an orphan supported by a guardian. The income certificate is taken once at admission and is valid for the whole course; for a salaried parent the previous financial year is used. Financial assistance lasts only for the prescribed duration, which is 1 or 2 years for a Master''s, 4 years for a Ph.D and 2 years for Post-Doctoral Research; a longer stay attracts no financial assistance other than the return air passage. The award is prospective from the award letter, so fees already paid are not reimbursed, while maintenance and contingency allowances are paid pro rata for the remainder of the financial year. The candidate may not change the course, the research or the institute, and is responsible for obtaining the visa. If the awardee studies in India because of a pandemic, natural calamity or war, or on a course field study, the maintenance allowance is paid at the JRF rate for a Master''s and the SRF rate for a Ph.D or Post-Doctoral under the National Fellowship scheme, the foreign rate is reduced proportionately for the time spent in India, and return airfare is allowed only once in the whole course.'
from public.schemes s
where s.scheme_code = 'AZKMI';

-- -----------------------------------------------------------------------------
-- 2. scheme_benefits
-- -----------------------------------------------------------------------------

delete from public.scheme_benefits b
using public.schemes s
where b.scheme_id = s.id
  and s.scheme_code in ('BVOBC', 'BPVGK', 'ARG45', 'AZKMI');

-- BVOBC — Table 1 (fee groups and private-sector ceiling) and Table 2
-- (stipend), plus the additional disability stipend.
insert into public.scheme_benefits (
  scheme_id, academic_year, benefit_type, benefit_group, description, coverage,
  amount_period, hosteller_amount, day_scholar_amount, amount_currency, conditions
)
select
  s.id, s.academic_year,
  v.benefit_type, v.benefit_group, v.description, v.coverage,
  v.amount_period, v.hosteller_amount, v.day_scholar_amount, v.amount_currency, v.conditions
from public.schemes s
cross join (values
  (
    'tuition_and_compulsory_fees', null::text,
    'Tuition and other compulsory non-refundable fees',
    'Paid as per the fee structure fixed by the State Level Fee Fixation Committee. For private-sector institutes, support from the Government of India is capped at 2,50,000 per annum per student for Engineering courses, 6,00,000 per annum for MBBS, MS and MD courses, and 1,00,000 per annum for other courses. A State or UT Administration may award more than the ceiling and account for the excess separately in the State portal.',
    'per annum', null::numeric, null::numeric, 'INR',
    'The revised guidelines apply prospectively to students taking fresh admission on or after 01-04-2022.'
  ),
  (
    'monthly_stipend', 'I',
    'Group I — graduate and post graduate courses leading to a Degree, PG Diploma, MPhil or PhD in professional courses in various streams',
    'Hostellers 1,200 per month, 12,000 per annum. Day scholars 550 per month, 5,500 per annum.',
    'per month', 1200.00, 550.00, 'INR',
    'Payable from 1 April or the month of admission, whichever is later, up to the month the annual examinations are completed, for a maximum of 10 months in an academic year. On renewal it is paid from the month after the month up to which it was paid in the previous year. The stipend is an incentive and is not a reimbursement of boarding, lodging, mess or hostel charges.'
  ),
  (
    'monthly_stipend', 'II',
    'Group II — all non-professional recognized courses leading to a graduate or post graduate degree not covered under Group I, in Arts, Science and Commerce, such as BA, B.Sc, B.Com, MA, MSc or M.Com',
    'Hostellers 820 per month, 8,200 per annum. Day scholars 530 per month, 5,300 per annum.',
    'per month', 820.00, 530.00, 'INR',
    'Payable for a maximum of 10 months in an academic year. The stipend is an incentive and is not a reimbursement of boarding, lodging, mess or hostel charges.'
  ),
  (
    'monthly_stipend', 'III',
    'Group III — vocational stream, ITI courses and 3-year diploma courses in Polytechnics and similar institutions',
    'Hostellers 570 per month, 5,700 per annum. Day scholars 300 per month, 3,000 per annum.',
    'per month', 570.00, 300.00, 'INR',
    'Payable for a maximum of 10 months in an academic year. The stipend is an incentive and is not a reimbursement of boarding, lodging, mess or hostel charges.'
  ),
  (
    'monthly_stipend', 'IV',
    'Group IV — all post-matriculation level non-degree courses for which the entrance qualification is High School (Class X), such as the senior secondary certificate in Class XI and Class XII',
    'Hostellers 380 per month, 3,800 per annum. Day scholars 230 per month, 2,300 per annum.',
    'per month', 380.00, 230.00, 'INR',
    'Payable for a maximum of 10 months in an academic year. The stipend is an incentive and is not a reimbursement of boarding, lodging, mess or hostel charges.'
  ),
  (
    'disability_allowance', null::text,
    'Additional disability stipend',
    'In addition to the stipend for the student''s group: hostellers 800 per month, 9,600 per annum; day scholars 600 per month, 7,200 per annum.',
    'per month', 800.00, 600.00, 'INR',
    'For a Divyangjan student whose disability is as defined under the applicable Act and certified by a competent medical authority of the State Government or UT Administration. Also payable to leprosy-cured students and to students with sickle cell anaemia or thalassemia, with the necessary certificate. The guidelines state no minimum disability percentage.'
  )
) as v (benefit_type, benefit_group, description, coverage, amount_period,
       hosteller_amount, day_scholar_amount, amount_currency, conditions)
where s.scheme_code = 'BVOBC';

-- BPVGK — Table 2 of the pre-matric guidelines.
insert into public.scheme_benefits (
  scheme_id, academic_year, benefit_type, benefit_group, description, coverage,
  amount_period, hosteller_amount, day_scholar_amount, amount_currency, conditions
)
select
  s.id, s.academic_year,
  v.benefit_type, v.benefit_group, v.description, v.coverage,
  v.amount_period, v.hosteller_amount, v.day_scholar_amount, v.amount_currency, v.conditions
from public.schemes s
cross join (values
  (
    'monthly_scholarship', null::text,
    'Scholarship for classes IX and X',
    'Hostellers 525 per month, 5,250 per annum. Day scholars 225 per month, 2,250 per annum.',
    'per month', 525.00, 225.00, 'INR',
    'Payable for 10 months in each academic year.'
  ),
  (
    'books_and_ad_hoc_grant', null::text,
    'Books and ad hoc grant',
    'Hostellers 1,000. Day scholars 750.',
    'per annum', 1000.00, 750.00, 'INR',
    'Table 2 of the guidelines prints a single figure per residence category for this item, without the monthly and annual sub-columns used for the scholarship row, so it is recorded here as a grant for the academic year rather than a monthly rate.'
  ),
  (
    'disability_allowance', null::text,
    'Additional disability allowance',
    'Hostellers 800 per month, 9,600 per annum. Day scholars 600 per month, 7,200 per annum.',
    'per month', 800.00, 600.00, 'INR',
    'In addition to the scholarship above, for a Divyangjan student whose disability is as defined under the applicable Act and certified by a competent medical authority of the State Government or UT Administration. Also payable to leprosy-cured students and to students with sickle cell anaemia or thalassemia, with the necessary certificate. Paid for all 12 months of the year. The guidelines state no minimum disability percentage.'
  )
) as v (benefit_type, benefit_group, description, coverage, amount_period,
       hosteller_amount, day_scholar_amount, amount_currency, conditions)
where s.scheme_code = 'BPVGK';

-- ARG45 — the Part-A value of fellowship table. Each course and stream is its
-- own row because the rates differ by discipline, not by residence, so the
-- hosteller and day-scholar columns are not used here.
insert into public.scheme_benefits (
  scheme_id, academic_year, benefit_type, benefit_group, description, coverage,
  amount_period, hosteller_amount, day_scholar_amount, amount_currency, conditions
)
select
  s.id, s.academic_year,
  v.benefit_type, v.benefit_group, v.description, v.coverage,
  v.amount_period, null::numeric, null::numeric, v.amount_currency, v.conditions
from public.schemes s
cross join (values
  (
    'fellowship_stipend_mphil_humanities', 'M.Phil — Humanities and Social Sciences',
    'Monthly fellowship for M.Phil in Humanities and Social Sciences',
    '31,000 per month.',
    'per month', 'INR',
    'Tenure 2 years for M.Phil.'
  ),
  (
    'fellowship_stipend_mphil_science', 'M.Phil — Science, Engineering and Technology',
    'Monthly fellowship for M.Phil in Science, Engineering and Technology',
    '12,000 per month.',
    'per month', 'INR',
    'Tenure 2 years for M.Phil.'
  ),
  (
    'fellowship_stipend_phd_humanities', 'Ph.D — Humanities and Social Sciences',
    'Monthly fellowship for Ph.D in Humanities and Social Sciences',
    '31,000 per month for the first two years, then 35,000 per month for the remaining three years.',
    'per month', 'INR',
    'Tenure 5 years for Ph.D.'
  ),
  (
    'fellowship_stipend_phd_science', 'Ph.D — Science, Engineering and Technology',
    'Monthly fellowship for Ph.D in Science, Engineering and Technology',
    '25,000 per month.',
    'per month', 'INR',
    'Tenure 5 years for Ph.D.'
  ),
  (
    'contingency_allowance_mphil', 'M.Phil',
    'Annual contingency allowance for M.Phil',
    '10,000 per annum.',
    'per annum', 'INR',
    'Paid in addition to the monthly fellowship.'
  ),
  (
    'contingency_allowance_phd', 'Ph.D',
    'Annual contingency allowance for Ph.D',
    '20,500 per annum.',
    'per annum', 'INR',
    'Paid in addition to the monthly fellowship.'
  ),
  (
    'hra_allowance', null::text,
    'House rent allowance',
    'Equal to the UGC rate for the city category, that is 8%, 16% or 24%, payable monthly.',
    'per month', 'INR',
    'Not available where the university provides hostel accommodation: in that case only the hostel fees charged by the university are payable, mess, electricity and water charges are not, and a certificate to that effect must be furnished through the Registrar, Director or Principal. Where the student arranges accommodation, the allowance follows the Government of India city categorisation. The rate changes when UGC revises it.'
  ),
  (
    'escort_allowance_divyangjan', null::text,
    'Escort allowance for Divyangjan scholars',
    '2,000 per month, at par with the UGC rate.',
    'per month', 'INR',
    'For a research scholar in the Divyangjan category, whose disability must be certified at a minimum of 40% by the competent authority designated by the State or UT.'
  )
) as v (benefit_type, benefit_group, description, coverage, amount_period,
       amount_currency, conditions)
where s.scheme_code = 'ARG45';

-- AZKMI — the nine scholarship components. The figures are in US dollars and
-- pounds sterling and the amounts are paid on actuals, so the numeric columns
-- are left null and the coverage text carries the figure and its currency.
insert into public.scheme_benefits (
  scheme_id, academic_year, benefit_type, benefit_group, description, coverage,
  amount_period, hosteller_amount, day_scholar_amount, amount_currency, conditions
)
select
  s.id, s.academic_year,
  v.benefit_type, v.benefit_group, v.description, v.coverage,
  v.amount_period, null::numeric, null::numeric, v.amount_currency, v.conditions
from public.schemes s
cross join (values
  (
    'annual_maintenance_allowance', null::text,
    'Annual maintenance allowance',
    'USD 15,400 per annum in the United States, and GBP 9,900 per annum in the United Kingdom, for all course levels. The US dollar rate or its equivalent applies in other countries.',
    'per annum', 'USD',
    'Paid pro rata for the remainder of the financial year in which the award letter is issued, then for the full year while the award continues. Where the awardee studies in India because of a pandemic, natural calamity, war, or for a course field study, this is paid at the JRF rate for a Master''s and the SRF rate for a Ph.D or Post-Doctoral under the National Fellowship scheme, and the foreign rate is reduced proportionately for the time spent in India.'
  ),
  (
    'annual_contingency_equipment_allowance', null::text,
    'Annual contingency and equipment allowance',
    'USD 1,532 per annum in the United States, and GBP 1,116 per annum in the United Kingdom, towards books, essential apparatus, study tours, and typing and binding of the thesis. The US dollar rate or its equivalent applies in other countries.',
    'per annum', 'USD',
    'Paid pro rata in the year the award letter is issued.'
  ),
  (
    'poll_tax', null::text,
    'Poll tax',
    'Actuals paid, wherever applicable.',
    'as per actuals', 'INR',
    null
  ),
  (
    'visa_fees', null::text,
    'Visa fees',
    'Actual visa fees, paid in Indian rupees.',
    'as per actuals', 'INR',
    'The candidate is responsible for obtaining the appropriate visa for the country of study.'
  ),
  (
    'incidental_journey_expenses', null::text,
    'Incidental journey expenses',
    'Up to USD 20, or its equivalent in Indian rupees.',
    'as per actuals', 'USD',
    null
  ),
  (
    'tuition_and_non_refundable_fees', null::text,
    'Tuition and other non-refundable fees',
    'Tuition fees and other non-refundable fees that the student must compulsorily pay to complete the course, paid as per actuals.',
    'as per actuals', 'INR',
    'Paid from the date of the award letter. Fees already paid before the award letter are not reimbursed.'
  ),
  (
    'medical_insurance_premium', null::text,
    'Medical insurance premium',
    'The actual premium charged, paid as per actuals.',
    'as per actuals', 'INR',
    'The Indian Embassy or Mission in the country concerned examines whether the premium claimed is reasonable.'
  ),
  (
    'cost_of_air_passage', null::text,
    'Cost of air passage',
    'Air passage on actual basis from India to the nearest place to the educational institution and back, by economy class and the shortest route at the best available price.',
    'as per actuals', 'INR',
    'Available on the way back if the awardee decides to return to India on completing the course. Where the awardee studies in India during the course, to and fro airfare is allowed only once in the whole duration.'
  ),
  (
    'local_travel', null::text,
    'Local travel',
    'Second class railway fare from the port of disembarkation to the place of study and back. For far-flung places not connected by rail: bus fare from the place of residence to the nearest railway station, the actual charge of a ferry crossing, and air fare to the nearest rail-cum-air station.',
    'as per actuals', 'INR',
    null
  )
) as v (benefit_type, benefit_group, description, coverage, amount_period,
       amount_currency, conditions)
where s.scheme_code = 'AZKMI';

-- -----------------------------------------------------------------------------
-- 3. scheme_criteria
--
-- source_text keeps the guideline wording beside the plain-language label, so a
-- later edit can be traced back to the paragraph it came from.
-- -----------------------------------------------------------------------------

delete from public.scheme_criteria c
using public.schemes s
where c.scheme_id = s.id
  and s.scheme_code in ('BVOBC', 'BPVGK', 'ARG45', 'AZKMI');

insert into public.scheme_criteria (
  scheme_id, criterion_order, label, detail, is_mandatory, source_text
)
select
  s.id, v.criterion_order, v.label, v.detail, v.is_mandatory, v.source_text
from (values
  -- BVOBC
  ('BVOBC', 1, 'Must be Scheduled Tribe in the domicile State or UT',
   'The applicant must belong to a Scheduled Tribe as specified in relation to the State or Union Territory of domicile, supported by a valid ST certificate.',
   true, '3.1(a) The applicant should belong to Scheduled Tribe (ST) community as specified in relation to the Domicile State/UT.'),
  ('BVOBC', 2, 'Must have passed Matriculation, Higher Secondary or a higher examination',
   'From a recognized University or Board of Secondary Education, and must have the marks for the last qualifying examination available.',
   true, '3.1(b) The applicant should have passed the Matriculation or Higher Secondary or any higher examination of a recognized University or Board of Secondary Education.'),
  ('BVOBC', 3, 'Family annual income must not exceed 2,50,000',
   'Total family income from all sources must be 2,50,000 or less per annum, as gross income before tax deductions. The certificate is taken once at admission to the course and stays valid for the whole course.',
   true, '3.1(c) The family income of student from all sources should not exceed Rs.2.50 lakh per annum.'),
  ('BVOBC', 4, 'Must hold an active bank account in the applicant''s own name',
   'A valid account in a Scheduled Bank, linked with Aadhaar and the mobile number, held in the student''s own name for direct benefit transfer.',
   true, '3.1(d) The applicant should have a valid account in a Schedule Bank linked with Aadhar and Mobile number.'),
  ('BVOBC', 5, 'Must not be receiving any other scholarship',
   'The applicant cannot be in receipt of any other scholarship at the same time.',
   true, '3.1(e) The applicant should not be getting any other scholarship.'),
  ('BVOBC', 6, 'Must be studying a recognized post-matriculation course',
   'At an institution in one of the categories recognized by the guidelines, holding a valid AISHE, U-DISE, NCVT or SCVT code, and empanelled by the State where it is not a Government institution.',
   true, '3.1(f) The applicant should be studying in a recognized post-matriculation/post-secondary course in an institution from one of the categories listed in the guidelines.'),
  ('BVOBC', 7, 'Must pursue only one stream of study',
   'A candidate who has completed a course in one stream is not eligible to take a diploma or degree course in a different stream. Continuing into a higher qualification in the same stream is unaffected.',
   true, '3.2.1 Candidates who complete a course in one stream will not be eligible to take diploma/degree course of different stream.'),
  ('BVOBC', 8, 'Must hold only one scholarship or stipend at a time',
   'Where an applicant is already in receipt of another scholarship or stipend, the choice between them must be communicated to the awarding authority through the Head of the Institute.',
   true, '3.2.2 The candidates can hold only one scholarship or stipend at any time and if they are in receipt of more than one, they should indicate the choice to the awarding authority through the Head of the Institution.'),
  ('BVOBC', 9, 'Must not be a Top Class Institute admittee from 2021-22 onwards',
   'Students admitted from academic year 2021-22 to a notified Top Class Institute receive the Top Class Scholarship and are not eligible under this scheme. Students admitted before 2021-22 continue under these guidelines until they complete the course.',
   true, 'Note 1 to Table 1: students pursuing courses in Top Class Institutes will not be entitled for benefit under the Post Matric Scholarship Scheme, and new students from the academic year 2021-22 are registered under the Top Class scheme.'),

  -- BPVGK
  ('BPVGK', 1, 'Must be Scheduled Tribe in the domicile State or UT',
   'The applicant must belong to a Scheduled Tribe as specified in relation to the State or Union Territory of domicile, supported by a valid ST certificate.',
   true, '3.1(a) The applicant should belong to Scheduled Tribe (ST) community as specified in relation to the Domicile State/UT.'),
  ('BPVGK', 2, 'Must study in Class IX or Class X',
   'A regular course of study in Class IX, or in Class X on renewal after passing Class IX.',
   true, 'The scheme covers students studying in classes IX and X.'),
  ('BPVGK', 3, 'Must study in a Government or recognized school',
   'A Government school, or one recognized by the Central Government, CBSE, or the State Board of Education.',
   true, 'The applicant should be studying in a Government school or a school recognized by the Government/CBSE/State Board.'),
  ('BPVGK', 4, 'Family annual income must not exceed 2,50,000',
   'Total family income from all sources must be 2,50,000 or less per annum, as gross income before tax deductions. The certificate is taken at the time of admission, in the same year as the admission, and is valid up to Class X.',
   true, 'The family income of the student from all sources should not exceed Rs.2.50 lakh per annum.'),
  ('BPVGK', 5, 'Must hold an active bank account for direct benefit transfer',
   'A valid account in a Scheduled Bank linked with Aadhaar and the mobile number, so the scholarship can be credited by direct benefit transfer.',
   true, 'The applicant should have a valid account in a Schedule Bank linked with Aadhar and Mobile number.'),
  ('BPVGK', 6, 'Must not be receiving any other scholarship',
   'The applicant cannot be in receipt of any other scholarship at the same time.',
   true, 'The applicant should not be getting any other scholarship.'),
  ('BPVGK', 7, 'Must not have already taken the award for the same class',
   'Scholarship is for one academic year in a class, so it is not repeatable in the same class. It is renewed for Class X after the student passes Class IX, subject to good conduct and regular attendance.',
   true, '3.5(II) The award once made will continue subject to good conduct and regularity in attendance. It will be renewed for Class X after the student passes class IX.'),

  -- ARG45
  ('ARG45', 1, 'Must be Scheduled Tribe and have passed the Master''s degree',
   'The fellowship is for ST students who have passed the post-graduation or Master''s degree examination, for pursuing M.Phil or Ph.D.',
   true, '2. The fellowship under the scheme will be for pursuing MPhil, Ph.D by those ST students who have passed the Post-graduation/Master Degree examination.'),
  ('ARG45', 2, 'Must have scored a minimum of 55% at the final PG examination',
   'Minimum 55% marks, or the equivalent grade, in the final examination at post-graduation level.',
   true, '2.1(ii) The candidates should have minimum 55% marks at the final examination/grading at PG level.'),
  ('ARG45', 3, 'Must be 36 years of age or younger',
   'Maximum 36 years as on the first day of July of the relevant year of award of the fellowship.',
   true, '2.3 Maximum 36 years, as on first day of July of the relevant year of the award of scholarship.'),
  ('ARG45', 4, 'Must hold a regular, full-time M.Phil or Ph.D admission',
   'In a university or institute within the categories the guidelines cover, and on a full-time basis. Duration is 2 years for M.Phil, 5 years for Ph.D, and 2 plus 3 for integrated M.Phil and Ph.D, or the date of submission of the dissertation, whichever is earlier.',
   true, '2.1 Course Duration; 2.4 Universities/Institutions covered under the scheme.'),
  ('ARG45', 5, 'There is no income criterion for this fellowship',
   'The guidelines state expressly that no income criterion applies to eligibility for the fellowship, so no family income limit is applied.',
   true, '2.2 Income Criteria: There is no income criteria for eligibility in respect of this scholarship.'),
  ('ARG45', 6, 'Must not hold any other fellowship or scholarship for the same study',
   'A research scholar under this scheme is not eligible for any other fellowship or scholarship of the Union or a State Government for the same study, and must obtain a no-objection certificate to that effect from the Institute.',
   true, '2.6.1 Note 1: The research scholars considered eligible for the fellowship under the scheme shall not be eligible for any other fellowship/scholarship of the Union or State Government for the same study.'),
  ('ARG45', 7, 'Divyangjan applicants need a disability certificate of at least 40%',
   'Required only if applying under the Divyangjan category, which has 38 of the 750 annual slots. The certificate must be issued by the competent authority designated by the State or UT.',
   true, '2.5 Note-2: The students applying as Divyangjan should produce the Disability Certificate, certifying minimum 40% disability, issued by the competent authority designated by respective State/UT.'),
  ('ARG45', 8, 'Must submit the joining report within one month of the award letter',
   'The scholar takes admission and submits the joining report to the Ministry within 1 month of the provisional award letter, along with the signed checklist, the refund receipt if another award was availed, and the no-objection certificate. Failing to join within that period cancels the award.',
   true, '3.8 Completion of formalities by scholar and Institute (Ph.D/M.Phil).'),
  ('ARG45', 9, 'IIT, AIIMS, IIM and IISER admits must upload the offer letter',
   'Where the applicant holds an offer of admission from an IIT, AIIMS, IIM or IISER, the offer letter must be uploaded with the application, and preference is given to such applicants.',
   true, '2.5(iv) and 3.3: preference will be given to those students who have secured offer of admission from AIIMS/IITs/IIMs/IISERs.'),

  -- AZKMI
  ('AZKMI', 1, 'Master''s degree: 55% in the relevant Bachelor''s degree, and 32 years of age or younger',
   'Maximum age is 32 years as on 1 July of the selection year.',
   true, '2.2(i) Course 3 Master''s: 55% marks or equivalent grade in relevant Bachelor''s Degree. Maximum Age 32 years.'),
  ('AZKMI', 2, 'Ph.D: 55% in the relevant Master''s degree, and 35 years of age or younger',
   'Maximum age is 35 years as on 1 July of the selection year.',
   true, '2.2(i) Course 2 Ph.D: 55% marks or equivalent grade in relevant Master''s Degree. Maximum Age 35 years.'),
  ('AZKMI', 3, 'Post-Doctoral Research: 55% in the relevant Master''s degree with an awarded Ph.D, and 38 years of age or younger',
   'Maximum age is 38 years as on 1 July of the selection year.',
   true, '2.2(i) Course 1 Post-Doctoral Research: 55% marks or equivalent grade in relevant Master''s Degree with awarded Ph.D. Maximum Age 38 years.'),
  ('AZKMI', 4, 'The 55% requirement does not apply to top 1,000 QS-ranked institute admits',
   'A candidate who already holds an admission from an institute in the QS World top 1,000 ranking of the latest available report is not required to meet the marks criterion.',
   true, 'Note to 2.2(i): The criteria of marks obtained in Bachelor''s/Master''s Degree will not apply to those candidates who have already obtained admissions in top 1,000 Institutes as QS World ranking of the latest available report.'),
  ('AZKMI', 5, 'Must be studying a postgraduate course abroad',
   'Master''s degree, Ph.D or Post-Doctoral Research, in a reputed university abroad. Bachelor-level courses in any discipline are not covered by the scheme.',
   true, '2.1(i) Financial assistance is provided for pursuing post graduate courses (Masters, Ph.D and Post-Doctoral Research) in reputed universities across the world. Bachelor level courses in any discipline are not covered.'),
  ('AZKMI', 6, 'Only one child per family, and only one award ever',
   'Not more than one child of the same parents is eligible, and the candidate must furnish a self-certification to that effect. An individual is eligible for only one award and cannot be considered again for the same or a higher level under the scheme.',
   true, '2.2(ii) Not more than one child of the same parents will be eligible and the candidate has to furnish a self-certification to this effect. An individual is eligible for only one award and cannot be considered for any other award or same/higher level of award for the second time.'),
  ('AZKMI', 7, 'Family annual income must not exceed 6,00,000',
   'Total family income from all sources must not exceed 6,00,000 per annum, as gross income before tax deductions, excluding income of other earning relatives. The certificate is taken once at admission and is valid for the whole course.',
   true, '2.2(iii) Scholarships will be paid to the students whose family income from all sources does not exceed Rs.6,00,000/- per annum.'),
  ('AZKMI', 8, 'Must not be receiving any other scholarship for the same study',
   'A candidate once considered for this scholarship is not entitled to any other scholarship of the Central or a State Government for the same study.',
   true, '3.2 Note 2: The Students once considered for scholarship shall not be entitled for any other scholarship of the Centre/State Govt for the same study.'),
  ('AZKMI', 9, 'Must register on the NOSP portal and on Digi Locker',
   'Registration on the National Overseas Scholarship Portal at overseas.tribal.gov.in and on Digi Locker is required before applying, Aadhaar is mandatory, and documents must be uploaded through Digi Locker.',
   true, '4.2 Registration process: candidates are required to register themselves on the NOSP and on Digi Locker. Aadhaar is mandatory for registration on portal.'),
  ('AZKMI', 10, 'Must join a top 1,000 QS-ranked institute within 2 years of the award letter',
   'The finally selected candidate must secure admission and join an institute in the QS World top 1,000 abroad within 2 years of the communication of the award letter. On expiry the award is cancelled and the slot carries over to the next selection year.',
   true, '4.4 Note: The finally selected candidates will be required to secure admission and join in one of the top 1,000 ranked foreign Institutes/Universities abroad within 2 years from the date of communication of Award Letter.')
) as v (scheme_code, criterion_order, label, detail, is_mandatory, source_text)
join public.schemes s on s.scheme_code = v.scheme_code
on conflict (scheme_id, criterion_order) do update
set label = excluded.label,
    detail = excluded.detail,
    is_mandatory = excluded.is_mandatory,
    source_text = excluded.source_text;

-- -----------------------------------------------------------------------------
-- 4. scheme_process_steps
--
-- These replace the shared MoTA/NITA pipeline seeded by 20260927000008 with the
-- pipeline each guideline actually describes, and are marked verified for that
-- reason. A023B keeps its unverified placeholder steps: there is still no
-- document to verify them against, and the admin warning that renders for
-- unverified steps is the honest signal.
-- -----------------------------------------------------------------------------

delete from public.scheme_process_steps p
using public.schemes s
where p.scheme_id = s.id
  and s.scheme_code in ('BVOBC', 'BPVGK', 'ARG45', 'AZKMI');

insert into public.scheme_process_steps (
  scheme_id, step_number, title, description, actor, is_verified
)
select
  s.id, v.step_number, v.title, v.description, v.actor, true
from (values
  -- BVOBC
  ('BVOBC', 1, 'Register and apply online',
   'The applicant registers on the State or Union Territory online platform, or on the National Scholarship Portal, fills the application and uploads the required documents. Where the study is outside the domicile State, the application must say so.',
   'Student'),
  ('BVOBC', 2, 'Institute verifies the application, first level',
   'The Institute Nodal Officer checks the application against the institute''s own records and the physical documents, and can verify, reject or mark it defective with a reason. The institute must hold a valid AISHE, U-DISE, NCVT or SCVT code to register.',
   'Institute Nodal Officer'),
  ('BVOBC', 3, 'District and State verification, second and third levels',
   'The district and then the State nodal officer verify the certified application and can verify, mark defective or reject it with a reason, monitoring pendency so that scrutiny is timely.',
   'District and State Nodal Officers'),
  ('BVOBC', 4, 'Ministry oversight and scheme configuration',
   'The Ministry monitors overall progress, issues the guidelines, and provides the PFMS bank configuration and portal support for the scheme.',
   'Ministry of Tribal Affairs'),
  ('BVOBC', 5, 'Disbursal by direct benefit transfer',
   'PFMS releases the sanctioned amount by DBT. The State may route the whole amount to the student, or the tuition fee to the institute and the stipend to the student. A non-Government institute may not demand the fee from the student while a disbursal is delayed.',
   'State Government and PFMS'),

  -- BPVGK
  ('BPVGK', 1, 'Register and apply on the State or UT platform',
   'The applicant registers on the online platform of the State or Union Territory, or on the National Scholarship Portal if the State opts for it, and applies with the required documents for disbursement by DBT into the student''s bank account.',
   'Student'),
  ('BPVGK', 2, 'Institute checks the application and documents',
   'The institute obtains and checks the documents listed in the guidelines. An applicant who has stated wrong facts or misrepresented them becomes ineligible and is liable to be debarred from the scheme.',
   'School and institute'),
  ('BPVGK', 3, 'State verification of the certified application',
   'The State or Union Territory scrutinises the application and the certified documents before the award is sanctioned. Applicants are advised to check the institute name, bank details, mobile number and SMS carefully at registration and to follow up on defects.',
   'State / UT Scholarship Nodal Officer'),
  ('BPVGK', 4, 'Disbursal by direct benefit transfer',
   'The scholarship for 10 months, the books and ad hoc grant, and the additional disability allowance for 12 months are credited by DMT-style direct benefit transfer to the student''s own bank account.',
   'State / UT and PFMS'),
  ('BPVGK', 5, 'Renewal for Class X',
   'The award continues subject to good conduct and regular attendance, and is renewed for Class X after the student passes Class IX. The student must keep the same mobile number until the course ends, and update the portal if it changes.',
   'Student, school and State / UT'),

  -- ARG45
  ('ARG45', 1, 'Register on the fellowship portal and on Digi Locker',
   'The applicant registers on the Ministry portal at fellowship.tribal.gov.in and on Digi Locker, where Aadhaar is mandatory because documents must be uploaded through it. The portal usually opens on 1 July and closes on 30 September; the dates may change and are notified on the portal. Incomplete applications are not considered.',
   'Student'),
  ('ARG45', 2, 'Fill the application and upload the documents',
   'The applicant submits the form with the photograph, ST or PVTG certificate, Class 10 certificate, PG mark sheet, admission or joining certificate, and the Divyangjan or IIT, AIIMS, IIM or IISER offer letter where applicable.',
   'Student'),
  ('ARG45', 3, 'Institute verification of physical documents',
   'The University Nodal Officer verifies the physical documents against what the applicant uploaded, and the Institute is responsible for the information being correct. Registered officers are the nodal officer and the officer dealing with scholarships.',
   'University / Institute Nodal Officer'),
  ('ARG45', 4, 'Ministry verification, with a defect and resubmission loop',
   'After the Institute verifies the application, the Ministry verifies it online. Discrepancies mark the application defective, the student corrects it and resubmits at Institute level, and the Institute verifies and submits the corrected application before the last date.',
   'Ministry of Tribal Affairs'),
  ('ARG45', 5, 'Merit list and provisional award',
   'A merit list is prepared from the post-graduation marks using the selection committee''s criteria, the provisionally selected scholars are published on the Ministry website, and the Ministry''s decision is final. The scholar must take admission and give the joining report within 1 month.',
   'Ministry selection committee and research scholar'),
  ('ARG45', 6, 'Institute links the awardee to the bank portal',
   'The scholar obtains a no-objection certificate for not holding another fellowship and submits the signed checklist and any refund receipt. The Institute uploads the joining report and the beneficiary master data, and the bank account is validated through PFMS to create the beneficiary ID.',
   'University / Institute and designated bank'),
  ('ARG45', 7, 'Quarterly continuation certificates',
   'The Institute uploads a continuation certificate at the end of every quarter, by 10 July, 10 October, 10 January and 10 April, marks the monthly HRA entitlement, and after a year of fellowship requires the progress report.',
   'University / Institute'),
  ('ARG45', 8, 'Quarterly release of the fellowship by DBT',
   'PFMS releases the fellowship quarterly through DBT to the Aadhaar-linked account. The mobile number in Aadhaar and in the bank account must be the same and should be kept unchanged until the course is completed.',
   'PFMS and designated bank'),
  ('ARG45', 9, 'Course completion and thesis upload',
   'The scholar submits the M.Phil or Ph.D certificate and the course completion certificate to the Ministry and uploads the thesis with its metadata on repository.tribal.gov.in. The last quarter of the fellowship is released only after the thesis is uploaded.',
   'Research scholar'),

  -- AZKMI
  ('AZKMI', 1, 'Register on the NOSP portal and on Digi Locker',
   'The applicant registers on the National Overseas Scholarship Portal at overseas.tribal.gov.in and on Digi Locker, where Aadhaar is mandatory. Documents are uploaded through Digi Locker.',
   'Student'),
  ('AZKMI', 2, 'Submit the online application in the advertised window',
   'The application is submitted on the portal. Opening and closing dates are announced by advertisement in Employment News and other dailies, through institutes and universities, through State Governments and on the Ministry portal, and the helpdesk on the portal is used for queries.',
   'Student'),
  ('AZKMI', 3, 'Eligibility scrutiny and merit list by field of study',
   'Applications received in time are scrutinized for eligibility and a separate merit list is drawn for each field of study: STEM 10 slots, Management, Economics, Finance and Law 4, Agriculture and Medicine 4, Humanities, Social Science and Fine Arts 2.',
   'Ministry of Tribal Affairs'),
  ('AZKMI', 4, 'First priority to admits already studying at a top 1,000 institute',
   'Candidates who already have admission and are studying at a top 1,000 QS-ranked foreign institute are considered first, ordered by institute ranking, with ties decided on the marks in the qualifying examination for higher study.',
   'Ministry of Tribal Affairs'),
  ('AZKMI', 5, 'Then candidates holding an offer from a top 1,000 institute',
   'If there are not enough candidates under the first priority, the merit list is drawn from candidates who already hold a preliminary letter or offer of admission from a top 1,000 QS-ranked institute and have yet to join, on the same basis of ranking and then marks.',
   'Ministry of Tribal Affairs'),
  ('AZKMI', 6, 'Remaining vacancies filled by interview before an expert committee',
   'Any remaining slots are filled from the eligible candidates by personal interview before a committee of domain experts constituted by the Ministry, with preference to candidates who have cleared GRE, GMAT, TOEFL and similar tests. Short-listed candidates are reimbursed second-class train or bus fare to the interview.',
   'Expert committee constituted by the Ministry'),
  ('AZKMI', 7, 'Provisional merit list and award letter',
   'The provisional merit list of eligible candidates is posted on the Ministry website. The award is prospective from the date of the award letter, so fees already paid are not reimbursed, while maintenance and contingency allowances are paid pro rata for the remainder of the financial year.',
   'Ministry of Tribal Affairs'),
  ('AZKMI', 8, 'Verification by the Embassy or by the State',
   'Candidates selected under the first priority are verified by the Indian Embassy or Mission in the country concerned, and the short-listed candidates from the later stages are verified by the State or Union Territory.',
   'Indian Embassy / Mission and State / UT'),
  ('AZKMI', 9, 'Join a top 1,000 institute within 2 years',
   'The selected candidate must secure admission and join a top 1,000 QS-ranked foreign institute within 2 years of the communication of the award letter. If this is not done, the award is cancelled and the slot carries over to the next selection year.',
   'Awardee'),
  ('AZKMI', 10, 'Six-monthly progress reports and monitoring',
   'The awardee submits a progress report on the NOS portal once every 6 months. The Indian Mission obtains performance reports from the university and updates joining, discontinuation and other information on the Ministry portal, and reports any serious adverse development.',
   'Awardee and Indian Embassy / Mission'),
  ('AZKMI', 11, 'Permission to leave the country and completion reporting',
   'Before leaving the country the awardee takes permission of the Indian Mission and informs the Ministry on the portal. After completing the course, the awardee uploads the course completion details and a brief of the study in the portal''s alumni module before return tickets are booked.',
   'Awardee and Indian Embassy / Mission'),
  ('AZKMI', 12, 'Disbursement by the Embassy and reimbursement by the Ministry',
   'The Indian Embassy or Mission disburses the financial assistance to the institute and the student, and the Ministry of Tribal Affairs reimburses the amount to the Ministry of External Affairs.',
   'Indian Embassy / Mission, Ministry of External Affairs and Ministry of Tribal Affairs')
) as v (scheme_code, step_number, title, description, actor)
join public.schemes s on s.scheme_code = v.scheme_code
on conflict (scheme_id, step_number) do update
set title = excluded.title,
    description = excluded.description,
    actor = excluded.actor,
    is_verified = true;
-- is_verified is set to true rather than left to the column default: these steps
-- are transcribed from the guideline named in the header, which is what the
-- column documents as the condition for setting it.

-- -----------------------------------------------------------------------------
-- 5. scheme_documents
--
-- Updated in place, never deleted, because application_documents rows reference
-- these with ON DELETE CASCADE.
-- -----------------------------------------------------------------------------

update public.scheme_documents d
set description = v.description,
    is_mandatory = v.is_mandatory,
    academic_year = s.academic_year,
    source_text = v.source_text,
    updated_at = now()
from public.schemes s
join (values
  ('BVOBC', 'ST Category Certificate',
   'ST certificate issued by the competent authority of the State or Union Territory.',
   true, '6.1(e) ST certificate issued by competent authority of State/UT.'),
  ('BVOBC', 'Domicile Certificate',
   'Domicile certificate issued by the State or Union Territory.',
   true, '6.1(b) Domicile certificate.'),
  ('BVOBC', 'Income Certificate',
   'Family income certificate showing annual family income of 2,50,000 or less. Taken once at admission to the course and valid for its whole duration, so it is not required again on renewal.',
   true, '6.1(f) Family Income Certificate; 3.1(c) family income not to exceed Rs.2.50 lakh per annum.'),
  ('BVOBC', 'Aadhaar Card',
   'Aadhaar, required for identity verification and for release of the scholarship by direct benefit transfer.',
   true, '6.1(a) Aadhar Number; 3.1(d) valid account in a Schedule Bank linked with Aadhar and Mobile number.'),
  ('BVOBC', 'Academic Marksheets and Transcripts',
   'Scanned copies of the certificates, diploma, degree and mark sheets for all examinations passed, together with the marks of the last qualifying examination as a percentage, or the equivalent where the course is graded.',
   true, '6.1(c) and 6.1(d) Scanned copy of certificates, diploma, degree etc. in respect of all examinations passed, and last qualified marks.'),
  ('BVOBC', 'Admission Receipt or Bonafide Certificate',
   'Not listed among the documents required by the MoTA guidelines for this scheme. Collected only where the State or institute verification asks for proof of admission.',
   false, 'Not listed in the guideline document list; retained for State or institute verification requirements.'),
  ('BVOBC', 'Bank Passbook',
   'Passbook or account details of the active bank account in the applicant''s own name. The guidelines do not list the passbook itself, but eligibility requires a valid Scheduled Bank account linked with Aadhaar and the mobile number for direct benefit transfer.',
   true, '3.1(d) The applicant should have a valid account in a Schedule Bank linked with Aadhar and Mobile number.'),
  ('BVOBC', 'Disability Certificate',
   'Required only if the additional disability stipend is being claimed. Disability as defined under the applicable Act, certified by a competent medical authority of the State Government or UT Administration; also allowed for leprosy-cured students and students with sickle cell anaemia or thalassemia with the necessary certificate. The guidelines state no minimum percentage.',
   false, '6.1(g) Disability certificate; additional stipend for Divyangjan student as defined under the Act.'),
  ('BVOBC', 'Passport Size Photograph',
   'Recent passport-size photograph of the applicant.',
   true, '6.1(h) Scanned copy of passport size photograph.'),

  ('BPVGK', 'ST Category Certificate',
   'ST certificate issued by the competent authority of the State or Union Territory.',
   true, 'ST certificate issued by competent authority of State/UT.'),
  ('BPVGK', 'Domicile Certificate',
   'Domicile certificate issued by the State or Union Territory, which is the State that awards the scholarship.',
   true, 'Domicile certificate.'),
  ('BPVGK', 'Income Certificate',
   'Family income certificate showing annual family income of 2,50,000 or less. It must be taken at the time of admission in the same year as the admission and is valid up to Class X. For a salaried parent the previous financial year''s income is used. A self-declaration or affidavit of income is not acceptable.',
   true, '3.2 Income Criteria; 3.3 Note 3; self-declaration or affidavit of self-assessment of income shall not be acceptable.'),
  ('BPVGK', 'Aadhaar Card',
   'Aadhaar, required for identity verification and for release of the scholarship by direct benefit transfer.',
   true, '3.1(e) valid account in a Schedule Bank linked with Aadhar and Mobile number.'),
  ('BPVGK', 'Bank Passbook',
   'Passbook or account details of the active bank account for direct benefit transfer into the student''s account.',
   true, '3.1(e) valid account in a Schedule Bank linked with Aadhar and Mobile number.'),
  ('BPVGK', 'Academic Marksheets and Transcripts',
   'Mark sheet of the last qualifying examination, and the Class X pass certificate when applying for renewal.',
   true, '3.5(II) It will be renewed for Class X after the student passes class IX.'),
  ('BPVGK', 'Disability Certificate',
   'Required only if the additional disability allowance is being claimed. Disability as defined under the applicable Act, certified by a competent medical authority of the State Government or UT Administration; also allowed for leprosy-cured students and students with sickle cell anaemia or thalassemia with the necessary certificate. The guidelines state no minimum percentage.',
   false, '3.1(e) Disability certificate; additional disability allowance for Divyangjan student as defined under the Act.'),
  ('BPVGK', 'Passport Size Photograph',
   'Recent passport-size photograph of the applicant.',
   true, 'Photograph of the applicant.'),

  ('ARG45', 'ST Category Certificate',
   'ST or PVTG certificate issued by the competent authority. A PVTG certificate supports application under the reserved PVTG slots.',
   true, '3.3 ST/PVTG certificate issued by the competent authority.'),
  ('ARG45', 'Academic Marksheets and Transcripts',
   'Post-graduation mark sheet with aggregate marks as a percentage, or the equivalent percentage where the result is a CGPA, with the conversion formula issued by the Institute or University.',
   true, '3.3 Post-Graduation mark sheet [Aggregate marks in %] /equivalent % marks in case of CGPA.'),
  ('ARG45', 'Aadhaar Card',
   'Aadhaar, mandatory for registration on the portal and for Digi Locker uploads. Proof of possession must be furnished or Aadhaar authentication undergone.',
   true, '3.2 Note 1: Aadhaar is mandatory as notified by the Ministry under section 7 of the Aadhaar Act 2016.'),
  ('ARG45', 'Admission Certificate',
   'Admission or joining certificate for the M.Phil, Ph.D or integrated M.Phil plus Ph.D course from the University concerned.',
   true, '3.3 Admission/Joining certificate of M.Phil/Ph.D / Integrated M.Phil+Ph.D from the University concerned.'),
  ('ARG45', 'Class 10 Certificate',
   'Class 10 or matriculation certificate, in support of date of birth.',
   true, '3.3 10th /Matriculation/equivalent certificate in support of date of birth.'),
  ('ARG45', 'Passport Size Photograph',
   'Recent coloured passport-size photograph of the applicant.',
   true, '3.3 Latest coloured passport size photograph.'),
  ('ARG45', 'Disability Certificate',
   'Required only if applying under the Divyangjan category. Must certify a minimum of 40% disability and be issued by the competent authority designated by the State or UT.',
   false, '2.5 Note-2: The students applying as Divyangjan should produce the Disability Certificate, certifying minimum 40% disability, issued by the competent authority designated by respective State/UT.'),
  ('ARG45', 'Institute Offer Letter',
   'Required only if the applicant holds an offer of admission from an IIT, AIIMS, IIM or IISER, in which case preference is given to that applicant.',
   false, '2.5(iv) the student should mention, in the application form, that he/she has got offer of admission and should also upload the offer letter issued.'),

  ('AZKMI', 'ST Category Certificate',
   'ST certificate issued by the competent authority.',
   true, '4.3 ST certificate issued by the competent authority.'),
  ('AZKMI', 'PVTG Certificate',
   'Particularly Vulnerable Tribal Group certificate issued by the competent authority. Required only if applying under the PVTG slots.',
   false, '4.3 PVTG certificate issued by the competent authority (if applicable).'),
  ('AZKMI', 'Class 10 Certificate',
   'Class 10 certificate or marksheet, in support of date of birth.',
   true, '4.3 10th Certificate/Marksheet in support of Date of Birth.'),
  ('AZKMI', 'Academic Marksheets and Transcripts',
   'Graduation or post-graduation mark sheet with aggregate marks as a percentage, or the equivalent percentage where the result is a CGPA, with the conversion sheet issued by the Institute or University, and the Ph.D completion certificate where applicable.',
   true, '4.3 Graduation / Post-Graduation mark sheet [Aggregate marks in %] /equivalent % marks in case of CGPA / Ph.D completion certificate, wherever applicable.'),
  ('AZKMI', 'Admission Offer Letter',
   'Offer of admission from the institute abroad. The awardee must secure admission and join a top 1,000 QS-ranked institute within 2 years of the award letter.',
   true, '4.3 Offer of admission.'),
  ('AZKMI', 'Income Certificate',
   'Family income certificate showing annual family income of 6,00,000 or less. It is taken once at admission and is valid for the whole course; for a salaried parent the previous financial year is used.',
   true, '2.2(iii) family income not to exceed Rs.6,00,000 per annum; Note 2 income certificate to be taken once only at the time of admission.'),
  ('AZKMI', 'Aadhaar Card',
   'Aadhaar, mandatory for registration on the portal and for Digi Locker uploads.',
   true, '4.2 Aadhaar is mandatory for registration on portal.'),
  ('AZKMI', 'Passport Size Photograph',
   'Latest coloured passport-size photograph of the applicant.',
   true, '4.3 Latest Coloured Passport Size Photograph.')
) as v (scheme_code, document_name, description, is_mandatory, source_text)
  on v.scheme_code = s.scheme_code
where d.scheme_id = s.id
  and lower(d.document_name) = lower(v.document_name);

-- Documents the guidelines require that are not yet recorded for a scheme.
-- academic_year is taken from the scheme rather than hard-coded, so this stays
-- correct if a scheme is rolled forward to a new year.
insert into public.scheme_documents (
  scheme_id, document_name, description, is_mandatory, academic_year, source_text
)
select
  s.id, v.document_name, v.description, v.is_mandatory, s.academic_year, v.source_text
from public.schemes s
join (values
  ('BVOBC', 'Passport Size Photograph',
   'Recent passport-size photograph of the applicant.',
   true, '6.1(h) Scanned copy of passport size photograph.'),
  ('BPVGK', 'ST Category Certificate',
   'ST certificate issued by the competent authority of the State or Union Territory.',
   true, 'ST certificate issued by competent authority of State/UT.'),
  ('BPVGK', 'Domicile Certificate',
   'Domicile certificate issued by the State or Union Territory, which is the State that awards the scholarship.',
   true, 'Domicile certificate.'),
  ('BPVGK', 'Income Certificate',
   'Family income certificate showing annual family income of 2,50,000 or less. It must be taken at the time of admission in the same year as the admission and is valid up to Class X. For a salaried parent the previous financial year''s income is used. A self-declaration or affidavit of income is not acceptable.',
   true, '3.2 Income Criteria; 3.3 Note 3; self-declaration or affidavit of self-assessment of income shall not be acceptable.'),
  ('BPVGK', 'Aadhaar Card',
   'Aadhaar, required for identity verification and for release of the scholarship by direct benefit transfer.',
   true, '3.1(e) valid account in a Schedule Bank linked with Aadhar and Mobile number.'),
  ('BPVGK', 'Bank Passbook',
   'Passbook or account details of the active bank account for direct benefit transfer into the student''s account.',
   true, '3.1(e) valid account in a Schedule Bank linked with Aadhar and Mobile number.'),
  ('BPVGK', 'Academic Marksheets and Transcripts',
   'Mark sheet of the last qualifying examination, and the Class X pass certificate when applying for renewal.',
   true, '3.5(II) It will be renewed for Class X after the student passes class IX.'),
  ('BPVGK', 'Disability Certificate',
   'Required only if the additional disability allowance is being claimed. Disability as defined under the applicable Act, certified by a competent medical authority of the State Government or UT Administration; also allowed for leprosy-cured students and students with sickle cell anaemia or thalassemia with the necessary certificate. The guidelines state no minimum percentage.',
   false, '3.1(e) Disability certificate; additional disability allowance for Divyangjan student as defined under the Act.'),
  ('BPVGK', 'Passport Size Photograph',
   'Recent passport-size photograph of the applicant.',
   true, 'Photograph of the applicant.'),

  ('ARG45', 'ST Category Certificate',
   'ST or PVTG certificate issued by the competent authority. A PVTG certificate supports application under the reserved PVTG slots.',
   true, '3.3 ST/PVTG certificate issued by the competent authority.'),
  ('ARG45', 'Academic Marksheets and Transcripts',
   'Post-graduation mark sheet with aggregate marks as a percentage, or the equivalent percentage where the result is a CGPA, with the conversion formula issued by the Institute or University.',
   true, '3.3 Post-Graduation mark sheet [Aggregate marks in %] /equivalent % marks in case of CGPA.'),
  ('ARG45', 'Aadhaar Card',
   'Aadhaar, mandatory for registration on the portal and for Digi Locker uploads. Proof of possession must be furnished or Aadhaar authentication undergone.',
   true, '3.2 Note 1: Aadhaar is mandatory as notified by the Ministry under section 7 of the Aadhaar Act 2016.'),
  ('ARG45', 'Admission Certificate',
   'Admission or joining certificate for the M.Phil, Ph.D or integrated M.Phil plus Ph.D course from the University concerned.',
   true, '3.3 Admission/Joining certificate of M.Phil/Ph.D / Integrated M.Phil+Ph.D from the University concerned.'),
  ('ARG45', 'Class 10 Certificate',
   'Class 10 or matriculation certificate, in support of date of birth.',
   true, '3.3 10th /Matriculation/equivalent certificate in support of date of birth.'),
  ('ARG45', 'Passport Size Photograph',
   'Recent coloured passport-size photograph of the applicant.',
   true, '3.3 Latest coloured passport size photograph.'),
  ('ARG45', 'Disability Certificate',
   'Required only if applying under the Divyangjan category. Must certify a minimum of 40% disability and be issued by the competent authority designated by the State or UT.',
   false, '2.5 Note-2: Disability Certificate certifying minimum 40% disability, issued by the competent authority designated by respective State/UT.'),
  ('ARG45', 'Institute Offer Letter',
   'Required only if the applicant holds an offer of admission from an IIT, AIIMS, IIM or IISER, in which case preference is given to that applicant.',
   false, '2.5(iv) the student should mention in the application form that he/she has got offer of admission and should also upload the offer letter issued.'),

  ('AZKMI', 'ST Category Certificate',
   'ST certificate issued by the competent authority.',
   true, '4.3 ST certificate issued by the competent authority.'),
  ('AZKMI', 'PVTG Certificate',
   'Particularly Vulnerable Tribal Group certificate issued by the competent authority. Required only if applying under the PVTG slots.',
   false, '4.3 PVTG certificate issued by the competent authority (if applicable).'),
  ('AZKMI', 'Class 10 Certificate',
   'Class 10 certificate or marksheet, in support of date of birth.',
   true, '4.3 10th Certificate/Marksheet in support of Date of Birth.'),
  ('AZKMI', 'Academic Marksheets and Transcripts',
   'Graduation or post-graduation mark sheet with aggregate marks as a percentage, or the equivalent percentage where the result is a CGPA, with the conversion sheet issued by the Institute or University, and the Ph.D completion certificate where applicable.',
   true, '4.3 Graduation / Post-Graduation mark sheet [Aggregate marks in %] /equivalent % marks in case of CGPA / Ph.D completion certificate, wherever applicable.'),
  ('AZKMI', 'Admission Offer Letter',
   'Offer of admission from the institute abroad. The awardee must secure admission and join a top 1,000 QS-ranked institute within 2 years of the award letter.',
   true, '4.3 Offer of admission.'),
  ('AZKMI', 'Income Certificate',
   'Family income certificate showing annual family income of 6,00,000 or less. It is taken once at admission and is valid for the whole course; for a salaried parent the previous financial year is used.',
   true, '2.2(iii) family income not to exceed Rs.6,00,000 per annum; Note 2 income certificate to be taken once only at the time of admission.'),
  ('AZKMI', 'Aadhaar Card',
   'Aadhaar, mandatory for registration on the portal and for Digi Locker uploads.',
   true, '4.2 Aadhaar is mandatory for registration on portal.'),
  ('AZKMI', 'Passport Size Photograph',
   'Latest coloured passport-size photograph of the applicant.',
   true, '4.3 Latest Coloured Passport Size Photograph.')
) as v (scheme_code, document_name, description, is_mandatory, source_text)
  on v.scheme_code = s.scheme_code
where not exists (
    select 1
    from public.scheme_documents d
    where d.scheme_id = s.id
      and lower(d.document_name) = lower(v.document_name)
);

-- -----------------------------------------------------------------------------
-- 6. schemes: the narrative shown above the title
--
-- Only the four schemes with a matching guideline are touched. A023B is left
-- exactly as it is, including its unverified process steps.
-- -----------------------------------------------------------------------------

update public.schemes
set scheme_type = v.scheme_type,
    description = v.description,
    overview = v.overview,
    source_type = 'official_guideline_pdf',
    source_last_verified_at = now(),
    updated_at = now()
from (values
  ('BVOBC', 'Centrally Sponsored Scheme',
   'Post-matric scholarship for Scheduled Tribe students studying at post-matriculation level in India, comprising reimbursement of compulsory non-refundable fees and a monthly stipend.',
   'Financial support for Scheduled Tribe students pursuing post-matriculation studies in India, from Class XI and Class XII through diploma, undergraduate, postgraduate, M.Phil and Ph.D. courses. The award has two parts: reimbursement of the compulsory non-refundable fees fixed by the State Fee Fixation Committee, and a monthly stipend that depends on the course group and on whether the student is a hosteller or a day scholar. The scheme is administered by the Ministry of Tribal Affairs with the State or Union Territory awarding it, and is disbursed by direct benefit transfer. Students admitted to a notified Top Class Institute receive the Top Class Scholarship instead and are not eligible under this scheme.'),
  ('BPVGK', 'Centrally Sponsored Scheme',
   'Pre-matric scholarship for Scheduled Tribe students studying in Class IX and Class X, comprising a monthly scholarship, a books and ad hoc grant, and an additional disability allowance.',
   'Financial support for Scheduled Tribe students in Class IX and Class X, intended to keep them in school and to support the transition to post-matriculation study. It comprises a scholarship for 10 months in each academic year, a books and ad hoc grant, and an additional disability allowance paid for all 12 months for Divyangjan students. The scholarship is awarded and disbursed by the State or Union Territory of domicile through direct benefit transfer, optionally using the National Scholarship Portal, and is renewed for Class X after the student passes Class IX.'),
  ('ARG45', 'Central Sector Scheme',
   'Central sector fellowship for meritorious Scheduled Tribe students to pursue M.Phil and Ph.D research after a Master''s degree, fully funded by the Ministry of Tribal Affairs.',
   'A fully funded central sector fellowship for meritorious Scheduled Tribe students who have passed the Master''s degree, to pursue M.Phil, an integrated M.Phil and Ph.D, or a Ph.D at a recognized university or institute. It pays a monthly fellowship that depends on the discipline and the course, an annual contingency allowance, house rent allowance at UGC rates, and an escort allowance for Divyangjan scholars. There is no income criterion for the fellowship. 750 fresh fellowships are awarded each year, with slots reserved by priority for Divyangjan, PVTG, female and other ST applicants, and the award is released quarterly by direct benefit transfer through PFMS.'),
  ('AZKMI', 'Central Sector Scheme',
   'Central sector scholarship for meritorious Scheduled Tribe students to pursue postgraduate study at reputed universities abroad, implemented through the Indian Embassies and Missions.',
   'A central sector scholarship for meritorious Scheduled Tribe students to pursue a Master''s degree, Ph.D or Post-Doctoral Research at a reputed university abroad, implemented through the Indian Embassies and Missions under the Ministry of External Affairs. Twenty awards are made each year, of which 3 are reserved for Particularly Vulnerable Tribal Groups and 30% are earmarked for female candidates. The award covers maintenance and contingency allowances, tuition and other non-refundable fees, visa and insurance costs and air passage. Admission to an institute in the QS World top 1,000 is prioritised, and the awardee must join such an institute within 2 years of the award letter.')
) as v (scheme_code, scheme_type, description, overview)
where v.scheme_code = schemes.scheme_code
  and schemes.scheme_code in ('BVOBC', 'BPVGK', 'ARG45', 'AZKMI');

-- -----------------------------------------------------------------------------
-- 7. Verification
--
-- These run inside the same transaction, so a failure rolls the whole seed back
-- rather than leaving a scheme half populated.
-- -----------------------------------------------------------------------------

do $$
declare
    problem text;
begin
    -- One eligibility row per scheme. The detail view reads scheme_eligibility
    -- with maybeSingle(), which fails outright if a second academic year exists.
    select string_agg(s.scheme_code, ', ')
      into problem
      from public.schemes s
     where s.scheme_code in ('BVOBC', 'BPVGK', 'ARG45', 'AZKMI')
       and (select count(*) from public.scheme_eligibility e where e.scheme_id = s.id) <> 1;

    if problem is not null then
        raise exception 'Expected exactly one scheme_eligibility row per scheme; wrong count for: %', problem;
    end if;

    -- Every verified scheme must have all four detail sections populated.
    select string_agg(s.scheme_code, ', ')
      into problem
      from public.schemes s
     where s.scheme_code in ('BVOBC', 'BPVGK', 'ARG45', 'AZKMI')
       and (select count(*) from public.scheme_benefits b where b.scheme_id = s.id) = 0;

    if problem is not null then
        raise exception 'No benefits recorded for: %', problem;
    end if;

    select string_agg(s.scheme_code, ', ')
      into problem
      from public.schemes s
     where s.scheme_code in ('BVOBC', 'BPVGK', 'ARG45', 'AZKMI')
       and (select count(*) from public.scheme_criteria c where c.scheme_id = s.id) = 0;

    if problem is not null then
        raise exception 'No eligibility criteria recorded for: %', problem;
    end if;

    select string_agg(s.scheme_code, ', ')
      into problem
      from public.schemes s
     where s.scheme_code in ('BVOBC', 'BPVGK', 'ARG45', 'AZKMI')
       and (select count(*) from public.scheme_process_steps p where p.scheme_id = s.id) = 0;

    if problem is not null then
        raise exception 'No process steps recorded for: %', problem;
    end if;

    select string_agg(s.scheme_code, ', ')
      into problem
      from public.schemes s
     where s.scheme_code in ('BVOBC', 'BPVGK', 'ARG45', 'AZKMI')
       and (select count(*) from public.scheme_documents d where d.scheme_id = s.id) = 0;

    if problem is not null then
        raise exception 'No required documents recorded for: %', problem;
    end if;

    -- Process steps must start at 1 with no gaps, so the stepper cannot show a
    -- missing stage.
    select string_agg(s.scheme_code || ' (max ' || x.max_step || ')', ', ')
      into problem
      from (
        select p.scheme_id, max(p.step_number) as max_step, count(*) as n
        from public.scheme_process_steps p
        join public.schemes s on s.id = p.scheme_id
        where s.scheme_code in ('BVOBC', 'BPVGK', 'ARG45', 'AZKMI')
        group by p.scheme_id
      ) x
      join public.schemes s on s.id = x.scheme_id
     where x.max_step <> x.n or x.n = 0;

    if problem is not null then
        raise exception 'Process steps are not a contiguous run from 1: %', problem;
    end if;

    -- The fellowship has no income criterion, and the overseas age limit is
    -- course dependent, so both must be left empty rather than guessed.
    if exists (
        select 1 from public.schemes s
        join public.scheme_eligibility e on e.scheme_id = s.id
        where s.scheme_code = 'ARG45' and e.max_income is not null
    ) then
        raise exception 'ARG45 has no income criterion in the guidelines; max_income must be NULL';
    end if;

    if exists (
        select 1 from public.schemes s
        join public.scheme_eligibility e on e.scheme_id = s.id
        where s.scheme_code = 'AZKMI' and e.max_age is not null
    ) then
        raise exception 'AZKMI age limit varies by course; max_age must be NULL and the limits carried as criteria';
    end if;

    -- Foreign currency figures must not sit in a column the UI formats as rupees.
    if exists (
        select 1 from public.schemes s
        join public.scheme_benefits b on b.scheme_id = s.id
        where s.scheme_code = 'AZKMI'
          and (b.amount is not null or b.hosteller_amount is not null or b.day_scholar_amount is not null)
    ) then
        raise exception 'AZKMI amounts are in foreign currency and must stay in the coverage text, not in numeric columns';
    end if;

    -- A023B has no verified source and must not have been given any.
    if exists (
        select 1
        from public.schemes s
        join public.scheme_criteria c on c.scheme_id = s.id
        where s.scheme_code = 'A023B'
    ) then
        raise exception 'A023B has no official guideline on file; criteria must not be seeded for it';
    end if;

    raise notice
        'Scheme detail seeded from official guidelines for BVOBC, BPVGK, ARG45, AZKMI. A023B left unchanged: no guideline available.';
end $$;

commit;
