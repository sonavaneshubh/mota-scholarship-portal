import { useEffect, useState } from 'react';
import { fetchSchemes } from '../services/schemes';
import { isSupabaseConfigured, mapSchemeToFrontend } from '../lib/supabase';
import { diagnosticError } from '../lib/diagnostics';
import type { ApplicantScheme, Scheme } from '../lib/supabase';

export interface EligibleSchemesState {
  schemes: ApplicantScheme[];
  loading: boolean;
  error: boolean;
}

/**
 * The published, verified, active schemes — straight from `public.schemes`.
 *
 * There is no fallback dataset. If the query fails the caller gets an empty list
 * and an error flag, because a scholarship list that silently shows sample rows
 * is indistinguishable from a real one to an applicant.
 *
 * The same reasoning covers a portal with no Supabase client: `fetchSchemes`
 * returns an empty list rather than throwing, so without the check below this
 * hook reported success and the dashboard claimed "Showing 0 Schemes" when the
 * truth was that the schemes were never read.
 */
export function useEligibleSchemes(): EligibleSchemesState {
  const [schemes, setSchemes] = useState<ApplicantScheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(false);
      try {
        const result = await fetchSchemes({ page: 1, limit: 100 });
        if (!active) return;
        setSchemes((result.schemes as Scheme[]).map(mapSchemeToFrontend));

        if (result.schemes.length === 0 && !isSupabaseConfigured) {
          diagnosticError('schemes', 'no Supabase client, so the scheme list is empty rather than absent');
          if (active) setError(true);
        }
      } catch (cause) {
        diagnosticError('schemes', 'scheme query failed', {
          message: cause instanceof Error ? cause.message : String(cause),
        });
        if (active) {
          setSchemes([]);
          setError(true);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  return { schemes, loading, error };
}
