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
import type { ApplicantDocumentStatus } from '../types';

/* -------------------------------------------------------------------------- */
/* Verification status                                                         */
/* -------------------------------------------------------------------------- */

/**
 * `applicant_documents.verification_status` -> the UI's document status.
 *
 * The DB CHECK allows only pending | ai_verified | human_verified | rejected, and
 * the column is NOT NULL defaulting to 'pending'. The UI vocabulary is
 * hyphenated and slightly wider, so the translation lives here once rather than
 * being re-guessed at each call site: a fresh upload is 'pending' in the database
 * and is therefore shown as "under verification" rather than as a neutral
 * "uploaded", because the database now records that a check is outstanding.
 */
const VERIFICATION_STATUS_MAP: Record<string, ApplicantDocumentStatus> = {
  pending: 'under-verification',
  ai_verified: 'verified',
  human_verified: 'verified',
  rejected: 'rejected',
};

export function documentStatusFromRecord(
  record: Pick<ApplicantDocumentRecord, 'verification_status'>
): ApplicantDocumentStatus {
  return VERIFICATION_STATUS_MAP[record.verification_status ?? 'pending'] ?? 'uploaded';
}

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
 * Drops requirements the applicant's course year does not reach.
 *
 * `scheme_documents.required_from_course_year` is the lowest course year at which
 * a document is required. Only "Previous / Last Year Marksheet" on BPVGK and
 * BVOBC set it to 2, so a first-year applicant is never asked for a previous
 * year's mark sheet while a second-year applicant is.
 *
 * An unknown course year (`null`/`undefined`, or a value that is not a number)
 * keeps every requirement. Showing the applicant too few documents on the basis
 * of missing data would let them submit an incomplete application, which is worse
 * than asking for one extra file.
 */
export function filterDocumentsForCourseYear(
  documents: SchemeDocument[],
  courseYear: number | null | undefined
): SchemeDocument[] {
  if (typeof courseYear !== 'number' || !Number.isFinite(courseYear)) return documents;
  return documents.filter(
    (document) =>
      typeof document.required_from_course_year !== 'number' ||
      courseYear >= document.required_from_course_year
  );
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
  courseYear?: number | null
): DocumentRequirementView[] {
  return filterDocumentsForCourseYear(schemeDocuments, courseYear).map((requirement) => {
    const link = links.find((candidate) => candidate.scheme_document_id === requirement.id) ?? null;
    const attached = link ? documents.find((document) => document.id === link.document_id) ?? null : null;

    // The scheme's own `document_type` is a controlled vocabulary written by
    // 20260927000160_official_scheme_data_documents.sql, so it is passed ahead of
    // the free-text name: it disambiguates cases the name cannot, such as
    // ARG45's "Offer of Admission from IITs/AIIMS/IIMs/IISERs" versus its
    // "Admission / Joining Certificate", which both contain the word admission
    // and would otherwise both map to the same applicant code.
    const reusable =
      link || attached
        ? null
        : matchExistingDocument(requirement.document_name, documents, requirement.document_type);

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
