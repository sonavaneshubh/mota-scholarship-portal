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
 *
 * ## Two things deliberately not rendered
 *
 * `source_ref` holds the guideline document and page a row was taken from. It is
 * provenance, and it was printed in 11px grey italics under every criterion. It
 * said "national-fellowship-scholarship.pdf Part-A p.5-7 §2.1" to an applicant
 * who has no way to act on it, while the rule that actually matters sat above it
 * unlabelled. The data is untouched in the database; the column is simply not
 * applicant-facing. An administrator reviewing the import can still read it.
 *
 * `slot_allocation` and `field_allocation` are quotas, not conditions. Grouped
 * under "Eligibility criteria" they read as requirements — an applicant adds up
 * 225 female slots and concludes that a scheme restricted to women has 225
 * places. They are headed as reservation and priority below, and the
 * `slot_cascade` rule that decides what happens to unfilled places stays in
 * internal metadata.
 */

import type { SchemeCriterion } from '../../lib/supabase';
import { stripInternalProvenance } from '../../lib/schemeEligibilityView';
import { Badge } from '../ui/Badge';

interface SchemeCriteriaListProps {
  criteria: SchemeCriterion[];
  /**
   * `criteria_type` values already shown in the eligibility criteria table.
   *
   * AZKMI's `maximum_age` rows are read into that table by
   * `courseDependentAges()`, because an applicant needs one "Maximum age" line,
   * not three repeated cards. Passing the type here keeps the value in one place
   * instead of printing it twice.
   */
  excludeTypes?: string[];
}

/** Human heading for each criteria_type, with its official total where known. */
const GROUP_HEADINGS: Record<string, { title: string; note?: string }> = {
  maximum_age: { title: 'Maximum age by course' },
  slot_allocation: { title: 'Reservation and priority', note: '750 awards in total' },
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
 *
 * `text_value` is free text on a table maintained from guideline PDFs, so it goes
 * through the provenance filter. It is currently clean across all five schemes,
 * which is why the filter is invisible here.
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
    return stripInternalProvenance(criterion.text_value);
  }
  return null;
}

export function SchemeCriteriaList({ criteria, excludeTypes = [] }: SchemeCriteriaListProps) {
  const visible = criteria.filter((criterion) => !excludeTypes.includes(criterion.criteria_type));

  if (visible.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        An eligibility checklist has not been recorded for this scheme yet. Please refer to the official guideline.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {groupCriteria(visible).map(([criteriaType, rows]) => {
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
                const appliesTo = stripInternalProvenance(criterion.applies_to);
                // AZKMI's Fine Arts allocation carries an unresolved conflict in
                // its description: "Separate merit list is drawn per field of
                // study. Open conflict (report 7.6): the MoTA FAQ does not list
                // Fine Arts as a separate covered field, whereas the guideline
                // does." The second sentence is why the row is in the table; it is
                // not something an applicant can act on, so it stays internal.
                const description = stripInternalProvenance(criterion.description);

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

                    {appliesTo ? (
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Applies to: {appliesTo}
                      </p>
                    ) : null}

                    {description ? (
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{description}</p>
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
