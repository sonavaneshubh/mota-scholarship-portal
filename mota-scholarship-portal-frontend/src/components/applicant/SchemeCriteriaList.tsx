/**
 * Ordered eligibility conditions, rendered from `scheme_criteria`.
 *
 * This is the list a person reads. It sits alongside, not instead of,
 * `scheme_eligibility`, which holds the machine-checkable numbers the portal
 * pre-evaluates an applicant against. Both are shown on the detail view because
 * they answer different questions: "what does the scheme require" versus "does
 * your profile look like it meets those numbers so far".
 */

import type { SchemeCriterion } from '../../lib/supabase';
import { Badge } from '../ui/Badge';

interface SchemeCriteriaListProps {
  criteria: SchemeCriterion[];
}

export function SchemeCriteriaList({ criteria }: SchemeCriteriaListProps) {
  if (criteria.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        An eligibility checklist has not been recorded for this scheme yet. Please refer to the official guideline.
      </p>
    );
  }

  return (
    <ol className="space-y-2.5">
      {criteria.map((criterion) => (
        <li
          className="flex gap-3 rounded border border-slate-200 bg-white px-3 py-2.5"
          key={criterion.id}
        >
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">
            {criterion.criterion_order}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[13px] font-semibold text-slate-800">{criterion.label}</p>
              {!criterion.is_mandatory ? <Badge tone="slate">Conditional</Badge> : null}
            </div>
            {criterion.detail ? (
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{criterion.detail}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
