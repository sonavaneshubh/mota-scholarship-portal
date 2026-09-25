import { Badge } from '../ui/Badge';
import type { BadgeTone } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { applicantApplicationPath } from '../../lib/constants';
import type { ApplicantApplication, ApplicantApplicationStatus } from '../../types';

interface ApplicationCardProps {
  application: ApplicantApplication;
}

const statusToneMap: Record<ApplicantApplicationStatus, BadgeTone> = {
  draft: 'slate',
  submitted: 'blue',
  'under-review': 'purple',
  'action-required': 'amber',
  approved: 'green',
  rejected: 'red',
};

export function ApplicationCard({ application }: ApplicationCardProps) {
  return (
    <Card className="p-5" accentClass="">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-500">{application.id}</p>
          <h2 className="mt-1 text-lg font-bold text-gov-blue-dark">{application.schemeName}</h2>
        </div>
        <Badge tone={statusToneMap[application.status]}>{application.statusLabel}</Badge>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">{application.nextStep}</p>
      <div className="mt-4 grid gap-3 border-y border-slate-100 py-3 text-xs sm:grid-cols-3">
        <div>
          <p className="text-slate-500">Submitted</p>
          <p className="mt-1 font-semibold text-slate-800">{application.submittedAt}</p>
        </div>
        <div>
          <p className="text-slate-500">Last updated</p>
          <p className="mt-1 font-semibold text-slate-800">{application.updatedAt}</p>
        </div>
        <div>
          <p className="text-slate-500">Documents</p>
          <p className="mt-1 font-semibold text-slate-800">{application.documentsComplete}/{application.documentsTotal} complete</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-slate-500">Reference: {application.referenceNumber}</span>
        <Button size="sm" to={applicantApplicationPath(application.id)} variant="outline">
          View application
        </Button>
      </div>
    </Card>
  );
}
