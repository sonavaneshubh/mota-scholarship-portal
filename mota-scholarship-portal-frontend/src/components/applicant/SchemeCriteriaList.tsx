/**
 * Non-scalar eligibility rules, rendered from `scheme_criteria`.
 *
 * `scheme_criteria` holds official rules that cannot be expressed in a single
 * column: AZKMI's three course-dependent maximum ages (32 / 35 / 38), ARG45's
 * four slot allocations out of 750, AZKMI's four field allocations out of 20,
 * and BVOBC's four official course groups.
 *
 * Rows are therefore grouped by `criteria_type` and shown as a definition list
 * per group, not as one numbered list. A single running number across four
 * different kinds of rule would imply an order the guidelines do not state.
 */

import type { SchemeCriterion } from '../../lib/supabase';
import { Badge } from '../ui/Badge';

interface SchemeCriteriaListProps {
  criteria: SchemeCriterion[];
}

/** Human heading for each criteria_type, with its official total where known. */
const GROUP_HEADINGS: Record<string, { title: string; note?: string }> = {
  maximum_age: { title: 'Maximum age by course' },
  slot_allocation: { title: 'Award slots by category', note: '750 awards in total' },
  field_allocation: { title: 'Awards by field of study', note: '20 awards in total' },
  course_group: { title: 'Official course groups' },
};

function groupCriteria(criteria: SchemeCriterion[]): [string, SchemeCriterion[]][] {
  const groups = new Map<string, SchemeCriterion[]>();

  for (const criterion of criteria) {
    const existing = groups.get(criterion.criteria_type);
    if (existing) {
      existing.push(criterion);
    } else {
      groups.set(criterion.criteria_type, [criterion]);
    }
  }

  return Array.from(groups);
}

/**
 * The numeric rule value, e.g. "32 years" or "225 slots". A rule with no numeric
 * value falls back to its text_value, and to nothing at all when it has neither,
 * rather than showing a placeholder zero.
 */
function describeValue(criterion: SchemeCriterion): string | null {
  if (typeof criterion.numeric_value === 'number') {
    const unit =
      criterion.criteria_type === 'maximum_age'
        ? ' years'
        : criterion.criteria_type === 'slot_allocation' || criterion.criteria_type === 'field_allocation'
          ? ' slots'
          : '';
    return `${criterion.numeric_value.toLocaleString('en-IN')}${unit}`;
  }
  if (criterion.text_value) {
    return criterion.text_value;
  }
  return null;
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
    <div className="space-y-5">
      {groupCriteria(criteria).map(([criteriaType, rows]) => {
        const heading = GROUP_HEADINGS[criteriaType];

        return (
          <section key={criteriaType}>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-gov-blue-dark">
                {heading?.title ?? criteriaType.replace(/_/g, ' ')}
              </h3>
              {heading?.note ? <Badge tone="slate">{heading.note}</Badge> : null}
            </div>

            <ul className="space-y-2">
              {rows.map((criterion) => {
                const value = describeValue(criterion);

                return (
                  <li
                    className="rounded border border-slate-200 bg-white px-3 py-2.5"
                    key={criterion.id}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[13px] font-semibold text-slate-800">{criterion.title}</p>
                      {value ? (
                        <span className="text-sm font-bold text-gov-blue-dark">{value}</span>
                      ) : null}
                    </div>

                    {criterion.applies_to ? (
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Applies to: {criterion.applies_to}
                      </p>
                    ) : null}

                    {criterion.description ? (
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                        {criterion.description}
                      </p>
                    ) : null}

                    {criterion.source_ref ? (
                      <p className="mt-1.5 text-[11px] italic leading-snug text-slate-400">
                        Source: {criterion.source_ref}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
