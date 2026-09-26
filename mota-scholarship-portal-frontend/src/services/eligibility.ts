import type { 
  SchemeEligibility, 
  ApplicantProfileForEligibility, 
  EligibilityEvaluation, 
} from '../lib/supabase';

/**
 * Evaluate applicant eligibility against scheme requirements
 * Returns ELIGIBLE, NOT_ELIGIBLE, or NEEDS_REVIEW
 */
export function evaluateEligibility(
  eligibility: SchemeEligibility | null,
  applicant: ApplicantProfileForEligibility
): EligibilityEvaluation {
  const matched: string[] = [];
  const missing: string[] = [];

  if (!eligibility) {
    return {
      result: 'NEEDS_REVIEW',
      reasons: ['No eligibility data available for this scheme'],
      matched: [],
      missing: ['Complete eligibility data'],
    };
  }

  // Check category
  if (eligibility.category_requirement) {
    const req = eligibility.category_requirement.toLowerCase();
    const appCat = applicant.category.toLowerCase();
    
    if (req.includes(appCat) || appCat.includes(req) || 
        (req.includes('all') && !req.includes('not'))) {
      matched.push(`Category: ${applicant.category}`);
    } else {
      missing.push(`Category requirement: ${eligibility.category_requirement} (you have: ${applicant.category})`);
    }
  }

  // Check income
  if (eligibility.max_income !== null && eligibility.max_income !== undefined) {
    if (applicant.annual_income === null || applicant.annual_income === undefined) {
      missing.push('Annual income not provided in profile');
    } else if (applicant.annual_income <= eligibility.max_income) {
      matched.push(`Income: ₹${applicant.annual_income.toLocaleString()} ≤ ₹${eligibility.max_income.toLocaleString()}`);
    } else {
      missing.push(`Income exceeds limit: ₹${applicant.annual_income.toLocaleString()} > ₹${eligibility.max_income.toLocaleString()}`);
    }
  } else {
    missing.push('Income limit not specified for this scheme');
  }

  // Check age
  if (eligibility.min_age !== null && eligibility.min_age !== undefined) {
    if (applicant.age === null || applicant.age === undefined) {
      missing.push('Age not provided in profile');
    } else if (applicant.age < eligibility.min_age) {
      missing.push(`Below minimum age: ${applicant.age} < ${eligibility.min_age}`);
    } else {
      matched.push(`Age: ${applicant.age} ≥ ${eligibility.min_age}`);
    }
  }

  if (eligibility.max_age !== null && eligibility.max_age !== undefined) {
    if (applicant.age === null || applicant.age === undefined) {
      missing.push('Age not provided in profile');
    } else if (applicant.age > eligibility.max_age) {
      missing.push(`Above maximum age: ${applicant.age} > ${eligibility.max_age}`);
    } else {
      matched.push(`Age: ${applicant.age} ≤ ${eligibility.max_age}`);
    }
  }

  // Check percentage
  if (eligibility.min_percentage !== null && eligibility.min_percentage !== undefined) {
    if (applicant.previous_percentage === null || applicant.previous_percentage === undefined) {
      missing.push('Previous percentage not provided in profile');
    } else if (applicant.previous_percentage >= eligibility.min_percentage) {
      matched.push(`Percentage: ${applicant.previous_percentage}% ≥ ${eligibility.min_percentage}%`);
    } else {
      missing.push(`Percentage below minimum: ${applicant.previous_percentage}% < ${eligibility.min_percentage}%`);
    }
  }

  // Check course
  if (eligibility.course_requirement) {
    const req = eligibility.course_requirement.toLowerCase();
    const appCourse = (applicant.course || '').toLowerCase();
    
    if (appCourse.includes(req) || req.includes(appCourse)) {
      matched.push(`Course: ${applicant.course}`);
    } else {
      missing.push(`Course requirement: ${eligibility.course_requirement} (you have: ${applicant.course})`);
    }
  }

  // Check admission mode (CAP, etc.)
  if (eligibility.admission_requirement) {
    const req = eligibility.admission_requirement.toLowerCase();
    const appMode = (applicant.admission_mode || '').toLowerCase();
    
    if (req.includes('cap') && !appMode.includes('cap')) {
      missing.push(`Admission through CAP required (your mode: ${applicant.admission_mode || 'not specified'})`);
    } else if (appMode) {
      matched.push(`Admission mode: ${applicant.admission_mode}`);
    }
  }

  // Check institution
  if (eligibility.institution_requirement) {
    // This would need institution data from applicant profile
    missing.push(`Institution requirement check needed: ${eligibility.institution_requirement}`);
  }

  // Check residency
  if (eligibility.residency_requirement) {
    const req = eligibility.residency_requirement.toLowerCase();
    const appState = (applicant.state || '').toLowerCase();
    
    if (req.includes('maharashtra') && !appState.includes('maharashtra')) {
      missing.push(`Domicile requirement: ${eligibility.residency_requirement} (your state: ${applicant.state})`);
    } else if (appState) {
      matched.push(`State: ${applicant.state}`);
    }
  }

  // Determine final result
  if (missing.length > 0) {
    // Check if any missing are critical (income, category, age)
    const criticalMissing = missing.filter(m => 
      m.toLowerCase().includes('income') || 
      m.toLowerCase().includes('category') || 
      m.toLowerCase().includes('age') ||
      m.toLowerCase().includes('percentage')
    );
    
    if (criticalMissing.length > 0) {
      return {
        result: 'NOT_ELIGIBLE',
        reasons: [`Critical requirements not met: ${criticalMissing.join(', ')}`],
        matched,
        missing,
      };
    }
    
    return {
      result: 'NEEDS_REVIEW',
      reasons: [`Some requirements need verification: ${missing.slice(0, 3).join(', ')}`],
      matched,
      missing,
    };
  }

  return {
    result: 'ELIGIBLE',
    reasons: ['All checked requirements met'],
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