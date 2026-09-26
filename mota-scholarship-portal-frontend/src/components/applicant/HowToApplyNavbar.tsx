import { Link } from 'react-router-dom';
import { ROUTES } from '../../lib/constants';

const howToApplySteps = [
  { number: 1, label: 'Benefit Schemes', to: ROUTES.applicant.schemes },
  { number: 2, label: 'Post Matric Scholarship', to: `${ROUTES.applicant.schemes}?category=post-matric` },
  { number: 3, label: 'Pre Matric Scholarship', to: `${ROUTES.applicant.schemes}?category=pre-matric` },
  { number: 4, label: 'Pension Schemes', to: `${ROUTES.applicant.schemes}?category=pension` },
  { number: 5, label: 'Farmer Schemes', to: `${ROUTES.applicant.schemes}?category=farmer` },
  { number: 6, label: 'Labour Schemes', to: `${ROUTES.applicant.schemes}?category=labour` },
  { number: 7, label: 'SP Sch', to: `${ROUTES.applicant.schemes}?category=special-assistance` },
];

export function HowToApplyNavbar() {
  return (
    <nav className="w-full bg-[#0B2A4A] border-b border-amber-500/20" aria-label="How to apply online step navigation">
      <div className="mx-auto max-w-full px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 py-3 overflow-x-auto">
          <div className="flex-shrink-0 flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 shadow-lg">
            <svg className="h-5 w-5 text-[#0B2A4A] flex-shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            <span className="text-sm font-extrabold text-[#0B2A4A] whitespace-nowrap">How to Apply Online ?</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1">
            {howToApplySteps.map((step, index) => (
              <Link
                key={step.number}
                to={step.to}
                className="flex-shrink-0 flex items-center gap-2 rounded-lg bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-colors border border-white/10 relative group"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-xs font-bold border border-amber-500/30">
                  {step.number}
                </span>
                <span className="hidden sm:inline whitespace-nowrap">{step.label}</span>
                <span className="sm:hidden whitespace-nowrap">{step.label}</span>
                {index < howToApplySteps.length - 1 && (
                  <span className="hidden sm:block w-8 h-0.5 bg-gradient-to-r from-amber-500/30 to-transparent -ml-1 mr-1" aria-hidden="true" />
                )}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}