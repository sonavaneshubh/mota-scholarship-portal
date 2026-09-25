import { Badge } from '../ui/Badge';
import type { BadgeTone } from '../ui/Badge';
import type { ApplicantApplicationStatus, ApplicantDocumentStatus } from '../../types';

const applicationToneMap: Record<ApplicantApplicationStatus, BadgeTone> = {
  draft: 'slate',
  submitted: 'blue',
  'under-verification': 'purple',
  'deficiency-raised': 'amber',
  'resubmission-required': 'amber',
  'under-scrutiny': 'purple',
  selected: 'green',
  'not-selected': 'slate',
  rejected: 'red',
  withdrawn: 'slate',
};

const applicationLabelMap: Record<ApplicantApplicationStatus, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  'under-verification': 'Under verification',
  'deficiency-raised': 'Deficiency raised',
  'resubmission-required': 'Resubmission required',
  'under-scrutiny': 'Under scrutiny',
  selected: 'Selected',
  'not-selected': 'Not selected',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

const documentToneMap: Record<ApplicantDocumentStatus, BadgeTone> = {
  uploaded: 'blue',
  'under-verification': 'purple',
  verified: 'green',
  'needs-correction': 'amber',
  rejected: 'red',
};

const documentLabelMap: Record<ApplicantDocumentStatus, string> = {
  uploaded: 'Uploaded',
  'under-verification': 'Under verification',
  verified: 'Verified',
  'needs-correction': 'Needs correction',
  rejected: 'Rejected',
};

interface ApplicationStatusBadgeProps {
  status: ApplicantApplicationStatus;
  label?: string;
}

export function ApplicationStatusBadge({ status, label }: ApplicationStatusBadgeProps) {
  return <Badge tone={applicationToneMap[status]}>{label ?? applicationLabelMap[status]}</Badge>;
}

interface DocumentStatusBadgeProps {
  status: ApplicantDocumentStatus;
  label?: string;
}

export function DocumentStatusBadge({ status, label }: DocumentStatusBadgeProps) {
  return <Badge tone={documentToneMap[status]}>{label ?? documentLabelMap[status]}</Badge>;
}
