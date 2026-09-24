import { SECTION_IDS, SITE } from '../../lib/constants';
import { Button } from '../ui/Button';

function NationalEmblem() {
  return (
    <div className="w-14 h-16 flex-shrink-0 flex items-center justify-center border-r border-slate-300 pr-3">
      <svg aria-label="Placeholder representation of Emblem of India" className="h-16 w-auto text-slate-900" fill="currentColor" viewBox="0 0 100 130">
        <path
          d="M50 5 C40 5 35 15 35 25 C35 30 38 35 42 38 C35 40 28 46 28 55 C28 62 33 68 40 70 L35 85 L65 85 L60 70 C67 68 72 62 72 55 C72 46 65 40 58 38 C62 35 65 30 65 25 C65 15 60 5 50 5 Z"
          fill="#2d3748"
          opacity="0.9"
        />
        <rect fill="#2d3748" height="8" rx="2" width="50" x="25" y="87" />
        <circle cx="50" cy="91" fill="#ffffff" r="3" />
        <path d="M20 98 L80 98 L75 110 L25 110 Z" fill="#2d3748" />
        <text fill="#1a202c" fontSize="9" fontWeight="bold" textAnchor="middle" x="50" y="124">
          {SITE.sealMotto}
        </text>
      </svg>
    </div>
  );
}

export function Masthead() {
  return (
    <section
      className="bg-white border-b border-slate-200 py-3 px-4 shadow-sm"
      data-purpose="official-branding-header"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-left">
          <NationalEmblem />
          <div>
            <div className="text-xs uppercase tracking-wider text-slate-600 font-semibold leading-tight">
              {SITE.govtLineHi} • {SITE.govtLineEn}
            </div>
            <h1 className="text-base md:text-lg font-bold text-gov-blue-dark leading-tight mt-0.5">
              {SITE.nameHi}
            </h1>
            <div className="text-sm font-semibold text-slate-800 leading-tight">{SITE.nameEn}</div>
            <div className="text-[11px] text-gov-saffron-dark font-medium mt-0.5">
              {SITE.portalName}
            </div>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-6 px-4 border-x border-slate-200">
          <div className="text-center">
            <div className="text-xs font-bold text-gov-saffron">{SITE.nationalInitiativeTitle}</div>
            <div className="text-sm font-black text-slate-800 tracking-wide">
              {SITE.nationalInitiativeSubtitle}
            </div>
            <div className="text-[10px] text-gov-green font-semibold">
              {SITE.nationalTagline}
              <span aria-hidden="true">, Sabka Prayas</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-right">
          <div className="hidden sm:block">
            <div className="text-[11px] text-slate-500 font-medium">{SITE.helpdeskLabel}</div>
            <div className="text-sm font-bold text-gov-blue">{SITE.helpdeskPhone}</div>
            <div className="text-[10px] text-slate-500">{SITE.helpdeskHours}</div>
          </div>
          <div className="flex flex-col gap-1">
            <Button variant="primary" size="md" href={SECTION_IDS.QUICK_LOGIN}>
              Portal Sign In
            </Button>
            <Button variant="outline" size="sm" href={SECTION_IDS.TRACK}>
              Track Application
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}