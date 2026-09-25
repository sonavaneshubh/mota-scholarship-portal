import { useParams } from 'react-router-dom';
import { APPLICANT_APPLICATIONS } from '../data/applicantData';
import { ApplicantPageHeader } from '../components/applicant/ApplicantPageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { applicantStatusPath, ROUTES } from '../lib/constants';
import type { ApplicantApplicationStatus } from '../types';
import type { BadgeTone } from '../components/ui/Badge';

const statusToneMap: Record<ApplicantApplicationStatus, BadgeTone> = {
  draft: 'slate',
  submitted: 'blue',
  'under-review': 'purple',
  'action-required': 'amber',
  approved: 'green',
  rejected: 'red',
};

export function ApplicantApplicationPage() {
  const { id } = useParams<{ id: string }>();
  const application = APPLICANT_APPLICATIONS.find((item) => item.id === id);

  if (!application) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <h1 className="text-xl font-bold text-gov-blue-dark">Application not found</h1>
          <Button className="mt-5" size="md" to={ROUTES.applicant.applications} variant="outline">Back to applications</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <ApplicantPageHeader
        action={<Button size="md" to={ROUTES.applicant.applications} variant="outline">Back to applications</Button>}
        description="Application details and status timeline for this prototype record."
        eyebrow="Application details"
        title={application.schemeName}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2" accentClass="">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500">{application.id}</p>
              <p className="mt-1 text-sm text-slate-600">Reference: {application.referenceNumber}</p>
            </div>
            <Badge tone={statusToneMap[application.status]}>{application.statusLabel}</Badge>
          </div>
          <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-gov-blue">Next step</p>
            <p className="mt-2 text-sm font-semibold text-gov-blue-dark">{application.nextStep}</p>
          </div>
          <dl className="mt-6 grid gap-4 border-y border-slate-100 py-5 sm:grid-cols-3">
            <div><dt className="text-xs text-slate-500">Submitted on</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{application.submittedAt}</dd></div>
            <div><dt className="text-xs text-slate-500">Last updated</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{application.updatedAt}</dd></div>
            <div><dt className="text-xs text-slate-500">Support shown</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{application.amountLabel}</dd></div>
          </dl>
          <h2 className="mt-6 text-lg font-bold text-gov-blue-dark">Document progress</h2>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gov-blue" style={{ width: `${(application.documentsComplete / application.documentsTotal) * 100}%` }} /></div>
          <p className="mt-2 text-xs text-slate-500">{application.documentsComplete} of {application.documentsTotal} required documents are complete.</p>
        </Card>
        <Card className="h-fit p-5" accentClass="">
          <h2 className="text-lg font-bold text-gov-blue-dark">Need help?</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">Open the status view for the latest activity summary or return to your documents.</p>
          <div className="mt-5 space-y-2">
            <Button className="w-full" size="md" to={applicantStatusPath(application.id)} variant="primary">Open status view</Button>
            <Button className="w-full" size="md" to={ROUTES.applicant.documents} variant="outline">View documents</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
