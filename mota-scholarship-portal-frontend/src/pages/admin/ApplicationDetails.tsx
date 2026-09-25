import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ADMIN_APPLICATIONS } from '../../data/adminMockData';
import { ROUTES } from '../../lib/constants';
import type { AdminApplication, AdminDocument, AdminDocumentStatus } from '../../types/admin';
import { AdminDialog } from '../../components/admin/AdminDialog';
import { AdminIcon } from '../../components/admin/AdminIcon';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-slate-800">{value}</dd>
    </div>
  );
}

type DocumentDialogAction = 'reject' | 'reupload';

export function ApplicationDetails() {
  const { id } = useParams<{ id: string }>();
  const initialApplication = useMemo(() => ADMIN_APPLICATIONS.find((item) => item.id === id), [id]);
  const [application, setApplication] = useState<AdminApplication | null>(initialApplication ?? null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [dialogAction, setDialogAction] = useState<DocumentDialogAction | null>(null);
  const [dialogDocumentId, setDialogDocumentId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setApplication(ADMIN_APPLICATIONS.find((item) => item.id === id) ?? null);
    setSelectedDocumentId(null);
    setDialogAction(null);
    setDialogDocumentId(null);
    setReason('');
    setNotice('');
  }, [id]);

  if (!application) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-gov-blue-dark">Application not found</h1>
        <p className="mt-2 text-sm text-slate-600">The requested application does not exist in the demo dataset.</p>
        <Button className="mt-5" to={ROUTES.admin.applications} variant="outline">Back to applications</Button>
      </div>
    );
  }

  const selectedDocument = application.documents.find((document) => document.id === selectedDocumentId);
  const dialogDocument = application.documents.find((document) => document.id === dialogDocumentId);

  function openDocumentDialog(action: DocumentDialogAction, document: AdminDocument) {
    setDialogAction(action);
    setDialogDocumentId(document.id);
    setReason(document.rejectionReason ?? '');
  }

  function closeDialog() {
    setDialogAction(null);
    setDialogDocumentId(null);
    setReason('');
  }

  function handleDocumentAction(action: 'view' | 'download' | 'verify', document: AdminDocument) {
    if (action === 'view') {
      setSelectedDocumentId(document.id);
      setNotice('Sample document preview opened. Production documents will be served through an authorised secure endpoint.');
      return;
    }

    if (action === 'download') {
      setNotice(`Download request recorded for ${document.fileName}.`);
      return;
    }

    setApplication((current) => {
      if (!current) return current;
      const documents = current.documents.map((item) => item.id === document.id ? { ...item, status: 'Verified' as AdminDocumentStatus, updatedAt: '25 September 2026', rejectionReason: undefined } : item);
      const allVerified = documents.every((item) => item.status === 'Verified');
      return { ...current, documents, documentStatus: allVerified ? 'Complete' : current.documentStatus, lastActivity: '25 September 2026' };
    });
    setNotice(`${document.name} marked as verified.`);
  }

  function confirmDocumentAction() {
    if (!dialogAction || !dialogDocument) {
      return;
    }

    if (dialogAction === 'reject' && !reason.trim()) {
      setNotice('Enter a rejection reason before continuing.');
      return;
    }

    const nextStatus: AdminDocumentStatus = dialogAction === 'reject' ? 'Rejected' : 'Re-upload Requested';
    setApplication((current) => {
      if (!current) return current;
      const documents = current.documents.map((document) => document.id === dialogDocument.id
        ? { ...document, status: nextStatus, updatedAt: '25 September 2026', rejectionReason: reason.trim() || 'Please upload a clear, current copy of this document.' }
        : document);
      return { ...current, documents, documentStatus: 'Documents Required', lastActivity: '25 September 2026' };
    });
    setNotice(dialogAction === 'reject' ? `${dialogDocument.name} rejected and the reason was recorded.` : `Re-upload requested for ${dialogDocument.name}.`);
    closeDialog();
  }

  function approveApplication() {
    setApplication((current) => current ? { ...current, status: 'Approved', documentStatus: 'Complete', documents: current.documents.map((document) => ({ ...document, status: 'Verified' })), lastActivity: '25 September 2026' } : current);
    setNotice('Application approved. The decision is recorded in this demo session.');
  }

  function requestApplicationDocuments() {
    setApplication((current) => {
      if (!current) return current;
      const documents = current.documents.map((document, index) => index === 1
        ? { ...document, status: 'Re-upload Requested' as AdminDocumentStatus, updatedAt: '25 September 2026', rejectionReason: 'Please upload a clear, current copy of this document.' }
        : document);
      return { ...current, status: 'Documents Required', documentStatus: 'Documents Required', documents, lastActivity: '25 September 2026' };
    });
    setNotice('A document re-upload request was recorded for this application.');
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        action={<Button size="md" to={ROUTES.admin.applications} variant="outline"><AdminIcon className="h-4 w-4" name="chevron-left" /> Back to applications</Button>}
        description="Review applicant information, academic records, scholarship details and supporting documents."
        eyebrow={`Application record · ${application.id}`}
        title={application.applicantName}
      />

      {notice ? <div aria-live="polite" className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">{notice}</div> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-slate-500">Current status</span>
          <StatusBadge status={application.status} />
          <StatusBadge status={application.documentStatus} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="success" onClick={approveApplication}><AdminIcon className="h-4 w-4" name="check" /> Approve application</Button>
          <Button size="sm" variant="outline" onClick={requestApplicationDocuments}><AdminIcon className="h-4 w-4" name="documents" /> Request documents</Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-5" accentClass="">
          <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-gov-blue"><AdminIcon className="h-5 w-5" name="user" /></span><div><h2 className="text-lg font-bold text-gov-blue-dark">Personal information</h2><p className="text-xs text-slate-500">Identity and contact details</p></div></div>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <DetailItem label="Applicant ID" value={application.applicantId} />
            <DetailItem label="Full name" value={application.applicantName} />
            <DetailItem label="Date of birth" value={application.dateOfBirth} />
            <DetailItem label="Gender" value={application.gender} />
            <DetailItem label="Category" value={application.category} />
            <DetailItem label="Mobile number" value={application.mobile} />
            <DetailItem label="Email" value={application.email} />
            <DetailItem label="Address" value={application.address} />
          </dl>
        </Card>

        <Card className="p-5" accentClass="">
          <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-purple-50 text-purple-700"><AdminIcon className="h-5 w-5" name="applications" /></span><div><h2 className="text-lg font-bold text-gov-blue-dark">Academic information</h2><p className="text-xs text-slate-500">Institution and study record</p></div></div>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <DetailItem label="College / Institute" value={application.college} />
            <DetailItem label="Course" value={application.course} />
            <DetailItem label="Academic year" value={application.academicYear} />
            <DetailItem label="Enrollment / roll number" value={application.enrollmentNumber} />
            <DetailItem label="Previous academic result" value={application.previousResult} />
          </dl>
        </Card>
      </div>

      <Card className="p-5" accentClass="">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-50 text-amber-700"><AdminIcon className="h-5 w-5" name="scholarships" /></span><div><h2 className="text-lg font-bold text-gov-blue-dark">Scholarship information</h2><p className="text-xs text-slate-500">Application and award summary</p></div></div>
          <StatusBadge status={application.status} />
        </div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DetailItem label="Scheme" value={application.schemeName} />
          <DetailItem label="Application ID" value={application.id} />
          <DetailItem label="Application date" value={application.applicationDate} />
          <DetailItem label="Scholarship amount" value={`₹${new Intl.NumberFormat('en-IN').format(application.amount)}`} />
        </dl>
        {application.rejectionReason ? <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p className="font-bold">Review note</p><p className="mt-1">{application.rejectionReason}</p></div> : null}
      </Card>

      <Card className="p-5" accentClass="">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">Evidence pack</p><h2 className="mt-1 text-lg font-bold text-gov-blue-dark">Documents</h2><p className="mt-1 text-xs text-slate-500">Verify each required document or request a corrected upload.</p></div>
          <span className="text-xs font-semibold text-slate-500">{application.documents.filter((document) => document.status === 'Verified').length}/{application.documents.length} verified</span>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {application.documents.map((document) => (
            <div className="rounded-md border border-slate-200 p-4" key={document.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-slate-100 text-slate-600"><AdminIcon className="h-4 w-4" name="file" /></span><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{document.name}</p><p className="mt-1 truncate text-[11px] text-slate-500">{document.fileName}</p><p className="mt-1 text-[11px] text-slate-400">Updated {document.updatedAt}</p></div></div>
                <StatusBadge status={document.status} />
              </div>
              {document.rejectionReason ? <p className="mt-3 rounded bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">{document.rejectionReason}</p> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => handleDocumentAction('view', document)}><AdminIcon className="h-4 w-4" name="eye" /> View</Button>
                <Button size="sm" variant="outline" onClick={() => handleDocumentAction('download', document)}><AdminIcon className="h-4 w-4" name="download" /> Download</Button>
                {document.status !== 'Verified' ? <Button size="sm" variant="success" onClick={() => handleDocumentAction('verify', document)}><AdminIcon className="h-4 w-4" name="check" /> Verify</Button> : null}
                <Button size="sm" variant="outline" onClick={() => openDocumentDialog('reject', document)}>Reject</Button>
                <Button size="sm" variant="outline" onClick={() => openDocumentDialog('reupload', document)}>Request re-upload</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {selectedDocument ? (
        <Card className="border-blue-200 bg-blue-50/40 p-5" accentClass="">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-gov-blue">Document preview</p><h2 className="mt-1 text-lg font-bold text-gov-blue-dark">{selectedDocument.name}</h2><p className="mt-1 text-xs text-slate-600">{selectedDocument.fileName} · sample file metadata</p></div><Button aria-label="Close document preview" size="sm" variant="outline" onClick={() => setSelectedDocumentId(null)}>Close preview</Button></div>
          <div className="mt-5 flex min-h-48 items-center justify-center rounded-md border border-dashed border-blue-200 bg-white p-6 text-center"><div><AdminIcon className="mx-auto h-10 w-10 text-blue-300" name="file" /><p className="mt-3 text-sm font-semibold text-slate-700">Secure document preview</p><p className="mt-1 max-w-md text-xs leading-relaxed text-slate-500">In production, an authorised document service will stream the file after access logging. This prototype intentionally does not include a real file.</p></div></div>
        </Card>
      ) : null}

      <div className="flex justify-end"><Link className="text-xs font-semibold text-gov-blue hover:text-gov-saffron-dark" to={ROUTES.admin.applications}>Return to application list</Link></div>

      <AdminDialog description={dialogDocument ? `${dialogDocument.name} · ${application.id}` : undefined} onClose={closeDialog} open={Boolean(dialogAction && dialogDocument)} title={dialogAction === 'reject' ? 'Reject document' : 'Request document re-upload'}>
        {dialogAction && dialogDocument ? <div className="space-y-4"><div className="rounded-md bg-slate-50 p-4 text-xs text-slate-600">Provide a clear reason so the applicant knows what to correct. The note will be stored with the document audit event in the production system.</div><div><label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="document-reason">Reason / request note</label><textarea autoFocus className="mt-1.5 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="document-reason" placeholder={dialogAction === 'reject' ? 'Explain why this document cannot be verified…' : 'Explain what updated document is required…'} value={reason} onChange={(event) => setReason(event.target.value)} /></div><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button size="md" variant="outline" onClick={closeDialog}>Cancel</Button><Button size="md" variant={dialogAction === 'reject' ? 'outline' : 'primary'} onClick={confirmDocumentAction}>{dialogAction === 'reject' ? 'Reject document' : 'Request re-upload'}</Button></div></div> : null}
      </AdminDialog>
    </div>
  );
}
