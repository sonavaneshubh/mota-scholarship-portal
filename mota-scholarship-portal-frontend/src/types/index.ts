export type LanguageCode =
  | 'english'
  | 'hindi'
  | 'odia'
  | 'santhali'
  | 'bengali'
  | 'telugu';

export interface LanguageOption {
  code: LanguageCode;
  label: string;
}

export type AccentTone = 'blue' | 'saffron' | 'green' | 'purple' | 'slate';

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  active?: boolean;
  external?: boolean;
}

export type HomeAuthMode = 'applicant' | 'admin' | 'registration';

export interface HomeAuthNavigationState {
  homeAuthMode: HomeAuthMode;
  from?: {
    pathname: string;
    search?: string;
    hash?: string;
  };
}

export interface Announcement {
  id: string;
  mark: string;
  text: string;
}

export type QuickActionIcon = 'scheme' | 'eligibility' | 'track' | 'grievance';

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: QuickActionIcon;
  accent: AccentTone;
  href: string;
  ctaLabel: string;
  hasInlineInput?: boolean;
  anchorId?: string;
}

export type SchemeCategory =
  | 'all'
  | 'scholarship'
  | 'fellowship'
  | 'higher-education'
  | 'research'
  | 'overseas';

export type SchemeBadgeTone = 'blue' | 'purple' | 'green' | 'amber';

export interface SchemeStat {
  label: string;
  value: string;
  emphasize?: boolean;
}

export interface Scheme {
  id: string;
  name: string;
  shortName: string;
  category: Exclude<SchemeCategory, 'all'>;
  categoryLabel: string;
  badgeTone: SchemeBadgeTone;
  statusLabel: string;
  statusActive?: boolean;
  demo?: boolean;
  department: string;
  guidelinesAvailable?: boolean;
  description: string;
  stats: SchemeStat[];
  applyHref: string;
}

export type WorkflowTone = 'blue' | 'saffron' | 'slate' | 'green';

export interface WorkflowStep {
  id: number;
  stage: string;
  label: string;
  points: string[];
  tone: WorkflowTone;
  note: string;
}

export interface HowToApplyPhase {
  phase: string;
  title: string;
  description: string;
}

export interface AtGlanceItem {
  id: string;
  number: string;
  title: string;
}

export interface GovernmentInitiative {
  id: string;
  name: string;
  dotClass: string;
  status: string;
}

export interface CircularItem {
  id: string;
  title: string;
  meta: string;
}

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterLinkColumn {
  id: string;
  heading: string;
  links: FooterLink[];
}

export interface MinistryStat {
  id: string;
  value: string;
  label: string;
  valueClass: string;
}

export type ApplicantApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under-verification'
  | 'deficiency-raised'
  | 'resubmission-required'
  | 'under-scrutiny'
  | 'selected'
  | 'not-selected'
  | 'rejected'
  | 'withdrawn';

export type ApplicantDocumentStatus = 'uploaded' | 'under-verification' | 'verified' | 'needs-correction' | 'rejected';

export type ApplicantNotificationTone = 'info' | 'success' | 'warning' | 'action';

export type ApplicantQuickActionIcon = 'scheme' | 'documents' | 'notifications' | 'profile';

export interface ApplicantProfile {
  id: string;
  name: string;
  email: string;
  mobile: string;
  state: string;
  district: string;
  category: string;
  course: string;
  institution: string;
  avatarInitials: string;
}

export interface ApplicantSession {
  user: ApplicantProfile;
  signedInAt: string;
}

export interface ApplicantApplication {
  id: string;
  schemeId: string;
  schemeName: string;
  submittedAt: string;
  updatedAt: string;
  status: ApplicantApplicationStatus;
  statusLabel: string;
  nextStep: string;
  referenceNumber: string;
  amountLabel: string;
  documentsComplete: number;
  documentsTotal: number;
}

export interface ApplicantRequiredAction {
  id: string;
  title: string;
  description: string;
  dueLabel: string;
  href: string;
  ctaLabel: string;
  tone: 'blue' | 'amber' | 'green';
}

export interface ApplicantNotification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  tone: ApplicantNotificationTone;
  unread?: boolean;
  href: string;
}

export interface ApplicantDocument {
  id: string;
  name: string;
  type: string;
  description: string;
  status: ApplicantDocumentStatus;
  statusLabel: string;
  fileSize: string;
  uploadedAt: string;
  updatedAt: string;
  required: boolean;
}

export interface ApplicantQuickAction {
  id: string;
  title: string;
  description: string;
  icon: ApplicantQuickActionIcon;
  href: string;
  ctaLabel: string;
}
