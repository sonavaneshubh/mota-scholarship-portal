import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ADMIN_APPLICATIONS } from '../../data/adminMockData';
import { ROUTES } from '../../lib/constants';
import type { AdminApplication, AdminApplicationStatus } from '../../types/admin';
import { AdminDialog } from '../../components/admin/AdminDialog';
import { AdminIcon } from '../../components/admin/AdminIcon';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { ApplicationTable } from '../../components/admin/ApplicationTable';
import type { ApplicationSortKey, ApplicationTableAction } from '../../components/admin/ApplicationTable';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

type StatusFilter = 'All statuses' | AdminApplicationStatus;
type DateFilter = 'all' | '30' | '90';
type PendingAction = {
  action: ApplicationTableAction;
  application: AdminApplication;
};

const pageSize = 6;
const statusOptions: StatusFilter[] = ['All statuses', 'Pending', 'Under Review', 'Approved', 'Rejected', 'Documents Required'];

function toStatusFilter(value: string | null): StatusFilter {
  const match = statusOptions.find((option) => option === value);
  return match ?? 'All statuses';
}

export function Applications() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [applications, setApplications] = useState<AdminApplication[]>(ADMIN_APPLICATIONS);
  const [search, setSearch] = useState('');
  const status = toStatusFilter(searchParams.get('status'));
  const [category, setCategory] = useState('All categories');
  const [scheme, setScheme] = useState('All schemes');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [sortKey, setSortKey] = useState<ApplicationSortKey>('applicationDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [notice, setNotice] = useState('');

  const categories = useMemo(() => ['All categories', ...Array.from(new Set(ADMIN_APPLICATIONS.map((application) => application.category)))], []);
  const schemes = useMemo(() => ['All schemes', ...Array.from(new Set(ADMIN_APPLICATIONS.map((application) => application.schemeName)))], []);

  const filteredApplications = useMemo(() => {
    const query = search.trim().toLowerCase();
    const cutoff = dateFilter === 'all' ? null : new Date('2026-09-25T00:00:00');
    cutoff?.setDate(cutoff.getDate() - Number(dateFilter));

    const result = applications.filter((application) => {
      const matchesSearch = !query || [application.id, application.applicantName, application.applicantId, application.email, application.schemeName, application.college].some((value) => value.toLowerCase().includes(query));
      const matchesStatus = status === 'All statuses' || application.status === status;
      const matchesCategory = category === 'All categories' || application.category === category;
      const matchesScheme = scheme === 'All schemes' || application.schemeName === scheme;
      const matchesDate = !cutoff || new Date(`${application.applicationDate}T00:00:00`) >= cutoff;
      return matchesSearch && matchesStatus && matchesCategory && matchesScheme && matchesDate;
    });

    return result.sort((left, right) => {
      const leftValue = sortKey === 'status' ? left.status : sortKey === 'applicationDate' ? left.applicationDate : left.applicantName;
      const rightValue = sortKey === 'status' ? right.status : sortKey === 'applicationDate' ? right.applicationDate : right.applicantName;
      const comparison = leftValue.localeCompare(rightValue);
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [applications, category, dateFilter, scheme, search, sortDirection, sortKey, status]);

  const totalPages = Math.max(1, Math.ceil(filteredApplications.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const visibleApplications = filteredApplications.slice((safePage - 1) * pageSize, safePage * pageSize);

  function handleSort(key: ApplicationSortKey) {
    if (sortKey === key) {
      setSortDirection((current) => current === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortKey(key);
    setSortDirection('asc');
  }

  function setStatusFilter(next: StatusFilter) {
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        if (next === 'All statuses') {
          params.delete('status');
        } else {
          params.set('status', next);
        }
        return params;
      },
      { replace: true },
    );
    setPage(1);
  }

  function clearFilters() {
    setSearch('');
    setStatusFilter('All statuses');
    setCategory('All categories');
    setScheme('All schemes');
    setDateFilter('all');
    setPage(1);
  }

  function handleAction(action: ApplicationTableAction, application: AdminApplication) {
    setRejectionReason(application.rejectionReason ?? '');
    setPendingAction({ action, application });
  }

  function confirmAction() {
    if (!pendingAction) {
      return;
    }

    const { action, application } = pendingAction;
    if (action === 'reject' && !rejectionReason.trim()) {
      setNotice('Enter a rejection reason before confirming.');
      return;
    }

    setApplications((current) => current.map((item) => {
      if (item.id !== application.id) {
        return item;
      }

      if (action === 'approve') {
        return {
          ...item,
          status: 'Approved',
          documentStatus: 'Complete',
          rejectionReason: undefined,
          documents: item.documents.map((document) => ({ ...document, status: 'Verified' })),
          lastActivity: '25 September 2026',
        };
      }

      if (action === 'reject') {
        return {
          ...item,
          status: 'Rejected',
          rejectionReason: rejectionReason.trim(),
          lastActivity: '25 September 2026',
        };
      }

      return {
        ...item,
        status: 'Documents Required',
        documentStatus: 'Documents Required',
        documents: item.documents.map((document, index) => index === 1
          ? { ...document, status: 'Re-upload Requested', updatedAt: '25 September 2026', rejectionReason: rejectionReason.trim() || 'Please upload a clear, current copy of this document.' }
          : document),
        lastActivity: '25 September 2026',
      };
    }));

    const actionLabel = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'sent for document re-upload';
    setNotice(`${application.id} has been ${actionLabel}.`);
    setPendingAction(null);
    setRejectionReason('');
  }

  const dialogTitle = pendingAction?.action === 'approve'
    ? 'Approve application'
    : pendingAction?.action === 'reject'
      ? 'Reject application'
      : 'Request documents';
  const dialogDescription = pendingAction
    ? `Review the action for ${pendingAction.application.id} before continuing.`
    : undefined;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        action={<Button size="md" to={ROUTES.admin.documentVerification} variant="outline"><AdminIcon className="h-4 w-4" name="documents" /> Verification queue</Button>}
        description="Search, filter and action submitted scholarship applications. All records shown here are demonstration data."
        eyebrow="Application management"
        title="Applications"
      />

      {notice ? <div aria-live="polite" className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</div> : null}

      <Card className="p-4 sm:p-5" accentClass="">
        <div className="grid gap-3 lg:grid-cols-[minmax(240px,1.5fr)_repeat(4,minmax(140px,1fr))]">
          <div className="relative">
            <label className="sr-only" htmlFor="application-search">Search applications</label>
            <AdminIcon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" name="search" />
            <input className="min-h-10 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="application-search" placeholder="Search ID, applicant, college…" type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
          </div>
          <div>
            <label className="sr-only" htmlFor="application-status">Filter by status</label>
            <select className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="application-status" value={status} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
              {statusOptions.map((option) => <option key={option}>{option}</option>)}
            </select>
          </div>
          <div>
            <label className="sr-only" htmlFor="application-category">Filter by category</label>
            <select className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="application-category" value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}>
              {categories.map((option) => <option key={option}>{option}</option>)}
            </select>
          </div>
          <div>
            <label className="sr-only" htmlFor="application-scheme">Filter by scholarship scheme</label>
            <select className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="application-scheme" value={scheme} onChange={(event) => { setScheme(event.target.value); setPage(1); }}>
              {schemes.map((option) => <option key={option}>{option}</option>)}
            </select>
          </div>
          <div>
            <label className="sr-only" htmlFor="application-date">Filter by application date</label>
            <select className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="application-date" value={dateFilter} onChange={(event) => { setDateFilter(event.target.value as DateFilter); setPage(1); }}>
              <option value="all">All dates</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <span>Showing <strong className="text-slate-700">{filteredApplications.length}</strong> matching application{filteredApplications.length === 1 ? '' : 's'}</span>
          <button className="font-semibold text-gov-blue hover:text-gov-saffron-dark" type="button" onClick={clearFilters}>Clear all filters</button>
        </div>
      </Card>

      <ApplicationTable applications={visibleApplications} onAction={handleAction} onSort={handleSort} sortDirection={sortDirection} sortKey={sortKey} />

      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">Page {safePage} of {totalPages} · {pageSize} records per page</p>
        <div className="flex items-center gap-2">
          <Button aria-label="Previous page" disabled={safePage <= 1} size="sm" variant="outline" onClick={() => setPage(Math.max(1, safePage - 1))}><AdminIcon className="h-4 w-4" name="chevron-left" /> Previous</Button>
          <Button aria-label="Next page" disabled={safePage >= totalPages} size="sm" variant="outline" onClick={() => setPage(Math.min(totalPages, safePage + 1))}>Next <AdminIcon className="h-4 w-4" name="chevron-right" /></Button>
        </div>
      </div>

      <div className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-relaxed text-blue-900">Demo actions update this browser session only. Production approve, reject, and document-request operations must be authorised and audited by a backend service.</div>

      <AdminDialog description={dialogDescription} onClose={() => setPendingAction(null)} open={Boolean(pendingAction)} title={dialogTitle}>
        {pendingAction ? (
          <div className="space-y-4">
            <div className="rounded-md bg-slate-50 p-4 text-sm">
              <p className="font-bold text-slate-800">{pendingAction.application.applicantName}</p>
              <p className="mt-1 text-xs text-slate-500">{pendingAction.application.id} · {pendingAction.application.schemeName}</p>
            </div>
            {pendingAction.action === 'reject' ? (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="rejection-reason">Rejection reason</label>
                <textarea className="mt-1.5 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="rejection-reason" placeholder="Explain what the applicant must correct…" value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} />
              </div>
            ) : null}
            {pendingAction.action === 'documents' ? (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="document-request-note">Request note <span className="font-normal normal-case text-slate-400">(optional)</span></label>
                <textarea className="mt-1.5 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="document-request-note" placeholder="Add a clear note for the applicant…" value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} />
              </div>
            ) : null}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button size="md" variant="outline" onClick={() => setPendingAction(null)}>Cancel</Button>
              <Button size="md" variant={pendingAction.action === 'reject' ? 'outline' : 'primary'} onClick={confirmAction}>{pendingAction.action === 'approve' ? 'Confirm approval' : pendingAction.action === 'reject' ? 'Confirm rejection' : 'Request documents'}</Button>
            </div>
          </div>
        ) : null}
      </AdminDialog>
    </div>
  );
}
