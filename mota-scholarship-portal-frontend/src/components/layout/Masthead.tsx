import { SITE } from '../../lib/constants';
import logo from '../../assets/logo.png';

export function Masthead() {
  return (
    <header className="bg-white border-b border-slate-200 shadow-sm">
      <div className="mx-auto max-w-full px-3 sm:px-4 lg:px-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-2.5">
          <div className="flex items-center gap-3 flex-shrink-0 min-w-0">
            <div className="relative flex-shrink-0">
              <img
                src={logo}
                alt="Government of India Emblem"
                className="h-16 w-auto object-contain sm:h-20"
              />
            </div>
            <div className="min-w-0 hidden sm:block">
              <div className="flex items-center gap-2 text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-600">
                <span>{SITE.govtLineHi}</span>
                <span className="text-slate-400">|</span>
                <span>{SITE.govtLineEn}</span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-gov-blue-dark leading-tight mt-0.5">
                {SITE.nameHi}
              </h1>
              <div className="text-sm font-semibold text-slate-800 leading-tight">{SITE.nameEn}</div>
              <div className="text-[10px] sm:text-xs font-medium text-gov-saffron-dark mt-0.5">
                {SITE.portalName}
              </div>
            </div>
          </div>

          <div className="hidden md:flex flex-1 items-center justify-center px-4">
            <div className="text-center">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-gov-saffron" />
                {SITE.prototypeLabel}
              </span>
              <div className="text-sm sm:text-base font-black text-gov-blue-dark tracking-wide mt-1">
                {SITE.mastheadLine}
              </div>
              <div className="text-[10px] text-gov-green font-semibold">{SITE.mastheadSubline}</div>
            </div>
          </div>

          <div className="w-full sm:w-auto flex-shrink-0">
            <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-2">
              <div className="hidden sm:flex flex-col items-end gap-0.5 p-2 rounded-lg bg-amber-50 border border-amber-100">
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-gov-saffron" />
                  {SITE.helpdeskLabel}
                </div>
                <div className="text-base font-bold text-gov-blue leading-none">{SITE.helpdeskPhone}</div>
                <div className="text-[10px] text-slate-600">{SITE.helpdeskHours}</div>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-amber-50 border border-amber-100 sm:hidden w-full justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-gov-saffron" />
                <span className="text-[10px] font-bold text-amber-700">{SITE.helpdeskLabel}</span>
                <span className="text-sm font-bold text-gov-blue">{SITE.helpdeskPhone}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}