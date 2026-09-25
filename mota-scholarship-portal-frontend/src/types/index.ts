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

export type UserRole = 'applicant' | 'admin';

export interface AuthProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface HomeAuthNavigationState {
  homeAuthMode: HomeAuthMode;
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
  | 'under-review'
  | 'action-required'
  | 'approved'
  | 'rejected';

export type ApplicantDocumentStatus = 'verified' | 'pending' | 'missing' | 'needs-update';

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
  profileCompletion: number;
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
  description: string;
  status: ApplicantDocumentStatus;
  statusLabel: string;
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
