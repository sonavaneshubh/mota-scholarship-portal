import { useState } from 'react';
import { CATEGORY_APPLICATION_DATA, COLLEGE_APPLICATION_DATA, DASHBOARD_STATS, MONTHLY_APPLICATION_DATA, SCHOLARSHIP_DISTRIBUTION_DATA } from '../../data/adminMockData';
import { AdminIcon } from '../../components/admin/AdminIcon';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-IN').format(value);
}

function formatCurrency(value: number) {
  return `₹${(value / 10000000).toFixed(2)} crore`;
}

export function Reports() {
  const [period, setPeriod] = useState('Last 6 months');
  const maxApplications = Math.max(...MONTHLY_APPLICATION_DATA.map((item) => item.applications));
  const statusTotal = DASHBOARD_STATS.approvedApplications + DASHBOARD_STATS.pendingApplications + DASHBOARD_STATS.rejectedApplications;
  const statusItems = [
    { label: 'Approved', value: DASHBOARD_STATS.approvedApplications, className: 'bg-emerald-500' },
    { label: 'Pending', value: DASHBOARD_STATS.pendingApplications, className: 'bg-blue-500' },
    { label: 'Rejected', value: DASHBOARD_STATS.rejectedApplications, className: 'bg-red-500' },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        action={<div className="flex items-center gap-2"><label className="sr-only" htmlFor="report-period">Report period</label><select className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="report-period" value={period} onChange={(event) => setPeriod(event.target.value)}><option>Last 6 months</option><option>Current financial year</option><option>All time</option></select><Button size="sm" variant="outline" onClick={() => window.print()}><AdminIcon className="h-4 w-4" name="download" /> Export report</Button></div>}
        description={`Demo analytics for ${period.toLowerCase()}. Replace these aggregates with authenticated reporting endpoints before production use.`}
        eyebrow="Insights and exports"
        title="Reports & analytics"
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Report summary">
        <Card className="p-4" accentClass=""><p className="text-xs font-semibold text-slate-500">Applications received</p><p className="mt-2 text-2xl font-bold text-slate-900">{formatNumber(DASHBOARD_STATS.totalApplications)}</p><p className="mt-1 text-xs text-slate-500">All recorded submissions</p></Card>
        <Card className="p-4" accentClass=""><p className="text-xs font-semibold text-slate-500">Approval rate</p><p className="mt-2 text-2xl font-bold text-emerald-700">{Math.round((DASHBOARD_STATS.approvedApplications / DASHBOARD_STATS.totalApplications) * 100)}%</p><p className="mt-1 text-xs text-slate-500">Across decided applications</p></Card>
        <Card className="p-4" accentClass=""><p className="text-xs font-semibold text-slate-500">Average award value</p><p className="mt-2 text-2xl font-bold text-gov-blue">₹{formatNumber(Math.round(DASHBOARD_STATS.totalAmountDisbursed / DASHBOARD_STATS.scholarshipsDisbursed))}</p><p className="mt-1 text-xs text-slate-500">Based on disbursed awards</p></Card>
        <Card className="p-4" accentClass=""><p className="text-xs font-semibold text-slate-500">Amount disbursed</p><p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(DASHBOARD_STATS.totalAmountDisbursed)}</p><p className="mt-1 text-xs text-slate-500">Cumulative demo value</p></Card>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <Card className="p-5" accentClass="">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">Application trend</p><h2 className="mt-1 text-lg font-bold text-gov-blue-dark">Applications by month</h2></div><div className="flex items-center gap-3 text-[11px] text-slate-500"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-gov-blue" /> Applications</span><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Approved</span></div></div>
          <div className="mt-6 flex h-64 items-end gap-2 border-b border-l border-slate-200 px-2 pb-0 pt-4 sm:gap-4">
            {MONTHLY_APPLICATION_DATA.map((item) => <div className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2" key={item.month}><div className="flex h-full w-full items-end justify-center gap-1"><div aria-label={`${item.applications} applications`} className="w-3 rounded-t bg-gov-blue sm:w-5" style={{ height: `${(item.applications / maxApplications) * 100}%` }} /><div aria-label={`${item.approved} approved`} className="w-3 rounded-t bg-emerald-500 sm:w-5" style={{ height: `${(item.approved / maxApplications) * 100}%` }} /></div><span className="pb-2 text-[11px] font-semibold text-slate-500">{item.month}</span></div>)}
          </div>
          <p className="mt-4 text-xs text-slate-500">Monthly totals are sample values for dashboard visualisation.</p>
        </Card>

        <Card className="p-5" accentClass="">
          <div><p className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">Decision quality</p><h2 className="mt-1 text-lg font-bold text-gov-blue-dark">Approved vs rejected</h2></div>
          <div className="mt-6 space-y-5">{statusItems.map((item) => { const percentage = Math.round((item.value / statusTotal) * 100); return <div key={item.label}><div className="flex items-center justify-between gap-3 text-sm"><span className="font-semibold text-slate-700">{item.label}</span><span className="font-bold text-slate-900">{formatNumber(item.value)} <span className="text-xs font-normal text-slate-400">({percentage}%)</span></span></div><div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${item.className}`} style={{ width: `${percentage}%` }} /></div></div>; })}</div>
          <div className="mt-6 rounded-md bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">Pending applications remain outside the final decision denominator until a decision is recorded.</div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5" accentClass="">
          <div><p className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">Applicant mix</p><h2 className="mt-1 text-lg font-bold text-gov-blue-dark">Applications by category</h2></div>
          <div className="mt-5 space-y-4">{CATEGORY_APPLICATION_DATA.map((item) => <div key={item.category}><div className="flex items-center justify-between gap-3 text-xs"><span className="font-semibold text-slate-700">{item.category}</span><span className="font-bold text-slate-800">{formatNumber(item.applications)} <span className="font-normal text-slate-400">({item.percentage}%)</span></span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${item.tone === 'blue' ? 'bg-blue-600' : item.tone === 'saffron' ? 'bg-amber-500' : item.tone === 'green' ? 'bg-emerald-500' : 'bg-purple-500'}`} style={{ width: `${Math.max(item.percentage, 1)}%` }} /></div></div>)}</div>
        </Card>

        <Card className="p-5" accentClass="">
          <div><p className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">Funding view</p><h2 className="mt-1 text-lg font-bold text-gov-blue-dark">Scholarship distribution</h2></div>
          <div className="mt-5 space-y-3">{SCHOLARSHIP_DISTRIBUTION_DATA.map((item) => <div className="flex items-center justify-between gap-3 rounded-md bg-slate-50 p-3" key={item.name}><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-700">{item.name}</p><p className="mt-1 text-[11px] text-slate-500">{formatNumber(item.applicants)} applicants</p></div><div className="shrink-0 text-right"><p className="text-xs font-bold text-gov-blue">{formatCurrency(item.amount)}</p><p className="mt-1 text-[11px] text-slate-500">{item.percentage}% of total</p></div></div>)}</div>
        </Card>
      </div>

      <Card className="overflow-hidden" accentClass="">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4"><div><p className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">Institution view</p><h2 className="mt-1 text-lg font-bold text-gov-blue-dark">Applications by college</h2></div><AdminIcon className="h-5 w-5 text-slate-400" name="bank" /></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3 font-bold">College / Institute</th><th className="px-5 py-3 font-bold">Applications</th><th className="px-5 py-3 font-bold">Approved</th><th className="px-5 py-3 font-bold">Approval rate</th></tr></thead><tbody className="divide-y divide-slate-100">{COLLEGE_APPLICATION_DATA.map((item) => <tr key={item.college}><td className="px-5 py-4 font-semibold text-slate-700">{item.college}</td><td className="px-5 py-4 text-slate-600">{formatNumber(item.applications)}</td><td className="px-5 py-4 text-slate-600">{formatNumber(item.approved)}</td><td className="px-5 py-4"><div className="flex items-center gap-3"><div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.round((item.approved / item.applications) * 100)}%` }} /></div><span className="text-xs font-semibold text-slate-600">{Math.round((item.approved / item.applications) * 100)}%</span></div></td></tr>)}</tbody></table></div>
      </Card>
    </div>
  );
}
