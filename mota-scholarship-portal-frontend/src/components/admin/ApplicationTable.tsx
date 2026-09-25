import { adminApplicationPath } from '../../lib/constants';
import type { AdminApplication } from '../../types/admin';
import { AdminIcon } from './AdminIcon';
import { StatusBadge } from './StatusBadge';
import { Button } from '../ui/Button';

export type ApplicationTableAction = 'approve' | 'reject' | 'documents';
export type ApplicationSortKey = 'applicantName' | 'applicationDate' | 'status';

interface ApplicationTableProps {
  applications: AdminApplication[];
  onAction?: (action: ApplicationTableAction, application: AdminApplication) => void;
  sortKey?: ApplicationSortKey;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: ApplicationSortKey) => void;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`));
}

function SortButton({ label, sortKey, activeSort, direction, onSort }: {
  label: string;
  sortKey: ApplicationSortKey;
  activeSort?: ApplicationSortKey;
  direction?: 'asc' | 'desc';
  onSort?: (key: ApplicationSortKey) => void;
}) {
  return (
    <button
      className="inline-flex items-center gap-1 text-left font-bold uppercase tracking-wider text-slate-500 hover:text-gov-blue"
      type="button"
      onClick={() => onSort?.(sortKey)}
    >
      {label}
      {activeSort === sortKey ? <span className="text-[10px]">{direction === 'asc' ? '↑' : '↓'}</span> : null}
    </button>
  );
}

export function ApplicationTable({ applications, onAction, sortKey, sortDirection, onSort }: ApplicationTableProps) {
  if (applications.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
          <AdminIcon className="h-6 w-6" name="search" />
        </span>
        <h3 className="mt-4 text-sm font-bold text-slate-800">No applications found</h3>
        <p className="mt-1 text-xs text-slate-500">Try changing the search or filter criteria.</p>
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white md:block">
        <table className="min-w-[1120px] w-full border-collapse text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Application ID</th>
              <th className="px-4 py-3"><SortButton activeSort={sortKey} direction={sortDirection} label="Applicant" onSort={onSort} sortKey="applicantName" /></th>
              <th className="px-4 py-3"><SortButton activeSort={sortKey} direction={sortDirection} label="Applied" onSort={onSort} sortKey="applicationDate" /></th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Scholarship scheme</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Category</th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">College / Institute</th>
              <th className="px-4 py-3"><SortButton activeSort={sortKey} direction={sortDirection} label="Status" onSort={onSort} sortKey="status" /></th>
              <th className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-500">Documents</th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {applications.map((application) => (
              <tr className="align-top transition hover:bg-slate-50" key={application.id}>
                <td className="whitespace-nowrap px-4 py-4 text-xs font-bold text-gov-blue">{application.id}</td>
                <td className="px-4 py-4">
                  <p className="font-semibold text-slate-800">{application.applicantName}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{application.applicantId}</p>
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">{formatDate(application.applicationDate)}</td>
                <td className="max-w-48 px-4 py-4 text-xs font-medium leading-relaxed text-slate-700">{application.schemeName}</td>
                <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-600">{application.category}</td>
                <td className="max-w-52 px-4 py-4 text-xs leading-relaxed text-slate-600">{application.college}</td>
                <td className="px-4 py-4"><StatusBadge status={application.status} /></td>
                <td className="px-4 py-4"><StatusBadge status={application.documentStatus} /></td>
                <td className="px-4 py-4">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button aria-label={`View ${application.id}`} size="sm" to={adminApplicationPath(application.id)} variant="outline">View</Button>
                    {onAction ? (
                      <>
                        {application.status !== 'Approved' && application.status !== 'Rejected' ? (
                          <Button aria-label={`Approve ${application.id}`} size="sm" onClick={() => onAction('approve', application)} variant="success">Approve</Button>
                        ) : null}
                        {application.status !== 'Rejected' ? (
                          <Button aria-label={`Reject ${application.id}`} size="sm" onClick={() => onAction('reject', application)} variant="outline">Reject</Button>
                        ) : null}
                        {application.status !== 'Documents Required' ? (
                          <Button aria-label={`Request documents for ${application.id}`} size="sm" onClick={() => onAction('documents', application)} variant="outline">Request docs</Button>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {applications.map((application) => (
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" key={application.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold text-gov-blue">{application.id}</p>
                <h3 className="mt-1 truncate text-sm font-bold text-slate-800">{application.applicantName}</h3>
                <p className="mt-1 text-xs text-slate-500">{application.category} · {application.college}</p>
              </div>
              <StatusBadge status={application.status} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-slate-100 py-3 text-xs">
              <div><dt className="text-slate-500">Applied</dt><dd className="mt-1 font-semibold text-slate-700">{formatDate(application.applicationDate)}</dd></div>
              <div><dt className="text-slate-500">Documents</dt><dd className="mt-1"><StatusBadge status={application.documentStatus} /></dd></div>
              <div className="col-span-2"><dt className="text-slate-500">Scheme</dt><dd className="mt-1 font-semibold text-slate-700">{application.schemeName}</dd></div>
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" to={adminApplicationPath(application.id)} variant="outline">View details</Button>
              {onAction ? (
                <>
                  {application.status !== 'Approved' && application.status !== 'Rejected' ? <Button size="sm" onClick={() => onAction('approve', application)} variant="success">Approve</Button> : null}
                  {application.status !== 'Rejected' ? <Button size="sm" onClick={() => onAction('reject', application)} variant="outline">Reject</Button> : null}
                  {application.status !== 'Documents Required' ? <Button size="sm" onClick={() => onAction('documents', application)} variant="outline">Request docs</Button> : null}
                </>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
