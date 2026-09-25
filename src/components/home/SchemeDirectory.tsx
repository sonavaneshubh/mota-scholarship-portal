import { useState } from 'react';
import { SCHEMES, SCHEME_FILTERS } from '../../data/mockData';
import type { Scheme, SchemeCategory } from '../../types';
import { SchemeCard } from './SchemeCard';

export function SchemeDirectory() {
  const [filter, setFilter] = useState<SchemeCategory>('all');

  const visibleSchemes: Scheme[] =
    filter === 'all' ? SCHEMES : SCHEMES.filter((scheme) => scheme.category === filter);

  return (
    <section
      className="bg-slate-100 py-8 md:py-10 border-y border-slate-200"
      data-purpose="schemes-fellowships-directory"
      id="schemes-list"
    >
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-3">
          <div>
            <span className="text-xs font-bold text-gov-saffron uppercase tracking-wider">
              MoTA Prototype Portfolio
            </span>
            <h2 className="text-lg md:text-2xl font-bold text-gov-blue-dark">
              Scholarships &amp; Fellowships
            </h2>
            <p className="text-xs md:text-sm text-slate-600 mt-1">
              Sample scheme configurations for the prototype workflow — submission, validation and
              verification are demonstrated end to end.
            </p>
            <p className="text-[11px] text-slate-500 italic mt-1">
              Demo listing — these are NOT official schemes or eligibility criteria.
            </p>
          </div>

          <div
            className="mt-3 md:mt-0 flex flex-wrap gap-1 bg-white p-1 rounded border border-slate-300 text-xs font-semibold"
            role="tablist"
            aria-label="Filter schemes by category"
          >
            {SCHEME_FILTERS.map((item) => {
              const isActive = filter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`px-3 py-1 rounded transition ${
                    isActive ? 'bg-gov-blue text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                  onClick={() => setFilter(item.id)}
                >
                  {item.label}
                  {item.id === 'all' ? ` (${SCHEMES.length})` : ''}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {visibleSchemes.map((scheme) => (
            <SchemeCard key={scheme.id} scheme={scheme} />
          ))}
        </div>
      </div>
    </section>
  );
}