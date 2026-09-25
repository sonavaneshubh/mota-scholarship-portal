import { APPLICANT_DOCUMENTS } from '../data/applicantData';
import { ApplicantPageHeader } from '../components/applicant/ApplicantPageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ROUTES } from '../lib/constants';
import type { ApplicantDocumentStatus } from '../types';
import type { BadgeTone } from '../components/ui/Badge';

const statusToneMap: Record<ApplicantDocumentStatus, BadgeTone> = {
  verified: 'green',
  pending: 'blue',
  missing: 'red',
  'needs-update': 'amber',
};

export function ApplicantDocumentsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <ApplicantPageHeader
        action={<Button size="md" to={ROUTES.applicant.applications} variant="outline">Back to applications</Button>}
        description="Review the sample documents attached to your applicant profile. Upload and verification actions are UI placeholders."
        eyebrow="Applicant workspace"
        title="My documents"
      />
      <section className="grid gap-4" aria-label="Applicant documents">
        {APPLICANT_DOCUMENTS.map((document) => (
          <Card className="p-5" accentClass="" key={document.id}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 gap-3">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-gov-blue">
                  <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M6 3h9l3 3v15H6zM14 3v4h4M9 12h6M9 16h6" /></svg>
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-slate-800">{document.name}</h2>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{document.description}</p>
                  <p className="mt-2 text-[11px] text-slate-400">Updated {document.updatedAt}</p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <Badge tone={statusToneMap[document.status]}>{document.statusLabel}</Badge>
                <Button size="sm" type="button" variant="outline">{document.status === 'verified' ? 'View' : 'Update'}</Button>
              </div>
            </div>
          </Card>
        ))}
      </section>
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
        Document upload is not connected in this prototype. Do not upload real identity or financial documents.
      </div>
    </div>
  );
}
