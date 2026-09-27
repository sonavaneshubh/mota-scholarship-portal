/**
 * Financial benefits, rendered from `scheme_benefits`.
 *
 * The shape of this table is driven by the data rather than fixed. A scheme can
 * record benefits three ways and all three have to look right:
 *
 *   - a tiered benefit (the stipend groups) — one row per group, with a
 *     hosteller and a day-scholar column
 *   - a single benefit with one figure (a one-off payment) — amount on its own
 *   - a benefit with no figure at all (a reimbursement against a fee schedule)
 *     — the coverage text carries the meaning and no number is shown
 *
 * The last case is the important one. A reimbursement "as per the State Fee
 * Committee" has no single amount, and printing a number there would be an
 * invention. So a benefit with no amount renders its coverage and says nothing
 * about money, rather than showing a zero or a dash that reads as "nothing".
 */

import type { SchemeBenefit } from '../../lib/supabase';
import { formatInr } from '../../services/eligibility';
import { Badge } from '../ui/Badge';

/**
 * Orders the tiers of one benefit.
 *
 * The query sorts benefits by `benefit_type` only, so the order of rows that
 * share a `benefit_type` is whatever the database happens to return. For a
 * tiered benefit such as the Post-Matric stipend groups that means Group II
 * can appear above Group I. Sorting here makes the printed order match the
 * order the guideline's table uses, instead of relying on storage order.
 *
 * Tiers sort by their label, case-insensitively and with a leading number read
 * as a number, so 'Group I' precedes 'Group II' and 'Group 2' precedes
 * 'Group 10'. Rows with no tier are kept after the tiered ones.
 */
function compareTiers(a: SchemeBenefit, b: SchemeBenefit): number {
  const left = a.benefit_group?.trim();
  const right = b.benefit_group?.trim();

  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;

  const leftNumber = /^\d+/.test(left) ? Number(left.match(/^\d+/)?.[0]) : null;
  const rightNumber = /^\d+/.test(right) ? Number(right.match(/^\d+/)?.[0]) : null;

  if (leftNumber !== null && rightNumber !== null && leftNumber !== rightNumber) {
    return leftNumber - rightNumber;
  }

  return left.toLowerCase().localeCompare(right.toLowerCase());
}

/** Grouped so the tiers of one benefit stay together and in order. */
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

  return Array.from(groups, ([benefitType, rows]) => ({
    benefitType,
    rows: [...rows].sort(compareTiers),
  }));
}

function humanise(value: string): string {
  const text = value.replace(/_/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** True when any row in the group carries a hosteller/day-scholar split. */
function hasResidenceSplit(rows: SchemeBenefit[]): boolean {
  return rows.some(
    (row) => typeof row.hosteller_amount === 'number' || typeof row.day_scholar_amount === 'number',
  );
}

function amountCell(value: number | null, period: string | null): string {
  if (typeof value !== 'number') return '—';
  return period ? `${formatInr(value)} / ${period.replace(/^per\s+/i, '')}` : formatInr(value);
}

interface SchemeBenefitsTableProps {
  benefits: SchemeBenefit[];
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
    <div className="space-y-6">
      {groups.map((group) => {
        const split = hasResidenceSplit(group.rows);
        const period = group.rows.find((row) => row.amount_period)?.amount_period ?? null;
        const coverage = group.rows.find((row) => row.coverage)?.coverage ?? null;
        const conditions = group.rows.find((row) => row.conditions)?.conditions ?? null;

        return (
          <section key={group.benefitType}>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-gov-blue-dark">
                {group.rows[0]?.description
                  ? group.rows[0].description
                  : humanise(group.benefitType)}
              </h3>
              {period ? <Badge tone="blue">{humanise(period)}</Badge> : null}
            </div>

            {split ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[540px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] uppercase tracking-wide text-slate-500">
                      <th className="py-2 pr-3 font-semibold" scope="col">Group</th>
                      <th className="py-2 pr-3 font-semibold" scope="col">Applies to</th>
                      <th className="py-2 pr-3 text-right font-semibold" scope="col">Hosteller</th>
                      <th className="py-2 text-right font-semibold" scope="col">Day scholar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((row) => (
                      <tr className="border-b border-slate-100 last:border-0" key={row.id}>
                        <td className="py-2.5 pr-3 font-semibold text-slate-800">
                          {row.benefit_group ? `Group ${row.benefit_group}` : humanise(row.benefit_type)}
                        </td>
                        <td className="py-2.5 pr-3 text-slate-700">
                          {row.description ?? row.coverage ?? '—'}
                        </td>
                        <td className="py-2.5 pr-3 text-right font-semibold text-slate-800">
                          {amountCell(row.hosteller_amount ?? row.amount, row.amount_period)}
                        </td>
                        <td className="py-2.5 text-right font-semibold text-slate-800">
                          {amountCell(row.day_scholar_amount ?? row.amount, row.amount_period)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded border border-slate-200 bg-slate-50 px-3 py-3">
                {coverage ? (
                  <p className="text-sm leading-relaxed text-slate-700">{coverage}</p>
                ) : null}
                {group.rows.map((row) =>
                  typeof row.amount === 'number' ? (
                    <p className="text-lg font-bold text-gov-blue-dark" key={row.id}>
                      {amountCell(row.amount, row.amount_period)}
                    </p>
                  ) : null,
                )}
              </div>
            )}

            {conditions ? (
              <p className="mt-2 text-xs leading-snug text-slate-500">{conditions}</p>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
