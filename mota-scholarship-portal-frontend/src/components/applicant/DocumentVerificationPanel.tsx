import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface DocumentVerificationPanelProps {
  applicationId?: string;
  documentCount: number;
  needsCorrection?: boolean;
}

const steps = [
  'Document uploaded',
  'Document type detected',
  'OCR text extracted',
  'Information matched with application',
  'Authorized officer verification',
];

export function DocumentVerificationPanel({
  applicationId,
  documentCount,
  needsCorrection = false,
}: DocumentVerificationPanelProps) {
  const currentStep = needsCorrection ? 3 : 4;

  return (
    <Card className="border-l-4 border-gov-saffron p-5" accentClass="">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-gov-saffron-dark">AI-assisted processing</p>
          <h2 className="mt-1 text-lg font-bold text-gov-blue-dark">Document verification status</h2>
          <p className="mt-1 text-xs text-slate-500">Sample document workspace{applicationId ? ` · ${applicationId}` : ''} · {documentCount} documents</p>
        </div>
        <Badge tone={needsCorrection ? 'amber' : 'blue'}>{needsCorrection ? 'Correction needed' : 'Officer review pending'}</Badge>
      </div>
      <ol className="mt-6 space-y-3">
        {steps.map((step, index) => {
          const complete = index < currentStep;
          const current = index === currentStep;

          return (
            <li className="flex items-center gap-3" key={step}>
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${complete ? 'border-gov-green bg-emerald-50 text-emerald-800' : current ? 'border-gov-blue bg-blue-100 text-gov-blue' : 'border-slate-300 bg-white text-slate-600'}`}>
                {complete ? <span aria-hidden="true">✓</span> : index + 1}
                {complete ? <span className="sr-only">Completed</span> : null}
              </span>
              <span className={`text-sm ${current ? 'font-bold text-gov-blue-dark' : complete ? 'font-semibold text-slate-700' : 'text-slate-500'}`}>
                {step}
              </span>
              {current ? <span className="ml-auto text-[10px] font-bold uppercase tracking-wide text-gov-blue">Current</span> : null}
            </li>
          );
        })}
      </ol>
      <div className="mt-5 rounded border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">
        <p className="font-bold">Prototype state only</p>
        <p className="mt-1">The steps above illustrate a possible workflow. No live OCR, document upload, or automated decision is connected.</p>
        <p className="mt-2 font-semibold">AI assists document verification. Final verification and decisions are performed by authorized officials.</p>
      </div>
    </Card>
  );
}
