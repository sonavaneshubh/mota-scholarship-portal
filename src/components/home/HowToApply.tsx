import { DEFICIENCY_NOTE, HOW_TO_APPLY_PHASES } from '../../data/mockData';

export function HowToApply() {
  return (
    <div className="space-y-4">
      <div className="border-b border-slate-200 pb-2">
        <span className="text-[11px] sm:text-xs font-bold text-gov-saffron uppercase">Applicant Journey</span>
        <h3 className="text-base md:text-lg font-bold text-gov-blue-dark">How to Apply on the Unified Portal</h3>
      </div>

      <div className="space-y-2 md:space-y-3">
        {HOW_TO_APPLY_PHASES.map((phase) => (
          <div key={phase.phase} className="flex items-start gap-2.5 md:gap-3 p-2.5 md:p-3 bg-slate-50 border border-slate-200 rounded">
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

      <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-300 rounded">
        <svg className="w-4 h-4 text-gov-saffron mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path
            clipRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            fillRule="evenodd"
          />
        </svg>
        <p className="text-xs text-slate-700 leading-relaxed">{DEFICIENCY_NOTE}</p>
      </div>
    </div>
  );
}