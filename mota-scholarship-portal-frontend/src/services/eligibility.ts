import type { 
  SchemeEligibility, 
  ApplicantProfileForEligibility, 
  EligibilityEvaluation, 
} from '../lib/supabase';

/**
 * Indian-format rupee amount, e.g. 250000 -> "₹2,50,000".
 *
 * Exported because money is rendered in three places (this module, the scheme
 * benefit table, and the application summary) and a fourth private copy is how
 * the lakh separator quietly ends up applied to only some of them.
 */
export function formatInr(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`;
}

/**
 * Formats a benefit amount in the currency the guideline actually states.
 *
 * Most components are INR, but the National Overseas Scholarship quotes its
 * maintenance and contingency allowances in USD (United States) and GBP (United
 * Kingdom), and one incidental item in USD. Rendering all of them with a rupee
 * sign would be wrong, and converting them would mean inventing an exchange rate
 * the guidelines never state, so each currency is shown as itself.
 */
export function formatMoney(amount: number, currency: string | null | undefined): string {
  const code = (currency ?? 'INR').toUpperCase();
  const formatted = amount.toLocaleString('en-IN');

  switch (code) {
    case 'INR':
      return `₹${formatted}`;
    case 'USD':
      return `US$ ${formatted}`;
    case 'GBP':
      return `£${formatted}`;
    default:
      return `${code} ${formatted}`;
  }
}

/**
 * Renders a free-text requirement column, which is either a string or a jsonb
 * object depending on how the row was seeded.
 */
export function describeList(value: string[] | string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const items = Array.isArray(value) ? value : [value];
  const text = items
    .map((item) => String(item).trim())
    .filter((item) => item !== '')
    .join(', ');
  return text || null;
}

export function describeRules(value: Record<string, unknown> | string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    return value.trim() || null;
  }
  if (typeof value === 'object') {
    const text = Object.entries(value)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${String(v)}`)
      .join('; ');
    return text || null;
  }
  return String(value);
}

/**
 * Evaluate applicant eligibility against scheme requirements.
 * Returns ELIGIBLE, NOT_ELIGIBLE, or NEEDS_REVIEW.
 *
 * The scheme_eligibility columns mix machine-comparable numbers with free
 * text: eligible_categories is ["ST (Scheduled Tribe)"] and eligible_states is
 * ["As per state/UT norms"] rather than a list of states. Only the numeric
 * columns are therefore compared. The descriptive columns are reported for a
 * human to verify instead of being pattern-matched, because a wrong match here
 * tells a genuinely eligible applicant that they are not eligible.
 *
 * Only the live columns are read. A requirement with no column behind it is not
 * guessed at: it simply produces no rule and no statement, because there is
 * nothing in the database to base one on.
 */
export function evaluateEligibility(
  eligibility: SchemeEligibility | null,
  applicant: ApplicantProfileForEligibility
): EligibilityEvaluation {
  const matched: string[] = [];
  const missing: string[] = [];
  const unmet: string[] = [];

  if (!eligibility) {
    return {
      result: 'NEEDS_REVIEW',
      reasons: ['No eligibility data available for this scheme'],
      matched: [],
      missing: ['Complete eligibility data'],
    };
  }

  // Age limits
  if (typeof eligibility.minimum_age === 'number') {
    if (applicant.age === null) {
      missing.push('Age not provided in profile');
    } else if (applicant.age < eligibility.minimum_age) {
      unmet.push(`Below minimum age: ${applicant.age} < ${eligibility.minimum_age}`);
    } else {
      matched.push(`Age: ${applicant.age} (minimum ${eligibility.minimum_age})`);
    }
  }

  if (typeof eligibility.maximum_age === 'number') {
    if (applicant.age === null) {
      missing.push('Age not provided in profile');
    } else if (applicant.age > eligibility.maximum_age) {
      unmet.push(`Above maximum age: ${applicant.age} > ${eligibility.maximum_age}`);
    } else {
      matched.push(`Age: ${applicant.age} (maximum ${eligibility.maximum_age})`);
    }
  }

  // Family income ceiling.
  // maximum_family_income is NULL both when a scheme has no income criterion and
  // when the figure was simply never recorded, and the two are not
  // distinguishable from this row alone. Either way the check is skipped rather
  // than treated as an unmet requirement, so a missing figure can never be
  // reported to an applicant as a failure.
  if (typeof eligibility.maximum_family_income === 'number') {
    if (applicant.annual_income === null) {
      missing.push('Annual family income not provided in profile');
    } else if (applicant.annual_income > eligibility.maximum_family_income) {
      unmet.push(
        `Annual family income ${formatInr(applicant.annual_income)} exceeds the limit of ${formatInr(eligibility.maximum_family_income)}`,
      );
    } else {
      matched.push(
        `Annual family income ${formatInr(applicant.annual_income)} within the limit of ${formatInr(eligibility.maximum_family_income)}`,
      );
    }
  }

  // Academic percentage floor
  if (typeof eligibility.minimum_percentage === 'number') {
    if (applicant.previous_percentage === null) {
      missing.push('Previous percentage not provided in profile');
    } else if (applicant.previous_percentage < eligibility.minimum_percentage) {
      unmet.push(
        `Previous percentage ${applicant.previous_percentage}% is below the required ${eligibility.minimum_percentage}%`,
      );
    } else {
      matched.push(
        `Previous percentage ${applicant.previous_percentage}% meets the required ${eligibility.minimum_percentage}%`,
      );
    }
  }

  // `required_hosteller` exists on the row, but is false for every published
  // scheme, so there is no hosteller gate to apply. Any hosteller-specific
  // figures would be benefit amounts, not an eligibility condition.

  // Descriptive columns: surfaced for verification, never pattern-matched.
  // The course requirement is recorded in `eligible_course_types` on the
  // current rows; `eligible_course_levels` is the other course column and is
  // NULL, so it is used only as a fallback.
  const courseText =
    describeList(eligibility.eligible_course_levels) ?? describeList(eligibility.eligible_course_types);

  const descriptive: Array<[string, string | null]> = [
    ['Eligible categories', describeList(eligibility.eligible_categories)],
    ['Gender', describeList(eligibility.eligible_gender)],
    ['Course', courseText],
    ['State / domicile', describeList(eligibility.eligible_states)],
  ];
  for (const [label, value] of descriptive) {
    if (value) {
      missing.push(`${label}: ${value}`);
    }
  }

  const otherRules = describeRules(eligibility.other_rules);
  if (otherRules) {
    missing.push(`Other rules: ${otherRules}`);
  }

  if (unmet.length > 0) {
    return {
      result: 'NOT_ELIGIBLE',
      reasons: [`Requirements not met: ${unmet.join('; ')}`],
      matched,
      missing: [...unmet, ...missing],
    };
  }

  if (missing.length > 0) {
    return {
      result: 'NEEDS_REVIEW',
      reasons: ['Some requirements need verification against your profile'],
      matched,
      missing,
    };
  }

  return {
    result: 'ELIGIBLE',
    reasons: ['All checkable requirements met'],
    matched,
    missing,
  };
}

/**
 * Evaluate eligibility for multiple schemes
 */
export function evaluateMultipleSchemes(
  schemes: Array<{ id: string; eligibility: SchemeEligibility | null }>,
  applicant: ApplicantProfileForEligibility
): Map<string, EligibilityEvaluation> {
  const results = new Map<string, EligibilityEvaluation>();
  
  for (const scheme of schemes) {
    results.set(scheme.id, evaluateEligibility(scheme.eligibility, applicant));
  }
  
  return results;
}

/**
 * Get applicant profile data for eligibility evaluation
 */
export function buildApplicantProfile(
  profile: {
    category: string;
    annual_income?: number | null;
    course?: string | null;
    gender?: string | null;
    date_of_birth?: string | null;
    state?: string | null;
    district?: string | null;
    previous_percentage?: number | null;
    admission_mode?: string | null;
    institution_type?: string | null;
    is_hosteller?: boolean | null;
  }
): ApplicantProfileForEligibility {
  let age: number | null = null;
  if (profile.date_of_birth) {
    const dob = new Date(profile.date_of_birth);
    const today = new Date();
    age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
  }

  return {
    category: profile.category,
    annual_income: profile.annual_income ?? null,
    course: profile.course ?? null,
    gender: profile.gender ?? null,
    age,
    state: profile.state ?? null,
    district: profile.district ?? null,
    previous_percentage: profile.previous_percentage ?? null,
    admission_mode: profile.admission_mode ?? null,
    institution_type: profile.institution_type ?? null,
    is_hosteller: profile.is_hosteller ?? null,
  };
}