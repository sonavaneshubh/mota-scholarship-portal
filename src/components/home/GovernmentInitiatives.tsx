import { GOVERNMENT_INITIATIVES } from '../../data/mockData';

export function GovernmentInitiatives() {
  return (
    <section className="bg-slate-100 py-6 border-t border-slate-300" data-purpose="planned-integrations-strip">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-4">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
            Planned Integrations &amp; References
          </span>
          <p className="text-[11px] text-slate-500 mt-1">
            Architectural possibilities for future milestones — not live or integrated in this
            prototype.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-10 text-xs font-bold text-slate-700">
          {GOVERNMENT_INITIATIVES.map((initiative) => (
            <div
              key={initiative.id}
              className="flex flex-col sm:flex-row items-center gap-2 border border-slate-200 bg-white px-3 py-1.5 rounded shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${initiative.dotClass}`} />
                <span>{initiative.name}</span>
              </div>
              <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500 border border-slate-200 rounded px-1.5 py-0.5">
                {initiative.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}