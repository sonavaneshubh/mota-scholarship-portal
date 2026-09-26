import { useMemo, useState } from 'react';
import { useApplicantApplications } from '../hooks/useApplicantRecords';
import { ApplicantPageHeader } from '../components/applicant/ApplicantPageHeader';
import { Badge } from '../components/ui/Badge';
import type { BadgeTone } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { applicantApplicationPath, ROUTES } from '../lib/constants';
import type { ApplicantApplicationStatus } from '../types';

type HistoryStatusFilter = 'all' | ApplicantApplicationStatus;

const STATUS_FILTERS: { value: HistoryStatusFilter; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'under-verification', label: 'Under verification' },
  { value: 'deficiency-raised', label: 'Deficiency raised' },
  { value: 'resubmission-required', label: 'Resubmission required' },
  { value: 'under-scrutiny', label: 'Under scrutiny' },
  { value: 'selected', label: 'Selected' },
  { value: 'not-selected', label: 'Not selected' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

const statusToneMap: Record<ApplicantApplicationStatus, BadgeTone> = {
  draft: 'slate',
  submitted: 'blue',
  'under-verification': 'purple',
  'deficiency-raised': 'amber',
  'resubmission-required': 'amber',
  'under-scrutiny': 'blue',
  selected: 'green',
  'not-selected': 'slate',
  rejected: 'red',
  withdrawn: 'slate',
};

export function ApplicantHistoryPage() {
  const { items, status, error } = useApplicantApplications();
  const [statusFilter, setStatusFilter] = useState<HistoryStatusFilter>('all');
  const [search, setSearch] = useState('');

  const filteredApplications = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((application) => {
      const matchesStatus = statusFilter === 'all' || application.status === statusFilter;
      const matchesSearch =
        !query ||
        `${application.id} ${application.schemeName} ${application.statusLabel}`
          .toLowerCase()
          .includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [items, search, statusFilter]);

  const hasActiveFilters = statusFilter !== 'all' || search.trim().length > 0;

  function clearFilters() {
    setSearch('');
    setStatusFilter('all');
  }

  return (
    <div className="min-w-0 space-y-6 py-1 sm:py-2">
      <ApplicantPageHeader
        action={
          <Button size="md" to={ROUTES.applicant.applications} variant="outline">
            Current applications
          </Button>
        }
        description="A record of every scholarship and fellowship application you have submitted."
        eyebrow="Applicant workspace"
        title="Application History"
      />

      <Card className="min-w-0 p-4 sm:p-5">
        <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_16rem]">
          <label className="min-w-0" htmlFor="history-search">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">
              Search application history
            </span>
            <input
              className="block w-full min-w-0 rounded border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-gov-blue focus:outline-none focus:ring-2 focus:ring-blue-100"
              id="history-search"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Application ID, scheme, or status"
              type="search"
              value={search}
            />
          </label>
          <label className="min-w-0" htmlFor="history-status">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">Application status</span>
            <select
              className="block w-full min-w-0 rounded border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-gov-blue focus:outline-none focus:ring-2 focus:ring-blue-100"
              id="history-status"
              onChange={(event) => setStatusFilter(event.target.value as HistoryStatusFilter)}
              value={statusFilter}
            >
              {STATUS_FILTERS.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <p aria-live="polite" className="text-sm text-slate-600">
            {status === 'ready'
              ? `Showing ${filteredApplications.length} application${filteredApplications.length === 1 ? '' : 's'}`
              : ' '}
          </p>
          {hasActiveFilters ? (
            <button
              className="min-h-11 rounded px-2 text-xs font-semibold text-gov-blue underline underline-offset-2 hover:text-gov-saffron"
              onClick={clearFilters}
              type="button"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </Card>

      {status === 'loading' ? (
        <Card aria-busy="true" className="space-y-2 p-5" role="status">
          {Array.from({ length: 4 }, (_, index) => (
            <div className="h-10 animate-pulse rounded bg-slate-100" key={index} />
          ))}
          <span className="sr-only">Loading application history</span>
        </Card>
      ) : null}

      {status === 'error' ? (
        <Card className="px-5 py-10 text-center">
          <h2 className="text-lg font-bold text-gov-blue-dark">History could not be loaded</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
            {error ?? 'Please try again later.'}
          </p>
        </Card>
      ) : null}

      {status === 'unavailable' ? (
        <Card className="px-5 py-10 text-center">
          <h2 className="text-lg font-bold text-gov-blue-dark">No application history yet</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
            Applications you submit will be listed here with their current status and latest update.
          </p>
        </Card>
      ) : null}

      {status === 'ready' && items.length === 0 ? (
        <Card className="px-5 py-10 text-center">
          <h2 className="text-lg font-bold text-gov-blue-dark">No application history yet</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
            Applications you submit will be listed here with their current status and latest update.
          </p>
          <Button className="mt-5 rounded" size="md" to={ROUTES.applicant.schemes} variant="primary">
            Explore schemes
          </Button>
        </Card>
      ) : null}

      {status === 'ready' && items.length > 0 && filteredApplications.length === 0 ? (
        <Card className="px-5 py-10 text-center">
          <h2 className="text-lg font-bold text-gov-blue-dark">No applications match these filters</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
            Change the search term or status filter to see your other applications.
          </p>
          <Button className="mt-5 rounded" onClick={clearFilters} size="md" variant="outline">
            Clear filters
          </Button>
        </Card>
      ) : null}

      {status === 'ready' && filteredApplications.length > 0 ? (
        <>
          <section aria-labelledby="history-table-heading" className="hidden min-w-0 lg:block">
            <h2 className="sr-only" id="history-table-heading">
              Filtered application history
            </h2>
            <Card className="min-w-0 overflow-hidden">
              <div className="min-w-0 overflow-x-auto">
                <table className="w-full table-fixed border-collapse text-left">
                  <caption className="sr-only">
                    Application history with status, documents, dates, and details links
                  </caption>
                  <colgroup>
                    <col className="w-[14%]" />
                    <col className="w-[22%]" />
                    <col className="w-[11%]" />
                    <col className="w-[22%]" />
                    <col className="w-[11%]" />
                    <col className="w-[8%]" />
                    <col className="w-[12%]" />
                  </colgroup>
                  <thead className="bg-gov-slate-bg text-xs text-slate-600">
                    <tr>
                      <th className="px-3 py-3 font-bold" scope="col">
                        Application ID
                      </th>
                      <th className="px-3 py-3 font-bold" scope="col">
                        Scheme
                      </th>
                      <th className="px-3 py-3 font-bold" scope="col">
                        Submitted
                      </th>
                      <th className="px-3 py-3 font-bold" scope="col">
                        Latest update
                      </th>
                      <th className="px-3 py-3 font-bold" scope="col">
                        Status
                      </th>
                      <th className="px-3 py-3 font-bold" scope="col">
                        Documents
                      </th>
                      <th className="px-3 py-3 font-bold" scope="col">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredApplications.map((application) => (
                      <tr className="align-top text-sm" key={application.id}>
                        <td className="min-w-0 break-words px-3 py-4 font-mono text-xs font-semibold text-slate-800">
                          {application.id}
                        </td>
                        <td className="min-w-0 break-words px-3 py-4 font-semibold text-gov-blue-dark">
                          {application.schemeName}
                        </td>
                        <td className="min-w-0 break-words px-3 py-4 text-xs text-slate-600">
                          {application.submittedAt}
                        </td>
                        <td className="min-w-0 break-words px-3 py-4 text-xs leading-5 text-slate-600">
                          <span className="font-semibold text-slate-800">{application.updatedAt}</span>
                          <span className="mt-1 block">{application.nextStep}</span>
                        </td>
                        <td className="min-w-0 px-3 py-4">
                          <Badge tone={statusToneMap[application.status]}>
                            {application.statusLabel}
                          </Badge>
                        </td>
                        <td className="min-w-0 break-words px-3 py-4 text-xs font-semibold text-slate-700">
                          {application.documentsTotal > 0
                            ? `${application.documentsComplete} of ${application.documentsTotal} complete`
                            : '—'}
                        </td>
                        <td className="min-w-0 px-3 py-4">
                          {application.id ? (
                            <Button
                              className="max-w-full rounded text-left"
                              size="sm"
                              to={applicantApplicationPath(application.id)}
                              variant="outline"
                            >
                              View details
                            </Button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </section>

          <section aria-labelledby="history-cards-heading" className="min-w-0 space-y-4 lg:hidden">
            <h2 className="sr-only" id="history-cards-heading">
              Filtered application history
            </h2>
            {filteredApplications.map((application) => (
              <Card className="min-w-0 p-4" key={application.id}>
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-all font-mono text-xs font-semibold text-slate-600">
                      {application.id}
                    </p>
                    <h3 className="mt-1 break-words text-base font-bold text-gov-blue-dark">
                      {application.schemeName}
                    </h3>
                  </div>
                  <Badge tone={statusToneMap[application.status]}>{application.statusLabel}</Badge>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-4 border-y border-slate-200 py-4 text-xs">
                  <div className="min-w-0">
                    <dt className="font-semibold text-slate-500">Submitted</dt>
                    <dd className="mt-1 break-words font-semibold text-slate-800">
                      {application.submittedAt}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="font-semibold text-slate-500">Latest update</dt>
                    <dd className="mt-1 break-words font-semibold text-slate-800">
                      {application.updatedAt}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="font-semibold text-slate-500">Documents</dt>
                    <dd className="mt-1 font-semibold text-slate-800">
                      {application.documentsTotal > 0
                        ? `${application.documentsComplete} of ${application.documentsTotal} complete`
                        : '—'}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="font-semibold text-slate-500">Status</dt>
                    <dd className="mt-1 font-semibold text-slate-800">{application.statusLabel}</dd>
                  </div>
                </dl>
                <p className="mt-3 break-words text-sm leading-relaxed text-slate-600">
                  {application.nextStep}
                </p>
                {application.id ? (
                  <Button
                    className="mt-4 w-full rounded"
                    size="md"
                    to={applicantApplicationPath(application.id)}
                    variant="outline"
                  >
                    View details
                  </Button>
                ) : null}
              </Card>
            ))}
          </section>
        </>
      ) : null}
    </div>
  );
}
