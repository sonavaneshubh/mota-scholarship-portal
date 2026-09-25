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
  homeAuthMode: 'registration';
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