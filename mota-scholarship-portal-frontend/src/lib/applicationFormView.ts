/**
 * Pure view-model builders for the applicant application form.
 *
 * These live apart from the components in components/applicant/ on purpose. A file
 * that exports both a component and a plain function breaks React Fast Refresh —
 * editing it forces a full reload and loses in-progress form state — and eslint
 * flags exactly that (react-refresh/only-export-components). Nothing here touches
 * React, so all of it is testable without a renderer.
 */

import { matchExistingDocument } from './applicationFormRules';
import type { SchemeDocument } from './supabase';
import type { ApplicantDocumentRecord } from '../types/profile';

/* -------------------------------------------------------------------------- */
/* Days remaining                                                               */
/* -------------------------------------------------------------------------- */

/**
 * Whole days from today until `value`, or null when there is no usable date.
 *
 * Null rather than Infinity when the date is absent, because "no deadline set"
 * and "deadline is in the year 3000" mean different things to an applicant. A
 * deadline that has already passed returns a negative number, which is what the
 * form uses to close submission.
 */
export function daysUntil(value: string | null | undefined): number | null {
  if (!value) return null;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;

  // Compare at UTC midnight on both sides. Comparing raw timestamps would call
  // today "0 days remaining" only in the server's timezone, and an applicant in
  // IST would see the deadline close a day early or late depending on the hour.
  const today = new Date();
  const startOfToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const startOfTarget = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());

  return Math.round((startOfTarget - startOfToday) / 86_400_000);
}

/* -------------------------------------------------------------------------- */
/* Document requirement checklist                                               */
/* -------------------------------------------------------------------------- */

export interface DocumentRequirementLink {
  id: string;
  application_id: string;
  scheme_document_id: string;
  document_id: string;
  created_at: string;
}

export interface DocumentRequirementView {
  requirement: SchemeDocument;
  /** The link row, when this requirement is already satisfied. */
  link: DocumentRequirementLink | null;
  /** The applicant's own document behind that link. */
  attached: ApplicantDocumentRecord | null;
  /** A matching document the applicant already uploaded, offered for reuse. */
  reusable: ApplicantDocumentRecord | null;
  uploadError: string | null;
  busy: boolean;
}

/**
 * Builds the per-requirement view model the checklist renders.
 *
 * Three states per requirement, in priority order: attached (this application
 * already points at a document), reusable (the applicant has a matching file in
 * their library but has not linked it), or nothing. The reusable shortcut is only
 * offered when nothing is attached — once a document is attached it is the
 * answer, and suggesting a different one just invites churn.
 */
export function buildDocumentRequirements(
  schemeDocuments: SchemeDocument[],
  links: DocumentRequirementLink[],
  documents: ApplicantDocumentRecord[],
  busyRequirementId: string | null,
  uploadErrors: Record<string, string>,
): DocumentRequirementView[] {
  return schemeDocuments.map((requirement) => {
    const link = links.find((candidate) => candidate.scheme_document_id === requirement.id) ?? null;
    const attached = link ? documents.find((document) => document.id === link.document_id) ?? null : null;

    const reusable = link || attached ? null : matchExistingDocument(requirement.document_name, documents);

    return {
      requirement,
      link,
      attached,
      reusable,
      uploadError: uploadErrors[requirement.id] ?? null,
      busy: busyRequirementId === requirement.id,
    };
  });
}
