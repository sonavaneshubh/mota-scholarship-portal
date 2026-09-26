function ChevronRight() {
  return (
    <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" />
    </svg>
  );
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  const isLastPage = currentPage >= totalPages;

  return (
    <div className="flex items-center justify-start gap-1.5 border-t border-slate-200 bg-slate-50 px-2.5 py-2">
      {pages.map((page) => {
        const isActive = page === currentPage;
        return (
          <button
            key={page}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            className={`h-[26px] min-w-[26px] rounded-[3px] border px-1.5 text-[12px] font-semibold leading-none ${
              isActive
                ? 'border-[#0B2A4A] bg-[#0B2A4A] text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:border-[#0B2A4A] hover:text-[#0B2A4A]'
            }`}
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        );
      })}

      <button
        type="button"
        aria-label="Next page"
        disabled={isLastPage}
        className="flex h-[26px] w-[26px] items-center justify-center rounded-[3px] border border-slate-300 bg-white text-slate-700 hover:border-[#0B2A4A] hover:text-[#0B2A4A] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-300 disabled:hover:text-slate-700"
        onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
      >
        <ChevronRight />
      </button>
    </div>
  );
}
