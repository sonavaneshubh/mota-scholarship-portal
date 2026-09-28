/**
 * Presentation helpers for `scheme_benefits` rows.
 *
 * Shared by the scheme detail page and the application form, which render the
 * same benefit rows for the same applicant in different layouts. They live here
 * rather than in either component so the two screens cannot drift into wording
 * the same amount two different ways, and so a component file keeps exporting
 * only components.
 */

/**
 * Sentence-cases a storage key: 'day_scholar' -> 'Day scholar'.
 *
 * `benefit_type` is the storage key, not a heading. It is only ever a fallback
 * for a row with no description to name it with, because printing it as a title
 * put a line of scaffolding in front of every benefit: "course fee private
 * engineering ceiling", "stipend group i day scholar", "disability allowance
 * hosteller". The description is already a sentence written for the applicant,
 * so it is the preferred title.
 */
export function humaniseBenefitType(value: string): string {
  const text = value.replace(/_/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Spoken form of a `frequency` value, e.g. 'monthly' -> 'Monthly'. */
export function humaniseBenefitFrequency(value: string): string {
  return humaniseBenefitType(value);
}

/**
 * What a NULL `amount` means, in words, taken from `amount_basis`.
 *
 * A NULL amount is a real answer, not a gap: the guideline states no fixed figure
 * because the amount is as-per-actuals, decided by a State fee fixation
 * committee, or a percentage of another figure. Rendering a missing amount as
 * ₹0 would tell an applicant they get nothing, and the generic "not specified"
 * line is worse still, because the reason is usually known and recorded.
 *
 * Returns null when there is no amount and no basis to explain it, so the caller
 * can fall back to the generic message.
 */
export function describeBenefitBasis(basis: string | null | undefined): string | null {
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
