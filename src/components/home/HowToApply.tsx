import { HOW_TO_APPLY_PHASES } from '../../data/mockData';

export function HowToApply() {
  return (
    <div className="lg:col-span-8 space-y-4">
      <div className="border-b border-slate-200 pb-2">
        <span className="text-xs font-bold text-gov-saffron uppercase">Scholar Journey</span>
        <h3 className="text-lg font-bold text-gov-blue-dark">How to Apply on the Unified Portal</h3>
      </div>

      <div className="space-y-3">
        {HOW_TO_APPLY_PHASES.map((phase) => (
          <div key={phase.phase} className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded">
            <span className="px-2 py-0.5 bg-gov-blue text-white font-bold text-xs rounded flex-shrink-0">
              {phase.phase}
            </span>
            <div>
              <h4 className="text-xs font-bold text-slate-900">{phase.title}</h4>
              <p className="text-xs text-slate-600 mt-0.5">{phase.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}