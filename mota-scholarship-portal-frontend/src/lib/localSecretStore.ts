/**
 * Device-local placeholders for the write-only secret fields.
 *
 * WHY THIS EXISTS
 *
 * `set_applicant_aadhaar` and `set_bank_account` are SECURITY DEFINER functions in
 * 20260926090100_applicant_profile_security.sql. That migration is not applied to
 * the deployed project, so both calls return PostgREST PGRST202 and the Personal
 * section cannot be saved at all. Until the migration is applied, this keeps the
 * section saveable.
 *
 * WHAT IS DELIBERATELY NOT STORED
 *
 * The full number. Not in memory beyond the field, and not on disk. Only a mask
 * and the last four digits are persisted, which is the same reduction the database
 * writer performs. That means:
 *
 *   * a localStorage dump, a shared machine, or an XSS payload cannot recover the
 *     number, because it was never written anywhere;
 *   * the field cannot be re-populated on a later visit, exactly as in the
 *     server-backed design, so the write-only property is preserved rather than
 *     quietly downgraded.
 *
 * The tradeoff is explicit: a value saved here is NOT on the applicant's profile.
 * The UI says so, and the entry is discarded when the server starts accepting it.
 * `hasServerWriter` is deliberately not consulted here -- the service layer decides
 * whether to try the database first, and only calls this on failure.
 *
 * Storage is best-effort. A browser with localStorage disabled (private mode, some
 * embedded webviews) still gets a successful save; the value simply is not
 * remembered, and the field is re-entered next visit. Every function returns null
 * rather than throwing, because failing to remember a secret must never block
 * saving the rest of the form.
 */

const STORAGE_PREFIX = 'mota.localSecret.';

/** Last four characters of the digits, which is all that is kept. */
function lastFour(digits: string): string {
  return digits.length > 4 ? digits.slice(-4) : digits;
}

/** Mirrors the shape the server returns, so callers can treat both identically. */
function maskOf(digits: string): string {
  if (digits.length <= 4) return `•••• ${digits}`;
  return `•••• •••• ${lastFour(digits)}`;
}

function digitsOf(value: string): string {
  return value.replace(/\D/g, '');
}

function storageKey(userKey: string, field: 'aadhaar' | 'account'): string {
  return `${STORAGE_PREFIX}${userKey}.${field}`;
}

function readSlot(userKey: string, field: 'aadhaar' | 'account'): { mask: string; last4: string } | null {
  try {
    const raw = window.localStorage.getItem(storageKey(userKey, field));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { mask, last4 } = parsed as Record<string, unknown>;
    if (typeof mask !== 'string' || typeof last4 !== 'string') return null;
    return { mask, last4 };
  } catch {
    // Unavailable or corrupt: treated as "not remembered".
    return null;
  }
}

function writeSlot(userKey: string, field: 'aadhaar' | 'account', value: string): { mask: string; last4: string } | null {
  const digits = digitsOf(value);
  if (digits.length === 0) return null;

  const slot = { mask: maskOf(digits), last4: lastFour(digits) };
  try {
    // Only the mask and the last four are serialised. The full value is never
    // passed to localStorage, so it cannot be recovered from storage.
    window.localStorage.setItem(storageKey(userKey, field), JSON.stringify(slot));
  } catch {
    // Quota exceeded or storage disabled. Not fatal.
  }
  return slot;
}

/**
 * `userKey` scopes the entry to one signed-in applicant, so a shared device does
 * not show the previous user's saved state.
 */
export function saveLocalAadhaar(userKey: string, value: string) {
  return writeSlot(userKey, 'aadhaar', value);
}

export function saveLocalAccountNumber(userKey: string, value: string) {
  return writeSlot(userKey, 'account', value);
}

export function readLocalAadhaar(userKey: string) {
  return readSlot(userKey, 'aadhaar');
}

export function readLocalAccountNumber(userKey: string) {
  return readSlot(userKey, 'account');
}

/**
 * Drop the local placeholders once the server writer is deployed, so the display
 * falls back to the database's own mask and there is no chance of the two
 * disagreeing about whether a number is on file.
 */
export function clearLocalSecrets(userKey: string): void {
  try {
    window.localStorage.removeItem(storageKey(userKey, 'aadhaar'));
    window.localStorage.removeItem(storageKey(userKey, 'account'));
  } catch {
    // Nothing to do; the entries are best-effort anyway.
  }
}
