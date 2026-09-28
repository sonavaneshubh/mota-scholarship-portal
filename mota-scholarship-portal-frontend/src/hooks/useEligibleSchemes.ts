import { useEffect, useState } from 'react';
import { fetchSchemes } from '../services/schemes';
import { supabase, isSupabaseConfigured, mapSchemeToFrontend } from '../lib/supabase';
import { diagnosticError } from '../lib/diagnostics';
import type { ApplicantScheme, Scheme } from '../lib/supabase';

export interface EligibleSchemesState {
  schemes: ApplicantScheme[];
  loading: boolean;
  error: boolean;
  /**
   * Whether the visitor is signed in.
   *
   * This is not cosmetic. Every RLS policy on `schemes` and its child tables is
   * scoped `to authenticated` (20260927000000_create_scholarship_master_tables.sql),
   * so an anonymous read is *allowed* and returns 200 with zero rows rather than a
   * permission error. `fetchSchemes` cannot tell that apart from "the portal has
   * published no schemes", so a signed-out visitor on the public directory was
   * told "No schemes are published yet" while five verified schemes were sitting
   * in the table. The caller needs this flag to describe the real reason.
   */
  signedIn: boolean;
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
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError(false);
      try {
        // Read the session first, and independently of the scheme query, so the
        // caller can explain an empty directory accurately even when the query
        // itself succeeds with zero rows.
        if (supabase) {
          const { data } = await supabase.auth.getSession();
          if (!active) return;
          setSignedIn(Boolean(data.session));
        }

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

  return { schemes, loading, error, signedIn };
}
