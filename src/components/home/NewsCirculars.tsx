import { Link } from 'react-router-dom';
import { CIRCULARS } from '../../data/mockData';
import { ROUTES } from '../../lib/constants';
import { Badge } from '../ui/Badge';

export function NewsCirculars() {
  return (
    <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-5 shadow-sm" id="notices">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
        <h3 className="text-sm font-bold text-gov-blue-dark uppercase tracking-wide flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-ping" />
          Guidelines &amp; Notices
        </h3>
        <Badge tone="amber">Demo Data</Badge>
      </div>

      <ul className="space-y-3 text-xs divide-y divide-slate-100">
        {CIRCULARS.map((item) => (
          <li key={item.id} className="pt-2">
            <div className="flex items-start gap-2">
              <span className="bg-amber-100 text-amber-800 px-1 py-0.5 rounded text-[10px] font-bold">
                DEMO
              </span>
              <div>
                <a className="font-medium text-gov-blue hover:underline" href="#notices">
                  {item.title}
                </a>
                <div className="text-[10px] text-slate-500 mt-0.5">{item.meta}</div>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 pt-3 border-t border-slate-100 bg-slate-50 p-2.5 rounded text-center">
        <span className="text-[11px] text-slate-600 block">
          Officer / administrator access is a prototype UI.
        </span>
        <Link className="text-xs font-bold text-gov-blue hover:text-gov-saffron" to={ROUTES.admin.login}>
          Officer / Administrator Access →
        </Link>
      </div>
    </div>
  );
}