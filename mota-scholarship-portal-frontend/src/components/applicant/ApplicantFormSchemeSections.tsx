/**
 * Section 3 — Important Scheme Details, and section 5 — Required Documents.
 *
 * Both read entirely from the selected scheme's real rows. Nothing here is
 * hardcoded per scholarship: the deadline, the benefits, the eligibility text and
 * the document checklist all come from `schemes`, `scheme_benefits`,
 * `scheme_eligibility` and `scheme_documents`, which the data importer populates
 * per scheme. A scheme that declares no documents renders an honest empty state
 * rather than a default checklist that might be wrong for it.
 */

import { useRef, useState } from 'react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { SchemeDetailResponse, SchemeDocument } from '../../lib/supabase';
import type { ApplicantDocumentRecord } from '../../types/profile';
import type { DocumentRequirementView } from '../../lib/applicationFormView';
import { daysUntil } from '../../lib/applicationFormView';
import { createViewUrl, validateDocumentFile } from '../../services/documentService';

/* -------------------------------------------------------------------------- */
/* Section 3 — Important Scheme Details                                        */
/* -------------------------------------------------------------------------- */

function formatDeadline(value: string | null | undefined): string {
  if (!value) return 'Not published';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

interface DetailRow {
  label: string;
  value: string;
}

function DetailRowList({ rows }: { rows: DetailRow[] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {rows.map((row) => (
        <div className="min-w-0" key={row.label}>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{row.label}</dt>
          <dd className="mt-0.5 break-words text-[13px] text-slate-800">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SchemeDetailsSection({ scheme }: { scheme: SchemeDetailResponse }) {
  const { scheme: row, eligibility, benefits, sources } = scheme;
  const remaining = daysUntil(row.application_end_date);
  const closed = remaining !== null && remaining < 0;

  const eligibilityLines = [
    eligibility?.category_requirement && `Category: ${eligibility.category_requirement}`,
    eligibility?.gender_requirement && `Gender: ${eligibility.gender_requirement}`,
    eligibility?.religion_requirement && `Religion: ${eligibility.religion_requirement}`,
    eligibility?.disability_requirement && `Disability: ${eligibility.disability_requirement}`,
    eligibility?.qualification_requirement && `Qualification: ${eligibility.qualification_requirement}`,
    eligibility?.course_requirement && `Course: ${eligibility.course_requirement}`,
    eligibility?.institution_requirement && `Institution: ${eligibility.institution_requirement}`,
    eligibility?.residency_requirement && `Residency: ${eligibility.residency_requirement}`,
    eligibility?.min_percentage != null && `Minimum marks: ${eligibility.min_percentage}%`,
    eligibility?.max_income != null && `Maximum annual income: ${eligibility.max_income}`,
    eligibility?.min_age != null && `Minimum age: ${eligibility.min_age}`,
    eligibility?.max_age != null && `Maximum age: ${eligibility.max_age}`,
    eligibility?.cap_requirement && `Admission: ${eligibility.cap_requirement}`,
    eligibility?.gap_requirement && `Gap: ${eligibility.gap_requirement}`,
    eligibility?.other_conditions && `Other: ${eligibility.other_conditions}`,
  ].filter((line): line is string => Boolean(line));

  return (
    <div className="space-y-5">
      <DetailRowList
        rows={[
          { label: 'Scheme name', value: row.name },
          { label: 'Scheme code', value: row.scheme_code },
          { label: 'Department', value: row.departments?.name ?? 'Not published' },
          { label: 'Category', value: row.scheme_categories?.name ?? 'Not published' },
          { label: 'Academic year', value: row.academic_year },
          { label: 'Application opens', value: formatDeadline(row.application_start_date) },
          { label: 'Application deadline', value: formatDeadline(row.application_end_date) },
          { label: 'Renewal available', value: row.renewal_available ? 'Yes' : 'No' },
        ]}
      />

      {remaining !== null ? (
        <p
          className={`text-[12px] font-semibold ${closed ? 'text-red-700' : 'text-amber-700'}`}
          role="status"
        >
          {closed
            ? `Applications for this scheme closed ${Math.abs(remaining)} day(s) ago.`
            : `${remaining} day(s) left to apply.`}
        </p>
      ) : null}

      {row.overview || row.description ? (
        <div>
          <h3 className="mb-1.5 text-[12px] font-bold uppercase tracking-wide text-gov-blue-dark">About this scheme</h3>
          <p className="whitespace-pre-line text-[13px] leading-relaxed text-slate-700">
            {row.overview ?? row.description}
          </p>
        </div>
      ) : null}

      {benefits.length > 0 ? (
        <div>
          <h3 className="mb-2 text-[12px] font-bold uppercase tracking-wide text-gov-blue-dark">Scholarship benefits</h3>
          <ul className="space-y-2">
            {benefits.map((benefit) => (
              <li className="rounded border border-slate-200 bg-slate-50 px-3 py-2" key={benefit.id}>
                <p className="text-[13px] font-semibold text-slate-800">
                  {benefit.benefit_type.replace(/_/g, ' ')}
                </p>
                {benefit.description ? (
                  <p className="mt-0.5 text-[12px] leading-snug text-slate-600">{benefit.description}</p>
                ) : null}
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {/* The importer records descriptions but no rupee amounts for
                      most schemes, so an absent amount is stated as absent
                      rather than rendered as ₹0. */}
                  {benefit.amount != null ? (
                    <Badge tone="emerald">
                      {`₹${benefit.amount.toLocaleString('en-IN')}${benefit.amount_period ? ` / ${benefit.amount_period}` : ''}`}
                    </Badge>
                  ) : null}
                  {benefit.hosteller_amount != null ? (
                    <Badge tone="blue">{`Hosteller ₹${benefit.hosteller_amount.toLocaleString('en-IN')}`}</Badge>
                  ) : null}
                  {benefit.day_scholar_amount != null ? (
                    <Badge tone="blue">{`Day scholar ₹${benefit.day_scholar_amount.toLocaleString('en-IN')}`}</Badge>
                  ) : null}
                  {benefit.coverage ? <Badge tone="slate">{benefit.coverage}</Badge> : null}
                </div>
                {benefit.conditions ? (
                  <p className="mt-1.5 text-[11px] leading-snug text-slate-500">Condition: {benefit.conditions}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-[12px] italic text-slate-400">No benefits have been published for this scheme yet.</p>
      )}

      {eligibilityLines.length > 0 ? (
        <div>
          <h3 className="mb-1.5 text-[12px] font-bold uppercase tracking-wide text-gov-blue-dark">
            Eligibility requirements
          </h3>
          <ul className="list-inside list-disc space-y-1 text-[13px] leading-snug text-slate-700">
            {eligibilityLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {row.application_mode ? (
        <p className="text-[12px] leading-snug text-slate-600">
          <span className="font-semibold">How to apply: </span>
          {row.application_mode}
        </p>
      ) : null}

      {sources.length > 0 ? (
        <p className="text-[11px] leading-snug text-slate-500">
          Verified against {sources.length} official source{sources.length === 1 ? '' : 's'}
          {sources[0]?.source_last_checked_at
            ? `, last checked ${formatDeadline(sources[0].source_last_checked_at)}`
            : ''}
          .
        </p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Section 5 — Required Documents                                              */
/* -------------------------------------------------------------------------- */

interface ChecklistProps {
  requirements: DocumentRequirementView[];
  documents: ApplicantDocumentRecord[];
  onAttach: (requirementId: string, documentId: string) => void;
  onDetach: (linkId: string) => void;
  onUpload: (requirement: SchemeDocument, file: File) => void;
  disabled: boolean;
}

function documentStatus(requirement: SchemeDocument, view: DocumentRequirementView): { label: string; tone: 'green' | 'slate' } {
  if (view.attached) return { label: 'Attached', tone: 'green' };
  if (view.reusable) return { label: 'Available to reuse', tone: 'slate' };
  return { label: requirement.is_mandatory ? 'Required' : 'Optional', tone: 'slate' };
}

function DocumentRow({ view, documents, onAttach, onDetach, onUpload, disabled }: {
  view: DocumentRequirementView;
  documents: ApplicantDocumentRecord[];
  onAttach: ChecklistProps['onAttach'];
  onDetach: ChecklistProps['onDetach'];
  onUpload: ChecklistProps['onUpload'];
  disabled: boolean;
}) {
  const { requirement, link, attached, reusable, uploadError, busy } = view;
  const inputRef = useRef<HTMLInputElement>(null);
  const [viewError, setViewError] = useState<string | null>(null);
  const status = documentStatus(requirement, view);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const invalid = validateDocumentFile(file);
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
                {`Use existing: ${reusable.file_name ?? reusable.document_code ?? 'uploaded file'}`}
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
                {document.file_name ?? document.document_code ?? document.document_type ?? 'Document'}
              </option>
            ))}
          </select>
        ) : null}
      </div>

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
      <p className="text-[12px] leading-snug text-slate-600">
        Anything you have already uploaded appears as <span className="font-semibold">Available</span> — reuse it
        rather than uploading the same file twice. Only documents marked{' '}
        <span className="font-semibold text-red-700">Required</span> must be attached before you can submit. Saving a
        draft works at any time.
      </p>
      <ul className="space-y-2.5">
        {requirements.map((view) => (
          <DocumentRow
            disabled={disabled}
            documents={documents}
            key={view.requirement.id}
            onAttach={onAttach}
            onDetach={onDetach}
            onUpload={onUpload}
            view={view}
          />
        ))}
      </ul>
    </div>
  );
}
