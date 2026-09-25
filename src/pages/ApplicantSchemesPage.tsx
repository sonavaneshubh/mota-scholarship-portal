import { useMemo, useState } from 'react';
import { SCHEMES, SCHEME_FILTERS } from '../data/mockData';
import type { SchemeCategory } from '../types';
import { ApplicantPageHeader } from '../components/applicant/ApplicantPageHeader';
import { ApplicantSchemeCard } from '../components/applicant/ApplicantSchemeCard';
import { Button } from '../components/ui/Button';
import { ROUTES } from '../lib/constants';

export function ApplicantSchemesPage() {
  const [category, setCategory] = useState<SchemeCategory>('all');
  const [search, setSearch] = useState('');

  const filteredSchemes = useMemo(() => {
    const query = search.trim().toLowerCase();

    return SCHEMES.filter((scheme) => {
      const matchesCategory = category === 'all' || scheme.category === category;
      const matchesSearch = !query || `${scheme.name} ${scheme.description} ${scheme.categoryLabel}`.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [category, search]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <ApplicantPageHeader
        action={<Button size="md" to={ROUTES.applicant.dashboard} variant="outline">Back to dashboard</Button>}
        description="Browse sample scholarship and fellowship listings. Scheme details and deadlines in this prototype are illustrative only."
        eyebrow="Applicant workspace"
        title="Scholarships & Fellowships"
      />

      <section className="rounded-lg border border-slate-200 bg-white p-4" aria-label="Filter schemes">
        <div className="grid gap-3 md:grid-cols-[1fr_15rem]">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">Search schemes</span>
            <input
              className="w-full rounded border border-slate-300 px-3 py-2.5 text-sm focus:border-gov-blue focus:outline-none focus:ring-2 focus:ring-blue-100"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name or category"
              type="search"
              value={search}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">Category</span>
            <select
              className="w-full rounded border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-gov-blue focus:outline-none focus:ring-2 focus:ring-blue-100"
              onChange={(event) => setCategory(event.target.value as SchemeCategory)}
              value={category}
            >
              {SCHEME_FILTERS.map((filter) => <option key={filter.id} value={filter.id}>{filter.label}</option>)}
            </select>
          </label>
        </div>
      </section>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-600">Showing {filteredSchemes.length} sample scheme{filteredSchemes.length === 1 ? '' : 's'}</p>
        {search || category !== 'all' ? <button className="min-h-11 text-xs font-semibold text-gov-blue underline underline-offset-2" type="button" onClick={() => { setSearch(''); setCategory('all'); }}>Clear filters</button> : null}
      </div>

      {filteredSchemes.length ? (
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Scheme results">
          {filteredSchemes.map((scheme) => <ApplicantSchemeCard key={scheme.id} scheme={scheme} />)}
        </section>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <h2 className="text-lg font-bold text-gov-blue-dark">No schemes found</h2>
          <p className="mt-2 text-sm text-slate-600">Try a different search term or clear the filters.</p>
        </div>
      )}
    </div>
  );
}
