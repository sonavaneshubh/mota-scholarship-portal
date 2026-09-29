/**
 * Asks the server to read an attached document.
 *
 * What this is for
 * ----------------
 * `application_documents` rows are attachments: they say "this uploaded file,
 * attached to this application, satisfies this scheme requirement". Attaching one
 * creates no record of what is *on* the file, so the officer reviewing the
 * application has to open the PDF themselves. The `process-document-ocr` Edge
 * Function closes that gap: it reads the file server-side and writes what it
 * found into `application_documents.ai_extraction` / `.ai_confidence`, next to
 * the `ocr_status` that records whether that succeeded.
 *
 * Why the applicant is not told whether it worked
 * ----------------------------------------------
 * Nothing in this module is awaited by the upload flow, and that is the point.
 * Document reading is a convenience for the reviewer, not a step the applicant
 * has to pass: the file is already uploaded and already attached whether or not
 * OCR ever runs, and a provider outage or an undeployed function must not turn a
 * successful upload into a failed one. So the result is reported to the console
 * and to nothing else. Surfacing it would mean a banner on a form the applicant
 * has otherwise completed correctly, for a condition they cannot fix and that
 * does not affect their application.
 *
 * The same reasoning is why nothing here is awaited by the caller: the request
 * continues in the background, and a slow provider never holds the requirement
 * row in its loading state.
 *
 * What it never does
 * ------------------
 * It never decides anything. The function compares what it read against the
 * applicant's own profile and stores MATCH or NEEDS_REVIEW; it does not reject
 * an application, does not alter an application status, and never writes the
 * human_verified_* columns, which record a person's sign-off. A NEEDS_REVIEW
 * result is a prompt for a human being to look, and nothing in this portal
 * reacts to it automatically.
 *
 * Authorization
 * -------------
 * `supabase.functions.invoke()` attaches the current session as a bearer token,
 * which is what the function requires. The function then reads the attachment
 * with a client bound to that same token, so the RLS policies on
 * `application_documents` decide whether this caller may touch the row at all —
 * this module cannot widen access, and an applicant cannot read their own
 * document twice, nor anybody else's once.
 */

import { supabase } from '../lib/supabase';
import type { OcrLinkColumns } from '../lib/documentOcr';

const OCR_FUNCTION = 'process-document-ocr';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type OcrRequestOutcome =
  | { ok: true }
  | { ok: false; error: string };

/**
 * The applicant-visible generic used when the function itself could not be
 * reached at all. Every message the function returns is written on the
 * assumption that the public will read it, so it is safe to log; the point of
 * logging it is that an operator needs to be able to tell "the feature is not
 * deployed" apart from "the provider was down" from the console.
 */
const UNREACHABLE_MESSAGE = 'The document reading service could not be reached.';

/**
 * Requests processing for one attachment. Never throws.
 *
 * The failure is a `console.error` and a returned error, not an exception: the
 * only callers are upload and attach handlers, and a rejected promise escaping
 * from one of those would surface as an unhandled rejection and, in the attach
 * case, after the row has already been written — a reading failure reported to
 * the applicant as a failure to attach their certificate.
 *
 * @param applicationDocumentId the `application_documents` row id, i.e. the link
 *   created by attachSchemeDocument — not the `applicant_documents` id. The two
 *   are different tables and the function reads the link, because the link is
 *   what carries the scheme requirement the document is being read against.
 */
export async function requestDocumentOcr(applicationDocumentId: string): Promise<OcrRequestOutcome> {
  if (!supabase) return { ok: false, error: 'Supabase is not configured.' };

  const documentId = applicationDocumentId.trim();
  // Checked before the request rather than after it. A malformed id here would
  // come from a bug in the caller, and the function answers it with a 400 that
  // costs a round trip to learn nothing.
  if (!UUID_RE.test(documentId)) {
    console.error('requestDocumentOcr called without a valid application_document_id');
    return { ok: false, error: 'Invalid document reference.' };
  }

  try {
    const { data, error } = await supabase.functions.invoke(OCR_FUNCTION, {
      method: 'POST',
      body: { application_document_id: documentId },
    });

    if (error) {
      // `error.message` is the HTTP status line, not a document problem. The
      // statuses that matter to an operator are 503 (feature or provider not
      // configured) and 502/500 (something on our side).
      console.error('process-document-ocr did not complete', {
        application_document_id: documentId,
        message: error.message,
      });
      return { ok: false, error: UNREACHABLE_MESSAGE };
    }

    const payload = data as { error?: unknown; ok?: unknown } | null;

    // The function answers a failure with `{ error: "..." }` and a success with
    // `{ ok: true, ... }`. A response carrying neither is not something this
    // module should treat as a success just because it was not an HTTP error.
    if (payload?.ok !== true) {
      const reason = typeof payload?.error === 'string' ? payload.error : 'no reason given';
      console.error('process-document-ocr reported a problem', {
        application_document_id: documentId,
        reason,
      });
      return { ok: false, error: reason };
    }

    return { ok: true };
  } catch (error) {
    // Network-level failure, or a client that is not configured for functions at
    // all. Same treatment: visible in the console, invisible to the applicant.
    console.error('process-document-ocr request threw', {
      application_document_id: documentId,
      error,
    });
    return { ok: false, error: UNREACHABLE_MESSAGE };
  }
}

/**
 * The reading columns of `application_documents`, for re-reading a page without
 * reloading it. A link the applicant may not see is simply absent from the result
 * rather than being an error, because the RLS policies on the table decide that.
 */
const OCR_STATE_COLUMNS =
  'id, ocr_status, ocr_error, ocr_provider, ocr_model, ocr_processed_at, ocr_attempts, ai_extraction, ai_confidence';

export type OcrStateResult =
  | { ok: true; rows: OcrLinkColumns[] }
  | { ok: false; error: string };

/**
 * Re-reads the reading state of the given attachments.
 *
 * Separate from the request above, and deliberately quiet: a failed poll is
 * reported to the console and resolved as an empty row set, because a polling
 * hiccup must never put an error on the form. The caller keeps whatever it
 * already had on screen, which is why this resolves rather than throws.
 */
export async function fetchOcrStateForLinks(
  applicationDocumentIds: readonly string[]
): Promise<OcrStateResult> {
  if (!supabase) return { ok: false, error: 'Supabase is not configured.' };

  const ids = applicationDocumentIds.map((id) => id.trim()).filter((id) => UUID_RE.test(id));
  if (ids.length === 0) return { ok: true, rows: [] };

  const { data, error } = await supabase
    .from('application_documents')
    .select(OCR_STATE_COLUMNS)
    .in('id', ids);

  if (error) {
    console.error('Could not re-read document processing state', {
      count: ids.length,
      message: error.message,
      code: error.code,
    });
    return { ok: false, error: 'The document check status could not be refreshed.' };
  }

  return { ok: true, rows: (data ?? []) as OcrLinkColumns[] };
}
