import { useState } from 'react';
import type { FormEvent } from 'react';
import { ADMIN_SCHEMES } from '../../data/adminMockData';
import type { AdminScheme } from '../../types/admin';
import { AdminDialog } from '../../components/admin/AdminDialog';
import { AdminIcon } from '../../components/admin/AdminIcon';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

interface SchemeFormState {
  name: string;
  description: string;
  eligibility: string;
  category: string;
  academicRequirements: string;
  incomeLimit: string;
  amount: string;
  startDate: string;
  endDate: string;
  status: 'Active' | 'Inactive';
}

type SchemeFormErrors = Partial<Record<keyof SchemeFormState, string>>;

const emptyForm: SchemeFormState = {
  name: '',
  description: '',
  eligibility: '',
  category: 'Scheduled Tribe',
  academicRequirements: '',
  incomeLimit: '',
  amount: '',
  startDate: '',
  endDate: '',
  status: 'Active',
};

function toForm(scheme: AdminScheme): SchemeFormState {
  return { ...scheme, amount: String(scheme.amount) };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
}

export function ScholarshipSchemes() {
  const [schemes, setSchemes] = useState<AdminScheme[]>(ADMIN_SCHEMES);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SchemeFormState>(emptyForm);
  const [errors, setErrors] = useState<SchemeFormErrors>({});
  const [statusScheme, setStatusScheme] = useState<AdminScheme | null>(null);
  const [notice, setNotice] = useState('');

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setDialogOpen(true);
  }

  function openEdit(scheme: AdminScheme) {
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
    const nextErrors: SchemeFormErrors = {};
    (Object.keys(form) as Array<keyof SchemeFormState>).forEach((key) => {
      if (key !== 'status' && !String(form[key]).trim()) {
        nextErrors[key] = 'This field is required.';
      }
    });
    if (!form.amount || Number(form.amount) <= 0) {
      nextErrors.amount = 'Enter an amount greater than zero.';
    }
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      nextErrors.endDate = 'End date must be on or after the start date.';
    }
    return nextErrors;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateForm();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const amount = Number(form.amount);
    if (editingId) {
      setSchemes((current) => current.map((scheme) => scheme.id === editingId ? { ...scheme, ...form, amount } : scheme));
      setNotice('Scholarship scheme updated successfully.');
    } else {
      const nextScheme: AdminScheme = {
        id: `scheme-${Date.now()}`,
        name: form.name.trim(),
        description: form.description.trim(),
        eligibility: form.eligibility.trim(),
        category: form.category.trim(),
        academicRequirements: form.academicRequirements.trim(),
        incomeLimit: form.incomeLimit.trim(),
        amount,
        startDate: form.startDate,
        endDate: form.endDate,
        status: form.status,
      };
      setSchemes((current) => [nextScheme, ...current]);
      setNotice('Scholarship scheme created successfully.');
    }
    closeForm();
  }

  function confirmStatusChange() {
    if (!statusScheme) return;
    const nextStatus = statusScheme.status === 'Active' ? 'Inactive' : 'Active';
    setSchemes((current) => current.map((scheme) => scheme.id === statusScheme.id ? { ...scheme, status: nextStatus } : scheme));
    setNotice(`${statusScheme.name} is now ${nextStatus.toLowerCase()}.`);
    setStatusScheme(null);
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        action={<Button size="md" variant="primary" onClick={openAdd}><AdminIcon className="h-4 w-4" name="plus" /> Add scheme</Button>}
        description="Configure and maintain scholarship schemes, eligibility rules, financial limits and application windows."
        eyebrow="Scheme management"
        title="Scholarship schemes"
      />

      {notice ? <div aria-live="polite" className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {schemes.map((scheme) => (
          <Card className="flex h-full flex-col p-5" accentClass="" key={scheme.id}>
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-gov-blue"><AdminIcon className="h-5 w-5" name="scholarships" /></span>
              <StatusBadge status={scheme.status} />
            </div>
            <h2 className="mt-4 text-lg font-bold leading-snug text-gov-blue-dark">{scheme.name}</h2>
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">{scheme.description}</p>
            <dl className="mt-5 grid grid-cols-2 gap-3 border-y border-slate-100 py-4 text-xs">
              <div><dt className="text-slate-500">Category</dt><dd className="mt-1 font-semibold text-slate-700">{scheme.category}</dd></div>
              <div><dt className="text-slate-500">Amount</dt><dd className="mt-1 font-semibold text-slate-700">₹{new Intl.NumberFormat('en-IN').format(scheme.amount)}</dd></div>
              <div><dt className="text-slate-500">Start date</dt><dd className="mt-1 font-semibold text-slate-700">{formatDate(scheme.startDate)}</dd></div>
              <div><dt className="text-slate-500">End date</dt><dd className="mt-1 font-semibold text-slate-700">{formatDate(scheme.endDate)}</dd></div>
            </dl>
            <div className="mt-4 space-y-2 text-xs leading-relaxed text-slate-600"><p><span className="font-bold text-slate-700">Eligibility:</span> {scheme.eligibility}</p><p><span className="font-bold text-slate-700">Academic requirement:</span> {scheme.academicRequirements}</p><p><span className="font-bold text-slate-700">Income limit:</span> {scheme.incomeLimit}</p></div>
            <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-100 pt-4"><Button size="sm" variant="outline" onClick={() => openEdit(scheme)}><AdminIcon className="h-4 w-4" name="edit" /> Edit</Button><Button size="sm" variant="outline" onClick={() => setStatusScheme(scheme)}>{scheme.status === 'Active' ? 'Deactivate' : 'Activate'}</Button></div>
          </Card>
        ))}
      </div>

      <div className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-relaxed text-blue-900">Scheme records are demo content. Production scheme creation and activation must be permission-controlled, versioned and recorded in an audit log.</div>

      <AdminDialog description={editingId ? 'Update the scheme configuration and publishing window.' : 'Create a new scholarship or fellowship configuration for applicants.'} onClose={closeForm} open={dialogOpen} size="lg" title={editingId ? 'Edit scholarship scheme' : 'Add scholarship scheme'}>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="scheme-name">Scheme name</label><input className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="scheme-name" value={form.name} onChange={(event) => updateField('name', event.target.value)} />{errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name}</p> : null}</div>
          <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="scheme-description">Description</label><textarea className="mt-1.5 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="scheme-description" value={form.description} onChange={(event) => updateField('description', event.target.value)} />{errors.description ? <p className="mt-1 text-xs text-red-600">{errors.description}</p> : null}</div>
          <div className="grid gap-4 sm:grid-cols-2"><div><label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="scheme-eligibility">Eligibility</label><textarea className="mt-1.5 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="scheme-eligibility" value={form.eligibility} onChange={(event) => updateField('eligibility', event.target.value)} />{errors.eligibility ? <p className="mt-1 text-xs text-red-600">{errors.eligibility}</p> : null}</div><div><label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="scheme-academic">Academic requirements</label><textarea className="mt-1.5 min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="scheme-academic" value={form.academicRequirements} onChange={(event) => updateField('academicRequirements', event.target.value)} />{errors.academicRequirements ? <p className="mt-1 text-xs text-red-600">{errors.academicRequirements}</p> : null}</div></div>
          <div className="grid gap-4 sm:grid-cols-3"><div><label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="scheme-category">Category</label><input className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="scheme-category" value={form.category} onChange={(event) => updateField('category', event.target.value)} />{errors.category ? <p className="mt-1 text-xs text-red-600">{errors.category}</p> : null}</div><div><label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="scheme-income">Income limit</label><input className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="scheme-income" value={form.incomeLimit} onChange={(event) => updateField('incomeLimit', event.target.value)} />{errors.incomeLimit ? <p className="mt-1 text-xs text-red-600">{errors.incomeLimit}</p> : null}</div><div><label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="scheme-amount">Amount (₹)</label><input className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="scheme-amount" min="1" type="number" value={form.amount} onChange={(event) => updateField('amount', event.target.value)} />{errors.amount ? <p className="mt-1 text-xs text-red-600">{errors.amount}</p> : null}</div></div>
          <div className="grid gap-4 sm:grid-cols-3"><div><label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="scheme-start">Start date</label><input className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="scheme-start" type="date" value={form.startDate} onChange={(event) => updateField('startDate', event.target.value)} />{errors.startDate ? <p className="mt-1 text-xs text-red-600">{errors.startDate}</p> : null}</div><div><label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="scheme-end">End date</label><input className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="scheme-end" type="date" value={form.endDate} onChange={(event) => updateField('endDate', event.target.value)} />{errors.endDate ? <p className="mt-1 text-xs text-red-600">{errors.endDate}</p> : null}</div><div><label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="scheme-status">Status</label><select className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="scheme-status" value={form.status} onChange={(event) => updateField('status', event.target.value as SchemeFormState['status'])}><option>Active</option><option>Inactive</option></select></div></div>
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end"><Button size="md" variant="outline" onClick={closeForm}>Cancel</Button><Button size="md" type="submit" variant="primary">{editingId ? 'Save changes' : 'Create scheme'}</Button></div>
        </form>
      </AdminDialog>

      <AdminDialog description={statusScheme ? `Change the publishing status for ${statusScheme.name}.` : undefined} onClose={() => setStatusScheme(null)} open={Boolean(statusScheme)} title={statusScheme?.status === 'Active' ? 'Deactivate scheme' : 'Activate scheme'}>
        {statusScheme ? <div className="space-y-4"><p className="text-sm leading-relaxed text-slate-600">{statusScheme.status === 'Active' ? 'Applicants will no longer be able to submit new applications to this scheme.' : 'Applicants will be able to discover and apply to this scheme after activation.'}</p><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button size="md" variant="outline" onClick={() => setStatusScheme(null)}>Cancel</Button><Button size="md" variant="primary" onClick={confirmStatusChange}>{statusScheme.status === 'Active' ? 'Deactivate scheme' : 'Activate scheme'}</Button></div></div> : null}
      </AdminDialog>
    </div>
  );
}
