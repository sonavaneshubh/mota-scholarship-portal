import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * `tsconfig.node.json` deliberately type-checks this file with `lib: ["ES2023"]`
 * and no `@types/node`, so the two Node globals used below are declared here
 * rather than by adding a dependency for two identifiers. They exist at runtime:
 * Vite bundles this file and runs it in Node.
 */
declare const console: {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
};
declare const process: {
  cwd: () => string;
};

/**
 * Names of the variables a production build needs.
 *
 * Kept as literals here rather than imported from `src/lib/supabase.ts` because
 * this file runs in Node during the build, outside the module graph the bundler
 * would use to resolve that import.
 */
const URL_VAR = 'VITE_SUPABASE_URL';
const PUBLISHABLE_KEY_VAR = 'VITE_SUPABASE_PUBLISHABLE_KEY';
const ANON_KEY_VAR = 'VITE_SUPABASE_ANON_KEY';

/**
 * Warns, loudly, in the build log when a production bundle is emitted without a
 * usable Supabase configuration.
 *
 * This is a warning rather than a hard failure on purpose. Failing the build
 * would block a deployment outright, and a broken deployment is a worse outcome
 * than a misconfigured one that is at least visible. The check exists because the
 * failure this guards against is otherwise completely silent: the emitted bundle
 * has no Supabase URL inlined, `createClient` is never called, every database
 * read returns empty and sign-in falls back to the demo accounts — with a clean
 * console and no network request to show for it.
 *
 * `loadEnv` is given the mode so it reads `.env`, `.env.production` and
 * `.env.production.local` as well, and `process.env` still wins over all of them,
 * which is how the values injected by Vercel arrive.
 */
function reportSupabaseConfiguration(mode: string, env: Record<string, string>) {
  const url = env[URL_VAR]?.trim() ?? '';
  const key = env[PUBLISHABLE_KEY_VAR]?.trim() || env[ANON_KEY_VAR]?.trim() || '';
  const missing = [
    ...(url ? [] : [URL_VAR]),
    ...(key ? [] : [PUBLISHABLE_KEY_VAR]),
  ];

  if (missing.length === 0) {
    return;
  }

  const isProductionBuild = mode === 'production';
  const heading = isProductionBuild
    ? 'PRODUCTION BUILD IS MISSING ITS SUPABASE CONFIGURATION'
    : 'Supabase configuration is incomplete';

  const lines = [
    '',
    '='.repeat(72),
    `  ${heading}`,
    '='.repeat(72),
    `  Missing : ${missing.join(', ')}`,
    `  Mode    : ${mode}`,
    '',
    '  Vite inlines VITE_* variables at BUILD time, so these must be present in',
    '  the environment that runs `npm run build` — for Vercel that is the project',
    '  Environment Variables, and they only take effect in a NEW deployment.',
    '',
    '  Without them the bundle ships with no Supabase client: sign-in falls back',
    '  to the demo accounts and every dashboard query returns empty.',
    '  Only the publishable/anon key belongs here. Never a service-role key.',
    '',
  ];

  if (isProductionBuild) {
    console.warn(lines.join('\n'));
  } else {
    console.info(lines.join('\n'));
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  reportSupabaseConfiguration(mode, env);

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
      allowedHosts: ['technician-faculty-maintenance-identifier.trycloudflare.com'],
    },
  };
});
