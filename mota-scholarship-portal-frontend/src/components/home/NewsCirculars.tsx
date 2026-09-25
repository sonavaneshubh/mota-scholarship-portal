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
                <Link className="font-medium text-gov-blue hover:underline" to={ROUTES.guidelinesNotices}>
                  {item.title}
                </Link>
                <div className="text-[10px] text-slate-500 mt-0.5">{item.meta}</div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
