import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ROUTES } from '../../lib/constants';
import { fetchSubmittedApplications } from '../../services/demoAdminData';
import type { AdminApplication } from '../../types/admin';
import { AdminIcon } from '../../components/admin/AdminIcon';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { ApplicationTable } from '../../components/admin/ApplicationTable';
import type { ApplicationSortKey } from '../../components/admin/ApplicationTable';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

type DateFilter = 'all' | '30' | '90';

const pageSize = 6;

const DAY_MS = 24 * 60 * 60 * 1000;

function toDateFilter(value: string | null): DateFilter {
  return value === '30' || value === '90' ? value : 'all';
}

export function Applications() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [scheme, setScheme] = useState('All schemes');
  const [dateFilter, setDateFilter] = useState<DateFilter>(toDateFilter(searchParams.get('within')));
  const [sortKey, setSortKey] = useState<ApplicationSortKey>('applicationDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    const result = await fetchSubmittedApplications();

    if (result.ok) {
      setApplications(result.rows);
      setLoading(false);
      return;
    }

    // No mock fallback. If the database is unreachable or the read policy is not
    // in place, the panel says so instead of inventing applications.
    setApplications([]);
    setError(result.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const schemes = useMemo(
    () => ['All schemes', ...Array.from(new Set(applications.map((application) => application.schemeName)))],
    [applications],
  );

  const filteredApplications = useMemo(() => {
    const query = search.trim().toLowerCase();
    const cutoff = dateFilter === 'all' ? null : Date.now() - Number(dateFilter) * DAY_MS;

    const result = applications.filter((application) => {
      const matchesSearch = !query
        || [application.id, application.applicantName, application.applicantId, application.email, application.schemeName, application.college]
          .some((value) => value.toLowerCase().includes(query));
      const matchesScheme = scheme === 'All schemes' || application.schemeName === scheme;
      // `applicationDate` is a bare YYYY-MM-DD, so compare on that rather than
      // on a local-midnight Date that the timezone can shift.
      const matchesDate = !cutoff || new Date(`${application.applicationDate}T00:00:00Z`).getTime() >= cutoff;
      return matchesSearch && matchesScheme && matchesDate;
    });

    return result.sort((left, right) => {
      const leftValue = sortKey === 'status' ? left.status : sortKey === 'applicationDate' ? left.applicationDate : left.applicantName;
      const rightValue = sortKey === 'status' ? right.status : sortKey === 'applicationDate' ? right.applicationDate : right.applicantName;
      const comparison = leftValue.localeCompare(rightValue);
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [applications, dateFilter, scheme, search, sortDirection, sortKey]);

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

  function setWithinFilter(next: DateFilter) {
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        if (next === 'all') {
          params.delete('within');
        } else {
          params.set('within', next);
        }
        return params;
      },
      { replace: true },
    );
    setDateFilter(next);
    setPage(1);
  }

  function clearFilters() {
    setSearch('');
    setScheme('All schemes');
    setWithinFilter('all');
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        action={<Button size="md" to={ROUTES.admin.documentVerification} variant="outline"><AdminIcon className="h-4 w-4" name="documents" /> Verification queue</Button>}
        description="Real applications that applicants have submitted, read from the portal database. The Demo Admin cannot approve, reject or edit anything."
        eyebrow="Application management"
        title="Applications"
      />

      {error ? (
        <div aria-live="assertive" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="font-semibold">Could not load submitted applications.</p>
          <p className="mt-1 text-xs leading-relaxed">{error}</p>
          <Button className="mt-3" size="sm" variant="outline" onClick={() => { void load(); }}>Try again</Button>
        </div>
      ) : null}

      <Card className="p-4 sm:p-5" accentClass="">
        <div className="grid gap-3 lg:grid-cols-[minmax(240px,1.5fr)_repeat(2,minmax(140px,1fr))]">
          <div className="relative">
            <label className="sr-only" htmlFor="application-search">Search applications</label>
            <AdminIcon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" name="search" />
            <input className="min-h-10 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="application-search" placeholder="Search reference, applicant, institute…" type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
          </div>
          <div>
            <label className="sr-only" htmlFor="application-scheme">Filter by scholarship scheme</label>
            <select className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="application-scheme" value={scheme} onChange={(event) => { setScheme(event.target.value); setPage(1); }}>
              {schemes.map((option) => <option key={option}>{option}</option>)}
            </select>
          </div>
          <div>
            <label className="sr-only" htmlFor="application-date">Filter by submission date</label>
            <select className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-700 outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="application-date" value={dateFilter} onChange={(event) => setWithinFilter(event.target.value as DateFilter)}>
              <option value="all">All dates</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <span>
            {loading
              ? 'Loading submitted applications…'
              : <>Showing <strong className="text-slate-700">{filteredApplications.length}</strong> submitted application{filteredApplications.length === 1 ? '' : 's'}</>}
          </span>
          <button className="font-semibold text-gov-blue hover:text-gov-saffron-dark" type="button" onClick={clearFilters}>Clear all filters</button>
        </div>
      </Card>

      {loading ? (
        <div aria-live="polite" className="rounded-md border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-600">
          <span className="mx-auto mb-3 block h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-gov-blue" />
          Reading submitted applications from the portal database…
        </div>
      ) : null}

      {!loading && !error && applications.length === 0 ? (
        <div className="rounded-md border border-slate-200 bg-white px-4 py-10 text-center">
          <p className="text-sm font-semibold text-slate-800">No submitted applications found.</p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">
            The database has no application in the submitted state. Applications appear here the moment an
            applicant completes the declaration and presses Submit — drafts never appear, and nothing here is mock data.
          </p>
        </div>
      ) : null}

      {!loading && !error && applications.length > 0 && filteredApplications.length === 0 ? (
        <div className="rounded-md border border-slate-200 bg-white px-4 py-10 text-center">
          <p className="text-sm font-semibold text-slate-800">No application matches these filters</p>
          <p className="mt-2 text-xs text-slate-500">{applications.length} submitted application{applications.length === 1 ? '' : 's'} exist, but none match the current search.</p>
          <Button className="mt-3" size="sm" variant="outline" onClick={clearFilters}>Clear all filters</Button>
        </div>
      ) : null}

      {!loading && !error && visibleApplications.length > 0 ? (
        <>
          <ApplicationTable applications={visibleApplications} onSort={handleSort} sortDirection={sortDirection} sortKey={sortKey} />
          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">Page {safePage} of {totalPages} · {pageSize} records per page</p>
            <div className="flex items-center gap-2">
              <Button aria-label="Previous page" disabled={safePage <= 1} size="sm" variant="outline" onClick={() => setPage(Math.max(1, safePage - 1))}><AdminIcon className="h-4 w-4" name="chevron-left" /> Previous</Button>
              <Button aria-label="Next page" disabled={safePage >= totalPages} size="sm" variant="outline" onClick={() => setPage(Math.min(totalPages, safePage + 1))}>Next <AdminIcon className="h-4 w-4" name="chevron-right" /></Button>
            </div>
          </div>
        </>
      ) : null}

      <div className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-relaxed text-blue-900">
        The Demo Admin is read-only. It reads submitted applications through a database policy that grants
        select-only access, so there is no approve, reject or request-documents action to invoke — and no mock
        records standing in when the database is unreachable.
      </div>
    </div>
  );
}
