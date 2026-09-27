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
 * text: category_requirement is "ST (Scheduled Tribe)" and
 * residency_requirement is "As per state/UT norms" rather than a list of
 * states. Only the numeric columns are therefore compared. The descriptive
 * columns are reported for a human to verify instead of being pattern-matched,
 * because a wrong match here tells a genuinely eligible applicant that they
 * are not eligible.
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
  if (typeof eligibility.min_age === 'number') {
    if (applicant.age === null) {
      missing.push('Age not provided in profile');
    } else if (applicant.age < eligibility.min_age) {
      unmet.push(`Below minimum age: ${applicant.age} < ${eligibility.min_age}`);
    } else {
      matched.push(`Age: ${applicant.age} (minimum ${eligibility.min_age})`);
    }
  }

  if (typeof eligibility.max_age === 'number') {
    if (applicant.age === null) {
      missing.push('Age not provided in profile');
    } else if (applicant.age > eligibility.max_age) {
      unmet.push(`Above maximum age: ${applicant.age} > ${eligibility.max_age}`);
    } else {
      matched.push(`Age: ${applicant.age} (maximum ${eligibility.max_age})`);
    }
  }

  // Family income ceiling
  // max_income is null on a scheme whose guideline sets no income criterion,
  // such as the National Fellowship, so this check is skipped for it rather
  // than treated as an unmet requirement.
  if (typeof eligibility.max_income === 'number') {
    if (applicant.annual_income === null) {
      missing.push('Annual family income not provided in profile');
    } else if (applicant.annual_income > eligibility.max_income) {
      unmet.push(
        `Annual family income ${formatInr(applicant.annual_income)} exceeds the limit of ${formatInr(eligibility.max_income)}`,
      );
    } else {
      matched.push(
        `Annual family income ${formatInr(applicant.annual_income)} within the limit of ${formatInr(eligibility.max_income)}`,
      );
    }
  }

  // Academic percentage floor
  if (typeof eligibility.min_percentage === 'number') {
    if (applicant.previous_percentage === null) {
      missing.push('Previous percentage not provided in profile');
    } else if (applicant.previous_percentage < eligibility.min_percentage) {
      unmet.push(
        `Previous percentage ${applicant.previous_percentage}% is below the required ${eligibility.min_percentage}%`,
      );
    } else {
      matched.push(
        `Previous percentage ${applicant.previous_percentage}% meets the required ${eligibility.min_percentage}%`,
      );
    }
  }

  // There is no hosteller gate here. `scheme_eligibility` has no boolean
  // hosteller column, because none of the guidelines restrict a scheme to
  // hostelers. Hosteller figures live in `scheme_benefits`, so the amount is
  // shown on the Financial benefits tab instead of being used as a pass/fail
  // eligibility rule here.

  // Descriptive columns: surfaced for verification, never pattern-matched.
  const descriptive: Array<[string, string[] | string | null]> = [
    ['Eligible categories', eligibility.category_requirement],
    ['Gender', eligibility.gender_requirement],
    ['Disability', eligibility.disability_requirement],
    ['Qualifying examination', eligibility.qualification_requirement],
    ['Course level', eligibility.course_requirement],
    ['Institution', eligibility.institution_requirement],
    ['State / domicile', eligibility.residency_requirement],
    ['Attendance and conduct', eligibility.attendance_requirement],
    ['Admission', eligibility.admission_requirement],
    ['Limits and caps', eligibility.cap_requirement],
  ];
  for (const [label, value] of descriptive) {
    const text = describeList(value);
    if (text) {
      missing.push(`${label}: ${text}`);
    }
  }

  const otherRules = describeRules(eligibility.other_conditions);
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