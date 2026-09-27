/**
 * The application and verification pipeline, rendered from
 * `scheme_process_steps`.
 *
 * Shown as an ordered list rather than a free paragraph because the whole point
 * of the section is that an applicant can see what happens to their application
 * after they submit it, and how many hands it passes through before money moves.
 *
 * Every row was written from the scheme's own guideline rather than from a shared
 * pipeline, and each one carries the document and page it came from in
 * `source_ref`, which is shown beneath the step so the process is traceable.
 * `sla_or_timeline` holds dates the guidelines describe as SUGGESTED, so it is
 * labelled as such and never presented as a fixed deadline.
 */

import type { SchemeProcessStep } from '../../lib/supabase';

interface SchemeProcessStepsProps {
  steps: SchemeProcessStep[];
}

export function SchemeProcessSteps({ steps }: SchemeProcessStepsProps) {
  if (steps.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        The verification process has not been recorded for this scheme yet. Please refer to the official guideline.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="rounded border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs leading-snug text-slate-600">
        Dates shown below are the ones the official guideline suggests. They vary by State and by year, and
        the portal announcement for the current cycle is the authority for actual deadlines.
      </p>

      <ol className="space-y-0">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;

          return (
            <li className="flex gap-4" key={step.id}>
              {/* The connector is drawn on the marker rather than as a separate
                  element, so a step in the middle is visually joined to the one
                  below it without needing a pseudo-element. */}
              <div className="flex flex-col items-center">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gov-blue-dark text-[11px] font-bold text-white">
                  {step.step_order}
                </span>
                {!isLast ? <span aria-hidden="true" className="w-px flex-1 bg-slate-300" /> : null}
              </div>

              <div className={isLast ? 'pb-0' : 'pb-6'}>
                <p className="text-sm font-bold text-slate-800">{step.title}</p>
                {step.description ? (
                  <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{step.description}</p>
                ) : null}
                {step.actor ? (
                  <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {step.actor}
                  </p>
                ) : null}
                {step.sla_or_timeline ? (
                  <p className="mt-1.5 text-[12px] leading-snug text-slate-700">
                    <span className="font-semibold">Timeline:</span> {step.sla_or_timeline}
                  </p>
                ) : null}
                {step.source_ref ? (
                  <p className="mt-1.5 text-[11px] italic leading-snug text-slate-400">
                    Source: {step.source_ref}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
