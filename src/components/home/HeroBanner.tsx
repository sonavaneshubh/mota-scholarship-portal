import { LEADERS } from '../../data/mockData';
import { SECTION_IDS } from '../../lib/constants';
import { Button } from '../ui/Button';

export function HeroBanner() {
  return (
    <section
      className="relative bg-gradient-to-r from-gov-blue-dark via-gov-blue to-slate-900 text-white py-8 px-4 overflow-hidden border-b-4 border-amber-500"
      data-purpose="hero-banner"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '16px 16px' }}
      />

      <div className="max-w-7xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-8 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur rounded-full text-xs text-amber-300 border border-amber-400/40">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            Janjatiya Gaurav &amp; Higher Education Vision
          </div>

          <h2 className="text-2xl md:text-4xl font-extrabold tracking-tight leading-tight">
            JANJATIYA GARIMA UTSAV 2026
          </h2>

          <div className="text-lg md:text-xl font-medium text-amber-200">
            Empowering Tribal Youth Through Higher Education &amp; Research Fellowships
          </div>

          <p className="text-slate-200 text-sm md:text-base leading-relaxed max-w-2xl">
            A unified, transparent portal offering seamless DigiLocker integration, automated
            document parsing, and institutional multi-tier verification for NFST, Top-Class
            Education, and Overseas Fellowships.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <Button variant="accent" size="lg" href={SECTION_IDS.SCHEMES}>
              Explore Central Schemes
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Button>
            <Button variant="ghost" size="lg" href={SECTION_IDS.TRACK}>
              Check Application Status
            </Button>
            <Button variant="emerald" size="lg" href={SECTION_IDS.VERIFICATION}>
              <svg className="w-4 h-4 text-emerald-300" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path
                  clipRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  fillRule="evenodd"
                />
              </svg>
              AI-Assisted Workflow Info
            </Button>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white/95 text-slate-900 p-4 rounded-lg shadow-lg border border-slate-200">
          <div className="text-xs uppercase tracking-wider font-bold text-gov-blue border-b pb-1.5 mb-3 text-center">
            Leadership &amp; Governance
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            {LEADERS.map((leader) => (
              <div key={leader.id} className="flex flex-col items-center">
                <div
                  className={`w-20 h-24 bg-slate-200 ${leader.frameClass} rounded p-1 mb-1.5 shadow-sm flex items-center justify-center overflow-hidden`}
                >
                  <svg className="w-14 h-14 text-slate-400" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
                <div className="text-xs font-bold text-slate-900 leading-tight">{leader.name}</div>
                <div className="text-[11px] text-gov-blue font-semibold">{leader.role}</div>
                <div className="text-[10px] text-slate-600">{leader.department}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-2 border-t border-slate-200 text-center">
            <span className="text-[11px] text-slate-600 italic">
              &quot;Sabka Saath, Sabka Vikas, Sabka Vishwas, Sabka Prayas&quot;
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}