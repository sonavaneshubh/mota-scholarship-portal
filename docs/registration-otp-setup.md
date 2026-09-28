# Registration with an email code and a mobile code

Registration no longer emails a confirmation link. The applicant fills in the
form, is sent a six-digit code to their email address and a second six-digit code
to their mobile number, types both in, and the account is created.

Nothing about that is implemented in this repository's own code: the codes are
generated, delivered and checked by Supabase Auth. This document covers what has
to be configured, what cannot be configured from here, and how to check the result
by hand.

## What is in the repository

| Piece | Path |
| --- | --- |
| Transient verification state | `supabase/migrations/20260927000400_registration_otp_attempts.sql` |
| Shared validation, limits, error mapping | `supabase/functions/_shared/registration.ts` |
| Sends both codes | `supabase/functions/registration-start/index.ts` |
| Checks one code, or sends another | `supabase/functions/registration-verify/index.ts` |
| Creates the account once both are proven | `supabase/functions/registration-complete/index.ts` |
| The form | `mota-scholarship-portal-frontend/src/components/home/HomeLoginCard.tsx` |
| The two code steps | `mota-scholarship-portal-frontend/src/components/auth/RegistrationOtpSteps.tsx` |
| Browser-side rules | `mota-scholarship-portal-frontend/src/lib/registrationConfig.ts` |
| The browser's copy of the rules | `mota-scholarship-portal-frontend/src/services/auth/registrationOtpService.ts` |
| Tests that run offline | `mota-scholarship-portal-frontend/scripts/registration-otp.test.mjs` |

## The rules, in one place

| Rule | Value |
| --- | --- |
| Code length | 6 digits, both channels |
| Attempt lifetime | 15 minutes |
| Resend cooldown | 45 seconds |
| Codes per channel per attempt | 5 |
| Wrong codes per channel per attempt | 5 |
| Registrations per email address per hour | 5 |
| Password | 10+ characters, upper, lower, digit, symbol |
| Username | 4–32 characters, starts with a letter |

These numbers exist twice — once for the browser and once for the Edge Functions —
because the browser needs them to render a countdown and an inline error, and the
server needs them to be enforced. The test script fails if the two copies drift
apart, so if you change one, change both.

`otp_expiry` in `supabase/config.toml` is set to `15m` to match the attempt
lifetime. This matters: a code that GoTrue still considers valid after the
attempt has expired would be accepted by the code check and then refused by
`registration-complete`, which is the most confusing failure the flow can produce.

## Applying it

The migration is **not** applied to any project, and it should not be applied with
`supabase db push` as things stand. Remote migration history for this project ends
at `20260927000003`, and there are earlier local migrations in between that do not
match the deployed schema — `20260927000004` adds a foreign key in a form the live
table does not accept, and `20260927000008`/`20260927000009` assume columns that
were never created. Reconciling that history is a separate piece of work. Until it
is done, this migration has to be applied deliberately, by pasting it into the SQL
editor, so that nothing else in the queue runs by accident.

Apply it, then deploy the functions:

```bash
supabase functions deploy registration-start
supabase functions deploy registration-verify
supabase functions deploy registration-complete
```

`supabase/config.toml` sets `verify_jwt = false` for these three. That is
deliberate and it is not a hole: an applicant halfway through registering has no
session, so a JWT requirement would make the flow impossible. The functions accept
no credential and grant none — each one acts only on the address and number in its
own request body, and the only thing that can mark a code as accepted is GoTrue
itself.

## What has to be configured in the Supabase dashboard

These are account settings. They cannot be set from this repository, and none of
the credentials involved may be committed to it.

**1. The email template must show a code, not a link.**

Authentication → Email Templates → `Confirm signup`. If this template still
contains `{{ .ConfirmationURL }}`, an applicant will be sent a link as well as the
code — and the point of this change is that there is no link to click. The body
should be something like:

```
Your verification code is {{ .Token }}

It expires in 15 minutes. Enter it on the registration page to finish creating
your account. If you did not ask to register, you can ignore this message.
```

The same applies to the Magic Link template if it is still enabled. Leaving
either one as a link does not break the flow — the code is what the portal asks
for — but it does send an applicant a second, confusing way to finish, one that
was supposed to be removed.

**2. Phone Auth has to be turned on, and a provider has to be attached.**

Authentication → Providers → Phone. It is currently disabled, and no SMS provider
is configured. Without that, the email code still arrives and the mobile channel
is reported as unavailable, and registration cannot be completed. That is the
intended behaviour: an unconfigured deployment fails visibly rather than quietly
skipping mobile verification.

Supabase's own supported provider is Twilio. The account SID, auth token and
message service are set as secrets in the dashboard, or with
`supabase secrets set`. They are not in `supabase/config.toml` and must not be
added to it, to `.env.example`, or to any `VITE_`-prefixed variable — anything
`VITE_`-prefixed is compiled into the browser bundle.

**3. Rate limits worth knowing about.**

`[auth.email] max_frequency` is `1m` and `rate_limit` is `10/m`. `10/m` is
GoTrue's own per-address limit and is *stricter* than this flow's: an applicant
cannot start more than ten registrations an hour for one address, where the flow
would allow five. It is left alone deliberately, because a lower provider limit is
a safe direction to be wrong in.

## Checking it works

The tests in `mota-scholarship-portal-frontend/scripts/registration-otp.test.mjs`
run offline and prove the rules agree across the wire, that the provider's errors
are translated into specific messages, and that the enforcement is still in the
source. They cannot prove a code reaches a handset. This has to be checked by
hand, once, against a real project:

1. Register with a real address and a real Indian mobile number.
2. Confirm an email arrives containing six digits and no link.
3. Confirm an SMS arrives containing six digits.
4. Enter six wrong digits in the email box. The message must say the code is not
   correct, and must not say it has expired.
5. Enter the right code. The form must move to the mobile step by itself.
6. Enter the mobile code. The account is created and the applicant is sent to
   `/applicant/login` — not signed in, and not to the dashboard.
7. Sign in with the address and the password. This is the only proof that the
   password was actually set, and it is the step most likely to be wrong if
   something in the merge logic has changed.
8. Start a second registration with the same address. It must be refused as
   already registered, and no second code may be sent.
9. Start a registration, then abandon it before entering either code. Register
   again with the same details. This must be **allowed** — GoTrue creates the auth
   user when it sends the first code, so an abandoned attempt leaves a user and a
   profile row behind. The flow is written to reuse that account rather than
   delete it, because deleting an auth user because somebody typed an address into
   a public form is how a real account gets destroyed.
10. Call `registration-complete` directly with a valid `attemptId` and no codes
    entered. It must answer `NOT_VERIFIED` with 403 and create nothing.

## Failure modes worth recognising

| What the applicant sees | What it means |
| --- | --- |
| "We could not reach the verification service" | No SMS provider, or the provider rejected the send. The email code is still good. |
| "A registration for this email or mobile number is already in progress" | An attempt is open. It clears itself within 15 minutes. |
| "That code is not correct" | A wrong digit. The code is still valid; retype it. |
| "That code has expired" | Genuinely expired. Request a new one. |
| "Registration is temporarily unavailable" | The functions are not deployed, or the service-role key is not set on them. |
