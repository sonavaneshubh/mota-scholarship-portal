# MoTA Scholarship & Fellowship Management System

This repository contains the frontend prototype, Supabase Authentication wiring, and a backend migration workspace.

## Repository layout

- `mota-scholarship-portal-frontend/` — Vite, React, TypeScript, and Tailwind client.
- `mota-scholarship-portal-backend/supabase/migrations/` — profile table, trigger, and RLS migration for Supabase Auth.
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
3. Apply `mota-scholarship-portal-backend/supabase/migrations/20260925120000_create_profiles.sql` to the Supabase project.
4. Configure `/applicant/login` and `/reset-password` as allowed redirect URLs, then enable the desired email-confirmation policy in Supabase Auth.
5. Assign any administrator role through a protected database/admin process; registration metadata cannot grant `admin`.

Never place a service-role key, database password, or JWT secret in frontend environment files or browser code.

## Backend

The `mota-scholarship-portal-backend/` directory currently contains only the Supabase profiles migration. It is not a complete application backend, and no service-role integration is included.
