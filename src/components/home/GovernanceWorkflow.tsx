import { WORKFLOW_STEPS } from '../../data/mockData';
import type { WorkflowStep, WorkflowTone } from '../../types';
import { Button } from '../ui/Button';

const toneStyles: Record<WorkflowTone, { border: string; circle: string; note: string }> = {
  blue: {
    border: 'border-2 border-slate-200',
    circle: 'bg-gov-blue text-white',
    note: 'text-blue-800 bg-blue-50',
  },
  saffron: {
    border: 'border-2 border-amber-300',
    circle: 'bg-gov-saffron text-white',
    note: 'text-amber-800 bg-amber-50',
  },
  slate: {
    border: 'border-2 border-slate-200',
    circle: 'bg-slate-500 text-white',
    note: 'text-slate-700 bg-slate-100',
  },
  green: {
    border: 'border-2 border-gov-green',
    circle: 'bg-gov-green text-white',
    note: 'text-emerald-800 bg-emerald-50',
  },
};

function StepCard({ step }: { step: WorkflowStep }) {
  const styles = toneStyles[step.tone];

  return (
    <div className={`bg-white ${styles.border} rounded-lg p-4 relative shadow-sm`}>
      <div
        className={`w-8 h-8 rounded-full ${styles.circle} flex items-center justify-center font-bold text-sm mb-3`}
      >
        {step.id}
      </div>
      <div className="flex items-center gap-1.5">
        <h4 className="font-bold text-sm text-slate-900">{step.title}</h4>
        {step.tone === 'saffron' ? (
          <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.2 rounded">
            Assistance Only
          </span>
        ) : null}
      </div>
      <p className="text-xs text-slate-600 mt-1">{step.detail}</p>
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
      data-purpose="ai-assisted-governance-workflow"
      id="verification-workflow"
    >
      <div className="text-center max-w-3xl mx-auto mb-8">
        <span className="text-xs font-bold text-gov-blue uppercase tracking-wider bg-blue-50 border border-blue-200 px-2.5 py-1 rounded">
          Public Governance &amp; Responsible Technology
        </span>
        <h2 className="text-2xl font-bold text-slate-900 mt-2">
          AI-Assisted Document Processing &amp; Multi-Tier Human Verification
        </h2>
        <p className="text-xs md:text-sm text-slate-600 mt-1">
          Accelerating verification while safeguarding affirmative rights: AI assists in optical
          scanning and extraction, while <strong>every final sanction is evaluated strictly by
          authorized public officers</strong>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
        {WORKFLOW_STEPS.map((step) => (
          <StepCard key={step.id} step={step} />
        ))}
      </div>

      <div className="mt-6 bg-slate-50 border border-slate-300 rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gov-blue text-white flex-shrink-0 flex items-center justify-center">
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
            <h5 className="text-xs font-bold text-slate-900 uppercase">
              National Data Governance &amp; AI Ethics Compliance
            </h5>
            <p className="text-xs text-slate-600">
              Pursuant to Government of India guidelines,{' '}
              <strong>no candidate is rejected automatically by algorithmic or AI systems</strong>.
              Any discrepancy identified during preliminary OCR parsing triggers mandatory human
              officer review and opportunity for applicant clarification.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="md"
          href="#compliance-policy"
          className="whitespace-nowrap border-slate-300 text-gov-blue hover:bg-white flex-shrink-0"
        >
          Read Transparency Standard
        </Button>
      </div>
    </section>
  );
}