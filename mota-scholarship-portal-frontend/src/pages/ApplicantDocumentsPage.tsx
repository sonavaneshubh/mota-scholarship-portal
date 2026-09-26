import { APPLICANT_DOCUMENTS } from '../data/applicantData';
import { ApplicantPageHeader } from '../components/applicant/ApplicantPageHeader';
import { DocumentStatusBadge } from '../components/applicant/StatusBadge';
import { DocumentVerificationPanel } from '../components/applicant/DocumentVerificationPanel';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ROUTES } from '../lib/constants';

function getActionLabel(status: string) {
  if (status === 'needs-correction' || status === 'rejected') {
    return 'Replace unavailable';
  }

  if (status === 'verified') {
    return 'View unavailable';
  }

  return 'Review unavailable';
}

export function ApplicantDocumentsPage() {
  return (
    <div className="space-y-6 py-2 sm:py-4">
      <ApplicantPageHeader
        action={<Button size="md" to={ROUTES.applicant.applications} variant="outline">Back to applications</Button>}
        description="Review the sample documents attached to your applicant profile. Upload and verification actions are not connected."
        eyebrow="Applicant workspace"
        title="My documents"
      />

      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950" id="document-demo-notice">
        <span className="font-bold">Prototype notice:</span> These are sample records. Do not upload real identity or financial documents. File viewing, replacement, and AI processing are not connected to a backend.
      </div>

      <DocumentVerificationPanel documentCount={APPLICANT_DOCUMENTS.length} needsCorrection={APPLICANT_DOCUMENTS.some((document) => document.status === 'needs-correction')} />

      <Card className="min-w-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 p-4 sm:px-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">Document checklist</p>
            <h2 className="mt-1 text-lg font-bold text-gov-blue-dark">Your sample documents</h2>
            <p className="mt-1 text-sm text-slate-600">{APPLICANT_DOCUMENTS.length} required document types in this workspace</p>
          </div>
          <span className="text-xs font-semibold text-slate-500">Required for application review</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-max border-collapse text-left text-sm">
            <caption className="sr-only">Applicant document checklist</caption>
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-3 font-bold" scope="col">Document</th>
                <th className="px-4 py-3 font-bold" scope="col">Type</th>
                <th className="px-4 py-3 font-bold" scope="col">Status</th>
                <th className="px-4 py-3 font-bold" scope="col">Uploaded</th>
                <th className="px-4 py-3 font-bold" scope="col">Updated</th>
                <th className="px-4 py-3 text-right font-bold" scope="col">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {APPLICANT_DOCUMENTS.map((document) => (
                <tr className="align-middle" key={document.id}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{document.name}</p>
                    <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-500">{document.description}</p>
                    <p className="mt-1 text-[11px] text-slate-600">{document.fileSize}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{document.type}</td>
                  <td className="px-4 py-3"><DocumentStatusBadge status={document.status} label={document.statusLabel} /></td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{document.uploadedAt}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{document.updatedAt}</td>
                  <td className="px-4 py-3 text-right">
                    <Button aria-describedby="document-demo-notice" disabled size="sm" type="button" variant="outline">{getActionLabel(document.status)}</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {APPLICANT_DOCUMENTS.map((document) => (
            <article className="space-y-3 p-4" key={document.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-gov-blue-dark">{document.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">{document.type} · {document.fileSize}</p>
                </div>
                <DocumentStatusBadge status={document.status} label={document.statusLabel} />
              </div>
              <p className="text-xs leading-relaxed text-slate-600">{document.description}</p>
              <dl className="grid grid-cols-2 gap-3 text-xs">
                <div><dt className="text-slate-500">Uploaded</dt><dd className="mt-1 font-semibold text-slate-800">{document.uploadedAt}</dd></div>
                <div><dt className="text-slate-500">Updated</dt><dd className="mt-1 font-semibold text-slate-800">{document.updatedAt}</dd></div>
              </dl>
              <Button aria-describedby="document-demo-notice" className="w-full" disabled size="sm" type="button" variant="outline">{getActionLabel(document.status)}</Button>
            </article>
          ))}
        </div>
      </Card>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm leading-relaxed text-slate-700">
        <p className="font-bold text-gov-blue-dark">AI responsibility</p>
        <p className="mt-1">AI assists document verification. Final verification and decisions are performed by authorized officials. No automated decision is made by this prototype.</p>
      </div>
    </div>
  );
}