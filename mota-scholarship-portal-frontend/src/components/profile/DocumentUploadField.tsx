/**
 * Certificate upload control.
 *
 * The file input is a real <input type="file"> rather than a styled div, so it is
 * keyboard operable and announced correctly. Upload state, the accepted types
 * and the size ceiling are all stated in visible text as well as in the
 * `accept` attribute, because a rejected file is otherwise a silent no-op.
 */

import { useRef, useState } from 'react';
import {
  DOCUMENT_ACCEPTED_TYPES,
  DOCUMENT_MAX_BYTES,
  createViewUrl,
  deleteDocument,
  uploadDocument,
  validateDocumentFile,
} from '../../services/documentService';
import type { ApplicantDocumentRecord } from '../../types/profile';

export interface DocumentUploadFieldProps {
  label: string;
  hint?: string;
  documentCode: string;
  applicantId: string;
  document: ApplicantDocumentRecord | null;
  onChange: (document: ApplicantDocumentRecord | null) => void;
  /** Surfaced upward so the parent can force a save / revalidate on upload. */
  onBusyChange?: (busy: boolean) => void;
  /** Validation error from the owning section, e.g. "required before saving". */
  error?: string;
}

const MAX_MB = Math.round(DOCUMENT_MAX_BYTES / (1024 * 1024));

export function DocumentUploadField({
  label,
  hint,
  documentCode,
  applicantId,
  document,
  onChange,
  onBusyChange,
  error: validationError,
}: DocumentUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const labelId = `${documentCode}-doc-label`;
  const hintId = `${documentCode}-doc-hint`;
  const errorId = `${documentCode}-doc-error`;
  // An upload failure and a "this is required" failure are shown in the same
  // place; the action error wins because it is the more specific one.
  const error = actionError ?? validationError ?? null;

  async function withBusy(action: () => Promise<void>) {
    setBusy(true);
    onBusyChange?.(true);
    try {
      await action();
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;

    setActionError(null);
    setNotice(null);

    const invalid = validateDocumentFile(file);
    if (invalid) {
      setActionError(invalid);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    await withBusy(async () => {
      const result = await uploadDocument({ applicantId, documentCode, file });
      if (!result.ok || !result.data) {
        setActionError(result.error ?? 'The file could not be uploaded.');
        return;
      }
      onChange(result.data as ApplicantDocumentRecord);
      setNotice(`${file.name} uploaded.`);
    });

    if (inputRef.current) inputRef.current.value = '';
  }

  async function handleView() {
    if (!document) return;
    setActionError(null);

    const result = await createViewUrl(document);
    if (!result.ok || !result.data) {
      setActionError(result.error ?? 'The document could not be opened.');
      return;
    }

    window.open(result.data, '_blank', 'noopener,noreferrer');
  }

  async function handleRemove() {
    if (!document) return;
    setActionError(null);

    await withBusy(async () => {
      const result = await deleteDocument(document);
      if (!result.ok) {
        setActionError(result.error ?? 'The document could not be removed.');
        return;
      }
      onChange(null);
      setNotice('Document removed.');
    });
  }

  return (
    // role="group" + aria-labelledby rather than a <label for>: the file input
    // only exists in the "nothing uploaded" branch, so a <label for> would point
    // at nothing once a document exists.
    <div aria-labelledby={labelId} role="group">
      <p className="mb-1 text-[12px] font-semibold text-slate-700" id={labelId}>
        {label}
        <span aria-hidden="true" className="ml-0.5 text-gov-saffron-dark">
          *
        </span>
      </p>

      {document ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-emerald-200 bg-emerald-50 px-2.5 py-2">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-emerald-900">{document.file_name}</p>
            <p className="text-[11px] text-emerald-700">
              {document.mime_type} &middot; {formatBytes(document.file_size)} &middot; awaiting verification
            </p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <button
              className="rounded border border-emerald-300 bg-white px-2 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
              disabled={busy}
              onClick={handleView}
              type="button"
            >
              View
            </button>
            <button
              className="rounded border border-red-200 bg-white px-2 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
              disabled={busy}
              onClick={handleRemove}
              type="button"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded border border-dashed border-slate-300 bg-slate-50 px-2.5 py-2">
          <input
            accept={DOCUMENT_ACCEPTED_TYPES}
            aria-describedby={[hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined}
            aria-invalid={Boolean(error)}
            aria-required="true"
            className="block w-full text-[12px] text-slate-600 file:mr-2 file:rounded file:border-0 file:bg-gov-blue file:px-2.5 file:py-1 file:text-[11px] file:font-semibold file:text-white hover:file:bg-gov-blue-dark disabled:opacity-50"
            disabled={busy}
            id={`${documentCode}-doc`}
            onChange={(event) => void handleFile(event.target.files?.[0])}
            type="file"
          />
          <p className="mt-1 text-[11px] text-slate-500" id={hintId}>
            {hint ? `${hint} ` : ''}PDF, JPG or PNG, up to {MAX_MB} MB. Stored privately; only you and
            verifying officers can open it.
          </p>
        </div>
      )}

      {error ? (
        <p className="mt-1 text-[11px] font-semibold text-red-700" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
      {notice && !error ? (
        <p aria-live="polite" className="mt-1 text-[11px] font-semibold text-emerald-700">
          {notice}
        </p>
      ) : null}
    </div>
  );
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return 'unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
