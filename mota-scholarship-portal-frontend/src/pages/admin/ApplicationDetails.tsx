import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAdminAuth } from '../../context/useAdminAuth';
import { createViewUrl } from '../../services/documentService';
import { fetchSubmittedApplication } from '../../services/demoAdminData';
import type { AdminRequirement } from '../../services/demoAdminData';
import { ROUTES } from '../../lib/constants';
import type { AdminApplication } from '../../types/admin';
import { AdminIcon } from '../../components/admin/AdminIcon';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

function DetailItem({ label, value }: { label: string; value: string }) {
  const recorded = value.trim().length > 0;

  return (
    <div>
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className={`mt-1 text-sm font-semibold ${recorded ? 'text-slate-800' : 'italic text-slate-400'}`}>
        {recorded ? value : 'Not recorded in the database'}
      </dd>
    </div>
  );
}

function formatDate(value: string) {
  if (!value) {
    return 'Not recorded';
  }
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function formatDateTime(value: string) {
  if (!value) {
    return 'Not recorded';
  }
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function ApplicationDetails() {
  const { id } = useParams<{ id: string }>();
  const { session } = useAdminAuth();
  const isDemoAdmin = session?.mode === 'demo';
  const [application, setApplication] = useState<AdminApplication | null>(null);
  const [requirements, setRequirements] = useState<AdminRequirement[]>([]);
  const [requirementsError, setRequirementsError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewError, setPreviewError] = useState('');

  const load = useCallback(async () => {
    if (!id) {
      return;
    }

    setLoading(true);
    setError('');
    const result = await fetchSubmittedApplication(id);

    if (result.ok) {
      setApplication(result.rows.application);
      setRequirements(result.rows.requirements);
      setRequirementsError(result.requirementsError ?? '');
      setLoading(false);
      return;
    }

    setApplication(null);
    setRequirements([]);
    setRequirementsError('');
    setError(result.error);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPreviewingId(null);
    setPreviewUrl('');
    setPreviewError('');
  }, [id]);

  async function handleViewDocument(documentId: string, storagePath: string | null | undefined) {
    setPreviewingId(documentId);
    setPreviewUrl('');
    setPreviewError('');

    if (!storagePath) {
      setPreviewError('This document has no stored file, so there is nothing to open.');
      return;
    }

    const result = await createViewUrl({ storage_path: storagePath, file_name: '' });

    if (!result.ok) {
      setPreviewError(result.error ?? 'The document could not be opened.');
      return;
    }

    if (!result.data) {
      setPreviewError('The document service returned no link for this file.');
      return;
    }

    setPreviewUrl(result.data);
  }

  if (loading) {
    return (
      <div aria-live="polite" className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-600">
        <span className="mx-auto mb-3 block h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-gov-blue" />
        Reading this application from the portal database…
      </div>
    );
  }

  if (!application) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-gov-blue-dark">{error ? 'Application not available' : 'Application not found'}</h1>
        <p className="mt-2 text-sm text-slate-600">
          {error || 'The Demo Admin could not find that application.'}
        </p>
        <Button className="mt-5" to={ROUTES.admin.applications} variant="outline">Back to applications</Button>
      </div>
    );
  }

  const verifiedCount = application.documents.filter((document) => document.status === 'Verified').length;
  const answerEntries = Object.entries(application.schemeAnswers ?? {}).filter(
    ([, value]) => value !== null && value !== undefined && value !== '',
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        action={<Button size="md" to={ROUTES.admin.applications} variant="outline"><AdminIcon className="h-4 w-4" name="chevron-left" /> Back to applications</Button>}
        description="The applicant's own profile, course, scheme and uploaded documents, exactly as submitted."
        eyebrow={`Application record · ${application.id}`}
        title={application.applicantName}
      />

      {isDemoAdmin ? (
        <div className="rounded-md border-2 border-amber-400 bg-amber-50 px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-amber-900">
            <AdminIcon className="h-4 w-4" name="lock" /> Demo Admin Mode — Read Only
          </p>
          <p className="mt-1 text-sm leading-relaxed text-amber-900/90">
            You are viewing real submitted applications from the scholarship portal. No applicant or
            application data can be modified from Demo Admin.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-slate-500">Current status</span>
          <StatusBadge status={application.status} />
          <StatusBadge status={application.documentStatus} />
          <span className="text-xs text-slate-500">Submitted {formatDate(application.applicationDate)}</span>
        </div>
        <span className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
          Read-only · the Demo Admin cannot approve, reject or request documents
        </span>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-5" accentClass="">
          <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-gov-blue"><AdminIcon className="h-5 w-5" name="user" /></span><div><h2 className="text-lg font-bold text-gov-blue-dark">Personal information</h2><p className="text-xs text-slate-500">Identity and contact details from the applicant profile</p></div></div>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <DetailItem label="Applicant record ID" value={application.applicantId} />
            <DetailItem label="Full name" value={application.applicantName} />
            <DetailItem label="Date of birth" value={application.dateOfBirth} />
            <DetailItem label="Gender" value={application.gender} />
            <DetailItem label="Mobile number" value={application.mobile} />
            <DetailItem label="Email" value={application.email} />
          </dl>
        </Card>

        <Card className="p-5" accentClass="">
          <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-purple-50 text-purple-700"><AdminIcon className="h-5 w-5" name="applications" /></span><div><h2 className="text-lg font-bold text-gov-blue-dark">Academic information</h2><p className="text-xs text-slate-500">Institution and study record</p></div></div>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <DetailItem label="College / Institute" value={application.college} />
            <DetailItem label="Course" value={application.course} />
            <DetailItem label="Academic year" value={application.academicYear} />
          </dl>
        </Card>
      </div>

      <Card className="p-5" accentClass="">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-50 text-amber-700"><AdminIcon className="h-5 w-5" name="scholarships" /></span><div><h2 className="text-lg font-bold text-gov-blue-dark">Scheme information</h2><p className="text-xs text-slate-500">Scheme this application was submitted against</p></div></div>
          <StatusBadge status={application.status} />
        </div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DetailItem label="Scheme name" value={application.schemeName} />
          <DetailItem label="Scheme code" value={application.schemeCode ?? ''} />
          <DetailItem label="Scheme status" value={application.schemeStatus ?? ''} />
          <DetailItem label="Renewal available" value={application.renewalAvailable === null || application.renewalAvailable === undefined ? '' : application.renewalAvailable ? 'Yes, this scheme allows renewal' : 'No, renewal is not offered for this scheme'} />
        </dl>
      </Card>

      <Card className="p-5" accentClass="">
        <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-600"><AdminIcon className="h-5 w-5" name="file" /></span><div><h2 className="text-lg font-bold text-gov-blue-dark">Application information</h2><p className="text-xs text-slate-500">Reference, status and dates as stored</p></div></div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DetailItem label="Application reference" value={application.id} />
          <DetailItem label="Application status" value={application.status} />
          <DetailItem label="Application date" value={formatDate(application.applicationDate)} />
          <DetailItem label="Draft last saved" value={application.draftSavedAt ? formatDate(application.draftSavedAt) : ''} />
        </dl>
      </Card>

      <Card className="p-5" accentClass="">
        <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-teal-50 text-teal-700"><AdminIcon className="h-5 w-5" name="applications" /></span><div><h2 className="text-lg font-bold text-gov-blue-dark">Additional information</h2><p className="text-xs text-slate-500">Answers the applicant gave to this scheme's questions</p></div></div>
        {answerEntries.length === 0 ? (
          <p className="mt-5 rounded-md border border-slate-200 bg-slate-50 px-4 py-5 text-center text-xs text-slate-500">
            This application has no scheme answers recorded.
          </p>
        ) : (
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            {answerEntries.map(([key, value]) => (
              <DetailItem key={key} label={key.replace(/_/g, ' ')} value={String(value)} />
            ))}
          </dl>
        )}
      </Card>

      {/*
        Required documents come from a separate view driven by `scheme_documents`,
        so a requirement the applicant never satisfied is still a visible row here.
        Reading it off the attachment list instead would make a missing mandatory
        document indistinguishable from one that was never asked for.
      */}
      <Card className="p-5" accentClass="">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">Scheme checklist</p><h2 className="mt-1 text-lg font-bold text-gov-blue-dark">Required documents</h2><p className="mt-1 text-xs text-slate-500">What this scheme asked for, and whether it arrived.</p></div>
          <span className="text-xs font-semibold text-slate-500">
            {requirements.filter((requirement) => requirement.appliesToThisApplicant && requirement.attached).length} of {requirements.filter((requirement) => requirement.appliesToThisApplicant).length} supplied
          </span>
        </div>

        {requirementsError ? (
          <p className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
            The requirement checklist could not be read: {requirementsError} The application, scheme and uploaded
            documents above are unaffected.
          </p>
        ) : requirements.length === 0 ? (
          <p className="mt-5 rounded-md border border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
            This scheme has no document requirements configured.
          </p>
        ) : (
          <ul className="mt-5 divide-y divide-slate-100 rounded-md border border-slate-200">
            {requirements.map((requirement) => {
              const applies = requirement.appliesToThisApplicant;
              const tone = !applies
                ? 'border-slate-200 bg-slate-50 text-slate-500'
                : requirement.attached
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : requirement.mandatory
                    ? 'border-red-200 bg-red-50 text-red-800'
                    : 'border-amber-200 bg-amber-50 text-amber-800';

              return (
                <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" key={requirement.schemeDocumentId}>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{requirement.name}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {requirement.mandatory ? 'Mandatory' : 'Optional'}
                      {requirement.requiredFromCourseYear ? ` · required from year ${requirement.requiredFromCourseYear}` : ''}
                      {requirement.attached && requirement.fileName ? ` · ${requirement.fileName}` : ''}
                      {requirement.description ? ` · ${requirement.description}` : ''}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded border px-2 py-1 text-[11px] font-bold ${tone}`}>
                    {!applies
                      ? 'Not required at this course year'
                      : requirement.attached
                        ? 'Uploaded'
                        : requirement.mandatory
                          ? 'Missing'
                          : 'Not supplied'}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="p-5" accentClass="">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">Evidence pack</p><h2 className="mt-1 text-lg font-bold text-gov-blue-dark">Uploaded documents</h2><p className="mt-1 text-xs text-slate-500">The files this applicant actually attached to this application.</p></div>
          <span className="text-xs font-semibold text-slate-500">{application.documents.length} attached · {verifiedCount} verified</span>
        </div>

        {application.documents.length === 0 ? (
          <p className="mt-5 rounded-md border border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
            No document rows are linked to this application.
          </p>
        ) : (
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {application.documents.map((document) => (
              <div className="rounded-md border border-slate-200 p-4" key={document.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-600"><AdminIcon className="h-4 w-4" name="file" /></span><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{document.name}</p><p className="mt-1 truncate text-[11px] text-slate-500">{document.fileName}</p><p className="mt-1 text-[11px] text-slate-400">Uploaded {document.uploadedAt ? formatDate(document.uploadedAt) : 'date not recorded'}{document.required ? ' · mandatory' : ''}</p></div></div>
                  <StatusBadge status={document.status} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button disabled={previewingId === document.id} size="sm" variant="outline" onClick={() => { void handleViewDocument(document.id, document.storagePath); }}><AdminIcon className="h-4 w-4" name="eye" /> {previewingId === document.id ? 'Opening…' : 'View'}</Button>
                  {previewUrl && previewingId === document.id ? (
                    <Button size="sm" to={previewUrl} variant="outline"><AdminIcon className="h-4 w-4" name="download" /> Open file</Button>
                  ) : null}
                </div>
                {previewError && previewingId === document.id ? <p className="mt-3 rounded bg-red-50 px-3 py-2 text-xs text-red-700">{previewError}</p> : null}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5" accentClass="">
        <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-50 text-emerald-700"><AdminIcon className="h-5 w-5" name="check" /></span><div><h2 className="text-lg font-bold text-gov-blue-dark">Submission information</h2><p className="text-xs text-slate-500">What the database recorded at the moment of submission</p></div></div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DetailItem label="Submitted at" value={application.submittedAt ? formatDateTime(application.submittedAt) : ''} />
          <DetailItem label="Declaration accepted" value={application.declarationAccepted === null || application.declarationAccepted === undefined ? '' : application.declarationAccepted ? 'Yes, the applicant ticked the declaration' : 'No'} />
          <DetailItem label="Documents attached" value={`${application.documents.length}`} />
          <DetailItem label="Documents verified" value={`${verifiedCount}`} />
        </dl>
        {application.eligibilityResult ? (
          <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-500">Eligibility result recorded at submission</p>
            <pre className="mt-2 overflow-x-auto text-xs text-slate-700">{JSON.stringify(application.eligibilityResult, null, 2)}</pre>
          </div>
        ) : null}
      </Card>

      <div className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-relaxed text-blue-900">
        Document links are short-lived signed URLs from the applicant's own private storage bucket. Access is
        read-only and expires; nothing here can approve, reject, or change what the applicant submitted.
        Fields the Demo Admin view deliberately withholds — the Aadhaar fingerprint, the masked Aadhaar
        string, bank details and the applicant's auth user id — are not sent to this browser at all.
      </div>
    </div>
  );
}
