/**
 * The document reading panel shown on a document requirement.
 *
 * One component for both the "AI is working" state and the finished result, so an
 * applicant sees the same card change state in place rather than a panel being
 * swapped for a different one. It renders the shared read model
 * (lib/documentOcr) and nothing else: no provider response, no stored JSON, and
 * never `ocr_error`, whose contents are for the reviewer rather than the public.
 *
 * `ai_confidence` is labelled "coverage" wherever it appears, because it is the
 * fraction of expected fields the reader filled in and not a probability that the
 * reading is correct.
 */

import type { DocumentOcrSummary } from '../../lib/documentOcr';
import { Button } from '../ui/Button';

const TONES: Record<
  DocumentOcrSummary['state'],
  { border: string; badge: string; icon: string; iconPath: string }
> = {
  'not-started': {
    border: 'border-slate-200 bg-slate-50/60',
    badge: 'bg-slate-100 text-slate-600',
    icon: 'text-slate-400',
    iconPath: 'M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.5 1.5 0 0 1-1.41-1.028L.875 12.75m11.25 6h8.25a1.5 1.5 0 0 0 1.41-1.028L23.125 12.75m-18 0v-1.875a1.5 1.5 0 0 1 .4-1.05L8.5 6.75m11.25 6.375V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875v9.375m11.25-6.75h3.375c.621 0 1.125.504 1.125 1.125V12.75m-4.5 0h-3.375a1.5 1.5 0 0 1-1.41-1.028L6.375 8.25m8.625 4.5V9.375',
  },
  'in-flight': {
    border: 'border-blue-200 bg-blue-50/50',
    badge: 'bg-blue-100 text-blue-800',
    icon: 'text-blue-600',
    iconPath: 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  },
  complete: {
    border: 'border-emerald-200 bg-emerald-50/50',
    badge: 'bg-emerald-100 text-emerald-800',
    icon: 'text-emerald-600',
    iconPath: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  },
  'needs-review': {
    border: 'border-amber-300 bg-amber-50/60',
    badge: 'bg-amber-100 text-amber-900',
    icon: 'text-amber-600',
    iconPath: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z',
  },
  failed: {
    border: 'border-red-200 bg-red-50/60',
    badge: 'bg-red-100 text-red-800',
    icon: 'text-red-600',
    iconPath: 'M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z',
  },
};

function outcomeStyle(outcome: DocumentOcrSummary['comparisonResult']) {
  if (outcome === 'MATCH') {
    return { chip: 'bg-emerald-100 text-emerald-800', mark: 'M4.5 12.75l6 6 9-13.5', text: 'Matches' };
  }
  if (outcome === 'NOT_COMPARABLE') {
    return { chip: 'bg-slate-100 text-slate-600', mark: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z', text: 'Not compared' };
  }
  return { chip: 'bg-amber-100 text-amber-900', mark: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z', text: 'Needs review' };
}

interface DocumentOcrPanelProps {
  summary: DocumentOcrSummary;
  onRetry?: () => void;
  retrying?: boolean;
}

export function DocumentOcrPanel({ summary, onRetry, retrying = false }: DocumentOcrPanelProps) {
  const tone = TONES[summary.state];
  const showResult = summary.state === 'complete' || summary.state === 'needs-review';
  const overall = outcomeStyle(summary.comparisonResult);

  return (
    <section
      aria-label="AI document check"
      aria-live="polite"
      className={`mt-2.5 rounded border ${tone.border} px-3 py-2.5`}
    >
      <div className="flex items-start gap-2.5">
        {summary.state === 'in-flight' ? (
          <span
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600"
          />
        ) : (
          <svg
            aria-hidden="true"
            className={`mt-0.5 h-4 w-4 shrink-0 ${tone.icon}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.8}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d={tone.iconPath} />
          </svg>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              AI document check
            </p>
            {summary.documentKind && showResult ? (
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${tone.badge}`}>
                {summary.documentKind}
              </span>
            ) : null}
          </div>

          <p className="mt-1 text-[13px] font-semibold text-slate-800">{summary.headline}</p>
          <p className="mt-0.5 text-[12px] leading-relaxed text-slate-600">{summary.detail}</p>

          {summary.canRetry && onRetry ? (
            <Button
              className="mt-2"
              disabled={retrying}
              onClick={onRetry}
              size="sm"
              variant="outline"
            >
              {retrying ? 'Trying again…' : 'Check this document again'}
            </Button>
          ) : null}
        </div>
      </div>

      {showResult ? (
        <div className="mt-3 space-y-3 border-t border-slate-200/80 pt-3">
          {summary.comparison.length > 0 ? (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Information check
              </p>
              <ul className="mt-1.5 space-y-1.5">
                {summary.comparison.map((row) => {
                  const rowStyle = outcomeStyle(row.outcome);
                  return (
                    <li className="rounded border border-slate-200 bg-white/70 px-2.5 py-1.5" key={row.field}>
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                          {row.label}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${rowStyle.chip}`}
                        >
                          <svg
                            aria-hidden="true"
                            className="h-3 w-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2.5}
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d={rowStyle.mark} />
                          </svg>
                          {rowStyle.text}
                        </span>
                      </div>
                      <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[12px]">
                        <dt className="text-slate-500">On your document</dt>
                        <dd className="font-medium text-slate-800">{row.documentValue}</dd>
                        <dt className="text-slate-500">On your profile</dt>
                        <dd className="font-medium text-slate-800">{row.profileValue}</dd>
                      </dl>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-[12px] font-semibold text-slate-700">
                Overall: {summary.comparisonResult === 'MATCH'
                  ? 'information read from this document matches your profile.'
                  : 'some information could not be matched to your profile.'}
              </p>
            </div>
          ) : null}

          {summary.fields.length > 0 ? (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Read from this document
              </p>
              <dl className="mt-1.5 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                {summary.fields.map((field) => (
                  <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-slate-200 py-1" key={field.key}>
                    <dt className="text-[12px] text-slate-500">{field.label}</dt>
                    <dd className="min-w-0 text-right text-[12px] font-medium text-slate-800">
                      {field.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}

          {summary.subjects.length > 0 ? (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Subjects and marks
              </p>
              <div className="mt-1.5 overflow-x-auto">
                <table className="w-full min-w-[320px] border-collapse text-left text-[12px]">
                  <thead>
                    <tr className="border-b border-slate-300 text-[10px] uppercase tracking-wide text-slate-500">
                      <th className="py-1 pr-2 font-semibold" scope="col">Subject</th>
                      <th className="py-1 pr-2 font-semibold" scope="col">Marks</th>
                      <th className="py-1 pr-2 font-semibold" scope="col">Out of</th>
                      <th className="py-1 font-semibold" scope="col">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.subjects.map((subject, index) => (
                      <tr className="border-b border-slate-200 last:border-0" key={`${subject.name}-${index}`}>
                        <td className="py-1 pr-2 text-slate-800">{subject.name}</td>
                        <td className="py-1 pr-2 font-medium text-slate-800">{subject.obtained}</td>
                        <td className="py-1 pr-2 text-slate-600">{subject.maximum}</td>
                        <td className="py-1 text-slate-600">{subject.grade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {summary.coverage !== null ? (
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  AI extraction coverage
                </p>
                <p className="text-[12px] font-semibold text-slate-700">{summary.coverage}%</p>
              </div>
              <div
                aria-hidden="true"
                className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-200"
              >
                <div
                  className={`h-full rounded-full ${summary.state === 'needs-review' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${summary.coverage}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                {overall.text === 'Matches'
                  ? 'How much of the document could be read, not how accurate the reading is.'
                  : 'A lower value usually means the document was hard to read, not that it is wrong.'}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
