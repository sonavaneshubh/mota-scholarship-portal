/**
 * The application's URL handle vocabulary.
 *
 * Pure and dependency-free on purpose. An application is addressed in the URL by
 * either its uuid or its human-readable reference, and both this module and the
 * code that consumes it need to agree exactly on which strings are legal — a
 * disagreement here is what produces "Application not found" for an application
 * the applicant demonstrably owns.
 *
 * It lives apart from applicationFormService so that neither side has to import
 * the other: this module needs no Supabase client and no import.meta.env, so it
 * is directly testable, and the service keeps its database concerns to itself.
 */

/**
 * `applications.id`. Confirmed against the live project: filtering
 * `id = 'not-a-uuid'` returns Postgres error 22P02 (invalid input syntax for type
 * uuid), which a text column would not raise. It is the primary key, so it is
 * present on every row and is the one identifier that needs no assumptions.
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `applications.application_number`.
 *
 * The tail width is deliberately a range rather than a fixed length, because
 * three different widths are already in circulation in this project:
 *
 *   APP-2026-A1B2C3D4  8 chars, minted by set_application_reference() in
 *                      20260927000002_create_applications.sql
 *   APP-2026-000001     6 chars, the format given in the functional spec
 *   APP-2026-001        3 chars, used throughout src/data/adminMockData.ts and in
 *                      admin URLs such as /admin/applications/APP-2026-001
 *
 * Pinning this to the 8-char mint format was a real bug during development: it
 * rejected the spec's own example, and therefore reported "Application not
 * found" for applications the applicant demonstrably owns. An unconfirmed
 * reference format is the one thing this module exists to tolerate, while the
 * charset stays closed so the value remains a plain literal in a PostgREST
 * `.eq()` call. Note the tail also admits hex, so the 6- and 3-char forms overlap
 * with it rather than being a special case.
 */
const REFERENCE_PATTERN = /^APP-\d{4}-[0-9A-Z]{3,8}$/i;

/**
 * Which column a URL handle refers to, or null if it is neither shape.
 *
 * This is a closed allow-list on purpose. The handle reaches a PostgREST `.eq()`
 * call, and PostgREST filter syntax contains commas, dots and parentheses, so a
 * crafted value like `x,id.eq.<uuid>` would change the query rather than being
 * compared as data. RLS would still stop it reading another applicant's row, but
 * relying on that to make a malformed query safe is the wrong trade. Because the
 * set is closed, whatever reaches `.eq()` is always a plain literal.
 */
export function classifyHandle(handle: string): 'id' | 'application_number' | null {
  const value = handle.trim();
  if (UUID_PATTERN.test(value)) return 'id';
  if (REFERENCE_PATTERN.test(value)) return 'application_number';
  return null;
}

/**
 * The handle to put in an application URL, or null when neither identifier is
 * usable.
 *
 * The uuid is preferred — not as a fallback but as the primary, and that ordering
 * is the fix for Apply Now landing on "Application not found".
 *
 * The bug it replaces: Apply Now navigated with
 * `application_number || id`. `||` only guards null and the empty string, so any
 * reference that was a non-empty string of an unconfirmed shape was preferred
 * over a perfectly good uuid. It survived `encodeURIComponent` untouched, and
 * then classifyHandle rejected it — and the page reported "No application with
 * this reference exists on your account" for an application the applicant owns.
 * That is a confident false statement, caused by a column whose only generator is
 * a trigger in a migration that has not been applied to this project.
 *
 * The uuid carries no such uncertainty, so it goes in the URL. The reference stays
 * a display value, printed for the applicant and the officer. It is still
 * *accepted* as an inbound handle, so a shared or bookmarked pretty URL resolves.
 *
 * Returning null instead of a best-effort string is the point: the caller can show
 * an error where the applicant can act on it, rather than navigating to a URL that
 * is guaranteed to fail.
 */
export function applicationRouteHandle(application: {
  id?: string | null;
  application_number?: string | null;
}): string | null {
  const id = (application.id ?? '').trim();
  if (UUID_PATTERN.test(id)) return id;

  const reference = (application.application_number ?? '').trim();
  if (REFERENCE_PATTERN.test(reference)) return reference;

  return null;
}
