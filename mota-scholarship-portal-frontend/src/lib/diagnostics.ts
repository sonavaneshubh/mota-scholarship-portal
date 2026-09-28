/**
 * Development-only diagnostics.
 *
 * Why this module exists
 * ----------------------
 * The production failure this was written for was completely silent: the deployed
 * bundle was built without `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`,
 * so `createClient` was never called, `supabase` was `null`, and the entire portal
 * quietly fell back to its demo path. Nothing threw, nothing logged, the console
 * stayed clean, and the visible symptoms were "Login does nothing" and "the
 * dashboard is empty" — neither of which points at a build-time environment
 * problem.
 *
 * Rules this module enforces
 * --------------------------
 * 1. `import.meta.env.DEV` is statically false in a production build, so every
 *    call site is dead code that the bundler removes. Nothing here can reach a
 *    production browser.
 * 2. Passwords, access tokens, refresh tokens and Supabase secret/service-role
 *    keys are never passed in and never printed. Callers report *presence*
 *    booleans and variable *names*; the values stay in the environment.
 * 3. The Supabase project host is printed only in development. It is not a
 *    secret, and it is the single most useful line when the portal is pointed at
 *    the wrong project, but there is no reason to publish it from a production
 *    bundle.
 */

/** True only in a `vite dev` / development build. */
export const diagnosticsEnabled = import.meta.env.DEV;

export type DiagnosticDetail = Record<string, unknown>;

/**
 * Logs a diagnostic line, but only in development.
 *
 * Kept as a function (rather than an `if (DEV)` at every call site) so the
 * production behaviour is uniform: either every diagnostic in the app is on, or
 * none of them are.
 */
export function diagnostic(scope: string, message: string, detail?: DiagnosticDetail): void {
  if (!diagnosticsEnabled) {
    return;
  }

  if (detail === undefined) {
    console.info(`[${scope}] ${message}`);
    return;
  }

  console.info(`[${scope}] ${message}`, detail);
}

/**
 * Reports a failure the way `diagnostic` reports a success.
 *
 * `console.warn`/`console.error` are used rather than `console.info` so a
 * diagnostic failure is visible when the console is filtered to warnings and
 * errors, which is where a developer looks first.
 */
export function diagnosticError(scope: string, message: string, detail?: DiagnosticDetail): void {
  if (!diagnosticsEnabled) {
    return;
  }

  if (detail === undefined) {
    console.error(`[${scope}] ${message}`);
    return;
  }

  console.error(`[${scope}] ${message}`, detail);
}

/**
 * Describes an environment variable without ever describing its value.
 *
 * Presence and a length are enough to tell "unset", "set to an empty string" and
 * "set to something" apart, which is the entire difference between the three
 * ways `VITE_SUPABASE_*` goes wrong in practice. The value itself is not needed
 * for any of them.
 */
export function describeEnvValue(value: string | undefined): {
  present: boolean;
  length: number;
} {
  const normalised = value?.trim() ?? '';
  return { present: normalised.length > 0, length: normalised.length };
}

/**
 * The host of a Supabase project URL, or null when it cannot be parsed.
 *
 * Development-only by contract: see the rules at the top of this file.
 */
export function projectHost(url: string | undefined): string | null {
  if (!diagnosticsEnabled) {
    return null;
  }

  const trimmed = url?.trim() ?? '';
  if (trimmed === '') {
    return null;
  }

  try {
    return new URL(trimmed).host;
  } catch {
    return null;
  }
}
