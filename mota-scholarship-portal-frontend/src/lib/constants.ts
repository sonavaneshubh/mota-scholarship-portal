import type { FooterLinkColumn, LanguageOption, NavigationItem } from '../types';

export const SITE = {
  nameEn: 'Ministry of Tribal Affairs',
  nameHi: 'जनजातीय कार्य मंत्रालय',
  govtLineHi: 'भारत सरकार',
  govtLineEn: 'Government of India',
  portalName: 'AI-Enabled Scholarship & Fellowship Management System',
  prototypeLabel: 'Prototype / Demo',
  mastheadLine: 'Scholarship & Fellowship Management',
  mastheadSubline: 'Discover • Apply • Verify • Decide',
  helpdeskLabel: 'Helpdesk (Demo)',
  helpdeskPhone: '1800-11-0000 (Demo)',
  helpdeskHours: 'Working Days: 9:30 AM – 5:30 PM IST',
  email: 'scholarship-prototype@tribal.gov.in',
  addressLine1: 'Prototype build — contact/address details are sample placeholders',
  portalVersion: 'Prototype v0.2',
  lastUpdated: '24 September 2026',
  sealMotto: 'सत्यमेव जयते',
} as const;

export const ROUTES = {
  home: '/',
  aboutMota: '/about-mota',
  scholarshipsFellowships: '/scholarships-fellowships',
  guidelinesNotices: '/guidelines-notices',
  helpGrievance: '/help-grievance',
  homeLogin: '/#home-login',
  resetPassword: '/reset-password',
  applicant: {
    login: '/applicant/login',
    register: '/applicant/register',
    dashboard: '/applicant/dashboard',
    schemes: '/applicant/schemes',
    applications: '/applicant/applications',
    schemeDetail: '/applicant/schemes/:id',
    eligibility: '/applicant/eligibility',
    application: '/applicant/applications/:applicationId',
    documents: '/applicant/documents',
    deficiencies: '/applicant/deficiencies',
    resubmission: '/applicant/resubmission',
    status: '/applicant/applications/:applicationId/status',
    notifications: '/applicant/notifications',
    history: '/applicant/history',
    grievance: '/applicant/grievance',
    guidelines: '/applicant/guidelines',
    profile: '/applicant/profile',
  },
  admin: {
    login: '/admin/login',
    dashboard: '/admin/dashboard',
    applications: '/admin/applications',
    applicationDetail: '/admin/applications/:id',
    documentVerification: '/admin/document-verification',
    scholarships: '/admin/scholarships',
    reports: '/admin/reports',
    users: '/admin/users',
    notifications: '/admin/notifications',
    settings: '/admin/settings',
    documents: '/admin/document-verification',
    aiVerification: '/admin/ai-verification',
    rules: '/admin/rules',
    deficiencies: '/admin/deficiencies',
    verification: '/admin/verification',
    decisions: '/admin/decisions',
    audit: '/admin/audit',
  },
} as const;

export function applicantSchemePath(schemeId: string) {
  return `${ROUTES.applicant.schemes}/${encodeURIComponent(schemeId)}`;
}

export function applicantApplicationPath(applicationId: string) {
  return ROUTES.applicant.application.replace(':id', encodeURIComponent(applicationId));
}

export function applicantStatusPath(applicationId: string) {
  return `${ROUTES.applicant.applications}/${encodeURIComponent(applicationId)}/status`;
}

export function adminApplicationPath(applicationId: string) {
  return `${ROUTES.admin.applications}/${encodeURIComponent(applicationId)}`;
}

/** In-page anchors used by the Home navigation. */
export const ANCHORS = {
  top: 'top',
  mainContent: 'main-content',
  about: 'about-mota',
  schemes: 'scholarships-fellowships',
  eligibility: 'eligibility-check',
  howItWorks: 'how-it-works',
  howToApply: 'how-to-apply',
  notices: 'notices',
  helpGrievance: 'help-grievance',
  login: 'home-login',
  track: 'track-application',
} as const;

export const SECTION_IDS = {
  TOP: '#top',
  MAIN_CONTENT: '#main-content',
  ABOUT: '#about-mota',
  SCHEMES: '#scholarships-fellowships',
  ELIGIBILITY: '#eligibility-check',
  HOW_IT_WORKS: '#how-it-works',
  HOW_TO_APPLY: '#how-to-apply',
  NOTICES: '#notices',
  HELP_GRIEVANCE: '#help-grievance',
  LOGIN: '#home-login',
  TRACK: '#track-application',
} as const;

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { id: 'home', label: 'Home', href: ROUTES.home },
  { id: 'about', label: 'About MoTA', href: ROUTES.aboutMota },
  { id: 'scholarships-fellowships', label: 'Scholarships & Fellowships', href: ROUTES.scholarshipsFellowships },
  { id: 'guidelines-notices', label: 'Guidelines & Notices', href: ROUTES.guidelinesNotices },
  { id: 'help-grievance', label: 'Help & Grievance', href: ROUTES.helpGrievance },
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
    id: 'portal',
    heading: 'Portal',
    links: [
      { label: 'Home', href: ROUTES.home },
      { label: 'About MoTA', href: ROUTES.aboutMota },
      { label: 'Scholarships & Fellowships', href: ROUTES.scholarshipsFellowships },
      { label: 'How It Works', href: SECTION_IDS.HOW_IT_WORKS },
      { label: 'Guidelines & Notices', href: ROUTES.guidelinesNotices },
      { label: 'Help & Grievance', href: ROUTES.helpGrievance },
    ],
  },
  {
    id: 'applicant',
    heading: 'Applicant',
    links: [
      { label: 'Login', href: ROUTES.homeLogin },
      { label: 'Track Application', href: SECTION_IDS.TRACK },
      { label: 'Check Eligibility', href: SECTION_IDS.ELIGIBILITY },
    ],
  },
  {
    id: 'support',
    heading: 'Support',
    links: [
      { label: 'Help & Grievance', href: ROUTES.helpGrievance },
      { label: 'Officer / Administrator Access', href: ROUTES.admin.login },
      { label: 'Help & Grievance', href: SECTION_IDS.HELP_GRIEVANCE },
      { label: 'Contact (Prototype)', href: '#prototype-contact' },
    ],
  },
  {
    id: 'legal',
    heading: 'Legal / Information',
    links: [
      { label: 'Privacy Policy (Draft)', href: '#privacy-draft' },
      { label: 'Terms of Use (Draft)', href: '#terms-draft' },
      { label: 'Accessibility Statement', href: '#accessibility-statement' },
      { label: 'Prototype Disclaimer', href: '#prototype-disclaimer' },
    ],
  },
];

export const FOOTER_SECURITY_SEALS = ['Prototype', 'UI Milestone'] as const;

export const DEFAULT_FONT_SCALE = 1;
export const FONT_SCALE_MIN = 0.85;
export const FONT_SCALE_MAX = 1.15;
export const FONT_SCALE_STEP = 0.1;