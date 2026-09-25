# Frontend

The Vite and React client is located at `mota-scholarship-portal-frontend`.

## Commands

```powershell
cd mota-scholarship-portal-frontend
npm install
npm run dev
npm run lint
npm run typecheck
npm run build
```

The applicant and public screens still use local demo application data. Authentication uses the Supabase browser client and requires a configured Supabase Auth project.

## Supabase Auth setup

1. Copy `.env.example` to `.env.local`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` using the public values from the Supabase project. Never use a service-role key in the browser.
3. Apply `../mota-scholarship-portal-backend/supabase/migrations/20260925120000_create_profiles.sql` to the project.
4. Enable email confirmation in Supabase Auth and add the local redirect URLs `/applicant/login` and `/reset-password` to the project URL configuration.
5. Start the app with `npm run dev`.
