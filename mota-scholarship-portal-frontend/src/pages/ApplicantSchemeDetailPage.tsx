import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApplicantApplications } from '../hooks/useApplicantRecords';
import { fetchSchemeDetail } from '../services/schemes';
import type { EligibilityEvaluation, SchemeDetailResponse } from '../lib/supabase';
import {
  buildApplicantProfile,
  describeList,
  evaluateEligibility,
  formatInr,
} from '../services/eligibility';
import { createOrResumeApplication } from '../services/applicantRecords';
import { applicationRouteHandle } from '../lib/applicationHandle';
import { useApplicantAuth } from '../context/useApplicantAuth';
import { ApplicantPageHeader } from '../components/applicant/ApplicantPageHeader';
import { ApplicationStatusBadge } from '../components/applicant/StatusBadge';
import { SchemeBenefitsTable } from '../components/applicant/SchemeBenefitsTable';
import { SchemeCriteriaList } from '../components/applicant/SchemeCriteriaList';
import { SchemeDocumentsChecklist } from '../components/applicant/SchemeDocumentsChecklist';
import { SchemeProcessSteps } from '../components/applicant/SchemeProcessSteps';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Tabs, type TabDefinition } from '../components/ui/Tabs';
import { applicantApplicationPath, INFO_NOT_AVAILABLE, ROUTES } from '../lib/constants';

/**
 * Shown when a scheme has no eligibility row, so the section never silently
 * disappears and the applicant can tell "no criteria recorded" apart from
 * "criteria failed to load".
 */
const ELIGIBILITY_UNAVAILABLE = 'Detailed eligibility criteria will be updated.';

/**
 * Shown when `scheme_eligibility` has no value for a field.
 *
 * This deliberately does not claim the scheme has no limit. A NULL in
 * `maximum_family_income` or `minimum_percentage` cannot be told apart from a
 * guideline that explicitly waives the limit, because both are stored as NULL
 * in the one column. Saying "No limit specified" therefore turned a missing
 * record into a claim about the scheme. Where a scheme really does state that
 * it has no limit, that sentence is in `other_rules` and is printed verbatim in
 * the Additional conditions block below.
 */
const NOT_SPECIFIED = 'Not specified in available scheme data';

/** Keys in `other_rules` that are provenance, not conditions to satisfy. */
const OTHER_RULE_META_KEYS = new Set(['source_ref']);

interface OtherRuleEntry {
  key: string;
  label: string;
  values: string[];
}

/** Turns a `other_rules` value into one or more displayable lines. */
function flattenRuleValue(value: unknown): string[] {
  if (value === null || value === undefined || value === '') {
    return [];
  }
  if (Array.isArray(value)) {
    return value.flatMap(flattenRuleValue);
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${Array.isArray(v) ? v.join(', ') : String(v)}`);
  }
  if (typeof value === 'boolean') {
    return [value ? 'Yes' : 'No'];
  }
  return [String(value)];
}

/**
 * Builds the labelled list rendered under "Additional conditions".
 *
 * Handles both shapes `other_rules` has held: the structured object written by
 * 20260927000120_official_scheme_data_eligibility.sql, and the plain sentence
 * of prose the column was seeded with before that migration, so an un-migrated
 * project still shows its text instead of an empty block.
 */
function buildOtherRuleEntries(
  otherRules: Record<string, unknown> | string | null | undefined
): OtherRuleEntry[] {
  if (otherRules === null || otherRules === undefined) {
    return [];
  }

  if (typeof otherRules === 'string') {
    const text = otherRules.trim();
    return text ? [{ key: 'rules', label: 'Rule', values: [text] }] : [];
  }

  if (typeof otherRules !== 'object' || Array.isArray(otherRules)) {
    return [];
  }

  return Object.entries(otherRules)
    .filter(([key]) => !OTHER_RULE_META_KEYS.has(key))
    .map(([key, value]) => ({
      key,
      label: key.replace(/_/g, ' '),
      values: flattenRuleValue(value),
    }))
    .filter((entry) => entry.values.length > 0);
}

/** Scheme window dates. Kept local rather than imported from the records
 * service, which formats for a different purpose. An unparseable or absent
 * date becomes the shared placeholder instead of "Invalid Date". */
function formatSchemeDate(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function ApplicantSchemeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useApplicantAuth();
  const { items: applications, reload: reloadApplications } = useApplicantApplications();

  const [loading, setLoading] = useState(true);
  const [schemeData, setSchemeData] = useState<SchemeDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [eligibilityEval, setEligibilityEval] = useState<EligibilityEvaluation | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    async function loadScheme() {
      if (!id) return;

      setLoading(true);
      setError(null);

      try {
        const data = await fetchSchemeDetail(id);
        if (!data) {
          setError('Scheme not found or not available');
          return;
        }

        setSchemeData(data);

        // Evaluate eligibility if user is logged in
        if (user && data.eligibility) {
          const applicantProfile = buildApplicantProfile({
            category: user.category,
            annual_income: null,
            course: user.course,
            gender: null,
            date_of_birth: null,
            state: user.state,
            district: user.district,
            previous_percentage: null,
            admission_mode: null,
            institution_type: null,
            is_hosteller: null,
          });

          setEligibilityEval(evaluateEligibility(data.eligibility, applicantProfile));
        }
      } catch (err) {
        console.error('Failed to load scheme:', err);
        setError('Failed to load scheme details');
      } finally {
        setLoading(false);
      }
    }

    loadScheme();
  }, [id, user]);

  if (loading) {
    return (
      <div className="space-y-6 py-2 sm:py-2">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-3/4 rounded bg-slate-100" />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="h-64 rounded bg-slate-100 lg:col-span-2" />
            <div className="h-48 rounded bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !schemeData) {
    return (
      <div className="space-y-6 py-2 sm:py-2">
        <Card className="p-8 text-center">
          <h1 className="text-xl font-bold text-gov-blue-dark">Scheme not found</h1>
          <p className="mt-2 text-sm text-slate-600">
            {error || 'This scheme is not available or has not been verified.'}
          </p>
          <Button className="mt-5" size="md" to={ROUTES.applicant.schemes} variant="outline">
            Back to schemes
          </Button>
        </Card>
      </div>
    );
  }

  const { scheme, benefits } = schemeData;
  const existingApplication = applications.find((app) => app.schemeId === scheme.id);

  /**
   * Apply Now.
   *
   * Creates a real `applications` row, or resumes the one that already exists
   * for this applicant and scheme, then navigates to that row's form. On any
   * failure it stays on this page, shows a retryable message, and navigates
   * nowhere - the applicant must never be dropped into a form for an application
   * that does not exist.
   */
  async function handleApplyNow() {
    if (applying) return;

    if (!user) {
      setApplyError('Please sign in to apply for this scheme.');
      return;
    }

    setApplying(true);
    setApplyError(null);

    const outcome = await createOrResumeApplication(scheme.id);

    if (!outcome.ok) {
      setApplying(false);
      console.error('Apply Now failed', outcome.cause);
      setApplyError(outcome.message);
      return;
    }

    // The list behind this page is now stale, so refresh it before leaving;
    // otherwise returning here would not show the application we just created.
    reloadApplications();

    // The uuid, via applicationRouteHandle(). The previous `application_number ||
    // id` is what produced "Application not found" on Apply: the || only guarded
    // null and '', so a reference in any unconfirmed format was preferred, and
    // the form page then rejected it as neither a uuid nor an APP- reference.
    // applicationRouteHandle returns null rather than a value that is known to
    // fail, so a bad row is reported here - where the applicant can retry -
    // instead of on the next page as a missing application.
    const handle = applicationRouteHandle(outcome.application);
    if (!handle) {
      setApplying(false);
      console.error('Application row has no usable identifier', outcome.application);
      setApplyError(
        'Your application was created but could not be opened. Please use My Applications to continue it.',
      );
      return;
    }

    // Keep the button disabled through the navigation, so a second click cannot
    // start another create while this one is still resolving.
    navigate(applicantApplicationPath(handle));
  }

  function getEligibilityStatus(): {
    label: string;
    tone: 'blue' | 'amber' | 'green' | 'red' | 'purple';
  } {
    if (!eligibilityEval) return { label: 'Eligibility unknown', tone: 'purple' };

    switch (eligibilityEval.result) {
      case 'ELIGIBLE':
        return { label: 'Likely Eligible', tone: 'green' };
      case 'NOT_ELIGIBLE':
        return { label: 'Not Eligible', tone: 'red' };
      case 'NEEDS_REVIEW':
        return { label: 'Needs Review', tone: 'amber' };
      default:
        return { label: 'Unknown', tone: 'purple' };
    }
  }

  const eligibilityStatus = getEligibilityStatus();

  /**
   * `other_rules` is jsonb. Since
   * 20260927000120_official_scheme_data_eligibility.sql it holds a structured
   * object of official rule names, so it is rendered as a labelled list rather
   * than concatenated into one sentence. `source_ref` is lifted out and shown
   * separately, because it is provenance rather than a condition an applicant
   * has to satisfy.
   */
  const otherRules = schemeData.eligibility?.other_rules ?? null;
  const otherRulesSource =
    otherRules && typeof otherRules === 'object' && !Array.isArray(otherRules)
      ? typeof otherRules.source_ref === 'string'
        ? otherRules.source_ref
        : null
      : null;
  const otherRuleEntries = buildOtherRuleEntries(otherRules);

  const keyFacts = [
    { label: 'Academic year', value: scheme.academic_year },
    { label: 'Category', value: scheme.scheme_categories?.name ?? null },
    { label: 'Department', value: scheme.departments?.name ?? null },
    { label: 'Reference', value: scheme.scheme_code },
    { label: 'Applications open', value: formatSchemeDate(scheme.application_start_date) },
    { label: 'Applications close', value: formatSchemeDate(scheme.application_end_date) },
  ];

  const overviewContent = (
    <div className="space-y-5">
      {scheme.scheme_type ? (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gov-saffron-dark">Scheme type</p>
          <p className="mt-1 text-sm font-semibold text-slate-800">{scheme.scheme_type}</p>
        </div>
      ) : null}

      <div>
        <h2 className="text-lg font-bold text-gov-blue-dark">Overview and objective</h2>
        {scheme.overview ? (
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{scheme.overview}</p>
        ) : scheme.description ? (
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{scheme.description}</p>
        ) : (
          <p className="mt-2 text-sm text-slate-600">
            An overview has not been recorded for this scheme yet. Please refer to the official guideline.
          </p>
        )}
      </div>

      {/* Only shown when the two fields actually differ. For the schemes that
          have no separate overview, this avoids printing the same paragraph
          twice under two headings. */}
      {scheme.overview && scheme.description ? (
        <div>
          <h2 className="text-lg font-bold text-gov-blue-dark">Description</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{scheme.description}</p>
        </div>
      ) : null}

      <dl className="grid gap-x-6 gap-y-3 rounded border border-slate-200 bg-slate-50 px-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
        {keyFacts.map((fact) => (
          <div className="min-w-0" key={fact.label}>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{fact.label}</dt>
            <dd className="mt-0.5 break-words text-[13px] font-semibold text-slate-800">
              {fact.value ?? INFO_NOT_AVAILABLE}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );

  const eligibilityContent = (
    <div className="space-y-5">
      {eligibilityEval ? (
        <div className="space-y-3">
          {eligibilityEval.matched.length > 0 ? (
            <div className="rounded border border-emerald-200 bg-emerald-50 p-3">
              <p className="mb-2 text-xs font-semibold text-emerald-700">Requirements met</p>
              <ul className="space-y-1 text-xs text-emerald-800">
                {eligibilityEval.matched.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {eligibilityEval.missing.length > 0 ? (
            <div className="rounded border border-amber-200 bg-amber-50 p-3">
              <p className="mb-2 text-xs font-semibold text-amber-700">Still to confirm</p>
              <ul className="space-y-1 text-xs text-amber-800">
                {eligibilityEval.missing.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <span className="font-semibold">Note:</span> This is a preliminary assessment based on your
            profile. Final eligibility is subject to document verification and authorised review.
          </p>
        </div>
      ) : null}

      {schemeData.criteria.length > 0 ? (
        <div>
          <h2 className="mb-2 text-lg font-bold text-gov-blue-dark">Eligibility criteria</h2>
          <SchemeCriteriaList criteria={schemeData.criteria} />
        </div>
      ) : null}

      {schemeData.eligibility ? (
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-gov-blue-dark">Checked against your profile</h2>
            <Badge tone={eligibilityStatus.tone}>{eligibilityStatus.label}</Badge>
          </div>

          {/*
            Every label below reads a column that exists on `scheme_eligibility`.
            The disability, attendance, admission and cap rows that used to be here
            had no column behind them, so they always rendered nothing; they are
            gone rather than left pointing at fields that are not in the table.
            Qualifying examination and Institution now read the real
            `qualifying_examination` and `institution_requirement` columns added by
            20260927000110_official_scheme_data_ddl.sql, so they state the official
            value when there is one and NOT_SPECIFIED when the guideline is silent.
          */}
          <dl className="grid gap-4 rounded border border-slate-200 px-4 py-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-xs text-slate-500">Eligible categories</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-800">
                {describeList(schemeData.eligibility.eligible_categories) || NOT_SPECIFIED}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Family income limit</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-800">
                {typeof schemeData.eligibility.maximum_family_income === 'number'
                  ? formatInr(schemeData.eligibility.maximum_family_income)
                  : NOT_SPECIFIED}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Age limit</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-800">
                {typeof schemeData.eligibility.minimum_age === 'number' ||
                typeof schemeData.eligibility.maximum_age === 'number'
                  ? `${schemeData.eligibility.minimum_age ?? 'No min'} - ${
                      schemeData.eligibility.maximum_age ?? 'No max'
                    } years`
                  : NOT_SPECIFIED}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Minimum percentage</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-800">
                {typeof schemeData.eligibility.minimum_percentage === 'number'
                  ? `${schemeData.eligibility.minimum_percentage}%`
                  : NOT_SPECIFIED}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Gender</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-800">
                {describeList(schemeData.eligibility.eligible_gender) || NOT_SPECIFIED}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-slate-500">Qualifying examination</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-800">
                {describeList(schemeData.eligibility.qualifying_examination) || NOT_SPECIFIED}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-slate-500">Course</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-800">
                {describeList(schemeData.eligibility.eligible_course_levels) ??
                  describeList(schemeData.eligibility.eligible_course_types) ??
                  NOT_SPECIFIED}
              </dd>
            </div>
            {schemeData.eligibility.eligible_course_levels &&
            schemeData.eligibility.eligible_course_types ? (
              <div className="sm:col-span-2">
                <dt className="text-xs text-slate-500">Course type</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-800">
                  {describeList(schemeData.eligibility.eligible_course_types) || NOT_SPECIFIED}
                </dd>
              </div>
            ) : null}
            <div className="sm:col-span-2">
              <dt className="text-xs text-slate-500">Institution</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-800">
                {schemeData.eligibility.institution_requirement &&
                schemeData.eligibility.institution_requirement.length > 0 ? (
                  <ul className="list-inside list-disc space-y-0.5 font-normal text-slate-700">
                    {schemeData.eligibility.institution_requirement.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  NOT_SPECIFIED
                )}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-slate-500">State / domicile</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-800">
                {describeList(schemeData.eligibility.eligible_states) || NOT_SPECIFIED}
              </dd>
            </div>
          </dl>

          {otherRuleEntries.length > 0 ? (
            <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm leading-relaxed text-amber-950">
              <span className="font-bold">Additional conditions:</span>
              <dl className="mt-1.5 space-y-1.5">
                {otherRuleEntries.map(({ key, label, values }) => (
                  <div key={key}>
                    <dt className="text-[11px] font-bold uppercase tracking-wide text-amber-800">
                      {label}
                    </dt>
                    <dd className="text-[13px]">
                      {values.map((value, index) => (
                        <p key={index}>{value}</p>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          {otherRulesSource ? (
            <p className="mt-2 text-[11px] italic leading-snug text-slate-400">
              Source: {otherRulesSource}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-slate-600">{ELIGIBILITY_UNAVAILABLE}</p>
      )}
    </div>
  );

  /**
   * Tab order is the order a reader should work through: what the scheme is,
   * whether they qualify, what they get, what they need to send, and what
   * happens next.
   */
  const tabs: TabDefinition[] = [
    { id: 'overview', label: 'Overview', content: overviewContent },
    { id: 'eligibility', label: 'Eligibility', content: eligibilityContent },
    {
      id: 'benefits',
      label: 'Financial benefits',
      count: benefits.length,
      content: <SchemeBenefitsTable benefits={benefits} />,
    },
    {
      id: 'documents',
      label: 'Required documents',
      count: schemeData.documents.length,
      content: <SchemeDocumentsChecklist documents={schemeData.documents} />,
    },
    {
      id: 'process',
      label: 'Application process',
      count: schemeData.processSteps.length,
      content: <SchemeProcessSteps steps={schemeData.processSteps} />,
    },
  ];

  return (
    <div className="space-y-6 py-2 sm:py-4">
      <ApplicantPageHeader
        action={
          <Button size="md" to={ROUTES.applicant.schemes} variant="outline">
            Back to schemes
          </Button>
        }
        description={scheme.description || 'Official scheme information from verified sources.'}
        eyebrow={`${scheme.scheme_categories?.name || 'Scheme'} · ${scheme.academic_year}`}
        title={scheme.name}
      />

      <div className="grid gap-6">
        {/* The apply action now sits at the upper left of this box. It used to
            live in a separate "Application action" card in a sidebar column,
            which has been removed. The id is kept on this card because
            SchemeTable deep-links to #application-action, so dropping it would
            silently break that scroll target. */}
        <Card className="p-5" id="application-action">
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={applying} size="md" type="button" variant="primary" onClick={handleApplyNow}>
              {applying
                ? existingApplication
                  ? 'Opening your application…'
                  : 'Creating your application…'
                : existingApplication
                  ? 'Continue application'
                  : 'Apply Now'}
            </Button>
            <Button size="md" to={ROUTES.applicant.applications} variant="ghost">
              View my applications
            </Button>
          </div>

          {applyError ? (
            <div className="mt-4 rounded border border-red-200 bg-red-50 p-3" role="alert">
              <p className="text-sm font-semibold text-red-800">{applyError}</p>
            </div>
          ) : null}

          {existingApplication ? (
            <div className="mt-4 rounded border border-blue-200 bg-blue-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-gov-blue">Existing application</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-slate-800">
                  {existingApplication.referenceNumber}
                </span>
                <ApplicationStatusBadge
                  status={existingApplication.status}
                  label={existingApplication.statusLabel}
                />
              </div>
            </div>
          ) : null}

          {!user ? (
            <p className="mt-3 text-xs text-slate-500">
              Sign in to apply. Your application is saved to your account.
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Badge tone="blue">
              {scheme.status === 'published' && scheme.verification_status === 'verified'
                ? 'Verified'
                : 'Draft'}
            </Badge>
            {scheme.scheme_type ? <Badge tone="purple">{scheme.scheme_type}</Badge> : null}
            <span className="text-xs text-slate-500">Academic Year: {scheme.academic_year}</span>
            <span className="text-xs text-slate-500">Reference: {scheme.scheme_code}</span>
          </div>
        </Card>

        <Card className="p-5">
          <Tabs activeId={activeTab} label="Scheme details" onChange={setActiveTab} tabs={tabs} />
        </Card>
      </div>
    </div>
  );
}
