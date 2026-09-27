/**
 * The application and verification pipeline, rendered from
 * `scheme_process_steps`.
 *
 * Shown as an ordered list rather than a free paragraph because the whole point
 * of the section is that an applicant can see what happens to their application
 * after they submit it, and how many hands it passes through before money moves.
 *
 * `is_verified` is surfaced honestly. The steps for the schemes other than
 * Post-Matric ST were seeded from the shared Ministry of Tribal Affairs / NITA
 * pipeline and have not yet been checked against each scheme's own guideline,
 * so the section says so rather than presenting them as settled fact.
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

  const unverified = steps.some((step) => !step.is_verified);

  return (
    <div className="space-y-4">
      {unverified ? (
        <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs leading-snug text-amber-900">
          The steps below follow the standard Ministry of Tribal Affairs process and are awaiting confirmation
          against this scheme&rsquo;s official guideline.
        </p>
      ) : null}

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
                  {step.step_number}
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
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
