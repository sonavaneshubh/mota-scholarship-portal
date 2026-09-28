import type {
  SchemeCriterion,
  SchemeEligibility,
  ApplicantProfileForEligibility,
  EligibilityEvaluation,
} from '../lib/supabase';
import type { ProfileData } from '../types/profile';
import {
  applicantRules,
  courseDependentAges,
  formatInr,
  isIncomeFree,
  joinList,
  splitGenderAndReservation,
} from '../lib/schemeEligibilityView';

/**
 * Indian-format rupee amount, e.g. 250000 -> "₹2,50,000".
 *
 * The implementation moved to lib/schemeEligibilityView.ts so that the
 * eligibility table and the evaluation agree on how money is written; it is
 * re-exported here because the scheme benefit table and the application summary
 * already import it from this module. One implementation, one lakh separator.
 */
export { formatInr };

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
  return joinList(value);
}

/**
 * A one-line summary of a scheme's `other_rules`, for places with room for a
 * single sentence.
 *
 * Reads through the classifier rather than stringifying the jsonb directly, so
 * two things it used to do cannot happen again:
 *
 *   - `course_tenure` is a jsonb object on the fellowship, and `String(value)` on
 *     an object renders the literal text `[object Object]`;
 *   - `source_ref`, `open_conflict`, `not_specified_officialy` and
 *     `removed_unsupported_rule` are audit notes about the data, and one of them
 *     reads "The previous DB value ... was fabricated". None of them are
 *     conditions an applicant satisfies.
 *
 * The two buckets that remain are joined with a semicolon; callers that need the
 * rules broken out should use `applicantRules()` directly.
 */
export function describeRules(value: Record<string, unknown> | string | null | undefined): string | null {
  const { eligibility, conditional, informational } = applicantRules(value);
  const lines = [...eligibility, ...conditional, ...informational]
    .flatMap((entry) => entry.lines.map((line) => `${entry.label}: ${line}`));
  return lines.length ? lines.join('; ') : null;
}

/**
 * Evaluate applicant eligibility against scheme requirements.
 * Returns ELIGIBLE, NOT_ELIGIBLE, or NEEDS_REVIEW.
 *
 * ## What counts as a check
 *
 * Only the numeric columns are compared, because those are the only ones that can
 * be decided from a profile without guessing:
 *
 *   `minimum_age` / `maximum_age` / `maximum_family_income` / `minimum_percentage`
 *
 * Everything else in `scheme_eligibility` is descriptive text. `eligible_categories`
 * is `["ST (Scheduled Tribe)"]` and `eligible_states` is `["As per state/UT norms"]`
 * rather than a list of states, so there is nothing to compare an applicant's
 * answer against. Those requirements are reported in `toConfirm` — to be
 * satisfied from the uploaded certificates and confirmed by review — and they no
 * longer count as a failure.
 *
 * This distinction is the difference between a usable and an unusable result. The
 * previous version pushed every descriptive field into `missing`, and `missing`
 * forces NEEDS_REVIEW, so the *only* possible outcomes were NEEDS_REVIEW and
 * NOT_ELIGIBLE. ELIGIBLE was unreachable for every applicant of every scheme, and
 * the "Still to confirm" list read "Course: M.Phil, Ph.D; Gender: All, 30% of 750
 * awards (225) earmarked for female candidates" — a sentence that describes the
 * scheme, not the applicant.
 *
 * ## The three outcomes
 *
 *   NOT_ELIGIBLE  A numeric requirement is provably not met.
 *   NEEDS_REVIEW  A numeric requirement cannot be decided because the profile
 *                 is missing that value.
 *   ELIGIBLE      Every decidable requirement is met. Requirements that need a
 *                 certificate or a committee are still listed in `toConfirm`.
 *
 * A missing profile value is never reported as a failure, and an internal
 * metadata key never appears in any of the three lists.
 *
 * @param criteria `scheme_criteria` rows for the same scheme. Needed because
 *        AZKMI's maximum age is three course-dependent values, which the single
 *        `maximum_age` column cannot hold and which is therefore NULL.
 */
export function evaluateEligibility(
  eligibility: SchemeEligibility | null,
  applicant: ApplicantProfileForEligibility,
  criteria?: SchemeCriterion[] | null,
): EligibilityEvaluation {
  const matched: string[] = [];
  const missing: string[] = [];
  const unmet: string[] = [];
  const toConfirm: string[] = [];

  if (!eligibility) {
    return {
      result: 'NEEDS_REVIEW',
      reasons: ['No eligibility data available for this scheme'],
      matched: [],
      missing: ['Complete eligibility data'],
      toConfirm: [],
    };
  }

  // --- age ----------------------------------------------------------------
  // Course-dependent ages are checked first: AZKMI has three of them and leaves
  // `maximum_age` NULL, so a scalar comparison would find nothing to check and
  // the applicant would be told they meet a limit that was never tested.
  const dependentAges = courseDependentAges(criteria);
  if (dependentAges.length > 0) {
    const bounds = dependentAges.map((entry) => entry.value).join(' / ');
    if (applicant.age === null) {
      missing.push(`Date of birth not provided in profile (needed for the ${bounds} course-wise limit)`);
    } else {
      const breached = dependentAges.filter((entry) => {
        const limit = Number.parseInt(entry.value, 10);
        return Number.isFinite(limit) && applicant.age! > limit;
      });
      if (breached.length === dependentAges.length) {
        unmet.push(
          `Above the maximum age for every course offered (youngest limit ${bounds}; applicant is ${applicant.age})`,
        );
      } else if (breached.length === 0) {
        matched.push(`Age: ${applicant.age} is within every course limit (${bounds})`);
      } else {
        // Passes some courses and not others. Not a rejection: the course the
        // applicant will actually apply to decides it, which only the application
        // form can supply.
        toConfirm.push(
          `Maximum age depends on the course applied for (${dependentAges
            .map((entry) => `${entry.appliesTo}: ${entry.value}`)
            .join('; ')})`,
        );
      }
    }
  } else {
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
  }

  // --- family income ------------------------------------------------------
  // `maximum_family_income` is NULL on ARG45 because the guideline states there
  // is no income criterion, and it is also NULL wherever a figure was simply never
  // recorded. The scheme's own note tells those two cases apart, so a NULL with
  // that note skips the check completely rather than inventing a ceiling. ARG45
  // must never gain an income filter from this code path.
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
  } else if (isIncomeFree(eligibility.other_rules)) {
    toConfirm.push('This scheme sets no family income criterion for eligibility.');
  }

  // --- academic percentage ------------------------------------------------
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
  // figures would be benefit amounts, not an eligibility condition. ARG45's
  // `hra_note` says exactly this, and is reported as scheme information.

  // --- descriptive requirements ------------------------------------------
  // Listed for the applicant to satisfy with a document. Never compared, never
  // counted as unmet, and never able to force NEEDS_REVIEW on their own.
  const courseText = joinList(eligibility.eligible_course_levels) ?? joinList(eligibility.eligible_course_types);
  const { gender } = splitGenderAndReservation(eligibility.eligible_gender);

  const descriptive: Array<[string, string | null]> = [
    ['Category', joinList(eligibility.eligible_categories)],
    ['Gender', gender],
    ['Qualifying examination', joinList(eligibility.qualifying_examination)],
    ['Course', courseText],
    ['Institution', joinList(eligibility.institution_requirement)],
    ['State / domicile', joinList(eligibility.eligible_states)],
  ];
  for (const [label, value] of descriptive) {
    if (value) {
      toConfirm.push(`${label}: ${value}`);
    }
  }

  if (unmet.length > 0) {
    return {
      result: 'NOT_ELIGIBLE',
      reasons: [`Requirements not met: ${unmet.join('; ')}`],
      matched,
      missing: [...unmet, ...missing],
      toConfirm,
    };
  }

  if (missing.length > 0) {
    return {
      result: 'NEEDS_REVIEW',
      reasons: ['Complete your profile to finish checking the requirements below'],
      matched,
      missing,
      toConfirm,
    };
  }

  return {
    result: 'ELIGIBLE',
    reasons: ['All checkable requirements met'],
    matched,
    missing,
    toConfirm,
  };
}

/**
 * Evaluate eligibility for multiple schemes
 */
export function evaluateMultipleSchemes(
  schemes: Array<{ id: string; eligibility: SchemeEligibility | null; criteria?: SchemeCriterion[] | null }>,
  applicant: ApplicantProfileForEligibility,
): Map<string, EligibilityEvaluation> {
  const results = new Map<string, EligibilityEvaluation>();

  for (const scheme of schemes) {
    results.set(scheme.id, evaluateEligibility(scheme.eligibility, applicant, scheme.criteria));
  }

  return results;
}

/**
 * Age in whole years from a 'YYYY-MM-DD' date of birth.
 *
 * Exported because the age cut-off has to be read the same way everywhere: the
 * fellowship and the overseas scheme both state their limit "as on 1 July of the
 * selection year", and a profile filled in before July must not be compared
 * against a birthday that has not happened yet.
 *
 * A missing or unparseable date is null, never 0. An age of 0 satisfies every
 * minimum-age check in the table, so defaulting to 0 would report a 40-year-old
 * applicant as too young on a scheme with no minimum and as passing on one that
 * has it.
 */
export function ageFromDateOfBirth(
  dateOfBirth: string | null | undefined,
  asOf: Date = new Date(),
): number | null {
  if (!dateOfBirth) return null;

  // Parsed as UTC so that a date-only value is not shifted into the previous day
  // by a negative local timezone offset, which would make someone a year younger.
  const dob = new Date(`${dateOfBirth}T00:00:00Z`);
  if (Number.isNaN(dob.getTime())) return null;

  let age = asOf.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = asOf.getUTCMonth() - dob.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && asOf.getUTCDate() < dob.getUTCDate())) {
    age--;
  }
  return age >= 0 ? age : null;
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
    admission_mode?: number | string | null;
    institution_type?: string | null;
    is_hosteller?: boolean | null;
  },
  asOf?: Date,
): ApplicantProfileForEligibility {
  return {
    category: profile.category,
    annual_income: profile.annual_income ?? null,
    course: profile.course ?? null,
    gender: profile.gender ?? null,
    age: ageFromDateOfBirth(profile.date_of_birth, asOf),
    state: profile.state ?? null,
    district: profile.district ?? null,
    previous_percentage: profile.previous_percentage ?? null,
    admission_mode: profile.admission_mode == null ? null : String(profile.admission_mode),
    institution_type: profile.institution_type ?? null,
    is_hosteller: profile.is_hosteller ?? null,
  };
}

/**
 * Build the eligibility input from the applicant's own profile tables.
 *
 * This is the mapping the scheme detail page used to skip. It read
 * `user_metadata` off the auth session and passed `null` for income, date of
 * birth, gender and previous percentage, so the only requirements it could ever
 * decide were the ones the applicant had typed into the signup form. An
 * applicant who had filled in the profile properly was still told their age was
 * "not provided", and every income-limited scheme sent them to NEEDS_REVIEW.
 *
 * Each field below is the column an administrator sees on the same screen, so
 * the portal and the review queue cannot disagree:
 *
 *   category             applicant_caste_details.category
 *   annual_income        applicant_income_details.annual_income
 *   date_of_birth        applicant_profiles.date_of_birth
 *   gender               applicant_profiles.gender
 *   course               applicant_current_courses.course_name
 *   state/district       applicant_address_details, correspondence first
 *   previous_percentage  newest applicant_qualifications row with a percentage
 *   admission_mode       applicant_current_courses.admission_type
 *   is_hosteller         an applicant_hostel_details row exists
 *
 * Every value is nullable and stays null when absent. Nothing is defaulted,
 * because a default is a claim about the applicant that the database does not
 * support.
 */
export function buildApplicantProfileFromProfileData(
  data: ProfileData,
  asOf?: Date,
): ApplicantProfileForEligibility {
  // `qualifications` arrives ordered by passing_year descending, so the first row
  // with a percentage is the most recent one. Falling back through the list means
  // an applicant whose latest qualification has no percentage yet (a course in
  // progress) is still measured on the last completed one.
  const previousPercentage =
    data.qualifications.find((row) => typeof row.percentage === 'number')?.percentage ?? null;

  const address = data.address;

  return buildApplicantProfile(
    {
      category: data.caste?.category ?? '',
      annual_income: data.income?.annual_income ?? null,
      date_of_birth: data.profile?.date_of_birth ?? null,
      gender: data.profile?.gender ?? null,
      course: data.course?.course_name ?? null,
      state: address?.correspondence_state || address?.permanent_state || null,
      district: address?.correspondence_district || address?.permanent_district || null,
      previous_percentage: previousPercentage,
      admission_mode: data.course?.admission_type ?? null,
      institution_type: data.course?.university_name ?? null,
      is_hosteller: data.hostel ? true : null,
    },
    asOf,
  );
}
