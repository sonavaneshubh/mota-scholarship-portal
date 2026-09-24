import { SECTION_IDS } from '../lib/constants';
import type {
  Announcement,
  AtGlanceItem,
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
 * These are prototype placeholders for the AI-Enabled Scholarship & Fellowship
 * Management System. They are NOT official scheme configurations, eligibility
 * criteria, statistics, deadlines, or government notifications.
 * Replace every entry with real API responses in later phases.
 */

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-1',
    mark: 'Demo',
    text: 'DEMO NOTICE: Scholarship application workflow preview for prototype evaluation.',
  },
  {
    id: 'ann-2',
    mark: 'Demo',
    text: 'DEMO NOTICE: Document verification workflow available for prototype evaluation.',
  },
  {
    id: 'ann-3',
    mark: 'Demo',
    text: 'DEMO NOTICE: Scheme information shown for demonstration only — not official.',
  },
  {
    id: 'ann-4',
    mark: 'Demo',
    text: 'DEMO NOTICE: Eligibility pre-check and deficiency/resubmission concepts are UI previews.',
  },
];

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'explore',
    title: 'Explore Scholarships & Fellowships',
    description: 'Browse available scholarship and fellowship schemes.',
    icon: 'scheme',
    accent: 'blue',
    href: SECTION_IDS.SCHEMES,
    ctaLabel: 'View Schemes',
  },
  {
    id: 'eligibility',
    title: 'Check Eligibility',
    description: 'Perform a preliminary eligibility assessment before applying.',
    icon: 'eligibility',
    accent: 'saffron',
    href: SECTION_IDS.ELIGIBILITY,
    ctaLabel: 'Check Eligibility',
  },
  {
    id: 'track',
    title: 'Track Application',
    description: 'Track your application using your Application ID.',
    icon: 'track',
    accent: 'green',
    href: SECTION_IDS.TRACK,
    ctaLabel: 'Go',
    hasInlineInput: true,
    anchorId: 'track-application',
  },
  {
    id: 'help',
    title: 'Help & Grievance',
    description: 'Get help or submit and track a grievance.',
    icon: 'grievance',
    accent: 'purple',
    href: SECTION_IDS.HELP_GRIEVANCE,
    ctaLabel: 'Get Support',
    anchorId: 'help-grievance',
  },
];

export const APPLICATION_GLANCE: AtGlanceItem[] = [
  { id: 'glance-1', number: '01', title: 'Explore Scheme' },
  { id: 'glance-2', number: '02', title: 'Check Eligibility' },
  { id: 'glance-3', number: '03', title: 'Submit Application' },
  { id: 'glance-4', number: '04', title: 'Document Verification' },
  { id: 'glance-5', number: '05', title: 'Track Decision' },
];

export const SCHEMES: Scheme[] = [
  {
    id: 'demo-higher-ed',
    name: 'Demo — Higher Education Scholarship (ST Students)',
    shortName: 'HE Scholarship',
    category: 'higher-education',
    categoryLabel: 'Higher Education',
    badgeTone: 'blue',
    statusLabel: 'Prototype Listing',
    statusActive: true,
    demo: true,
    description:
      'Sample configuration for an undergraduate/postgraduate scholarship with tuition assistance. Shown for prototype illustration only.',
    stats: [
      { label: 'Level', value: 'UG / PG (sample)' },
      { label: 'Coverage', value: 'Tuition & maintenance (sample)', emphasize: true },
      { label: 'Applicants', value: 'As per rules (demo)' },
    ],
    applyHref: '#apply-placeholder',
  },
  {
    id: 'demo-fellowship',
    name: 'Demo — Research Fellowship (ST Researchers)',
    shortName: 'Research Fellowship',
    category: 'fellowship',
    categoryLabel: 'Fellowship',
    badgeTone: 'blue',
    statusLabel: 'Prototype Listing',
    statusActive: true,
    demo: true,
    description:
      'Sample configuration for a research fellowship supporting ST researchers in full-time M.Phil / Ph.D programmes. Illustration only.',
    stats: [
      { label: 'Level', value: 'M.Phil / Ph.D (sample)' },
      { label: 'Support', value: 'Fellowship + contingency (sample)', emphasize: true },
      { label: 'Duration', value: 'Up to 5 years (sample)' },
    ],
    applyHref: '#apply-placeholder',
  },
  {
    id: 'demo-post-matric',
    name: 'Demo — Post-Matric Scholarship',
    shortName: 'Post-Matric',
    category: 'scholarship',
    categoryLabel: 'Scholarship',
    badgeTone: 'amber',
    statusLabel: 'Prototype Listing',
    statusActive: true,
    demo: true,
    description:
      'Sample configuration for a post-matric scholarship covering late school and college stages. Prototype illustration, not an official scheme detail.',
    stats: [
      { label: 'Level', value: 'Class 11 – PG (sample)' },
      { label: 'Coverage', value: 'Tuition & maintenance (sample)', emphasize: true },
      { label: 'Mode', value: 'Web-based application (demo)' },
    ],
    applyHref: '#apply-placeholder',
  },
  {
    id: 'demo-research',
    name: 'Demo — Tribal Research Grant',
    shortName: 'Research Grant',
    category: 'research',
    categoryLabel: 'Research',
    badgeTone: 'purple',
    statusLabel: 'Prototype Listing',
    statusActive: true,
    demo: true,
    description:
      'Sample configuration for research grants focused on tribal studies and related themes. Prototype illustration only.',
    stats: [
      { label: 'Focus', value: 'Tribal studies (sample)' },
      { label: 'Duration', value: 'Up to 3 years (sample)' },
      { label: 'Deliverable', value: 'Report / publication (sample)' },
    ],
    applyHref: '#apply-placeholder',
  },
  {
    id: 'demo-overseas',
    name: 'Demo — Overseas Study Support',
    shortName: 'Overseas Support',
    category: 'overseas',
    categoryLabel: 'Overseas',
    badgeTone: 'green',
    statusLabel: 'Prototype Listing',
    statusActive: true,
    demo: true,
    description:
      'Sample configuration for support to candidates pursuing study abroad. Prototype illustration, not an official programme.',
    stats: [
      { label: 'Level', value: 'PG / Ph.D abroad (sample)' },
      { label: 'Support', value: 'Tuition + living (sample)', emphasize: true },
      { label: 'Intake', value: 'As per notification (demo)' },
    ],
    applyHref: '#apply-placeholder',
  },
];

export const SCHEME_FILTERS: { id: Exclude<import('../types').SchemeCategory, 'all'> | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'scholarship', label: 'Scholarship' },
  { id: 'fellowship', label: 'Fellowship' },
  { id: 'higher-education', label: 'Higher Education' },
  { id: 'research', label: 'Research' },
  { id: 'overseas', label: 'Overseas' },
];

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: 1,
    stage: 'Stage 1',
    label: 'Applicant Submission',
    points: [
      'Registration & Scheme Selection',
      'Eligibility Pre-check',
      'Application Submission',
      'Document Upload',
    ],
    note: 'Applicant completes and submits the application docket.',
    tone: 'blue',
  },
  {
    id: 2,
    stage: 'Stage 2',
    label: 'AI-Assisted Processing',
    points: [
      'AI-Assisted Document Extraction',
      'Completeness & Consistency Check',
      'Preliminary Rule Evaluation',
    ],
    note: 'Assistance Only — AI never decides.',
    tone: 'saffron',
  },
  {
    id: 3,
    stage: 'Stage 3',
    label: 'Human Verification',
    points: [
      'Officer Document Verification',
      'Review of AI Extraction Results',
    ],
    note: 'Mandatory Human Verification.',
    tone: 'blue',
  },
  {
    id: 4,
    stage: 'Stage 4',
    label: 'Final Authorized Decision',
    points: [
      'Rule / Eligibility Evaluation',
      'Final Authorized Decision',
      'Audit Trail Recorded',
    ],
    note: 'Authorized officers remain responsible for final decisions.',
    tone: 'green',
  },
];

export const AI_RESPONSIBILITY = {
  title: 'AI-Assisted, Human-Verified',
  text: 'AI assists with document classification, OCR/extraction, completeness checks and preliminary rule evaluation. Authorized officers review the results and remain responsible for verification and final decisions.',
};

export const HOW_TO_APPLY_PHASES: HowToApplyPhase[] = [
  {
    phase: 'Step 1',
    title: 'Create Account',
    description: 'Register with your basic profile to start the scholarship/fellowship journey.',
  },
  {
    phase: 'Step 2',
    title: 'Explore Scheme & Check Eligibility',
    description: 'Browse the sample schemes and run a preliminary eligibility pre-check.',
  },
  {
    phase: 'Step 3',
    title: 'Complete Application',
    description: 'Fill in the application form for your chosen scheme with accurate details.',
  },
  {
    phase: 'Step 4',
    title: 'Upload Required Documents',
    description: 'Upload the supporting documents required by the selected scheme.',
  },
  {
    phase: 'Step 5',
    title: 'Review & Submit',
    description: 'Review all entered details and documents, then submit the application.',
  },
  {
    phase: 'Step 6',
    title: 'Track Verification & Decision',
    description: 'Follow your application through verification and the final authorized decision.',
  },
];

export const DEFICIENCY_NOTE =
  'If required information is missing or inconsistent, a deficiency notice is raised and the applicant may submit the corrected or missing document (resubmission).';

export const MINISTRY_STATS: MinistryStat[] = [
  {
    id: 'stat-1',
    value: 'Unified Portal',
    label: 'Schemes, applications & documents in one workflow',
    valueClass: 'text-gov-blue',
  },
  {
    id: 'stat-2',
    value: 'AI-Assisted',
    label: 'Assistive document extraction & completeness checks',
    valueClass: 'text-gov-green',
  },
  {
    id: 'stat-3',
    value: 'Human-Verified',
    label: 'Final decisions by authorized officers only',
    valueClass: 'text-gov-saffron',
  },
];

export const CIRCULARS: CircularItem[] = [
  {
    id: 'circ-1',
    title: 'DEMO: Scholarship application workflow preview',
    meta: 'Prototype notice — not an official notification',
  },
  {
    id: 'circ-2',
    title: 'DEMO: Document verification workflow walkthrough',
    meta: 'Prototype notice — not an official notification',
  },
  {
    id: 'circ-3',
    title: 'DEMO: Eligibility pre-check module overview',
    meta: 'Prototype notice — not an official notification',
  },
  {
    id: 'circ-4',
    title: 'DEMO: Deficiency & resubmission concept note',
    meta: 'Prototype notice — not an official notification',
  },
];

export const GOVERNMENT_INITIATIVES: GovernmentInitiative[] = [
  { id: 'digilocker', name: 'DigiLocker', dotClass: 'bg-blue-600', status: 'Future Integration' },
  { id: 'doc-services', name: 'Document Services', dotClass: 'bg-slate-500', status: 'Planned' },
  { id: 'notifications', name: 'Notifications', dotClass: 'bg-amber-500', status: 'Planned' },
  { id: 'grievance', name: 'Grievance Desk', dotClass: 'bg-red-500', status: 'Planned' },
  { id: 'ecosystem', name: 'Citizen Ecosystem Portals', dotClass: 'bg-emerald-600', status: 'Reference' },
];

export const OFFICER_RESOURCES = [
  'Application Review Desk (Prototype)',
  'AI Extraction Review Guide (Sample)',
  'Rules Configuration Overview (Draft)',
];

export const ELIGIBILITY_COPY = {
  eyebrow: 'Prototype Module',
  title: 'Check Eligibility Before You Apply',
  description:
    'Get a preliminary assessment based on the scheme\u2019s configured criteria, comparing your profile against sample parameters before you apply.',
  disclaimer:
    'This is not the final eligibility decision. Final eligibility is subject to document verification and authorized review.',
  featurePoints: ['Profile-based pre-check', 'Per-scheme criteria summary', 'Preliminary outcome only'],
  actionLabel: 'Check Eligibility',
  actionHint: 'UI placeholder for this milestone — full tool opens in a later phase.',
} as const;