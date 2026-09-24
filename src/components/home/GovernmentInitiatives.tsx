import { GOVERNMENT_INITIATIVES } from '../../data/mockData';

export function GovernmentInitiatives() {
  return (
    <section className="bg-slate-100 py-6 border-t border-slate-300" data-purpose="government-initiatives-strip">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-4">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
            National Digital Public Infrastructure &amp; Ecosystem Partners
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10 text-xs font-bold text-slate-700">
          {GOVERNMENT_INITIATIVES.map((initiative) => (
            <div
              key={initiative.id}
              className="flex items-center gap-2 border border-slate-200 bg-white px-3 py-1.5 rounded shadow-sm"
            >
              <span className={`w-3 h-3 rounded-full ${initiative.dotClass}`} />
              <span>{initiative.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}