import {
  applicantApplicationPath,
  applicantSchemePath,
  ROUTES,
} from '../lib/constants';
import type {
  ApplicantApplication,
  ApplicantDocument,
  ApplicantNotification,
  ApplicantProfile,
  ApplicantQuickAction,
  ApplicantRequiredAction,
} from '../types';

export const APPLICANT_PROFILE: ApplicantProfile = {
  id: 'applicant-demo-001',
  name: 'Aarav Kumar',
  email: 'aarav.kumar@example.in',
  mobile: '+91 98765 43210',
  state: 'Odisha',
  district: 'Khordha',
  category: 'Scheduled Tribe',
  course: 'B.Tech, Computer Science',
  institution: 'Kalinga Institute of Technology',
  avatarInitials: 'AK',
};

export const APPLICANT_APPLICATIONS: ApplicantApplication[] = [
  {
    id: 'APP-2026-001',
    schemeId: 'demo-higher-ed',
    schemeName: 'Demo — Higher Education Scholarship',
    submittedAt: '12 August 2026',
    updatedAt: '22 September 2026',
    status: 'under-scrutiny',
    statusLabel: 'Under scrutiny',
    nextStep: 'Document verification and officer scrutiny are in progress.',
    referenceNumber: 'MOTA-DEMO-2026-001',
    amountLabel: '₹1,20,000 (sample)',
    documentsComplete: 4,
    documentsTotal: 5,
  },
  {
    id: 'APP-2026-002',
    schemeId: 'demo-post-matric',
    schemeName: 'Demo — Post-Matric Scholarship',
    submittedAt: '04 September 2026',
    updatedAt: '24 September 2026',
    status: 'deficiency-raised',
    statusLabel: 'Deficiency raised',
    nextStep: 'Replace the sample income certificate to continue verification.',
    referenceNumber: 'MOTA-DEMO-2026-002',
    amountLabel: '₹36,000 (sample)',
    documentsComplete: 3,
    documentsTotal: 5,
  },
];

export const APPLICANT_NOTIFICATIONS: ApplicantNotification[] = [
  {
    id: 'notification-review',
    title: 'Application under scrutiny',
    description:
      'Your Higher Education Scholarship application is in the sample officer-scrutiny stage.',
    timestamp: '22 September 2026',
    tone: 'info',
    unread: true,
    href: applicantApplicationPath('APP-2026-001'),
  },
  {
    id: 'notification-document',
    title: 'Action required: income certificate',
    description:
      'Replace the sample income certificate for the Post-Matric Scholarship application.',
    timestamp: '24 September 2026',
    tone: 'action',
    unread: true,
    href: ROUTES.applicant.documents,
  },
  {
    id: 'notification-profile',
    title: 'Profile details available',
    description: 'Review your sample profile before applying to another prototype scheme.',
    timestamp: '18 September 2026',
    tone: 'success',
    href: ROUTES.applicant.profile,
  },
  {
    id: 'notification-scheme',
    title: 'New demo scheme available',
    description: 'Explore the sample Research Fellowship listing in the scheme directory.',
    timestamp: '15 September 2026',
    tone: 'info',
    href: applicantSchemePath('demo-fellowship'),
  },
];

export const APPLICANT_DOCUMENTS: ApplicantDocument[] = [
  {
    id: 'doc-aadhaar',
    name: 'Aadhaar card',
    type: 'Identity',
    description: 'Identity document for applicant verification.',
    status: 'verified',
    statusLabel: 'Verified',
    fileSize: '184 KB (sample)',
    uploadedAt: '12 August 2026',
    updatedAt: '12 August 2026',
    required: true,
  },
  {
    id: 'doc-category',
    name: 'Category certificate',
    type: 'Category',
    description: 'Sample Scheduled Tribe category certificate.',
    status: 'verified',
    statusLabel: 'Verified',
    fileSize: '236 KB (sample)',
    uploadedAt: '12 August 2026',
    updatedAt: '12 August 2026',
    required: true,
  },
  {
    id: 'doc-institution',
    name: 'Institution verification',
    type: 'Academic',
    description: 'Bonafide certificate from the current sample institution.',
    status: 'verified',
    statusLabel: 'Verified',
    fileSize: '198 KB (sample)',
    uploadedAt: '13 August 2026',
    updatedAt: '13 August 2026',
    required: true,
  },
  {
    id: 'doc-income',
    name: 'Income certificate',
    type: 'Income',
    description: 'Latest income certificate required for the sample Post-Matric application.',
    status: 'needs-correction',
    statusLabel: 'Needs correction',
    fileSize: '—',
    uploadedAt: '04 September 2026',
    updatedAt: '24 September 2026',
    required: true,
  },
  {
    id: 'doc-bank',
    name: 'Bank account proof',
    type: 'Bank',
    description: 'Sample cancelled cheque or bank statement.',
    status: 'under-verification',
    statusLabel: 'Under verification',
    fileSize: '162 KB (sample)',
    uploadedAt: '04 September 2026',
    updatedAt: '18 September 2026',
    required: true,
  },
];

export function getApplicantRequiredActions(): ApplicantRequiredAction[] {
  return APPLICANT_DOCUMENTS.filter((document) => document.status === 'needs-correction').map(
    (document) => ({
      id: `correct-${document.id}`,
      title: `Replace ${document.name.toLowerCase()}`,
      description: `${document.description} Upload replacement is not connected in this prototype.`,
      dueLabel: 'Recommended by 28 September 2026',
      href: applicantApplicationPath('APP-2026-002'),
      ctaLabel: 'Review deficiency',
      tone: 'amber' as const,
    }),
  );
}

export const APPLICANT_REQUIRED_ACTIONS = getApplicantRequiredActions();

export const APPLICANT_QUICK_ACTIONS: ApplicantQuickAction[] = [
  {
    id: 'browse-schemes',
    title: 'Browse schemes',
    description: 'Find sample scholarships and fellowships.',
    icon: 'scheme',
    href: ROUTES.applicant.schemes,
    ctaLabel: 'Explore',
  },
  {
    id: 'view-documents',
    title: 'Manage documents',
    description: 'Review the sample document set and correction needs.',
    icon: 'documents',
    href: ROUTES.applicant.documents,
    ctaLabel: 'Open',
  },
  {
    id: 'view-notifications',
    title: 'View notifications',
    description: 'Stay updated on sample application activity.',
    icon: 'notifications',
    href: ROUTES.applicant.notifications,
    ctaLabel: 'View',
  },
  {
    id: 'view-profile',
    title: 'View profile',
    description: 'Check the personal details used in this sample session.',
    icon: 'profile',
    href: ROUTES.applicant.profile,
    ctaLabel: 'View',
  },
];
