import { useMemo, useState } from 'react';
import { useEligibleSchemes } from '../../hooks/useEligibleSchemes';
import { SchemeCard } from './SchemeCard';

export function SchemeDirectory() {
  const { schemes, loading, error } = useEligibleSchemes();
  const [filter, setFilter] = useState<string>('all');

  // Filters are derived from the schemes that actually exist, so a category
  // button can never advertise a bucket that has no schemes behind it.
  const filters = useMemo(() => {
    const categories = new Map<string, string>();
    for (const scheme of schemes) {
      categories.set(scheme.categoryLabel, scheme.categoryLabel);
    }
    return [
      { id: 'all', label: 'All' },
      ...Array.from(categories, ([id, label]) => ({ id, label })),
    ];
  }, [schemes]);

  const visibleSchemes = useMemo(
    () => (filter === 'all' ? schemes : schemes.filter((scheme) => scheme.categoryLabel === filter)),
    [filter, schemes],
  );

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
              Ministry of Tribal Affairs
            </span>
            <h2 className="text-lg md:text-2xl font-bold text-gov-blue-dark">
              Scholarships &amp; Fellowships
            </h2>
            <p className="text-xs md:text-sm text-slate-600 mt-1">
              Scholarship schemes published on this portal. Criteria, benefits, and deadlines come from
              the official notification for each scheme.
            </p>
          </div>

          {schemes.length > 0 ? (
            <div
              className="mt-3 md:mt-0 flex flex-wrap gap-1 bg-white p-1 rounded border border-slate-300 text-xs font-semibold"
              role="tablist"
              aria-label="Filter schemes by category"
            >
              {filters.map((item) => {
                const isActive = filter === item.id;
                const count =
                  item.id === 'all'
                    ? schemes.length
                    : schemes.filter((scheme) => scheme.categoryLabel === item.id).length;

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
                    {item.label} ({count})
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>

        {loading ? (
          <div aria-busy="true" className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-4" role="status">
            {Array.from({ length: 4 }, (_, index) => (
              <div className="h-56 animate-pulse rounded-lg bg-white" key={index} />
            ))}
            <span className="sr-only">Loading schemes</span>
          </div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <h3 className="text-base font-bold text-red-900">Schemes could not be loaded</h3>
            <p className="mt-2 text-sm text-red-800">
              The scheme service did not respond. Please try again later.
            </p>
          </div>
        ) : null}

        {!loading && !error && visibleSchemes.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
            <h3 className="text-base font-bold text-gov-blue-dark">
              {schemes.length === 0 ? 'No schemes are published yet' : 'No schemes in this category'}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              {schemes.length === 0
                ? 'Schemes appear here once they are published and verified.'
                : 'Choose a different category to see the published schemes.'}
            </p>
          </div>
        ) : null}

        {!loading && !error && visibleSchemes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {visibleSchemes.map((scheme) => (
              <SchemeCard key={scheme.id} scheme={scheme} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
