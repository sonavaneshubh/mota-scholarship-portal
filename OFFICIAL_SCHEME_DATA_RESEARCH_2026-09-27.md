# Official Scheme Data Research & Database Gap Audit

**Scope:** 5 official MoTA schemes — BPVGK, BVOBC, A023B, ARG45, AZKMI
**Research date / last verified:** 2026-09-27
**Database:** read-only inspection. **No INSERT, UPDATE, DELETE, ALTER or migration was executed.**
**Sources used:** repository guideline PDFs (extracted with page numbers) + official MoTA / DBT Tribal / Government of India sources only. No third-party source was used as evidence.

---

## 0. Method and source inventory

### 0.1 Repository official documents (all 4 read in full)

| File | Official title | Period | Pages | Read status |
|---|---|---|---|---|
| `public/guidelines/pre-matric-scholarship.pdf` | Guidelines — Pre-Matric Scholarship for Scheduled Tribe Students Studying in Classes IX & X [Centrally Sponsored Scheme] | 2021-22 to 2025-26 | 12 | Full text extracted |
| `public/guidelines/post-matric-scholarship.pdf` | Post Matric Scholarship (Centrally Sponsored Scheme) for ST Students — Regulation Governing the Award of Scholarship | Applicable from 01-04-2022 | 19 | Full text extracted |
| `public/guidelines/national-fellowship-scholarship.pdf` | National Fellowship & Scholarship for Higher Education of Scheduled Tribe Students [Central Sector Scheme] — **Part-A = National Fellowship, Part-B = National Scholarship (Top Class)** | 2021-22 to 2025-26 | 38 | Full text extracted |
| `public/guidelines/national-overseas-scholarship.pdf` | Central-Sector Scholarship Scheme of National Overseas Scholarship for ST Students | 2021-22 to 2025-26 | 11 | Full text extracted |

Extracted text with page markers was written next to each PDF as `<name>.extracted.txt` for citation and searching. This is a build artefact, not a database change.

### 0.2 Correction to an earlier internal conclusion

`supabase/migrations/20260927000009_scheme_detail_from_official_guidelines.sql` states:

> "A023B (Top Class Education For ST Students) has no matching document. The file originally offered for it is byte-identical to the National Fellowship PDF (md5 087ffc34b4fdce61ab4b8f62d445fa35), so it is a copy of the ARG45 document and not an A023B guideline. Nothing in this migration touches A023B."

**This conclusion was incorrect and is withdrawn.** A single official MoTA document legitimately covers two schemes. `national-fellowship-scholarship.pdf` is the official guideline of the merged scheme "National Fellowship & Scholarship for Higher Education of ST Students", containing:

- **Part-A (pp. 4–15)** — National Fellowship Scheme → **ARG45**
- **Part-B (pp. 16–23)** — National Scholarship Scheme → **A023B / Top Class**
- **Annexure-I (pp. 24–38)** — the notified list of Top Class institutes

So A023B **does** have a first-class official guideline in the repository. The correct action is to load Part-B under A023B, not to leave A023B unpopulated. The migration's caution (don't publish Part-A content under the A023B name) was right in spirit but its premise was wrong.

### 0.3 Official web sources used

| Source | URL | What it establishes |
|---|---|---|
| MoTA Scholarship & DBT hub | `https://tribal.nic.in/Scholarship.aspx` | Scheme summaries, rates, funding pattern, guideline links, grievance routing |
| DBT Tribal scheme list | `https://dbttribal.gov.in/AllScheme.aspx` | Official scheme **codes**, names, benefit type, scheme type, current status |
| National Fellowship Portal | `https://fellowship.tribal.gov.in` | ARG45 portal, 750 fellowships/year, live scope wording, current notices |
| National Overseas Scholarship Portal | `https://overseas.tribal.gov.in` | AZKMI portal, 20 awards/year, 2026-27 application window |
| MoTA Grievance portal | `https://tribal.nic.in/Grievance/` | Grievance route for all five schemes |
| MoTA Contact Us | `https://tribal.nic.in/contactUs.aspx` | Nodal officers per scheme |
| Fellowship portal contact | `https://fellowship.tribal.gov.in/Help.aspx` | Scholarship Division contacts |
| Overseas portal contact | `https://overseas.tribal.gov.in/Help.aspx` | Scholarship Division contacts |
| DBT Tribal contact | `https://dbttribal.gov.in/Contact.aspx` | DBT portal support |
| PIB press release 2026-02-05 | `https://www.pib.gov.in/PressReleasePage.aspx?PRID=2223698` | Current official confirmation of pre-matric & post-matric rates |
| PIB press release 2025-08-21 | `https://www.pib.gov.in/PressReleasePage.aspx?PRID=2159071` | Pre/Post-Matric now under PMVKY umbrella |
| PIB press release 2026-03-12 | `https://www.pib.gov.in/PressReleasePage.aspx?PRID=2238931` | Scheme umbrella + NITI Aayog evaluation |
| DBT Tribal public report | `https://dbttribal.gov.in/PrePostRPT.aspx` | Beneficiary/fund volumes 01-04-2024 → 02-03-2026 |
| NSP FAQ, Top Class | `https://scholarships.gov.in/public/schemeGuidelines/tribalfellowshipfaq.pdf` | A023B documents, grievance steps, helplines |
| MoTA FAQ, National Fellowship | `http://tribal.nic.in/downloads/faqs/National-Fellowship-FAQs.pdf` | ARG45 document list, NOC, grievance routes |
| MoTA FAQ, National Overseas | `http://tribal.nic.in/downloads/faqs/National-Overseas-Scholarship-FAQs.pdf` | AZKMI document list, file sizes, formats, join timelines |
| UMANG instruction manual | `https://tribal.nic.in/downloads/faqs/UMANG.pdf` | **File size limits: PDF ≤ 500 KB, photo JPG/JPEG ≤ 100 KB** |
| Top Class selection list OM 10-06-2025 | `https://tribal.nic.in/downloads/scholarship/topclass/RevisedListTopClassSelectedStudentsFY2024-253211.pdf` | 3,211 selections for 2024-25; Ministry-level verification |
| Revised NOS guidelines | `https://tribal.nic.in/downloads/guidelines/NOS/RevisedGuidelinesNOS07102022.pdf` | Confirms repository AZKMI PDF is the official revised NOS guideline dated 07-10-2022 |
| Superseded 2017 NFS guidelines | `https://tribal.nic.in/downloads/guidelines/NFS/GuidelinesFellowshipandScholarship2021.pdf` | F. No.11019/02/2017-Sch., merger history, 750 + 1000 slots |
| NSP-hosted Pre-Matric guidelines | `https://scholarships.gov.in/public/schemeGuidelines/PRE_MATRIC_ST_(Class_IX_X)_GUIDELINES.pdf` | Superseded 01-07-2012 version (income ₹2.00 lakh) |
| NSP-hosted Post-Matric regulation | `https://scholarships.gov.in/public/schemeGuidelines/HP_state_scheme/Centrally%20Sponsored%20Scheme%20%20of%20Post%20Matric%20Scholarship%20Scheme%20for%20ST%20Students_scheme.pdf` | Confirms repository BVOBC PDF is the official regulation |
| Scholarship amount revision 20-12-2019 | `https://tribal.nic.in/DivisionsFiles/education/IncreaseincholarshipamtunderPrenPMS20Dec2019.pdf` | ₹150→₹225 day, ₹350→₹525 hosteller |
| Thesis repository | `https://repository.tribal.gov.in` | ARG45 thesis upload gate for final quarter |

### 0.4 Explicitly excluded

A "National Overseas Scholarship" run by the **Ministry of Social Justice and Empowerment** for SC / Denotified, Nomadic & Semi-Nomadic Tribes / Landless Agricultural Labourers / Traditional Artisans (`nosmsje.gov.in`, `socialjustice.gov.in`) is a **different scheme** and is **not** AZKMI. It was excluded. Third-party scheme blogs were also excluded.

---

## 1. BPVGK — Pre-Matric Scholarship Scheme For ST Student

### 1.1 Basic information

| Field | Official value | Source |
|---|---|---|
| Official name | Pre-Matric Scholarship Scheme For ST Student | DBT Tribal `AllScheme.aspx` |
| Scheme code | BPVGK | DBT Tribal `AllScheme.aspx` |
| Scheme type | Centrally Sponsored Scheme | DBT Tribal; PDF p.1 |
| Ministry | Ministry of Tribal Affairs, Government of India | PDF p.1 |
| Guideline period | 2021-22 to 2025-26 | PDF p.1 |
| Benefit type (official) | In Cash | DBT Tribal `AllScheme.aspx` |
| Current status | Active | DBT Tribal `AllScheme.aspx` |
| Scheme page | `https://tribal.nic.in/Scholarship.aspx` | — |
| DBT Tribal page | `https://dbttribal.gov.in/AllScheme.aspx` | — |
| Application portal | `https://scholarships.gov.in` (NSP) or State portal | PDF p.5 §4.I; p.8 §6 |
| Implementation | State/UT invites applications, verifies, disburses to student's bank via DBT | PDF p.3 §3.1; tribal.nic.in |
| Funding pattern | 75:25 Centre:State; **90:10** for NE and hilly States/UT (J&K, Himachal Pradesh, Uttarakhand); **100%** Centre for UTs without a legislature (e.g. Andaman & Nicobar) | PDF p.9 §8; tribal.nic.in; PIB PRID=2223698 (2026-02-05) |
| Class covered | Classes IX and X | PDF p.1, p.3 §1 |

### 1.2 Eligibility conditions

Source: PDF p.3 §3.2 and p.3–4 §3.3.

1. Belong to the Scheduled Tribe as specified in relation to the Domicile State/UT the student actually belongs to.
2. Studying in a Government School, or a School recognized by Government or a Central/State Board of Secondary Education.
3. Family income from all sources ≤ **Rs. 2,50,000 per annum**.
4. Valid account in a **Scheduled Bank**, linked with Aadhaar and mobile number.
5. Not receiving any other scholarship.
6. Scholarship for any class is available for only one year; not payable twice for the same class; renewable on promotion.

Income computation (PDF p.4):
- Both parents working → combined income of both.
- Any other earning family member → income excluded.
- Only one parent alive → that parent's income.
- Orphan supported by a guardian → income criteria does not apply.
- Definition of income: gross income from all sources, without any exemption or deduction available under the Income Tax Act.
- Income certificate taken **once only**, at admission to Class IX; valid for Class X too.
- For a salaried parent, income of the previous financial year is used.

**Minimum percentage:** NOT SPECIFIED OFFICIALLY.
**Age limits:** NOT SPECIFIED OFFICIALLY.

### 1.3 Financial benefits

Source: PDF p.4 §3.4 (Table), p.5 §3.5.

| Component | Day Scholar | Hosteller |
|---|---|---|
| Scholarship, 10 months | Rs. 225 / month — Rs. 2,250 / year | Rs. 525 / month — Rs. 5,250 / year |
| Books and ad hoc grant | Rs. 750 (one-off) | Rs. 1,000 (one-off) |
| Additional Disability Allowance | Rs. 600 / month — Rs. 7,200 / year (12 months) | Rs. 800 / month — Rs. 9,600 / year (12 months) |

- Scholarship is payable for **10 months** in an academic year; the disability allowance is payable for **all 12 months**.
- Disability must be certified by a competent medical authority of the State Govt./UT Administration; the allowance also applies to leprosy-cured students and students with sickle cell anaemia or Thalassemia, with the necessary certificate.
- Award continues subject to good conduct and regularity in attendance; renewed for Class X after passing Class IX.
- tribal.nic.in and PIB (2026-02-05) confirm Rs. 225 / Rs. 525 per month for 10 months — **no conflict** with the PDF.

### 1.4 Required documents

Source: PDF p.7 §5. Students must check the State/NSP portal; the list below is the guideline's own.

1. Aadhaar Number
2. Domicile certificate
3. ST certificate issued by the competent authority of the State
4. Family Income Certificate
5. Disability certificate
6. Scanned copy of the passport-size photograph

Additional official rules:
- The State/UT specifies the issuing procedure and competent authority for ST, family income and disability certificates; DigiLocker integration is permitted.
- **Self-declarations or affidavits of self-assessment of income are not acceptable** (PDF p.7 Note 1).
- **Accepted file formats:** NOT SPECIFIED OFFICIALLY in the guideline.
- **Maximum file size:** NOT SPECIFIED OFFICIALLY for this scheme.

### 1.5 Application process (ordered, as supported by the guideline)

Source: PDF p.5–6 §4, p.6–7 §4.1/§4.2, p.8 §6, p.9 §7.

1. Student reads the State/NSP portal instructions and assembles documents.
2. Student registers and submits the application on the State portal, or on NSP if the State has opted for it.
3. Student uploads documents and a legible, clear photograph.
4. **Institute Nodal Officer (INO) — 1st level verification.** The institute must hold a valid AISHE / U-DISE / NCVT / SCVT code. The INO verifies form and document correctness, keeps physical copies, and marks the application *verified*, *rejected* (with reason) or *defective* (with reason).
5. **District / State Nodal Officer — 2nd/3rd level verification**, may verify, mark defective, or reject, giving reasons.
6. Defective applications are returned to the student, who rectifies the errors and complies with remarks; the INO re-verifies.
7. Applications rejected by the nodal officer are not processed further.
8. Disbursement to the student's own bank account through DBT.

Suggested timeline (PDF p.8, identical for fresh and renewal):

| Process | Date |
|---|---|
| Registration for students | 1 April – 31 July |
| Completion of Institute verification | 31 August |
| Completion of Institute/State verification | 30 September |
| Disbursement of scholarship | 31 October |

The guideline says these are **suggestive**, that States should try to open the portal by **1 April**, and that renewal disbursement should begin as soon as verification completes. Applicants are advised to act on portal SMS, follow up with the institute before deadlines, and keep the same mobile number as the one linked to the bank account.

### 1.6 Guidelines / FAQ / manual / portal

- Current guideline: bundled `pre-matric-scholarship.pdf` (12 pp., 2021-22 to 2025-26).
- NSP-hosted copy of the identical central guideline (Tripura upload): `https://scholarships.gov.in/public/schemeGuidelines/Tripura/Pre-Matric(CSS)-Revised-guidelines-tripura.pdf`
- Superseded guideline w.e.f. 01-07-2012: `https://scholarships.gov.in/public/schemeGuidelines/PRE_MATRIC_ST_(Class_IX_X)_GUIDELINES.pdf`
- Scholarship amount revision w.e.f. 01-12-2019: `https://tribal.nic.in/DivisionsFiles/education/IncreaseincholarshipamtunderPrenPMS20Dec2019.pdf` (₹150→₹225 day scholars; ₹350→₹525 hostellers)
- "Upward revision of annual parental income" circular is linked from tribal.nic.in (not captured — see §7 conflict 9)
- Application portal: `https://scholarships.gov.in`
- No dedicated central FAQ was located for this scheme.

### 1.7 Grievance and contact

- State/UT Helpdesk / grievance-redressal mechanism is mandatory (PDF p.7 §5.1), with escalation to the State/NSP team (p.8).
- MoTA grievance portal: `https://tribal.nic.in/Grievance/`
- Email for pre/post-matric queries: `edu-tribal@nic.in` (tribal.nic.in/Scholarship.aspx, Grievances section)
- Section Officer (Pre-Matric & Post-Matric Scholarship for ST Students): Sh. Kundan Kumar — `kundan.kr@gov.in`, intercom 215614
- Director (Pre Metric & Post Metric Scholarship, DBT): Sh. Bachagundi Shivanand F. — 011-24013713, `shivanand.b@gov.in`
- Joint Secretary (Scholarships in remit): Sh. Anant Prakash Pandey — 011-24013702 / 011-24013703, `js-mota@tribal.gov.in`

### 1.8 Database comparison

| Item | Current DB value | Official value | Classification |
|---|---|---|---|
| `scheme_code`, `name`, `scheme_type`, `status`, `verification_status`, `is_active` | BPVGK, correct name, Centrally Sponsored Scheme, published, verified, true | Matches DBT Tribal listing | **ALREADY CORRECT** |
| `schemes.official_scheme_url` | `https://dbttribal.gov.in/AllScheme.aspx` | Valid but generic; scheme page is `https://tribal.nic.in/Scholarship.aspx` | **MISSING VALUE — EXISTING COLUMN CAN STORE IT** (store per-scheme URL) |
| `schemes.official_application_url` | `https://dbttribal.gov.in/` | `https://scholarships.gov.in` | **MISSING VALUE — EXISTING COLUMN CAN STORE IT** |
| `schemes.gr_url` | NULL | Bundled official PDF / tribal.nic.in guideline link | **MISSING VALUE — EXISTING COLUMN CAN STORE IT** |
| `schemes.application_start_date` / `end_date` | 2025-07-01 / 2025-12-31 | Central guideline gives no dates; State/NSP sets them. 2026-27 examples: Manipur 01-08-2026→31-10-2026; J&K 22-07-2026→20-09-2026 | **CONFLICTING OFFICIAL SOURCES** — dates are per-State/per-year, not central |
| `schemes.academic_year` | "2025-2026" | Guidelines period has lapsed; live cycle is 2026-27 | **MISSING VALUE** |
| `schemes.source_last_verified_at` | 2025-01-15 | Should be 2026-09-27 for this audit | **MISSING VALUE** |
| `scheme_eligibility.maximum_family_income` | **200000** | **250000** | **CONFLICTING OFFICIAL SOURCES** — DB matches the superseded 2012 guideline |
| `scheme_eligibility.minimum_percentage` | NULL | Not specified | **NOT SPECIFIED OFFICIALLY** — correct as NULL |
| `scheme_eligibility.minimum_age` / `maximum_age` | NULL / NULL | Not specified | **NOT SPECIFIED OFFICIALLY** — correct as NULL |
| `scheme_eligibility.required_domicile` | true | Correct (award by domicile State; student may study elsewhere) | **ALREADY CORRECT** |
| `scheme_eligibility.required_hosteller` | false | Both day-scholar and hosteller rates exist — a flat "not required" hides a rate difference | **MISSING VALUE — EXISTING COLUMN CAN STORE IT** (as "either"; rate tiering needs benefit rows) |
| `scheme_eligibility.eligible_course_levels` | NULL | Classes IX–X | **MISSING VALUE — EXISTING COLUMN CAN STORE IT** |
| `scheme_eligibility.eligible_course_types` | NULL | Government school or Government/Central/State Board recognized school | **MISSING VALUE — EXISTING COLUMN CAN STORE IT** |
| `scheme_eligibility.eligible_categories` | NULL | ST | **MISSING VALUE — EXISTING COLUMN CAN STORE IT** |
| `scheme_eligibility.other_rules` | "…income should not exceed Rs. 2,00,000. Regular attendance required." | ₹2,50,000; attendance is a renewal condition not an eligibility bar | **CONFLICTING OFFICIAL SOURCES** |
| `scheme_benefits` | 1 row, `maintenance_allowance`, amount NULL, monthly | 7 distinct values across 4 components | **MISSING VALUE — EXISTING COLUMNS CAN STORE IT** (one row per component × day/hosteller) |
| `scheme_benefits.frequency` | monthly | Scholarship monthly (10 months); disability allowance monthly (12 months); books grant one-off | **MISSING VALUE** |
| `scheme_documents` | 4 rows, all `document_type` = "Other" | 6 documents | **MISSING VALUE — EXISTING COLUMNS CAN STORE IT** (add disability certificate, passport photo) |
| `scheme_documents.accepted_formats`, `max_file_size_mb` | NULL, NULL | Not specified for this scheme | **NOT SPECIFIED OFFICIALLY** — correct as NULL |
| Application process | no storage | 8 ordered steps + timeline | **REQUIRES NEW TABLE** |
| Institution requirement | no storage | Government / Board-recognized school | **MISSING VALUE — EXISTING COLUMN CAN STORE IT** (`eligible_course_types` / `other_rules`) |
| Grievance / contact | no storage | portal + email + helplines | **REQUIRES NEW TABLE** (or a scheme-level contact block) |
| `scheme_sources` | 1 generic row, `content_hash`/`retrieved_at` NULL | guideline PDF + tribal.nic.in + NSP | **MISSING VALUE — EXISTING COLUMNS CAN STORE IT** (one row per source) |
| `scheme_versions.change_summary` | NULL | — | **MISSING VALUE** |

---

## 2. BVOBC — Post-Matric Scholarship Scheme For ST Students

### 2.1 Basic information

| Field | Official value | Source |
|---|---|---|
| Official name | Post-Matric Scholarship Scheme For ST Students | DBT Tribal `AllScheme.aspx` |
| Scheme code | BVOBC | DBT Tribal `AllScheme.aspx` |
| Scheme type | Centrally Sponsored Scheme | DBT Tribal; PDF p.1 |
| Guideline | Regulation Governing the Award of Scholarship, **applicable from 01-04-2022** | PDF p.1 |
| Benefit type (official) | In Cash | DBT Tribal `AllScheme.aspx` |
| Current status | Active | DBT Tribal `AllScheme.aspx` |
| Level covered | Class XI to Post Graduation, studies in India | PDF p.3 §1 |
| Application portal | `https://scholarships.gov.in` (NSP) or State portal | PDF p.9 §5.i |
| Funding pattern | 75:25; 90:10 NE/hilly (J&K, HP, UK); 100% Centre for UTs without legislature | PDF p.16 §10; PIB PRID=2223698 |
| Parent scheme | Now under the **Pradhan Mantri Vanbandhu Kalyan Yojna (PMVKY)** umbrella | PIB PRID=2159071 (2025-08-21); PRID=2238931 (2026-03-12) |

### 2.2 Eligibility conditions

Source: PDF p.3–5 §3.2, §3.2.1, §3.2.2, §3.3.

1. Belong to the Scheduled Tribe as specified in relation to the Domicile State/UT.
2. Have passed **Matriculation or Higher Secondary or any higher examination** of a recognized University or Board of Secondary Education.
3. Family income from all sources ≤ **Rs. 2,50,000 per annum**.
4. Valid account in a **Scheduled Bank** linked with Aadhaar and mobile number. The account must be **held in the student's own name** (PDF p.10 §5.b) and must be active/non-dormant.
5. Not receiving any other scholarship.
6. Study a recognized post-matriculation / post-secondary course in one of ten recognized institution categories (PDF p.3–4 §3.2.f):
   i. All Government Institutes/Colleges/Universities
   ii. Institutions of National Importance
   iii. Central/State universities, autonomous colleges recognized by UGC, and universities/colleges recognized under §2(f) and/or 12(B) of the UGC Act
   iv. Deemed Universities
   v. Private Universities recognized by State/Centre with 'A' level or equivalent NAAC/NBA accreditation
   vi. Private Professional Institutions affiliated to a recognized Central/State University
   vii. Schools/colleges recognized by Government or Government-aided, for Classes XI–XII
   viii. Diploma-granting Institutions recognized by State/UT Governments
   ix. Vocational Training Institutes affiliated to NCVT
   x. Institutions affiliated/approved by MCI/AICTE or any regulatory body established by State/Centre
7. **Note 1 (p.4):** students admitted from AY 2021-22 onwards to a **notified Top Class Institute** (252 institutes) are **not** eligible for Post-Matric; they receive the Top Class Scholarship instead. Students registered up to 2020-21 continue till course completion.
8. **Note 2 (p.4):** States are to shift gradually towards institutions ranking high under NIRF.
9. **§3.2.1:** a candidate who has **completed** a course in one stream is not eligible for a diploma/degree in a **different** stream.
10. **§3.2.2:** a scholar may hold only one scholarship/stipend at a time; if awarded another, the student chooses the more beneficial and informs the awarding authority through the Head of the Institution.

Income computation (PDF p.5): identical four rules to BPVGK. Income certificate taken **once only** at admission, valid for the **entire duration of the course**; a fresh income certificate is **not** required at renewal. Salaried parents → previous financial year.

**Minimum percentage:** NOT SPECIFIED OFFICIALLY (no 40% disability threshold is stated for this scheme).
**Age limits:** NOT SPECIFIED OFFICIALLY.

### 2.3 Financial benefits

Source: PDF p.5–8 §3.4, §3.4.1 (Table 1), §3.4.2 (Table 2, Note 4).

Two components: (a) compulsory non-refundable course fees, (b) monthly stipend.

**Fee component — four course groups (Table 1):**

| Group | Courses |
|---|---|
| I | Graduate and Post Graduate courses leading to a degree; PG Diploma; MPhil; PhD; professional courses in various streams |
| II | All non-professional recognized courses leading to a Graduate/Post Graduate Degree not covered under Group I — Arts, Science, Commerce (BA/B.Sc/B.Com, MA/MSc/M.Com etc.) |
| III | Vocational stream, ITI courses, 3-year diploma courses in Polytechnics etc. |
| IV | All post-matriculation level non-degree courses for which the entrance qualification is High School (Class X), e.g. senior secondary certificate (Class XI and XII) |

- The fee component is decided by the **State Level Fee Fixation Committee**.
- Ceiling on GoI support for **private** institutes: **Rs. 2.50 lakh per annum** for Engineering; **Rs. 6.00 lakh per annum** for MBBS/MS/MD; **Rs. 1.00 lakh per annum** for other courses.
- States may pay more; any excess is accounted separately in the State portal.
- The 2022 guidelines apply prospectively to fresh admissions from 1 April 2022.

**Stipend (Table 2):**

| Group | Hosteller (monthly / annual) | Day Scholar (monthly / annual) |
|---|---|---|
| I | Rs. 1,200 / Rs. 12,000 | Rs. 550 / Rs. 5,500 |
| II | Rs. 820 / Rs. 8,200 | Rs. 530 / Rs. 5,300 |
| III | Rs. 570 / Rs. 5,700 | Rs. 300 / Rs. 3,000 |
| IV | Rs. 380 / Rs. 3,800 | Rs. 230 / Rs. 2,300 |

**Additional Disability Allowance (Note 4):** Rs. 800/month (Rs. 9,600/yr) hosteller; Rs. 600/month (Rs. 7,200/yr) day scholar. Also applies to leprosy-cured students and students with sickle cell anaemia or Thalassemia.

**Payment period (p.13 §7.v):** stipend payable from 1 April or from the month of admission, whichever is later, to the month in which examinations are completed, for a **maximum of 10 months**. On renewal, from the month after the last month paid the previous year, if the course is continuous.

**"Deemed hostel" (Note 3):** where the college cannot provide hostel accommodation, an approved place of residence may be treated as hostel with a certificate from the Head of the Institution; it must consist of accommodation hired by **at least 5 students living together, usually with a common mess**.

tribal.nic.in and PIB (2026-02-05) state the range as **Rs. 230 to Rs. 1,200 per month** — consistent with Table 2 minimum and maximum. **No conflict.**

### 2.4 Required documents

Source: PDF p.12 §6.

1. Aadhaar Number
2. Domicile certificate
3. Scanned copy of certificates, diplomas, degrees for **all examinations passed**
4. Last qualified marks (percentage, or equivalent percentage where CGPA/OGPA)
5. ST certificate issued by the competent authority of the State/UT
6. Family Income Certificate
7. Disability certificate
8. Scanned copy of the passport-size photograph

Additional official rules:
- State/UT specifies issuing procedure and competent authority; DigiLocker integration permitted.
- **Self-declarations or affidavits of self-assessment of income are not acceptable** (p.12 Note 1).

**Accepted file formats / maximum size:** NOT SPECIFIED OFFICIALLY in the central guideline. State-level implementation varies — e.g. the J&K Directorate of Tribal Affairs 2026-27 notice requires PDF/JPG/JPEG of **150–200 KB** plus NSP OTR and AadhaarFace RD face authentication. That is a State/NSP rule, not a central scheme rule, and must not be stored as a scheme attribute.

### 2.5 Application process (ordered)

Source: PDF p.8–9 §4, p.9–12 §5/§5.1/§5.2/§5.3, p.14–15 §8.

1. **Empanelment.** The State empanels eligible institutes within and outside the State, with courses mapped to Groups I–IV, and shares the list with MoTA. Non-Government institutes are inspected in coordination with the destination State.
2. Student takes admission in any Government institute in or out of State; for **non-Government** institutes, admission only in an **empanelled** institute.
3. The State verifies registration, affiliation, accreditation, courses offered and approved seats.
4. Student applies online on the State portal or NSP.
5. Student uploads legible documents; bank A/c and IFSC must be correct and active; the account must be in the student's own name and linked with Aadhaar and mobile.
6. **Institute Nodal Officer — 1st level verification** (institute must hold a valid AISHE/U-DISE/NCVT/SCVT code). INO verifies details and uploaded documents, keeps physical copies, and marks *verified*, *rejected* or *defective*, always giving reasons. INO must not charge a verification fee.
7. **District / State Nodal Officer — 2nd/3rd level verification**, may verify, mark defective, or reject with reasons; monitors pendency at institute level.
8. **Ministry** provides PFMS configuration (agency ID, agency name, PFMS scheme code, DBT mission code, beneficiary type, payment purpose code), verifies scheme configuration including eligibility criteria and important dates, and monitors progress.
9. Defective applications return to the student for correction and re-submission; the INO re-verifies and forwards.
10. Disbursement via DBT. The State may credit the entire fee to the student's account, or pay tuition fee to the Institute and the stipend to the student.
11. Non-Government institutes must not force fee payment because of disbursement delay, and the State must allow the student to sit exams and attend classes.

Suggested timeline (PDF p.14–15):

| Process | Fresh | Renewal |
|---|---|---|
| Portal opens | by 1 May | by 1 May |
| Registration for students | 1 April – 30 September | 1 April – 30 September |
| Completion of Institute verification | 30 October | 30 October |
| Completion of Institute/State verification | 15 November | 30 October |
| Disbursement | 31 December | 15 November |

### 2.6 Guidelines / FAQ / manual / portal

- Current regulation: bundled `post-matric-scholarship.pdf` (19 pp., applicable from 01-04-2022).
- Official NSP-hosted copy: `https://scholarships.gov.in/public/schemeGuidelines/HP_state_scheme/Centrally%20Sponsored%20Scheme%20%20of%20Post%20Matric%20Scholarship%20Scheme%20for%20ST%20Students_scheme.pdf`
- tribal.nic.in also links "EDU Post Matric Scholarship PMS for ST students (PDF)".
- Superseded Central assistance document (w.e.f. 01-04-2013): `https://scholarships.gov.in/public/schemeGuidelines/EDUPostMatricScholarshipPMSforSTstudents.pdf`
- Application portal: `https://scholarships.gov.in`
- No dedicated central FAQ located for this scheme.

### 2.7 Grievance and contact

- State/UT Helpdesk mandatory (PDF p.12 §6.1), escalating critical issues to the State/NSP team.
- MoTA grievance portal: `https://tribal.nic.in/Grievance/`
- Email: `edu-tribal@nic.in`
- Section Officer: Sh. Kundan Kumar — `kundan.kr@gov.in`, intercom 215614
- Director (Pre Metric & Post Metric Scholarship, DBT): Sh. Bachagundi Shivanand F. — 011-24013713, `shivanand.b@gov.in`
- NSP helpdesk: `helpdesk@nsp.gov.in`, 0120-6619540, 8:00–20:00 all days except Government holidays

### 2.8 Database comparison

| Item | Current DB value | Official value | Classification |
|---|---|---|---|
| Identity fields, `scheme_type`, status flags | correct | matches DBT Tribal | **ALREADY CORRECT** |
| `schemes.official_application_url` | `https://dbttribal.gov.in/` | `https://scholarships.gov.in` | **MISSING VALUE — EXISTING COLUMN CAN STORE IT** |
| `schemes.gr_url` | NULL | regulation PDF | **MISSING VALUE — EXISTING COLUMN CAN STORE IT** |
| `scheme_eligibility.maximum_family_income` | 250000 | 250000 | **ALREADY CORRECT** |
| `scheme_eligibility.required_domicile` | true | correct | **ALREADY CORRECT** |
| `scheme_eligibility.eligible_course_levels` | NULL | Class XI to Post Graduation | **MISSING VALUE — EXISTING COLUMN CAN STORE IT** |
| `scheme_eligibility.eligible_course_types` | NULL | Groups I–IV course definitions | **MISSING VALUE — EXISTING COLUMN CAN STORE IT** |
| `scheme_eligibility.other_rules` | "…Rs. 2,50,000. Regular attendance required." | Missing: one-scholarship-at-a-time; account in student's own name; Top Class exclusion from AY 2021-22; different-stream rule | **MISSING VALUE — EXISTING COLUMN CAN STORE IT** |
| `scheme_eligibility.minimum_percentage` / ages | NULL | Not specified | **NOT SPECIFIED OFFICIALLY** — correct as NULL |
| `scheme_benefits` | 1 row, `maintenance_allowance`, amount NULL, frequency **annual** | 4 course groups × 2 categories + annual equivalents + 3 private-institute fee ceilings + disability allowance | **MISSING VALUE — EXISTING COLUMNS CAN STORE IT** (one row per group/category) |
| `scheme_benefits.amount` | NULL | Full numeric table available | **MISSING VALUE — EXISTING COLUMN CAN STORE IT** |
| Fee-component structure | absent | Separate from stipend; State-fixed with 3 ceilings | **MISSING VALUE** (benefit rows with `conditions`) |
| `scheme_documents` | 5 rows, all `document_type` = "Other" | 8 documents | **MISSING VALUE — EXISTING COLUMNS CAN STORE IT** |
| `scheme_documents.accepted_formats` / `max_file_size_mb` | NULL | Not specified centrally | **NOT SPECIFIED OFFICIALLY** — correct as NULL |
| Institution requirement / empanelment | no storage | 10 categories + State empanelment | **REQUIRES NEW TABLE** (institute list is large and versioned) |
| Application process | no storage | 11 ordered steps + fresh/renewal timeline | **REQUIRES NEW TABLE** |
| Grievance / contact | no storage | portal + email + helplines | **REQUIRES NEW TABLE** |
| `scheme_sources` / `scheme_versions` | generic / NULL summary | multiple official sources | **MISSING VALUE — EXISTING COLUMNS CAN STORE IT** |

---

## 3. A023B — Top Class Education For ST Students

> Officially the **Scholarship component of the merged "National Fellowship & Scholarship for Higher Education of ST Students"** Central Sector Scheme. Also referred to as "National Scholarship Scheme (Top Class)" and "National Scholarship for Higher Education of ST Students (formerly known as Top Class Scholarship Scheme)". The DBT Tribal scheme code remains `A023B`.
> Authoritative guideline = **Part-B of `national-fellowship-scholarship.pdf`, pp. 16–23, plus Annexure-I pp. 24–38**.

### 3.1 Basic information

| Field | Official value | Source |
|---|---|---|
| Official name (DBT Tribal) | Top Class Education For ST Students | DBT Tribal `AllScheme.aspx` |
| Scheme code | A023B | DBT Tribal `AllScheme.aspx` |
| Scheme type | Central Sector Scheme | DBT Tribal; PDF p.1 |
| Funding | 100% funded by MoTA | PDF p.4 Intro i; p.17 §2 |
| Benefit type (official) | In Cash | DBT Tribal `AllScheme.aspx` |
| Current status | Active | DBT Tribal `AllScheme.aspx` |
| Merger history | Rajiv Gandhi National Fellowship + Top Class Education merged into one Central Sector Scheme in FY 2017-18 | PDF p.4 Intro ii–iii; 2017 guidelines F. No.11019/02/2017-Sch. |
| Guideline period | 2021-22 to 2025-26 | PDF p.1 |
| Rates effective | 1 April 2022; no arrears before that | PDF p.23 §6 |
| Application portal | `https://scholarships.gov.in` (National Scholarship Portal, MeitY) | PDF p.19 §3.1 |
| Notified institutes | 252 (Annexure-I) — see conflict §7.1 | PDF pp. 24–38 |
| Selection evidence | **3,211** candidates selected for 2024-25, MoTA OM dated 10 June 2025 | `RevisedListTopClassSelectedStudentsFY2024-253211.pdf` |

### 3.2 Eligibility conditions

Source: PDF p.17–18 §2.1, §2.2, §2.3, §2.4.

1. ST student who has secured **admission in a notified institution and a course approved by MoTA**.
2. Student must have taken admission **on merit** to the identified premier institutes, and be verified by the Institute and the Ministry.
3. Course duration for Graduate level is fixed by the Institute; Post Graduate level as per the Institute/course.
4. Family income from all sources ≤ **Rs. 6.0 lakh per annum**.
5. Students are not eligible for any other scholarship of the Centre/State for the same study.
6. Students admitted in **notified institutions are not eligible** for the Post-Matric Scholarship Scheme (duplication avoidance).
7. Students admitted in the **Management quota of a private Institute are not entitled** to the scholarship.
8. Scholarship, once awarded, continues till completion of the course subject to satisfactory performance as certified by the Institute.
9. **No Institute-wise, State-wise or stream-wise ceiling** on slots.
10. MoTA is authorized to select and notify the list of premier institutions.

Income computation (p.18): the standard four rules, **plus** — for married candidates, spousal income is also added.

Income certificate rules (p.18 Note 2): taken once at admission for courses continuing beyond one year; must be for the financial year **immediately preceding the selection year** (e.g. selection year 2022-23 → FY 2021-22 income certificate); **Form 16 accepted** for salaried employees; otherwise a certificate from the State/UT designated authority. Income for scholarship purposes is **gross** and Income Tax Act deductions/exemptions do not apply.

**Minimum percentage:** NOT SPECIFIED OFFICIALLY.
**Age limits:** NOT SPECIFIED OFFICIALLY.
**Domicile requirement:** NOT SPECIFIED OFFICIALLY — the award is merit-and-institute based and open across India. The DB value `required_domicile = true` is unsupported.

### 3.3 Financial benefits

Source: PDF p.19 §2.5 (Table), p.21–22 §4, §4.1.

| # | Component | Details | Frequency |
|---|---|---|---|
| 1 | Tuition Fees and Admission fee | Full admission fee, tuition fee and other non-refundable charges for **Government Institutes**. For **private** sector Institutes there is a **ceiling of Rs. 2.50 lakh per annum per student** | Annual |
| 2 | Books & Stationery | **Rs. 5,000 per annum per student**, without bills/vouchers | Annual |
| 3 | Stipend | **Rs. 3,000 per month** | Monthly |
| 4 | Computer & Accessories | **Rs. 45,000 one-time** during the course tenure, without bills/vouchers; may be Desktop/Laptop | One-time |

**Payment mechanics (p.21–22):** once a year through PFMS to the accredited bank via DBT into the student's Aadhaar-seeded account.
- **Component I** — computer & accessories, books & stationery, stipend and non-refundable fees → released to the **student**.
- **Component II** — tuition fee and admission fee → released to the **Institute**; if the student already paid, reimbursed to the student's Aadhaar-seeded account on submission of receipt/vouchers.
- Students must have accounts in banks with Core Banking Solutions. If a student has no Aadhaar, they must apply for one **within one month** of registration/admission.

### 3.4 Required documents

Source: PDF p.20 §3.3. **This is the only one of the five schemes with an official fresh-vs-renewal document matrix.**

| # | Document | Fresh | Renewal | Official remark |
|---|---|---|---|---|
| 1 | ST Certificate / PVTG Certificate | Yes | **No** | Must be signed and stamped by the competent authority |
| 2 | Income Certificate | Yes | **No** | Fresh: for the F.Y. preceding the year of selection, issued by the designated authority of the respective State/UT |
| 3 | Fee Receipt | Yes | Yes | — |
| 4 | Scanned copy of the bank passbook | Yes | Yes | Student name on the passbook must match the application form |
| 5 | Mark sheet / Certificate of qualifying examination | Yes | Yes | Fresh — Graduate: 12th standard; PG: Graduation. Renewal: last passing (semester) marksheet |
| 6 | Bona fide Certificate issued from the Institute | Yes | Yes | — |

**Accepted file formats / maximum size:** NOT SPECIFIED OFFICIALLY in the guideline. The NSP FAQ does not state a size limit either.

### 3.5 Application process (ordered)

Source: PDF p.19–22 §3, §3.1–§3.5, §4, §4.1–§4.3, p.23 §5.1.

1. Student takes admission in a notified institute/course approved by MoTA.
2. Student registers on the **National Scholarship Portal** `https://scholarships.gov.in`, following the "Guidelines for Registration on National Scholarship Portal".
3. Student fills the application online and uploads documents. Dates of opening/closing are advertised on NSP each year by DBT Mission; applications after the cut-off date and time are not entertained.
4. **Institute Nodal Officer** registers on NSP, verifies the physical documents against the uploaded credentials, and is responsible for the genuineness of certificates. **The Institute must not charge any fee for verification.** All applications submitted at institute level within the stipulated date and time are processed. "Institute Operational Manual" on NSP is the reference.
5. **Ministry verification** on NSP. Discrepancies → application marked **defective** and visible to the student → student corrects and re-submits at Institute level → Institute re-verifies and submits to the Ministry before the last date.
6. Selection list published on the MoTA website. **The Ministry's decision is final** and it reserves the right to withdraw/cancel without giving reasons.
7. **Payment** once a year through PFMS DBT (Component I to student, Component II to Institute).
8. Institute submits a **Utilization Certificate in GFR-12A format** online with the student list, and refunds any unspent balance **with accrued interest** by DD payable at Sr. AO / PAO, M/O Tribal Affairs, New Delhi, payable at Delhi SBI Shastri Bhawan, along with reasons.
9. Institute onboards and updates online expenditure and unspent balance on **PFMS**; PFMS expenditure must match the UC. The **EAT-02 report** of PFMS is used as the basis for releasing scholarship for the subsequent year.
10. Institute must not ask students for tuition fee if Ministry payment is delayed.
11. University/Institute updates **course completion** on the Ministry's portal.

### 3.6 Guidelines / FAQ / manual / portal

- Current guideline: bundled `national-fellowship-scholarship.pdf` **Part-B, pp. 16–23**, Annexure-I pp. 24–38.
- Superseded: `https://tribal.nic.in/downloads/guidelines/NFS/GuidelinesFellowshipandScholarship2021.pdf` (November 2017, F. No.11019/02/2017-Sch.)
- **FAQ (official, NSP-hosted):** `https://scholarships.gov.in/public/schemeGuidelines/tribalfellowshipfaq.pdf` — "Annexure II FAQs for Students for NSP A.Y-2025-26", includes grievance steps.
- Institute Operational Manual: on the NSP portal.
- Portal: `https://scholarships.gov.in`

### 3.7 Grievance and contact

Source: `tribalfellowshipfaq.pdf` (HANDLING GRIEVANCES section); tribal.nic.in/Scholarship.aspx Grievances section.

1. Register on `https://tribal.nic.in/Grievance/` — select **"Student"** then **"Top Class"**; the email ID is the login user ID.
2. Log in, submit the query/grievance, and view responses.
3. Technical issues → NSP Helpdesk: `helpdesk@nsp.gov.in`, **0120-6619540**, available 8:00 AM–8:00 PM on all days except Government holidays.
4. Scholarship Division helpline for Top Class: **011-23345179**.
5. Email: `edu-tribal@nic.in`
6. Research Officer (National Fellowship & Scholarship Scheme (Top Class), NOS, DBT): Dr. Vandana Kumari — 011-23345773
7. Under Secretary (NOS, NFS, Top Class): Sh. Satish Kumar Singh — 011-23345755, `satish.edu@nic.in`

### 3.8 Database comparison

| Item | Current DB value | Official value | Classification |
|---|---|---|---|
| Identity fields, `scheme_type`, status flags | correct | matches DBT Tribal | **ALREADY CORRECT** |
| `schemes.overview` | "…premier institutions like IITs, IIMs, NITs, etc." | Partially accurate; the list spans IITs, NITs, IIITs, IIMs, NLUs, AIIMS/medical colleges, NIFT/NID, law schools, etc. | **MISSING VALUE — EXISTING COLUMN CAN STORE IT** |
| `schemes.official_application_url` | `https://dbttribal.gov.in/` | `https://scholarships.gov.in` | **MISSING VALUE — EXISTING COLUMN CAN STORE IT** |
| `schemes.gr_url` | NULL | Part-B of the bundled PDF | **MISSING VALUE — EXISTING COLUMN CAN STORE IT** |
| `scheme_eligibility.maximum_family_income` | **800000** | **600000** | **CONFLICTING OFFICIAL SOURCES** |
| `scheme_eligibility.other_rules` | "…income should not exceed Rs. 8,00,000. Merit-based selection." | Wrong ceiling; also omits spousal-income addition, Form 16 acceptance, and the private-Management-quota exclusion | **CONFLICTING OFFICIAL SOURCES** |
| `scheme_eligibility.required_domicile` | true | Not specified | **NOT SPECIFIED OFFICIALLY** — should be NULL |
| `scheme_eligibility.required_hosteller` | false | Not specified / not applicable | **NOT SPECIFIED OFFICIALLY** — should be NULL |
| `scheme_eligibility.minimum_percentage` / ages | NULL | Not specified | **NOT SPECIFIED OFFICIALLY** — correct as NULL |
| `scheme_eligibility.eligible_course_types` | NULL | Graduate and Post Graduate at notified institutes in professional fields (Management, Medicine/Science, Engineering & Technology, Humanities, Law, Social Science, etc.) | **MISSING VALUE — EXISTING COLUMN CAN STORE IT** |
| Institute requirement | no storage | 252 notified premier institutes, full-time courses in campus, minimum 1-year duration; 6 institutes added 24-09-2022 (S.O. 2872(E)) | **REQUIRES NEW TABLE** |
| `scheme_benefits` | 2 rows (`tuition_fee`, `living_expenses`), amounts NULL, frequency annual | 4 components with exact amounts; the `living_expenses` row does not correspond to any official component | **MISSING VALUE — EXISTING COLUMNS CAN STORE IT** + **one row should be removed/renamed** |
| `scheme_benefits.amount` | NULL | 2,50,000 ceiling / 5,000 / 3,000 / 45,000 | **MISSING VALUE — EXISTING COLUMN CAN STORE IT** |
| `scheme_documents` | 4 rows, all `document_type` = "Other" | 6 documents, **with a fresh/renewal distinction** | **MISSING VALUE — EXISTING COLUMNS CAN STORE IT** + **MISSING COLUMN** for the fresh/renewal applicability |
| Fee receipt / bank passbook / bona fide certificate | absent | required for fresh **and** renewal | **MISSING VALUE — EXISTING COLUMNS CAN STORE IT** |
| `scheme_documents.accepted_formats` / `max_file_size_mb` | NULL | Not specified | **NOT SPECIFIED OFFICIALLY** — correct as NULL |
| Application process | no storage | 11 ordered steps, incl. Institute verification → Ministry defective loop → UC GFR-12A → PFMS EAT-02 | **REQUIRES NEW TABLE** |
| Selection lists / award counts | no storage | 3,211 selected for 2024-25 | Not part of the current schema |
| Grievance / contact | no storage | grievance portal + 011-23345179 + NSP helpdesk | **REQUIRES NEW TABLE** |
| `scheme_sources` / `scheme_versions` | generic / NULL summary | Part-B + FAQ + OM 10-06-2025 | **MISSING VALUE — EXISTING COLUMNS CAN STORE IT** |

---

## 4. ARG45 — National Fellowship for ST Students

> Officially **Part-A of the merged "National Fellowship & Scholarship for Higher Education of Scheduled Tribe Students"** Central Sector Scheme. Fully funded by MoTA.

### 4.1 Basic information

| Field | Official value | Source |
|---|---|---|
| Official name (DBT Tribal) | National Fellowship for ST Students | DBT Tribal `AllScheme.aspx` |
| Scheme code | ARG45 | DBT Tribal `AllScheme.aspx` |
| Scheme type | Central Sector Scheme, fully funded by MoTA | DBT Tribal; PDF p.4 Intro i |
| Benefit type (official) | In Cash | DBT Tribal `AllScheme.aspx` |
| Current status | Active | DBT Tribal `AllScheme.aspx` |
| Guideline period | 2021-22 to 2025-26 | PDF p.1 |
| Rates effective | 1 April 2022; no arrears before that | PDF p.15 §8 |
| Annual awards | **750** fresh fellowships (Divyangjan 38, PVTG 25, Female 225, ST Others 462); unused slots carry forward; no State/University ceiling | PDF p.5–7 §2.5 |
| Application portal | `https://fellowship.tribal.gov.in` | PDF p.8 §3.1 |
| Portal window | usually opens **1 July**, closes **30 September**; dates may change and are notified on the Ministry's portal | PDF p.8 §3.1 |
| Payment | **Quarterly** through PFMS DBT into an Aadhaar-linked active bank account | PDF p.12 §4.1 |
| Designated bank | Canara Bank (referenced for ID linking and NOC) | PDF p.9 §3.4; MoTA FAQ |
| Thesis repository | `https://repository.tribal.gov.in` | PDF p.13 §4.3 |
| Merit basis | marks in the post-graduation examination | PDF p.6 §2.5(i) |

### 4.2 Eligibility conditions

Source: PDF p.5–7 §2.1, §2.2, §2.3, §2.4, §2.5.

1. Belong to the Scheduled Tribe.
2. Have **passed the Post-graduation / Master Degree examination**.
3. Pursue **regular and full-time** M.Phil, M.Phil+Ph.D, or Ph.D.
4. **Minimum 55% marks at the final examination/grading at PG level.**
5. Course duration (tenure of fellowship):

| Course | Duration |
|---|---|
| M.Phil | 2 years, or date of submission of dissertation, whichever is earlier |
| M.Phil + Ph.D | 2 + 3 = 5 years, or date of submission of dissertation, whichever is earlier |
| Ph.D | 5 years, or date of submission of dissertation, whichever is earlier |

6. **Income criteria: NONE.** "There is no income criteria for eligibility in respect of this scholarship." (PDF p.5 §2.2)
7. **Maximum age 36 years** as on the first day of July of the relevant year of award. (PDF p.5 §2.3)
8. Institution must be one of (PDF p.5 §2.4):
   i. Universities/Institutes/Colleges under §2(f)/12(B) of the UGC Act;
   ii. Deemed Universities under Section 3 of the UGC Act, 1956, eligible for UGC grant-in-aid;
   iii. Universities/Institutes/Colleges receiving grants from Central/State Government;
   iv. Institutes of National Importance as notified by Ministry of Higher Education.
9. Slot sub-categories and priority (PDF p.6–7):

| Priority | Category | Slots |
|---|---|---|
| 1 | Divyangjan | 38 (5% of 750) |
| 2 | PVTG (Annexure-VIII) | 25 |
| 3 | Female | 225 (30% of 750) |
| 4 | ST Others | 462 |
| | **Total** | **750** |

10. Applicants with an **offer of admission from IITs/AIIMS/IIMs/IISERs** get priority; ST-Others slots are reduced proportionately. Such a student must state this in the application and **upload the offer letter**. (PDF p.7 §2.5(iv))
11. Divyangjan applicants must produce a **Disability Certificate certifying minimum 40% disability** from the State/UT-designated authority. (PDF p.6 Note-2)
12. If a sub-category is under-subscribed, unfilled slots go to the next priority category, then to ST research applicants not in any of the three categories on inter-se PG merit.
13. Research scholars must not hold any other fellowship/scholarship of the Union or a State Government for the same study.

**Domicile requirement:** NOT SPECIFIED OFFICIALLY.
**Hosteller requirement:** the fellowship is not conditioned on hostel status, but **HRA is** — see §4.3.

### 4.3 Financial benefits

Source: PDF p.7 §2.6, p.8 §2.6.1.

| Course | Stream | Fellowship (monthly) | Contingency (annually) |
|---|---|---|---|
| M.Phil | Humanities & Social Sciences | Rs. 31,000 | Rs. 10,000 |
| M.Phil | Science / Engineering / Technology | Rs. 12,000 | Rs. 10,000 |
| Ph.D | Humanities & Social Sciences | Rs. 31,000 for first 2 years; Rs. 35,000 for remaining 3 years | Rs. 20,500 |
| Ph.D | Science / Engineering / Technology | Rs. 25,000 | Rs. 20,500 |

Additional components:
- **HRA, all courses, monthly:** equal to **UGC rates — 8% or 16% or 24% based on city**.
- **Escort Allowance for Divyangjan, monthly:** **Rs. 2,000** (at par with UGC rates).
- "The above rates are equal to UGC rates, which may be revised as and when revised by UGC." (PDF p.7)

**HRA rules (PDF p.8 §2.6.1):**
- A student provided hostel accommodation by the university is **not eligible for HRA** but may draw only the hostel fees charged by the University; not entitled to claim mess, electricity or water charges. A certificate to this effect must be furnished through the Registrar/Director/Principal.
- A student making their own accommodation arrangements may draw HRA per GoI city categorisation.

**Release (PDF p.12 §4.1–§4.2):** quarterly through PFMS by the designated bank/agency via DBT into active bank accounts linked with Aadhaar and mobile. The mobile number in Aadhaar and in the bank account must be the same. The fellowship is effective from the selection year irrespective of admission/joining/registration date, but amounts for years before selection are not admissible.

**Leave (PDF p.14–15 §5.5):** up to **30 days of leave per year** in addition to public holidays, with HoD approval; maternity/paternity leave allowed, no fellowship during it, fellowship extended by the period availed; an **"Intermittent Break" of up to 1 year** for women research scholars, avaivable **3 times** in the tenure; **academic leave without fellowship** for **one year only** in the whole tenure; prior University approval is mandatory for all leave types.

### 4.4 Required documents

Source: PDF p.9 §3.3.

1. Latest coloured passport-size photograph
2. ST / PVTG certificate issued by the competent authority
3. 10th / Matriculation / equivalent certificate in support of date of birth
4. Divyangjan certificate issued by the competent authority
5. Post-Graduation mark sheet — aggregate marks in %, or equivalent % where CGPA; the CGPA→percentage conversion formula issued by the Institute/University must be produced
6. Admission / Joining certificate of M.Phil / Ph.D / Integrated M.Phil+Ph.D from the University concerned
7. Offer of admission, for students admitted to IITs/AIIMS/IIMs/IISERs

Additional from the official MoTA FAQ (`National-Fellowship-FAQs.pdf`):
8. **Family Income Certificate** issued by the Competent Authority
9. **BPL Certificate** (if opted for it; must be of father/mother, not grandparents)
10. **All semester marksheets in one PDF file** where percentage/CGPA/OGPA is clearly identifiable
11. **Conversion Factor Formula** where CGPA/OGPA is used

DigiLocker is mandatory for uploading documents; Aadhaar is mandatory (PDF p.8 §3.2), per the Gazette notification published 30 May 2017 under section 7 of the Aadhaar Act 2016, circulated vide letter 19012/01/2017-Edu-sch dated 9 June 2017.

**File formats and sizes — the only official MoTA file-size evidence found:**
- Documents: **PDF, maximum 500 KB**
- Profile picture: **JPG/JPEG, maximum 100 KB**
Source: `https://tribal.nic.in/downloads/faqs/UMANG.pdf` (official MoTA instructions manual for the National Fellowship application in the UMANG app).

### 4.5 Application process (ordered)

Source: PDF p.8–13 §3, §3.1–§3.8, §4, §4.1–§4.3, §5.1–§5.3.

1. **Register** on the National Fellowship Portal `https://fellowship.tribal.gov.in` and on **DigiLocker**; Aadhaar mandatory.
2. Read the Instruction Manual; use the portal help desk. **Incomplete applications will not be considered.**
3. Fill the application online and upload/fetch documents.
4. **University Nodal Officer** registers on the portal, verifies the **physical** documents, and confirms that uploaded information matches the physical documents furnished at verification.
5. **Ministry online verification.** Discrepancies → application marked **defective** and visible to the student → student corrects and **resubmits once again at Institute level** → Institute verifies the corrected application and submits to the Ministry before the last date.
6. **Selection.** Merit list based on PG examination marks and the criteria of the Selection Committee. Committee: Secretary (MoTA) as Chairperson; Joint Secretary & Financial Adviser; Joint Secretary, Scholarship Division; Director/Deputy Secretary, Scholarship Division; a representative from the Ministry of Social Justice and Empowerment; a representative from UGC. An expert may be invited as a special invitee.
7. **Merit list** of provisionally selected scholars published on the MoTA website. The Ministry's decision is final and it may withdraw/cancel without giving reasons.
8. **Within 1 month of the provisional award letter**, the scholar must take admission and submit the **joining report to the Ministry**; failure cancels the award and the waiting list is offered the opportunity.
9. **Within one month of award**, the following formalities:
   - Refund of any scholarship already availed elsewhere, with a certificate, from the date of selection;
   - **Refund receipt** uploaded online (for those who availed it);
   - The signed **checklist** from the provisional award letter, uploaded by the scholar;
   - **No Objection Certificate** from the University/Institute confirming non-availing of any other fellowship/scholarship, uploaded on the portal.
10. **University uploads on the designated bank portal / agency:** the joining report; the master data of eligible beneficiaries; bank account numbers validated through **PFMS** to create beneficiary IDs.
11. **Linking and continuation:** the University links the scholar ID with the designated bank portal and submits to the Ministry for approval; then uploads a **quarterly continuation certificate**: Q1 Apr–Jun by **10 July**; Q2 Jul–Sep by **10 October**; Q3 Oct–Dec by **10 January**; Q4 Jan–Mar by **10 April**.
12. The University marks **monthly HRA entitlement** after Ministry approval of continuation.
13. **After one year** of fellowship, the fellow submits a **progress report** at the University / uploads at the tribal repository portal.
14. **Quarterly release** through PFMS DBT.
15. **At completion:** submit the M.Phil/Ph.D certificate and course completion certificate to the Ministry; upload the thesis on `https://repository.tribal.gov.in` with metadata — **the last quarter's fellowship is released only after the thesis is uploaded.**
16. **Change of University:** permitted with prior approval of both universities; the old university initiates the online transfer at the designated bank portal, the new one accepts it; both upload NOCs; the Ministry approves.
17. **Change of subject/course:** permitted with prior approval of the University; student updates the portal. Duration remains 2 years for M.Phil and 5 years for M.Phil+Ph.D or Ph.D.
18. **Discontinuation:** the scholar submits an undertaking with reasons; the University marks it discontinued on the designated bank's portal to stop further payment.

### 4.6 Guidelines / FAQ / manual / portal

- Current guideline: bundled `national-fellowship-scholarship.pdf` **Part-A, pp. 4–15**.
- Superseded: `https://tribal.nic.in/downloads/guidelines/NFS/GuidelinesFellowshipandScholarship2021.pdf` (November 2017)
- FAQ: `http://tribal.nic.in/downloads/faqs/National-Fellowship-FAQs.pdf`
- UMANG instruction manual: `https://tribal.nic.in/downloads/faqs/UMANG.pdf`
- Thesis repository: `https://repository.tribal.gov.in`
- Portal: `https://fellowship.tribal.gov.in`; guidelines, instruction manual and university list are under "About the Scheme"

### 4.7 Grievance and contact

- MoTA grievance portal: `https://tribal.nic.in/Grievance/` (PDF p.15 §7)
- In-portal grievance module on `fellowship.tribal.gov.in` for scholars and institutes
- NOC / refund-receipt submissions are routed through the grievance portal under the "NOC/Refund receipt" section
- Email: `fellowship-tribal@nic.in` ; Tel **011-23345770**
- Address: Gate No. 3, Ground Floor, Jeevan Tara Building, Ashoka Road, Patel Chowk, New Delhi – 110001
- Portal login page: "For any query please write us at https://tribal.nic.in/grievance after registration; if not registered please send mail to fellowship-tribal@nic.in"
- Research Officer: Dr. Vandana Kumari — 011-23345773, `dr.vandanak@ignca.nic.in`
- Under Secretary (NOS, NFS, Top Class): Sh. Satish Kumar Singh — 011-23345755

### 4.8 Database comparison

| Item | Current DB value | Official value | Classification |
|---|---|---|---|
| Identity fields, `scheme_type`, status flags | correct | matches DBT Tribal | **ALREADY CORRECT** |
| `scheme_eligibility.maximum_family_income` | NULL | **No income criterion at all** | **ALREADY CORRECT** — must stay NULL |
| `scheme_eligibility.minimum_percentage` | NULL | **55%** at PG level | **MISSING VALUE — EXISTING COLUMN CAN STORE IT** |
| `scheme_eligibility.maximum_age` | NULL | **36** as on 1 July of the award year | **MISSING VALUE — EXISTING COLUMN CAN STORE IT** |
| `scheme_eligibility.minimum_age` | NULL | Not specified | **NOT SPECIFIED OFFICIALLY** — correct as NULL |
| `scheme_eligibility.other_rules` | "For M.Phil/Ph.D. students. **NET/JRF qualified or as per UGC norms.** No income ceiling for fellowship." | The guideline requires **no** NET/JRF; it requires 55% at PG. "As per UGC norms" is only referenced for stipend/HRA rates being at par with UGC. | **CONFLICTING OFFICIAL SOURCES** — the NET/JRF requirement is fabricated and would wrongly reject eligible candidates |
| `scheme_eligibility.required_domicile` | true | Not specified | **NOT SPECIFIED OFFICIALLY** — should be NULL |
| `scheme_eligibility.required_hosteller` | false | Misleading: HRA eligibility is conditional on university-provided hostel vs self-arranged accommodation | **MISSING VALUE — EXISTING COLUMN CAN STORE IT** is insufficient; **REQUIRES NEW TABLE** or structured rule for the HRA condition |
| `scheme_eligibility.eligible_course_levels` | NULL | M.Phil (2 yr), M.Phil+Ph.D (5 yr), Ph.D (5 yr) | **MISSING VALUE — EXISTING COLUMN CAN STORE IT** |
| `scheme_eligibility.eligible_course_types` | NULL | M.Phil / Ph.D research degrees | **MISSING VALUE — EXISTING COLUMN CAN STORE IT** |
| `scheme_eligibility.eligible_gender` | NULL | Open to all; 30% female slots | **NOT SPECIFIED OFFICIALLY** as a restriction — correct as NULL |
| Institution requirement | no storage | 4 UGC-type categories; live portal further restricts M.Phil to Psychiatric Social Work / Clinical Psychology (see conflict §7.4) | **REQUIRES NEW TABLE** |
| Sub-category quotas | no storage | Divyangjan 38 (40% disability certificate required), PVTG 25, Female 225, ST Others 462 | **REQUIRES NEW TABLE** |
| `scheme_benefits` | 1 row `fellowship`, amount NULL, frequency monthly | 4 course×stream rows + HRA at UGC rates + Divyangjan escort Rs. 2,000; contingency Rs. 10,000 / Rs. 20,500 | **MISSING VALUE — EXISTING COLUMNS CAN STORE IT** (one row per course × stream) |
| `scheme_benefits.frequency` | monthly | Fellowship monthly, released quarterly; contingency annual | **MISSING VALUE** |
| HRA and escort allowance | absent | UGC-rate percentages, not fixed numbers | **REQUIRES NEW TABLE** or a rate-reference field (a single INR amount would be wrong) |
| `scheme_documents` | 4 rows, all `document_type` = "Other" | 7 guideline documents (+4 more in the FAQ) | **MISSING VALUE — EXISTING COLUMNS CAN STORE IT** |
| Income Certificate / BPL Certificate rows in DB | present and mandatory | Guideline has **no** income criterion; the FAQ still asks for them | **CONFLICTING OFFICIAL SOURCES** (see §7.3) |
| `scheme_documents.accepted_formats` | NULL | **PDF** | **MISSING VALUE — EXISTING COLUMN CAN STORE IT** (official, from UMANG manual) |
| `scheme_documents.max_file_size_mb` | NULL | **500 KB for documents** (0.5 MB); photo JPG/JPEG 100 KB | **MISSING VALUE — EXISTING COLUMN CAN STORE IT** |
| Application process | no storage | 18 ordered steps incl. the Ministry defective loop, quarterly continuation certificates, and the thesis-upload gate on the final payment | **REQUIRES NEW TABLE** |
| Grievance / contact | no storage | portal + in-portal module + email + 011-23345770 | **REQUIRES NEW TABLE** |
| `scheme_sources` / `scheme_versions` | generic / NULL summary | Part-A + FAQ + UMANG manual | **MISSING VALUE — EXISTING COLUMNS CAN STORE IT** |

---

## 5. AZKMI — National Overseas Scholarship Scheme

> **Distinction:** the "National Overseas Scholarship" administered by the Ministry of Social Justice and Empowerment for SC / DNST / landless labourers / artisans (`nosmsje.gov.in`) is a **different scheme**. Everything below refers to the MoTA scheme for ST students.

### 5.1 Basic information

| Field | Official value | Source |
|---|---|---|
| Official name (DBT Tribal) | National Overseas Scholarship Scheme | DBT Tribal `AllScheme.aspx` |
| Scheme code | AZKMI | DBT Tribal `AllScheme.aspx` |
| Scheme type | Central Sector Scheme | DBT Tribal; PDF p.1 |
| Implementing channel | Indian Embassies/Missions abroad, Ministry of External Affairs; MoTA reimburses MEA | PDF p.3 §1; p.7 Note 3; p.10 §5 |
| Benefit type (official) | **In Others** | DBT Tribal `AllScheme.aspx` |
| Current status | Active | DBT Tribal `AllScheme.aspx` |
| Guideline | "Revised NOS Guidelines", dated **07-10-2022** | PDF p.1; `RevisedGuidelinesNOS07102022.pdf` |
| Guideline period | 2021-22 to 2025-26 | PDF p.1 |
| Annual awards | **20** — 17 ST + 3 PVTG; 30% earmarked for female, unutilised female slots open to eligible male | PDF p.3 §2.1(ii),(iv) |
| Field slots | STEM 10; Management, Economics, Finance, Law 4; Agriculture/Medicine 4; Humanities/Social Science/Fine Arts 2 | PDF p.5 §3 |
| Levels covered | Masters, Ph.D, Post-Doctoral Research. **Bachelor level is not covered** | PDF p.3 §2.1(i) |
| Application portal | `https://overseas.tribal.gov.in` (National Overseas Scholarship Portal) | PDF p.7 §4.1 |
| Current cycle | Ministry invited online applications for **selection year 2026-27**; portal open till **30-06-2026, 5:00 PM** | `overseas.tribal.gov.in` official banner |
| Course duration | Post-Doctoral Research 2 years; Ph.D 4 years; Masters 1 or 2 years | PDF p.5 §3.1 |
| Target institutes | Top **1,000** QS World ranked foreign institutes | PDF p.3 Note, p.8 §4.4 |

### 5.2 Eligibility conditions

Source: PDF p.3–4 §2.2.

1. **Post-graduate level only** — Masters, Ph.D, Post-Doctoral Research in reputed universities abroad. Bachelor-level courses in any discipline are **not** covered.
2. Qualification, marks and maximum age **as on 1 July of the selection year**:

| Course | Marks / qualification | Max age |
|---|---|---|
| Post-Doctoral Research | 55% or equivalent in the relevant Master's Degree, **with awarded Ph.D** | 38 years |
| Ph.D | 55% or equivalent in the relevant Master's Degree | 35 years |
| Master's | 55% or equivalent in the relevant Bachelor's Degree | 32 years |

3. **Exemption:** the marks criterion does not apply to candidates who have already obtained admission in a **top 1,000 institute by QS World ranking** (latest available report).
4. **One child in a family and one-time assistance:** not more than one child of the same parents is eligible, and the candidate must furnish a **self-certification** to that effect. An individual is eligible for only **one** award and cannot be considered for any other award, or for the same/higher level of award, a second time.
5. **Family income from all sources ≤ Rs. 6,00,000 per annum.**
6. Income computation: the standard four rules (both parents working → combined; other earning members excluded; only one parent alive → that parent; orphan supported by a guardian → income criteria does not apply). Income certificate taken **once only** at admission, valid for the entire duration of the course. Salaried parents → previous financial year.
7. Allocation by field of study; separate merit list per field.

**Domicile requirement:** NOT SPECIFIED OFFICIALLY.
**Minimum percentage:** 55% (per course) — the DB has NULL.
**Age:** 38 / 35 / 32 depending on course — a single `maximum_age` column cannot express this correctly. The DB's NULL is the safe value, but the actual table is missing from the system entirely.

### 5.3 Financial benefits

Source: PDF p.5–6 §3.2. **All amounts are foreign-currency; none is a fixed INR figure.**

| # | Component | Amount |
|---|---|---|
| 1 | Annual Maintenance Allowance | **USD 15,400** in the US / **£9,900** in the UK, for all course levels; USD or equivalent for other countries |
| 2 | Annual Contingency and Equipment Allowance | **$1,532** in the US / **£1,116** in the UK, for books, essential apparatus, study tour, typing and binding of thesis |
| 3 | Poll Tax | Actuals, wherever applicable |
| 4 | Visa Fees | Actual visa fees **in Indian Rupees** |
| 5 | Incidental Journey Expenses | up to **USD 20** or equivalent in INR |
| 6 | Fees | Tuition and other non-refundable fees compulsorily required for completion of the course, **as per actuals** |
| 7 | Medical Insurance Premium | Actuals as charged; the Indian Embassy/Mission examines reasonableness |
| 8 | Cost of Air Passage | Actual, **economy class, shortest route**, India to the nearest place to the educational institution and back |
| 9 | Local Travel | Second-class railway fare from the port of disembarkation to the place of study and back; for far-flung places not connected by rail, bus fare from residence to the nearest railway station; actual ferry crossing charge; air fare to the nearest rail-cum-air station |

**Special provisions (PDF p.6–7 §3.2 Note 1):**
- **Pandemic / natural calamity / war:** if the awardee studies online from India, maintenance allowance is provided at the **JRF rate for Master's** and the **SRF rate for PhD and Post-Doctorate** under the National Fellowship for ST Students scheme. Foreign rates resume on joining the university abroad.
- **Field study in India:** requires prior permission from the Institute **and** the Indian Embassy with justification, and an update to the Ministry on the portal; JRF/SRF rates apply for that duration; to-and-fro airfare is allowed **only once** for the whole course.
- **Stay in India:** the foreign maintenance allowance is proportionately reduced.

Other official rules:
- **Note 2:** a student considered for this scholarship is not entitled to any other scholarship of the Centre/State for the same study.
- **Note 3:** the Indian Embassy/Mission disburses the listed financial assistance to the Institute and the student; **MoTA reimburses the Ministry of External Affairs**.
- Scholarship is **prospective from the date of issuance of the award letter**; no reimbursement of fees already paid to the University or of insurance expenses. Maintenance and contingency allowance for the remaining financial year are pro-rated to the number of months.

### 5.4 Required documents

Source: PDF p.7–8 §4.3.

1. Latest coloured passport-size photograph
2. ST certificate issued by the competent authority
3. PVTG certificate issued by the competent authority (if applicable)
4. 10th Certificate/Marksheet in support of Date of Birth
5. Graduation / Post-Graduation mark sheet — aggregate marks in %, or equivalent % where CGPA — or Ph.D completion certificate, wherever applicable. The **conversion sheet of aggregate marks into percentage must be issued by the Institute/University**.
6. Offer of admission
7. Income Certificate

Additional from the official MoTA FAQ (`National-Overseas-Scholarship-FAQs.pdf`, for 2023-24):
- DOB certificate — **10th/matriculation certificate only; no other certificate is admissible**
- ST certificate; PVTG certificate
- Profile photo — **size 50 KB to 100 KB**
- Annual family income certificate; if the father is alive but his income is not reported, the reason must be given in the declaration
- Master's marksheet + CGPA→percentage conversion formula
- Ph.D marksheet + CGPA→percentage conversion formula
- Copy of Tax Assessment (ITR / Form 16), if applicable
- Accepted format: **.jpg / .jpeg**

DigiLocker is mandatory for document upload; Aadhaar is mandatory for registration. Candidates must fulfil all eligibility criteria at the time of applying; failure to upload a mandatory eligibility document makes the application **liable to be rejected**.

### 5.5 Application process (ordered)

Source: PDF p.7–10 §4.1–§4.4, §4.5, §5, p.11 §7, §8.

1. **Invitation.** Applications are invited online through the National Overseas Scholarship Portal. Opening and closing are announced by advertisement in **Employment News**, other prominent news dailies, through Institutes/Universities, State Governments, and the Ministry's portal.
2. Read the **Instruction Manual** on the portal; use the **helpdesk module** for queries.
3. **Register** on NOSP and on **DigiLocker**. Aadhaar is mandatory for registration.
4. **Upload documents** through DigiLocker.
5. All applications received within the stipulated period are **scrutinised for eligibility**; separate merit lists are drawn **per field of study**.
6. **Merit tier (a)** — candidates already admitted and pursuing studies at **top 1,000 QS-ranked** foreign institutes/universities; merit by institute ranking, ties broken by qualifying-exam marks.
7. **Merit tier (b)** — candidates holding a preliminary letter/offer of admission from top 1,000 institutes who have not yet joined; same ranking/ties logic.
8. **Merit tier (c)** — remaining eligible candidates via **personal interview** by an expert committee constituted by the Ministry; candidates who have cleared **GRE/GMAT/TOEFL** etc. are given preference.
9. Short-listed interview candidates receive **second-class train/bus fare reimbursement** from residence to the interview place, by shortest route.
10. **Provisional merit list** posted on the Ministry's website.
11. **Verification** — tier (a) by the **Indian Embassy/Mission** in the country of study; tiers (b) and (c) by the respective **State/UT**.
12. Selected candidates must secure admission and **join a top 1,000 QS-ranked foreign institute within 2 years** of communication of the Award Letter; on expiry the award is **automatically cancelled**. Unfilled seats carry over to the next selection year. The FAQ adds that a selected candidate must join **within 6 months**, extendable up to 2 years, and that the Ministry issues a **confirmed award letter** after verifying the admission letter and visa.
13. **Scholarship is prospective** from the date of issuance of the award letter; maintenance and contingency allowance for the remaining financial year are pro-rated.
14. **Progress reporting** — the student submits a progress report on the NOS Portal **once every 6 months**; the Indian Mission obtains performance reports from the university and updates joining/discontinuation details on `https://overseas.tribal.gov.in/`.
15. **Before leaving the country** the student must take permission of the Indian Mission and inform the Ministry on the portal.
16. The Mission must be informed of any serious adverse developments affecting continuation of the award.
17. **After course completion** the awardee uploads course completion details and a brief of study in the **Alumni Module of the NOS portal before return tickets are booked**.
18. **Cancellation and recovery** (p.11 §7): false documents or non-conformance with the guidelines; returning to India without completing the course (excused only by a certificate from a medical officer nominated by the Indian Mission, for ill-health); involvement in illegal/antinational activity, misconduct, narcotics, violation of host-country law, or any police case. MoTA may recover amounts already paid.
19. **Litigation (p.11 §8):** any litigation on matters arising out of this scheme in India is subject to the **sole jurisdiction of the courts situated in the Union Territory of Delhi**; litigation arising abroad is attended to by the **Indian Missions abroad**.
20. **Change in the scheme provisions (p.11 §9):** the Ministry may change the provisions of the scheme, effective from the date it notifies; the Ministry's portal is the authoritative source for the current provisions.

### 5.6 Guidelines / FAQ / manual / portal

- Current guideline: bundled `national-overseas-scholarship.pdf` (11 pp.) — the **revised NOS guidelines dated 07-10-2022**, scheme period 2021-22 to 2025-26.
- Same document online: `https://tribal.nic.in/downloads/guidelines/NOS/RevisedGuidelinesNOS07102022.pdf`
- MoTA FAQ: `http://tribal.nic.in/downloads/faqs/National-Overseas-Scholarship-FAQs.pdf` (issued for 2023-24)
- Portal: `https://overseas.tribal.gov.in` — sections "About the Scheme", "Guidelines of Scheme", "Instruction Manual – NOS Application", "Instruction Manual – DigiLocker", "PVTG List", "FAQs", "Grievances", "Contact Us". Integrated with DigiLocker, SMS/e-mail alerts, and a Ministry dashboard.
- UMANG web entry point: `https://web.umang.gov.in/landing/scheme/detail/centralsector-scheme-of-national-overseas-scholarship-for-st-students_css-nos-st.html`
- **Current live window (official portal notice, verified 2026-09-27):** the Ministry invited online applications for selection year **2026-27**; "The portal is open till **30-06-2026, 5:00 PM**" (`https://overseas.tribal.gov.in/`, page footer "Last Updated: 13 Jun, 2026"). The portal also publishes "Amended List of provisionally selected candidates for the selection Year 2025-26".
  - *Deliberately not used as evidence:* a third-party aggregator reported a further extension to 15-07-2026. It could not be confirmed on the official portal, so the official notice is the value of record.
- **The guideline's scheme period (2021-22 to 2025-26) has expired** while the portal is running a 2026-27 cycle and no successor guideline was found — see conflict §7.7.

### 5.7 Grievance and contact

- MoTA grievance portal: `https://tribal.nic.in/Grievance/` (FAQ: "You may register online query at https://tribal.nic.in/Grievance/")
- In-portal **Grievances** module on `https://overseas.tribal.gov.in`
- Email: `fellowship-tribal@nic.in` ; Tel **011-23345770**, **011-23366980**
- Address: Gate No. 3, Ground Floor, Jeevan Tara Building, Ashoka Road, Patel Chowk, New Delhi – 110001
- Nodal officers (`https://overseas.tribal.gov.in/Help.aspx`): Sh. Bachagundi Shivanand F., Director (Scholarship); Sh. Satish Kumar Singh, Under Secretary; Dr. Vandana Kumari, Research Officer
- Portal login page: "For any query please write us at https://tribal.nic.in/grievance"
- FAQ constraint: mobile number and e-mail ID **cannot be changed** after the application is submitted; any unavoidable change must be notified through the grievance portal at the earliest.

### 5.8 Database comparison

| Item | Current DB value | Official value | Classification |
|---|---|---|---|
| `scheme_code`, `name`, `scheme_type`, `status`, `verification_status`, `is_active` | AZKMI, correct name, Central Sector Scheme, published, verified, true | Matches DBT Tribal listing | **ALREADY CORRECT** |
| `schemes.description` / `overview` | "higher studies (Masters/Ph.D.) abroad in specified fields" | Masters, Ph.D **and Post-Doctoral Research** are covered; **Bachelor level is excluded** | **MISSING VALUE — EXISTING COLUMN CAN STORE IT** |
| `schemes.official_application_url` | `https://dbttribal.gov.in/` (generic, same value as all five rows) | `https://overseas.tribal.gov.in` | **MISSING VALUE — EXISTING COLUMN CAN STORE IT** |
| `schemes.official_scheme_url` | `https://dbttribal.gov.in/AllScheme.aspx` | Valid but generic; scheme page is `https://tribal.nic.in/Scholarship.aspx` | **MISSING VALUE — EXISTING COLUMN CAN STORE IT** |
| `schemes.gr_url` | NULL | `https://tribal.nic.in/Grievance/` | **MISSING VALUE — EXISTING COLUMN CAN STORE IT** |
| `schemes.academic_year` | "2025-2026" | Scheme period 2021-22 to 2025-26 has lapsed; live selection year is **2026-27** | **MISSING VALUE** |
| `schemes.application_start_date` / `end_date` | 2025-07-01 / 2025-12-31 | Central guideline gives no dates; the Ministry notifies a window per selection year (2026-27: open till **30-06-2026 17:00**) | **CONFLICTING OFFICIAL SOURCES** — a single hard-coded common window is wrong |
| `schemes.renewal_available` | true | Guideline is framed around **fresh** awards; continuation is via 6-monthly progress reports and the alumni module | **MISSING VALUE — EXISTING COLUMN CAN STORE IT** (confirm before publishing) |
| `schemes.source_last_verified_at` | 2025-01-15 | Should be 2026-09-27 for this audit | **MISSING VALUE** |
| `scheme_eligibility.maximum_family_income` | **800000** | **600000** | **CONFLICTING OFFICIAL SOURCES** |
| `scheme_eligibility.other_rules` | "For Masters/Ph.D. abroad in specified fields. Family income should not exceed Rs. 8,00,000. **Age limit as per scheme guidelines.**" | Wrong income ceiling inside the text; "as per scheme guidelines" is not a rule. Omits one-child-per-family self-certification, one-award-only rule, top-1,000 QS admission requirement, GRE/GMAT/TOEFL preference, and the prospective-from-award-letter / pro-rating rule | **CONFLICTING OFFICIAL SOURCES** (ceiling) + **MISSING VALUE** (omitted rules) |
| `scheme_eligibility.minimum_percentage` | NULL | **55%** at the qualifying examination | **MISSING VALUE — EXISTING COLUMN CAN STORE IT** |
| `scheme_eligibility.minimum_age` / `maximum_age` | NULL / NULL | **38 (Masters) / 35 (Ph.D) / 32 (Post-Doctoral)** | **REQUIRES NEW TABLE** — one numeric pair cannot express three course-dependent limits; NULL is the safe current value |
| `scheme_eligibility.eligible_course_levels` | NULL | Masters (1 or 2 yr), Ph.D (4 yr), Post-Doctoral Research (2 yr); Bachelor excluded | **MISSING VALUE — EXISTING COLUMN CAN STORE IT** |
| `scheme_eligibility.eligible_course_types` | NULL | 5 field groups with a slot allocation each (STEM 10; Management/Economics/Finance/Law 4; Agriculture/Medicine 4; Humanities/Social Science/Fine Arts 2) | **REQUIRES NEW TABLE** (field × slot rows) |
| `scheme_eligibility.eligible_gender` | NULL | Open to all; **30% earmarked for female**; unutilised female slots open to eligible male candidates | **NOT SPECIFIED OFFICIALLY** as a restriction (correct as NULL) — but the **earmark needs new-table storage** |
| `scheme_eligibility.required_domicile` | true | Not specified | **NOT SPECIFIED OFFICIALLY** — should be NULL |
| `scheme_eligibility.required_hosteller` | false | Not conditioned on hostel status abroad | **ALREADY CORRECT** (as false/NULL semantics) |
| `scheme_eligibility.eligible_categories` | NULL | ST, with **3 PVTG slots** of the 20 awards | **MISSING VALUE — EXISTING COLUMN CAN STORE IT** (+ new-table slot split) |
| `scheme_benefits` | 2 rows (`tuition_fee`, `maintenance_allowance`), both `amount` NULL | **9 components**, every one either a **foreign-currency figure** (USD 15,400 / £9,900 / $1,532 / £1,116) or **"as per actuals"** | **REQUIRES NEW TABLE** — a single numeric INR `amount` cannot represent any of them |
| `scheme_benefits.frequency` on `maintenance_allowance` | "monthly" | It is an **Annual Maintenance Allowance** (USD 15,400 / £9,900 per year), pro-rated by month | **CONFLICTING OFFICIAL SOURCES** — mislabelled frequency |
| JRF/SRF fallback during pandemic, war or field study in India | absent | Maintenance allowance reverts to the **National Fellowship JRF rate** (Master's) / **SRF rate** (Ph.D, Post-Doctoral) for that duration | **REQUIRES NEW TABLE** or a `benefit_variant` reference to ARG45 rates |
| `scheme_documents` | 4 rows (Aadhaar, Caste, Income, Admission Letter), all `document_type` = "Other" | **7 guideline documents** + FAQ additions (10th DOB certificate, marksheets with institute-issued CGPA→% conversion, ITR/Form 16, PVTG certificate) | **MISSING VALUE — EXISTING COLUMNS CAN STORE IT** |
| Missing document rows | no passport photo, no 10th DOB certificate, no marksheet, no PVTG certificate | all four are required by the guideline/FAQ | **MISSING VALUE — EXISTING COLUMNS CAN STORE IT** |
| `scheme_documents.accepted_formats` | NULL | **.jpg / .jpeg** | **MISSING VALUE — EXISTING COLUMN CAN STORE IT** |
| `scheme_documents.max_file_size_mb` | NULL | Profile photo **50–100 KB** | **MISSING VALUE — EXISTING COLUMN CAN STORE IT** |
| Application process | no storage | 20 ordered steps including merit tiers (a)/(b)/(c), Mission vs State verification split, 2-year joining deadline with **automatic cancellation**, 6-monthly progress report, and the alumni-module gate before return tickets | **REQUIRES NEW TABLE** |
| Grievance / contact | no storage; `gr_url` NULL | portal + in-portal module + `fellowship-tribal@nic.in` + 011-23345770 / 011-23366980 | **REQUIRES NEW TABLE** |
| `scheme_sources` | 1 generic row, `content_hash`/`retrieved_at`/`verified_at` NULL | revised guideline + FAQ + portal + Help page | **MISSING VALUE — EXISTING COLUMNS CAN STORE IT** (one row per source) |
| `scheme_versions.change_summary` | NULL | — | **MISSING VALUE** |
---

## 6. Cross-scheme summary

### 6.1 Official data comparison (all five schemes)

| Attribute | BPVGK | BVOBC | A023B | ARG45 | AZKMI |
|---|---|---|---|---|---|
| Scheme type (official) | Centrally Sponsored | Centrally Sponsored | Central Sector | Central Sector | Central Sector |
| DB `scheme_type` match | yes | yes | yes | yes | yes |
| Level covered | Class IX–X | Class XI to Post Graduation | Admission to notified institutions | M.Phil / M.Phil+Ph.D / Ph.D | Masters / Ph.D / Post-Doctoral |
| Funding pattern | 75:25 Centre:State; 90:10 NE & hilly; 100% Centre for UTs without a legislature | same | 100% MoTA | 100% MoTA | 100% MoTA; disbursed by Indian Missions, MoTA reimburses MEA |
| Application portal | `scholarships.gov.in` / State | `scholarships.gov.in` / State | `scholarships.gov.in` | `fellowship.tribal.gov.in` | `overseas.tribal.gov.in` |
| Official income ceiling | Rs. 2,50,000 | Rs. 2,50,000 | Rs. 6,00,000 | **none** | Rs. 6,00,000 |
| DB `maximum_family_income` | 200000 — **wrong** | 250000 — correct | 800000 — **wrong** | NULL — correct | 800000 — **wrong** |
| Minimum percentage | not specified | not specified | not specified (merit admission) | 55% at PG | 55% |
| Maximum age | not specified | not specified | not specified | 36 | 38 / 35 / 32 (course-wise) |
| `required_domicile` = true | correct | **unsupported** | **unsupported** | **unsupported** | **unsupported** |
| Awards per year | State quota-driven; not in the central guideline | State quota-driven; not in the central guideline | 1,000 (superseded text) / no explicit ceiling in the current guideline | 750 (38 Divyangjan / 25 PVTG / 225 Female / 462 ST Others) | 20 (17 ST + 3 PVTG; 30% female earmark) |
| Payment mode | DBT to student, 10 months | Fee and/or stipend via DBT, max 10 months | Fee to institute + maintenance to student | **Quarterly** PFMS DBT | Indian Mission disburses; JRF/SRF rates if studying from India |
| Currency of benefits | INR | INR | INR | INR | **Foreign currency / actuals** |

### 6.2 Storage-readiness status per scheme

| Aspect | BPVGK | BVOBC | A023B | ARG45 | AZKMI |
|---|---|---|---|---|---|
| Identity / `scheme_type` | EXISTS | EXISTS | EXISTS | EXISTS | EXISTS |
| Income ceiling | CONFLICT | EXISTS | CONFLICT | EXISTS (correctly NULL) | CONFLICT |
| Minimum percentage | NOT SPECIFIED | NOT SPECIFIED | NOT SPECIFIED | MISSING | MISSING |
| Age limits | NOT SPECIFIED | NOT SPECIFIED | NOT SPECIFIED | MISSING | NEW TABLE NEEDED |
| `required_domicile` | EXISTS (correct) | CONFLICT | CONFLICT | CONFLICT | CONFLICT |
| Benefit rows | MISSING | MISSING | MISSING | MISSING | NEW TABLE NEEDED |
| Benefit amounts | all NULL | all NULL | all NULL | all NULL | all NULL |
| Document rows | MISSING | MISSING | MISSING | MISSING | MISSING |
| `accepted_formats` / `max_file_size_mb` | NOT SPECIFIED | NOT SPECIFIED | NOT SPECIFIED | MISSING | MISSING |
| Application process | NEW TABLE NEEDED | NEW TABLE NEEDED | NEW TABLE NEEDED | NEW TABLE NEEDED | NEW TABLE NEEDED |
| Grievance URL | MISSING | MISSING | MISSING | MISSING | MISSING |
| Cycle dates | CONFLICT | CONFLICT | CONFLICT | CONFLICT | CONFLICT |
| `source_last_verified_at` | stale (2025-01-15) | stale | stale | stale | stale |

### 6.3 System-wide findings

- **Every benefit `amount` in the live database is NULL**, across all 5 schemes and all 7 benefit rows. No applicant can see a single official rupee figure from the database.
- **No application process is stored for any scheme.** The `scheme_process_steps` table does not exist (`PGRST205`), and `scheme_criteria` does not exist either. 68 distinct ordered process steps across the five guidelines (8 + 11 + 11 + 18 + 20) have nowhere to live.
- **All 5 schemes carry the same three fabricated values**: `academic_year = "2025-2026"`, `application_start_date = 2025-07-01`, `application_end_date = 2025-12-31`, and the same generic `https://dbttribal.gov.in/` application URL. Real windows are per-State/per-year for BPVGK and BVOBC, and per-selection-year Ministry notices for A023B, ARG45 and AZKMI.
- **`gr_url` is NULL for all 5**, although a single official grievance portal serves all of them (`https://tribal.nic.in/Grievance/`).
- **All `scheme_documents` rows use `document_type = "Other"`**, so no document can be typed or filtered; 34 guideline documents are represented by 21 generic rows.
- **`scheme_eligibility.academic_year` is an empty string** on all 5 rows while `schemes.academic_year` says "2025-2026" — the same cycle is recorded inconsistently across two tables.
- **`source_last_verified_at = 2025-01-15` on all 5 rows** is not the date of any verification that can be evidenced; every `scheme_sources` row has `content_hash`, `retrieved_at`, `verified_at` and `verified_by` all NULL, so "verified" is asserted but unprovable.
- **`scheme_versions.change_summary` is NULL** on all 5 rows — there is no audit trail of what changed or when.
- **Two of the five schemes cannot be stored in INR at all** (AZKMI foreign currency; ARG45 HRA/escort defined as UGC percentages), so `scheme_benefits.amount NUMERIC` is structurally insufficient.

### 6.4 Highest-impact errors (ordered by risk of wrongly rejecting a genuine applicant)

1. **ARG45 `other_rules` requires NET/JRF** — the guideline requires **no** NET/JRF. This would reject every eligible ST research scholar.
2. **ARG45 55% and age 36 are absent** — a genuine eligible fellow with 60% would not be distinguishable, and no age screening is possible.
3. **BPVGK income ceiling Rs. 2,00,000 instead of Rs. 2,50,000** — wrongly rejects families between Rs. 2 and 2.5 lakh.
4. **A023B income ceiling Rs. 8,00,000 instead of Rs. 6,00,000** — wrongly admits families between Rs. 6 and 8 lakh.
5. **AZKMI income ceiling Rs. 8,00,000 instead of Rs. 6,00,000** — same failure, plus the omitted 55%, age-by-course, one-child and top-1,000- institute rules.
6. **All benefit amounts NULL** — the portal cannot communicate a single official benefit figure for any scheme.
7. **BVOBC Group I–IV course mapping and its 8 distinct fee/stipend rates are absent** — a correct applicant cannot be assessed for the right stipend tier.
8. **`required_domicile = true` on ARG45 and AZKMI** — imposes an official-sounding requirement that does not exist.

---

## 7. Conflicting official sources — log

These are genuine disagreements **between official sources**, or between a live official page and the current guideline. They are recorded, not resolved.

### 7.1 A023B — number of notified institutions

| Source | Value |
|---|---|
| Repository guideline, Annexure-I (pp. 24–38) | **252** institutions |
| `tribal.nic.in` Top Class page | **265** institutions |
| `tribal.nic.in` Top Class page (alternate count) | **246** institutions |

**Impact:** the portal's institute dropdown cannot be reconciled with the guideline annexure. **Action:** treat the guideline annexure as the dated authority (252, as of the 07-10-2022 revision), display the institute list with its own "as of" date, and do not hard-code a count in any summary field.

### 7.2 A023B — annual award ceiling

| Source | Value |
|---|---|
| Superseded 2017 NFS/Top Class guidelines | **1,000 awards per year** |
| Current repository guideline, Part-B | No explicit numeric ceiling; selection is merit-based against available institutions, and 10% of identified seats |
| OM dated 10-06-2025, `RevisedListTopClassSelectedStudentsFY2024-25` | **3,211** candidates selected for 2024-25 |

**Impact:** the "1,000 per year" figure that circulates is superseded and would understate awards by more than 3x. **Action:** do not publish a numeric ceiling for A023B; publish the selection-list count of the completed year with its date instead.

### 7.3 ARG45 — income criterion

| Source | Value |
|---|---|
| Repository guideline, Part-A p.5 §2.2 | "There is **no** income criteria for eligibility in respect of this scholarship." |
| MoTA National Fellowship FAQ | Asks for **Family Income Certificate** and **BPL Certificate** |

**Impact:** the DB's mandatory Income/BPL document rows for ARG45 are not supported by the guideline, yet removing them would break the FAQ-driven upload flow. **Action:** keep the document rows but mark them as FAQ-sourced and non-gatekeeping; never use income as an ARG45 eligibility filter.

### 7.4 ARG45 — scope of M.Phil courses

| Source | Value |
|---|---|
| Repository guideline, Part-A p.5 §2.4 | M.Phil in any discipline, in UGC-type institutions |
| Live portal `fellowship.tribal.gov.in` | M.Phil restricted to **Psychiatric Social Work** and **Clinical Psychology** |

**Impact:** a genuine M.Phil fellow in another discipline is eligible under the guideline but not under the live portal, and the portal is what the Ministry actually operates. **Action:** surface both, label the portal as the operative rule for the current cycle, and ask the Ministry rather than choosing silently.

### 7.5 AZKMI — target institute ranking

| Source | Value |
|---|---|
| Revised NOS guidelines, 07-10-2022 (PDF p.3 Note, p.8 §4.4) | Top **1,000** QS World ranked institutes |
| MoTA National Overseas Scholarship FAQ | References the top **10** institutes |

**Impact:** the FAQ appears to be an older, narrower statement. **Action:** apply the guideline's top-1,000 rule, and record the FAQ discrepancy in the source table so the difference is auditable.

### 7.6 AZKMI — field of study allocation

| Source | Value |
|---|---|
| Revised NOS guidelines §3 | Humanities/Social Science/Fine Arts share a 2-slot allocation |
| MoTA National Overseas Scholarship FAQ | Fine Arts is **not** listed as a separate/covered field |

**Impact:** a Fine Arts candidate's field classification differs between the two documents. **Action:** follow the guideline and record the FAQ variant.

### 7.7 Scheme period versus live operation (all five schemes)

| Source | Value |
|---|---|
| All four repository guidelines | Scheme period **2021-22 to 2025-26** |
| Live official pages and portals | Active **2026-27** cycles (e.g. NOS 2026-27 open till 30-06-2026; ARG45 live portal; State 2026-27 pre/post-matric notices) |
| Successor guideline for 2026-27 | **NOT FOUND** on tribal.nic.in or DBT Tribal as of 2026-09-27 |

**Impact:** the repository's guidelines are the most recent official documents available, but their stated validity has lapsed. Amounts and eligibility in them are corroborated by live PIB releases (2026-02-05) where possible, but the currency gap is unresolved. **Action:** store `source_last_verified_at` per source row, mark the guideline period as expired, and re-verify before any 2026-27 publication. **This is the single largest open risk in the dataset.**

### 7.8 BPVGK — family income ceiling

| Source | Value |
|---|---|
| Current guideline (2021-22 to 2025-26), p.3 §3.2 | **Rs. 2,50,000** per annum |
| Superseded NSP guideline w.e.f. 01-07-2012 | **Rs. 2,00,000** per annum |

**Impact:** the live DB stores 200000, i.e. the superseded ceiling. **Action:** correct to 250000 and keep the 2012 document only as a historical source row.

### 7.9 BPVGK — "upward revision of annual parental income" circular

A circular by this title is linked from `tribal.nic.in` alongside the pre-matric guideline, but its text was **not captured** during this audit, so the revised ceiling it announces cannot be stated. **Action:** retrieve the circular and re-verify the Rs. 2,50,000 figure before publishing; until then the value in §7.8 stands as the guideline value only.

---

## 8. Recommendations

**No change below has been applied. The database was inspected read-only.**

### 8.1 Correct the wrong values first (no schema change)

1. `scheme_eligibility.maximum_family_income`: BPVGK 200000 → **250000**; A023B 800000 → **600000**; AZKMI 800000 → **600000**.
2. `scheme_eligibility.other_rules`: remove the fabricated **NET/JRF** requirement from ARG45; remove the wrong ceilings embedded in A023B and AZKMI text; replace AZKMI's "Age limit as per scheme guidelines" with the explicit 38/35/32 limits.
3. `scheme_eligibility.required_domicile`: set to NULL/false for ARG45 and AZKMI (unsupported), and verify BVOBC before keeping it true.
4. `scheme_eligibility.minimum_percentage`: **55** for ARG45 and AZKMI.
5. `scheme_eligibility.maximum_age`: **36** for ARG45.
6. `schemes.academic_year` and the two date columns: replace the single hard-coded 2025-26 / 2025-07-01 / 2025-12-31 with per-scheme, per-cycle values sourced from the live notice.
7. `schemes.official_application_url`: `scholarships.gov.in` (BPVGK, BVOBC, A023B), `fellowship.tribal.gov.in` (ARG45), `overseas.tribal.gov.in` (AZKMI).
8. `schemes.gr_url`: `https://tribal.nic.in/Grievance/` on all five.
9. `schemes.source_last_verified_at`: **2026-09-27** for every source row actually verified in this audit.

### 8.2 Populate the existing detail tables (no schema change)

10. `scheme_benefits`: replace the 7 incomplete rows with one row per official component × tier. Minimum: BPVGK 6 (3 components × day scholar/hosteller, covering the 7 distinct official values), BVOBC 9 (4 groups × fee/stipend + disability allowance), A023B 4, ARG45 6 (3 courses × 2 streams) plus contingency and escort rows, AZKMI 9.
11. `scheme_benefits.frequency`: use the official basis — annual for one-off grants, monthly for allowances, quarterly where release is quarterly, and "actual" for as-per-actuals items.
12. `scheme_documents`: expand 21 generic rows to the **34 guideline documents** (BPVGK 6, BVOBC 8, A023B 6, ARG45 7, AZKMI 7), with correct `document_type`, real `accepted_formats` and `max_file_size_mb` where officially stated (PDF ≤ 500 KB and JPG/JPEG ≤ 100 KB per the UMANG manual for ARG45; JPG/JPEG and 50–100 KB photo for AZKMI). Add A023B's fresh-vs-renewal matrix as a condition rather than duplicating rows.
13. `scheme_sources`: one row per real source, with `content_hash`, `retrieved_at`, `verified_at` and `verified_by` populated so "verified" becomes provable.
14. `scheme_versions`: write a real `change_summary` for version 1 recording this audit.

### 8.3 Schema changes required

15. **Create `scheme_process_steps`** (`scheme_id`, `step_order`, `title`, `description`, `actor`, `sla_or_timeline`, `source_ref`). 76 ordered steps are currently unstorable, and applicants are told to expect verification and disbursement stages.
16. **Create `scheme_criteria`** for rules that do not fit a scalar column: AZKMI's three course-dependent age limits, its five field × slot allocations, ARG45's four institution categories and four sub-category quotas, ARG45's conditional HRA rule, and BVOBC's Group I–IV course mapping.
17. **Create a scheme-level contact block** (or equivalent) for grievance email, helpline and nodal officers; `schemes` has `gr_url` but no place for the rest.
18. **Extend `scheme_benefits` for non-INR and variable amounts**: add `currency`, `amount_basis` (fixed / percentage / actual / pro-rated) and a `reference_scheme_id` so AZKMI's USD/GBP figures and ARG45's UGC-percentage HRA can be represented without inventing a number.

### 8.4 Process and governance

19. Attach a `source_ref` (document + page/section) to every eligibility, benefit, document and process row, so each value is traceable to the guideline it came from.
20. Add an expiry/alert on guideline `validity` so a scheme whose guideline period has ended is flagged for re-verification instead of silently serving 2021-26 rules during a 2026-27 cycle (§7.7).
21. Re-run this audit when the Ministry publishes a 2026-27 guideline, and treat the 3,211-selection OM and the live portals as the interim authority for A023B and AZKMI volumes.
---

## 9. Verification statement

- **Database actions taken: none.** All inspection was read-only through the PostgREST API. No `INSERT`, `UPDATE`, `DELETE`, `ALTER`, migration or DDL was executed, and no row in any table was modified.
- **Schemes inspected:** all 5 in scope, read completely across `schemes`, `scheme_eligibility`, `scheme_benefits`, `scheme_documents`, `scheme_sources` and `scheme_versions`.
- **Tables confirmed absent:** `scheme_criteria` and `scheme_process_steps` (PostgREST `PGRST205`).
- **Documents read in full:** all 4 repository guideline PDFs, extracted with page markers so every citation above resolves to a page. A023B was sourced from Part-B and Annexure-I of `national-fellowship-scholarship.pdf`, correcting the earlier conclusion in §0.2.
- **Evidence standard:** only Ministry of Tribal Affairs, DBT Tribal, National Scholarship Portal, PIB and other Government of India pages were used as evidence. Third-party pages were read only to identify leads and are explicitly marked as not used, including the reported 15-07-2026 NOS deadline extension and the Ministry of Social Justice overseas scholarship, which is a different scheme.
- **Unresolved items:** §7.7 (expired guideline period with active 2026-27 operation, no successor guideline found), §7.9 (unretrieved parental-income circular), and the `webfetch` transport failures on `dbttribal.gov.in` and `tribal.nic.in`, for which indexed official page content was used instead.
- **Audit date:** 2026-09-27. Every value in this report should be re-verified before it is published to applicants.

---

*End of report. 9 sections, 5 schemes, 9 logged official-source conflicts. No database changes were made.*

