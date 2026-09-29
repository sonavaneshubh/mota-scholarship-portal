/**
 * Keeps a document list current while the server is still reading a document.
 *
 * The upload path is fire-and-forget by design — `requestDocumentOcr` is not
 * awaited, because a slow provider must never hold a requirement row in its
 * loading state — so the result has to arrive by polling. This hook is that poll,
 * and it is deliberately quiet about its own failures: an unreachable status read
 * resolves to no rows and leaves whatever is on screen alone, because a polling
 * hiccup is not the applicant's problem and must not become an error on a form
 * they filled in correctly.
 *
 * It polls only while something is genuinely in flight, and gives up on its own
 * after a ceiling rather than polling a document that is never going to finish.
 */

import { useEffect, useRef } from 'react';
import { fetchOcrStateForLinks } from '../services/ocrService';
import { isOcrInFlight, type OcrLinkColumns } from '../lib/documentOcr';

const POLL_INTERVAL_MS = 4000;

/** ~2 minutes. Generous for a large scanned page, short enough to stop a wedged row. */
const MAX_POLLS = 30;

export function useDocumentOcrPolling(
  links: readonly OcrLinkColumns[],
  onState: (rows: OcrLinkColumns[]) => void
): void {
  const callback = useRef(onState);
  callback.current = onState;

  const inFlightIds = links.filter((link) => isOcrInFlight(link.ocr_status)).map((link) => link.id);
  const pendingKey = inFlightIds.slice().sort().join(',');

  useEffect(() => {
    if (pendingKey === '') return;

    const ids = pendingKey.split(',');
    let cancelled = false;
    let polls = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function tick() {
      if (cancelled) return;
      polls += 1;

      const result = await fetchOcrStateForLinks(ids);

      if (cancelled) return;

      if (result.ok) {
        // Replaces the reading columns on the rows we already hold. The parent
        // decides what to keep; this only carries what the server now says.
        callback.current(result.rows);
      }

      if (polls >= MAX_POLLS) return;

      timer = setTimeout(() => {
        void tick();
      }, POLL_INTERVAL_MS);
    }

    timer = setTimeout(() => {
      void tick();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [pendingKey]);
}
