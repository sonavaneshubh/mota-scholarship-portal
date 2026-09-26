/**
 * Turning a database error into something an applicant can be shown.
 *
 * Supabase surfaces the driver's own message, so a bare `error.message` handed
 * straight to the UI puts Postgres and PostgREST internals in front of a
 * scholarship applicant. This was not hypothetical: with the Aadhaar writer
 * missing from the deployed schema, the profile page displayed
 * "Could not find the function public.set_applicant_aadhaar(p_aadhaar) in the
 * schema cache" as though the applicant had done something wrong.
 *
 * The rule is an allow-list, not a deny-list. A deny-list has to enumerate every
 * infrastructure message, so the first one nobody thought of leaks; an allow-list
 * treats an unrecognised message as internal by default, which is the direction
 * that fails safely. The cost is that a new applicant-facing message needs adding
 * here, which is why the list below points at the statements it was derived from.
 *
 * The underlying error is always logged, so nothing is lost for diagnosis -- only
 * the text shown to the applicant changes.
 */

/**
 * Messages the database raises on purpose, addressed to the applicant, describing
 * a condition they can act on. Enumerated from the `raise exception` statements
 * in 20260926090100_applicant_profile_security.sql, filtered to those that are
 * both deliberate and genuinely useful to show:
 *
 *   "Aadhaar number must be 12 digits."            applicant mistyped the number
 *   "Aadhaar number is not valid."                 applicant typed 111111111111
 *   "Account number must be between 6 and 20 digits."  applicant mistyped the account
 *   "Authentication required."                      session lapsed; sign in again
 *
 * Deliberately excluded, and mapped to the caller's fallback instead:
 *
 *   "pgcrypto is not installed on this database..."      deployment problem
 *   "app.secret_hash_salt is not configured..."           deployment problem
 *   "Only administrators may read/decrypt..."             an authorisation bug
 *   "Applicant profile not found."                       tells the applicant nothing
 *                                                       actionable about what to do
 *
 * A missing table or column also falls through to the fallback, since those come
 * back as Postgres codes 42P01/42703 or PostgREST PGRST202 rather than as text on
 * this list.
 */
const APPLICANT_FACING = new Set([
  'aadhaar number must be 12 digits',
  'aadhaar number is not valid',
  'account number must be between 6 and 20 digits',
  'authentication required',
]);

/** Postgres prefixes a raised message with its own context in some cases. */
function normalise(message: string): string {
  return message
    .trim()
    .toLowerCase()
    .replace(/[.!]+$/, '')
    .trim();
}

export interface DatabaseError {
  message?: string | null;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
}

/**
 * A message safe to display, given the caller's own fallback for anything the
 * applicant cannot act on.
 */
export function messageFromError(error: DatabaseError | null | undefined, fallback: string): string {
  const message = error?.message?.trim() ?? '';

  if (message === '') return fallback;

  if (APPLICANT_FACING.has(normalise(message))) return message;

  // Not on the allow-list, so it is treated as an internal message. Logged in full
  // for the developer, including the PostgREST code and details, which is where
  // the useful diagnosis actually lives.
  console.error('Database error surfaced to the applicant as a generic message', {
    fallback,
    code: error?.code ?? null,
    message,
    details: error?.details ?? null,
    hint: error?.hint ?? null,
  });

  return fallback;
}
