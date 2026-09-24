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
}

export type SchemeCategory = 'all' | 'doctoral' | 'overseas' | 'topclass' | 'research';

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
  description: string;
  stats: SchemeStat[];
  applyHref: string;
}

export type WorkflowTone = 'blue' | 'saffron' | 'slate' | 'green';

export interface WorkflowStep {
  id: number;
  title: string;
  detail: string;
  note: string;
  tone: WorkflowTone;
}

export interface HowToApplyPhase {
  phase: string;
  title: string;
  description: string;
}

export interface GovernmentInitiative {
  id: string;
  name: string;
  dotClass: string;
}

export interface CircularItem {
  id: string;
  title: string;
  meta: string;
}

export interface FooterLinkColumn {
  id: string;
  heading: string;
  links: string[];
}

export interface MinistryStat {
  id: string;
  value: string;
  label: string;
  valueClass: string;
}