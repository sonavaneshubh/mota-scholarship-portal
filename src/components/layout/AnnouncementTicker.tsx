import { ANNOUNCEMENTS } from '../../data/mockData';

export function AnnouncementTicker() {
  const items = ANNOUNCEMENTS;
  const doubled = [...items, ...items];

  return (
    <section aria-label="Running Announcements" className="bg-amber-50 border-b border-amber-200 py-1.5 px-4 text-xs">
      <div className="max-w-7xl mx-auto flex items-center">
        <span className="inline-flex items-center gap-1.5 font-bold uppercase text-red-700 bg-red-100 border border-red-300 px-2 py-0.5 rounded mr-3 flex-shrink-0 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-red-600" />
          Latest Notices
        </span>
        <span className="inline-flex items-center gap-1.5 font-semibold uppercase text-slate-500 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded mr-2 flex-shrink-0">
          Sample
        </span>
        <div className="overflow-hidden whitespace-nowrap w-full">
          <div className="marquee-track text-slate-800 font-medium">
            {doubled.map((item, idx) => (
              <span key={`${item.id}-${idx}`} className="mx-4">
                <span className="text-gov-blue font-semibold">★ {item.mark}:</span>{' '}
                {item.text}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}