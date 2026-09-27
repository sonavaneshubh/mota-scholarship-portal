# MoTA Scholarship & Fellowship Management System

This repository contains the frontend prototype, Supabase Authentication wiring, and a backend migration workspace.

## Repository layout

- `mota-scholarship-portal-frontend/` — Vite, React, TypeScript, and Tailwind client.
- `supabase/migrations/` — **the only canonical, Supabase-linked migration tree.** See "Migrations" below.
- `mota-scholarship-portal-backend/supabase/migrations/` — stale, **unlinked** copy. Do not push from here.
- `mota-scholarship-portal-frontend/.stitch/` — read-only design reference.

The frontend keeps local demo application data for the current prototype. Authentication is provided by Supabase Auth; no service-role key or complete application backend is included.

## Frontend

```powershell
cd mota-scholarship-portal-frontend
npm install
npm run dev
```

Run the frontend checks:

```powershell
npm run lint
npm run typecheck
npm run build
```

Existing public and applicant routes are preserved, including:

- `/`
- `/applicant/login`
- `/admin/login`
- `/applicant/dashboard`
- `/applicant/schemes`
- `/applicant/applications`
- `/applicant/documents`
- `/applicant/notifications`
- `/applicant/profile`
- `/reset-password`

## Supabase Auth setup

1. Copy `mota-scholarship-portal-frontend/.env.example` to `.env.local`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` with the project's public browser values.
3. Apply `supabase/migrations/20260925120000_create_profiles.sql` to the Supabase project.
4. Configure `/applicant/login` and `/reset-password` as allowed redirect URLs, then enable the desired email-confirmation policy in Supabase Auth.
5. Assign any administrator role through a protected database/admin process; registration metadata cannot grant `admin`.

Never place a service-role key, database password, or JWT secret in frontend environment files or browser code.

## Migrations

**`supabase/` at the repository root is the only linked, canonical migration tree.** It carries the
Supabase CLI link (`.temp/project-ref`, `.temp/linked-project.json`) and is what the CLI compares
against remote history. Always run migration commands from the repository root:

```powershell
npx supabase migration list     # read-only
npx supabase db push            # only after reviewing the pending list
```

`supabase/.temp/` is deliberately git-ignored. It is machine-local link state that `supabase link`
regenerates — a project ref, the pooler hostname, and the linked project name — not source, so it is
not in the repository. Run `npx supabase link` once after cloning. What *is* tracked is
`supabase/config.toml` and `supabase/migrations/`.

### Do not push from `mota-scholarship-portal-backend/supabase/`

That directory is a stale, unlinked copy that was never registered with the CLI. It is unsafe to
use as a migration source:

- It contains **two duplicate versions** — `20260927000000` (`create_scholarship_master_tables.sql`
  and `fix_missing_columns.sql`) and `20260927000002` (`create_applications.sql` and
  `populate_scheme_guideline_urls.sql`).
- Its `20260927000003_application_form_data.sql` **diverges** from the already-applied version of
  the same number. Pushing from there would attempt to re-apply a different file over an applied
  migration.
- Its `20260926999999` was renamed to `20260927000000` locally, which collides with the master's own
  `20260927000000`.

It is retained only as a scratch workspace and as the original location of
`20260927000008_scheme_detail_content.sql`, which has since been copied into the canonical tree.
Nothing in it has been deleted; treat it as read-only history and reconcile by hand if you need
something from it.

## Backend

`mota-scholarship-portal-backend/` is not a complete application backend and no service-role
integration is included. Its `supabase/` directory is described above under "Migrations" and is
**not** the migration source of truth.
