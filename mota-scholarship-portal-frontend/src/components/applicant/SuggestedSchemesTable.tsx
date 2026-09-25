import { useState } from 'react';
import { Link } from 'react-router-dom';
import { APPLICANT_APPLICATIONS } from '../../data/applicantData';
import { SCHEMES } from '../../data/mockData';
import { applicantApplicationPath, applicantSchemePath, ROUTES } from '../../lib/constants';
import type { ApplicantApplication, Scheme } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ApplicationStatusBadge } from './StatusBadge';

interface SuggestedSchemesTableProps {
  limit?: number;
  pageSize?: number;
}

function getApplication(schemeId: string): ApplicantApplication | undefined {
  return APPLICANT_APPLICATIONS.find((application) => application.schemeId === schemeId);
}

const typeToneClasses: Record<Scheme['badgeTone'], string> = {
  blue: 'bg-blue-50 text-portal-navy border border-blue-100',
  purple: 'bg-purple-50 text-purple-800 border border-purple-100',
  green: 'bg-emerald-50 text-emerald-800 border border-emerald-100',
  amber: 'bg-amber-50 text-amber-800 border border-amber-200',
};

function PdfIcon() {
  return (
    <svg aria-hidden="true" className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path d="M5 2h6l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Zm6 0v4h4M7 12h6M7 15h4" />
    </svg>
  );
}

export function SuggestedSchemesTable({ limit = SCHEMES.length, pageSize = 10 }: SuggestedSchemesTableProps) {
  const [page, setPage] = useState(1);
  const schemes = SCHEMES.slice(0, limit);
  const totalPages = Math.max(1, Math.ceil(schemes.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleSchemes = schemes.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const showingFrom = schemes.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const showingTo = Math.min(currentPage * pageSize, schemes.length);

  return (
    <Card accentClass="" className="min-w-0 overflow-hidden p-0">
      <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-portal-navy">
          <svg aria-hidden="true" className="h-3.5 w-3.5 text-portal-amber" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
            <path d="m8.5 12 2.5 2.5 4.5-5" />
          </svg>
          <span>Suggested eligible schemes (sample listings, on the basis of your profile)</span>
        </h2>
        <div className="flex items-center gap-2">
          <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-2xs font-medium text-slate-500">
            Showing {schemes.length} scheme{schemes.length === 1 ? '' : 's'}
          </span>
          <Link className="text-2xs font-semibold text-portal-navy underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-portal-amber" to={`${ROUTES.applicant.schemes}?view=suggested`}>
            View all
          </Link>
        </div>
      </div>

      {schemes.length > 0 ? (
        <>
          <div className="overflow-x-auto border-b border-slate-200">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <caption className="sr-only">Sample scholarship and fellowship listings with the responsible department, scheme type, an action link, and guideline availability</caption>
              <thead>
                <tr>
                  <th className="w-5/12 border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-700" scope="col">Scheme name</th>
                  <th className="w-3/12 border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-700" scope="col">Department name</th>
                  <th className="w-2/12 border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-700" scope="col">Scheme type</th>
                  <th className="w-1/12 border border-slate-200 bg-slate-50 px-2.5 py-2 text-center text-xs font-semibold text-slate-700" scope="col">Take action</th>
                  <th className="w-1/12 border border-slate-200 bg-slate-50 px-2.5 py-2 text-center text-xs font-semibold text-slate-700" scope="col">Download GRs</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                {visibleSchemes.map((scheme) => {
                  const application = getApplication(scheme.id);

                  return (
                    <tr className="transition hover:bg-slate-50" key={scheme.id}>
                      <td className="border border-slate-200 px-2.5 py-2 text-xs">
                        <Link className="font-medium text-portal-navy hover:underline focus:outline-none focus:ring-2 focus:ring-portal-amber" to={applicantSchemePath(scheme.id)}>
                          {scheme.name}
                        </Link>
                        <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <span className="text-2xs text-slate-400">{scheme.statusLabel}</span>
                          {application ? <ApplicationStatusBadge status={application.status} label={application.statusLabel} /> : <Badge className="border border-emerald-200" tone="emerald">Not applied</Badge>}
                        </span>
                      </td>
                      <td className="border border-slate-200 px-2.5 py-2 text-xs text-slate-600">{scheme.department}</td>
                      <td className="border border-slate-200 px-2.5 py-2 text-xs">
                        <span className={`inline-block rounded px-1.5 py-0.5 text-2xs font-medium ${typeToneClasses[scheme.badgeTone]}`}>{scheme.categoryLabel}</span>
                      </td>
                      <td className="border border-slate-200 px-2.5 py-2 text-center text-xs">
                        <Link
                          className="inline-block rounded bg-portal-navy px-3 py-1 text-2xs font-semibold text-white shadow-sm transition hover:bg-portal-navy-dark focus:outline-none focus:ring-2 focus:ring-portal-amber"
                          to={application ? applicantApplicationPath(application.id) : `${applicantSchemePath(scheme.id)}#application-action`}
                        >
                          {application ? 'View' : 'Apply'}
                        </Link>
                      </td>
                      <td className="border border-slate-200 px-2.5 py-2 text-center text-xs">
                        {scheme.guidelinesAvailable ? (
                          <Link
                            className="inline-flex items-center gap-1 text-2xs font-semibold text-red-600 hover:text-red-700 hover:underline focus:outline-none focus:ring-2 focus:ring-portal-amber"
                            to={`${applicantSchemePath(scheme.id)}#guidelines`}
                          >
                            <PdfIcon />
                            PDF
                            <span className="sr-only"> guidelines for {scheme.name}</span>
                          </Link>
                        ) : (
                          <span className="text-2xs text-slate-300" aria-label="No guidelines available">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {totalPages > 1 ? (
            <nav aria-label="Suggested schemes pagination" className="flex items-center gap-1.5 px-4 py-2.5 text-xs text-slate-700">
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                <button
                  aria-current={pageNumber === currentPage ? 'page' : undefined}
                  className={`flex h-6 w-6 items-center justify-center rounded text-2xs font-bold transition focus:outline-none focus:ring-2 focus:ring-portal-amber ${
                    pageNumber === currentPage ? 'bg-portal-navy text-white' : 'border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                  key={pageNumber}
                  type="button"
                  onClick={() => setPage(pageNumber)}
                >
                  {pageNumber}
                  <span className="sr-only">Page {pageNumber}</span>
                </button>
              ))}
              <span className="ml-1 text-2xs text-slate-400">
                Showing {showingFrom}-{showingTo} of {schemes.length}
              </span>
            </nav>
          ) : null}

          <div className="border-t border-slate-200 bg-amber-50/60 px-4 py-2 text-2xs leading-relaxed text-amber-900">
            Sample listings only. These suggestions are not an eligibility decision — confirm the official notification and criteria before applying.
          </div>
        </>
      ) : (
        <div className="p-8 text-center">
          <h3 className="text-sm font-bold text-portal-navy">No suggested schemes are available</h3>
          <p className="mt-1 text-xs text-slate-500">Return to the scheme directory to review all current sample listings.</p>
          <Button className="mt-4" size="sm" to={ROUTES.applicant.schemes} variant="outline">Browse schemes</Button>
        </div>
      )}
    </Card>
  );
}
