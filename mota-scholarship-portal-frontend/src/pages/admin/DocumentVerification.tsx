import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ADMIN_APPLICATIONS } from '../../data/adminMockData';
import { adminApplicationPath, ROUTES } from '../../lib/constants';
import type { AdminApplication, AdminDocument, AdminDocumentStatus } from '../../types/admin';
import { AdminDialog } from '../../components/admin/AdminDialog';
import { AdminIcon } from '../../components/admin/AdminIcon';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

type DocumentStatusFilter = 'All statuses' | AdminDocumentStatus;
type DocumentAction = 'reject' | 'reupload';

interface DocumentRow {
  document: AdminDocument;
  application: AdminApplication;
}

const statusOptions: DocumentStatusFilter[] = ['All statuses', 'Uploaded', 'Under Verification', 'Verified', 'Rejected', 'Re-upload Requested'];

export function DocumentVerification() {
  const [applications, setApplications] = useState<AdminApplication[]>(ADMIN_APPLICATIONS);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<DocumentStatusFilter>('All statuses');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogAction, setDialogAction] = useState<DocumentAction | null>(null);
  const [dialogRow, setDialogRow] = useState<DocumentRow | null>(null);
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState('');

  const rows = useMemo<DocumentRow[]>(() => applications.flatMap((application) => application.documents.map((document) => ({ document, application }))), [applications]);
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter(({ document, application }) => {
      const matchesQuery = !query || [document.name, document.fileName, application.applicantName, application.id].some((value) => value.toLowerCase().includes(query));
      return matchesQuery && (status === 'All statuses' || document.status === status);
    });
  }, [rows, search, status]);
  const selectedRow = rows.find((row) => row.document.id === selectedId);
  const pendingCount = rows.filter((row) => row.document.status === 'Under Verification' || row.document.status === 'Uploaded').length;
  const attentionCount = rows.filter((row) => row.document.status === 'Rejected' || row.document.status === 'Re-upload Requested').length;

  function openActionDialog(action: DocumentAction, row: DocumentRow) {
    setDialogAction(action);
    setDialogRow(row);
    setReason(row.document.rejectionReason ?? '');
  }

  function closeDialog() {
    setDialogAction(null);
    setDialogRow(null);
    setReason('');
  }

  function verifyDocument(row: DocumentRow) {
    setApplications((current) => current.map((application) => {
      if (application.id !== row.application.id) return application;
      const documents = application.documents.map((document) => document.id === row.document.id ? { ...document, status: 'Verified' as AdminDocumentStatus, updatedAt: '25 September 2026', rejectionReason: undefined } : document);
      return { ...application, documents, documentStatus: documents.every((document) => document.status === 'Verified') ? 'Complete' : application.documentStatus, lastActivity: '25 September 2026' };
    }));
    setNotice(`${row.document.name} for ${row.application.applicantName} marked as verified.`);
  }

  function confirmAction() {
    if (!dialogAction || !dialogRow) return;
    if (dialogAction === 'reject' && !reason.trim()) {
      setNotice('Enter a rejection reason before continuing.');
      return;
    }

    const nextStatus: AdminDocumentStatus = dialogAction === 'reject' ? 'Rejected' : 'Re-upload Requested';
    setApplications((current) => current.map((application) => {
      if (application.id !== dialogRow.application.id) return application;
      const documents = application.documents.map((document) => document.id === dialogRow.document.id ? { ...document, status: nextStatus, updatedAt: '25 September 2026', rejectionReason: reason.trim() || 'Please upload a clear, current copy of this document.' } : document);
      return { ...application, documents, documentStatus: 'Documents Required', lastActivity: '25 September 2026' };
    }));
    setNotice(dialogAction === 'reject' ? `${dialogRow.document.name} rejected.` : `Re-upload requested for ${dialogRow.document.name}.`);
    closeDialog();
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        action={<Button size="md" to={ROUTES.admin.applications} variant="outline"><AdminIcon className="h-4 w-4" name="applications" /> View applications</Button>}
        description="Move uploaded evidence through uploaded, under verification and verified states. Rejected documents can be returned to the applicant with a reason."
        eyebrow="Verification desk"
        title="Document verification"
      />

      {notice ? <div aria-live="polite" className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">{notice}</div> : null}

      <section className="grid gap-4 sm:grid-cols-3" aria-label="Verification queue summary">
        <Card className="border-l-4 border-l-blue-500 p-4" accentClass=""><p className="text-xs font-semibold text-slate-500">Awaiting review</p><p className="mt-2 text-2xl font-bold text-slate-900">{pendingCount}</p><p className="mt-1 text-xs text-slate-500">Uploaded or under verification</p></Card>
        <Card className="border-l-4 border-l-emerald-600 p-4" accentClass=""><p className="text-xs font-semibold text-slate-500">Verified documents</p><p className="mt-2 text-2xl font-bold text-slate-900">{rows.filter((row) => row.document.status === 'Verified').length}</p><p className="mt-1 text-xs text-slate-500">Ready for decision review</p></Card>
        <Card className="border-l-4 border-l-amber-500 p-4" accentClass=""><p className="text-xs font-semibold text-slate-500">Needs attention</p><p className="mt-2 text-2xl font-bold text-slate-900">{attentionCount}</p><p className="mt-1 text-xs text-slate-500">Rejected or re-upload requested</p></Card>
      </section>

      <Card className="p-4 sm:p-5" accentClass="">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1">
            <label className="sr-only" htmlFor="document-search">Search document queue</label>
            <AdminIcon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" name="search" />
            <input className="min-h-10 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100 lg:max-w-md" id="document-search" placeholder="Search document, applicant or application ID…" type="search" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="document-status-filter">Filter by document status</label>
            <select className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100 sm:w-52" id="document-status-filter" value={status} onChange={(event) => setStatus(event.target.value as DocumentStatusFilter)}>{statusOptions.map((option) => <option key={option}>{option}</option>)}</select>
            <Button size="sm" variant="outline" onClick={() => { setSearch(''); setStatus('All statuses'); }}>Clear</Button>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden" accentClass="">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4"><div><h2 className="text-lg font-bold text-gov-blue-dark">Verification queue</h2><p className="mt-1 text-xs text-slate-500">{filteredRows.length} document record{filteredRows.length === 1 ? '' : 's'} match the current filter.</p></div><AdminIcon className="h-5 w-5 text-slate-400" name="filter" /></div>
        {filteredRows.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No document records match the selected criteria.</div> : <div className="divide-y divide-slate-100">{filteredRows.map(({ document, application }) => <div className="p-4 sm:p-5" key={document.id}><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div className="flex min-w-0 gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600"><AdminIcon className="h-5 w-5" name="file" /></span><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{document.name}</p><p className="mt-1 truncate text-xs text-slate-500"><Link className="font-semibold text-gov-blue hover:underline" to={adminApplicationPath(application.id)}>{application.applicantName}</Link> · {application.id} · {document.fileName}</p><p className="mt-1 text-[11px] text-slate-400">Updated {document.updatedAt}</p></div></div><div className="flex flex-wrap items-center gap-2 xl:justify-end"><StatusBadge status={document.status} />{document.status !== 'Verified' ? <Button size="sm" variant="success" onClick={() => verifyDocument({ document, application })}><AdminIcon className="h-4 w-4" name="check" /> Verify</Button> : null}<Button size="sm" variant="outline" onClick={() => { setSelectedId(document.id); setNotice('Sample document preview selected. No real file is available in this prototype.'); }}><AdminIcon className="h-4 w-4" name="eye" /> View</Button><Button size="sm" variant="outline" onClick={() => openActionDialog('reject', { document, application })}>Reject</Button><Button size="sm" variant="outline" onClick={() => openActionDialog('reupload', { document, application })}>Re-upload</Button></div></div>{document.rejectionReason ? <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">{document.rejectionReason}</p> : null}</div>)}</div>}
      </Card>

      <div className="grid gap-3 sm:grid-cols-3" aria-label="Document workflow">
        {['Uploaded', 'Under Verification', 'Verified'].map((step, index) => <div className="rounded-md border border-slate-200 bg-white p-3" key={step}><div className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-gov-blue">{index + 1}</span><p className="text-xs font-bold text-slate-700">{step}</p></div><p className="mt-2 text-[11px] leading-relaxed text-slate-500">{index === 0 ? 'Applicant has uploaded the file.' : index === 1 ? 'An authorised verifier is checking the evidence.' : 'The document is accepted for application review.'}</p></div>)}
      </div>

      {selectedRow ? <Card className="border-blue-200 bg-blue-50/40 p-5" accentClass=""><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-gov-blue">Selected document</p><h2 className="mt-1 text-lg font-bold text-gov-blue-dark">{selectedRow.document.name}</h2><p className="mt-1 text-xs text-slate-600">{selectedRow.application.applicantName} · {selectedRow.application.id}</p></div><Button size="sm" variant="outline" onClick={() => setSelectedId(null)}>Close preview</Button></div><div className="mt-4 flex min-h-28 items-center justify-center rounded-md border border-dashed border-blue-200 bg-white text-center"><div><AdminIcon className="mx-auto h-8 w-8 text-blue-300" name="file" /><p className="mt-2 text-xs font-semibold text-slate-600">Secure preview placeholder</p></div></div></Card> : null}

      <AdminDialog description={dialogRow ? `${dialogRow.document.name} · ${dialogRow.application.applicantName}` : undefined} onClose={closeDialog} open={Boolean(dialogAction && dialogRow)} title={dialogAction === 'reject' ? 'Reject document' : 'Request document re-upload'}>
        {dialogAction && dialogRow ? <div className="space-y-4"><p className="rounded-md bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">The reason will be visible to the applicant and retained with the document audit event in the production workflow.</p><div><label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="verification-reason">Reason / request note</label><textarea className="mt-1.5 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="verification-reason" placeholder={dialogAction === 'reject' ? 'Explain why the document cannot be verified…' : 'Explain what updated document is required…'} value={reason} onChange={(event) => setReason(event.target.value)} /></div><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button size="md" variant="outline" onClick={closeDialog}>Cancel</Button><Button size="md" variant={dialogAction === 'reject' ? 'outline' : 'primary'} onClick={confirmAction}>{dialogAction === 'reject' ? 'Reject document' : 'Request re-upload'}</Button></div></div> : null}
      </AdminDialog>
    </div>
  );
}
