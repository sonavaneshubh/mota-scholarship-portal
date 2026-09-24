import { MINISTRY_STATS } from '../../data/mockData';

export function AboutMinistry() {
  return (
    <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
      <div className="border-b border-slate-200 pb-3 mb-4">
        <span className="text-xs font-bold text-gov-saffron uppercase tracking-wider">
          About the Portal &amp; its Purpose
        </span>
        <h2 className="text-xl font-bold text-gov-blue-dark">
          About the Ministry of Tribal Affairs (MoTA)
        </h2>
      </div>

      <p className="text-sm text-slate-700 leading-relaxed mb-4">
        The Ministry was set up in 1999 after the bifurcation of the Ministry of Social Justice and
        Empowerment with the objective of providing a more focused approach towards integrated
        socio-economic development of the Scheduled Tribes (STs). Its programmes are intended to
        support and supplement the efforts of other Central Ministries, State Governments, and
        voluntary organizations, taking into account the educational and economic status of STs.
      </p>

      <div className="bg-blue-50/70 border-l-4 border-gov-blue p-4 rounded-r mb-4">
        <h3 className="text-sm font-bold text-gov-blue-dark mb-1">
          About the Scholarship &amp; Fellowship Management Portal
        </h3>
        <p className="text-xs text-slate-700 leading-relaxed">
          This proposed platform aims to provide a unified digital workflow for scheme discovery,
          eligibility pre-check, application submission, document management, AI-assisted
          extraction, officer verification, status tracking, and the final decision workflow. AI is
          used only in an assistive role; authorized officers remain responsible for verification
          and final decisions.
        </p>
        <p className="text-[11px] text-slate-500 italic mt-2">
          Prototype interface — this is not yet a deployed MoTA system.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center pt-2">
        {MINISTRY_STATS.map((stat) => (
          <div key={stat.id} className="bg-slate-50 border border-slate-200 rounded p-2.5">
            <div className={`text-sm md:text-lg font-black ${stat.valueClass}`}>{stat.value}</div>
            <div className="text-[11px] text-slate-600 font-medium">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}