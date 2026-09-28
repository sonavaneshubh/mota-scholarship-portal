/**
 * The application and verification pipeline, rendered from
 * `scheme_process_steps`.
 *
 * Shown as an ordered list rather than a free paragraph because the whole point
 * of the section is that an applicant can see what happens to their application
 * after they submit it, and how many hands it passes through before money moves.
 *
 * Every row was written from the scheme's own guideline rather than from a shared
 * pipeline. `sla_or_timeline` holds dates the guidelines describe as SUGGESTED, so
 * it is labelled as such and never presented as a fixed deadline.
 *
 * `source_ref` — the guideline document and page each step was taken from — is
 * not rendered. It is provenance, and it was printed in 11px grey italics under
 * every step, where it added a file name to a list the applicant reads to find
 * out what happens after they submit. It stays in the table for the importer and
 * for review.
 *
 * The remaining text columns go through `stripInternalProvenance` for the same
 * reason. No step currently carries a citation in its prose, so this changes
 * nothing today, but `title`, `description`, `actor` and `sla_or_timeline` are
 * free text on a table maintained from guideline PDFs, exactly like the benefit
 * conditions that did carry "Source: … p.7 §2.6" on 30-odd rows. Filtering on
 * the way out is what keeps the next import from putting a file name back in
 * front of an applicant.
 */

import type { SchemeProcessStep } from '../../lib/supabase';
import { stripInternalProvenance } from '../../lib/schemeEligibilityView';

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
          const title = stripInternalProvenance(step.title);
          const description = stripInternalProvenance(step.description);
          const actor = stripInternalProvenance(step.actor);
          const timeline = stripInternalProvenance(step.sla_or_timeline);
          if (!title) return null;

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
                <p className="text-sm font-bold text-slate-800">{title}</p>
                {description ? (
                  <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{description}</p>
                ) : null}
                {actor ? (
                  <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {actor}
                  </p>
                ) : null}
                {timeline ? (
                  <p className="mt-1.5 text-[12px] leading-snug text-slate-700">
                    <span className="font-semibold">Timeline:</span> {timeline}
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
