-- =============================================================================
-- Phase 6 : scheme_documents - official document lists, types and the
--            fresh / renewal matrix
-- =============================================================================
-- Replaces the 21 generic rows (every one of them document_type = 'Other',
-- is_mandatory = true, accepted_formats = NULL, max_file_size_mb = NULL) with
-- the 34 documents the guidelines actually list:
--   BPVGK 6, BVOBC 8, A023B 6, ARG45 7, AZKMI 7
-- plus 1 retained ARG45 FAQ-sourced row (35 total) - see the note at the end.
--
-- Pre-migration state was counted and captured in the snapshot migration:
--   BPVGK 4, BVOBC 5, A023B 4, ARG45 4, AZKMI 4  =  21 rows.
--
-- Formats and sizes are stored ONLY where the report found official evidence:
--   ARG45 - Documents PDF <= 500 KB; profile picture JPG/JPEG <= 100 KB
--           (MoTA UMANG instructions manual, tribal.nic.in/downloads/faqs/UMANG.pdf)
--   AZKMI - .jpg / .jpeg accepted; profile photo 50-100 KB (MoTA NOS FAQ)
--   BPVGK, BVOBC, A023B - NOT SPECIFIED OFFICIALLY, so these stay NULL.
-- The BVOBC J&K 2026-27 State notice (PDF/JPG/JPEG 150-200 KB) is a State/NSP
-- rule, not a central scheme rule, and is deliberately NOT stored here.
--
-- UNIT NOTE: max_file_size_mb is megabytes. The guideline states these limits in
-- kilobytes, so they are converted on the way in: 500 KB -> 0.5 and 100 KB -> 0.1.
-- Storing 500 and 100 against a column named _mb would have told the applicant
-- that a 100 KB photograph must be under 100 MB.
-- =============================================================================

delete from public.scheme_documents
where scheme_id in (select id from public.schemes where scheme_code in ('BPVGK','BVOBC','A023B','ARG45','AZKMI'));

-- ---------------------------------------------------------------------------
-- BPVGK - 6 documents
-- pre-matric-scholarship.pdf p.7 §5
-- ---------------------------------------------------------------------------
insert into public.scheme_documents
  (scheme_id, document_type, document_name, description, is_mandatory,
   accepted_formats, max_file_size_mb, academic_year, is_required_fresh, is_required_renewal)
select s.id, v.document_type, v.document_name, v.description, v.is_mandatory,
       v.accepted_formats, v.max_file_size_mb, null, true, true
from (values
 ('Identity Proof','Aadhaar Number',
  'Aadhaar number of the applicant. Accepted file formats and maximum file size are not specified officially for this scheme.',true,
  null::text[], null::numeric),
 ('Residence Proof','Domicile Certificate',
  'Domicile certificate of the applicant. The State/UT specifies the issuing procedure and competent authority; DigiLocker integration is permitted.',true,
  null, null),
 ('Category Certificate','ST Certificate',
  'ST certificate issued by the competent authority of the State. The State/UT specifies the issuing procedure and competent authority; DigiLocker integration is permitted.',true,
  null, null),
 ('Income Certificate','Family Income Certificate',
  'Family income certificate. Self-declarations or affidavits of self-assessment of income are not acceptable. For a salaried parent, income of the previous financial year is used.',true,
  null, null),
 ('Disability Certificate','Disability Certificate',
  'Required only for the additional disability allowance. Must be issued by a competent medical authority of the State Government or UT Administration. Also applicable to leprosy-cured students and students with sickle cell anaemia or Thalassemia.',true,
  null, null),
 ('Photograph','Passport-size Photograph',
  'Scanned copy of the passport-size photograph, legible and clear.',true,
  null, null)
) as v(document_type,document_name,description,is_mandatory,accepted_formats,max_file_size_mb)
cross join public.schemes s
where s.scheme_code = 'BPVGK';

-- ---------------------------------------------------------------------------
-- BVOBC - 8 documents
-- post-matric-scholarship.pdf p.12 §6
-- ---------------------------------------------------------------------------
insert into public.scheme_documents
  (scheme_id, document_type, document_name, description, is_mandatory,
   accepted_formats, max_file_size_mb, academic_year, is_required_fresh, is_required_renewal)
select s.id, v.document_type, v.document_name, v.description, v.is_mandatory,
       v.accepted_formats, v.max_file_size_mb, null, true, true
from (values
 ('Identity Proof','Aadhaar Number',
  'Aadhaar number of the applicant. Accepted file formats and maximum file size are not specified officially in the central guideline.',true,
  null::text[], null::numeric),
 ('Residence Proof','Domicile Certificate',
  'Domicile certificate of the applicant. The State/UT specifies the issuing procedure and competent authority; DigiLocker integration is permitted.',true,
  null, null),
 ('Degree Certificate','Certificates, Diplomas and Degrees for All Examinations Passed',
  'Scanned copy of the certificates, diplomas and degrees for all examinations passed.',true,
  null, null),
 ('Marksheet','Last Qualified Marks',
  'Last qualified marks as a percentage, or the equivalent percentage where CGPA/OGPA is used.',true,
  null, null),
 ('Category Certificate','ST Certificate',
  'ST certificate issued by the competent authority of the State or UT. DigiLocker integration is permitted.',true,
  null, null),
 ('Income Certificate','Family Income Certificate',
  'Family income certificate. Self-declarations or affidavits of self-assessment of income are not acceptable. Taken once only at admission and valid for the entire duration of the course; a fresh income certificate is not required at renewal.',true,
  null, null),
 ('Disability Certificate','Disability Certificate',
  'Required only for the additional disability allowance. Also applicable to leprosy-cured students and students with sickle cell anaemia or Thalassemia.',true,
  null, null),
 ('Photograph','Passport-size Photograph',
  'Scanned copy of the passport-size photograph, legible and clear.',true,
  null, null)
) as v(document_type,document_name,description,is_mandatory,accepted_formats,max_file_size_mb)
cross join public.schemes s
where s.scheme_code = 'BVOBC';

-- ---------------------------------------------------------------------------
-- A023B - 6 documents, the only scheme with an official fresh/renewal matrix
-- national-fellowship-scholarship.pdf Part-B p.20 §3.3
-- ST/PVTG and Income certificates are fresh-only; the other four apply to both.
-- ---------------------------------------------------------------------------
insert into public.scheme_documents
  (scheme_id, document_type, document_name, description, is_mandatory,
   accepted_formats, max_file_size_mb, academic_year, is_required_fresh, is_required_renewal)
select s.id, v.document_type, v.document_name, v.description, v.is_mandatory,
       v.accepted_formats, v.max_file_size_mb, null, v.is_required_fresh, v.is_required_renewal
from (values
 ('Category Certificate','ST Certificate / PVTG Certificate',
  'Must be signed and stamped by the competent authority. Required for a fresh application only.',true,
  null::text[], null::numeric, true, false),
 ('Income Certificate','Income Certificate',
  'For a fresh application: for the financial year immediately preceding the year of selection, issued by the designated authority of the respective State/UT. Form 16 is accepted for salaried employees. Required for a fresh application only.',true,
  null, null, true, false),
 ('Fee Receipt','Fee Receipt',
  'Fee receipt. Required for both fresh and renewal applications.',true,
  null, null, true, true),
 ('Bank Proof','Scanned Copy of the Bank Passbook',
  'The student name on the passbook must match the application form. Required for both fresh and renewal applications.',true,
  null, null, true, true),
 ('Marksheet','Mark Sheet / Certificate of Qualifying Examination',
  'Fresh: Graduate - 12th standard; Post Graduate - Graduation. Renewal: last passing (semester) marksheet.',true,
  null, null, true, true),
 ('Institute Certificate','Bona fide Certificate',
  'Bona fide certificate issued from the Institute. Required for both fresh and renewal applications.',true,
  null, null, true, true)
) as v(document_type,document_name,description,is_mandatory,accepted_formats,max_file_size_mb,is_required_fresh,is_required_renewal)
cross join public.schemes s
where s.scheme_code = 'A023B';

-- ---------------------------------------------------------------------------
-- ARG45 - 7 guideline documents
-- national-fellowship-scholarship.pdf Part-A p.9 §3.3
-- Formats/sizes: tribal.nic.in/downloads/faqs/UMANG.pdf (MoTA UMANG manual)
-- DigiLocker upload is mandatory and Aadhaar is mandatory.
-- ---------------------------------------------------------------------------
insert into public.scheme_documents
  (scheme_id, document_type, document_name, description, is_mandatory,
   accepted_formats, max_file_size_mb, academic_year, is_required_fresh, is_required_renewal)
select s.id, v.document_type, v.document_name, v.description, v.is_mandatory,
       v.accepted_formats, v.max_file_size_mb, null, true, true
from (values
 ('Photograph','Latest Coloured Passport-size Photograph',
   'Profile picture. Accepted format JPG/JPEG, maximum 100 KB.',true,
   array['jpg','jpeg']::text[], 0.1::numeric),
 ('Category Certificate','ST / PVTG Certificate',
   'Issued by the competent authority. DigiLocker upload is mandatory.',true,
   array['pdf']::text[], 0.5::numeric),
 ('Birth Certificate','10th / Matriculation / Equivalent Certificate',
   'In support of date of birth.',true,
   array['pdf'], 0.5),
 ('Disability Certificate','Divyangjan Certificate',
   'Issued by the competent authority. Required only for applicants claiming the Divyangjan sub-category, who must certify minimum 40% disability.',true,
   array['pdf'], 0.5),
 ('Marksheet','Post-Graduation Mark Sheet',
   'Aggregate marks in percent, or the equivalent percentage where CGPA is used. The CGPA-to-percentage conversion formula issued by the Institute or University must also be produced.',true,
   array['pdf'], 0.5),
 ('Admission Proof','Admission / Joining Certificate',
   'Admission or joining certificate for M.Phil, Ph.D, or Integrated M.Phil+Ph.D from the University concerned.',true,
   array['pdf'], 0.5),
 ('Offer Letter','Offer of Admission from IITs/AIIMS/IIMs/IISERs',
   'Required only for applicants claiming the institute-offer priority; ST-Others slots are reduced proportionately when such a candidate is given priority.',true,
   array['pdf'], 0.5)
) as v(document_type,document_name,description,is_mandatory,accepted_formats,max_file_size_mb)
cross join public.schemes s
where s.scheme_code = 'ARG45';

-- ---------------------------------------------------------------------------
-- ARG45 - retained FAQ-sourced row, NOT one of the 7 guideline documents.
-- Report 7.3: the guideline states there is NO income criterion, but the MoTA
-- National Fellowship FAQ asks for a Family Income Certificate. The row is kept
-- so the FAQ-driven upload flow is not broken, but it is marked non-mandatory
-- and must never be used as an eligibility filter. See eligibility.other_rules.
-- ---------------------------------------------------------------------------
insert into public.scheme_documents
  (scheme_id, document_type, document_name, description, is_mandatory,
   accepted_formats, max_file_size_mb, academic_year, is_required_fresh, is_required_renewal)
select s.id, 'Income Certificate', 'Family Income Certificate',
       'FAQ-SOURCED, NON-GATEKEEPING. The National Fellowship guideline states there is no '
       || 'income criterion for eligibility, but the official MoTA National Fellowship FAQ asks '
       || 'for this document. Retained so the FAQ-driven upload flow is not broken. '
       || 'Must NOT be used as an eligibility filter. Report 7.3.',
       false, array['pdf'], 0.5, null, false, false
from public.schemes s
where s.scheme_code = 'ARG45';

-- ---------------------------------------------------------------------------
-- AZKMI - 7 documents
-- national-overseas-scholarship.pdf p.7-8 §4.3
-- Formats: .jpg / .jpeg (MoTA NOS FAQ). Profile photo 50-100 KB.
-- The 100 KB ceiling is the size the FAQ states for the upload as a whole, so it
-- is applied to every AZKMI row and stored as 0.1 MB. DigiLocker upload is
-- mandatory; failure to upload a mandatory eligibility document makes the
-- application liable to be rejected.
-- ---------------------------------------------------------------------------
insert into public.scheme_documents
  (scheme_id, document_type, document_name, description, is_mandatory,
   accepted_formats, max_file_size_mb, academic_year, is_required_fresh, is_required_renewal)
select s.id, v.document_type, v.document_name, v.description, v.is_mandatory,
       v.accepted_formats, v.max_file_size_mb, null, v.is_required_fresh, v.is_required_renewal
from (values
 ('Photograph','Latest Coloured Passport-size Photograph',
   'Profile photo. Accepted format .jpg / .jpeg, size 50 KB to 100 KB.',true,
   array['jpg','jpeg']::text[], 0.1::numeric, true, true),
 ('Category Certificate','ST Certificate',
   'ST certificate issued by the competent authority.',true,
   array['jpg','jpeg'], 0.1, true, true),
 ('Category Certificate','PVTG Certificate',
   'PVTG certificate issued by the competent authority, if applicable.',false,
   array['jpg','jpeg'], 0.1, true, true),
 ('Birth Certificate','10th Certificate / Marksheet',
   'In support of date of birth. The MoTA FAQ states a 10th or matriculation certificate only; no other certificate is admissible.',true,
   array['jpg','jpeg'], 0.1, true, true),
 ('Marksheet','Graduation / Post-Graduation Mark Sheet',
   'Aggregate marks in percent, or the equivalent percentage where CGPA is used, or the Ph.D completion certificate wherever applicable. The conversion sheet of aggregate marks into percentage must be issued by the Institute or University.',true,
   array['jpg','jpeg'], 0.1, true, true),
 ('Offer Letter','Offer of Admission',
   'Offer of admission from the foreign university. Admission at a top 1,000 QS World ranked institute is required for the award and for merit tier (a).',true,
   array['jpg','jpeg'], 0.1, true, true),
 ('Income Certificate','Income Certificate',
   'Annual family income certificate. If the father is alive but his income is not reported, the reason must be given in the declaration. A copy of the Tax Assessment (ITR / Form 16) may also be required where applicable.',true,
   array['jpg','jpeg'], 0.1, true, true)
) as v(document_type,document_name,description,is_mandatory,accepted_formats,max_file_size_mb,is_required_fresh,is_required_renewal)
cross join public.schemes s
where s.scheme_code = 'AZKMI';
