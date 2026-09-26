import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { AdminDialog } from '../../components/admin/AdminDialog';
import { AdminIcon } from '../../components/admin/AdminIcon';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

interface SchemeFormState {
  scheme_code: string;
  name: string;
  short_name: string;
  department_id: string;
  category_id: string;
  scheme_type: string;
  description: string;
  overview: string;
  application_mode: string;
  official_scheme_url: string;
  official_application_url: string;
  gr_url: string;
  academic_year: string;
  application_start_date: string;
  application_end_date: string;
  renewal_available: boolean;
  status: 'draft' | 'review' | 'published' | 'inactive';
  verification_status: 'pending_review' | 'verified' | 'rejected';
}

interface Scheme {
  id: string;
  scheme_code: string;
  name: string;
  short_name: string | null;
  department_id: string;
  category_id: string;
  scheme_type: string | null;
  description: string | null;
  overview: string | null;
  application_mode: string | null;
  official_scheme_url: string | null;
  official_application_url: string | null;
  gr_url: string | null;
  academic_year: string;
  application_start_date: string | null;
  application_end_date: string | null;
  renewal_available: boolean | null;
  status: 'draft' | 'review' | 'published' | 'inactive';
  verification_status: 'pending_review' | 'verified' | 'rejected';
  source_url: string;
  source_type: string | null;
  departments?: { id: string; name: string; code: string };
  scheme_categories?: { id: string; name: string };
}

const emptyForm: SchemeFormState = {
  scheme_code: '',
  name: '',
  short_name: '',
  department_id: '',
  category_id: '',
  scheme_type: '',
  description: '',
  overview: '',
  application_mode: '',
  official_scheme_url: '',
  official_application_url: '',
  gr_url: '',
  academic_year: '2025-26',
  application_start_date: '',
  application_end_date: '',
  renewal_available: false,
  status: 'draft',
  verification_status: 'pending_review',
};

function toForm(scheme: Scheme): SchemeFormState {
  return {
    scheme_code: scheme.scheme_code,
    name: scheme.name,
    short_name: scheme.short_name || '',
    department_id: scheme.department_id,
    category_id: scheme.category_id,
    scheme_type: scheme.scheme_type || '',
    description: scheme.description || '',
    overview: scheme.overview || '',
    application_mode: scheme.application_mode || '',
    official_scheme_url: scheme.official_scheme_url || '',
    official_application_url: scheme.official_application_url || '',
    gr_url: scheme.gr_url || '',
    academic_year: scheme.academic_year,
    application_start_date: scheme.application_start_date || '',
    application_end_date: scheme.application_end_date || '',
    renewal_available: scheme.renewal_available || false,
    status: scheme.status,
    verification_status: scheme.verification_status,
  };
}

export function ScholarshipSchemes() {
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [departments, setDepartments] = useState<Array<{id: string; name: string; code: string}>>([]);
  const [categories, setCategories] = useState<Array<{id: string; name: string}>>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SchemeFormState>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');
  const [statusScheme, setStatusScheme] = useState<Scheme | null>(null);

  async function loadData() {
    setLoading(true);
    try {
      const [schemesRes, deptsRes, catsRes] = await Promise.all([
        supabase!.from('schemes').select(`
          *,
          departments (id, name, code),
          scheme_categories (id, name)
        `).order('created_at', { ascending: false }),
        supabase!.from('departments').select('id, name, code').eq('is_active', true).order('name'),
        supabase!.from('scheme_categories').select('id, name').eq('is_active', true).order('name'),
      ]);

      if (schemesRes.error) throw schemesRes.error;
      if (deptsRes.error) throw deptsRes.error;
      if (catsRes.error) throw catsRes.error;

      setSchemes(schemesRes.data || []);
      setDepartments(deptsRes.data || []);
      setCategories(catsRes.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setDialogOpen(true);
  }

  function openEdit(scheme: Scheme) {
    setEditingId(scheme.id);
    setForm(toForm(scheme));
    setErrors({});
    setDialogOpen(true);
  }

  function closeForm() {
    setDialogOpen(false);
    setErrors({});
  }

  function updateField<Key extends keyof SchemeFormState>(key: Key, value: SchemeFormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validateForm() {
    const nextErrors: Record<string, string> = {};
    (Object.keys(form) as Array<keyof SchemeFormState>).forEach((key) => {
      if (key !== 'renewal_available' && key !== 'short_name' && key !== 'overview' && key !== 'application_mode' && key !== 'official_scheme_url' && key !== 'official_application_url' && key !== 'gr_url' && !String(form[key]).trim()) {
        nextErrors[key] = 'This field is required.';
      }
    });
    return nextErrors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateForm();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      if (editingId) {
        const { error } = await supabase!
          .from('schemes')
          .update({ ...form, updated_at: new Date().toISOString() })
          .eq('id', editingId);
        if (error) throw error;
        setNotice('Scholarship scheme updated successfully.');
      } else {
        const { error } = await supabase!
          .from('schemes')
          .insert(form);
        if (error) throw error;
        setNotice('Scholarship scheme created successfully.');
      }
      closeForm();
      loadData();
    } catch (error) {
      console.error('Failed to save scheme:', error);
      setErrors({ submit: 'Failed to save scheme. Please try again.' });
    }
  }

  function confirmStatusChange() {
    if (!statusScheme) return;
    const isPublished = statusScheme.status === 'published';
    const nextStatus = isPublished ? 'inactive' : 'published';
    const displayStatus = isPublished ? 'Inactive' : 'Active';
    
    supabase!
      .from('schemes')
      .update({ status: nextStatus })
      .eq('id', statusScheme.id)
      .then(({ error }) => {
        if (error) throw error;
        setNotice(`${statusScheme.name} is now ${displayStatus.toLowerCase()}.`);
        setStatusScheme(null);
        loadData();
      });
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-100 rounded w-1/2" />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-64 bg-slate-100 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        action={<Button size="md" variant="primary" onClick={openAdd}><AdminIcon className="h-4 w-4" name="plus" /> Add scheme</Button>}
        description="Configure and maintain scholarship schemes, eligibility rules, financial limits and application windows. All data is stored in the central database with version history."
        eyebrow="Scheme management"
        title="Scholarship schemes"
      />

      {notice ? <div aria-live="polite" className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {schemes.map((scheme) => (
          <Card className="flex h-full flex-col p-5" accentClass="" key={scheme.id}>
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-gov-blue"><AdminIcon className="h-5 w-5" name="scholarships" /></span>
              <StatusBadge status={scheme.status === 'published' ? 'Active' : scheme.status === 'draft' ? 'Draft' : scheme.status === 'review' ? 'Under Review' : 'Inactive'} />
            </div>
            <h2 className="mt-4 text-lg font-bold leading-snug text-gov-blue-dark">{scheme.name}</h2>
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">{scheme.description || scheme.overview || 'No description'}</p>
            <dl className="mt-5 grid grid-cols-2 gap-3 border-y border-slate-100 py-4 text-xs">
              <div><dt className="text-slate-500">Department</dt><dd className="mt-1 font-semibold text-slate-700">{scheme.departments?.name || 'Unknown'}</dd></div>
              <div><dt className="text-slate-500">Category</dt><dd className="mt-1 font-semibold text-slate-700">{scheme.scheme_categories?.name || 'Unknown'}</dd></div>
              <div><dt className="text-slate-500">Academic Year</dt><dd className="mt-1 font-semibold text-slate-700">{scheme.academic_year}</dd></div>
              <div><dt className="text-slate-500">Status</dt><dd className="mt-1 font-semibold text-slate-700 capitalize">{scheme.verification_status.replace('_', ' ')}</dd></div>
            </dl>
            <div className="mt-4 space-y-2 text-xs leading-relaxed text-slate-600">
              <p><span className="font-bold text-slate-700">Type:</span> {scheme.scheme_type || '—'}</p>
              <p><span className="font-bold text-slate-700">Code:</span> {scheme.scheme_code}</p>
            </div>
            <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              <Button size="sm" variant="outline" onClick={() => openEdit(scheme)}><AdminIcon className="h-4 w-4" name="edit" /> Edit</Button>
              <Button size="sm" variant="outline" onClick={() => setStatusScheme(scheme)}>{scheme.status === 'published' ? 'Deactivate' : 'Activate'}</Button>
            </div>
          </Card>
        ))}
      </div>

      {schemes.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <h2 className="text-lg font-bold text-gov-blue-dark">No schemes found</h2>
          <p className="mt-2 text-sm text-slate-600">Create your first scholarship scheme to get started.</p>
        </div>
      )}

      <div className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-relaxed text-blue-900">
        Scheme records are stored in the central database with full version history. 
        Use <strong>Verify</strong> to mark a scheme as verified from official sources, 
        then <strong>Publish</strong> to make it visible to applicants.
      </div>

      <AdminDialog description={editingId ? 'Update the scheme configuration, eligibility, benefits, and publishing window.' : 'Create a new scholarship or fellowship configuration for applicants.'} onClose={closeForm} open={dialogOpen} size="lg" title={editingId ? 'Edit scholarship scheme' : 'Add scholarship scheme'}>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="scheme-code">Scheme Code</label>
              <input className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="scheme-code" value={form.scheme_code} onChange={(event) => updateField('scheme_code', event.target.value)} />
              {errors.scheme_code ? <p className="mt-1 text-xs text-red-600">{errors.scheme_code}</p> : null}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="scheme-name">Scheme Name</label>
              <input className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="scheme-name" value={form.name} onChange={(event) => updateField('name', event.target.value)} />
              {errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name}</p> : null}
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="scheme-short_name">Short Name</label>
            <input className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="scheme-short_name" value={form.short_name} onChange={(event) => updateField('short_name', event.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="scheme-department_id">Department</label>
              <select className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="scheme-department_id" value={form.department_id} onChange={(event) => updateField('department_id', event.target.value)}>
                <option value="">Select Department</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
              </select>
              {errors.department_id ? <p className="mt-1 text-xs text-red-600">{errors.department_id}</p> : null}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="scheme-category_id">Category</label>
              <select className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="scheme-category_id" value={form.category_id} onChange={(event) => updateField('category_id', event.target.value)}>
                <option value="">Select Category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.category_id ? <p className="mt-1 text-xs text-red-600">{errors.category_id}</p> : null}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="scheme-scheme_type">Scheme Type</label>
              <input className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="scheme-scheme_type" value={form.scheme_type} onChange={(event) => updateField('scheme_type', event.target.value)} />
              {errors.scheme_type ? <p className="mt-1 text-xs text-red-600">{errors.scheme_type}</p> : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="scheme-academic_year">Academic Year</label>
              <input className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="scheme-academic_year" value={form.academic_year} onChange={(event) => updateField('academic_year', event.target.value)} />
              {errors.academic_year ? <p className="mt-1 text-xs text-red-600">{errors.academic_year}</p> : null}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="scheme-scheme_type">Scheme Type</label>
              <select className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="scheme-verification_status" value={form.verification_status} onChange={(event) => updateField('verification_status', event.target.value as any)}>
                <option value="pending_review">Pending Review</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="scheme-description">Description</label>
            <textarea className="mt-1.5 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="scheme-description" value={form.description} onChange={(event) => updateField('description', event.target.value)} />
            {errors.description ? <p className="mt-1 text-xs text-red-600">{errors.description}</p> : null}
          </div>
          
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="scheme-overview">Overview</label>
            <textarea className="mt-1.5 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="scheme-overview" value={form.overview} onChange={(event) => updateField('overview', event.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="scheme-application_mode">Application Mode</label>
              <select className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="scheme-application_mode" value={form.application_mode} onChange={(event) => updateField('application_mode', event.target.value)}>
                <option value="Online">Online</option>
                <option value="Offline">Offline</option>
                <option value="Both">Both</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="scheme-official_scheme_url">Official Scheme URL</label>
              <input className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="scheme-official_scheme_url" type="url" value={form.official_scheme_url} onChange={(event) => updateField('official_scheme_url', event.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="scheme-official_application_url">Official Application URL</label>
              <input className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="scheme-official_application_url" type="url" value={form.official_application_url} onChange={(event) => updateField('official_application_url', event.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="scheme-gr_url">GR URL</label>
              <input className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="scheme-gr_url" type="url" value={form.gr_url} onChange={(event) => updateField('gr_url', event.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="scheme-start">Start Date</label>
              <input className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="scheme-start" type="date" value={form.application_start_date} onChange={(event) => updateField('application_start_date', event.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="scheme-end">End Date</label>
              <input className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="scheme-end" type="date" value={form.application_end_date} onChange={(event) => updateField('application_end_date', event.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-gov-blue focus:ring-gov-blue" checked={form.renewal_available} onChange={(event) => updateField('renewal_available', event.target.checked)} />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Renewal Available</span>
              </label>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="scheme-status">Status</label>
              <select className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="scheme-status" value={form.status} onChange={(event) => updateField('status', event.target.value as any)}>
                <option value="draft">Draft</option>
                <option value="review">Under Review</option>
                <option value="published">Published</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="scheme-verification_status">Verification</label>
              <select className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="scheme-verification_status" value={form.verification_status} onChange={(event) => updateField('verification_status', event.target.value as any)}>
                <option value="pending_review">Pending Review</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <Button size="md" variant="outline" onClick={closeForm}>Cancel</Button>
            <Button size="md" type="submit" variant="primary">{editingId ? 'Save changes' : 'Create scheme'}</Button>
          </div>
        </form>
      </AdminDialog>

      <AdminDialog description={statusScheme ? `Change the publishing status for ${statusScheme.name}.` : undefined} onClose={() => setStatusScheme(null)} open={Boolean(statusScheme)} title={statusScheme?.status === 'published' ? 'Deactivate scheme' : 'Activate scheme'}>
        {statusScheme ? <div className="space-y-4"><p className="text-sm leading-relaxed text-slate-600">{statusScheme.status === 'published' ? 'Applicants will no longer be able to discover and apply to this scheme.' : 'Applicants will be able to discover and apply to this scheme after activation.'}</p><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button size="md" variant="outline" onClick={() => setStatusScheme(null)}>Cancel</Button><Button size="md" variant="primary" onClick={confirmStatusChange}>{statusScheme.status === 'published' ? 'Deactivate scheme' : 'Activate scheme'}</Button></div></div> : null}
      </AdminDialog>
    </div>
  );
}