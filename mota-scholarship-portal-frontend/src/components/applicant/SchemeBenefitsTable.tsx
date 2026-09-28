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

function humanise(value: string): string {
  const text = value.replace(/_/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Spoken form of a `frequency` value, e.g. 'monthly' -> 'Monthly'. */
function humaniseFrequency(value: string): string {
  return humanise(value);
}

/**
 * What a NULL amount means, in words, taken from `amount_basis`. Returns null
 * when there is no amount and no basis to explain it, so the row can fall back
 * to the generic message.
 */
function describeBasis(basis: string | null | undefined): string | null {
  switch (basis) {
    case 'actual':
      return 'Actual cost, as claimed and verified. No fixed amount is stated in the guideline.';
    case 'state_fixed':
      return 'Decided by the State Level Fee Fixation Committee. No single central amount is stated.';
    case 'percentage':
      return 'A percentage of another official figure, not a fixed amount. The percentage is given in the conditions below.';
    case 'pro_rated':
      return 'Pro-rated to the number of months remaining in the financial year.';
    default:
      return null;
  }
}

/**
 * Pulls the trailing "Source: ..." sentence out of `conditions` so it can be
 * styled as provenance rather than as part of the rule itself.
 */
function splitSource(conditions: string): { body: string; source: string | null } {
  const match = conditions.match(/\s*Source:\s*([^]*?)\s*$/);
  if (!match) {
    return { body: conditions.trim(), source: null };
  }
  return {
    body: conditions.slice(0, match.index).trim(),
    source: match[1].trim(),
  };
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
        const heading = group.rows.find((row) => row.description)?.description ?? humanise(group.benefitType);

        return (
          <section key={group.benefitType}>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-gov-blue-dark">{heading}</h3>
              {group.benefitType !== heading ? (
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {humanise(group.benefitType)}
                </span>
              ) : null}
            </div>

            <ul className="space-y-2">
              {group.rows.map((row) => {
                const { body, source } = row.conditions
                  ? splitSource(row.conditions)
                  : { body: '', source: null };
                const basisNote = describeBasis(row.amount_basis);

                return (
                  <li className="rounded border border-slate-200 bg-slate-50 px-3 py-2.5" key={row.id}>
                    {row.frequency || row.currency ? (
                      <p className="mb-1 flex flex-wrap items-center gap-1.5">
                        {row.frequency ? <Badge tone="blue">{humaniseFrequency(row.frequency)}</Badge> : null}
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

                    {body ? (
                      <p className="mt-1.5 text-[12px] leading-snug text-slate-600">{body}</p>
                    ) : null}

                    {source ? (
                      <p className="mt-1.5 text-[11px] italic leading-snug text-slate-400">Source: {source}</p>
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
