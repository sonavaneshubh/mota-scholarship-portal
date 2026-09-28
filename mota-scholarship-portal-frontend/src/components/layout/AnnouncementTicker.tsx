import { ANNOUNCEMENTS } from '../../data/mockData';

export function AnnouncementTicker() {
  const items = ANNOUNCEMENTS;
  const doubled = [...items, ...items];

  return (
    /* py-0.5 rather than py-1.5. The bar's height is driven entirely by the
       "Latest Notices" pill, so the padding and the pill's own py are trimmed
       together: pill 22px -> 18px, section 31px -> 23px. The 12px type and the
       pill border are untouched, so the label still reads as a tag. */
    <section aria-label="Running Announcements" className="bg-amber-50 border-b border-amber-200 py-0.5 px-3 sm:px-4 text-[11px] md:text-xs">
      <div className="max-w-7xl mx-auto flex items-center">
        <span className="inline-flex items-center gap-1.5 font-bold uppercase text-red-700 bg-red-100 border border-red-300 px-1.5 sm:px-2 rounded mr-2 sm:mr-3 flex-shrink-0 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-red-600" />
          <span className="hidden sm:inline">Latest Notices</span>
          <span className="sm:hidden">Notices</span>
        </span>
        <span className="inline-flex items-center gap-1.5 font-semibold uppercase text-slate-500 bg-slate-100 border border-slate-300 px-1.5 sm:px-2 rounded mr-2 flex-shrink-0">
          Sample
        </span>
        <div className="overflow-hidden whitespace-nowrap w-full min-w-0">
          <div className="marquee-track text-slate-800 font-medium">
            {doubled.map((item, idx) => (
              <span key={`${item.id}-${idx}`} className="mx-4">
                <span className="text-gov-blue font-semibold">DEMO · {item.mark}:</span>{' '}
                {item.text}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}