import { useState } from 'react';
import { Link } from 'react-router-dom';
import { applicantSchemePath } from '../../lib/constants';
import type { ApplicantScheme } from '../../lib/supabase';
import { Pagination } from './Pagination';
import { SchemeTypeBadge } from './SchemeTypeBadge';

const PAGE_SIZE = 10;

function PdfIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
      <path d="M14 2H6.5A2.5 2.5 0 0 0 4 4.5v15A2.5 2.5 0 0 0 6.5 22h11a2.5 2.5 0 0 0 2.5-2.5V8l-6-6Zm.5 7V3.5L18.5 9h-4Z" />
    </svg>
  );
}

function SchemeRow({ scheme }: { scheme: ApplicantScheme }) {
  const detailPath = applicantSchemePath(scheme.id);

  return (
    <tr className="align-top hover:bg-slate-50">
      <td className="w-[42%] border-b border-slate-200 px-2.5 py-2 text-[12px] font-medium leading-[18px] text-slate-800">
        <Link className="hover:text-[#0B2A4A] hover:underline" to={detailPath}>
          {scheme.name}
        </Link>
      </td>
      <td className="w-[25%] border-b border-slate-200 px-2.5 py-2 text-[12px] leading-[18px] text-slate-700">
        {scheme.department}
      </td>
      <td className="w-[13%] border-b border-slate-200 px-2.5 py-2">
        <SchemeTypeBadge type={scheme.categoryLabel} />
      </td>
      <td className="w-[10%] border-b border-slate-200 px-2.5 py-2">
        <Link
          className="inline-flex h-[26px] items-center rounded-[3px] border border-[#0B2A4A] bg-[#0B2A4A] px-3 text-[11.5px] font-medium leading-none text-white hover:bg-[#0B2A4A]/90"
          to={`${detailPath}#application-action`}
        >
          Apply
        </Link>
      </td>
      <td className="w-[10%] border-b border-slate-200 px-2.5 py-2">
        {scheme.guidelinesAvailable ? (
          <Link
            className="inline-flex items-center gap-1 text-[11.5px] font-medium leading-none text-red-600 hover:text-red-700 hover:underline"
            to={`${detailPath}#guidelines`}
          >
            <PdfIcon />
            PDF
          </Link>
        ) : (
          <span className="text-[11.5px] text-slate-400">Not available</span>
        )}
      </td>
    </tr>
  );
}

interface SchemeTableProps {
  schemes: ApplicantScheme[];
  loading?: boolean;
}

export function SchemeTable({ schemes, loading = false }: SchemeTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(schemes.length / PAGE_SIZE));
  const visibleSchemes = schemes.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (loading) {
    return (
      <div className="border border-slate-200 bg-white px-2.5 py-2">
        <div aria-busy="true" className="space-y-2" role="status">
          {Array.from({ length: 5 }, (_, index) => (
            <div className="h-8 animate-pulse rounded bg-slate-100" key={index} />
          ))}
          <span className="sr-only">Loading schemes</span>
        </div>
      </div>
    );
  }

  if (schemes.length === 0) {
    return (
      <div className="border border-dashed border-slate-300 bg-white px-4 py-10 text-center">
        <p className="text-[13px] font-semibold text-[#0B2A4A]">No schemes available</p>
        <p className="mt-1 text-[12px] text-slate-600">
          There are no published scholarship schemes at the moment. Please check back later.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 bg-white">
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th className="w-[42%] border-b border-r border-slate-200 px-2.5 py-2 text-left text-[12px] font-bold leading-[18px] text-[#0B2A4A]">
                Scheme Name
              </th>
              <th className="w-[25%] border-b border-r border-slate-200 px-2.5 py-2 text-left text-[12px] font-bold leading-[18px] text-[#0B2A4A]">
                Department Name
              </th>
              <th className="w-[13%] border-b border-r border-slate-200 px-2.5 py-2 text-left text-[12px] font-bold leading-[18px] text-[#0B2A4A]">
                Scheme Type
              </th>
              <th className="w-[10%] border-b border-r border-slate-200 px-2.5 py-2 text-left text-[12px] font-bold leading-[18px] text-[#0B2A4A]">
                Take Action
              </th>
              <th className="w-[10%] border-b border-slate-200 px-2.5 py-2 text-left text-[12px] font-bold leading-[18px] text-[#0B2A4A]">
                Download GRs
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleSchemes.map((scheme) => (
              <SchemeRow key={scheme.id} scheme={scheme} />
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <Pagination
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          totalPages={totalPages}
        />
      ) : null}
    </div>
  );
}
