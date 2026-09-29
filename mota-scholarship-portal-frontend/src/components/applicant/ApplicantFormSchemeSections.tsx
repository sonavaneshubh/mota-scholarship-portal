/**
 * The Stage 1 document checklist.
 *
 * Everything here reads from the selected scheme's real rows. Nothing is
 * hardcoded per scholarship: the document list, and which documents are
 * conditional on the course year, come from `scheme_documents`, which the data
 * importer populates per scheme. A scheme that declares no documents renders an
 * honest empty state rather than a default checklist that might be wrong for it.
 *
 * This file used to also export SchemeDetailsSection, a second copy of the
 * scheme's description, benefits, eligibility and conditions, rendered on the
 * application form. It is gone: the form is now only the applicant's own
 * information, and the scheme's own information lives on the Scheme Details page,
 * which has its own rendering (SchemeBenefitsTable and SchemeCriteriaList) and is
 * what the applicant is pointed at. Nothing else imported it.
 */

import { useRef, useState } from 'react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { SchemeDocument } from '../../lib/supabase';
import type { ApplicantDocumentRecord } from '../../types/profile';
import type { DocumentRequirementView } from '../../lib/applicationFormView';
import { createViewUrl, validateDocumentFile } from '../../services/documentService';
import { summariseDocumentOcr } from '../../lib/documentOcr';
import { DocumentOcrPanel } from './DocumentOcrPanel';

/* -------------------------------------------------------------------------- */
/* Stage 1 — the document checklist                                            */
/* -------------------------------------------------------------------------- */

interface ChecklistProps {
  requirements: DocumentRequirementView[];
  documents: ApplicantDocumentRecord[];
  onAttach: (requirementId: string, documentId: string) => void;
  onDetach: (linkId: string) => void;
  onUpload: (requirement: SchemeDocument, file: File) => void;
  onRetryOcr: (linkId: string) => void;
  retryingOcrId: string | null;
  disabled: boolean;
}

function documentStatus(requirement: SchemeDocument, view: DocumentRequirementView): { label: string; tone: 'green' | 'slate' } {
  if (view.attached) return { label: 'Attached', tone: 'green' };
  if (view.reusable) return { label: 'Available to reuse', tone: 'slate' };
  return { label: requirement.is_mandatory ? 'Required' : 'Optional', tone: 'slate' };
}

function DocumentRow({ view, documents, onAttach, onDetach, onUpload, onRetryOcr, retryingOcrId, disabled }: {
  view: DocumentRequirementView;
  documents: ApplicantDocumentRecord[];
  onAttach: ChecklistProps['onAttach'];
  onDetach: ChecklistProps['onDetach'];
  onUpload: ChecklistProps['onUpload'];
  onRetryOcr: ChecklistProps['onRetryOcr'];
  retryingOcrId: ChecklistProps['retryingOcrId'];
  disabled: boolean;
}) {
  const { requirement, link, attached, reusable, uploadError, busy } = view;
  const inputRef = useRef<HTMLInputElement>(null);
  const [viewError, setViewError] = useState<string | null>(null);
  const status = documentStatus(requirement, view);
  const ocr = summariseDocumentOcr(link);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const invalid = validateDocumentFile(file, requirement.max_file_size_mb);
    if (invalid) {
      setViewError(invalid);
      return;
    }
    setViewError(null);
    onUpload(requirement, file);
  };

  const openAttached = async () => {
    if (!attached) return;
    setViewError(null);
    const result = await createViewUrl(attached);
    if (!result.ok || !result.data) {
      setViewError(result.error ?? 'The document could not be opened.');
      return;
    }
    window.open(result.data, '_blank', 'noopener,noreferrer');
  };

  return (
    <li className="rounded border border-slate-200 bg-white px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-slate-800">{requirement.document_name}</p>
          {requirement.description ? (
            <p className="mt-0.5 text-[12px] leading-snug text-slate-600">{requirement.description}</p>
          ) : null}
          {attached ? (
            <p className="mt-1 break-all text-[11px] text-slate-500">File: {attached.file_name ?? 'Stored file'}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {requirement.is_mandatory ? <Badge tone="red">Required</Badge> : <Badge tone="slate">Optional</Badge>}
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {attached ? (
          <>
            <Button disabled={busy} onClick={openAttached} size="sm" variant="outline">
              View
            </Button>
            <Button
              disabled={busy || disabled}
              onClick={() => link && onDetach(link.id)}
              size="sm"
              variant="ghost"
            >
              Remove
            </Button>
          </>
        ) : (
          <>
            <Button
              disabled={busy || disabled}
              onClick={() => inputRef.current?.click()}
              size="sm"
              variant="primary"
            >
              {busy ? 'Uploading…' : 'Upload document'}
            </Button>

            {/* Reuse is offered only when the profile library already holds a
                file that matches this requirement. Attaching it is a link, not
                a copy, so the applicant never uploads the same certificate twice. */}
            {reusable ? (
              <Button
                disabled={busy || disabled}
                onClick={() => onAttach(requirement.id, reusable.id)}
                size="sm"
                variant="outline"
              >
                {`Use existing: ${reusable.file_name ?? reusable.document_name ?? reusable.document_type ?? 'uploaded file'}`}
              </Button>
            ) : null}
          </>
        )}

        {documents.length > 0 && !attached ? (
          <select
            aria-label={`Choose an already uploaded document for ${requirement.document_name}`}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-[12px] text-slate-700 focus:border-gov-blue focus:outline-none focus:ring-2 focus:ring-gov-blue/25"
            disabled={busy || disabled}
            onChange={(event) => {
              if (event.target.value) onAttach(requirement.id, event.target.value);
            }}
            value=""
          >
            <option value="">Or choose from my documents…</option>
            {documents.map((document) => (
              <option key={document.id} value={document.id}>
                {document.file_name ?? document.document_name ?? document.document_type ?? 'Document'}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {link ? (
        <DocumentOcrPanel
          onRetry={ocr.canRetry ? () => onRetryOcr(link.id) : undefined}
          retrying={retryingOcrId === link.id}
          summary={ocr}
        />
      ) : null}

      <input
        accept=".pdf,.jpg,.jpeg,.png"
        className="sr-only"
        onChange={(event) => {
          handleFile(event.target.files?.[0]);
          // Reset so re-picking the same file fires change again.
          event.target.value = '';
        }}
        ref={inputRef}
        type="file"
      />

      {uploadError || viewError ? (
        <p className="mt-2 text-[11px] font-semibold text-red-700" role="alert">
          {uploadError ?? viewError}
        </p>
      ) : null}
    </li>
  );
}

export function RequiredDocumentsSection({
  requirements,
  documents,
  onAttach,
  onDetach,
  onUpload,
  onRetryOcr,
  retryingOcrId,
  disabled,
}: ChecklistProps) {
  if (requirements.length === 0) {
    return (
      <p className="text-[13px] italic text-slate-400">
        This scheme has not published a document list. If an officer asks for anything further, they will contact you.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="space-y-2.5">
        {requirements.map((view) => (
          <DocumentRow
            disabled={disabled}
            documents={documents}
            key={view.requirement.id}
            onAttach={onAttach}
            onDetach={onDetach}
            onRetryOcr={onRetryOcr}
            onUpload={onUpload}
            retryingOcrId={retryingOcrId}
            view={view}
          />
        ))}
      </ul>
    </div>
  );
}
