import { useState } from 'react';
import { useApplicantDocuments } from '../hooks/useApplicantRecords';
import { ApplicantPageHeader } from '../components/applicant/ApplicantPageHeader';
import { DocumentStatusBadge } from '../components/applicant/StatusBadge';
import { DocumentVerificationPanel } from '../components/applicant/DocumentVerificationPanel';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { createViewUrl } from '../services/documentService';
import { ROUTES } from '../lib/constants';

export function ApplicantDocumentsPage() {
  const { items, status, error, reload } = useApplicantDocuments();
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const needsCorrection = items.some(
    (document) => document.status === 'needs-correction' || document.status === 'rejected',
  );

  async function handleView(id: string, storagePath: string | null | undefined, fileName: string) {
    if (!storagePath) {
      setActionError('This document has no stored file.');
      return;
    }
    setActionError(null);
    setOpeningId(id);
    try {
      const result = await createViewUrl({ storage_path: storagePath, file_name: fileName });
      if (result.ok && result.data) {
        window.open(result.data, '_blank', 'noopener,noreferrer');
      } else {
        setActionError(result.error ?? 'The document could not be opened.');
      }
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <div className="space-y-6 py-2 sm:py-4">
      <ApplicantPageHeader
        action={<Button size="md" to={ROUTES.applicant.applications} variant="outline">Back to applications</Button>}
        description="The documents you have uploaded against your applicant profile."
        eyebrow="Applicant workspace"
        title="My documents"
      />

      {status === 'ready' && items.length > 0 ? (
        <DocumentVerificationPanel documentCount={items.length} needsCorrection={needsCorrection} />
      ) : null}

      {actionError ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {actionError}
        </p>
      ) : null}

      <Card className="min-w-0 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">Document checklist</p>
            <h2 className="mt-1 text-lg font-bold text-gov-blue-dark">Your documents</h2>
            {status === 'ready' ? (
              <p className="mt-1 text-sm text-slate-600">
                {items.length} document{items.length === 1 ? '' : 's'} uploaded
              </p>
            ) : null}
          </div>
          {status === 'error' ? (
            <Button onClick={reload} size="sm" type="button" variant="outline">Try again</Button>
          ) : null}
        </div>

        {status === 'loading' ? (
          <div aria-busy="true" className="space-y-2 p-5" role="status">
            {Array.from({ length: 3 }, (_, index) => (
              <div className="h-10 animate-pulse rounded bg-slate-100" key={index} />
            ))}
            <span className="sr-only">Loading your documents</span>
          </div>
        ) : null}

        {status === 'error' ? (
          <div className="px-5 py-10 text-center">
            <h3 className="text-lg font-bold text-gov-blue-dark">Documents could not be loaded</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
              {error ?? 'Please try again later.'}
            </p>
          </div>
        ) : null}

        {status !== 'loading' && status !== 'error' && items.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <h3 className="text-lg font-bold text-gov-blue-dark">No documents uploaded</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
              You have not uploaded any document yet. Documents are added from your profile sections, and
              each upload is recorded here with its current verification status.
            </p>
            <Button className="mt-5 rounded" size="md" to={ROUTES.applicant.profile} variant="primary">
              Go to profile
            </Button>
          </div>
        ) : null}

        {items.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-max border-collapse text-left text-sm">
                <caption className="sr-only">Documents uploaded by the applicant</caption>
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
                  {items.map((document) => (
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
                        <Button
                          disabled={openingId === document.id}
                          onClick={() => handleView(document.id, document.storagePath, document.name)}
                          size="sm"
                          type="button"
                          variant="outline"
                        >
                          {openingId === document.id ? 'Opening…' : document.storagePath ? 'View' : 'Unavailable'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 md:hidden">
              {items.map((document) => (
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
                  <Button
                    className="w-full"
                    disabled={openingId === document.id || !document.storagePath}
                    onClick={() => handleView(document.id, document.storagePath, document.name)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {openingId === document.id ? 'Opening…' : document.storagePath ? 'View' : 'Unavailable'}
                  </Button>
                </article>
              ))}
            </div>
          </>
        ) : null}
      </Card>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm leading-relaxed text-slate-700">
        <p className="font-bold text-gov-blue-dark">AI responsibility</p>
        <p className="mt-1">AI assists document verification. Final verification and decisions are performed by authorized officials.</p>
      </div>
    </div>
  );
}
