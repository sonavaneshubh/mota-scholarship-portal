import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApplicantApplications } from '../hooks/useApplicantRecords';
import { fetchSchemeDetail } from '../services/schemes';
import type { EligibilityEvaluation, SchemeDetailResponse } from '../lib/supabase';
import {
  buildApplicantProfileFromProfileData,
  evaluateEligibility,
} from '../services/eligibility';
import { ensureApplicantProfile, loadProfile } from '../services/profileService';
import {
  applicantRules,
  buildEligibilityRows,
  type RuleEntry,
} from '../lib/schemeEligibilityView';
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

/** Scheme window dates. Kept local rather than imported from the records
 * service, which formats for a different purpose. An unparseable or absent
 * date becomes the shared placeholder instead of "Invalid Date". */
function formatSchemeDate(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** One labelled rule with its lines, used for the two rule sections below. */
function RuleBlock({ entries }: { entries: RuleEntry[] }) {
  return (
    <dl className="space-y-3">
      {entries.map((entry) => (
        <div key={entry.key}>
          <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-600">
            {entry.label}
          </dt>
          <dd className="mt-0.5 text-[13px] leading-relaxed text-slate-700">
            {entry.lines.map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </dd>
        </div>
      ))}
    </dl>
  );
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
  const [profileNotice, setProfileNotice] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    let active = true;

    async function loadScheme() {
      if (!id) return;

      setLoading(true);
      setError(null);
      setEligibilityEval(null);
      setProfileNotice(null);

      try {
        const data = await fetchSchemeDetail(id);
        if (!active) return;

        if (!data) {
          setError('Scheme not found or not available');
          return;
        }

        setSchemeData(data);

        // Signed out: the criteria still render, there is just nothing to check
        // them against. Not an error state.
        if (!user) {
          return;
        }

        // Read the applicant's own profile tables rather than auth metadata.
        //
        // The previous version passed `user.category`, `user.course`,
        // `user.state` and `user.district` â€” values the signup form happened to
        // copy into `user_metadata` â€” and hardcoded null for income, date of
        // birth, gender and previous percentage. Every applicant therefore saw
        // "Age not provided in profile" and "Annual family income not provided"
        // on the schemes that check those, no matter how complete their profile
        // was, and the income-limited schemes could never resolve to anything but
        // NEEDS_REVIEW.
        //
        // ensureApplicantProfile() is the same anchor call ApplicantProfilePage
        // makes, so an applicant who has never opened their profile still gets a
        // row to read from rather than a failed query.
        const anchor = await ensureApplicantProfile(user.id);
        if (!active) return;

        if (!anchor.ok || !anchor.data) {
          setProfileNotice(
            'Sign in and complete your profile to see how this scheme compares against your details.',
          );
          return;
        }

        const loaded = await loadProfile(anchor.data.id);
        if (!active) return;

        if (!loaded.ok || !loaded.data) {
          setProfileNotice(
            'Your profile could not be loaded, so this scheme could not be checked against it.',
          );
          return;
        }

        const applicant = buildApplicantProfileFromProfileData(loaded.data);
        setEligibilityEval(evaluateEligibility(data.eligibility, applicant, data.criteria));
      } catch (err) {
        console.error('Failed to load scheme:', err);
        if (active) setError('Failed to load scheme details');
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadScheme();

    return () => {
      active = false;
    };
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
   * The scheme's own rules, split by what they do.
   *
   * `other_rules` used to be rendered as one flat list called "Additional
   * conditions" with a single key filtered out. Everything else went through
   * verbatim, so the block contained "open conflict: Report 7.3: the MoTA FAQ asks
   * for Family Income and BPL certificates...", "not specified officialy:
   * Minimum percentage, Minimum age" and "removed unsupported rule: The previous DB
   * value ... was fabricated", alongside the real conditions. Nothing in that
   * paragraph helps an applicant decide whether to apply, and the mention of
   * family income on the fellowship actively contradicts its own rule that there
   * is no income criterion.
   *
   * applicantRules() keeps every key in the database and returns only the three
   * buckets an applicant should read. The internal bucket â€” source references,
   * open conflicts, the record of what was removed and why â€” stays available for
   * the importer and for review, and is never rendered.
   */
  const rules = applicantRules(schemeData.eligibility?.other_rules ?? null);

  const eligibilityRows = schemeData.eligibility
    ? buildEligibilityRows({
        eligibility: schemeData.eligibility,
        criteria: schemeData.criteria,
        otherRules: schemeData.eligibility.other_rules,
      })
    : [];

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
    <div className="space-y-6">
      {/*
        Section 1 - the scheme's criteria, in the order an applicant needs them:
        who may apply, what they must have, where they may study. Read from the
        live `scheme_eligibility` columns plus the `scheme_criteria` rows that
        cannot fit in a scalar column.

        Rows the guideline is silent about are left out entirely rather than
        filled with "not specified", except for Age. Padding every row with the
        same sentence is what made this table unreadable, and a NULL in
        `maximum_family_income` cannot be told apart from a guideline that
        waives the limit, so a placeholder there would be a claim about the
        scheme. Age is the exception because it is the question applicants ask
        first, and NOT_SPECIFIED_TEXT states the honest answer without asserting
        that the scheme has no limit.
      */}
      {eligibilityRows.length > 0 ? (
        <section>
          <h2 className="mb-2 text-lg font-bold text-gov-blue-dark">Eligibility criteria</h2>
          <dl className="grid gap-x-6 gap-y-3 rounded border border-slate-200 bg-slate-50 px-4 py-4 sm:grid-cols-2">
            {eligibilityRows.map((row) => (
              <div className="min-w-0" key={row.label}>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {row.label}
                </dt>
                <dd
                  className={`mt-0.5 break-words text-[13px] ${
                    row.kind === 'not-stated' ? 'italic text-slate-500' : 'font-semibold text-slate-800'
                  }`}
                >
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {/*
        Section 2 - rules that decide whether the applicant qualifies. These are
        the ones that disqualify, so they are stated plainly rather than being
        softened into "additional conditions".
      */}
      {rules.eligibility.length > 0 ? (
        <section>
          <h2 className="mb-2 text-lg font-bold text-gov-blue-dark">Eligibility conditions</h2>
          <RuleBlock entries={rules.eligibility} />
        </section>
      ) : null}

      {/*
        Section 3 - requirements that apply to a subset of applicants only.
        Kept out of the list above on purpose: "Divyangjan applicants must produce
        a Disability Certificate" read as a universal requirement tells every
        other applicant they have missed something. The fellowship's priority
        rule and the pre/post-matric year rules are the same shape.
      */}
      {rules.conditional.length > 0 ? (
        <section>
          <h2 className="mb-2 text-lg font-bold text-gov-blue-dark">
            Conditional requirements
            <span className="ml-2 text-xs font-medium text-slate-500">
              only if one of these applies to you
            </span>
          </h2>
          <RuleBlock entries={rules.conditional} />
        </section>
      ) : null}

      {/*
        Section 4 - true of the scheme, but not a gate. The fellowship's HRA note
        is the clearest case: "The fellowship is not conditioned on hostel status,
        but HRA is" is a rule about an allowance, and under Eligibility criteria
        it read as though not living in a hostel disqualified the candidate.
      */}
      {rules.informational.length > 0 ? (
        <section>
          <h2 className="mb-2 text-lg font-bold text-gov-blue-dark">Good to know</h2>
          <RuleBlock entries={rules.informational} />
        </section>
      ) : null}

      {/* Quotas and course groupings, from `scheme_criteria`. `maximum_age` is
          excluded because it is already the Age row above; showing it here as
          three more cards repeated the same number twice. */}
      {schemeData.criteria.length > 0 ? (
        <section>
          <h2 className="mb-2 text-lg font-bold text-gov-blue-dark">
            {schemeData.criteria.some((c) => c.criteria_type === 'course_group')
              ? 'Courses, reservations and course groups'
              : 'Reservations and awards'}
          </h2>
          <SchemeCriteriaList criteria={schemeData.criteria} excludeTypes={['maximum_age']} />
        </section>
      ) : null}

      {/* Section 5 - the applicant's own position. */}
      <section>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-gov-blue-dark">Checked against your profile</h2>
          <Badge tone={eligibilityStatus.tone}>{eligibilityStatus.label}</Badge>
        </div>

        {profileNotice ? (
          <p className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            {profileNotice}
          </p>
        ) : null}

        {eligibilityEval ? (
          <div className="space-y-3">
            {eligibilityEval.result === 'NOT_ELIGIBLE' ? (
              <div className="rounded border border-red-200 bg-red-50 p-3">
                <p className="mb-2 text-xs font-semibold text-red-700">
                  Does not meet these requirements
                </p>
                <ul className="space-y-1 text-xs text-red-800">
                  {eligibilityEval.missing.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}

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

            {eligibilityEval.result === 'NEEDS_REVIEW' ? (
              <div className="rounded border border-amber-200 bg-amber-50 p-3">
                <p className="mb-2 text-xs font-semibold text-amber-700">
                  Add these to your profile to finish this check
                </p>
                <ul className="space-y-1 text-xs text-amber-800">
                  {eligibilityEval.missing.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/*
              Requirements satisfied by a certificate or a committee, not by a
              number. Reported so the applicant knows what to upload. These are
              not counted against them: they are true of the scheme whatever their
              profile says, so treating them as outstanding is what previously
              made NEEDS_REVIEW the only reachable result on every scheme.
            */}
            {eligibilityEval.toConfirm.length > 0 ? (
              <div className="rounded border border-slate-200 bg-white p-3">
                <p className="mb-2 text-xs font-semibold text-slate-700">
                  Confirmed from your documents during review
                </p>
                <ul className="space-y-1 text-xs text-slate-600">
                  {eligibilityEval.toConfirm.map((item, index) => (
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
      </section>

      {schemeData.eligibility ? null : (
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
        eyebrow={`${scheme.scheme_categories?.name || 'Scheme'} Â· ${scheme.academic_year}`}
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
                  ? 'Opening your applicationâ€¦'
                  : 'Creating your applicationâ€¦'
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
