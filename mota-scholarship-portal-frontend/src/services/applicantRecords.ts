/**
 * Applicant-owned records: documents and applications.
 *
 * Why this module exists
 * ---------------------
 * The prototype used to render hardcoded rows from src/data/applicantData.ts.
 * That is the single worst kind of bug in a scholarship portal: a sample
 * "Application under scrutiny" that no officer ever wrote. So this module reads
 * only what the signed-in applicant actually has in the database, and reports
 * honestly when a table is not deployed yet.
 *
 * Table availability
 *   applicant_documents  deployed — see 20260926090200_applicant_profile_rls.sql
 *   applications         deployed — see 20260927000002_create_applications.sql
 *
 * Ownership
 *   applicant_id is always resolved from the authenticated user, never accepted
 *   from the caller, and RLS re-checks it server-side.
 */

import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Application } from '../lib/supabase';
import { diagnosticError } from '../lib/diagnostics';
import { documentStatusFromRecord } from '../lib/applicationFormView';
import type { ApplicantDocumentRecord } from '../types/profile';
import type { ApplicantApplication, ApplicantApplicationStatus, ApplicantDocument, ApplicantDocumentStatus } from '../types';

export type RecordsStatus = 'loading' | 'ready' | 'unavailable' | 'error';

export interface ApplicantRecordsResult<T> {
  status: RecordsStatus;
  data: T;
  error: string | null;
}

const DOCUMENTS_TABLE = 'applicant_documents';
const APPLICATIONS_TABLE = 'applications';
const PROFILE_TABLE = 'applicant_profiles';

/**
 * Postgres reports a missing relation as 42P01 and a missing column as 42703.
 * PostgREST surfaces the SQLSTATE in `error.code` and a human message separately,
 * so both are checked. A missing relation means "the backend has not shipped
 * this yet", which is different from a permission problem and should not be
 * shown to the applicant as an error.
 *
 * 42883 (undefined_function) is deliberately NOT in this set, even though it
 * used to be. It does not mean a table is missing: it means something the query
 * depends on resolved to no function. On this project that is exactly what the
 * broken `applicant_profile_completeness()` / `refresh_applicant_completeness()`
 * pair raises (their bodies call `jsonb_object_length`, which does not resolve
 * on the deployed database). Classifying that as "not deployed" turned a real
 * database fault into the applicant-facing sentence "Applying is not available
 * yet. Please try again later." — a message that is both wrong and unactionable,
 * and which hid the failure from anyone reading the UI. A fault that is not a
 * missing relation has to surface as a fault.
 */
const MISSING_SCHEMA_CODES = new Set(['42P01', '42703']);

function isMissingRelation(error: { code?: string | null; message: string }): boolean {
  if (error.code && MISSING_SCHEMA_CODES.has(error.code)) return true;
  return /does not exist|not found in the schema cache/i.test(error.message);
}

/**
 * The caller's own applicant_profiles.id, resolved from the Supabase session.
 *
 * Exported because the application form needs the same subject for a different
 * reason: it loads the profile to pre-fill the form, and that read must be
 * scoped to the signed-in applicant in exactly the same way the application
 * lookup is. Resolving it in one place means the two cannot drift.
 */
export async function resolveApplicantId(): Promise<string | null> {
  if (!supabase) {
    diagnosticError('applicant-records', 'cannot resolve the applicant id: no Supabase client');
    return null;
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    diagnosticError('applicant-records', 'cannot resolve the applicant id: no authenticated user', {
      code: userError?.code ?? null,
      message: userError?.message ?? null,
    });
    return null;
  }

  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .select('id')
    .eq('user_id', userData.user.id)
    .maybeSingle();

  if (error) {
    diagnosticError('applicant-records', 'applicant_profiles lookup failed', {
      code: error.code ?? null,
      message: error.message,
    });
    return null;
  }

  if (!data) {
    // Not an infrastructure fault: the account is authenticated but has no
    // applicant profile row, so there is nothing to own records yet.
    diagnosticError('applicant-records', 'the signed-in user has no applicant_profiles row', {
      userId: userData.user.id,
    });
    return null;
  }

  return (data as { id: string }).id;
}

/* -------------------------------------------------------------------------- */
/* Documents                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Display labels for ApplicantDocumentStatus, which is hyphenated
 * ('under-verification'), matching the union in types/index.ts. The underscore
 * spelling used here previously keyed nothing, so every badge fell back to
 * "Uploaded" regardless of the real state.
 */
const DOCUMENT_STATUS_LABELS: Record<ApplicantDocumentStatus, string> = {
  uploaded: 'Uploaded',
  verified: 'Verified',
  rejected: 'Rejected',
  'needs-correction': 'Needs correction',
  'under-verification': 'Under verification',
};

/**
 * `applicant_documents.verification_status` (DB CHECK: pending | ai_verified |
 * human_verified | rejected) onto the view model's status vocabulary. Shared with
 * the application form through documentStatusFromRecord() so both read the same
 * column the same way.
 */

function formatBytes(bytes: number | null): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function humaniseCode(code: string | null): string {
  if (!code) return 'Document';
  return code
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, (character) => character.toUpperCase());
}

function toApplicantDocument(record: ApplicantDocumentRecord): ApplicantDocument {
  // `applicant_documents` stores the verification state in `verification_status`
  // (pending | ai_verified | human_verified | rejected) and has no `status` or
  // `document_code` column. The view model keeps its own status vocabulary, so the
  // DB value is mapped here rather than passed through.
  const status = documentStatusFromRecord(record);
  return {
    id: record.id,
    name: record.file_name?.trim() || record.document_name?.trim() || humaniseCode(record.document_type),
    type: humaniseCode(record.document_type),
    description: record.file_name ? `Uploaded file: ${record.file_name}` : 'Uploaded document.',
    status,
    statusLabel: DOCUMENT_STATUS_LABELS[status] ?? 'Uploaded',
    fileSize: formatBytes(record.file_size),
    uploadedAt: formatDate(record.uploaded_at),
    updatedAt: formatDate(record.uploaded_at),
    required: false,
    storagePath: record.storage_path ?? null,
  };
}

export async function fetchApplicantDocuments(): Promise<ApplicantRecordsResult<ApplicantDocument[]>> {
  if (!supabase) {
    diagnosticError('applicant-records', 'documents unavailable: no Supabase client', {
      configured: isSupabaseConfigured,
    });
    return { status: 'unavailable', data: [], error: null };
  }

  const applicantId = await resolveApplicantId();
  if (!applicantId) {
    return { status: 'unavailable', data: [], error: null };
  }

  const { data, error } = await supabase
    .from(DOCUMENTS_TABLE)
    .select('*')
    .eq('applicant_id', applicantId)
    .order('uploaded_at', { ascending: false });

  if (error) {
    if (isMissingRelation(error)) {
      return { status: 'unavailable', data: [], error: null };
    }
    return { status: 'error', data: [], error: error.message };
  }

  return {
    status: 'ready',
    data: ((data ?? []) as ApplicantDocumentRecord[]).map(toApplicantDocument),
    error: null,
  };
}

/* -------------------------------------------------------------------------- */
/* Applications                                                                 */
/* -------------------------------------------------------------------------- */

const APPLICATION_STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_verification: 'Under verification',
  deficiency_raised: 'Deficiency raised',
  resubmission_required: 'Resubmission required',
  under_scrutiny: 'Under scrutiny',
  selected: 'Selected',
  not_selected: 'Not selected',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

/**
 * `applications.status` (snake_case, mirrors the column) -> the status vocabulary
 * the UI components are typed against (kebab-case, mirrors the tone/label maps in
 * StatusBadge.tsx).
 *
 * The two are deliberately spelled differently — the column and the design system
 * each get their own name — so there has to be an explicit translation. This used
 * to be a bare `as` cast, which typechecked while lying: 'under_verification' is
 * not a member of ApplicantApplicationStatus, so StatusBadge's
 * `applicationToneMap[status]` was undefined and every non-draft badge fell back
 * to grey. Enumerated one state at a time so an unmapped value is a visible
 * default rather than a silently wrong colour.
 */
const APPLICATION_STATUS_TO_UI: Record<string, ApplicantApplicationStatus> = {
  draft: 'draft',
  submitted: 'submitted',
  under_verification: 'under-verification',
  deficiency_raised: 'deficiency-raised',
  resubmission_required: 'resubmission-required',
  under_scrutiny: 'under-scrutiny',
  selected: 'selected',
  not_selected: 'not-selected',
  rejected: 'rejected',
  withdrawn: 'withdrawn',
};

/**
 * Converts a raw database status to the UI vocabulary.
 *
 * Unknown values become 'draft' rather than being passed through, so a status the
 * database adds later renders as a known badge instead of crashing the tone lookup.
 * `draft` is the safe default: it keeps the form editable instead of showing a
 * submitted-looking read-only view for a state we cannot classify.
 */
export function toUiApplicationStatus(status: string | null | undefined): ApplicantApplicationStatus {
  if (!status) return 'draft';
  return APPLICATION_STATUS_TO_UI[status] ?? 'draft';
}

/**
 * Maps an `applications` row onto the view model the existing tables render.
 *
 * Columns are still read defensively rather than assumed: the first field name
 * that exists wins, and anything absent renders as "—" instead of a fabricated
 * value. No amount, date or status is ever invented here.
 *
 * `id` is the row's stable uuid, NOT the human-readable reference, and it is
 * nullable here on purpose. It used to fall back to the reference and then to an
 * em-dash: `read('id') || reference || '—'`. That em-dash is not a uuid and not a
 * reference, so every "View details" link built from it was a guaranteed
 * /applicant/applications/%E2%80%94 that could only ever render "Application not
 * found". Returning null lets the caller decline to render a link it knows is
 * broken, which is strictly better than rendering one that is guaranteed to fail.
 *
 * `referenceNumber` carries the quotable APP-… value for display only. It is
 * never used to build a URL — see applicationRouteHandle() in
 * applicationFormService for why the uuid is the only handle this app emits.
 */
function toApplicantApplication(row: Record<string, unknown>): ApplicantApplication {
  const read = (...keys: string[]): string => {
    for (const key of keys) {
      const value = row[key];
      if (typeof value === 'string' && value.trim()) return value.trim();
    }
    return '';
  };

  const status = read('status');
  const statusLabel = APPLICATION_STATUS_LABELS[status] ?? (status ? status : '—');
  const reference = read('application_number', 'reference_number', 'application_ref');
  const id = read('id');

  return {
    // Only the uuid counts as an id. Falling back to the reference here is what
    // let two different applications end up behind one link, and what made a
    // malformed reference look like a valid id.
    id: id || null,
    schemeId: read('scheme_id'),
    schemeName: read('scheme_name', 'scheme') || '—',
    submittedAt: formatDate(read('submitted_at', 'created_at') || null),
    updatedAt: formatDate(read('updated_at', 'last_updated_at') || null),
    status: toUiApplicationStatus(status),
    statusLabel,
    nextStep: read('next_step', 'remarks', 'note') || 'No update available.',
    referenceNumber: reference || '—',
    amountLabel: read('amount_label', 'sanctioned_amount') || '—',
    documentsComplete: Number(row.documents_complete ?? 0) || 0,
    documentsTotal: Number(row.documents_total ?? 0) || 0,
  };
}

export async function fetchApplicantApplications(): Promise<ApplicantRecordsResult<ApplicantApplication[]>> {
  if (!supabase) {
    diagnosticError('applicant-records', 'applications unavailable: no Supabase client', {
      configured: isSupabaseConfigured,
    });
    return { status: 'unavailable', data: [], error: null };
  }

  const applicantId = await resolveApplicantId();
  if (!applicantId) {
    return { status: 'unavailable', data: [], error: null };
  }

  const { data, error } = await supabase
    .from(APPLICATIONS_TABLE)
    .select('*')
    .eq('applicant_id', applicantId)
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingRelation(error)) {
      return { status: 'unavailable', data: [], error: null };
    }
    return { status: 'error', data: [], error: error.message };
  }

  return {
    status: 'ready',
    data: ((data ?? []) as Record<string, unknown>[]).map(toApplicantApplication),
    error: null,
  };
}

/* -------------------------------------------------------------------------- */
/* Apply Now — create or resume                                                 */
/* -------------------------------------------------------------------------- */

/** Postgres unique_violation. The (applicant_id, scheme_id) index raising this
 *  is the signal that a concurrent click won the race, not a real failure. */
const UNIQUE_VIOLATION = '23505';

export type CreateApplicationOutcome =
  | { ok: true; application: Application; created: boolean }
  | { ok: false; message: string; cause: unknown };

/**
 * The one function an "Apply Now" button calls.
 *
 * Contract: it either returns a real, persisted `applications` row, or it
 * returns `ok: false`. It never invents an id, never returns a row it did not
 * read back from the database, and never throws — a caller that gets `ok: false`
 * must keep the applicant where they are and offer a retry.
 *
 * Duplicate prevention is three-layer, and the order reflects how much each can
 * actually be trusted right now:
 *
 *   1. A SELECT for (applicant_id, scheme_id). Fast path, not trusted alone.
 *   2. A unique constraint on (applicant_id, scheme_id) in the table, added by
 *      20260927000002_create_applications.sql. This is the layer that settles a
 *      race. It is verified live as deployed: a second INSERT for the same
 *      (applicant_id, scheme_id) returns 409 / SQLSTATE 23505
 *      "duplicate key value violates unique constraint
 *      applications_applicant_id_scheme_id_key". The same migration's
 *      set_application_reference() trigger is also live — it mints the
 *      MOTA-2026-XXXXXXXX reference on the row that INSERT creates.
 *   3. A re-read after the INSERT that keeps only the canonical row and offers
 *      the rest for cleanup. This cannot fire while the constraint holds, so it
 *      is now a repair path for rows that predate the constraint rather than a
 *      live race-closer, and it is retained because deleting an applicant's own
 *      surplus draft is not something this function should leave lying around.
 *
 * The earlier version of this comment asserted that 20260927000002 was NOT
 * applied to the live project, on the grounds that "an anonymous read of
 * `applications` returns 200 []". That inference was wrong: `applications` is
 * `revoke all … from anon`, and what returns 200 [] anonymously is `schemes`,
 * whose policies are `to authenticated` and therefore yield zero rows rather
 * than a permission error. The wrong premise is why the code below grew a
 * re-read-and-delete step justified as a race-closer it never actually was.
 *
 * `created` tells the caller which happened, so the UI can say "application
 * created" versus "opening your existing application" without a second query.
 *
 * The applicant is resolved from the Supabase session via
 * supabase.auth.getUser() and the caller's own applicant_profiles row. It is
 * never a parameter. RLS enforces the same rule independently: the insert
 * policy's WITH CHECK compares applicant_id to current_applicant_id(), which
 * resolves auth.uid() server-side, so a tampered body is rejected by Postgres
 * even if this function were changed.
 */
export async function createOrResumeApplication(schemeId: string): Promise<CreateApplicationOutcome> {
  if (!supabase) {
    return {
      ok: false,
      message: 'Applying is unavailable because the database is not configured. Please try again later.',
      cause: null,
    };
  }

  if (!schemeId) {
    return { ok: false, message: 'This scheme could not be identified. Please reopen the scheme and try again.', cause: null };
  }

  // Bound to a local so the closures below keep the non-null narrowing; `supabase`
  // is a module-level `let`-style binding that TS will not narrow inside a callback.
  const client = supabase;

  try {
    const applicantId = await resolveApplicantId();
    if (!applicantId) {
      return {
        ok: false,
        message: 'We could not match your sign-in to an applicant profile. Please sign in again and retry.',
        cause: null,
      };
    }

    /**
     * Every application for this (applicant, scheme), oldest first.
     *
     * A list rather than `.maybeSingle()`, so a pre-existing duplicate resolves to
     * a row the caller can reconcile rather than to an error. With the unique
     * constraint live this returns at most one row; the list shape is kept so the
     * cleanup step has something to work with if it ever sees more.
     */
    const selectAllForScheme = async (): Promise<Application[]> => {
      const { data, error } = await client
        .from(APPLICATIONS_TABLE)
        .select('*')
        .eq('applicant_id', applicantId)
        .eq('scheme_id', schemeId)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Application[];
    };

    // Fast path: an application already exists, so resume the canonical one.
    //
    // "Canonical" is chosen by `pickCanonicalApplication`, not simply "oldest".
    // Where a duplicate already exists, every subsequent Apply converges on the
    // same row rather than adding another, so a second Apply can never be the
    // thing that creates the duplicate the applicant is complaining about.
    const before = await selectAllForScheme();
    if (before.length > 0) {
      const canonical = pickCanonicalApplication(before);
      if (before.length > 1) {
        await removeDuplicateApplications(before.filter((row) => row.id !== canonical.id));
      }
      return { ok: true, application: canonical, created: false };
    }

    // status and application_number are deliberately omitted: status defaults to
    // 'draft' in the table, and application_number is minted by the
    // set_application_reference() BEFORE INSERT trigger, so the reference is
    // generated by the same transaction that inserts the row.
    const { data: inserted, error: insertError } = await client
      .from(APPLICATIONS_TABLE)
      .insert({ applicant_id: applicantId, scheme_id: schemeId })
      .select('*')
      .single();

    if (insertError) {
      // Lost the race against a concurrent click. This is the constraint doing
      // its job: the loser's INSERT is rejected with 23505, and the winner's row
      // is the application, so the loser resumes it instead of creating a second.
      if (insertError.code === UNIQUE_VIOLATION) {
        const after = await selectAllForScheme();
        if (after.length > 0) {
          const canonical = pickCanonicalApplication(after);
          if (after.length > 1) {
            await removeDuplicateApplications(after.filter((row) => row.id !== canonical.id));
          }
          return { ok: true, application: canonical, created: false };
        }
      }

      if (isMissingRelation(insertError)) {
        return {
          ok: false,
          message: 'Applying is not available yet. Please try again later.',
          cause: insertError,
        };
      }

      console.error('Failed to create application', { schemeId, insertError });
      return {
        ok: false,
        message: 'Unable to create your application. Please try again.',
        cause: insertError,
      };
    }

    if (!inserted) {
      return {
        ok: false,
        message: 'Unable to create your application. Please try again.',
        cause: null,
      };
    }

    const created = inserted as Application;

    // A missing reference would mean the BEFORE INSERT trigger is not deployed.
    // The trigger is live — it mints the MOTA-2026-XXXXXXXX reference in the same
    // transaction that inserts the row — so this is a guard, not an expected path.
    // It deliberately does NOT fail the call: the row is real and the applicant
    // can work on it via its uuid, and refusing to hand back a valid application
    // would be worse than a missing label. Logged loudly so the gap gets fixed.
    if (!created.application_number) {
      console.error(
        'Application was created without an application_number. The set_application_reference() trigger is missing — check supabase/migrations/20260927000002_create_applications.sql against this Supabase project.',
        { applicationId: created.id, schemeId },
      );
    }

    // A SELECT cannot see a row another transaction has not committed, so with the
    // unique constraint in place this converges on a single row. Kept as a
    // reconciliation step for any duplicate that predates the constraint: it
    // never deletes a non-draft row (see removeDuplicateApplications).
    const afterInsert = await selectAllForScheme();
    if (afterInsert.length > 1) {
      const canonical = pickCanonicalApplication(afterInsert);
      const surplus = afterInsert.filter((row) => row.id !== canonical.id);
      console.warn(
        `Found ${afterInsert.length} applications for one (applicant, scheme) pair. Converging on ${canonical.id} and offering ${surplus.length} for cleanup.`,
        { schemeId, kept: canonical.id, surplus: surplus.map((row) => ({ id: row.id, status: row.status })) },
      );
      await removeDuplicateApplications(surplus);
      return { ok: true, application: canonical, created: canonical.id === created.id };
    }

    return { ok: true, application: created, created: true };
  } catch (cause) {
    // The raw driver message can name tables, columns and constraint names, so
    // it is logged for the developer and never returned to the applicant.
    console.error('Failed to create application', { schemeId, cause });
    return {
      ok: false,
      message: 'Unable to create your application. Please try again.',
      cause,
    };
  }
}

/**
 * Which row represents the applicant's application for a scheme when more than
 * one exists.
 *
 * Preferring the oldest row was the original rule and it is wrong in a case that
 * matters. An applicant can legitimately end up with a draft *and* a submitted
 * application for the same scheme, and the draft is usually the newer row — so
 * "oldest" can hand back the empty draft and hide the submission the applicant
 * actually made, leaving them editing a blank form while their real application
 * sits unreferenced. When any row has moved past draft, that row wins; among rows
 * of equal standing the earliest wins, which is the same choice everywhere else in
 * the flow and keeps the result stable as more rows accumulate.
 *
 * The caller receives rows already ordered oldest-first, and the ties are broken on
 * the primary key rather than on array position, so two concurrent Apply calls
 * cannot each decide on a different row.
 */
function pickCanonicalApplication(rows: Application[]): Application {
  const rank = (row: Application): number => (row.status === 'draft' ? 1 : 0);
  return [...rows].sort((a, b) => {
    const byStatus = rank(a) - rank(b);
    if (byStatus !== 0) return byStatus;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  })[0];
}

/**
 * Deletes surplus application rows, best-effort, and only ever drafts.
 *
 * The draft-only rule is the important part. This cleanup exists for rows that
 * predate the unique constraint, so two clicks could both insert. It is a repair
 * for that gap, not a general-purpose prune, and it must not be able to delete an
 * application an officer is reviewing: a submitted row is a record of an act the
 * applicant took, and destroying it because a stray draft happened to sit beside
 * it would be unrecoverable data loss on a scholarship portal. `applications` has
 * ten possible statuses and only one of them is `draft`, so requiring an exact
 * match is a tight gate — anything unrecognised is preserved.
 *
 * Rows that are not drafts are left in place and reported instead, since a
 * non-draft duplicate is a data question for a human, not something the Apply
 * button should resolve by deleting.
 *
 * A failure is logged and swallowed on purpose: the alternative is failing the
 * whole Apply because a cleanup could not complete, which would leave the
 * applicant with no way into an application they legitimately own. A surplus draft
 * is a cosmetic problem in the list; a hard failure is a broken Apply.
 */
async function removeDuplicateApplications(rows: Application[]): Promise<void> {
  if (rows.length === 0 || !supabase) return;

  const protectedRows = rows.filter((row) => row.status !== 'draft');
  if (protectedRows.length > 0) {
    console.error(
      'Refusing to delete non-draft applications as duplicates. This needs manual reconciliation.',
      protectedRows.map((row) => ({ id: row.id, status: row.status, schemeId: row.scheme_id })),
    );
  }

  const draftIds = rows.filter((row) => row.status === 'draft').map((row) => row.id);
  if (draftIds.length === 0) return;

  const { error } = await supabase.from(APPLICATIONS_TABLE).delete().in('id', draftIds);
  if (error) {
    console.error('Could not remove duplicate draft application rows', { draftIds, error });
  }
}

/**
 * Note on where the application form gets its row.
 *
 * This used to say the form needed no query of its own, because the page read the
 * applicant's rows through `useApplicantApplications()` and matched the
 * `application_number` in the URL against the reference the database minted. That
 * is no longer true and the difference is the whole bug: the form is routed by the
 * uuid, and the uuid is not the `id` field of the list's own view model.
 *
 * So the form does issue its own single-row read, in `loadApplicationForm`, and it
 * has to. Two things depend on it. The handle in the URL is classified into a
 * column before the query is built, so the query can be filtered on `id` or on
 * `application_number` without guessing. And a malformed handle is reported as
 * invalid *before* any query runs, instead of being collapsed into "not found"
 * after a lookup that was never going to succeed.
 */
