import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useApplicantAuth } from '../context/useApplicantAuth';
import { ApplicantPageHeader } from '../components/applicant/ApplicantPageHeader';
import { ApplicationStatusBadge } from '../components/applicant/StatusBadge';
import { ApplicationTimeline } from '../components/applicant/ApplicationTimeline';
import { DocumentVerificationPanel } from '../components/applicant/DocumentVerificationPanel';
import { DocumentStatusBadge } from '../components/applicant/StatusBadge';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ROUTES } from '../lib/constants';
import {
  CheckboxField,
  FORM_GRID_CLASS,
  SelectField,
  TextAreaField,
  TextField,
  YesNoField,
} from '../components/profile/ProfileFields';
import {
  AcademicInformationSection,
  ApplicantInformationSection,
  ProfileGapsNotice,
} from '../components/applicant/ApplicantFormReadOnlySections';
import {
  RequiredDocumentsSection,
  SchemeDetailsSection,
} from '../components/applicant/ApplicantFormSchemeSections';
import {
  buildDocumentRequirements,
  daysUntil,
  type DocumentRequirementLink,
} from '../lib/applicationFormView';
import {
  attachSchemeDocument,
  detachSchemeDocument,
  loadApplicationForm,
  readStoredAnswers,
  saveApplicationDraft,
  submitApplication,
  type ApplicationFormLoad,
} from '../services/applicationFormService';
import { uploadDocument } from '../services/documentService';
import { toUiApplicationStatus } from '../services/applicantRecords';
import { useApplicantApplications } from '../hooks/useApplicantRecords';
import { buildSchemeQuestions, isAnswered, readAnswer, resolveDocumentCode, type SchemeAnswers } from '../lib/applicationFormRules';
import type { ApplicantDocumentRecord } from '../types/profile';

/**
 * The applicant application form.
 *
 * Layout follows the seven sections in the brief, and the organising principle is
 * that the form never asks for something the profile already holds:
 *
 *   1. Applicant information   read-only, from My Profile
 *   2. Academic information    read-only, from My Profile
 *   3. Important scheme details  from the real scheme row
 *   4. Additional scheme information  only the questions THIS scheme asks, and
 *                                    only those the profile has not answered
 *   5. Required documents      from the scheme's scheme_documents, reusing
 *                              whatever the applicant already uploaded
 *   6. Declaration
 *   7. Save Draft / Submit
 *
 * A draft is editable; anything that has already been submitted is shown
 * read-only with the existing status view instead. That is why the pre-existing
 * timeline, verification panel and deficiency context are kept rather than
 * replaced — they are what the applicant needs once the form is done with.
 *
 * Save Draft is never blocked. Submit is blocked until the declaration is ticked,
 * every required scheme document is attached, and every required question the
 * profile could not answer has been answered. The blocking list is shown before
 * the applicant presses Submit rather than after a rejection.
 */

type FormLoadState =
  | { status: 'loading' }
  | { status: 'idle' }
  | ApplicationFormLoad;

interface EditableFormState {
  /** Application id the form was seeded from, so a reload cannot wipe edits. */
  seededFor: string | null;
  answers: SchemeAnswers;
  declaration: boolean;
  links: DocumentRequirementLink[];
  documents: ApplicantDocumentRecord[];
}

const EMPTY_FORM: EditableFormState = {
  seededFor: null,
  answers: {},
  declaration: false,
  links: [],
  documents: [],
};

function LoadingCards() {
  return (
    <div className="space-y-6 py-1 sm:py-2">
      <Card aria-busy="true" className="space-y-2 p-5" role="status">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="h-10 animate-pulse rounded bg-slate-100" key={index} />
        ))}
        <span className="sr-only">Loading application</span>
      </Card>
    </div>
  );
}

function ProblemCard({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="space-y-6 py-1 sm:py-2">
      <Card className="p-8 text-center" role="alert">
        <h1 className="text-xl font-bold text-gov-blue-dark">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">{body}</p>
        {action ? <div className="mt-5 flex flex-wrap justify-center gap-3">{action}</div> : null}
      </Card>
    </div>
  );
}

export function ApplicantApplicationPage() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const { session, user } = useApplicantAuth();
  const { reload: reloadApplications } = useApplicantApplications();

  const [load, setLoad] = useState<FormLoadState>({ status: 'idle' });
  const [form, setForm] = useState<EditableFormState>(EMPTY_FORM);

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyRequirementId, setBusyRequirementId] = useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

  const handle = applicationId ?? '';

  const loadForm = useCallback(async () => {
    setLoad({ status: 'loading' });
    const result = await loadApplicationForm(handle);

    if (result.status === 'ready') {
      // Seed the editable state exactly once per application. Re-seeding on every
      // reload would silently discard answers the applicant has typed but not yet
      // saved, which is the worst possible moment to lose them.
      setForm((previous) => {
        if (previous.seededFor === result.bundle.application.id) return previous;
        const { application: loaded, profile: loadedProfile, scheme: loadedScheme } = result.bundle;
        // The known question keys, so stored answers for questions this scheme no
        // longer asks are dropped on read rather than written back on the next save.
        const knownKeys = buildSchemeQuestions(loadedProfile, loadedScheme).map((question) => question.key);
        return {
          seededFor: loaded.id,
          answers: readStoredAnswers(loaded, knownKeys),
          declaration: Boolean(loaded.declaration_accepted),
          links: result.bundle.links,
          documents: loadedProfile.documents,
        };
      });
    }

    setLoad(result);
  }, [handle]);

  useEffect(() => {
    if (!session || !user) return;
    if (!handle.trim()) {
      // A route with no id at all is a broken link, not a missing application.
      // Reporting it as "not found" would claim the applicant has no such
      // application when in fact nothing was ever looked up.
      setLoad({ status: 'invalid', error: null });
      return;
    }
    void loadForm();
  }, [session, user, handle, loadForm]);

  const bundle = load.status === 'ready' ? load.bundle : null;
  const application = bundle?.application ?? null;
  const profile = bundle?.profile ?? null;
  const scheme = bundle?.scheme ?? null;

  const questions = useMemo(() => (profile ? buildSchemeQuestions(profile, scheme) : []), [profile, scheme]);

  const requirements = useMemo(
    () => (scheme ? buildDocumentRequirements(scheme.documents, form.links, form.documents, busyRequirementId, uploadErrors) : []),
    [scheme, form.links, form.documents, busyRequirementId, uploadErrors],
  );

  const isDraft = application?.status === 'draft';

  /** Everything that stops Submit, phrased for the applicant. */
  const blockers = useMemo(() => {
    if (!isDraft) return [];
    const issues: string[] = [];

    for (const question of questions) {
      // A question the profile already answers is never a blocker — there is no
      // input for the applicant to have got wrong.
      if (question.fromProfile) continue;
      if (question.required && !isAnswered(question, form.answers)) {
        issues.push(question.label);
      }
    }

    for (const view of requirements) {
      if (view.requirement.is_mandatory && !view.attached) {
        issues.push(view.requirement.document_name);
      }
    }

    if (!form.declaration) issues.push('The declaration must be ticked');

    return issues;
  }, [isDraft, questions, requirements, form.answers, form.declaration]);

  const setAnswer = (key: string, value: string) => {
    setSavedAt(null);
    setForm((previous) => ({ ...previous, answers: { ...previous.answers, [key]: value } }));
  };

  const handleSaveDraft = async () => {
    if (!application) return;
    setSaving(true);
    setActionError(null);

    const result = await saveApplicationDraft(application.id, form.answers);
    setSaving(false);

    if (!result.ok) {
      setActionError(result.message);
      return;
    }

    setSavedAt(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
  };

  const handleSubmit = async () => {
    if (!application) return;
    if (blockers.length > 0) {
      // Defensive: the button is disabled while blockers exist, so reaching this
      // means the state changed underneath us. Say what is missing rather than
      // firing a request the database would only reject.
      setActionError('Some required items are still missing. Please review the highlighted items.');
      return;
    }

    setSubmitting(true);
    setActionError(null);

    const result = await submitApplication(application.id, form.answers, form.declaration);
    setSubmitting(false);

    if (!result.ok) {
      setActionError(result.message);
      return;
    }

    reloadApplications();
    await loadForm();
  };

  const handleAttach = async (schemeDocumentId: string, documentId: string) => {
    if (!application) return;
    setBusyRequirementId(schemeDocumentId);
    setUploadErrors((previous) => ({ ...previous, [schemeDocumentId]: '' }));

    const result = await attachSchemeDocument(application.id, schemeDocumentId, documentId);
    setBusyRequirementId(null);

    if (!result.ok) {
      setUploadErrors((previous) => ({ ...previous, [schemeDocumentId]: result.error }));
      return;
    }

    setForm((previous) => ({
      ...previous,
      links: [
        // Replace by requirement, mirroring the unique constraint, so switching
        // a document never leaves two rows in state for one requirement.
        ...previous.links.filter((link) => link.scheme_document_id !== schemeDocumentId),
        result.link,
      ],
    }));
  };

  const handleDetach = async (linkId: string) => {
    setBusyRequirementId(null);
    const result = await detachSchemeDocument(linkId);

    if (!result.ok) {
      setActionError(result.error);
      return;
    }

    setForm((previous) => ({
      ...previous,
      links: previous.links.filter((link) => link.id !== linkId),
    }));
  };

  const handleUpload = async (
    requirement: { id: string; document_name: string },
    file: File,
  ) => {
    if (!application) return;
    setBusyRequirementId(requirement.id);
    setUploadErrors((previous) => ({ ...previous, [requirement.id]: '' }));

    // Two steps on purpose. The file lands in the applicant's own document
    // library first, exactly as if they had uploaded it from My Profile, and only
    // then is it linked to this requirement. The alternative — storing an
    // application-scoped copy — would create a second record of the same
    // certificate, which is what this form is meant to avoid.
    //
    // The code is resolved, not the label: uploadDocument writes it into
    // document_code, which the profile's certificate slots match on exactly.
    const uploaded = await uploadDocument({
      applicantId: application.applicant_id,
      documentCode: resolveDocumentCode(requirement.document_name),
      file,
    });

    if (!uploaded.ok || !uploaded.data) {
      setBusyRequirementId(null);
      setUploadErrors((previous) => ({ ...previous, [requirement.id]: uploaded.error ?? 'The upload failed.' }));
      return;
    }

    const stored = uploaded.data;
    setForm((previous) => ({
      ...previous,
      // Newest first, matching the order loadProfile returns them in, so
      // matchExistingDocument keeps offering the most recent file.
      documents: [stored, ...previous.documents],
    }));

    await handleAttach(requirement.id, stored.id);
    setBusyRequirementId(null);
  };

  if (!session || !user) {
    return null;
  }

  if (load.status === 'loading' || load.status === 'idle') {
    return <LoadingCards />;
  }

  if (load.status === 'unavailable') {
    return (
      <ProblemCard
        action={
          <Button onClick={() => void loadForm()} size="md" variant="primary">
            Try again
          </Button>
        }
        body="The application service has not finished being set up, so nothing can be loaded right now."
        title="Applications are unavailable"
      />
    );
  }

  if (load.status === 'error') {
    return (
      <ProblemCard
        action={
          <>
            <Button onClick={() => void loadForm()} size="md" variant="primary">
              Try again
            </Button>
            <Button size="md" to={ROUTES.applicant.applications} variant="outline">
              Back to applications
            </Button>
          </>
        }
        body={load.error ?? 'We could not reach the application service. Your application has not been lost.'}
        title="Could not load your application"
      />
    );
  }

  // A malformed link is reported as a broken link, not as a missing application.
  // The difference matters: "no application with this reference exists on your
  // account" is a claim about the applicant's data, and it is false here — the
  // database was never queried.
  if (load.status === 'invalid') {
    return (
      <ProblemCard
        action={
          <Button size="md" to={ROUTES.applicant.applications} variant="outline">
            Go to My Applications
          </Button>
        }
        body="This link does not point at a valid application, so nothing was loaded. Open the application from My Applications instead."
        title="This application link is not valid"
      />
    );
  }

  if (load.status === 'not-found' || !application || !profile) {
    return (
      <ProblemCard
        action={
          <>
            <Button size="md" to={ROUTES.applicant.applications} variant="outline">
              Go to My Applications
            </Button>
            <Button size="md" to={ROUTES.applicant.schemes} variant="primary">
              Browse scholarships
            </Button>
          </>
        }
        body="No application with this reference exists on your account. It may belong to another account, or have been withdrawn."
        title="Application not found"
      />
    );
  }

  const remaining = daysUntil(scheme?.scheme.application_end_date ?? null);
  const closed = remaining !== null && remaining < 0;
  // A whitespace-only reference is treated as absent, matching how the reference
  // is read everywhere else. The trigger that mints it is in an unapplied
  // migration, so a real deployment gap looks like an empty string rather than
  // null, and "Reference not issued yet" is the honest rendering of that.
  const rawReference = (application.application_number ?? '').trim();
  const reference = rawReference || 'Reference not issued yet';
  // The badge and timeline components are typed against the kebab-case UI
  // vocabulary, while `application.status` is the raw snake_case column value.
  const listedStatus = toUiApplicationStatus(application.status);
  const mandatoryTotal = requirements.filter((view) => view.requirement.is_mandatory).length;
  const mandatoryDone = requirements.filter((view) => view.requirement.is_mandatory && view.attached).length;

  return (
    <div className="space-y-6 py-1 sm:py-2">
      <ApplicantPageHeader
        action={
          <Button size="md" to={ROUTES.applicant.applications} variant="outline">
            Back to applications
          </Button>
        }
        description="Review what is filled from your profile, answer only what this scholarship additionally needs, and attach the documents it asks for."
        eyebrow={`Application ${reference}`}
        title={scheme?.scheme.name ?? 'Application form'}
      />

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <dl className="grid flex-1 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-slate-500">Reference</dt>
              <dd className="mt-0.5 font-mono text-[13px] font-semibold text-slate-800">{reference}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-slate-500">Scheme</dt>
              <dd className="mt-0.5 text-[13px] font-semibold text-slate-800">
                {scheme?.scheme.name ?? 'Not available'}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wide text-slate-500">Status</dt>
              <dd className="mt-0.5">
                <ApplicationStatusBadge status={listedStatus} label={listedStatus.replace(/_/g, ' ')} />
              </dd>
            </div>
          </dl>
        </div>

        {closed ? (
          <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-800" role="status">
            The deadline for this scheme has passed. You can still save a draft, but it cannot be submitted.
          </p>
        ) : null}
      </Card>

      {!scheme ? (
        <Card className="border-amber-300 bg-amber-50 p-4" role="status">
          <p className="text-[13px] font-semibold text-amber-900">This scheme is no longer published</p>
          <p className="mt-1 text-[12px] leading-snug text-amber-800">
            Its details, document list and questions are unavailable, so the form below cannot be completed. Your
            existing application and answers are untouched. Please contact the department if you believe this is wrong.
          </p>
        </Card>
      ) : null}

      {/* 1. Applicant information — read-only, from My Profile */}
      <Card className="p-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gov-saffron-dark">Section 1</p>
        <h2 className="mt-1 text-lg font-bold text-gov-blue-dark">Applicant information</h2>
        <p className="mt-1 text-[12px] text-slate-600">
          Taken from My Profile. You do not need to type any of this again.
        </p>
        <div className="mt-4">
          <ProfileGapsNotice profile={profile} />
        </div>
        <div className="mt-4">
          <ApplicantInformationSection profile={profile} />
        </div>
      </Card>

      {/* 2. Academic information — read-only, from My Profile */}
      <Card className="p-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gov-saffron-dark">Section 2</p>
        <h2 className="mt-1 text-lg font-bold text-gov-blue-dark">Academic information</h2>
        <p className="mt-1 text-[12px] text-slate-600">
          Taken from the qualifications and current course saved in My Profile.
        </p>
        <div className="mt-4">
          <AcademicInformationSection profile={profile} />
        </div>
      </Card>

      {/* 3. Important scheme details — from the real scheme row */}
      {scheme ? (
        <Card className="p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gov-saffron-dark">Section 3</p>
          <h2 className="mt-1 text-lg font-bold text-gov-blue-dark">Important scheme details</h2>
          <div className="mt-4">
            <SchemeDetailsSection scheme={scheme} />
          </div>
        </Card>
      ) : null}

      {/* 4. Additional scheme information — only what this scheme asks for */}
      <Card className="p-5" accentClass="border-l-4 border-gov-saffron">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gov-saffron-dark">Section 4</p>
        <h2 className="mt-1 text-lg font-bold text-gov-blue-dark">Additional scheme information</h2>

        {questions.length === 0 ? (
          <p className="mt-3 text-[13px] text-slate-600">
            {scheme
              ? 'This scholarship needs nothing beyond your profile, so there is nothing to fill in here.'
              : 'Unavailable because the scheme could not be loaded.'}
          </p>
        ) : (
          <>
            <p className="mt-1 text-[12px] text-slate-600">
              Only the items this particular scholarship asks for. Anything already in your profile is shown as
              read-only instead of being asked again.
            </p>

            <ul className="mt-4 space-y-3">
              {questions.map((question) => (
                <li
                  className={`rounded border px-3 py-3 ${
                    question.fromProfile ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-white'
                  }`}
                  key={question.key}
                >
                  <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                    <p className="text-[13px] font-semibold text-slate-800">{question.label}</p>
                    {question.fromProfile ? (
                      <Badge tone="emerald">From My Profile</Badge>
                    ) : question.required ? (
                      <Badge tone="red">Required</Badge>
                    ) : (
                      <Badge tone="slate">Optional</Badge>
                    )}
                  </div>

                  <p className="mb-2 text-[11px] leading-snug text-slate-500">Why this is asked: {question.because}</p>

                  {question.fromProfile ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-emerald-200 bg-white px-2.5 py-1.5">
                      {/* The one branch where a question is shown but NOT an input
                          is rendered: the profile already holds the answer. */}
                      <span className="text-[13px] font-semibold text-slate-800">{question.profileValue}</span>
                      {/* No disabled state: My Profile is editable regardless of this
                          application's status, and following the link does not mutate
                          the application. */}
                      <Button size="sm" to={ROUTES.applicant.profile} variant="ghost">
                        Change in My Profile
                      </Button>
                    </div>
                  ) : question.control === 'profile-notice' ? (
                    <div className="rounded border border-amber-300 bg-amber-50 px-2.5 py-1.5">
                      <p className="text-[12px] leading-snug text-amber-900">
                        This has to come from your profile rather than be typed here, so there is only ever one
                        authoritative copy of it.
                      </p>
                      <Button className="mt-2" size="sm" to={ROUTES.applicant.profile} variant="outline">
                        Add it in My Profile
                      </Button>
                    </div>
                  ) : (
                    <div className={FORM_GRID_CLASS}>
                      {question.control === 'text' || question.control === 'number' ? (
                        <TextField
                          disabled={!isDraft}
                          inputMode={question.control === 'number' ? 'decimal' : 'text'}
                          label={question.label}
                          onChange={(value) => setAnswer(question.key, value)}
                          required={question.required}
                          value={readAnswer(form.answers, question.key)}
                        />
                      ) : null}

                      {question.control === 'textarea' ? (
                        <TextAreaField
                          disabled={!isDraft}
                          hint={question.help}
                          label={question.label}
                          onChange={(value) => setAnswer(question.key, value)}
                          required={question.required}
                          value={readAnswer(form.answers, question.key)}
                        />
                      ) : null}

                      {question.control === 'yesno' ? (
                        <YesNoField
                          disabled={!isDraft}
                          label={question.label}
                          onChange={(value) => setAnswer(question.key, value ? 'yes' : 'no')}
                          required={question.required}
                          value={readAnswer(form.answers, question.key) === 'yes' ? true : readAnswer(form.answers, question.key) === 'no' ? false : null}
                        />
                      ) : null}

                      {question.control === 'select' && question.options ? (
                        <SelectField
                          disabled={!isDraft}
                          label={question.label}
                          onChange={(value) => setAnswer(question.key, value)}
                          options={question.options}
                          required={question.required}
                          value={readAnswer(form.answers, question.key)}
                        />
                      ) : null}
                    </div>
                  )}

                  {question.help && !question.fromProfile && question.control !== 'textarea' ? (
                    <p className="mt-1.5 text-[11px] leading-snug text-slate-500">{question.help}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      {/* 5. Required documents — from the scheme's own document list */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gov-saffron-dark">Section 5</p>
            <h2 className="mt-1 text-lg font-bold text-gov-blue-dark">Required documents</h2>
          </div>
          {mandatoryTotal > 0 ? (
            <Badge tone={mandatoryDone === mandatoryTotal ? 'green' : 'amber'}>
              {`${mandatoryDone}/${mandatoryTotal} required attached`}
            </Badge>
          ) : null}
        </div>

        <div className="mt-4">
          <RequiredDocumentsSection
            disabled={!isDraft}
            documents={form.documents}
            onAttach={(requirementId, documentId) => void handleAttach(requirementId, documentId)}
            onDetach={(linkId) => void handleDetach(linkId)}
            onUpload={(requirement, file) => void handleUpload(requirement, file)}
            requirements={requirements}
          />
        </div>
      </Card>

      {/* 6. Declaration */}
      <Card className="p-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gov-saffron-dark">Section 6</p>
        <h2 className="mt-1 text-lg font-bold text-gov-blue-dark">Declaration</h2>
        <div className="mt-4 rounded border border-slate-200 bg-slate-50 px-3 py-3">
          <CheckboxField
            checked={form.declaration}
            disabled={!isDraft}
            hint="Required before the application can be submitted. Saving a draft does not need it."
            label="I confirm that the information in this application, and the profile information it draws from, is correct and complete to the best of my knowledge."
            onChange={(checked) => {
              setSavedAt(null);
              setForm((previous) => ({ ...previous, declaration: checked }));
            }}
          />
        </div>
      </Card>

      {/* 7. Save / Submit */}
      <Card className="p-5" accentClass="border-l-4 border-gov-blue">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gov-saffron-dark">Section 7</p>
        <h2 className="mt-1 text-lg font-bold text-gov-blue-dark">Save and submit</h2>

        {actionError ? (
          <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-800" role="alert">
            {actionError}
          </p>
        ) : null}

        {blockers.length > 0 ? (
          <div className="mt-3 rounded border border-amber-300 bg-amber-50 px-3 py-2.5" role="status">
            <p className="text-[12px] font-semibold text-amber-900">
              {blockers.length} item{blockers.length === 1 ? '' : 's'} still needed before you can submit
            </p>
            <ul className="mt-1.5 list-inside list-disc text-[12px] leading-snug text-amber-800">
              {blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
            <p className="mt-1.5 text-[11px] text-amber-700">
              You can still save this as a draft and come back to it at any time.
            </p>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            disabled={!isDraft || saving || submitting}
            onClick={() => void handleSaveDraft()}
            size="md"
            variant="outline"
          >
            {saving ? 'Saving…' : 'Save draft'}
          </Button>

          <Button
            disabled={!isDraft || submitting || saving || blockers.length > 0 || closed === true}
            onClick={() => void handleSubmit()}
            size="md"
            variant="primary"
          >
            {submitting ? 'Submitting…' : 'Submit application'}
          </Button>

          {savedAt ? (
            <span className="text-[12px] text-emerald-700" role="status">
              Draft saved at {savedAt}
            </span>
          ) : null}
        </div>

        {!isDraft ? (
          <p className="mt-3 text-[12px] text-slate-600">
            This application has already been submitted, so it is read-only. The status and verification details are
            shown below.
          </p>
        ) : null}
      </Card>

      {/* Once submitted, the pre-existing status view takes over. */}
      {!isDraft ? (
        <>
          <ApplicationTimeline
            application={{
              id: application.id,
              schemeId: application.scheme_id,
              schemeName: scheme?.scheme.name ?? '—',
              submittedAt: application.submitted_at ? new Date(application.submitted_at).toLocaleDateString('en-IN') : '—',
              updatedAt: new Date(application.updated_at).toLocaleDateString('en-IN'),
              status: listedStatus,
              statusLabel: listedStatus.replace(/_/g, ' '),
              nextStep: 'Your application is with the department for verification.',
              referenceNumber: reference,
              amountLabel: '—',
              documentsComplete: mandatoryDone,
              documentsTotal: mandatoryTotal,
            }}
          />

          {mandatoryTotal > 0 ? (
            <DocumentVerificationPanel
              documentCount={mandatoryTotal}
              needsCorrection={listedStatus === 'deficiency-raised' || listedStatus === 'resubmission-required'}
            />
          ) : null}

          <Card className="p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gov-saffron-dark">Documents on your profile</p>
            <h2 className="mt-1 text-lg font-bold text-gov-blue-dark">Your document library</h2>
            {form.documents.length === 0 ? (
              <p className="mt-4 rounded border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-600">
                You have not uploaded any document yet.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-100">
                {form.documents.map((document) => (
                  <li className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0" key={document.id}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {document.file_name ?? document.document_code ?? 'Document'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {document.mime_type ?? 'file'} · {document.status ?? 'uploaded'}
                      </p>
                    </div>
                    <DocumentStatusBadge
                      label={document.status ?? 'Uploaded'}
                      status={(document.status ?? 'uploaded') as never}
                    />
                  </li>
                ))}
              </ul>
            )}
            <Button className="mt-4" size="sm" to={ROUTES.applicant.documents} variant="outline">
              Manage documents
            </Button>
          </Card>
        </>
      ) : null}

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm leading-relaxed text-slate-700">
        <p className="font-bold text-gov-blue-dark">Decision boundary</p>
        <p className="mt-1">
          AI assists document verification. Final verification and decisions are performed by authorized officials.
        </p>
      </div>
    </div>
  );
}
