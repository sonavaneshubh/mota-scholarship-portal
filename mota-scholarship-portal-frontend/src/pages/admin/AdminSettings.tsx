import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/useAdminAuth';
import { ROUTES } from '../../lib/constants';
import { AdminIcon } from '../../components/admin/AdminIcon';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

export function AdminSettings() {
  const { session, signOut, user } = useAdminAuth();
  const navigate = useNavigate();
  const [profileName, setProfileName] = useState(user?.name ?? '');
  const [profileEmail, setProfileEmail] = useState(user?.email ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [emailApplications, setEmailApplications] = useState(true);
  const [emailDocuments, setEmailDocuments] = useState(true);
  const [emailPayments, setEmailPayments] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('30 minutes');
  const [notice, setNotice] = useState('');

  function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice('Profile changes saved for this demo session. Production profile updates require the identity service.');
  }

  function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Complete all password fields.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setNotice('Password change submitted for demo verification. No production password was changed.');
  }

  function handleLogout() {
    signOut();
    navigate(ROUTES.admin.login, { replace: true });
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader description="Manage your administrator profile, security preferences and portal configuration." eyebrow="Account and portal" title="Admin settings" />

      {notice ? <div aria-live="polite" className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</div> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-5" accentClass="">
          <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-gov-blue"><AdminIcon className="h-5 w-5" name="user" /></span><div><h2 className="text-lg font-bold text-gov-blue-dark">Admin profile</h2><p className="text-xs text-slate-500">Your authorised account details</p></div></div>
          <form className="mt-5 space-y-4" onSubmit={handleProfileSubmit}><div><label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="settings-name">Name</label><input className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="settings-name" value={profileName} onChange={(event) => setProfileName(event.target.value)} /></div><div><label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="settings-email">Email</label><input className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="settings-email" type="email" value={profileEmail} onChange={(event) => setProfileEmail(event.target.value)} /></div><div className="grid gap-4 sm:grid-cols-2"><div><p className="text-xs font-semibold text-slate-500">Admin ID</p><p className="mt-1 text-sm font-semibold text-slate-800">{user?.adminId}</p></div><div><p className="text-xs font-semibold text-slate-500">Role</p><p className="mt-1 text-sm font-semibold text-slate-800">{user?.role}</p></div></div><Button size="md" type="submit" variant="primary">Save profile</Button></form>
        </Card>

        <Card className="p-5" accentClass="">
          <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-50 text-amber-700"><AdminIcon className="h-5 w-5" name="lock" /></span><div><h2 className="text-lg font-bold text-gov-blue-dark">Change password</h2><p className="text-xs text-slate-500">Update your administrator credentials</p></div></div>
          <form className="mt-5 space-y-4" onSubmit={handlePasswordSubmit}><div><label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="current-password">Current password</label><input className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="current-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></div><div><label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="new-password">New password</label><input className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="new-password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></div><div><label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="confirm-password">Confirm new password</label><input className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="confirm-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></div>{passwordError ? <p className="text-xs font-semibold text-red-600">{passwordError}</p> : null}<Button size="md" type="submit" variant="primary">Change password</Button></form>
        </Card>

        <Card className="p-5" accentClass="">
          <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-purple-50 text-purple-700"><AdminIcon className="h-5 w-5" name="notifications" /></span><div><h2 className="text-lg font-bold text-gov-blue-dark">Notification preferences</h2><p className="text-xs text-slate-500">Choose operational email alerts</p></div></div>
          <div className="mt-5 space-y-3"><label className="flex items-center justify-between gap-4 rounded-md border border-slate-100 p-3 text-sm text-slate-700"><span><span className="block font-semibold">New application alerts</span><span className="mt-1 block text-xs text-slate-500">Receive a summary when applications arrive.</span></span><input checked={emailApplications} className="h-4 w-4 rounded border-slate-300 text-gov-blue focus:ring-gov-blue" type="checkbox" onChange={(event) => setEmailApplications(event.target.checked)} /></label><label className="flex items-center justify-between gap-4 rounded-md border border-slate-100 p-3 text-sm text-slate-700"><span><span className="block font-semibold">Document queue alerts</span><span className="mt-1 block text-xs text-slate-500">Receive reminders for pending verification.</span></span><input checked={emailDocuments} className="h-4 w-4 rounded border-slate-300 text-gov-blue focus:ring-gov-blue" type="checkbox" onChange={(event) => setEmailDocuments(event.target.checked)} /></label><label className="flex items-center justify-between gap-4 rounded-md border border-slate-100 p-3 text-sm text-slate-700"><span><span className="block font-semibold">Payment updates</span><span className="mt-1 block text-xs text-slate-500">Receive completed disbursement summaries.</span></span><input checked={emailPayments} className="h-4 w-4 rounded border-slate-300 text-gov-blue focus:ring-gov-blue" type="checkbox" onChange={(event) => setEmailPayments(event.target.checked)} /></label></div><Button className="mt-5" size="md" variant="outline" onClick={() => setNotice('Notification preferences saved for this demo session.')}>Save preferences</Button>
        </Card>

        <Card className="p-5" accentClass="">
          <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-50 text-emerald-700"><AdminIcon className="h-5 w-5" name="settings" /></span><div><h2 className="text-lg font-bold text-gov-blue-dark">Portal settings</h2><p className="text-xs text-slate-500">Configuration for this workspace</p></div></div>
          <div className="mt-5 space-y-4"><label className="flex items-center justify-between gap-4 rounded-md border border-slate-100 p-3 text-sm text-slate-700"><span><span className="block font-semibold">Maintenance mode</span><span className="mt-1 block text-xs text-slate-500">Temporarily restrict applicant access.</span></span><input checked={maintenanceMode} className="h-4 w-4 rounded border-slate-300 text-gov-blue focus:ring-gov-blue" type="checkbox" onChange={(event) => setMaintenanceMode(event.target.checked)} /></label><div><label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="session-timeout">Automatic session timeout</label><select className="mt-1.5 min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-gov-blue focus:ring-2 focus:ring-blue-100" id="session-timeout" value={sessionTimeout} onChange={(event) => setSessionTimeout(event.target.value)}><option>15 minutes</option><option>30 minutes</option><option>1 hour</option><option>4 hours</option></select></div></div><Button className="mt-5" size="md" variant="outline" onClick={() => setNotice('Portal settings saved for this demo session.')}>Save portal settings</Button>
        </Card>
      </div>

      <Card className="p-5" accentClass="">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-red-50 text-red-700"><AdminIcon className="h-5 w-5" name="logout" /></span><div><h2 className="text-lg font-bold text-gov-blue-dark">Session and logout</h2><p className="mt-1 text-xs text-slate-500">Signed in as {session?.user.email} · Session storage is browser-local for this demo.</p></div></div><div className="flex flex-wrap gap-2"><Button size="md" variant="outline" onClick={() => setNotice('All other sessions were signed out in the demo model.')}>Sign out other sessions</Button><Button size="md" variant="outline" onClick={handleLogout}><AdminIcon className="h-4 w-4" name="logout" /> Logout</Button></div></div>
      </Card>
    </div>
  );
}
