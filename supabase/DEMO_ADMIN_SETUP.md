# Demo Admin: applying the pending migrations

Four migrations are committed but not applied to the live project. Until they are
applied, the applicant Submit button and the Demo Admin cannot work end to end.
There is no Supabase CLI access token or direct database connection on this
machine, so they have to be applied by hand through the Supabase SQL editor.

Open the project at https://supabase.com/dashboard, choose **SQL Editor**, and run
these four files in order. Each is idempotent, so re-running one that already
landed is safe.

| Order | File | Why it matters |
|---|---|---|
| 1 | `20260927000230_lock_submitted_applications.sql` | Stops a submitted application being reopened or rewritten by its owner. |
| 2 | `20260927000240_create_applicant_profile_on_signup.sql` | **Required for Submit.** Creates the `applicant_profiles` row on signup. Without it every new applicant's first application insert is rejected by RLS with a 403. |
| 3 | `20260927000250_fix_application_documents_on_conflict.sql` | Fixes the unique conflict target for linking documents to an application. |
| 4 | `20260927000260_guard_submission_course_year.sql` | **Required for Submit.** Makes the database's document check agree with the UI about `required_from_course_year`. Without it a year-1 applicant is permanently blocked. |
| 5 | `20260927000270_demo_admin_readonly_submitted_access.sql` | **Required for the Demo Admin.** Creates the three read-only views and the `demo_admin` policies. |
| 6 | `20260927000280_demo_admin_document_storage_read.sql` | **Required to open documents.** Without it the document list works but every "View" fails: the existing storage policy only knows the applicant's own folder and role `admin`. |

Apply 260 and 270 last, since they are new work; 230/240/250 are the pre-existing
pending set.

## After applying: promote a Demo Admin account

Create the account first (Supabase dashboard → **Authentication → Users → Add
user**, or sign it up through the app), then run:

```sql
update public.profiles
   set role = 'demo_admin'
 where email = 'demo.admin@example.com';
```

`handle_new_user` creates every account as `applicant`, so this promotion is the
one deliberate change. `current_profile_role()` reads the table on each query, so
access starts on the next request — no re-login, no JWT refresh.

Use an account that is **not** a real applicant account. The Demo Admin has no
write access to anything, but reusing an applicant login would mix the two
identities in the audit trail.

## What "read-only" means here

The Demo Admin can only read three views:

- `demo_admin_submitted_applications` — the application, applicant, course and scheme
- `demo_admin_submitted_documents` — the files that were actually uploaded
- `demo_admin_submitted_requirements` — what the scheme asked for, left-joined to the
  attachment, so a missing mandatory document is a visible row rather than an absence

All three are filtered to `status = 'submitted'`, so drafts are invisible. Only
`select` is granted and only `for select` policies exist, so there is no statement
it could execute that writes. No base table grant or policy was changed, so
applicant isolation is exactly as it was. Aadhaar is exposed as four digits at
most — never the fingerprint, never the masked string, and never the underlying
document.

Documents live in the private `applicant-documents` bucket and are reached through
a short-lived signed URL. Migration 280 adds the `for select` storage policy the
Demo Admin needs; it reaches exactly the paths listed in
`demo_admin_submitted_documents`, so a draft's document is not reachable, and the
bucket stays private.

## Verifying it worked

```sql
-- All three should return 0 rows rather than erroring.
select count(*) from public.demo_admin_submitted_applications;
select count(*) from public.demo_admin_submitted_documents;
select count(*) from public.demo_admin_submitted_requirements;

-- The new guard should be in place.
select tgname, proname
  from pg_trigger t
  join pg_proc p on p.oid = t.tgfoid
 where tgname = 'guard_application_submission';
```

If the views error with `permission denied` for schema `public`, the grant did not
land. If PostgREST reports the views are missing from the schema cache, run
`notify pgrst, 'reload schema';` — migration 270 ends with it, but re-running is
harmless. Migration 270 drops and recreates its views, so it is safe to re-apply.

## Step 2: make "View Demo Admin" a one-click button

The login screen's **View Demo Admin** button takes no password. It asks an Edge
Function for a session, and that function signs in the one read-only account using
secrets it holds. Nothing secret is in the bundle or on the page.

This needs a one-time deploy (CLI, or Dashboard → **Edge Functions**):

```bash
supabase functions deploy demo-admin-session
supabase secrets set DEMO_ADMIN_EMAIL='<the promoted account>' DEMO_ADMIN_PASSWORD='<its password>'
```

The function is in `supabase/functions/demo-admin-session/index.ts`. It is
deliberately `verify_jwt = false` in `supabase/config.toml` — the person clicking
the button is not signed in yet — and it uses only the public key, never the
service-role key. It also checks the account's role really is `demo_admin` before
returning a session, and logs to the function logs if it is not.

If the function is not deployed, the button says so and reveals a manual
email/password form underneath, which goes through the same role check. Either path
lands on the same read-only account.

## Step 3: check it from the command line

```bash
cd mota-scholarship-portal-frontend
DEMO_ADMIN_EMAIL=... DEMO_ADMIN_PASSWORD=... npm run test:demo-admin
```

This signs in with the *publishable* key only, the same credential the browser
gets, so it exercises the policies rather than bypassing them. It asserts the
Demo Admin can read the three views, that `PATCH`/`POST`/`DELETE` against them are
refused, that `applications` and `applicant_profiles` are **not** readable, that no
sensitive identity column is present, and that documents open through a short-lived
signed URL. It exits non-zero on failure.
