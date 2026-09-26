import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  fetchSchemes, 
  fetchDepartments, 
  fetchSchemeCategories, 
  fetchAcademicYears,
  mapSchemeToFrontend,
} from '../services/schemes';
import type { Scheme, SchemeFilters } from '../lib/supabase';
import { ApplicantPageHeader } from '../components/applicant/ApplicantPageHeader';
import { ApplicantSchemeCard } from '../components/applicant/ApplicantSchemeCard';
import { Button } from '../components/ui/Button';
import { ROUTES } from '../lib/constants';

export function ApplicantSchemesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isSuggestedView = searchParams.get('view') === 'suggested';
  
  const categoryParam = searchParams.get('category');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(categoryParam || 'all');
  const [academicYear, setAcademicYear] = useState(searchParams.get('academic_year') || 'all');
  const [departmentId, setDepartmentId] = useState(searchParams.get('department_id') || 'all');
  const [loading, setLoading] = useState(true);
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [departments, setDepartments] = useState<Array<{id: string; name: string; code: string}>>([]);
  const [categories, setCategories] = useState<Array<{id: string; name: string}>>([]);
  const [academicYears, setAcademicYears] = useState<string[]>([]);

  function setCategoryFilter(next: string) {
    setCategory(next);
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        if (next === 'all') {
          params.delete('category');
        } else {
          params.set('category', next);
        }
        params.delete('page');
        return params;
      },
      { replace: true },
    );
  }

  function setAcademicYearFilter(next: string) {
    setAcademicYear(next);
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        if (next === 'all') {
          params.delete('academic_year');
        } else {
          params.set('academic_year', next);
        }
        params.delete('page');
        return params;
      },
      { replace: true },
    );
  }

  function setDepartmentFilter(next: string) {
    setDepartmentId(next);
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        if (next === 'all') {
          params.delete('department_id');
        } else {
          params.set('department_id', next);
        }
        params.delete('page');
        return params;
      },
      { replace: true },
    );
  }

  function clearView() {
    setSearch('');
    setCategory('all');
    setAcademicYear('all');
    setDepartmentId('all');
    setPage(1);
    setSearchParams({});
  }

  async function loadReferenceData() {
    try {
      const [depts, cats, years] = await Promise.all([
        fetchDepartments(),
        fetchSchemeCategories(),
        fetchAcademicYears(),
      ]);
      setDepartments(depts);
      setCategories(cats);
      setAcademicYears(years);
    } catch (error) {
      console.error('Failed to load reference data:', error);
    }
  }

  const loadSchemes = useCallback(async () => {
    setLoading(true);
    try {
      const filters: SchemeFilters = {
        page: page,
        limit: 12,
      };
      
      if (category !== 'all') filters.category_id = category;
      if (academicYear !== 'all') filters.academic_year = academicYear;
      if (departmentId !== 'all') filters.department_id = departmentId;
      if (search.trim()) filters.search = search.trim();

      const result = await fetchSchemes(filters);
      setSchemes(result.schemes);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to load schemes:', error);
      setSchemes([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, category, academicYear, departmentId, search]);

  useEffect(() => {
    loadReferenceData();
  }, []);

  useEffect(() => {
    loadSchemes();
  }, [loadSchemes]);

  const filteredSchemes = useMemo(() => {
    return schemes.map(mapSchemeToFrontend);
  }, [schemes]);

  const pageCount = Math.max(1, Math.ceil(total / 12));

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  };

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        if (search.trim()) {
          params.set('search', search.trim());
        } else {
          params.delete('search');
        }
        params.delete('page');
        return params;
      },
      { replace: true },
    );
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        params.set('page', String(newPage));
        return params;
      },
      { replace: true },
    );
  };

  if (loading) {
    return (
      <div className="space-y-6 py-2 sm:py-4">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-100 rounded w-3/4" />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 h-64 bg-slate-100 rounded" />
            <div className="h-48 bg-slate-100 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-2 sm:py-4">
      <ApplicantPageHeader
        action={<Button size="md" to={ROUTES.applicant.dashboard} variant="outline">Back to dashboard</Button>}
        description={isSuggestedView
          ? 'Schemes published on this portal. Confirm the official criteria in the scheme notification before applying.'
          : 'Browse verified scholarship and fellowship listings from official sources. Filter by department, category, or academic year.'}
        eyebrow="Applicant workspace"
        title={isSuggestedView ? 'Suggested eligible schemes' : 'Scholarships & Fellowships'}
      />

      {isSuggestedView ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
          <span className="font-bold">Not an eligibility decision:</span> These are the schemes published
          on this portal. Confirm the official criteria in the scheme notification before applying.
        </div>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-4" aria-label="Filter schemes">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">Search schemes</span>
            <form onSubmit={handleSearchSubmit}>
              <input
                className="w-full rounded border border-slate-300 px-3 py-2.5 text-sm focus:border-gov-blue focus:outline-none focus:ring-2 focus:ring-blue-100"
                onChange={handleSearch}
                placeholder="Search by name or keyword"
                type="search"
                value={search}
              />
            </form>
          </label>
          
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">Department</span>
            <select
              className="w-full rounded border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-gov-blue focus:outline-none focus:ring-2 focus:ring-blue-100"
              onChange={(event) => setDepartmentFilter(event.target.value)}
              value={departmentId}
            >
              <option value="all">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">Category</span>
            <select
              className="w-full rounded border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-gov-blue focus:outline-none focus:ring-2 focus:ring-blue-100"
              onChange={(event) => setCategoryFilter(event.target.value)}
              value={category}
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">Academic Year</span>
            <select
              className="w-full rounded border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-gov-blue focus:outline-none focus:ring-2 focus:ring-blue-100"
              onChange={(event) => setAcademicYearFilter(event.target.value)}
              value={academicYear}
            >
              <option value="all">All Years</option>
              {academicYears.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-slate-600">Showing {schemes.length} of {total} scheme{total === 1 ? '' : 's'}</p>
        {(search || category !== 'all' || academicYear !== 'all' || departmentId !== 'all') ? (
          <Button className="min-h-11 text-xs font-semibold text-gov-blue underline underline-offset-2" type="button" onClick={clearView}>
            Clear filters
          </Button>
        ) : null}
      </div>

      {filteredSchemes.length ? (
        <>
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Scheme results">
            {filteredSchemes.map((scheme) => (
              <ApplicantSchemeCard key={scheme.id} scheme={scheme} />
            ))}
          </section>

          {pageCount > 1 ? (
            <nav aria-label="Schemes pagination" className="mt-4 flex items-center justify-center gap-1">
              {page > 1 ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePageChange(page - 1)}
                  aria-label="Previous page"
                >
                  Previous
                </Button>
              ) : null}
              {Array.from({ length: Math.min(pageCount, 5) }, (_, i) => {
                let pageNum: number;
                if (pageCount <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= pageCount - 2) {
                  pageNum = pageCount - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    size="sm"
                    variant={pageNum === page ? 'primary' : 'outline'}
                    onClick={() => handlePageChange(pageNum)}
                    aria-label={`Page ${pageNum}`}
                    aria-current={pageNum === page ? 'page' : undefined}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              {page < pageCount ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePageChange(page + 1)}
                  aria-label="Next page"
                >
                  Next
                </Button>
              ) : null}
            </nav>
          ) : null}
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <h2 className="text-lg font-bold text-gov-blue-dark">No schemes found</h2>
          <p className="mt-2 text-sm text-slate-600">Try a different search term or clear the filters.</p>
        </div>
      )}
    </div>
  );
}