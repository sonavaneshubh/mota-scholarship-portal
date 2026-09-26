/**
 * Where "continue to the application form" should send an applicant.
 *
 * WHY A SEPARATE MODULE
 *
 * The profile page had no route onward at all: the last section's primary button
 * read "Save section" and stopped. Every other page links to the form by
 * application id, and an application id only exists once someone has applied, so
 * the decision -- resume the open application, or go and pick a scheme first --
 * needs to be made from data rather than hard-coded.
 *
 * Kept pure and separate from the page so the choice can be tested without a
 * database or a router.
 */

import type { ApplicantApplication } from '../types';
import { applicantApplicationPath, ROUTES } from './constants';

/** A row that can still be edited, so the form is a resume rather than a new start. */
const RESUMABLE = new Set(['draft']);

/**
 * The application to resume, or null when the applicant has to choose a scheme.
 *
 * Prefers a draft, because that is the one an applicant mid-way through expects to
 * land back in. Only drafts are resumable: a submitted or under-verification
 * application must not be re-entered, and sending the applicant there from a
 * "continue your application" button would be misleading. Ties are broken by
 * `updatedAt` so the most recently touched draft wins, and a row without a usable
 * id is skipped rather than linked -- an id-less row can only render
 * "Application not found".
 */
export function pickResumableApplication(
  applications: readonly ApplicantApplication[],
): ApplicantApplication | null {
  const resumable = applications
    .filter((application) => application.id !== null && RESUMABLE.has(application.status))
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0));

  return resumable[0] ?? null;
}

export interface ContinueTarget {
  to: string;
  label: string;
  /** True when the target is a real application rather than the scheme list. */
  resumes: boolean;
}

/**
 * Resolve the "continue" destination.
 *
 * Falls back to the scheme list whenever there is nothing to resume, so the
 * button is never a dead end: an applicant with no application yet gets sent to
 * pick one, which is the only way an application id can come into existence.
 */
export function resolveContinueTarget(
  applications: readonly ApplicantApplication[] | null | undefined,
): ContinueTarget {
  const resumable = applications ? pickResumableApplication(applications) : null;

  if (resumable?.id) {
    return {
      to: applicantApplicationPath(resumable.id),
      label: 'Continue application',
      resumes: true,
    };
  }

  return {
    to: ROUTES.applicant.schemes,
    label: 'Browse schemes to apply',
    resumes: false,
  };
}
