/**
 * Financial benefits, rendered from `scheme_benefits`.
 *
 * The live table holds `benefit_type`, `description`, `amount`, `frequency`,
 * `conditions`, `currency` and `amount_basis`. There is no per-residence amount
 * or tier column, and there does not need to be one: hosteller and day-scholar
 * rates, the four BVOBC course groups and the two AZKMI Ph.D tenure bands are
 * stored as SEPARATE rows, each with its own benefit_type, so nothing has to be
 * merged back together here.
 *
 * A NULL `amount` is a real answer, not a gap. It means the guideline states no
 * fixed figure because the amount is as-per-actuals, decided by a State fee
 * fixation committee, or a percentage of another figure. The basis is stated in
 * words from `amount_basis`, and no number is ever substituted: rendering a
 * missing amount as ₹0 would tell an applicant they get nothing.
 */

import type { SchemeBenefit } from '../../lib/supabase';
import { formatMoney } from '../../services/eligibility';
import { stripInternalProvenance } from '../../lib/schemeEligibilityView';
import {
  describeBenefitBasis,
  humaniseBenefitFrequency,
  humaniseBenefitType,
} from '../../lib/benefitView';
import { Badge } from '../ui/Badge';

interface SchemeBenefitsTableProps {
  benefits: SchemeBenefit[];
}

/** Grouped so several rows of one benefit_type stay under a single heading. */
interface BenefitGroup {
  benefitType: string;
  rows: SchemeBenefit[];
}

function groupBenefits(benefits: SchemeBenefit[]): BenefitGroup[] {
  const groups = new Map<string, SchemeBenefit[]>();

  for (const benefit of benefits) {
    const existing = groups.get(benefit.benefit_type);
    if (existing) {
      existing.push(benefit);
    } else {
      groups.set(benefit.benefit_type, [benefit]);
    }
  }

  return Array.from(groups, ([benefitType, rows]) => ({ benefitType, rows }));
}

/**
 * The text shown under an amount, with provenance removed.
 *
 * This used to pull the trailing "Source: ..." clause out and print it again
 * directly underneath, in grey italics, under every one of the 30-plus benefit
 * rows across the five schemes. An applicant reading "Rs. 5,000 per annum per
 * student... Source: national-fellowship-scholarship.pdf Part-B p.19 §2.5" learns
 * the file name and the page, and nothing about the benefit.
 *
 * stripInternalProvenance() drops the citation and any other sentence that is a
 * note about the data, not just the one starting with "Source:".
 */
function conditionBody(conditions: string | null | undefined): string | null {
  return stripInternalProvenance(conditions);
}

export function SchemeBenefitsTable({ benefits }: SchemeBenefitsTableProps) {
  if (benefits.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        Benefit details have not been recorded for this scheme yet. Please refer to the official guideline.
      </p>
    );
  }

  const groups = groupBenefits(benefits);

  return (
    <div className="space-y-5">
      {groups.map((group) => {
        // The first row's description names the group. A description that was
        // entirely a citation leaves nothing to name it with, so the humanised
        // benefit_type is used instead.
        const heading =
          group.rows.map((row) => stripInternalProvenance(row.description)).find(Boolean) ??
          humaniseBenefitType(group.benefitType);

        return (
          <section key={group.benefitType}>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-gov-blue-dark">{heading}</h3>
              {group.benefitType !== heading ? (
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {humaniseBenefitType(group.benefitType)}
                </span>
              ) : null}
            </div>

            <ul className="space-y-2">
              {group.rows.map((row) => {
                const body = conditionBody(row.conditions);
                const basisNote = describeBenefitBasis(row.amount_basis);
                const description = stripInternalProvenance(row.description);

                return (
                  <li className="rounded border border-slate-200 bg-slate-50 px-3 py-2.5" key={row.id}>
                    {row.frequency || row.currency ? (
                      <p className="mb-1 flex flex-wrap items-center gap-1.5">
                        {row.frequency ? <Badge tone="blue">{humaniseBenefitFrequency(row.frequency)}</Badge> : null}
                        {row.currency ? <Badge tone="slate">{row.currency}</Badge> : null}
                      </p>
                    ) : null}

                    {typeof row.amount === 'number' ? (
                      <p className="text-base font-bold text-gov-blue-dark">
                        {formatMoney(row.amount, row.currency)}
                      </p>
                    ) : (
                      <p className="text-[13px] font-semibold leading-snug text-slate-700">
                        {basisNote ?? 'Benefit amount not specified in available scheme data'}
                      </p>
                    )}

                    {description ? (
                      <p className="mt-1.5 text-[12px] leading-snug text-slate-600">{description}</p>
                    ) : null}

                    {body ? (
                      <p className="mt-1.5 text-[12px] leading-snug text-slate-600">{body}</p>
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
