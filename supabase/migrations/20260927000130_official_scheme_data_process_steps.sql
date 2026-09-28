-- =============================================================================
-- Phase 3 : scheme_process_steps - 68 official ordered process steps
-- =============================================================================
-- BPVGK 8, BVOBC 11, A023B 11, ARG45 18, AZKMI 20.
-- Every step text is taken from the official guideline sections cited in
-- source_ref. Dates are recorded only as "suggested" timelines, never as fixed
-- scheme dates (report 1.5, 2.5, 7.7).
-- Idempotent: (scheme_id, step_order) is unique.
-- =============================================================================

delete from public.scheme_process_steps
where scheme_id in (select id from public.schemes where scheme_code in ('BPVGK','BVOBC','A023B','ARG45','AZKMI'));

-- ---------------------------------------------------------------------------
-- BPVGK - 8 steps
-- pre-matric-scholarship.pdf p.5-6 §4, p.6-7 §4.1/§4.2, p.8 §6, p.9 §7
-- ---------------------------------------------------------------------------
insert into public.scheme_process_steps
  (scheme_id, step_order, title, description, actor, sla_or_timeline, source_ref)
select s.id, v.step_order, v.title, v.description, v.actor, v.sla_or_timeline, v.source_ref
from (values
 (1,'Read portal instructions and assemble documents',
   'Student reads the State/NSP portal instructions and assembles the required documents.',
   'Student',null,'pre-matric-scholarship.pdf p.5-6 §4'),
 (2,'Register and submit the application',
   'Student registers and submits the application on the State portal, or on the National Scholarship Portal if the State has opted for it.',
   'Student',null,'pre-matric-scholarship.pdf p.5-6 §4'),
 (3,'Upload documents and photograph',
   'Student uploads documents and a legible, clear photograph.',
   'Student',null,'pre-matric-scholarship.pdf p.6 §4.1'),
 (4,'Institute Nodal Officer - 1st level verification',
   'The institute must hold a valid AISHE / U-DISE / NCVT / SCVT code. The INO verifies form and document correctness, keeps physical copies, and marks the application verified, rejected (with reason) or defective (with reason).',
   'Institute Nodal Officer','Suggested: completion of institute verification by 31 August','pre-matric-scholarship.pdf p.6 §4.2'),
 (5,'District / State Nodal Officer - 2nd/3rd level verification',
   'The District or State Nodal Officer may verify, mark defective, or reject, giving reasons.',
   'District / State Nodal Officer','Suggested: completion of institute/state verification by 30 September','pre-matric-scholarship.pdf p.7 §4.2'),
 (6,'Rectify defective applications',
   'Defective applications are returned to the student, who rectifies the errors and complies with remarks; the INO re-verifies.',
   'Student; Institute Nodal Officer',null,'pre-matric-scholarship.pdf p.6-7 §4.2'),
 (7,'Rejected applications are not processed further',
   'Applications rejected by the nodal officer are not processed further.',
   'Institute / State Nodal Officer',null,'pre-matric-scholarship.pdf p.6 §4.2'),
 (8,'Disbursement through DBT',
   'Disbursement to the student''s own bank account through Direct Benefit Transfer.',
   'Government of India / State Nodal Agency','Suggested: disbursement by 31 October','pre-matric-scholarship.pdf p.8 §6, p.9 §7')
) as v(step_order,title,description,actor,sla_or_timeline,source_ref)
cross join public.schemes s
where s.scheme_code = 'BPVGK';

-- ---------------------------------------------------------------------------
-- BVOBC - 11 steps
-- post-matric-scholarship.pdf p.8-9 §4, p.9-12 §5/§5.1/§5.2/§5.3, p.14-15 §8
-- ---------------------------------------------------------------------------
insert into public.scheme_process_steps
  (scheme_id, step_order, title, description, actor, sla_or_timeline, source_ref)
select s.id, v.step_order, v.title, v.description, v.actor, v.sla_or_timeline, v.source_ref
from (values
 (1,'State empanelment of institutes',
   'The State empanels eligible institutes within and outside the State, with courses mapped to Groups I-IV, and shares the list with MoTA. Non-Government institutes are inspected in coordination with the destination State.',
   'State Government / State Nodal Officer','Suggested: portal opens by 1 May','post-matric-scholarship.pdf p.8-9 §4'),
 (2,'Take admission in a recognised institution',
   'Student takes admission in any Government institute in or out of State; for non-Government institutes, admission only in an empanelled institute.',
   'Student; Institute','Suggested: registration for students 1 April - 30 September','post-matric-scholarship.pdf p.8-9 §4'),
 (3,'State verifies institute particulars',
   'The State verifies registration, affiliation, accreditation, courses offered and approved seats.',
   'State Government',null,'post-matric-scholarship.pdf p.9 §5'),
 (4,'Apply online',
   'Student applies online on the State portal or the National Scholarship Portal.',
   'Student',null,'post-matric-scholarship.pdf p.9 §5'),
 (5,'Upload documents and bank details',
   'Student uploads legible documents; the bank account and IFSC must be correct and active, the account must be in the student''s own name and linked with Aadhaar and mobile.',
   'Student',null,'post-matric-scholarship.pdf p.9-10 §5'),
 (6,'Institute Nodal Officer - 1st level verification',
   'The institute must hold a valid AISHE/U-DISE/NCVT/SCVT code. The INO verifies details and uploaded documents, keeps physical copies, and marks verified, rejected or defective, always giving reasons. The INO must not charge a verification fee.',
   'Institute Nodal Officer','Suggested: completion of institute verification by 30 October','post-matric-scholarship.pdf p.9-10 §5.1'),
 (7,'District / State Nodal Officer - 2nd/3rd level verification',
   'The District or State Nodal Officer may verify, mark defective, or reject with reasons, and monitors pendency at institute level.',
   'District / State Nodal Officer','Suggested: institute/state verification by 15 November (fresh), 30 October (renewal)','post-matric-scholarship.pdf p.10 §5.2'),
 (8,'Ministry PFMS configuration',
   'The Ministry provides PFMS configuration (agency ID, agency name, PFMS scheme code, DBT mission code, beneficiary type, payment purpose code), verifies scheme configuration including eligibility criteria and important dates, and monitors progress.',
   'Ministry of Tribal Affairs',null,'post-matric-scholarship.pdf p.11 §5.3'),
 (9,'Rectify and re-submit defective applications',
   'Defective applications return to the student for correction and re-submission; the INO re-verifies and forwards.',
   'Student; Institute Nodal Officer',null,'post-matric-scholarship.pdf p.11 §5.2'),
 (10,'Disbursement via DBT',
   'Disbursement via DBT. The State may credit the entire fee to the student''s account, or pay the tuition fee to the Institute and the stipend to the student.',
   'Government of India / State Nodal Agency','Suggested: disbursement by 31 December (fresh), 15 November (renewal)','post-matric-scholarship.pdf p.14-15 §8'),
 (11,'Institute must not withhold access or fees',
   'Non-Government institutes must not force fee payment because of disbursement delay, and the State must allow the student to sit exams and attend classes.',
   'Non-Government Institute; State Government',null,'post-matric-scholarship.pdf p.15 §8')
) as v(step_order,title,description,actor,sla_or_timeline,source_ref)
cross join public.schemes s
where s.scheme_code = 'BVOBC';

-- ---------------------------------------------------------------------------
-- A023B - 11 steps
-- national-fellowship-scholarship.pdf Part-B p.19-22 §3, §3.1-§3.5, §4,
-- §4.1-§4.3, p.23 §5.1
-- ---------------------------------------------------------------------------
insert into public.scheme_process_steps
  (scheme_id, step_order, title, description, actor, sla_or_timeline, source_ref)
select s.id, v.step_order, v.title, v.description, v.actor, v.sla_or_timeline, v.source_ref
from (values
 (1,'Take admission in a notified institute and approved course',
   'Student takes admission in a notified institute with a course approved by the Ministry of Tribal Affairs.',
   'Student; Institute',null,'national-fellowship-scholarship.pdf Part-B p.19 §3.1'),
 (2,'Register on the National Scholarship Portal',
   'Student registers on the National Scholarship Portal at scholarships.gov.in, following the Guidelines for Registration on NSP.',
   'Student',null,'national-fellowship-scholarship.pdf Part-B p.19 §3.1'),
 (3,'Fill the application and upload documents',
   'Student fills the application online and uploads documents. Dates of opening and closing are advertised on NSP each year by the DBT Mission; applications after the cut-off date and time are not entertained.',
   'Student','Opening/closing dates advertised annually on NSP by the DBT Mission','national-fellowship-scholarship.pdf Part-B p.19 §3.2'),
 (4,'Institute Nodal Officer verification',
   'The Institute Nodal Officer registers on NSP, verifies the physical documents against the uploaded credentials, and is responsible for the genuineness of certificates. The Institute must not charge any fee for verification. All applications submitted at institute level within the stipulated date and time are processed. The Institute Operational Manual on NSP is the reference.',
   'Institute Nodal Officer',null,'national-fellowship-scholarship.pdf Part-B p.19-20 §3.3'),
 (5,'Ministry verification',
   'Ministry verification on NSP. Discrepancies cause the application to be marked defective and visible to the student; the student corrects and re-submits at Institute level, and the Institute re-verifies and submits to the Ministry before the last date.',
   'Ministry of Tribal Affairs',null,'national-fellowship-scholarship.pdf Part-B p.20 §3.4'),
 (6,'Selection list published',
   'The selection list is published on the MoTA website. The Ministry''s decision is final and it reserves the right to withdraw or cancel without giving reasons.',
   'Ministry of Tribal Affairs',null,'national-fellowship-scholarship.pdf Part-B p.20 §3.5'),
 (7,'Payment once a year through PFMS DBT',
   'Payment once a year through PFMS DBT. Component I (computer and accessories, books and stationery, stipend, non-refundable fees) is released to the student. Component II (tuition fee and admission fee) is released to the Institute, or reimbursed to the student''s Aadhaar-seeded account on submission of receipt or vouchers.',
   'Ministry of Tribal Affairs; PFMS; designated bank','Once a year','national-fellowship-scholarship.pdf Part-B p.21-22 §4, §4.1'),
 (8,'Institute submits Utilization Certificate',
   'The Institute submits a Utilization Certificate in GFR-12A format online with the student list, and refunds any unspent balance with accrued interest by DD payable at Sr. AO / PAO, M/O Tribal Affairs, New Delhi, payable at Delhi SBI Shastri Bhawan, along with reasons.',
   'Institute',null,'national-fellowship-scholarship.pdf Part-B p.22 §4.2'),
 (9,'Institute updates PFMS expenditure',
   'The Institute onboards and updates online expenditure and unspent balance on PFMS. PFMS expenditure must match the Utilization Certificate. The EAT-02 report of PFMS is used as the basis for releasing the scholarship for the subsequent year.',
   'Institute; PFMS',null,'national-fellowship-scholarship.pdf Part-B p.22 §4.3'),
 (10,'Institute must not ask students for tuition fee',
   'The Institute must not ask students for tuition fee if Ministry payment is delayed.',
   'Institute',null,'national-fellowship-scholarship.pdf Part-B p.22 §4.3'),
 (11,'Institute updates course completion',
   'The University or Institute updates course completion on the Ministry''s portal.',
   'University / Institute',null,'national-fellowship-scholarship.pdf Part-B p.23 §5.1')
) as v(step_order,title,description,actor,sla_or_timeline,source_ref)
cross join public.schemes s
where s.scheme_code = 'A023B';

-- ---------------------------------------------------------------------------
-- ARG45 - 18 steps
-- national-fellowship-scholarship.pdf Part-A p.8-13 §3, §3.1-§3.8, §4,
-- §4.1-§4.3, §5.1-§5.3
-- ---------------------------------------------------------------------------
insert into public.scheme_process_steps
  (scheme_id, step_order, title, description, actor, sla_or_timeline, source_ref)
select s.id, v.step_order, v.title, v.description, v.actor, v.sla_or_timeline, v.source_ref
from (values
 (1,'Register on the National Fellowship Portal and DigiLocker',
   'Register on the National Fellowship Portal at fellowship.tribal.gov.in and on DigiLocker. Aadhaar is mandatory.',
   'Applicant',null,'national-fellowship-scholarship.pdf Part-A p.8 §3.1'),
 (2,'Read the Instruction Manual',
   'Read the Instruction Manual and use the portal help desk. Incomplete applications will not be considered.',
   'Applicant',null,'national-fellowship-scholarship.pdf Part-A p.8 §3.2'),
 (3,'Fill the application and upload documents',
   'Fill the application online and upload or fetch documents.',
   'Applicant',null,'national-fellowship-scholarship.pdf Part-A p.8-9 §3.3'),
 (4,'University Nodal Officer verification',
   'The University Nodal Officer registers on the portal, verifies the physical documents, and confirms that uploaded information matches the physical documents furnished at verification.',
   'University Nodal Officer',null,'national-fellowship-scholarship.pdf Part-A p.9 §3.4'),
 (5,'Ministry online verification',
   'Ministry online verification. Discrepancies cause the application to be marked defective and visible to the student; the student corrects and resubmits once again at Institute level, and the Institute verifies the corrected application and submits to the Ministry before the last date.',
   'Ministry of Tribal Affairs',null,'national-fellowship-scholarship.pdf Part-A p.9 §3.5'),
 (6,'Selection',
   'Selection by merit based on the PG examination marks and the criteria of the Selection Committee. The Committee is chaired by the Secretary (MoTA) and includes the Joint Secretary and Financial Adviser, the Joint Secretary Scholarship Division, the Director or Deputy Secretary Scholarship Division, a representative from the Ministry of Social Justice and Empowerment, and a representative from UGC. An expert may be invited as a special invitee.',
   'Selection Committee',null,'national-fellowship-scholarship.pdf Part-A p.9-10 §3.6'),
 (7,'Provisional merit list published',
   'The merit list of provisionally selected scholars is published on the MoTA website. The Ministry''s decision is final and it may withdraw or cancel without giving reasons.',
   'Ministry of Tribal Affairs',null,'national-fellowship-scholarship.pdf Part-A p.10 §3.7'),
 (8,'Take admission and submit the joining report',
   'Within 1 month of the provisional award letter, the scholar must take admission and submit the joining report to the Ministry. Failure cancels the award and the waiting list is offered the opportunity.',
   'Scholar; University','Within 1 month of the provisional award letter','national-fellowship-scholarship.pdf Part-A p.10 §3.8'),
 (9,'Complete post-award formalities',
   'Within one month of award: refund any scholarship already availed elsewhere, with a certificate, from the date of selection; upload the refund receipt where applicable; upload the signed checklist from the provisional award letter; and upload a No Objection Certificate from the University or Institute confirming non-availing of any other fellowship or scholarship.',
   'Scholar; University','Within one month of award','national-fellowship-scholarship.pdf Part-A p.10-11 §4'),
 (10,'University uploads beneficiary master data',
   'The University uploads on the designated bank portal or agency: the joining report, the master data of eligible beneficiaries, and bank account numbers validated through PFMS to create beneficiary IDs.',
   'University Nodal Officer',null,'national-fellowship-scholarship.pdf Part-A p.11 §4.1'),
 (11,'Linking and quarterly continuation certificate',
   'The University links the scholar ID with the designated bank portal and submits to the Ministry for approval, then uploads a quarterly continuation certificate: Q1 Apr-Jun by 10 July; Q2 Jul-Sep by 10 October; Q3 Oct-Dec by 10 January; Q4 Jan-Mar by 10 April.',
   'University Nodal Officer','Q1 by 10 July; Q2 by 10 October; Q3 by 10 January; Q4 by 10 April','national-fellowship-scholarship.pdf Part-A p.11-12 §4.2'),
 (12,'University marks monthly HRA entitlement',
   'The University marks monthly HRA entitlement after Ministry approval of continuation.',
   'University Nodal Officer','Monthly','national-fellowship-scholarship.pdf Part-A p.12 §4.3'),
 (13,'Progress report after one year',
   'After one year of fellowship, the fellow submits a progress report at the University or uploads it at the tribal repository portal.',
   'Scholar; University','After one year of fellowship','national-fellowship-scholarship.pdf Part-A p.12 §5.1'),
 (14,'Quarterly release through PFMS DBT',
   'Quarterly release through PFMS DBT to active bank accounts linked with Aadhaar and mobile. The mobile number in Aadhaar and in the bank account must be the same.',
   'Ministry of Tribal Affairs; PFMS; designated bank','Quarterly','national-fellowship-scholarship.pdf Part-A p.12 §4.1-§4.2'),
 (15,'Completion: certificate and thesis upload',
   'At completion, submit the M.Phil/Ph.D certificate and course completion certificate to the Ministry, and upload the thesis on repository.tribal.gov.in with metadata. The last quarter''s fellowship is released only after the thesis is uploaded.',
   'Scholar; University','Last quarter released only after thesis upload','national-fellowship-scholarship.pdf Part-A p.13 §5.2'),
 (16,'Change of University',
   'Permitted with prior approval of both universities; the old university initiates the online transfer at the designated bank portal, the new one accepts it, both upload No Objection Certificates, and the Ministry approves.',
   'Scholar; both Universities; Ministry',null,'national-fellowship-scholarship.pdf Part-A p.13 §5.3'),
 (17,'Change of subject or course',
   'Permitted with prior approval of the University; the student updates the portal. Duration remains 2 years for M.Phil and 5 years for M.Phil+Ph.D or Ph.D.',
   'Scholar; University',null,'national-fellowship-scholarship.pdf Part-A p.13 §5.3'),
 (18,'Discontinuation',
   'The scholar submits an undertaking with reasons; the University marks it discontinued on the designated bank''s portal to stop further payment.',
   'Scholar; University',null,'national-fellowship-scholarship.pdf Part-A p.13-14 §5.3')
) as v(step_order,title,description,actor,sla_or_timeline,source_ref)
cross join public.schemes s
where s.scheme_code = 'ARG45';

-- ---------------------------------------------------------------------------
-- AZKMI - 20 steps
-- national-overseas-scholarship.pdf p.7-10 §4.1-§4.4, §4.5, §5, p.11 §7, §8
-- ---------------------------------------------------------------------------
insert into public.scheme_process_steps
  (scheme_id, step_order, title, description, actor, sla_or_timeline, source_ref)
select s.id, v.step_order, v.title, v.description, v.actor, v.sla_or_timeline, v.source_ref
from (values
 (1,'Invitation to apply',
   'Applications are invited online through the National Overseas Scholarship Portal. Opening and closing are announced by advertisement in Employment News, other prominent news dailies, through Institutes and Universities, State Governments, and the Ministry''s portal.',
   'Ministry of Tribal Affairs','Opening and closing announced by advertisement each cycle','national-overseas-scholarship.pdf p.7 §4.1'),
 (2,'Read the Instruction Manual',
   'Read the Instruction Manual on the portal and use the helpdesk module for queries.',
   'Applicant',null,'national-overseas-scholarship.pdf p.7 §4.1'),
 (3,'Register on NOSP and DigiLocker',
   'Register on the National Overseas Scholarship Portal and on DigiLocker. Aadhaar is mandatory for registration.',
   'Applicant',null,'national-overseas-scholarship.pdf p.7-8 §4.2'),
 (4,'Upload documents through DigiLocker',
   'Upload documents through DigiLocker. Candidates must fulfil all eligibility criteria at the time of applying; failure to upload a mandatory eligibility document makes the application liable to be rejected.',
   'Applicant',null,'national-overseas-scholarship.pdf p.7-8 §4.3'),
 (5,'Scrutiny for eligibility and field-wise merit lists',
   'All applications received within the stipulated period are scrutinised for eligibility, and separate merit lists are drawn per field of study.',
   'Ministry of Tribal Affairs',null,'national-overseas-scholarship.pdf p.8 §4.4'),
 (6,'Merit tier (a) - already admitted at a top 1,000 institute',
   'Candidates already admitted and pursuing studies at top 1,000 QS-ranked foreign institutes or universities. Merit is by institute ranking, with ties broken by qualifying-exam marks.',
   'Ministry of Tribal Affairs',null,'national-overseas-scholarship.pdf p.8 §4.4'),
 (7,'Merit tier (b) - preliminary offer from a top 1,000 institute',
   'Candidates holding a preliminary letter or offer of admission from top 1,000 institutes who have not yet joined, with the same ranking and tie-breaking logic.',
   'Ministry of Tribal Affairs',null,'national-overseas-scholarship.pdf p.8 §4.4'),
 (8,'Merit tier (c) - personal interview',
   'Remaining eligible candidates are selected through a personal interview by an expert committee constituted by the Ministry. Candidates who have cleared GRE, GMAT, TOEFL and similar tests are given preference.',
   'Ministry of Tribal Affairs; expert committee',null,'national-overseas-scholarship.pdf p.8-9 §4.4'),
 (9,'Travel reimbursement for interviewed candidates',
   'Short-listed interview candidates receive second-class train or bus fare reimbursement from residence to the interview place, by the shortest route.',
   'Ministry of Tribal Affairs',null,'national-overseas-scholarship.pdf p.9 §4.4'),
 (10,'Provisional merit list',
   'The provisional merit list is posted on the Ministry''s website.',
   'Ministry of Tribal Affairs',null,'national-overseas-scholarship.pdf p.9 §4.5'),
 (11,'Verification',
   'Tier (a) candidates are verified by the Indian Embassy or Mission in the country of study; tiers (b) and (c) are verified by the respective State or UT.',
   'Indian Embassy/Mission; State/UT',null,'national-overseas-scholarship.pdf p.9-10 §4.5'),
 (12,'Join a top 1,000 institute within the deadline',
   'Selected candidates must secure admission and join a top 1,000 QS-ranked foreign institute within 2 years of communication of the Award Letter; on expiry the award is automatically cancelled. Unfilled seats carry over to the next selection year. The FAQ adds that a selected candidate must join within 6 months, extendable up to 2 years, and that the Ministry issues a confirmed award letter after verifying the admission letter and visa.',
   'Selected candidate','Within 2 years of the Award Letter; automatically cancelled on expiry','national-overseas-scholarship.pdf p.10 §4.5; MoTA FAQ'),
 (13,'Scholarship is prospective from the award letter',
   'The scholarship is prospective from the date of issuance of the award letter, and the maintenance and contingency allowance for the remaining financial year are pro-rated to the number of months.',
   'Ministry of Tribal Affairs',null,'national-overseas-scholarship.pdf p.10 §4.5'),
 (14,'Progress reporting every 6 months',
   'The student submits a progress report on the NOS Portal once every 6 months. The Indian Mission obtains performance reports from the university and updates joining or discontinuation details on overseas.tribal.gov.in.',
   'Student; Indian Embassy/Mission','Once every 6 months','national-overseas-scholarship.pdf p.10 §4.5'),
 (15,'Permission before leaving the country',
   'Before leaving the country the student must take permission of the Indian Mission and inform the Ministry on the portal.',
   'Student; Indian Embassy/Mission',null,'national-overseas-scholarship.pdf p.10 §4.5'),
 (16,'Report adverse developments',
   'The Mission must be informed of any serious adverse developments affecting continuation of the award.',
   'Awardee; Indian Embassy/Mission',null,'national-overseas-scholarship.pdf p.10 §4.5'),
 (17,'Course completion in the Alumni Module',
   'After course completion the awardee uploads course completion details and a brief of study in the Alumni Module of the NOS portal before return tickets are booked.',
   'Awardee',null,'national-overseas-scholarship.pdf p.10-11 §5'),
 (18,'Cancellation and recovery',
   'Cancellation and recovery apply for false documents or non-conformance with the guidelines; returning to India without completing the course, excused only by a certificate from a medical officer nominated by the Indian Mission for ill-health; involvement in illegal or antinational activity, misconduct, narcotics, violation of host-country law, or any police case. MoTA may recover amounts already paid.',
   'Ministry of Tribal Affairs',null,'national-overseas-scholarship.pdf p.11 §7'),
 (19,'Jurisdiction for litigation',
   'Any litigation on matters arising out of this scheme in India is subject to the sole jurisdiction of the courts situated in the Union Territory of Delhi. Litigation arising abroad is attended to by the Indian Missions abroad.',
   'Awardee; Ministry of Tribal Affairs',null,'national-overseas-scholarship.pdf p.11 §8'),
 (20,'Change in the scheme provisions',
   'The Ministry may change the provisions of the scheme, effective from the date it notifies. The Ministry''s portal is the authoritative source for the current provisions.',
   'Ministry of Tribal Affairs',null,'national-overseas-scholarship.pdf p.11 §9')
) as v(step_order,title,description,actor,sla_or_timeline,source_ref)
cross join public.schemes s
where s.scheme_code = 'AZKMI';
