import { SECTION_IDS, SITE } from '../lib/constants';
import type {
  Announcement,
  CircularItem,
  GovernmentInitiative,
  HowToApplyPhase,
  MinistryStat,
  QuickAction,
  Scheme,
  WorkflowStep,
} from '../types';

/*
 * MOCK / DEMO DATA — sample content only.
 * All values below are prototype placeholders lifted from the Stitch design
 * and are NOT official eligibility criteria, statistics, or government claims.
 * Replace every entry with real API responses in later phases.
 */

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    mark: 'Notice',
    text: 'Online application verification for National Fellowship for ST Candidates (NFST 2025-26) at University/Institute level is extended up to 31/12/2025 (5:00 PM IST).',
  },
  {
    id: 'ann-2',
    mark: 'Advisory',
    text: 'Mandatory Aadhaar and Canara Bank DBT Linking integration for selected candidates 2025-26 cycle.',
  },
  {
    id: 'ann-3',
    mark: 'Update',
    text: 'Merit List provisional allocation published under Top Class Education Scheme for ST Students.',
  },
  {
    id: 'ann-4',
    mark: 'Notice',
    text: 'SAMPLE FEED: University verification desk demo window for nodal officer UI walkthrough is now open.',
  },
];

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'find-scheme',
    title: 'Find Scheme',
    description: 'M.Phil, Ph.D, Overseas & Top-Class',
    icon: 'scheme',
    accent: 'blue',
    href: SECTION_IDS.SCHEMES,
    ctaLabel: 'Filter by Qualification',
  },
  {
    id: 'eligibility',
    title: 'Check Eligibility',
    description: '2-Minute Criteria Diagnostic',
    icon: 'eligibility',
    accent: 'saffron',
    href: SECTION_IDS.ELIGIBILITY,
    ctaLabel: 'Self Assessment Tool',
  },
  {
    id: 'track',
    title: 'Track Application',
    description: 'Aadhaar / Application No.',
    icon: 'track',
    accent: 'green',
    href: SECTION_IDS.TRACK,
    ctaLabel: 'Go',
    hasInlineInput: true,
  },
  {
    id: 'grievance',
    title: 'Grievance & Appeals',
    description: 'CPGRAMS Integrated Resolution',
    icon: 'grievance',
    accent: 'purple',
    href: SECTION_IDS.GRIEVANCES,
    ctaLabel: 'Register / Track Grievance',
  },
];

export const SCHEMES: Scheme[] = [
  {
    id: 'nfst',
    name: 'National Fellowship for Higher Education of ST Students (NFST)',
    shortName: 'NFST',
    category: 'doctoral',
    categoryLabel: 'Doctoral Fellowship',
    badgeTone: 'blue',
    statusLabel: 'DigiLocker Active',
    statusActive: true,
    description:
      'Financial support to ST scholars pursuing regular M.Phil and Ph.D. degrees in Sciences, Humanities, Engineering, and Social Sciences.',
    stats: [
      { label: 'Total Slots', value: '750 / Year' },
      { label: 'Stipend Rate', value: '₹37,000 - ₹42,000/mo', emphasize: true },
      { label: 'Annual Contingency', value: '₹20,600 / yr' },
    ],
    applyHref: '#apply-nfst',
  },
  {
    id: 'nos',
    name: 'National Overseas Scholarship for ST Students (NOS)',
    shortName: 'NOS',
    category: 'overseas',
    categoryLabel: 'Overseas Study',
    badgeTone: 'purple',
    statusLabel: 'Global Universities',
    statusActive: true,
    description:
      'Provides financial assistance to selected tribal candidates for pursuing Master\'s and Ph.D. abroad in prestigious global institutions.',
    stats: [
      { label: 'Total Slots', value: '20 Candidates / Year' },
      { label: 'Tuition Coverage', value: '100% Actual Fees', emphasize: true },
      { label: 'Living Allowance', value: 'USD/GBP per norms' },
    ],
    applyHref: '#apply-nos',
  },
  {
    id: 'topclass',
    name: 'Top Class Education for Scheduled Tribe (ST) Students',
    shortName: 'Top Class',
    category: 'topclass',
    categoryLabel: 'Premier Institutes',
    badgeTone: 'green',
    statusLabel: 'Undergraduate & PG',
    description:
      'Funding for meritorious ST students securing admissions in IITs, IIMs, NITs, AIIMS, and National Law Universities across India.',
    stats: [
      { label: 'Total Slots', value: '1000 Fresh / Year' },
      { label: 'Full Tuition', value: 'Reimbursed Directly', emphasize: true },
      { label: 'Living Expenses', value: '₹3,000 / month' },
    ],
    applyHref: '#apply-topclass',
  },
  {
    id: 'research',
    name: 'Post-Doctoral Tribal Research Fellowship & Grants',
    shortName: 'Tribal Research',
    category: 'research',
    categoryLabel: 'Research Grants',
    badgeTone: 'amber',
    statusLabel: 'Tribal Studies',
    description:
      'Tailored research grants targeting indigenous languages, folklore preservation, traditional tribal medicine, and forest rights legal research.',
    stats: [
      { label: 'Duration', value: 'Up to 3 Years' },
      { label: 'Grant Value', value: '₹47,000/mo + HRA', emphasize: true },
      { label: 'Eligibility', value: 'Ph.D in Relevant Field' },
    ],
    applyHref: '#apply-research',
  },
];

export const SCHEME_FILTERS: { id: 'all' | 'doctoral' | 'topclass' | 'overseas'; label: string }[] = [
  { id: 'all', label: 'All Schemes' },
  { id: 'doctoral', label: 'Doctoral (NFST)' },
  { id: 'topclass', label: 'Top Class (Graduation)' },
  { id: 'overseas', label: 'Overseas Studies' },
];

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: 1,
    title: 'DigiLocker Integration',
    detail:
      'Applicant signs in via MeriPehchan. Verified Caste Certificate, Income Certificate & Marksheets are fetched directly from issuing State/Central authorities.',
    note: '100% Cryptographically Signed',
    tone: 'blue',
  },
  {
    id: 2,
    title: 'AI Pre-Screening',
    detail:
      'Automated OCR parses scanned enclosures, checks duplicate submissions, and flags illegible documents or missing mandatory stamp seals for institutional ease.',
    note: 'Parsing & Anomaly Detection Only',
    tone: 'saffron',
  },
  {
    id: 3,
    title: 'University Nodal Officer',
    detail:
      'Designated Institutional Registrar / Dean reviews AI extraction against admission rolls, confirms Ph.D guide allocation, and signs off on verification docket.',
    note: 'Mandatory Human Verification',
    tone: 'blue',
  },
  {
    id: 4,
    title: 'Ministry Sanction & DBT',
    detail:
      'MoTA Competent Sanctioning Authority issues formal award letters. PFMS directly credits fellowship amount into student\'s Aadhaar-seeded bank account.',
    note: 'Direct Benefit Transfer (Zero Leakage)',
    tone: 'green',
  },
];

export const HOW_TO_APPLY_PHASES: HowToApplyPhase[] = [
  {
    phase: 'Phase 1',
    title: 'One Time Registration (OTR) with DigiLocker / Aadhaar',
    description:
      'Use your active mobile number linked with Aadhaar. DigiLocker will populate demographic details and confirmed Scheduled Tribe certificate.',
  },
  {
    phase: 'Phase 2',
    title: 'Select Scheme & Upload Research Enclosures',
    description:
      'Specify University, Department, Ph.D registration details, guide nomination letter, and synopsis. Scanned copies are pre-checked by automated parser.',
  },
  {
    phase: 'Phase 3',
    title: 'University Verification & State Level Countersign',
    description:
      'Your affiliated Institute Nodal Officer (INO) logs into the portal to review admission validity. System sends automated SMS alerts to candidates at each checkpoint.',
  },
  {
    phase: 'Phase 4',
    title: 'Merit Publication & Monthly Claim Processing',
    description:
      'Once approved, download your official award letter. Monthly fellowship claims, HRA, and contingencies are claimed digitally through the university-integrated portal.',
  },
];

export const MINISTRY_STATS: MinistryStat[] = [
  { id: 'stat-1', value: '750+', label: 'Fresh NFST Slots / Year', valueClass: 'text-gov-blue' },
  { id: 'stat-2', value: '100%', label: 'Direct DBT into Bank Account', valueClass: 'text-gov-green' },
  { id: 'stat-3', value: '650+', label: 'Verified Partner Universities', valueClass: 'text-gov-saffron' },
];

export const CIRCULARS: CircularItem[] = [
  {
    id: 'circ-1',
    title: 'Selection of Merit List - NFST Cycle 2025-26',
    meta: 'Published: 24 Sep 2025 | Size: 1.4 MB',
  },
  {
    id: 'circ-2',
    title: 'Extension Notice: University Verification Portal Closing Date',
    meta: 'Valid till: 31 Dec 2025 | Ref: MoTA/EDU/2025/11',
  },
  {
    id: 'circ-3',
    title: 'Advisory for Canara Bank Scholar Portal Account Seeding',
    meta: 'DBT Cell Guidelines | Size: 450 KB',
  },
  {
    id: 'circ-4',
    title: 'Annexures & Proforma for Ph.D Scholars (HRA/Contingency Claim)',
    meta: 'Standard MoTA Templates | Size: 620 KB',
  },
];

export const GOVERNMENT_INITIATIVES: GovernmentInitiative[] = [
  { id: 'digital-india', name: 'Digital India', dotClass: 'bg-blue-600' },
  { id: 'pm-janman', name: 'PM-JANMAN', dotClass: 'bg-amber-500' },
  { id: 'dbt-bharat', name: 'DBT Bharat', dotClass: 'bg-emerald-600' },
  { id: 'nsp', name: 'National Scholarship Portal (NSP)', dotClass: 'bg-indigo-600' },
  { id: 'pfms', name: 'PFMS / Canara Bank', dotClass: 'bg-red-600' },
  { id: 'mygov', name: 'MyGov India', dotClass: 'bg-orange-600' },
];

export const OFFICER_RESOURCES = [
  'Download INO Verification User Manual (v4.2)',
  'Canara Bank Portal Integration SOP',
  'Guidelines for Continuation Certificate',
];

export const LEADERS = [
  {
    id: 'minister',
    name: 'Sh. Jual Oram',
    role: 'Hon\'ble Union Minister',
    department: 'Ministry of Tribal Affairs',
    frameClass: 'border-2 border-amber-500',
  },
  {
    id: 'minister-state',
    name: 'Sh. Durgadas Uikey',
    role: 'Hon\'ble Minister of State',
    department: 'Ministry of Tribal Affairs',
    frameClass: 'border-2 border-slate-400',
  },
];

export { SITE };