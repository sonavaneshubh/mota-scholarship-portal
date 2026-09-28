/**
 * Required-document checklist, rendered from `scheme_documents`.
 *
 * Read-only on the detail view. This is a list of what the scheme asks for; the
 * upload controls live on the application form, where the applicant's own
 * document library is available to attach from. Splitting them this way keeps
 * the detail page free of controls that would do nothing without an application.
 *
 * Mandatory and optional are separated rather than interleaved, because "you
 * cannot submit without this" and "bring this if it applies" are different
 * instructions and an applicant scanning the list should not have to work out
 * which is which from a column.
 */

import type { SchemeDocument } from '../../lib/supabase';
import { stripInternalProvenance } from '../../lib/schemeEligibilityView';

interface SchemeDocumentsChecklistProps {
  documents: SchemeDocument[];
}

function fileHint(document: SchemeDocument): string | null {
  const parts: string[] = [];
  if (document.accepted_formats) {
    // jsonb text[] for the schemes whose guideline states a format, otherwise a
    // bare string on rows seeded before the column held an array.
    const formats = Array.isArray(document.accepted_formats)
      ? document.accepted_formats
      : [document.accepted_formats];
    const cleaned = formats.map((format) => format.trim()).filter((format) => format !== '');
    if (cleaned.length > 0) {
      parts.push(cleaned.map((format) => format.toUpperCase()).join(', '));
    }
  }
  if (typeof document.max_file_size_mb === 'number') {
    // The official ceilings are stated in KB (ARG45 500 KB, AZKMI 100 KB) and are
    // stored in MB, so a sub-megabyte limit is printed back in KB rather than as
    // a confusing "up to 0.1 MB".
    const megabytes = document.max_file_size_mb;
    const kilobytes = megabytes * 1024;
    parts.push(
      kilobytes < 1024
        ? `up to ${Math.round(kilobytes)} KB`
        : `up to ${Number(megabytes.toFixed(1))} MB`
    );
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

/**
 * The official fresh/renewal requirement plus the course-year gate, shown only
 * when they actually say something. A023B is the one scheme with a published
 * fresh/renewal matrix, and only the two yearly-progression schemes gate a
 * document on the year of study, so for every other row this returns null.
 */
function applicationStageHint(document: SchemeDocument): string | null {
  const parts: string[] = [];

  if (document.is_required_fresh && !document.is_required_renewal) {
    parts.push('fresh applications only');
  } else if (!document.is_required_fresh && document.is_required_renewal) {
    parts.push('renewal applications only');
  } else if (document.is_required_fresh === false && document.is_required_renewal === false) {
    // ARG45's Income Certificate. It is kept in the table because the MoTA FAQ
    // asks for it, and saying so matters more than hiding the row — but the
    // applicant has to be able to see that neither a fresh nor a renewal
    // application needs it, or they will upload it and expect it to be checked.
    parts.push('not required for a fresh or a renewal application');
  }

  if (typeof document.required_from_course_year === 'number') {
    const from = document.required_from_course_year;
    if (from <= 1) {
      parts.push('required every year');
    } else if (from === 2) {
      parts.push('required from the second year of the course onwards');
    } else {
      parts.push(`required from year ${from} of the course onwards`);
    }
  }

  return parts.length > 0 ? parts.join(' · ') : null;
}

function DocumentRow({ document }: { document: SchemeDocument }) {
  const hint = fileHint(document);
  const stageHint = applicationStageHint(document);
  const description = stripInternalProvenance(document.description);

  return (
    <li className="flex gap-3 py-2.5">
      <svg
        aria-hidden="true"
        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2.5}
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[13px] font-semibold text-slate-800">{document.document_name}</p>
          {document.document_type ? (
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {document.document_type}
            </span>
          ) : null}
          {stageHint ? (
            <span className="rounded bg-gov-saffron-dark/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gov-saffron-dark">
              {stageHint}
            </span>
          ) : null}
        </div>
        {description ? (
          <p className="mt-0.5 text-xs leading-snug text-slate-600">{description}</p>
        ) : null}
        {hint ? <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p> : null}
      </div>
    </li>
  );
}

export function SchemeDocumentsChecklist({ documents }: SchemeDocumentsChecklistProps) {
  if (documents.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        No document list has been recorded for this scheme yet. Please refer to the official guideline.
      </p>
    );
  }

  // `is_mandatory` is nullable in the deployed column, so a null is treated as
  // mandatory. A requirement recorded without a flag is far more likely to be
  // something the scheme insists on than something merely suggested, and
  // under-stating a requirement would let an applicant submit and then be
  // rejected for a missing document.
  const mandatory = documents.filter((document) => document.is_mandatory !== false);
  const optional = documents.filter((document) => document.is_mandatory === false);

  return (
    <div className="space-y-5">
      <section>
        <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-gov-saffron-dark">
          Required ({mandatory.length})
        </p>
        <ul className="divide-y divide-slate-100">
          {mandatory.map((document) => (
            <DocumentRow document={document} key={document.id} />
          ))}
        </ul>
      </section>

      {optional.length > 0 ? (
        <section>
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Only if it applies to you ({optional.length})
          </p>
          <p className="mb-1.5 text-[11px] leading-snug text-slate-500">
            These are not required for every applicant. Read the note under each one before
            deciding to skip it.
          </p>
          <ul className="divide-y divide-slate-100">
            {optional.map((document) => (
              <DocumentRow document={document} key={document.id} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
