import type { FooterLinkColumn, LanguageOption, NavigationItem } from '../types';

export const SITE = {
  nameEn: 'Ministry of Tribal Affairs',
  nameHi: 'जनजातीय कार्य मंत्रालय',
  govtLineHi: 'भारत सरकार',
  govtLineEn: 'Government of India',
  portalName: 'National Tribal Scholarship & Fellowship Management System (NTSFMS)',
  helpdeskLabel: 'Citizen & Scholar Helpdesk (Toll Free)',
  helpdeskPhone: '1800-11-7777',
  helpdeskHours: 'Working Days: 9:30 AM – 5:30 PM IST',
  dbtHelpdeskLabel: 'Canara Bank Scholar DBT Desk',
  dbtHelpdeskPhone: '1800-425-0018',
  email: 'fellowship-mota@gov.in',
  addressLine1: 'Shastri Bhawan, New Delhi - 110001',
  portalVersion: '3.8.4 (AI Pre-Screening Enabled)',
  lastUpdated: '24 September 2025',
  nationalInitiativeTitle: '75th Azadi Ka Amrit Mahotsav',
  nationalInitiativeSubtitle: 'VIKSIT BHARAT @2047',
  nationalTagline: 'Sabka Saath, Sabka Vikas, Sabka Vishwas',
  sealMotto: 'सत्यमेव जयते',
} as const;

/** Future route groups — declared now, implemented in later milestones. */
export const ROUTES = {
  home: '/',
  applicant: {
    dashboard: '/applicant/dashboard',
    schemes: '/applicant/schemes',
    schemeDetail: '/applicant/schemes/:id',
    eligibility: '/applicant/eligibility',
    application: '/applicant/application/:id',
    documents: '/applicant/documents',
    deficiencies: '/applicant/deficiencies',
    resubmission: '/applicant/resubmission',
    status: '/applicant/status/:id',
    notifications: '/applicant/notifications',
    profile: '/applicant/profile',
  },
  admin: {
    dashboard: '/admin/dashboard',
    applications: '/admin/applications',
    applicationDetail: '/admin/applications/:id',
    documents: '/admin/documents',
    aiVerification: '/admin/ai-verification',
    rules: '/admin/rules',
    deficiencies: '/admin/deficiencies',
    verification: '/admin/verification',
    decisions: '/admin/decisions',
    reports: '/admin/reports',
    audit: '/admin/audit',
  },
} as const;

/** In-page anchors used by the Home navigation. */
export const ANCHORS = {
  top: 'top',
  mainContent: 'main-content',
  quickLogin: 'quick-login',
  trackStatus: 'track-status',
  aboutSchemes: 'about-schemes',
  schemesList: 'schemes-list',
  verificationWorkflow: 'verification-workflow',
  universities: 'universities',
  notices: 'notices',
  grievances: 'grievances',
  eligibility: 'eligibility-check',
  register: 'register',
  digilocker: 'digilocker',
} as const;

export const SECTION_IDS = {
  TOP: '#top',
  MAIN_CONTENT: '#main-content',
  ABOUT: '#about-schemes',
  SCHEMES: '#schemes-list',
  ELIGIBILITY: '#eligibility-check',
  VERIFICATION: '#verification-workflow',
  UNIVERSITIES: '#universities',
  NOTICES: '#notices',
  GRIEVANCES: '#grievances',
  TRACK: '#track-status',
  QUICK_LOGIN: '#quick-login',
  REGISTER: '#register',
  DIGILOCKER: '#digilocker',
} as const;

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { id: 'home', label: 'Home', href: ROUTES.home, active: true },
  { id: 'about', label: 'About MoTA Schemes', href: SECTION_IDS.ABOUT },
  { id: 'schemes', label: 'Scholarships & Fellowships', href: SECTION_IDS.SCHEMES },
  { id: 'ai', label: 'AI-Assisted Verification', href: SECTION_IDS.VERIFICATION },
  { id: 'universities', label: 'Institutes & Universities', href: SECTION_IDS.UNIVERSITIES },
  { id: 'notices', label: 'Circulars & Notices', href: SECTION_IDS.NOTICES },
  { id: 'grievance', label: 'Grievance (CPGRAMS)', href: SECTION_IDS.GRIEVANCES },
];

export const LANGUAGES: LanguageOption[] = [
  { code: 'english', label: 'English' },
  { code: 'hindi', label: 'हिन्दी (Hindi)' },
  { code: 'odia', label: 'ଓଡ଼ିଆ (Odia)' },
  { code: 'santhali', label: 'संथाली (Santhali)' },
  { code: 'bengali', label: 'বাংলা (Bengali)' },
  { code: 'telugu', label: 'తెలుగు (Telugu)' },
];

export const FOOTER_LINK_COLUMNS: FooterLinkColumn[] = [
  {
    id: 'policies',
    heading: 'Website Policies',
    links: [
      'Terms & Conditions',
      'Privacy & Data Protection Policy',
      'Copyright Policy',
      'Hyperlinking Policy',
      'Accessibility Statement',
      'AI Usage & Decision Fairness Norms',
    ],
  },
  {
    id: 'important',
    heading: 'Important Links',
    links: [
      'Ministry of Tribal Affairs Official Site',
      'National Commission for Scheduled Tribes (NCST)',
      'University Grants Commission (UGC)',
      'Central Public Grievance Portal (CPGRAMS)',
      'MeriPehchan National SSO',
    ],
  },
];

export const FOOTER_SECURITY_SEALS = ['STQC Certified', 'WCAG 2.0 (Level AA)'] as const;

export const DEFAULT_FONT_SCALE = 1;
export const FONT_SCALE_MIN = 0.85;
export const FONT_SCALE_MAX = 1.15;
export const FONT_SCALE_STEP = 0.1;