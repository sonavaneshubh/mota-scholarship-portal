import { applicantStatusPath } from '../../lib/constants';
import type { ApplicantApplication, ApplicantApplicationStatus } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ApplicationStatusBadge } from './StatusBadge';

interface ApplicationTimelineProps {
  application: ApplicantApplication;
  variant?: 'detailed' | 'dashboard';
}

const stages = [
  { label: 'Submitted', description: 'Application received by the sample portal.' },
  { label: 'Under verification', description: 'Document and profile checks are in progress.' },
  { label: 'Deficiency raised', description: 'A correction may be requested before scrutiny continues.' },
  { label: 'Resubmission', description: 'A corrected document set can return to the review queue.' },
  { label: 'Under scrutiny', description: 'Authorized officials review the sample record.' },
  { label: 'Final decision', description: 'The authorized decision would be recorded here.' },
] as const;

const dashboardStages = [
  { label: 'Application record', shortLabel: 'Application created' },
  { label: 'Final submission', shortLabel: 'Final submitted' },
  { label: 'Document check', shortLabel: 'Documents reviewed' },
  { label: 'Officer review', shortLabel: 'Ministry review' },
  { label: 'Final decision', shortLabel: 'Decision & benefit' },
] as const;

function getCurrentStage(status: ApplicantApplicationStatus) {
  switch (status) {
    case 'draft':
    case 'submitted':
      return 0;
    case 'under-verification':
      return 1;
    case 'deficiency-raised':
      return 2;
    case 'resubmission-required':
      return 3;
    case 'under-scrutiny':
      return 4;
    case 'selected':
    case 'not-selected':
    case 'rejected':
    case 'withdrawn':
      return 5;
  }
}

function getDashboardStage(status: ApplicantApplicationStatus) {
  switch (status) {
    case 'draft':
      return 0;
    case 'submitted':
      return 1;
    case 'under-verification':
    case 'deficiency-raised':
    case 'resubmission-required':
      return 2;
    case 'under-scrutiny':
      return 3;
    case 'selected':
    case 'not-selected':
    case 'rejected':
    case 'withdrawn':
      return 4;
  }
}

function getStageState(index: number, currentStage: number) {
  if (index < currentStage) {
    return 'complete' as const;
  }

  if (index === currentStage) {
    return 'current' as const;
  }

  return 'upcoming' as const;
}

function getDashboardStageDetail(index: number, application: ApplicantApplication) {
  const details = [
    application.id,
    application.submittedAt,
    `${application.documentsComplete}/${application.documentsTotal} documents recorded`,
    application.statusLabel,
    application.status === 'selected' ? 'Decision recorded in sample data' : 'Awaiting an authorized decision',
  ];

  return details[index];
}

function DetailedTimeline({ application }: { application: ApplicantApplication }) {
  const currentStage = getCurrentStage(application.status);

  return (
    <Card className="p-5" accentClass="border-l-4 border-gov-blue">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">Application journey</p>
          <h2 className="mt-1 text-lg font-bold text-gov-blue-dark">Status timeline</h2>
        </div>
        <p className="text-xs text-slate-500">Sample record · {application.id}</p>
      </div>
      <ol className="mt-6 space-y-0">
        {stages.map((stage, index) => {
          const state = getStageState(index, currentStage);
          const isCurrent = state === 'current';

          return (
            <li className="relative flex gap-4 pb-6 last:pb-0" key={stage.label}>
              {index < stages.length - 1 ? (
                <span aria-hidden="true" className={`absolute left-[0.9375rem] top-8 h-[calc(100%-1rem)] w-px ${state === 'complete' ? 'bg-gov-green' : 'bg-slate-200'}`} />
              ) : null}
              <span
                aria-current={isCurrent ? 'step' : undefined}
                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${state === 'complete' ? 'border-gov-green bg-emerald-50 text-emerald-800' : isCurrent ? 'border-gov-blue bg-gov-blue text-white' : 'border-slate-300 bg-white text-slate-500'}`}
              >
                {state === 'complete' ? <span aria-hidden="true">✓</span> : index + 1}
                {state === 'complete' ? <span className="sr-only">Completed</span> : null}
              </span>
              <div className="min-w-0 pt-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className={`text-sm font-bold ${isCurrent ? 'text-gov-blue-dark' : 'text-slate-800'}`}>{stage.label}</h3>
                  {isCurrent ? <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gov-blue">Current</span> : null}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{isCurrent ? application.nextStep : stage.description}</p>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500">
        This timeline is a demonstration of the workflow. It does not represent an official decision or a live status update.
      </p>
    </Card>
  );
}

function DashboardTimeline({ application }: { application: ApplicantApplication }) {
  const currentStage = getDashboardStage(application.status);

  return (
    <Card className="min-w-0 overflow-hidden p-0" accentClass="">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-900">Active application tracker</p>
          <h2 className="mt-1 text-base font-bold text-gov-blue-dark">Application {application.id}: {application.schemeName}</h2>
          <p className="mt-1 text-xs text-slate-500">Submitted on {application.submittedAt} · Updated {application.updatedAt}</p>
        </div>
        <ApplicationStatusBadge status={application.status} label={application.statusLabel} />
      </div>

      <div className="p-5">
        <ol className="grid gap-2 md:grid-cols-5">
          {dashboardStages.map((stage, index) => {
            const state = getStageState(index, currentStage);
            const stateClasses = state === 'complete' ? 'border-emerald-200 bg-emerald-50' : state === 'current' ? 'border-purple-400 bg-purple-50 shadow-sm' : 'border-slate-200 bg-slate-50 opacity-70';

            return (
              <li aria-current={state === 'current' ? 'step' : undefined} className={`rounded-lg border p-3 ${stateClasses}`} key={stage.label}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${state === 'upcoming' ? 'text-slate-500' : state === 'current' ? 'text-purple-900' : 'text-emerald-800'}`}>Stage {index + 1}</span>
                  {state === 'complete' ? <span className="text-emerald-700" aria-label="Complete">✓</span> : state === 'current' ? <span aria-hidden="true" className="h-2 w-2 rounded-full bg-purple-600" /> : <span className="text-[9px] font-bold uppercase text-slate-400">Pending</span>}
                </div>
                <h3 className="text-xs font-bold text-slate-900">{stage.shortLabel}</h3>
                <p className={`mt-1 text-[10px] leading-relaxed ${state === 'upcoming' ? 'text-slate-400' : state === 'current' ? 'text-purple-700' : 'text-slate-500'}`}>{getDashboardStageDetail(index, application)}</p>
              </li>
            );
          })}
        </ol>

        <div className="mt-5 grid gap-4 rounded-lg bg-slate-900 p-4 text-white lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded bg-amber-400 text-slate-900">
                <svg aria-hidden="true" className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a1 1 0 0 1 1 1v1.07a6 6 0 0 1 4.93 4.93H17a1 1 0 1 1 0 2h-1.07A6 6 0 0 1 11 16.93V18a1 1 0 1 1-2 0v-1.07A6 6 0 0 1 4.07 12H3a1 1 0 1 1 0-2h1.07A6 6 0 0 1 9 5.07V4a1 1 0 0 1 1-1Zm0 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
                </svg>
              </span>
              <h3 className="text-sm font-bold uppercase tracking-wide text-amber-300">AI-assisted verification context</h3>
            </div>
            <ul className="mt-3 grid gap-2 text-xs text-slate-200 sm:grid-cols-2">
              <li className="flex items-start gap-2"><span className="font-bold text-emerald-400">✓</span><span>{application.documentsComplete} of {application.documentsTotal} document records are complete</span></li>
              <li className="flex items-start gap-2"><span className="font-bold text-emerald-400">✓</span><span>Current workflow status: {application.statusLabel}</span></li>
              <li className="flex items-start gap-2"><span className="font-bold text-amber-400">●</span><span>{application.nextStep}</span></li>
              <li className="flex items-start gap-2"><span className="font-bold text-amber-400">●</span><span>Final decisions remain with authorized officials</span></li>
            </ul>
          </div>
          <div className="rounded-lg border border-white/15 bg-white/10 p-3 text-[11px] leading-relaxed text-slate-300">
            <p className="font-bold text-white">Human-in-the-loop principle</p>
            <p className="mt-1">Assistance can surface document issues, but authorized officers remain responsible for verification and final sanction.</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">Reference: {application.referenceNumber}</p>
          <Button size="sm" to={applicantStatusPath(application.id)} variant="outline">Open full status</Button>
        </div>
      </div>
    </Card>
  );
}

export function ApplicationTimeline({ application, variant = 'detailed' }: ApplicationTimelineProps) {
  return variant === 'dashboard' ? <DashboardTimeline application={application} /> : <DetailedTimeline application={application} />;
}
