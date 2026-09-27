/**
 * The two-stage application flow, as pure logic.
 *
 * The brief this implements:
 *
 *     Apply Now
 *       -> Stage 1  Additional Information      (scheme-specific only)
 *       -> Save & Continue                       (NOT a submission)
 *       -> Stage 2  Full Application Form        (profile + academic + scheme)
 *       -> Review / Check All Details
 *       -> Submit Application
 *       -> Confirmation
 *
 * Two decisions worth stating plainly, because they are what keep this honest:
 *
 * 1. There is no `stage` column and this file does not add one. The instruction
 *    was to reuse the existing application architecture and not touch migrations,
 *    so "has Stage 1 been completed" is *derived* from data that already
 *    persists — the stored scheme answers and the application_documents links.
 *    That is a better answer than a stored flag anyway: it cannot disagree with
 *    the data, and an applicant who deletes an answer or removes a document
 *    correctly falls back to Stage 1 instead of holding a stale "done" marker.
 *    Because the inputs are database rows, leaving the page and returning
 *    re-derives the same stage, which is exactly the resume rule in the brief.
 *
 * 2. Stage 1 completing is *not* a submission. `saveApplicationDraft` already
 *    writes scheme_answers and touches draft_saved_at while leaving status at
 *    'draft', and only submitApplication moves the status, so the two-stage
 *    split reuses the existing write paths rather than adding a third.
 *
 * Pure functions only, so the rules can be exercised without a renderer. React
 * Fast Refresh is also why this is not in the page file: a module exporting both
 * a component and a plain function forces a full reload on edit, which loses
 * in-progress form state (see lib/applicationFormView.ts for the same rule).
 */

import { isAnswered, type SchemeAnswers, type SchemeQuestion } from './applicationFormRules';
import type { DocumentRequirementView } from './applicationFormView';

export type ApplicationStage =
  | 'additional_information'
  | 'full_application'
  | 'review'
  | 'confirmation';

/** The stages in the order the applicant moves through them. */
export const STAGE_SEQUENCE: ApplicationStage[] = [
  'additional_information',
  'full_application',
  'review',
  'confirmation',
];

/** Short, plain-language name for the stage chip and the page heading. */
export const STAGE_LABEL: Record<ApplicationStage, string> = {
  additional_information: 'Additional Information',
  full_application: 'Application Form',
  review: 'Review',
  confirmation: 'Confirmation',
};

/**
 * The stage number shown in the progress strip.
 *
 * Confirmation is deliberately folded onto the review step rather than given a
 * fourth number: it is the outcome of submitting from review, not a place the
 * applicant does further work, so numbering it separately would imply an extra
 * step exists.
 */
export function stageNumber(stage: ApplicationStage): 1 | 2 | 3 {
  if (stage === 'additional_information') return 1;
  if (stage === 'full_application') return 2;
  return 3;
}

export interface StageOneInput {
  /** The scheme-specific questions this scheme asks. */
  questions: SchemeQuestion[];
  answers: SchemeAnswers;
  /** The scheme's own document requirements. */
  requirements: DocumentRequirementView[];
}

/**
 * Everything that stops "Save & Continue", phrased for the applicant.
 *
 * The same three categories the brief lists, each already owned by the existing
 * pipeline rather than re-implemented here:
 *
 *   - a required Yes/No (or other) answer that is still blank
 *   - a mandatory scheme document with nothing attached
 *   - nothing else: file type and size are enforced by documentService before
 *     the upload is even attempted, and a rejected file never becomes a link
 *
 * A question the profile already answers is never a blocker, because the form
 * renders no input for it — there is nothing the applicant could have got wrong.
 */
export function stageOneBlockers(input: StageOneInput): string[] {
  const issues: string[] = [];

  for (const question of input.questions) {
    if (question.fromProfile) continue;
    if (question.required && !isAnswered(question, input.answers)) {
      issues.push(question.label);
    }
  }

  for (const item of input.requirements) {
    if (item.requirement.is_mandatory && !item.attached) {
      issues.push(item.requirement.document_name);
    }
  }

  return issues;
}

/** True when Stage 1 has everything it needs, so Stage 2 may open. */
export function isStageOneComplete(input: StageOneInput): boolean {
  return stageOneBlockers(input).length === 0;
}

export interface ResolveStageInput {
  /** applications.status. Anything other than 'draft' is read-only. */
  isDraft: boolean;
  /** Derived, never stored — see the note at the top of this file. */
  stageOneComplete: boolean;
  /**
   * The stage the applicant has explicitly moved to in this session, or null on
   * first load. Null is what makes the resume rule work: a fresh page load
   * re-derives the stage from the saved data instead of trusting a stale
   * in-memory choice.
   */
  chosen: ApplicationStage | null;
}

/**
 * Which stage to render.
 *
 *  - Submitted (or withdrawn, or anything not a draft) is read-only, so it
 *    resolves to review. No stage can be entered, because entering one would
 *    offer inputs that cannot be saved.
 *  - Otherwise a stage the applicant has already chosen wins, which is what lets
 *    them go back to Stage 1 from Stage 2 without the derivation overriding them
 *    mid-session.
 *  - On a fresh load, completed Stage 1 resumes at Stage 2 and an incomplete one
 *    resumes at Stage 1.
 */
export function resolveStage(input: ResolveStageInput): ApplicationStage {
  if (input.chosen) {
    // A submitted application cannot be edited, so asking for a stage beyond
    // review would be asking for an edit that silently fails to save.
    if (!input.isDraft) return input.chosen === 'confirmation' ? 'confirmation' : 'review';
    return input.chosen;
  }

  if (!input.isDraft) return 'review';
  return input.stageOneComplete ? 'full_application' : 'additional_information';
}
