/**
 * Stage 1 — Additional Information.
 *
 * The whole point of this stage is what it does NOT contain. The applicant has
 * just clicked Apply Now and has already filled in My Profile, so showing them
 * their own profile back before they have done anything would bury the only
 * things this stage exists to collect. So this view renders:
 *
 *   - the scheme-specific questions (from buildSchemeQuestions, the same
 *     source of truth Stage 2 uses)
 *   - the scheme's own document requirements (from scheme_documents)
 *
 * and nothing else. No applicant summary, no academic section, no address, no
 * bank details, no declaration, no submit button.
 *
 * "Save & Continue" is emphatically not a submission. It writes the answers
 * through saveApplicationDraft, which leaves applications.status at 'draft' and
 * only touches draft_saved_at; the status moves in submitApplication, which is
 * only reachable from the review stage. That is why this component has no submit
 * handler at all — there is no code path here that could mark the application
 * submitted.
 *
 * Document links are persisted as they are made, by the existing
 * attachSchemeDocument call in the page, so "save the uploaded document
 * references" needs no separate step: by the time Save & Continue runs, the
 * links are already in application_documents and only the answers are pending.
 */

import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { RequiredDocumentsSection } from './ApplicantFormSchemeSections';
import { SchemeQuestionFields } from './SchemeQuestionFields';
import type { SchemeAnswers, SchemeQuestion } from '../../lib/applicationFormRules';
import type { DocumentRequirementView } from '../../lib/applicationFormView';
import type { ApplicantDocumentRecord } from '../../types/profile';
import type { SchemeDocument } from '../../lib/supabase';

interface ApplicationStageOneProps {
  schemeName: string;
  questions: SchemeQuestion[];
  answers: SchemeAnswers;
  requirements: DocumentRequirementView[];
  documents: ApplicantDocumentRecord[];
  /** True once the application is no longer a draft. */
  disabled: boolean;
  saving: boolean;
  savedAt: string | null;
  /** Validation failure from a Save & Continue that did not go through. */
  error: string | null;
  /** Items still missing, listed so the applicant can see what to do. */
  blockers: string[];
  onAnswer: (key: string, value: string) => void;
  onAttach: (requirementId: string, documentId: string) => void;
  onDetach: (linkId: string) => void;
  onUpload: (requirement: SchemeDocument, file: File) => void;
  onSaveDraft: () => void;
  onSaveAndContinue: () => void;
}

export function ApplicationStageOne({
  schemeName,
  questions,
  answers,
  requirements,
  documents,
  disabled,
  saving,
  savedAt,
  error,
  blockers,
  onAnswer,
  onAttach,
  onDetach,
  onUpload,
  onSaveDraft,
  onSaveAndContinue,
}: ApplicationStageOneProps) {
  const mandatoryTotal = requirements.filter((item) => item.requirement.is_mandatory).length;
  const mandatoryDone = requirements.filter((item) => item.requirement.is_mandatory && item.attached).length;

  return (
    <div className="space-y-6">
      <Card accentClass="border-l-4 border-gov-saffron" className="p-5">
        {/* "Step 1" rather than "Stage 1 of 2", because the progress strip above
            counts review as step 3. Two different totals on one screen would make
            the applicant think a step was missing. */}
        <p className="text-[11px] font-bold uppercase tracking-wider text-gov-saffron-dark">Step 1 — Additional information</p>
        <h2 className="mt-1 text-lg font-bold text-gov-blue-dark">Additional Information - {schemeName}</h2>
        <p className="mt-1 text-[12px] leading-relaxed text-slate-600">
          This scholarship asks for a few things on top of your profile. Only they are shown here — your personal,
          academic, address and bank details are already in My Profile and you do not need to enter them again. The
          full application form comes after this, once these are saved.
        </p>
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gov-saffron-dark">Questions</p>
            <h2 className="mt-1 text-lg font-bold text-gov-blue-dark">What this scholarship additionally needs</h2>
          </div>
          <Badge tone="slate">{questions.length} asked</Badge>
        </div>

        <SchemeQuestionFields answers={answers} disabled={disabled} onAnswer={onAnswer} questions={questions} />
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gov-saffron-dark">Documents</p>
            <h2 className="mt-1 text-lg font-bold text-gov-blue-dark">Documents this scholarship asks for</h2>
          </div>
          {mandatoryTotal > 0 ? (
            <Badge tone={mandatoryDone === mandatoryTotal ? 'green' : 'amber'}>
              {`${mandatoryDone}/${mandatoryTotal} required attached`}
            </Badge>
          ) : null}
        </div>

        <div className="mt-4">
          <RequiredDocumentsSection
            disabled={disabled}
            documents={documents}
            onAttach={onAttach}
            onDetach={onDetach}
            onUpload={onUpload}
            requirements={requirements}
          />
        </div>

        <p className="mt-3 text-[11px] leading-snug text-slate-500">
          Uploading a file here also adds it to your document library, so you are not asked for the same certificate
          twice. PDF, JPG or PNG, up to 5 MB.
        </p>
      </Card>

      <Card className="p-5">
        <h2 className="text-lg font-bold text-gov-blue-dark">Save and continue</h2>
        <p className="mt-1 text-[12px] leading-relaxed text-slate-600">
          This saves your answers and moves you to the full application form. It is <strong>not</strong> a submission —
          your application stays a draft until you submit it at the end.
        </p>

        {error ? (
          <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-800" role="alert">
            {error}
          </p>
        ) : null}

        {blockers.length > 0 ? (
          <div className="mt-3 rounded border border-amber-300 bg-amber-50 px-3 py-2.5" role="status">
            <p className="text-[12px] font-semibold text-amber-900">
              {blockers.length} item{blockers.length === 1 ? '' : 's'} still needed before you can continue
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
            disabled={disabled || saving}
            onClick={onSaveAndContinue}
            size="md"
            variant="primary"
          >
            {saving ? 'Saving…' : 'Save & Continue'}
          </Button>

          <Button disabled={disabled || saving} onClick={onSaveDraft} size="md" variant="outline">
            {saving ? 'Saving…' : 'Save Draft'}
          </Button>

          {savedAt ? (
            <span className="text-[12px] text-emerald-700" role="status">
              Draft saved at {savedAt}
            </span>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
