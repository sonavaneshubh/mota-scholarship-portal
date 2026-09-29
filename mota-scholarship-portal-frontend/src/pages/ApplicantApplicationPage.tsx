import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { CheckboxField } from '../components/profile/ProfileFields';
import {
  ApplicantInformationSection,
  AcademicInformationSection,
} from '../components/applicant/ApplicantFormReadOnlySections';
import { ApplicantSummary } from '../components/applicant/ApplicantSummary';
import { ApplicationStageOne } from '../components/applicant/ApplicationStageOne';
import {
  STAGE_LABEL,
  isStageOneComplete,
  resolveStage,
  stageNumber,
  stageOneBlockers,
  type ApplicationStage,
} from '../lib/applicationStage';
import {
  buildDocumentRequirements,
  daysUntil,
  documentStatusFromRecord,
  type DocumentRequirementLink,
  type DocumentRequirementView,
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
import { createViewUrl, uploadDocument } from '../services/documentService';
import { requestDocumentOcr } from '../services/ocrService';
import { useDocumentOcrPolling } from '../hooks/useDocumentOcrPolling';
import { summariseDocumentOcr, type DocumentCheckState, type OcrLinkColumns } from '../lib/documentOcr';
import { toUiApplicationStatus } from '../services/applicantRecords';
import { useApplicantApplications } from '../hooks/useApplicantRecords';
import {
  buildSchemeQuestions,
  isAnswered,
  readAnswer,
  resolveDocumentCode,
  type SchemeAnswers,
  type SchemeQuestion,
} from '../lib/applicationFormRules';
import type { ApplicantDocumentRecord } from '../types/profile';

/**
 * The applicant application form, in two stages.
 *
 * The form has two steps over the same loaded bundle, and the applicant moves
 * between them explicitly rather than having the page re-render underneath them:
 *
 *   Stage 1  additional_information  renewal + documents, the only editing stage
 *   Stage 2  full_application        everything read back, then submit
 *   Confirm  confirmation            shown once, after a successful submit
 *
 * Stage 1 exists because the previous single-view form answered Apply Now with
 * the applicant's own profile, an academic section and a declaration before they
 * had entered anything. All of that is already in My Profile, so it buried the
 * only things the applicant actually had to do. Stage 1 shows those things and
 * nothing else; the rest arrives after Save & Continue.
 *
 * There is no separate Review stage. There used to be one, which showed the same
 * information a second time as a read-back after the applicant had filled it in -
 * the same fields, once to type into and once to read. Stage 2 is that read-back,
 * so the editable form and the review are one view, the declaration is ticked in
 * the place it is stated, and the submit button sits directly under everything it
 * submits. Corrections are made in Stage 1 or in My Profile, and Stage 2 links
 * back to Stage 1 rather than offering a second editable copy.
 *
 * The stages are real, separate views with their own components, not one tree
 * with parts hidden. There is no `stage` column and no migration for this: the
 * current stage is derived from the saved answers and document links, so it
 * survives leaving the page and cannot drift out of step with the data. See
 * lib/applicationStage.ts for why deriving beats a stored flag.
 *
 * Save & Continue is not a submission. It writes answers through
 * saveApplicationDraft, which leaves applications.status at 'draft'; only
 * submitApplication moves the status, and it is reachable only from Stage 2.
 *
 * Within each stage the organising principle is unchanged: the form never asks
 * for something the profile already holds, and never becomes a second copy of
 * it. So Stage 2 leads with the profile summary and leaves editing to My
 * Profile, and the full profile renders there, which is where an applicant goes
 * to read every field rather than glance at the essentials.
 *
 *   Stage 1 layout
 *   1. Renewal / application-specific answers
 *   2. Required documents
 *
 *   Stage 2 layout
 *   1. Applicant information   from My Profile
 *   2. Academic information    from My Profile
 *   3. Personal information    the full profile, read back
 *   4. Additional information  the Stage 1 answers, read back
 *   5. Required documents      the Stage 1 uploads, each viewable
 *   6. Declaration
 *   7. Submit application
 *
 * Stage 2 carries no scheme information at all. The scheme's description,
 * benefits, eligibility requirements and conditions belong to the Scheme Details
 * page, and re-printing them here asked the applicant to read the rules a second
 * time to check their own form. The scheme row is still loaded, because the
 * questions in Section 4 and the document requirements in Section 5 derive from
 * it.
 *
 * A draft is editable; anything already submitted is read-only with the
 * pre-existing timeline, verification panel and deficiency context.
 *
 * Save Draft is never blocked. Submit is blocked until the declaration is
 * ticked, every required scheme document is attached, and every required
 * question has been answered. The blocking list is shown before the applicant
 * presses Submit rather than after a rejection.
 */

type FormLoadState =
  | { status: 'loading' }
  | { status: 'idle' }
  | ApplicationFormLoad;

interface EditableFormState {
  answers: SchemeAnswers;
  declaration: boolean;
  links: DocumentRequirementLink[];
  documents: ApplicantDocumentRecord[];
}

const EMPTY_FORM: EditableFormState = {
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

/**
 * Human-readable text for one question's stored answer, for the Stage 2 read-back.
 *
 * Two shapes need translating, because what is stored is not what a person
 * should read back: a select stores the option's machine value, and a yes/no
 * stores the lowercase token that YesNoField produces. Printing either verbatim
 * would show "1" or "yes" on an official-looking document.
 */
function answerText(question: SchemeQuestion, answers: SchemeAnswers): string {
  const stored = readAnswer(answers, question.key).trim();
  if (stored === '') return 'Not answered';

  // A yes/no is stored as the lowercase token YesNoField produces. Printing it
  // verbatim would show "yes" on an official-looking document.
  if (question.control === 'yesno') {
    if (stored === 'yes') return 'Yes';
    if (stored === 'no') return 'No';
  }

  return stored;
}

/**
 * Stage 2 says only whether the check ran and what it concluded, because this is
 * the last look before submitting rather than the place to study the reading. The
 * detail lives on the document card in Stage 1.
 *
 * A NEEDS_REVIEW result is phrased as a prompt to look, never as a rejection.
 */
const STAGE_TWO_OCR_LABEL: Record<DocumentCheckState, string> = {
  'not-started': 'AI check not started',
  'in-flight': 'Γƒ│ AI is processing this documentΓÇª',
  complete: 'Γ£ô Processed ΓÇö matches your profile',
  'needs-review': 'ΓÜá Processed ΓÇö information needs review',
  failed: 'ΓÜá Could not read this document',
};

const STAGE_TWO_OCR_TONE: Record<DocumentCheckState, string> = {
  'not-started': 'text-slate-400',
  'in-flight': 'text-blue-700',
  complete: 'text-emerald-700',
  'needs-review': 'text-amber-700',
  failed: 'text-red-700',
};

/**
 * One document requirement, read back, with a way to open what was attached.
 *
 * The view row opens the stored file through the same short-lived signed URL the
 * upload checklist uses, rather than linking a Storage path: the bucket is
 * private, so a direct path would 404. It is a component rather than an inline
 * handler because the error state belongs to the row that failed to open, and a
 * hook cannot live inside the map.
 */
function DocumentReviewRow({ item }: { item: DocumentRequirementView }) {
  const [viewError, setViewError] = useState<string | null>(null);
  const { requirement, attached, link } = item;
  const ocr = summariseDocumentOcr(link);

  const openAttached = async () => {
    if (!attached) return;
    setViewError(null);
    const result = await createViewUrl(attached);
    if (!result.ok || !result.data) {
      setViewError(result.error ?? 'The document could not be opened.');
      return;
    }
    window.open(result.data, '_blank', 'noopener,noreferrer');
  };

  return (
    <li className="flex flex-wrap items-start justify-between gap-2 py-2.5">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-slate-800">
          {requirement.document_name}
          <span className="ml-1.5 text-[11px] font-medium text-slate-500">
            {requirement.is_mandatory ? '(required)' : '(optional)'}
          </span>
        </p>
        {attached ? (
          <p className="mt-0.5 break-all text-[11px] text-slate-500">
            {attached.file_name ?? attached.document_name ?? 'Attached'}
          </p>
        ) : null}
        {link && ocr.state !== 'not-started' ? (
          <p className={`mt-1 text-[11px] font-semibold ${STAGE_TWO_OCR_TONE[ocr.state]}`}>
            {STAGE_TWO_OCR_LABEL[ocr.state]}
          </p>
        ) : null}
        {viewError ? <p className="mt-1 text-[11px] font-semibold text-red-700">{viewError}</p> : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {attached ? (
          <Button onClick={() => void openAttached()} size="sm" variant="outline">
            View
          </Button>
        ) : null}
        <span
          className={`text-[13px] ${
            attached
              ? 'font-semibold text-emerald-700'
              : requirement.is_mandatory
                ? 'font-semibold italic text-red-700'
                : 'italic text-slate-400'
          }`}
        >
          {attached ? 'Attached' : 'Not attached'}
        </span>
      </div>
    </li>
  );
}

/**
 * The documents this application is submitting, read back against what the scheme
 * asked for.
 *
 * Stage 2 is the last look at the application before it is sent, so the gap
 * matters as much as the list: a missing mandatory document is stated in red
 * rather than left as an empty row, and it is also one of the blockers on the
 * submit button below. Upload and replace stay in Stage 1, where the answers are.
 */
function DocumentReviewList({
  requirements,
  schemeLoaded,
}: {
  requirements: DocumentRequirementView[];
  schemeLoaded: boolean;
}) {
  if (requirements.length === 0) {
    return (
      <p className="text-[13px] text-slate-600">
        {schemeLoaded
          ? 'This scholarship asks for no documents.'
          : 'Unavailable because the scheme could not be loaded.'}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {requirements.map((item) => (
        <DocumentReviewRow item={item} key={item.requirement.id} />
      ))}
    </ul>
  );
}

/** Read-only question/answer pairs, for Stage 2 and the printout. */
function AnswerReviewList({
  questions,
  answers,
}: {
  questions: SchemeQuestion[];
  answers: SchemeAnswers;
}) {
  if (questions.length === 0) {
    return (
      <p className="text-[13px] text-slate-600">
        This scholarship needs nothing beyond your profile, so there is nothing to fill in here.
      </p>
    );
  }

  return (
    <dl className="divide-y divide-slate-100">
      {questions.map((question) => {
        const text = answerText(question, answers);
        const unanswered = text === 'Not answered';
        return (
          <div className="grid gap-1 py-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] sm:gap-4" key={question.key}>
            <dt className="text-[12px] font-semibold text-slate-600">{question.label}</dt>
            <dd
              className={`break-words text-[13px] ${
                unanswered ? 'italic text-slate-400' : 'font-semibold text-slate-800'
              }`}
            >
              {text}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/**
 * The stage strip, so the applicant can see how far through they are and that
 * saving Stage 1 was not the submission.
 *
 * Reads as an ordered list rather than a set of pills because the order is the
 * point. Confirmation is deliberately not numbered - it is the outcome of
 * submitting from Stage 2, not a further step - so there are two numbers.
 */
function StageProgress({ current }: { current: ApplicationStage }) {
  const currentNumber = stageNumber(current);
  const steps: Array<{ number: 1 | 2; label: string }> = [
    { number: 1, label: STAGE_LABEL.additional_information },
    { number: 2, label: STAGE_LABEL.full_application },
  ];

  return (
    <nav aria-label="Application progress" className="no-print">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
        {steps.map((step, index) => {
          const done = step.number < currentNumber;
          const active = step.number === currentNumber;

          return (
            <li className="flex items-center gap-2" key={step.number}>
              {index > 0 ? <span aria-hidden="true" className="text-slate-300">→</span> : null}
              <span
                aria-current={active ? 'step' : undefined}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold ${
                  active
                    ? 'bg-gov-blue text-white'
                    : done
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'bg-slate-100 text-slate-500'
                }`}
              >
                <span className="font-mono">{step.number}</span>
                {step.label}
                {done ? <span className="sr-only"> (completed)</span> : null}
              </span>
            </li>
          );
        })}
      </ol>
      {current === 'confirmation' ? (
        <p className="mt-1.5 text-[12px] font-semibold text-green-800">Submitted — this application is now read-only.</p>
      ) : null}
    </nav>
  );
}

export function ApplicantApplicationPage() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const { session, user } = useApplicantAuth();
  const { reload: reloadApplications } = useApplicantApplications();

  const [load, setLoad] = useState<FormLoadState>({ status: 'idle' });
  const [form, setForm] = useState<EditableFormState>(EMPTY_FORM);

  /**
   * The stage the applicant has explicitly moved to, or null while the stage is
   * still being derived from saved data. Null on a fresh mount is what drives the
   * resume rule; a set value is what lets them move back a stage mid-session.
   */
  const [chosenStage, setChosenStage] = useState<ApplicationStage | null>(null);

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [stageOneError, setStageOneError] = useState<string | null>(null);
  const [stageOneSaved, setStageOneSaved] = useState(false);
  const [submitArmed, setSubmitArmed] = useState(false);
  const [busyRequirementId, setBusyRequirementId] = useState<string | null>(null);
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [retryingOcrId, setRetryingOcrId] = useState<string | null>(null);

  /**
   * Folds a re-read of the reading columns back into the links already held.
   *
   * Only the columns this poll owns are replaced, and only on rows that are
   * actually in the poll result, so a link the server did not return keeps
   * everything else it carries.
   */
  const mergeOcrState = useCallback((rows: OcrLinkColumns[]) => {
    if (rows.length === 0) return;
    const byId = new Map(rows.map((row) => [row.id, row]));
    setForm((previous) => {
      let changed = false;
      const links = previous.links.map((link) => {
        const fresh = byId.get(link.id);
        if (!fresh) return link;
        if (
          link.ocr_status === fresh.ocr_status &&
          link.ai_confidence === fresh.ai_confidence &&
          link.ocr_processed_at === fresh.ocr_processed_at
        ) {
          return link;
        }
        changed = true;
        return { ...link, ...fresh };
      });
      return changed ? { ...previous, links } : previous;
    });
  }, []);

  /**
   * Which application the editable state was seeded from, tracked in a ref
   * because `loadForm` needs to compare against it synchronously — before the
   * next render — to decide whether to re-seed. Using `form.seededFor` for the
   * same test means reading state that the very setState call is updating, and
   * React may run an updater more than once.
   */
  const seededIdRef = useRef<string | null>(null);

  const handle = applicationId ?? '';

  // Reads the server's view of any document still being checked, and folds it
  // into the links held above. Idle ΓÇö no timers, no requests ΓÇö once nothing is
  // in flight, so a finished application costs nothing.
  useDocumentOcrPolling(form.links, mergeOcrState);

  const handleRetryOcr = useCallback(async (linkId: string) => {
    setRetryingOcrId(linkId);
    const result = await requestDocumentOcr(linkId);
    setRetryingOcrId(null);

    if (!result.ok) {
      setActionError('The document check could not be started. Please try again in a moment.');
    }
  }, []);

  const loadForm = useCallback(async () => {
    setLoad({ status: 'loading' });
    const result = await loadApplicationForm(handle);

    if (result.status === 'ready') {
      // Note what is deliberately NOT done here: forcing the stage for an
      // already-submitted application. resolveStage() sends anything that is not
      // a draft to the read-only review on its own, and hard-coding it here would
      // also clobber the confirmation view the moment handleSubmit reloads the
      // bundle after a successful submit.
      //
      // Seed the editable state exactly once per application. Re-seeding on every
      // reload would silently discard answers the applicant has typed but not yet
      // saved, which is the worst possible moment to lose them.
      const { application: loaded, profile: loadedProfile } = result.bundle;

      if (seededIdRef.current !== loaded.id) {
        seededIdRef.current = loaded.id;
        // The known question keys, so stored answers for questions this form no
        // longer asks are dropped on read rather than written back on the next
        // save.
        const knownKeys = buildSchemeQuestions().map((question) => question.key);

        setForm({
          answers: readStoredAnswers(loaded, knownKeys),
          declaration: Boolean(loaded.declaration_accepted),
          links: result.bundle.links,
          documents: loadedProfile.documents,
        });
        // A "saved" banner belongs to the application that earned it. Opening a
        // different one must not inherit it.
        setStageOneSaved(false);
      } else {
        // Same application, new read: refresh the read-only parts only. The
        // answers are left alone so an in-progress edit survives a background
        // reload, while attached documents and their links stay in step with
        // the database.
        setForm((previous) => ({
          ...previous,
          declaration: Boolean(loaded.declaration_accepted),
          links: result.bundle.links,
          documents: loadedProfile.documents,
        }));
      }
    }

    setLoad(result);
  }, [handle]);

  /**
   * Switching applications starts the flow from the beginning.
   *
   * Without this, an applicant who is part-way through one application and opens
   * another inherits the first one's stage. Because `chosen` outranks the derived
   * stage, a leftover 'full_application' would drop them straight into the full
   * form of an application whose Stage 1 was never filled in — the exact thing
   * the two-stage flow exists to prevent.
   *
   * Declared before the loading effect on purpose, so the clear always happens
   * before the new application is read. It also clears the seed id, so
   * `loadForm` re-seeds rather than treating the new application as a refresh of
   * the old one.
   */
  useEffect(() => {
    seededIdRef.current = null;
    setChosenStage(null);
    setStageOneSaved(false);
    setStageOneError(null);
    setSubmitArmed(false);
    setActionError(null);
    setSavedAt(null);
    setForm(EMPTY_FORM);
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

  const questions = useMemo(() => buildSchemeQuestions(), []);

  const requirements = useMemo(
    () =>
      scheme
        ? buildDocumentRequirements(
            scheme.documents,
            form.links,
            form.documents,
            busyRequirementId,
            uploadErrors,
            profile?.course?.year_of_study ?? null
          )
        : [],
    [scheme, form.links, form.documents, busyRequirementId, uploadErrors, profile?.course?.year_of_study],
  );

  const isDraft = application?.status === 'draft';

  /**
   * Stage 1 completion, derived rather than stored.
   *
   * This is the single input that decides whether a returning applicant opens on
   * Stage 1 or Stage 2, and it is read from the same answers and document links
   * the form writes, so it cannot claim Stage 1 is done when a required document
   * is actually missing.
   */
  const stageOneState = useMemo(
    () => ({ questions, answers: form.answers, requirements }),
    [questions, form.answers, requirements],
  );

  const stageOneBlockerList = useMemo(() => stageOneBlockers(stageOneState), [stageOneState]);
  const stageOneComplete = useMemo(() => isStageOneComplete(stageOneState), [stageOneState]);

  const stage = resolveStage({
    isDraft: isDraft === true,
    stageOneComplete,
    chosen: chosenStage,
  });

  const isStageOne = stage === 'additional_information';
  const isFormStage = stage === 'full_application';

  /** Everything that stops Submit, phrased for the applicant. */
  const blockers = useMemo(() => {
    if (!isDraft) return [];
    const issues: string[] = [];

    for (const question of questions) {
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
    setStageOneError(null);
    setStageOneSaved(false);
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

  /**
   * Stage 1 -> Stage 2.
   *
   * Deliberately NOT a submission. It validates Stage 1, writes the answers with
   * saveApplicationDraft — which leaves applications.status at 'draft' and only
   * touches draft_saved_at — and moves on. There is no call to
   * submitApplication anywhere in this path, so the status cannot become
   * 'submitted' from Stage 1 no matter what the applicant does here.
   *
   * Document links are already persisted: the page attaches each one through
   * attachSchemeDocument the moment it is chosen, so by this point only the
   * answers are outstanding.
   *
   * A validation failure returns without changing stage, which is what keeps the
   * applicant on Stage 1 with the missing items listed.
   */
  const handleSaveAndContinue = async () => {
    if (!application) return;
    setActionError(null);
    setStageOneError(null);

    const missing = stageOneBlockers({ questions, answers: form.answers, requirements });
    if (missing.length > 0) {
      setStageOneError('Some required items are still missing. Please complete them before continuing.');
      return;
    }

    setSaving(true);
    const result = await saveApplicationDraft(application.id, form.answers);
    setSaving(false);

    if (!result.ok) {
      setStageOneError(result.message);
      return;
    }

    setSavedAt(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    setStageOneSaved(true);
    setChosenStage('full_application');
  };

  const handleSubmit = async () => {
    if (!application) return;
    if (blockers.length > 0) {
      // Defensive: the button is disabled while blockers exist, so reaching this
      // means the state changed underneath us. Say what is missing rather than
      // firing a request the database would only reject.
      setActionError('Some required items are still missing. Please review the highlighted items.');
      setSubmitArmed(false);
      return;
    }

    setSubmitting(true);
    setActionError(null);

    const result = await submitApplication(application.id, form.answers, form.declaration);
    setSubmitting(false);

    if (!result.ok) {
      setActionError(result.message);
      setSubmitArmed(false);
      return;
    }

    setSubmitArmed(false);
    reloadApplications();
    await loadForm();
    // Confirmation only after the reload has landed, so the reference and
    // submitted-at shown are the ones the database now holds rather than the
    // values this component happened to be holding.
    setChosenStage('confirmation');
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

    // Ask the server to read the document that has just been attached. Not
    // awaited, and the result is deliberately not surfaced: the link is already
    // written, so a failure here is about a reading service, not about the
    // applicant's upload, and reporting it would put an error on a form they
    // completed correctly for something they cannot act on. What the reviewer
    // sees is the ocr_status on the row.
    void requestDocumentOcr(result.link.id);
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
    requirement: {
      id: string;
      document_name: string;
      document_type?: string | null;
      max_file_size_mb?: number | null;
    },
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
    // document_type, which the profile's certificate slots match on exactly. The
    // scheme's controlled document_type is passed first so official rows map to
    // the right slot rather than being slugified from the guideline's prose.
    const uploaded = await uploadDocument({
      applicantId: application.applicant_id,
      documentCode: resolveDocumentCode(requirement.document_name, requirement.document_type),
      file,
      maxFileSizeMb: requirement.max_file_size_mb ?? null,
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
  const mandatoryTotal = requirements.filter((item) => item.requirement.is_mandatory).length;
  const mandatoryDone = requirements.filter((item) => item.requirement.is_mandatory && item.attached).length;

  const schemeName = scheme?.scheme.name ?? 'this scholarship';

  /* ---------------------------------------------------------------------- */
  /* Stage 1 — Additional Information                                        */
  /*                                                                         */
  /* A separate view, not the same tree with the profile removed. Nothing     */
  /* below the profile sections is reachable from here, so there is no way to */
  /* reach a declaration or a submit button before Stage 1 has been saved.   */
  /* ---------------------------------------------------------------------- */
  if (isStageOne) {
    return (
      <div className="space-y-6 py-1 sm:py-2">
        <ApplicantPageHeader
          action={
            <div className="no-print flex flex-wrap items-center gap-2">
              <Button size="md" to={ROUTES.applicant.applications} variant="outline">
                Back to applications
              </Button>
            </div>
          }
          description="Answer whether this is a renewal application and attach the documents it needs. Your full application form comes next."
          eyebrow={`Application ${reference}`}
          title={schemeName}
        />

        {!scheme ? (
          <Card className="border-amber-300 bg-amber-50 p-4" role="status">
            <p className="text-[13px] font-semibold text-amber-900">This scheme is no longer published</p>
            <p className="mt-1 text-[12px] leading-snug text-amber-800">
              Its questions and document list are unavailable, so this stage cannot be completed. Your existing
              application and answers are untouched. Please contact the department if you believe this is wrong.
            </p>
          </Card>
        ) : null}

        <StageProgress current={stage} />

        <ApplicationStageOne
          answers={form.answers}
          blockers={stageOneBlockerList}
          disabled={isDraft !== true}
          documents={form.documents}
          error={stageOneError}
          onAnswer={setAnswer}
          onAttach={(requirementId, documentId) => void handleAttach(requirementId, documentId)}
          onDetach={(linkId) => void handleDetach(linkId)}
          onRetryOcr={(linkId) => void handleRetryOcr(linkId)}
          retryingOcrId={retryingOcrId}
          onSaveAndContinue={() => void handleSaveAndContinue()}
          onSaveDraft={() => void handleSaveDraft()}
          onUpload={(requirement, file) => void handleUpload(requirement, file)}
          questions={questions}
          requirements={requirements}
          savedAt={savedAt}
          saving={saving}
          schemeName={schemeName}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-1 sm:py-2">
      <ApplicantPageHeader
        action={
          <div className="no-print flex flex-wrap items-center gap-2">
            {/* Stage 1 stays reachable from Stage 2 so an applicant who spots a
                wrong answer or a wrong document can fix it where they entered
                it, without hunting through the form. This is the only way back:
                there is no second editable copy of the answers in Stage 2. */}
            {isFormStage && isDraft ? (
              <Button
                onClick={() => {
                  setActionError(null);
                  setSubmitArmed(false);
                  // Cleared, or the "saved successfully" banner from Stage 2 would
                  // still be sitting on Stage 1, claiming a save that is not
                  // happening now.
                  setStageOneSaved(false);
                  setChosenStage('additional_information');
                }}
                size="md"
                variant="outline"
              >
                Back to additional information
              </Button>
            ) : null}

            <Button onClick={() => window.print()} size="md" variant="outline">
              Print
            </Button>
            <Button size="md" to={ROUTES.applicant.applications} variant="outline">
              Back to applications
            </Button>
          </div>
        }
        description="Everything you are submitting, read back. Check it, tick the declaration, then submit. Changes are made in Additional Information or My Profile."
        eyebrow={`Application ${reference}`}
        title={schemeName}
      />

      <StageProgress current={stage} />

      {stageOneSaved && !isStageOne ? (
        <Card className="no-print border-green-300 bg-green-50 p-4" role="status">
          <p className="text-[13px] font-semibold text-green-900">Additional information saved successfully.</p>
          <p className="mt-0.5 text-[12px] text-green-800">
            The full application form is below. You still need to review it and submit before anything is sent.
          </p>
        </Card>
      ) : null}

      <Card className="print-flat p-5">
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

      {stage === 'confirmation' ? (
        <Card className="print-flat print-keep border-green-300 bg-green-50 p-6" role="status">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-green-800">Submitted</p>
              <h2 className="mt-1 text-xl font-bold text-gov-blue-dark">Your application has been submitted</h2>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-700">
                Keep the reference below. Quote it in any correspondence about this application.
              </p>
              <p className="mt-3 font-mono text-lg font-bold text-slate-900">{reference}</p>
              {application.submitted_at ? (
                <p className="mt-1.5 text-[12px] text-slate-600">
                  Submitted on{' '}
                  {new Date(application.submitted_at).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              ) : null}
              <p className="mt-3 text-[12px] leading-relaxed text-slate-700">
                The department will verify your documents. You will be notified if anything needs correcting, and the
                application stays locked until then.
              </p>
            </div>
            <div className="no-print flex shrink-0 flex-col gap-2">
              <Button onClick={() => window.print()} size="md" variant="outline">
                Print confirmation
              </Button>
              <Button size="md" to={ROUTES.applicant.applications} variant="primary">
                View my applications
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {!scheme ? (
        <Card className="print-flat border-amber-300 bg-amber-50 p-4" role="status">
          <p className="text-[13px] font-semibold text-amber-900">This scheme is no longer published</p>
          <p className="mt-1 text-[12px] leading-snug text-amber-800">
            Its details, document list and questions are unavailable, so the form below cannot be completed. Your
            existing application and answers are untouched. Please contact the department if you believe this is wrong.
          </p>
        </Card>
      ) : null}

      {/* 1. Applicant information — from My Profile, never re-entered */}
      <Card className="print-flat print-keep p-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gov-saffron-dark">Section 1</p>
        <h2 className="mt-1 text-lg font-bold text-gov-blue-dark">Applicant information</h2>
        <p className="mt-1 text-[12px] text-slate-600">
          The essentials, taken from My Profile. You do not need to type any of this again. Personal information below
          has the rest.
        </p>
        <div className="mt-4">
          <ApplicantSummary profile={profile} />
        </div>
      </Card>

      {/* 2. Academic information — also from My Profile, so the applicant is
          never asked for a qualification twice. */}
      <Card className="print-flat print-keep p-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gov-saffron-dark">Section 2</p>
        <h2 className="mt-1 text-lg font-bold text-gov-blue-dark">Academic information</h2>
        <p className="mt-1 text-[12px] text-slate-600">
          The qualifications and current course saved in My Profile.
        </p>
        <div className="mt-4">
          <AcademicInformationSection profile={profile} />
        </div>
      </Card>

      {/* 3. The rest of the personal profile. This is the only view an applicant
          gets of every profile field before submitting, so it is not hidden
          behind a link - this is where they check it, and My Profile is where
          they change it. */}
      <Card className="print-flat print-keep p-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gov-saffron-dark">Section 3</p>
        <h2 className="mt-1 text-lg font-bold text-gov-blue-dark">Personal information</h2>
        <p className="mt-1 text-[12px] text-slate-600">
          Everything else My Profile holds, shown in full so you can check it before submitting. Changes are made in My
          Profile, not here.
        </p>
        <div className="mt-4">
          <ApplicantInformationSection profile={profile} />
        </div>
      </Card>

      {/* 4. Additional information — the answers saved in Stage 1, read back.
          The editable per-question cards and their "why this is asked" lines are
          scaffolding for filling an answer in; once it is answered, what the
          applicant needs is the value they gave. Corrections go back to Stage 1,
          which the header links to. */}
      <Card className="print-flat print-keep p-5" accentClass="border-l-4 border-gov-saffron">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gov-saffron-dark">Section 4</p>
        <h2 className="mt-1 text-lg font-bold text-gov-blue-dark">Additional information</h2>

        {questions.length === 0 ? (
          <p className="mt-4 text-[13px] text-slate-600">
            This scholarship asks for no additional information beyond your profile and documents.
          </p>
        ) : (
          <div className="mt-4">
            <AnswerReviewList answers={form.answers} questions={questions} />
          </div>
        )}
      </Card>

      {/* 5. Required documents — the Stage 1 uploads, read back and viewable */}
      <Card className="print-flat print-keep p-5">
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
          <DocumentReviewList requirements={requirements} schemeLoaded={Boolean(scheme)} />
        </div>
      </Card>

      {/* 6. Declaration — the one input in Stage 2, because it is the only
          statement the applicant makes themselves and it has to be given where
          the thing it confirms is on screen. Ticking it is blocked from submit,
          not from saving a draft, so an unfinished application can still be
          saved. Once submitted it is read-only and shown as a statement. */}
      <Card className="print-flat print-keep p-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gov-saffron-dark">Section 6</p>
        <h2 className="mt-1 text-lg font-bold text-gov-blue-dark">Declaration</h2>

        <div className="mt-4 rounded border border-slate-200 bg-slate-50 px-3 py-3">
          {isDraft ? (
            <CheckboxField
              checked={form.declaration}
              hint="Required before the application can be submitted. This tick belongs to the submission below: Save draft keeps your answers and documents, and you tick it again when you submit."
              label="I confirm that the information in this application, and the profile information it draws from, is correct and complete to the best of my knowledge."
              onChange={(checked) => {
                setSavedAt(null);
                setForm((previous) => ({ ...previous, declaration: checked }));
              }}
            />
          ) : (
            <p className="text-[13px] text-slate-800">
              I confirm that the information in this application, and the profile information it draws from, is correct
              and complete to the best of my knowledge.
              <span className="mt-1.5 block text-[12px] font-semibold">
                {form.declaration ? 'Accepted' : 'Not recorded'}
              </span>
            </p>
          )}
        </div>
      </Card>

      {/* 7. Save / Submit */}
      <Card className="no-print p-5" accentClass="border-l-4 border-gov-blue">
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

          {/* Two deliberate presses, not one. The first arms the submission and
              states plainly that it locks the application; the second is the one
              that calls submitApplication. A single button is too easy to fire
              by accident, and this is the one irreversible action in the whole
              flow. The button sits directly under everything it submits, so
              there is no separate review step to move through first. */}
          {isFormStage ? (
            submitArmed ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  disabled={submitting || saving}
                  onClick={() => void handleSubmit()}
                  size="md"
                  variant="primary"
                >
                  {submitting ? 'Submitting…' : 'Confirm and submit'}
                </Button>
                <Button onClick={() => setSubmitArmed(false)} size="md" variant="outline">
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                disabled={!isDraft || submitting || saving || blockers.length > 0 || closed === true}
                onClick={() => {
                  setActionError(null);
                  setSubmitArmed(true);
                }}
                size="md"
                variant="primary"
              >
                Submit application
              </Button>
            )
          ) : null}

          {savedAt ? (
            <span className="text-[12px] text-emerald-700" role="status">
              Draft saved at {savedAt}
            </span>
          ) : null}
        </div>

        {isFormStage && submitArmed ? (
          <div className="mt-3 rounded border border-amber-300 bg-amber-50 px-3 py-2.5" role="alert">
            <p className="text-[13px] font-semibold text-amber-900">
              This is the final step. Pressing confirm submits the application to the department and locks it.
            </p>
            <p className="mt-1 text-[12px] leading-snug text-amber-800">
              It can only be changed afterwards if the department raises a deficiency. Check the reference, your
              personal details, every document, and the declaration above before you continue.
            </p>
          </div>
        ) : null}

        {isDraft && !submitArmed ? (
          <p className="mt-3 text-[12px] leading-snug text-slate-600">
            Nothing has been sent yet. Pressing submit application will ask you to confirm, and only the confirmation
            submits it. Print or save this page first if you want a copy.
          </p>
        ) : null}

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

          <Card className="print-flat p-5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gov-saffron-dark">Documents on your profile</p>
            <h2 className="mt-1 text-lg font-bold text-gov-blue-dark">Your document library</h2>
            {form.documents.length === 0 ? (
              <p className="mt-4 rounded border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-600">
                You have not uploaded any document yet.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-100">
                {form.documents.map((document) => {
                  const documentStatus = documentStatusFromRecord(document);
                  return (
                  <li className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0" key={document.id}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {document.file_name ?? document.document_name ?? document.document_type ?? 'Document'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {document.mime_type ?? 'file'} ·{' '}
                        {(document.verification_status ?? 'pending').replace(/_/g, ' ')}
                      </p>
                    </div>
                    <DocumentStatusBadge status={documentStatus} />
                  </li>
                  );
                })}
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
