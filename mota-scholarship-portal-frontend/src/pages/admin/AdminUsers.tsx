import { useState } from 'react';
import type { FormEvent } from 'react';
import { ADMIN_USERS } from '../../data/adminMockData';
import type { AdminRole, AdminUser, AdminUserStatus } from '../../types/admin';
import { AdminDialog } from '../../components/admin/AdminDialog';
import { AdminIcon } from '../../components/admin/AdminIcon';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { StatusBadge } from '../../components/admin/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

interface UserFormState {
  adminId: string;
  name: string;
  email: string;
  role: AdminRole;
  status: AdminUserStatus;
}

type UserAction = 'toggle' | 'reset';
type UserFormErrors = Partial<Record<keyof UserFormState, string>>;

const emptyForm: UserFormState = { adminId: '', name: '', email: '', role: 'Verifier', status: 'Active' };
const roles: AdminRole[] = ['Super Admin', 'Admin', 'Verifier', 'Reviewer'];

function initialsFor(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || 'AD';
}

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>(ADMIN_USERS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [errors, setErrors] = useState<UserFormErrors>({});
  const [actionType, setActionType] = useState<UserAction | null>(null);
  const [actionUser, setActionUser] = useState<AdminUser | null>(null);
  const [notice, setNotice] = useState('');

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setDialogOpen(true);
  }

  function openEdit(user: AdminUser) {
    setEditingId(user.id);
    setForm({ adminId: user.adminId, name: user.name, email: user.email, role: user.role, status: user.status });
    setErrors({});
    setDialogOpen(true);
  }

  function updateField<Key extends keyof UserFormState>(key: Key, value: UserFormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: UserFormErrors = {};
    if (!form.adminId.trim()) nextErrors.adminId = 'Admin ID is required.';
    if (!form.name.trim()) nextErrors.name = 'Name is required.';
    if (!form.email.trim() || !form.email.includes('@')) nextErrors.email = 'Enter a valid email address.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (editingId) {
      setUsers((current) => current.map((user) => user.id === editingId ? { ...user, ...form, name: form.name.trim(), email: form.email.trim(), adminId: form.adminId.trim(), initials: initialsFor(form.name) } : user));
      setNotice('Admin user updated successfully.');
    } else {
      const newUser: AdminUser = {
        id: `admin-${Date.now()}`,
        adminId: form.adminId.trim().toUpperCase(),
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        status: form.status,
        lastLogin: 'Never',
        initials: initialsFor(form.name),
      };
      setUsers((current) => [newUser, ...current]);
      setNotice('Admin user added successfully.');
    }
    setDialogOpen(false);
  }

  function openAction(type: UserAction, user: AdminUser) {
    setActionType(type);
    setActionUser(user);
  }

  function confirmAction() {
    if (!actionType || !actionUser) return;
    if (actionType === 'toggle') {
      const nextStatus: AdminUserStatus = actionUser.status === 'Active' ? 'Inactive' : 'Active';
      setUsers((current) => current.map((user) => user.id === actionUser.id ? { ...user, status: nextStatus } : user));
      setNotice(`${actionUser.name} is now ${nextStatus.toLowerCase()}.`);
    } else {
      setNotice(`Password reset workflow recorded for ${actionUser.name}. Production reset will send a secure one-time link.`);
    }
    setActionType(null);
    setActionUser(null);
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        action={<Button size="md" variant="primary" onClick={openAdd}><AdminIcon className="h-4 w-4" name="plus" /> Add admin</Button>}
        description="Manage administrator access, roles and account status. Changes in this prototype are stored in the current browser session only."
        eyebrow="Access management"
        title="Admin users"
      />

      {notice ? <div aria-live="polite" className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</div> : null}

      <Card className="overflow-hidden" accentClass="">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4"><div><h2 className="text-lg font-bold text-gov-blue-dark">Authorised users</h2><p className="mt-1 text-xs text-slate-500">{users.filter((user) => user.status === 'Active').length} active account{users.filter((user) => user.status === 'Active').length === 1 ? '' : 's'} · role-based access control</p></div><AdminIcon className="h-5 w-5 text-slate-400" name="users" /></div>
        <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3 font-bold">Admin ID</th><th className="px-5 py-3 font-bold">Name</th><th className="px-5 py-3 font-bold">Email</th><th className="px-5 py-3 font-bold">Role</th><th className="px-5 py-3 font-bold">Status</th><th className="px-5 py-3 font-bold">Last login</th><th className="px-5 py-3 text-right font-bold">Action</th></tr></thead><tbody className="divide-y divide-slate-100">{users.map((user) => <tr className="hover:bg-slate-50" key={user.id}><td className="whitespace-nowrap px-5 py-4 text-xs font-bold text-gov-blue">{user.adminId}</td><td className="px-5 py-4"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-gov-blue">{user.initials}</span><span className="font-semibold text-slate-800">{user.name}</span></div></td><td className="px-5 py-4 text-xs text-slate-600">{user.email}</td><td className="px-5 py-4 text-xs font-semibold text-slate-700">{user.role}</td><td className="px-5 py-4"><StatusBadge status={user.status} /></td><td className="px-5 py-4 text-xs text-slate-500">{user.lastLogin}</td><td className="px-5 py-4"><div className="flex justify-end gap-1.5"><Button size="sm" variant="outline" onClick={() => openEdit(user)}>Edit</Button><Button size="sm" variant="outline" onClick={() => openAction('reset', user)}>Reset</Button><Button size="sm" variant="outline" onClick={() => openAction('toggle', user)}>{user.status === 'Active' ? 'Deactivate' : 'Activate'}</Button></div></td></tr>)}</tbody></table></div>
        <div className="divide-y divide-slate-100 md:hidden">{users.map((user) => <div className="p-4" key={user.id}><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-gov-blue">{user.initials}</span><div className="min-w-0"><p className="text-sm font-bold text-slate-800">{user.name}</p><p className="mt-1 text-xs text-slate-500">{user.adminId} · {user.email}</p></div></div><StatusBadge status={user.status} /></div><div className="mt-3 grid grid-cols-2 gap-3 border-y border-slate-100 py-3 text-xs"><div><p className="text-slate-500">Role</p><p className="mt-1 font-semibold text-slate-700">{user.role}</p></div><div><p className="text-slate-500">Last login</p><p className="mt-1 font-semibold text-slate-700">{user.lastLogin}</p></div></div><div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => openEdit(user)}>Edit</Button><Button size="sm" variant="outline" onClick={() => openAction('reset', user)}>Reset password</Button><Button size="sm" variant="outline" onClick={() => openAction('toggle', user)}>{user.status === 'Active' ? 'Deactivate' : 'Activate'}</Button></div></div>)}</div>
      </Card>

      <div className="rounded-md border border-amber-100 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900"><span className="font-bold">Security note:</span> Password reset, role changes and deactivation require a backend identity provider, MFA and an immutable audit trail in production.</div>

      <AdminDialog description={editingId ? 'Update account details and role assignment.' : 'Create a new authorised administrator account.'} onClose={() => setDialogOpen(false)} open={dialogOpen} title={editingId ? 'Edit admin user' : 'Add admin user'}>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2"><div><label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="user-admin-id">Admin ID</label><input className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="user-admin-id" value={form.adminId} onChange={(event) => updateField('adminId', event.target.value)} />{errors.adminId ? <p className="mt-1 text-xs text-red-600">{errors.adminId}</p> : null}</div><div><label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="user-name">Name</label><input className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="user-name" value={form.name} onChange={(event) => updateField('name', event.target.value)} />{errors.name ? <p className="mt-1 text-xs text-red-600">{errors.name}</p> : null}</div></div>
          <div><label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="user-email">Email</label><input className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="user-email" type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} />{errors.email ? <p className="mt-1 text-xs text-red-600">{errors.email}</p> : null}</div>
          <div className="grid gap-4 sm:grid-cols-2"><div><label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="user-role">Role</label><select className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="user-role" value={form.role} onChange={(event) => updateField('role', event.target.value as AdminRole)}>{roles.map((role) => <option key={role}>{role}</option>)}</select></div><div><label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="user-status">Status</label><select className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="user-status" value={form.status} onChange={(event) => updateField('status', event.target.value as AdminUserStatus)}><option>Active</option><option>Inactive</option></select></div></div>
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end"><Button size="md" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button size="md" type="submit" variant="primary">{editingId ? 'Save changes' : 'Create admin'}</Button></div>
        </form>
      </AdminDialog>

      <AdminDialog description={actionUser ? `${actionUser.name} · ${actionUser.adminId}` : undefined} onClose={() => { setActionType(null); setActionUser(null); }} open={Boolean(actionType && actionUser)} title={actionType === 'reset' ? 'Reset password' : actionUser?.status === 'Active' ? 'Deactivate admin' : 'Activate admin'}>
        {actionType && actionUser ? <div className="space-y-4"><p className="text-sm leading-relaxed text-slate-600">{actionType === 'reset' ? 'A secure password reset workflow will be available when the identity service is connected. No password is changed in this demo.' : actionUser.status === 'Active' ? 'This account will lose access immediately after the status change is saved.' : 'This account will regain access to the administration workspace.'}</p><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button size="md" variant="outline" onClick={() => { setActionType(null); setActionUser(null); }}>Cancel</Button><Button size="md" variant="primary" onClick={confirmAction}>{actionType === 'reset' ? 'Record reset request' : actionUser.status === 'Active' ? 'Deactivate account' : 'Activate account'}</Button></div></div> : null}
      </AdminDialog>
    </div>
  );
}
