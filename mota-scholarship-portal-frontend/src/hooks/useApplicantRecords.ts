import { useCallback, useEffect, useState } from 'react';
import {
  fetchApplicantApplications,
  fetchApplicantDocuments,
} from '../services/applicantRecords';
import type { RecordsStatus } from '../services/applicantRecords';
import type { ApplicantApplication, ApplicantDocument } from '../types';

export interface ApplicantRecordsHook<T> {
  items: T[];
  status: RecordsStatus;
  error: string | null;
  reload: () => void;
}

/**
 * Loads the signed-in applicant's own records.
 *
 * `status` distinguishes three empty states that must not be conflated:
 *   loading      the request is in flight
 *   ready        the request succeeded (an empty list here is a real answer)
 *   unavailable  the table is not deployed, so there is nothing truthful to show
 *   error        the request failed
 */
function useApplicantRecords<T>(loader: () => Promise<{ status: RecordsStatus; data: T[]; error: string | null }>) {
  const [items, setItems] = useState<T[]>([]);
  const [status, setStatus] = useState<RecordsStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setError(null);

    void (async () => {
      try {
        const result = await loader();
        if (!active) return;
        setItems(result.data);
        setStatus(result.status);
        setError(result.error);
      } catch (cause) {
        if (!active) return;
        setItems([]);
        setStatus('error');
        setError(cause instanceof Error ? cause.message : 'Something went wrong.');
      }
    })();

    return () => {
      active = false;
    };
  }, [loader, nonce]);

  return { items, status, error, reload };
}

export function useApplicantApplications(): ApplicantRecordsHook<ApplicantApplication> {
  return useApplicantRecords<ApplicantApplication>(fetchApplicantApplications);
}

export function useApplicantDocuments(): ApplicantRecordsHook<ApplicantDocument> {
  return useApplicantRecords<ApplicantDocument>(fetchApplicantDocuments);
}
