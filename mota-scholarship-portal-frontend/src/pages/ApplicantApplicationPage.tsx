import { useParams } from 'react-router-dom';
import { useApplicantAuth } from '../context/useApplicantAuth';
import { useApplicantApplications, useApplicantDocuments } from '../hooks/useApplicantRecords';
import { ApplicantPageHeader } from '../components/applicant/ApplicantPageHeader';
import { ApplicationStatusBadge } from '../components/applicant/StatusBadge';
import { ApplicationTimeline } from '../components/applicant/ApplicationTimeline';
import { DocumentStatusBadge } from '../components/applicant/StatusBadge';
import { DocumentVerificationPanel } from '../components/applicant/DocumentVerificationPanel';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ROUTES } from '../lib/constants';

export function ApplicantApplicationPage() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const { session, user } = useApplicantAuth();
  const { items: applications, status } = useApplicantApplications();
  const { items: documents } = useApplicantDocuments();

  if (!session || !user) {
    return null;
  }

  if (status === 'loading') {
    return (
      <div className="space-y-6 py-1 sm:py-2">
        <Card aria-busy="true" className="space-y-2 p-5" role="status">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="h-10 animate-pulse rounded bg-slate-100" key={index} />
          ))}
          <span className="sr-only">Loading application</span>
        </Card>
      </div>
    );
  }

  const application = applications.find((item) => item.id === applicationId);

  if (!application) {
    return (
      <div className="space-y-6 py-1 sm:py-2">
        <Card className="p-8 text-center">
          <h1 className="text-xl font-bold text-gov-blue-dark">Application not found</h1>
          <p className="mt-2 text-sm text-slate-600">
            No application with this reference exists on your account.
          </p>
          <Button className="mt-5" size="md" to={ROUTES.applicant.applications} variant="outline">Back to applications</Button>
        </Card>
      </div>
    );
  }

  const needsCorrection =
    application.status === 'deficiency-raised' || application.status === 'resubmission-required';
  const verificationLabel = needsCorrection
    ? 'Correction required'
    : application.status === 'under-scrutiny'
      ? 'Officer scrutiny'
      : 'Verification in progress';
  const openDeficiency = needsCorrection
    ? 'An officer has raised a deficiency on this application. Open your documents to see what must be replaced.'
    : 'No open deficiency is recorded for this application.';
  const documentProgress = application.documentsTotal > 0
    ? Math.round((application.documentsComplete / application.documentsTotal) * 100)
    : 0;

  return (
    <div className="space-y-6 py-1 sm:py-2">
      <ApplicantPageHeader
        action={<Button size="md" to={ROUTES.applicant.applications} variant="outline">Back to applications</Button>}
        description="Application details, workflow status, and document context."
        eyebrow="Application details"
        title={application.schemeName}
      />

      <Card className="border-l-4 border-gov-blue p-5" accentClass="">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-500">{application.id}</p>
            <p className="mt-1 text-sm text-slate-600">Reference: {application.referenceNumber}</p>
          </div>
          <ApplicationStatusBadge status={application.status} label={application.statusLabel} />
        </div>
        <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-gov-blue">Next step</p>
          <p className="mt-2 text-sm font-semibold text-gov-blue-dark">{application.nextStep}</p>
        </div>
        <dl className="mt-5 grid gap-4 border-y border-slate-100 py-5 sm:grid-cols-2 lg:grid-cols-4">
          <div><dt className="text-xs text-slate-500">Applicant</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{user?.name}</dd></div>
          <div><dt className="text-xs text-slate-500">Submitted on</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{application.submittedAt}</dd></div>
          <div><dt className="text-xs text-slate-500">Last updated</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{application.updatedAt}</dd></div>
          <div><dt className="text-xs text-slate-500">Support shown</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{application.amountLabel}</dd></div>
        </dl>
        <div className="mt-5 flex flex-wrap gap-2">
          <Badge tone={needsCorrection ? 'amber' : 'purple'}>{verificationLabel}</Badge>
        </div>
      </Card>

      <ApplicationTimeline application={application} />

      {application.documentsTotal > 0 ? (
        <DocumentVerificationPanel
          applicationId={application.id}
          documentCount={application.documentsTotal}
          needsCorrection={needsCorrection}
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">Uploaded documents</p>
              <h2 className="mt-1 text-lg font-bold text-gov-blue-dark">Documents on your profile</h2>
            </div>
            <Button size="sm" to={ROUTES.applicant.documents} variant="outline">Manage documents</Button>
          </div>

          {documents.length === 0 ? (
            <p className="mt-4 rounded border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-600">
              You have not uploaded any document yet.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {documents.map((document) => (
                <li className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0" key={document.id}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{document.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{document.fileSize} · Updated {document.updatedAt}</p>
                  </div>
                  <DocumentStatusBadge status={document.status} label={document.statusLabel} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5" accentClass="border-l-4 border-gov-saffron">
          <p className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">Application record</p>
          <h2 className="mt-1 text-lg font-bold text-gov-blue-dark">Document readiness</h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div className="flex items-start justify-between gap-4"><dt className="text-slate-500">Documents</dt><dd className="text-right font-semibold text-slate-800">{application.documentsTotal > 0 ? `${application.documentsComplete}/${application.documentsTotal} complete` : '—'}</dd></div>
            <div className="flex items-start justify-between gap-4"><dt className="text-slate-500">Verification</dt><dd className="text-right font-semibold text-slate-800">{verificationLabel}</dd></div>
          </dl>
          {application.documentsTotal > 0 ? (
            <div
              aria-label={`${application.documentsComplete} of ${application.documentsTotal} documents complete`}
              aria-valuemax={application.documentsTotal}
              aria-valuemin={0}
              aria-valuenow={application.documentsComplete}
              className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100"
              role="progressbar"
            >
              <div className="h-full rounded-full bg-gov-blue" style={{ width: `${documentProgress}%` }} />
            </div>
          ) : null}
        </Card>
      </div>

      <Card className="p-5" accentClass="border-l-4 border-gov-saffron">
        <p className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">Deficiencies and remarks</p>
        <h2 className="mt-1 text-lg font-bold text-gov-blue-dark">Applicant action context</h2>
        <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm leading-relaxed text-amber-950">
          <p className="font-bold">Deficiency</p>
          <p className="mt-1">{openDeficiency}</p>
        </div>
        {needsCorrection ? (
          <Button className="mt-5 w-full" size="md" to={ROUTES.applicant.documents} variant="primary">
            Open document checklist
          </Button>
        ) : null}
      </Card>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm leading-relaxed text-slate-700">
        <p className="font-bold text-gov-blue-dark">Decision boundary</p>
        <p className="mt-1">AI assists document verification. Final verification and decisions are performed by authorized officials.</p>
      </div>
    </div>
  );
}
