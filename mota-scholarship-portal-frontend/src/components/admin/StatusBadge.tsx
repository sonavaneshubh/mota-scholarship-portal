import { Badge } from '../ui/Badge';
import type { BadgeTone } from '../ui/Badge';
import type { AdminApplicationStatus, AdminDocumentStatus } from '../../types/admin';

const applicationTone: Record<AdminApplicationStatus, BadgeTone> = {
  Pending: 'blue',
  'Under Review': 'purple',
  Approved: 'green',
  Rejected: 'red',
  'Documents Required': 'amber',
};

const documentTone: Record<AdminDocumentStatus, BadgeTone> = {
  Uploaded: 'blue',
  'Under Verification': 'purple',
  Verified: 'green',
  Rejected: 'red',
  'Re-upload Requested': 'amber',
};

const genericTone: Record<string, BadgeTone> = {
  Active: 'green',
  Inactive: 'slate',
  Complete: 'green',
  'Pending Verification': 'amber',
  'Documents Required': 'amber',
};

export function StatusBadge({ status, className = '' }: { status: string; className?: string }) {
  const tone = applicationTone[status as AdminApplicationStatus]
    ?? documentTone[status as AdminDocumentStatus]
    ?? genericTone[status]
    ?? 'slate';

  return (
    <Badge className={`whitespace-nowrap ${className}`} tone={tone}>
      {status}
    </Badge>
  );
}
