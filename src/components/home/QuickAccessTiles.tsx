import { Link } from 'react-router-dom';
import { QUICK_ACTIONS } from '../../data/mockData';
import type { AccentTone, QuickAction, QuickActionIcon } from '../../types';

const accentTopClass: Record<AccentTone, string> = {
  blue: 'border-t-gov-blue',
  saffron: 'border-t-gov-saffron',
  green: 'border-t-gov-green',
  purple: 'border-t-purple-700',
  slate: 'border-t-slate-400',
};

const iconBoxClass: Record<AccentTone, string> = {
  blue: 'bg-blue-50 text-gov-blue',
  saffron: 'bg-amber-50 text-gov-saffron',
  green: 'bg-emerald-50 text-gov-green',
  purple: 'bg-purple-50 text-purple-700',
  slate: 'bg-slate-100 text-slate-600',
};

const linkClass: Record<AccentTone, string> = {
  blue: 'text-gov-blue hover:text-gov-saffron',
  saffron: 'text-gov-saffron hover:text-gov-saffron-dark',
  green: 'text-gov-green hover:text-gov-green-dark',
  purple: 'text-purple-700 hover:text-purple-900',
  slate: 'text-slate-600 hover:text-slate-900',
};

function QuickActionIcon({ icon }: { icon: QuickActionIcon }) {
  switch (icon) {
    case 'scheme':
      return (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
        </svg>
      );
    case 'eligibility':
      return (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path
            clipRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            fillRule="evenodd"
          />
        </svg>
      );
    case 'track':
      return (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path
            clipRule="evenodd"
            d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
            fillRule="evenodd"
          />
        </svg>
      );
    case 'grievance':
      return (
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path
            clipRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            fillRule="evenodd"
          />
        </svg>
      );
  }
}

function TrackInput() {
  return (
    <div className="mt-2.5 flex items-center gap-1">
      <input
        aria-label="Enter Application ID"
        className="w-full text-xs py-1 px-2 border rounded border-slate-300 focus:ring-1 focus:ring-gov-green focus:border-gov-green"
        placeholder="Application ID"
        type="text"
      />
      <button
        type="button"
        className="px-2 py-1 bg-gov-green hover:bg-gov-green-dark text-white text-xs font-bold rounded transition"
      >
        Go
      </button>
    </div>
  );
}

export function QuickAccessTiles() {
  return (
    <section className="max-w-7xl mx-auto px-4 -mt-5 relative z-20" data-purpose="quick-access-tiles">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {QUICK_ACTIONS.map((action: QuickAction) => (
          <div
            key={action.id}
            id={action.anchorId}
            className={`bg-white border-t-4 ${accentTopClass[action.accent]} rounded shadow-md p-4 hover:shadow-lg transition`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded ${iconBoxClass[action.accent]} flex items-center justify-center font-bold`}
              >
                <QuickActionIcon icon={action.icon} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">{action.title}</h3>
                <p className="text-xs text-slate-500">{action.description}</p>
              </div>
            </div>
            {action.hasInlineInput ? (
              <TrackInput />
            ) : action.href.startsWith('/') ? (
              <Link
                className={`mt-3 block text-xs font-semibold ${linkClass[action.accent]}`}
                to={action.href}
              >
                {action.ctaLabel} →
              </Link>
            ) : (
              <a
                className={`mt-3 block text-xs font-semibold ${linkClass[action.accent]}`}
                href={action.href}
              >
                {action.ctaLabel} →
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}