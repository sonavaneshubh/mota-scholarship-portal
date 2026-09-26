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
  /**
   * Intentionally no completion percentage. Completeness is owned by the
   * database — see ProfileCompleteness in types/profile and
   * fetchCompleteness() — because a value derived from auth metadata would not
   * agree with what an administrator sees.
   */
}

export interface ApplicantApplication {
  /**
   * The row's `applications.id` uuid, or null when the row could not be read.
   *
   * Nullable rather than a placeholder string because this value is used to build
   * URLs. An em-dash or empty string here produces a link that is guaranteed to
   * render "Application not found", so a caller with no usable id must be able to
   * tell that and not render a link at all.
   */
  id: string | null;
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
  /**
   * Private-bucket object path. Only ever handed to documentService.createViewUrl,
   * which exchanges it for a 60-second signed URL. Never render it, never put it
   * in a link the applicant could share.
   */
  storagePath?: string | null;
}

export interface ApplicantQuickAction {
  id: string;
  title: string;
  description: string;
  icon: ApplicantQuickActionIcon;
  href: string;
  ctaLabel: string;
}
