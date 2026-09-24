import { AI_RESPONSIBILITY, WORKFLOW_STEPS } from '../../data/mockData';
import type { WorkflowStep, WorkflowTone } from '../../types';

const toneStyles: Record<WorkflowTone, { border: string; circle: string; note: string; bullet: string }> = {
  blue: {
    border: 'border-2 border-slate-200',
    circle: 'bg-gov-blue text-white',
    note: 'text-blue-800 bg-blue-50',
    bullet: 'bg-gov-blue',
  },
  saffron: {
    border: 'border-2 border-amber-300',
    circle: 'bg-gov-saffron text-white',
    note: 'text-amber-800 bg-amber-50',
    bullet: 'bg-gov-saffron',
  },
  slate: {
    border: 'border-2 border-slate-200',
    circle: 'bg-slate-500 text-white',
    note: 'text-slate-700 bg-slate-100',
    bullet: 'bg-slate-500',
  },
  green: {
    border: 'border-2 border-gov-green',
    circle: 'bg-gov-green text-white',
    note: 'text-emerald-800 bg-emerald-50',
    bullet: 'bg-gov-green',
  },
};

function StepCard({ step }: { step: WorkflowStep }) {
  const styles = toneStyles[step.tone];

  return (
    <div className={`bg-white ${styles.border} rounded-lg p-4 relative shadow-sm`}>
      <div
        className={`w-8 h-8 rounded-full ${styles.circle} flex items-center justify-center font-bold text-sm mb-2`}
      >
        {step.id}
      </div>
      <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">
        {step.stage}
      </div>
      <div className="flex items-center gap-1.5 mt-0.5">
        <h4 className="font-bold text-sm text-slate-900">{step.label}</h4>
        {step.tone === 'saffron' ? (
          <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.2 rounded">
            Assistance Only
          </span>
        ) : null}
      </div>
      <ul className="text-xs text-slate-600 mt-2 space-y-1">
        {step.points.map((point) => (
          <li key={point} className="flex items-start gap-1.5">
            <span
              className={`mt-1.5 inline-block w-1.5 h-1.5 rounded-full ${styles.bullet} flex-shrink-0`}
            />
            <span>{point}</span>
          </li>
        ))}
      </ul>
      <div className={`mt-3 text-[10px] font-semibold ${styles.note} p-1.5 rounded`}>
        {step.note}
      </div>
    </div>
  );
}

export function GovernanceWorkflow() {
  return (
    <section
      className="max-w-7xl mx-auto px-4 py-12"
      data-purpose="application-processing-workflow"
      id="how-it-works"
    >
      <div className="text-center max-w-3xl mx-auto mb-8">
        <span className="text-xs font-bold text-gov-blue uppercase tracking-wider bg-blue-50 border border-blue-200 px-2.5 py-1 rounded">
          End-to-End Digital Workflow
        </span>
        <h2 className="text-2xl font-bold text-slate-900 mt-2">
          How Your Application Is Processed
        </h2>
        <p className="text-xs md:text-sm text-slate-600 mt-1">
          From scheme discovery to the final authorized decision — AI assists with extraction and
          checks, while <strong>authorized officers verify and remain responsible for every final
          decision</strong>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
        {WORKFLOW_STEPS.map((step) => (
          <StepCard key={step.id} step={step} />
        ))}
      </div>

      <div className="mt-6 bg-emerald-50 border border-gov-green/40 rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gov-green text-white flex-shrink-0 flex items-center justify-center">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <div>
            <h5 className="text-xs font-bold text-gov-green-dark uppercase tracking-wide">
              {AI_RESPONSIBILITY.title}
            </h5>
            <p className="text-xs text-slate-700">{AI_RESPONSIBILITY.text}</p>
          </div>
        </div>
        <div className="text-[10px] font-bold text-emerald-800 bg-white border border-emerald-200 px-2.5 py-1 rounded flex-shrink-0 text-center">
          No fully automated scholarship decisions
        </div>
      </div>
    </section>
  );
}