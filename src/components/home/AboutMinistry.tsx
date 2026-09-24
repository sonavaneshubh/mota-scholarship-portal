import { MINISTRY_STATS } from '../../data/mockData';

export function AboutMinistry() {
  return (
    <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
      <div className="border-b border-slate-200 pb-3 mb-4">
        <span className="text-xs font-bold text-gov-saffron uppercase tracking-wider">
          Mandate &amp; Institutional Framework
        </span>
        <h2 className="text-xl font-bold text-gov-blue-dark">
          About the Ministry of Tribal Affairs (MoTA)
        </h2>
      </div>

      <p className="text-sm text-slate-700 leading-relaxed mb-4">
        The Ministry was set up in 1999 after the bifurcation of the Ministry of Social Justice and
        Empowerment with the objective of providing a more focused approach towards integrated
        socio-economic development of the Scheduled Tribes (STs). The programmes and schemes of the
        Ministry are intended to support and supplement other Central Ministries, State Governments,
        and voluntary organizations, taking into account the educational and economic status of STs.
      </p>

      <div className="bg-blue-50/70 border-l-4 border-gov-blue p-4 rounded-r mb-4">
        <h3 className="text-sm font-bold text-gov-blue-dark mb-1">
          About National Fellowship Scheme (NFST) &amp; Digital Portal Architecture
        </h3>
        <p className="text-xs text-slate-700 leading-relaxed">
          This is a flagship Central Sector Scheme where every year{' '}
          <strong>750 fresh ST students</strong> are awarded fellowship grants for pursuing
          Integrated M.Phil + Ph.D and regular Ph.D courses in Sciences, Humanities, and
          Engineering. The management system integrates with DigiLocker to fetch validated caste,
          income, and academic documents, and coordinates directly with designated nodal university
          officers for zero-leakage, transparent DBT disbursements.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center pt-2">
        {MINISTRY_STATS.map((stat) => (
          <div key={stat.id} className="bg-slate-50 border border-slate-200 rounded p-2.5">
            <div className={`text-lg font-black ${stat.valueClass}`}>{stat.value}</div>
            <div className="text-[11px] text-slate-600 font-medium">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}