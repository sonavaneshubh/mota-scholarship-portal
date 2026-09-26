/**
 * The application form's data access.
 *
 * The form needs five different things at once, from five different corners of
 * the schema:
 *
 *   application   the row being edited            applications
 *   profile       who the applicant is            applicant_profiles + 10 siblings
 *   scheme        what this scholarship requires  schemes + eligibility/benefits/documents
 *   answers       what they typed for THIS scheme applications.scheme_answers
 *   documents     which file covers which need     application_documents -> applicant_documents
 *
 * `loadApplicationForm` fetches them together so the page renders from one
 * consistent snapshot instead of five independently-updating queries that can
 * briefly disagree with each other on screen.
 *
 * Ownership
 * ---------
 * The applicant is never a parameter and never a payload field. It is resolved
 * from the Supabase session and used only as a filter, so the queries cannot
 * reach another applicant's rows. The write path is narrower still: RLS on
 * `applications` and `application_documents` is keyed to
 * public.current_applicant_id(), and a trigger re-derives applicant_id on every
 * document link, so a hand-crafted request body is rejected server-side even if
 * this file were edited to pass one.
 *
 * Profile data is read, never written, from here. The form's whole premise is
 * that My Profile is the single source of truth, so the only things this module
 * persists are the scheme-specific answers, the document links and the
 * declaration — see 20260927000003_application_form_data.sql.
 */

import { supabase } from '../lib/supabase';
import type { Application, SchemeDetailResponse } from '../lib/supabase';
import { classifyHandle } from '../lib/applicationHandle';
import type { ProfileData } from '../types/profile';
import { loadProfile } from './profileService';
import { fetchSchemeDetail } from './schemes';
import { resolveApplicantId } from './applicantRecords';
import type { AnswerValue, SchemeAnswers } from '../lib/applicationFormRules';

const APPLICATIONS_TABLE = 'applications';
const APPLICATION_DOCUMENTS_TABLE = 'application_documents';

export interface ApplicationDocumentLink {
  id: string;
  application_id: string;
  scheme_document_id: string;
  document_id: string;
  created_at: string;
}

export interface ApplicationFormBundle {
  application: Application;
  profile: ProfileData;
  /** Null when the scheme row is no longer published/verified or was removed. */
  scheme: SchemeDetailResponse | null;
  links: ApplicationDocumentLink[];
}

/**
 * 'invalid' is deliberately separate from 'not-found'.
 *
 * 'not-found' means the database was asked a well-formed question and answered
 * "this applicant has no such application" — a true statement about the account.
 * 'invalid' means the question itself was malformed, so the database was never
 * asked anything. Folding the two together made a bad link indistinguishable from
 * a missing application, which is how a routing bug reached a user as "No
 * application with this reference exists on your account" — a confident false
 * statement about data that was never queried.
 */
export type FormLoadStatus = 'ready' | 'not-found' | 'invalid' | 'unavailable' | 'error';

export type ApplicationFormLoad =
  | { status: 'ready'; bundle: ApplicationFormBundle }
  | { status: Exclude<FormLoadStatus, 'ready'>; error: string | null };

export type SaveOutcome =
  | { ok: true; application: Application }
  | { ok: false; message: string; cause: unknown };

function isMissingRelation(error: { code?: string; message?: string }): boolean {
  const code = error.code ?? '';
  const message = error.message ?? '';
  // PGRST205: relation missing. 42P01: undefined_table. Both mean the migration
  // has not been applied to this project, which is a deployment gap rather than
  // something the applicant did wrong.
  return code === 'PGRST205' || code === '42P01' || /does not exist/i.test(message);
}

function isUndefinedColumn(error: { code?: string; message?: string }): boolean {
  const code = error.code ?? '';
  const message = error.message ?? '';
  return code === '42703' || /column .* does not exist/i.test(message);
}

/**
 * Works out which column a URL handle refers to, or null if it is neither shape.
 *
 * The obvious way to accept "uuid or reference" is a PostgREST `.or()` filter,
 * which is also a filter-injection hole: the handle comes straight out of the
 * URL, and PostgREST's filter syntax has commas, dots and parentheses, so a
 * crafted value like `x,id.eq.<uuid>` changes the query rather than being
 * compared as data. RLS would still stop it reading another applicant's row, but
 * relying on that to make a malformed query safe is the wrong trade.
 *
 * Instead the handle is matched against the two shapes the app actually mints
 * and anything else is rejected outright. That is a closed set, so the value
 * reaching `.eq()` is always a plain literal.
 */
/**
 * The handle vocabulary itself — which URL shapes are legal, which column each
 * maps to, and which identifier gets emitted — lives in lib/applicationHandle.
 *
 * It is deliberately a separate, dependency-free module rather than part of this
 * service. It needs no Supabase client and no import.meta.env, so the two
 * functions can be exercised directly instead of only through a signed-in
 * browser session, and neither side has to import the other.
 */

/**
 * Loads everything the form renders.
 *
 * @param handle the uuid or the human-readable reference from the URL. The uuid is
 *   what this app emits (see applicationRouteHandle); the reference is still
 *   accepted so a shared or bookmarked pretty URL resolves.
 */
export async function loadApplicationForm(handle: string): Promise<ApplicationFormLoad> {
  if (!supabase) return { status: 'unavailable', error: null };

  const trimmed = handle.trim();
  if (!trimmed) {
    console.error('loadApplicationForm called with an empty application handle');
    return { status: 'invalid', error: null };
  }

  const column = classifyHandle(trimmed);
  if (!column) {
    // Logged, because reaching here means a link was built wrong somewhere and
    // that is a defect to fix rather than a message to show.
    console.error('Rejected application handle: it is neither a uuid nor an APP-YYYY-XXXXXXXX reference', {
      handle: trimmed,
    });
    return { status: 'invalid', error: null };
  }

  const client = supabase;

  // The application is looked up scoped to the caller's own applicant_id, so this
  // is the ownership check for the whole page. RLS enforces the same rule
  // independently; doing it in the filter as well means another applicant's
  // reference resolves to "not found" rather than to an empty object.
  const applicantId = await resolveApplicantId();
  if (!applicantId) return { status: 'error', error: 'Could not match your sign-in to an applicant profile.' };

  const { data: application, error: applicationError } = await client
    .from(APPLICATIONS_TABLE)
    .select('*')
    .eq('applicant_id', applicantId)
    .eq(column, trimmed)
    .maybeSingle();

  if (applicationError) {
    if (isMissingRelation(applicationError)) return { status: 'unavailable', error: null };
    console.error('Failed to load application', { handle: trimmed, applicationError });
    return { status: 'error', error: applicationError.message };
  }

  // Genuine absence, and the only thing that is allowed to say so. Note this
  // doubles as the ownership check: the filter is already scoped to applicantId,
  // so another applicant's application resolves here too — as not-found rather
  // than as their data. RLS enforces the same rule independently.
  if (!application) return { status: 'not-found', error: null };

  const typed = application as Application & { scheme_answers?: SchemeAnswers | null };

  // The scheme is fetched on its own, deliberately not in the same Promise.all as
  // the other two. An unreachable scheme_documents table must not blank the whole
  // form: the applicant can still read their profile, still answer and save
  // answers, and still be told what is missing. The page renders a "scheme is no
  // longer published" strip and an empty checklist in that case, which is honest.
  // A failed profile or a failed link query stays fatal, because either one means
  // the page would be showing the applicant a form that cannot represent their own
  // data.
  const [profileResult, linksResult, schemeOutcome] = await Promise.all([
    loadProfile(applicantId),
    client
      .from(APPLICATION_DOCUMENTS_TABLE)
      .select('id, application_id, scheme_document_id, document_id, created_at')
      .eq('application_id', typed.id)
      .order('created_at', { ascending: true }),
    fetchSchemeDetail(typed.scheme_id).then(
      (value) => ({ ok: true as const, value }),
      (reason: unknown) => ({ ok: false as const, reason }),
    ),
  ]);

  const scheme = schemeOutcome.ok ? schemeOutcome.value : null;
  if (!schemeOutcome.ok) {
    console.error('Failed to load scheme detail for application form', { schemeId: typed.scheme_id, reason: schemeOutcome.reason });
  }

  // ServiceResult.ok is a plain boolean rather than a discriminated union, so
  // the success case does not narrow `data` on its own — hence the explicit
  // check. A truthy ok with no data would otherwise reach the form as undefined.
  const profileData = profileResult.data;
  if (!profileResult.ok || !profileData) {
    console.error('Failed to load profile for application form', profileResult.error);
    return { status: 'error', error: profileResult.error ?? 'Could not load your profile.' };
  }

  if (linksResult.error) {
    if (isMissingRelation(linksResult.error) || isUndefinedColumn(linksResult.error)) {
      // The link table is new in 20260927000003. Without it the form still works
      // for answers; the checklist just cannot show attachments yet.
      console.error('application_documents is unavailable — apply 20260927000003', linksResult.error);
      return {
        status: 'ready',
        bundle: { application: typed, profile: profileData, scheme, links: [] },
      };
    }
    console.error('Failed to load application documents', linksResult.error);
    return { status: 'error', error: 'Could not load the documents attached to this application.' };
  }

  return {
    status: 'ready',
    bundle: {
      application: typed,
      profile: profileData,
      scheme,
      links: (linksResult.data ?? []) as ApplicationDocumentLink[],
    },
  };
}

/**
 * The stored answers, defensively coerced into a plain bag of primitives.
 *
 * Two filters, both deliberate:
 *
 *  - by type, so a null or a nested object in the jsonb never reaches a text input
 *    as "[object Object]";
 *  - by `allowedKeys`, when the caller can supply the questions this scheme
 *    actually asks. That matters because the bag is round-tripped: whatever is
 *    read here becomes the payload of the next save, so a key left over from a
 *    question the scheme has since dropped — or injected by hand — would be
 *    written back and grow forever. Dropping unknown keys here breaks that loop.
 *
 * `allowedKeys` is optional so this stays usable before the questions are known;
 * without it the result is still type-safe, just not key-filtered.
 */
export function readStoredAnswers(application: Application, allowedKeys?: Iterable<string>): SchemeAnswers {
  const raw = (application as Application & { scheme_answers?: unknown }).scheme_answers;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

  const allowed = allowedKeys ? new Set(allowedKeys) : null;

  const answers: SchemeAnswers = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') continue;
    if (allowed && !allowed.has(key)) continue;
    answers[key] = value as AnswerValue;
  }
  return answers;
}

/**
 * Persists a draft.
 *
 * Save Draft is deliberately permissive. It must work with the form half
 * finished, because the whole point of a draft is that the applicant comes back
 * to it later — so it validates nothing and refuses nothing beyond ownership.
 * Only Submit enforces completeness, and that check lives in the page so the
 * applicant sees the list of what is missing before anything is written.
 */
export async function saveApplicationDraft(
  applicationId: string,
  answers: SchemeAnswers,
): Promise<SaveOutcome> {
  if (!supabase) {
    return { ok: false, message: 'Supabase is not configured.', cause: null };
  }

  const { data, error } = await supabase
    .from(APPLICATIONS_TABLE)
    .update({
      scheme_answers: answers,
      draft_saved_at: new Date().toISOString(),
      // Touching updated_at is deliberate: it is what makes "last saved" on the
      // officer's screen mean something.
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId)
    .select('*')
    .maybeSingle();

  if (error) {
    if (isMissingRelation(error) || isUndefinedColumn(error)) {
      return {
        ok: false,
        message: 'This application cannot be saved yet because the database is not fully set up.',
        cause: error,
      };
    }
    console.error('Failed to save application draft', { applicationId, error });
    return { ok: false, message: 'Your draft could not be saved. Please try again.', cause: error };
  }

  if (!data) {
    return { ok: false, message: 'Your draft could not be saved. Please try again.', cause: null };
  }

  return { ok: true, application: data as Application };
}

/**
 * Submits the application.
 *
 * `declarationAccepted` is a required argument and is refused when false, rather
 * than being hardcoded to true here. The page already blocks the button, but a
 * required argument means any other caller has to make a conscious decision about
 * the declaration instead of inheriting an unconditional "true". The authoritative
 * check is the guard_application_submission() trigger added in
 * 20260927000003 — a client can always talk to PostgREST directly, so the rule has
 * to hold in the database, not only in this function.
 *
 * The `.eq('status', 'draft')` below is a compare-and-set: a draft that has already
 * moved on (submitted, withdrawn, …) is not re-submitted by a stale tab, and the
 * update only lands if the row is still exactly where the applicant left it.
 */
export async function submitApplication(
  applicationId: string,
  answers: SchemeAnswers,
  declarationAccepted: boolean,
): Promise<SaveOutcome> {
  if (!supabase) {
    return { ok: false, message: 'Supabase is not configured.', cause: null };
  }

  if (!declarationAccepted) {
    return {
      ok: false,
      message: 'The declaration has to be ticked before the application can be submitted.',
      cause: null,
    };
  }

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from(APPLICATIONS_TABLE)
    .update({
      scheme_answers: answers,
      status: 'submitted',
      submitted_at: now,
      declaration_accepted: true,
      declaration_accepted_at: now,
      updated_at: now,
    })
    .eq('id', applicationId)
    .eq('status', 'draft')
    .select('*')
    .maybeSingle();

  if (error) {
    if (isMissingRelation(error) || isUndefinedColumn(error)) {
      return {
        ok: false,
        message: 'This application cannot be submitted yet because the database is not fully set up.',
        cause: error,
      };
    }
    console.error('Failed to submit application', { applicationId, error });
    return { ok: false, message: 'Your application could not be submitted. Please try again.', cause: error };
  }

  if (!data) {
    return {
      ok: false,
      message: 'This application is no longer a draft, so it was not submitted again.',
      cause: null,
    };
  }

  return { ok: true, application: data as Application };
}

/**
 * Attaches one of the applicant's own documents to a scheme requirement.
 *
 * Upsert rather than insert, so re-picking a document for a requirement replaces
 * the previous choice instead of creating a second link. The uniqueness rule
 * (application_id, scheme_document_id) is what makes that safe; the onConflict
 * clause just makes it a single round trip.
 *
 * Returns the stored link rather than a bare ok, because the caller needs the
 * row id to be able to detach it again later without reloading the page.
 */
export async function attachSchemeDocument(
  applicationId: string,
  schemeDocumentId: string,
  documentId: string,
): Promise<{ ok: true; link: ApplicationDocumentLink } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: 'Supabase is not configured.' };

  const { data, error } = await supabase
    .from(APPLICATION_DOCUMENTS_TABLE)
    .upsert(
      { application_id: applicationId, scheme_document_id: schemeDocumentId, document_id: documentId },
      { onConflict: 'application_id,scheme_document_id' },
    )
    .select('id, application_id, scheme_document_id, document_id, created_at')
    .maybeSingle();

  if (error) {
    if (isMissingRelation(error)) {
      return { ok: false, error: 'Document attachments are not available yet. Apply migration 20260927000003.' };
    }
    console.error('Failed to attach document', { applicationId, schemeDocumentId, documentId, error });
    return { ok: false, error: 'That document could not be attached. Please try again.' };
  }

  if (!data) {
    return { ok: false, error: 'That document could not be attached. Please try again.' };
  }

  return { ok: true, link: data as ApplicationDocumentLink };
}

export async function detachSchemeDocument(linkId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: 'Supabase is not configured.' };

  const { error } = await supabase.from(APPLICATION_DOCUMENTS_TABLE).delete().eq('id', linkId);

  if (error) {
    if (isMissingRelation(error)) {
      return { ok: false, error: 'Document attachments are not available yet. Apply migration 20260927000003.' };
    }
    console.error('Failed to detach document', { linkId, error });
    return { ok: false, error: 'That document could not be removed. Please try again.' };
  }

  return { ok: true };
}
