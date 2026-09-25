import { Link } from 'react-router-dom';
import { ROUTES } from '../../lib/constants';

export function AboutMinistry() {
  return (
    <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
      <div className="border-b border-slate-200 pb-3 mb-4">
        <span className="text-xs font-bold text-gov-saffron uppercase tracking-wider">
          About MoTA
        </span>
        <h2 className="text-xl font-bold text-gov-blue-dark">Ministry of Tribal Affairs</h2>
      </div>

      <p className="text-sm text-slate-700 leading-relaxed mb-5">
        The Ministry of Tribal Affairs (MoTA) was set up in 1999 to provide a more focused approach
        towards the integrated socio-economic development of Scheduled Tribes (STs).
      </p>

      <Link
        to={ROUTES.aboutMota}
        className="inline-flex items-center gap-1 text-sm font-bold text-gov-blue hover:text-gov-saffron"
      >
        Read More <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
