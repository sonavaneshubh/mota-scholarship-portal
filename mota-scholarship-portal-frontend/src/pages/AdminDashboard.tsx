import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminAuth } from '../context/useAdminAuth';
import { fetchSubmittedApplications } from '../services/demoAdminData';
import { adminApplicationPath, ROUTES } from '../lib/constants';
import type { AdminApplication } from '../types/admin';
import { AdminIcon } from '../components/admin/AdminIcon';
import { ApplicationTable } from '../components/admin/ApplicationTable';
import { AdminPageHeader } from '../components/admin/AdminPageHeader';
import { StatCard } from '../components/admin/StatCard';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-IN').format(value);
}

function formatDate(value: string) {
  if (!value) {
    return 'Not recorded';
  }
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

export function AdminDashboard() {
  const { session } = useAdminAuth();
  const isDemoAdmin = session?.mode === 'demo';
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function load() {
      const result = await fetchSubmittedApplications();

      if (!active) {
        return;
      }

      if (result.ok) {
        setApplications(result.rows);
        setError('');
      } else {
        setApplications([]);
        setError(result.error);
      }

      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const recentApplications = applications.slice(0, 5);
  const documentsReady = applications.filter((application) => application.documentStatus === 'Complete').length;
  const uniqueApplicants = new Set(applications.map((application) => application.applicantId)).size;
  const schemeCount = new Set(applications.map((application) => application.schemeId).filter(Boolean)).size;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        action={<Button size="md" to={ROUTES.admin.applications} variant="outline"><AdminIcon className="h-4 w-4" name="applications" /> All applications</Button>}
        description="Read-only overview of what applicants have actually submitted, plus the prototype screens that are not yet connected."
        eyebrow="Administration workspace"
        title="Dashboard"
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

      {error ? (
        <div aria-live="assertive" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="font-semibold">Could not load live application figures.</p>
          <p className="mt-1 text-xs leading-relaxed">{error}</p>
        </div>
      ) : null}

      {isDemoAdmin && !loading && !error ? (
        <div className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-relaxed text-blue-900">
          Every figure on this dashboard is read live from the portal database through a select-only
          policy. None of it is sample content, and none of it can be edited from here.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard detail="Applications with status = submitted" icon="applications" label="Submitted applications" tone="blue" value={loading ? '—' : formatNumber(applications.length)} />
        <StatCard detail="Distinct applicants who submitted" icon="user" label="Applicants" tone="green" value={loading ? '—' : formatNumber(uniqueApplicants)} />
        <StatCard detail="Schemes these applications target" icon="scholarships" label="Schemes in use" tone="purple" value={loading ? '—' : formatNumber(schemeCount)} />
        <StatCard detail="Submitted with every mandatory document attached" icon="check" label="Document-complete" tone="amber" value={loading ? '—' : formatNumber(documentsReady)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Card className="overflow-hidden" accentClass="">
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div><h2 className="text-lg font-bold text-gov-blue-dark">Latest submitted applications</h2><p className="mt-1 text-xs text-slate-500">Read live from the portal database.</p></div>
            <Button size="sm" to={ROUTES.admin.applications} variant="outline">View all</Button>
          </div>
          {loading ? (
            <div aria-live="polite" className="px-5 py-10 text-center text-sm text-slate-600">Loading submitted applications…</div>
          ) : recentApplications.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm font-semibold text-slate-800">Nothing has been submitted yet</p>
              <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500">
                No application is in the submitted state, so there is no live activity to show. Once an applicant
                completes the declaration and presses Submit, it appears here and on the Applications screen.
              </p>
            </div>
          ) : (
            <ApplicationTable applications={recentApplications} />
          )}
        </Card>

        <div className="space-y-6">
          <Card className="p-5" accentClass="">
            <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-50 text-amber-700"><AdminIcon className="h-5 w-5" name="documents" /></span><div><h2 className="text-lg font-bold text-gov-blue-dark">Submitted by scheme</h2><p className="text-xs text-slate-500">Live counts</p></div></div>
            {loading ? (
              <p className="mt-4 text-xs text-slate-500">Loading…</p>
            ) : schemeCount === 0 ? (
              <p className="mt-4 text-xs text-slate-500">No submitted applications to group yet.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {Array.from(new Set(applications.map((application) => application.schemeName))).map((name) => (
                  <li className="flex items-center justify-between gap-3 text-sm" key={name}>
                    <span className="truncate text-slate-700">{name}</span>
                    <span className="font-bold text-gov-blue">{applications.filter((application) => application.schemeName === name).length}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5" accentClass="">
            <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-gov-blue"><AdminIcon className="h-5 w-5" name="user" /></span><div><h2 className="text-lg font-bold text-gov-blue-dark">Recently submitted</h2><p className="text-xs text-slate-500">Live from the database</p></div></div>
            {loading ? (
              <p className="mt-4 text-xs text-slate-500">Loading…</p>
            ) : recentApplications.length === 0 ? (
              <p className="mt-4 text-xs text-slate-500">No submissions yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {recentApplications.map((application) => (
                  <li key={application.id}>
                    <Link className="text-sm font-semibold text-gov-blue hover:underline" to={adminApplicationPath(application.id)}>{application.applicantName}</Link>
                    <p className="mt-0.5 text-[11px] text-slate-500">{application.schemeName} · {formatDate(application.applicationDate)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
