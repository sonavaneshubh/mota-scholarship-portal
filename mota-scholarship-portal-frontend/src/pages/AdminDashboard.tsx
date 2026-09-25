import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ADMIN_ACTIVITIES, ADMIN_APPLICATIONS, ADMIN_NOTIFICATIONS, DASHBOARD_STATS, SCHOLARSHIP_DISTRIBUTION_DATA } from '../data/adminMockData';
import { adminApplicationPath, ROUTES } from '../lib/constants';
import { AdminIcon } from '../components/admin/AdminIcon';
import { ApplicationTable } from '../components/admin/ApplicationTable';
import { AdminPageHeader } from '../components/admin/AdminPageHeader';
import { StatCard } from '../components/admin/StatCard';
import { StatusBadge } from '../components/admin/StatusBadge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-IN').format(value);
}

function formatCurrency(value: number) {
  if (value >= 10000000) {
    return `₹${(value / 10000000).toFixed(2)} crore`;
  }

  return `₹${formatNumber(value)}`;
}

export function AdminDashboard() {
  const recentApplications = useMemo(() => ADMIN_APPLICATIONS.slice(0, 5), []);
  const pendingApplications = useMemo(
    () => ADMIN_APPLICATIONS.filter((application) => application.documentStatus === 'Pending Verification').slice(0, 4),
    [],
  );
  const unreadNotifications = ADMIN_NOTIFICATIONS.filter((notification) => !notification.read);

  const statusSummary = [
    { label: 'Approved', value: DASHBOARD_STATS.approvedApplications, total: DASHBOARD_STATS.totalApplications, className: 'bg-emerald-600' },
    { label: 'Pending / under review', value: DASHBOARD_STATS.pendingApplications, total: DASHBOARD_STATS.totalApplications, className: 'bg-blue-600' },
    { label: 'Rejected', value: DASHBOARD_STATS.rejectedApplications, total: DASHBOARD_STATS.totalApplications, className: 'bg-red-500' },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        action={<Button size="md" to={ROUTES.admin.applications} variant="primary"><AdminIcon className="h-4 w-4" name="applications" /> Review applications</Button>}
        description="Monitor application volume, document verification, scheme performance and operational activity across the scholarship lifecycle."
        eyebrow="Operations dashboard"
        title="Good morning, portal administrator"
      />

      <section aria-label="Dashboard statistics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard detail="registered applicants" icon="users" label="Total Applicants" tone="blue" value={formatNumber(DASHBOARD_STATS.totalApplicants)} />
        <StatCard detail="all time submissions" icon="applications" label="Total Applications" tone="purple" value={formatNumber(DASHBOARD_STATS.totalApplications)} />
        <StatCard detail="awaiting a decision" icon="clock" label="Pending Applications" tone="amber" value={formatNumber(DASHBOARD_STATS.pendingApplications)} />
        <StatCard detail="approved applications" icon="check" label="Approved Applications" tone="green" value={formatNumber(DASHBOARD_STATS.approvedApplications)} />
        <StatCard detail="closed applications" icon="warning" label="Rejected Applications" tone="slate" value={formatNumber(DASHBOARD_STATS.rejectedApplications)} />
        <StatCard detail="document sets in queue" icon="documents" label="Documents Pending" tone="amber" value={formatNumber(DASHBOARD_STATS.documentsPendingVerification)} />
        <StatCard detail="scholarships processed" icon="scholarships" label="Scholarships Disbursed" tone="green" value={formatNumber(DASHBOARD_STATS.scholarshipsDisbursed)} />
        <StatCard detail="across all schemes" icon="bank" label="Total Amount Disbursed" tone="blue" value={formatCurrency(DASHBOARD_STATS.totalAmountDisbursed)} />
      </section>

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.65fr)_minmax(340px,0.85fr)]">
        <section className="space-y-3" aria-labelledby="recent-applications-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">Application queue</p>
              <h2 className="mt-1 text-lg font-bold text-gov-blue-dark" id="recent-applications-heading">Recent applications</h2>
            </div>
            <Button size="sm" to={ROUTES.admin.applications} variant="outline">View all applications <AdminIcon className="h-4 w-4" name="arrow-right" /></Button>
          </div>
          <ApplicationTable applications={recentApplications} />
        </section>

        <section className="space-y-3" aria-labelledby="verification-queue-heading">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">Action required</p>
              <h2 className="mt-1 text-lg font-bold text-gov-blue-dark" id="verification-queue-heading">Pending verifications</h2>
            </div>
            <Button size="sm" to={ROUTES.admin.documentVerification} variant="outline">Open queue</Button>
          </div>
          <Card className="divide-y divide-slate-100" accentClass="">
            {pendingApplications.length > 0 ? pendingApplications.map((application) => (
              <div className="flex items-center gap-3 p-4" key={application.id}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700"><AdminIcon className="h-4 w-4" name="documents" /></span>
                <div className="min-w-0 flex-1">
                  <Link className="block truncate text-sm font-bold text-slate-800 hover:text-gov-blue" to={adminApplicationPath(application.id)}>{application.applicantName}</Link>
                  <p className="mt-1 truncate text-xs text-slate-500">{application.id} · {application.schemeName}</p>
                </div>
                <StatusBadge status="Under Verification" />
              </div>
            )) : <p className="p-5 text-sm text-slate-500">No documents are waiting for verification.</p>}
          </Card>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section aria-labelledby="status-summary-heading">
          <Card className="h-full p-5" accentClass="">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">Portfolio view</p>
                <h2 className="mt-1 text-lg font-bold text-gov-blue-dark" id="status-summary-heading">Application status</h2>
              </div>
              <AdminIcon className="h-5 w-5 text-slate-400" name="reports" />
            </div>
            <div className="mt-5 space-y-4">
              {statusSummary.map((item) => {
                const percentage = Math.round((item.value / item.total) * 100);
                return (
                  <div key={item.label}>
                    <div className="flex items-center justify-between gap-3 text-xs"><span className="font-semibold text-slate-600">{item.label}</span><span className="font-bold text-slate-800">{formatNumber(item.value)} <span className="font-normal text-slate-400">({percentage}%)</span></span></div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${item.className}`} style={{ width: `${percentage}%` }} /></div>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500">Decision totals are demo aggregates and will be replaced by API reporting.</div>
          </Card>
        </section>

        <section aria-labelledby="scholarship-summary-heading">
          <Card className="h-full p-5" accentClass="">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">Scheme portfolio</p>
                <h2 className="mt-1 text-lg font-bold text-gov-blue-dark" id="scholarship-summary-heading">Scholarship summary</h2>
              </div>
              <AdminIcon className="h-5 w-5 text-slate-400" name="scholarships" />
            </div>
            <div className="mt-4 space-y-3">
              {SCHOLARSHIP_DISTRIBUTION_DATA.map((item) => (
                <div className="rounded-md bg-slate-50 p-3" key={item.name}>
                  <div className="flex items-center justify-between gap-2 text-xs"><span className="font-semibold text-slate-700">{item.name}</span><span className="font-bold text-gov-blue">{item.percentage}%</span></div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500"><span>{formatNumber(item.applicants)} applicants</span><span>{formatCurrency(item.amount)}</span></div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <section aria-labelledby="activity-heading">
          <Card className="h-full p-5" accentClass="">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">Audit trail</p>
                <h2 className="mt-1 text-lg font-bold text-gov-blue-dark" id="activity-heading">Recent activities</h2>
              </div>
              <AdminIcon className="h-5 w-5 text-slate-400" name="clock" />
            </div>
            <div className="mt-4 space-y-4">
              {ADMIN_ACTIVITIES.slice(0, 4).map((activity) => (
                <div className="flex gap-3" key={activity.id}>
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${activity.tone === 'green' ? 'bg-emerald-500' : activity.tone === 'amber' ? 'bg-amber-500' : activity.tone === 'blue' ? 'bg-blue-500' : 'bg-slate-400'}`} />
                  <div className="min-w-0"><p className="text-xs leading-relaxed text-slate-700"><span className="font-bold">{activity.actor}</span> {activity.action} <span className="font-semibold text-gov-blue">{activity.target}</span></p><p className="mt-1 text-[11px] text-slate-400">{activity.timestamp}</p></div>
                </div>
              ))}
            </div>
          </Card>
        </section>
      </div>

      <section aria-labelledby="dashboard-notifications-heading">
        <Card className="p-5" accentClass="">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">Attention centre</p>
              <h2 className="mt-1 text-lg font-bold text-gov-blue-dark" id="dashboard-notifications-heading">Latest notifications</h2>
            </div>
            <Button size="sm" to={ROUTES.admin.notifications} variant="outline">Manage notifications</Button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {unreadNotifications.map((notification) => (
              <Link className="rounded-md border border-slate-100 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50" key={notification.id} to={notification.href}>
                <div className="flex items-start gap-3"><span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-gov-saffron" /><div><p className="text-sm font-bold text-slate-800">{notification.title}</p><p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600">{notification.message}</p><p className="mt-2 text-[11px] text-slate-400">{notification.timestamp}</p></div></div>
              </Link>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
