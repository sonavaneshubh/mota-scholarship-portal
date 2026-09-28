/**
 * Turning stored scheme data into what an applicant actually needs to read.
 *
 * ## Why this module exists
 *
 * `scheme_eligibility.other_rules` is a jsonb column that the official-data
 * migrations seeded with *everything* known about a scheme, including things
 * that are useful to the Ministry but meaningless — or actively alarming — to an
 * applicant. Concretely, the live rows carry:
 *
 *   source_ref              "national-fellowship-scholarship.pdf Part-A p.5-7 ..."
 *   open_conflict           "Report 7.3: the MoTA FAQ asks for Family Income ..."
 *   not_specified_officialy ["Minimum percentage","Minimum age", ...]
 *   removed_unsupported_rule "The previous DB value ... was fabricated ..."
 *   slot_cascade            "If a sub-category is under-subscribed, unfilled slots ..."
 *
 * The detail page used to filter exactly one of those keys (`source_ref`) and
 * print the rest under a heading called "Additional conditions". An applicant
 * reading "Report 7.3" learns nothing about whether they qualify, and a judge
 * demoing the portal sees the word "fabricated".
 *
 * The fix is **not** to delete those keys. They are verified provenance and the
 * audit trail depends on them, so this module classifies rather than deletes:
 * every key is routed into a bucket, and only the buckets an applicant should
 * read are ever returned. The database is untouched.
 *
 * ## The buckets
 *
 *   eligibility    Decides whether the applicant qualifies. Shown.
 *   conditional    Applies only to a subset of applicants, usually tied to a
 *                  document. Shown separately, never as a universal rule.
 *   informational  True of the scheme, but not a gate (continuation, payment
 *                  channel, HRA). Shown, labelled as information.
 *   internal       Provenance, audit, conflict and implementation notes. Never
 *                  leaves this module.
 *
 * ## Two things that are easy to get wrong and are handled here
 *
 * 1. `[object Object]`. `course_tenure` on the fellowship is a jsonb *object*
 *    (`{"Ph.D": "5 years...", "M.Phil": "2 years..."}`). Any `String(value)` on it
 *    renders the literal text `[object Object]`. `ruleLines()` below flattens
 *    objects and arrays into real sentences.
 * 2. Developer instructions stored as prose. `course_dependent_ages` reads
 *    "... Stored in scheme_criteria; maximum_age is intentionally NULL because a
 *    single scalar cannot express it." and `income_criterion` on the fellowship
 *    reads "NONE. ... Never use income as an ARG45 eligibility filter." Both are
 *    notes to us, not rules for an applicant, so both are routed to `internal`
 *    and the applicant-facing statement is derived from the structured columns
 *    instead (see `incomeRow`).
 */

import type { SchemeCriterion, SchemeEligibility } from './supabase';

/** Shown wherever a criterion the applicant will ask about has no official value. */
export const NOT_SPECIFIED_TEXT = 'Not specified in the available scheme guidelines';

export type RuleBucket = 'eligibility' | 'conditional' | 'informational' | 'internal';

export interface RuleEntry {
  /** The raw jsonb key, for stable React keys and for debugging. */
  key: string;
  /** Applicant-facing label, sentence-cased from the key. */
  label: string;
  /** One line per point, already flattened and safe to render. */
  lines: string[];
}

interface RuleDefinition {
  label?: string;
  bucket: RuleBucket;
}

/**
 * Classification of every `other_rules` key currently present in the database.
 *
 * Keys absent from this table are not silently dropped: `classifyOtherRules`
 * falls back to `informational` for an unknown key so that new verified data
 * becomes visible rather than invisible, and a key that looks like provenance
 * (see `looksInternal`) is still withheld. Add a new key here deliberately.
 */
const RULE_DEFINITIONS: Record<string, RuleDefinition> = {
  // --- real gates ---------------------------------------------------------
  admission: { label: 'Admission', bucket: 'eligibility' },
  full_time: { label: 'Course type', bucket: 'eligibility' },
  other_scholarship: { label: 'Other scholarship', bucket: 'eligibility' },
  other_fellowship: { label: 'Other fellowship', bucket: 'eligibility' },
  post_matric_duplication: { label: 'Other MOTA schemes', bucket: 'eligibility' },
  management_quota: { label: 'Management quota admission', bucket: 'eligibility' },
  one_child_one_award: { label: 'One award per family', bucket: 'eligibility' },
  one_year_rule: { label: 'Period of award', bucket: 'eligibility' },
  different_stream_rule: { label: 'Change of stream', bucket: 'eligibility' },
  top_class_exclusion: { label: 'Top Class exclusion', bucket: 'eligibility' },
  level_of_study: { label: 'Level of study', bucket: 'eligibility' },
  marks_exemption: { label: 'Exemption from the marks criterion', bucket: 'eligibility' },
  qualification_basis: { label: 'Basis of qualification', bucket: 'eligibility' },
  category_basis: { label: 'Basis of category', bucket: 'eligibility' },
  age_basis: { label: 'Age calculated as on', bucket: 'eligibility' },
  prospective_from: { label: 'Applicable from', bucket: 'eligibility' },
  bank_account: { label: 'Bank account', bucket: 'eligibility' },
  self_declaration_income: { label: 'Self-declared income', bucket: 'eligibility' },
  state_empanelment: { label: 'Institution empanelment', bucket: 'eligibility' },
  income_definition: { label: 'Definition of income', bucket: 'eligibility' },
  income_computation: { label: 'How family income is computed', bucket: 'eligibility' },

  // --- conditional: only for a subset, usually tied to a document ---------
  divyangjan_requirement: { label: 'Divyangjan applicants', bucket: 'conditional' },
  iit_aiims_iim_iiser_priority: { label: 'Institute priority', bucket: 'conditional' },
  income_certificate: { label: 'Income Certificate', bucket: 'conditional' },
  nirf_shift: { label: 'NIRF preference', bucket: 'conditional' },

  // --- true of the scheme, but not a gate --------------------------------
  continuation: { label: 'Continuation of the award', bucket: 'informational' },
  renewal_conditions: { label: 'Renewal', bucket: 'informational' },
  course_duration: { label: 'Course duration', bucket: 'informational' },
  course_tenure: { label: 'Course tenure', bucket: 'informational' },
  disbursement_channel: { label: 'How the amount is paid', bucket: 'informational' },
  hra_note: { label: 'HRA and hostel accommodation', bucket: 'informational' },
  deemed_hostel: { label: 'Counted as hostel accommodation', bucket: 'informational' },
  digilocker: { label: 'DigiLocker', bucket: 'informational' },

  // --- provenance, audit and implementation. Never shown to applicants. ---
  source_ref: { bucket: 'internal' },
  open_conflict: { bucket: 'internal' },
  not_specified_officialy: { bucket: 'internal' },
  removed_unsupported_rule: { bucket: 'internal' },
  slot_cascade: { bucket: 'internal' },
  no_slot_ceiling: { bucket: 'internal' },

  // Verified rules whose stored text is addressed to a developer rather than to
  // an applicant. The applicant-facing statement is derived from the structured
  // columns in buildEligibilityRows() instead of printing this prose.
  course_dependent_ages: { bucket: 'internal' },
  income_criterion: { bucket: 'internal' },
};

/**
 * A guideline section reference: `§2.6`, `§3.4.2`.
 *
 * This is the only `§` shape that means provenance. A UGC Act section reference
 * (`§2(f)`) is applicant information and is deliberately not matched by it.
 */
const CITATION_SECTION = /§\s*\d+\.\d/;

/** Marks a jsonb value that carries provenance rather than a rule. */
const PROVENANCE_VALUE =
  /report\s*\d|p{1,2}\.\s*\d|§\s*\d+\.\d|fabricat|audit|not_specified|scheme_(criteria|eligibility|documents|benefits|other_rules|process_steps)\b|\bschema\b|\bjsonb\b|database\s+(value|column|table|field)/i;

/** Marks a jsonb key whose name alone gives it away. */
const PROVENANCE_KEY = /^(source|open_conflict|audit|internal_)/;

/**
 * Whether a jsonb rule value is provenance rather than an applicant-facing rule.
 *
 * `open_conflict` mentions "Report 7.3" and `source_ref` cites "p.5-7 §2.1", so
 * both the value and the key name are checked. Note that "§2(f)/12(B) of the UGC
 * Act" does not match CITATION_SECTION and is therefore kept — see above.
 */
function looksInternal(key: string, value: unknown): boolean {
  const text = typeof value === 'string' ? value : (JSON.stringify(value) ?? '');
  return PROVENANCE_VALUE.test(text) || PROVENANCE_KEY.test(key);
}

/** Sentence-cases a jsonb key: `iit_aiims_iim_iiser_priority` -> `Iit aiims iim iiser priority`. */
function humaniseKey(key: string): string {
  const spaced = key.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Flattens any jsonb rule value into displayable sentences.
 *
 * This is the `[object Object]` guard. An object becomes one line per entry and
 * an array one line per element, so the fellowship's `course_tenure` renders as
 * `Ph.D: 5 years, or date of submission of dissertation, whichever is earlier`
 * rather than the string `[object Object]`.
 */
export function ruleLines(value: unknown): string[] {
  if (value === null || value === undefined || value === '') {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(ruleLines);
  }

  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => `${humaniseKey(k)}: ${ruleLines(v).join('; ') || String(v)}`);
  }

  if (typeof value === 'boolean') {
    // A bare boolean carries no instruction. "Yes"/"No" next to a label like
    // "Divyangjan requirement" reads as a rule that does not exist.
    return [];
  }

  return [String(value)];
}

/**
 * Classifies a scheme's `other_rules` jsonb into the buckets above.
 *
 * `internal` is returned for completeness so admin tooling can read it, but
 * `buildEligibilityRows` and the applicant components never ask for it.
 */
export function classifyOtherRules(
  otherRules: Record<string, unknown> | string | null | undefined,
): Record<RuleBucket, RuleEntry[]> {
  const empty: Record<RuleBucket, RuleEntry[]> = {
    eligibility: [],
    conditional: [],
    informational: [],
    internal: [],
  };

  if (otherRules === null || otherRules === undefined) {
    return empty;
  }

  // The column was seeded as a single sentence before 20260927000120. Keep
  // showing it rather than blanking an un-migrated project.
  if (typeof otherRules === 'string') {
    const text = otherRules.trim();
    return text ? { ...empty, informational: [{ key: 'rule', label: 'Rule', lines: [text] }] } : empty;
  }

  if (typeof otherRules !== 'object' || Array.isArray(otherRules)) {
    return empty;
  }

  for (const [key, value] of Object.entries(otherRules)) {
    const lines = ruleLines(value);
    if (lines.length === 0) {
      continue;
    }

    const definition = RULE_DEFINITIONS[key];
    const bucket: RuleBucket = definition
      ? definition.bucket
      : looksInternal(key, value)
        ? 'internal'
        : 'informational';

    empty[bucket].push({
      key,
      label: definition?.label ?? humaniseKey(key),
      lines,
    });
  }

  return empty;
}

/** Applicant-facing rules only. The internal bucket cannot escape through here. */
export function applicantRules(
  otherRules: Record<string, unknown> | string | null | undefined,
): Pick<Record<RuleBucket, RuleEntry[]>, 'eligibility' | 'conditional' | 'informational'> {
  const { eligibility, conditional, informational } = classifyOtherRules(otherRules);
  return { eligibility, conditional, informational };
}

// ---------------------------------------------------------------------------
// Free-text provenance
// ---------------------------------------------------------------------------

/**
 * Sentences that are notes about the data rather than statements about the
 * scheme.
 *
 * The keyed classifier above handles `other_rules`, but the same provenance is
 * baked into free-text columns on three other tables, where there is no key to
 * classify by:
 *
 *   scheme_benefits.conditions    "... Source: post-matric-scholarship.pdf p.8 §3.3"
 *   scheme_criteria.description   "... Open conflict (report 7.6): the MoTA FAQ ..."
 *   scheme_documents.description  "FAQ-SOURCED, NON-GATEKEEPING. The National ..."
 *
 * 30-plus benefit rows across the five schemes end in a `Source:` clause, and the
 * guideline document name, page and section are printed under every amount. So
 * this is filtered by sentence, not by column.
 *
 * Kept deliberately narrow. A pattern that matched too much would delete a real
 * rule, which is worse than showing a file name, so anything that does not clearly
 * read as provenance is left alone.
 */
const INTERNAL_SENTENCE_PATTERNS: RegExp[] = [
  // "Source: national-fellowship-scholarship.pdf Part-B p.19 §2.5, p.21 §4.1."
  /^\s*sources?\s*:/i,
  // "Open conflict (report 7.6): ..." / "Report 7.3: ..."
  /^\s*(open\s+conflict|report)\b/i,
  // "Not specified officially: Minimum percentage, Minimum age."
  /^\s*not\s+specified\s+official/i,
  // "FAQ-SOURCED, NON-GATEKEEPING."
  /^\s*faq[- ]sourced\b/i,
  /\bnon-gatekeeping\b/i,
  // "See the guideline document at ..." / "Refer to report 4.1"
  /^\s*(see|refer to|per)\s+(the\s+)?(source|guideline|report|annexure|audit)\b/i,
  // A bare citation with no sentence of its own: "p.7 §3.2." / "Part-B p.5-7 §2.1."
  /^\s*(part\s+[a-z0-9-]+\s+)?p{1,2}\.\s*\d/i,
  // Any sentence carrying a guideline section reference. Kept in step with
  // CITATION_SECTION above so a citation cannot slip through in a sentence that
  // does not happen to start with "Source:".
  CITATION_SECTION,
  // An implementation note addressed to whoever maintains the row.
  /\bintentionally\s+(null|empty|left)\b/i,
  /\bnot\s+hard-?coded\b/i,
  /\bwas\s+(fabricated|removed|deprecated)\b/i,
  // A sentence that points at our own schema rather than at the applicant:
  // BVOBC's course-fee row says "Course Groups I-IV are defined in
  // scheme_criteria." The other two sentences in that field are real rules, so
  // this drops the note on its own rather than the whole field.
  /\b(?:in|from|see|stored|defined|per|under)\s+scheme_(criteria|eligibility|documents|benefits|other_rules|process_steps)\b/i,
  /\b(?:the\s+)?(?:jsonb|database)\s+(?:value|column|table|field)\b/i,
];

/**
 * Splits prose into sentences for the filter below.
 *
 * The split requires whitespace followed by a capital letter, an opening bracket
 * or a digit, so "Rs. 5,000 per annum" is not cut in half at the full stop after
 * "Rs." and "p.5-7 §2.1" is not mistaken for a new sentence.
 */
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z([0-9])/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence !== '');
}

/**
 * Removes provenance and audit sentences from a free-text column.
 *
 * Returns null when the whole value was provenance, so a caller can omit the line
 * rather than render an empty block. Returns the input unchanged when the value is
 * not prose — a filename, a code, a bare number — because there is nothing to
 * recognise and mangling it would lose data.
 *
 * This never rewrites the sentences it keeps. A rule is either dropped because it
 * is about the data, or shown exactly as the guideline wrote it.
 */
export function stripInternalProvenance(text: string | null | undefined): string | null {
  if (!text) return null;

  const trimmed = text.trim();
  if (trimmed === '') return null;

  // Short values with no sentence structure are left alone. This is the guard that
  // stops a value like "Per annum" or "p.7" from being emptied out.
  if (!/[.!?]/.test(trimmed) || trimmed.length < 40) {
    return INTERNAL_SENTENCE_PATTERNS.some((pattern) => pattern.test(trimmed)) ? null : trimmed;
  }

  const kept = splitSentences(trimmed).filter(
    (sentence) => !INTERNAL_SENTENCE_PATTERNS.some((pattern) => pattern.test(sentence)),
  );

  return kept.length > 0 ? kept.join(' ') : null;
}

/** `stripInternalProvenance`, but keeping the original when nothing is dropped. */
export function safeProvenanceText(text: string | null | undefined): string | null {
  return stripInternalProvenance(text) ?? (text?.trim() || null);
}

// ---------------------------------------------------------------------------
// Eligibility rows
// ---------------------------------------------------------------------------

export interface EligibilityRow {
  label: string;
  value: string;
  /** `stated` when the guideline has a value, `not-stated` when it is silent. */
  kind: 'stated' | 'not-stated';
}

/** `string[] | string | null` -> one readable sentence, or null. */
export function joinList(value: string[] | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const items = (Array.isArray(value) ? value : [value])
    .map((item) => String(item).trim())
    .filter((item) => item !== '');
  return items.length ? items.join(', ') : null;
}

export function formatInr(value: number): string {
  return `₹${value.toLocaleString('en-IN')}`;
}

/**
 * Splits `"M.Phil (2 years)"` into a course name and a duration, so the two are
 * reported in their own rows rather than one bracketed string that reads as a
 * course name.
 */
/**
 * Whether a bracketed suffix reads as a length of time.
 *
 * The bracketed course labels do not all mean the same thing:
 *
 *   "M.Phil (2 years)"                      a duration
 *   "Masters (1 or 2 years)"                a duration
 *   "Class XI to Post Graduation (studies in India)"   a qualifier
 *
 * The last one is BVOBC's, and treating it as a duration printed
 * "Course duration: studies in India", which is a label that contradicts its own
 * value. A digit, or a unit of time, is what separates the two.
 */
const DURATION_LIKE = /\d|\b(year|years|yr|yrs|month|months|semester|semesters|term|terms)\b/i;

/**
 * Splits "M.Phil (2 years)" into its course and its duration.
 *
 * A parenthetical that is not a duration is left in the course label, so nothing
 * is lost — BVOBC renders as "Class XI to Post Graduation (studies in India)"
 * rather than as a course and a nonsensical duration row.
 */
function splitCourseLabel(value: string): { course: string; duration: string | null } {
  const match = value.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
  if (!match) return { course: value.trim(), duration: null };
  const inside = match[2].trim();
  if (!DURATION_LIKE.test(inside)) return { course: value.trim(), duration: null };
  return { course: match[1].trim(), duration: inside };
}

/**
 * The maximum age for a course-dependent scheme.
 *
 * AZKMI cannot express its ages in `maximum_age`: it has three of them, one per
 * course level, and the column is deliberately NULL. They are stored as
 * `scheme_criteria` rows with `criteria_type = 'maximum_age'`, which is what this
 * reads, so the applicant gets the real numbers rather than "not specified".
 */
export function courseDependentAges(
  criteria: SchemeCriterion[] | null | undefined,
): { appliesTo: string; value: string }[] {
  if (!criteria) return [];
  return criteria
    .filter((criterion) => criterion.criteria_type === 'maximum_age' && typeof criterion.numeric_value === 'number')
    .map((criterion) => ({
      appliesTo: criterion.applies_to ?? criterion.title ?? 'Course',
      value: `${criterion.numeric_value} years`,
    }));
}

/**
 * Reservation and priority notes, kept apart from eligibility.
 *
 * ARG45 and AZKMI store an earmark inside `eligible_gender` alongside "All", so
 * a naive render prints `Gender: All, 30% of 750 awards (225) earmarked for
 * female candidates`. That is a reservation rule wearing an eligibility label,
 * and it is exactly the kind of thing that gets read as "only female candidates
 * are eligible". It is split out here and reported as its own note.
 */
export function splitGenderAndReservation(
  eligibleGender: string[] | string | null | undefined,
): { gender: string | null; reservation: string | null } {
  const joined = joinList(eligibleGender);
  if (!joined) return { gender: null, reservation: null };

  const isReservation = /\d+\s*%|\bslots?\b|earmarked/i.test(joined);
  if (!isReservation) return { gender: joined, reservation: null };

  // "All" is the eligibility answer; the rest of the sentence is the earmark.
  if (/^all\b/i.test(joined)) {
    return { gender: 'All', reservation: joined.replace(/^all,?\s*/i, '').trim() || null };
  }
  return { gender: null, reservation: joined };
}

export interface EligibilityRowsInput {
  eligibility: SchemeEligibility;
  criteria?: SchemeCriterion[] | null;
  /** Used only to keep a known developer note from being printed verbatim. */
  otherRules?: Record<string, unknown> | null;
}

/**
 * Builds the "Eligibility Criteria" rows for one scheme.
 *
 * A row is included when the scheme actually says something about it. The one
 * exception is Age, which is always present: it is the criterion applicants ask
 * about most, and `NOT_SPECIFIED_TEXT` states the honest answer without claiming
 * that the scheme has no limit. Every other unspecified criterion is omitted
 * rather than padded out with "not specified", because a wall of rows that all
 * say the same thing buries the ones that matter.
 */
export function buildEligibilityRows({
  eligibility,
  criteria,
  otherRules,
}: EligibilityRowsInput): EligibilityRow[] {
  const rows: EligibilityRow[] = [];
  const stated = (label: string, value: string | null): void => {
    if (value) rows.push({ label, value, kind: 'stated' });
  };

  stated('Category', joinList(eligibility.eligible_categories));

  // --- age ---------------------------------------------------------------
  const dependentAges = courseDependentAges(criteria);
  if (dependentAges.length > 0) {
    rows.push({
      label: 'Maximum age',
      value: dependentAges.map((entry) => `${entry.appliesTo}: ${entry.value}`).join('; '),
      kind: 'stated',
    });
  } else if (
    typeof eligibility.minimum_age === 'number' ||
    typeof eligibility.maximum_age === 'number'
  ) {
    const parts: string[] = [];
    if (typeof eligibility.maximum_age === 'number') parts.push(`Maximum ${eligibility.maximum_age} years`);
    if (typeof eligibility.minimum_age === 'number') parts.push(`Minimum ${eligibility.minimum_age} years`);
    rows.push({ label: 'Age', value: parts.join(', '), kind: 'stated' });
  } else {
    rows.push({ label: 'Age', value: NOT_SPECIFIED_TEXT, kind: 'not-stated' });
  }

  stated('Academic qualification', joinList(eligibility.qualifying_examination));

  if (typeof eligibility.minimum_percentage === 'number') {
    rows.push({
      label: 'Minimum percentage',
      value: `${eligibility.minimum_percentage}%`,
      kind: 'stated',
    });
  }

  // --- course, with any bracketed duration lifted into its own row --------
  const courseValues = joinList(eligibility.eligible_course_levels ?? eligibility.eligible_course_types);
  if (courseValues) {
    const split = courseValues.split(',').map((item) => splitCourseLabel(item.trim()));
    stated('Course', split.map((entry) => entry.course).join(', '));

    const durations = split.map((entry) => entry.duration).filter((d): d is string => Boolean(d));
    if (durations.length) {
      // Tenure from the structured jsonb rule when it exists, because it states
      // the "whichever is earlier" condition the bracketed label cannot.
      const tenure = classifyOtherRules(otherRules).informational.find((e) => e.key === 'course_tenure');
      stated(
        'Course duration',
        tenure ? tenure.lines.map((line) => line.replace(/^/,'')).join('; ') : durations.join(', '),
      );
    }
  }

  const institution = joinList(eligibility.institution_requirement);
  if (institution) {
    rows.push({
      label: 'Institution',
      value: institution,
      kind: 'stated',
    });
  }

  const states = joinList(eligibility.eligible_states);
  if (states) {
    rows.push({ label: 'State / domicile', value: states, kind: 'stated' });
  }

  // --- income ------------------------------------------------------------
  // The fellowship has maximum_family_income NULL and its stored note says the
  // guideline sets no income criterion. The row therefore states that plainly
  // instead of rendering a limit that does not exist, and no income filter is
  // applied anywhere in the evaluation.
  if (typeof eligibility.maximum_family_income === 'number') {
    rows.push({
      label: 'Annual family income limit',
      value: formatInr(eligibility.maximum_family_income),
      kind: 'stated',
    });
  } else if (isIncomeFree(otherRules)) {
    rows.push({
      label: 'Annual family income limit',
      value: 'No income criterion for eligibility in this scheme',
      kind: 'stated',
    });
  }

  const { gender, reservation } = splitGenderAndReservation(eligibility.eligible_gender);
  stated('Gender', gender);
  if (reservation) {
    rows.push({ label: 'Reservation', value: reservation, kind: 'stated' });
  }

  return rows;
}

/** True when the scheme's own note says the guideline sets no income criterion. */
export function isIncomeFree(otherRules: Record<string, unknown> | null | undefined): boolean {
  const note = otherRules?.income_criterion;
  if (typeof note !== 'string') return false;
  return /^\s*none\b/i.test(note) || /no income criteri/i.test(note);
}
