/**
 * Stage 1 — Additional Information.
 *
 * Two things, and nothing else:
 *
 *   1. Is this a renewal application?        yes / no
 *   2. This scheme's required documents      from scheme_documents
 *
 * The applicant's own identity, academic, address and bank details are already
 * in My Profile, so none of it is repeated here. There is no profile summary, no
 * declaration and no submit button on this screen: the declaration is a
 * submission-time statement, and Submit is only reachable from review.
 *
 * "Save & Continue" is emphatically not a submission. It writes the renewal
 * answer through saveApplicationDraft, which leaves applications.status at
 * 'draft' and only touches draft_saved_at; the status moves in
 * submitApplication, which is only reachable from the review stage. That is why
 * this component has no submit handler at all — there is no code path here that
 * could mark the application submitted.
 *
 * Document links are persisted as they are made, by the existing
 * attachSchemeDocument call in the page, so "save the uploaded document
 * references" needs no separate step: by the time Save & Continue runs, the
 * links are already in application_documents and only the answer is pending.
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
        <p className="text-[11px] font-bold uppercase tracking-wider text-gov-saffron-dark">Step 1</p>
        <h2 className="mt-1 text-lg font-bold text-gov-blue-dark">Additional information</h2>
        <p className="mt-1 text-[12px] leading-relaxed text-slate-600">
          One question about {schemeName}, and the documents it needs. Everything else comes from your profile.
        </p>
      </Card>

      <Card className="p-5">
        <h3 className="text-lg font-bold text-gov-blue-dark">Additional information</h3>

        <SchemeQuestionFields answers={answers} disabled={disabled} onAnswer={onAnswer} questions={questions} />
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-gov-blue-dark">Required documents</h3>
          {mandatoryTotal > 0 ? (
            <Badge tone={mandatoryDone === mandatoryTotal ? 'green' : 'amber'}>
              {`${mandatoryDone} of ${mandatoryTotal} attached`}
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
      </Card>

      <Card accentClass="border-l-4 border-gov-blue" className="p-5">
        <h3 className="text-lg font-bold text-gov-blue-dark">Save and continue</h3>
        <p className="mt-1 text-[12px] leading-relaxed text-slate-600">
          This keeps your application as a draft and opens the full application form. Nothing is submitted until you
          confirm it on the last step.
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
