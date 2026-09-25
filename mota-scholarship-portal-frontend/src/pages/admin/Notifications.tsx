import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ADMIN_NOTIFICATIONS } from '../../data/adminMockData';
import type { AdminNotification } from '../../types/admin';
import { AdminIcon } from '../../components/admin/AdminIcon';
import type { AdminIconName } from '../../components/admin/AdminIcon';
import { AdminPageHeader } from '../../components/admin/AdminPageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

type NotificationFilter = 'All' | 'Unread' | 'Read';

const iconByType: Record<AdminNotification['type'], AdminIconName> = {
  application: 'applications',
  document: 'documents',
  payment: 'bank',
  scheme: 'scholarships',
  system: 'settings',
};

export function Notifications() {
  const [notifications, setNotifications] = useState<AdminNotification[]>(ADMIN_NOTIFICATIONS);
  const [filter, setFilter] = useState<NotificationFilter>('All');
  const [notice, setNotice] = useState('');

  const filteredNotifications = useMemo(() => notifications.filter((notification) => filter === 'All' || (filter === 'Unread' && !notification.read) || (filter === 'Read' && notification.read)), [filter, notifications]);
  const unreadCount = notifications.filter((notification) => !notification.read).length;

  function toggleRead(id: string) {
    setNotifications((current) => current.map((notification) => notification.id === id ? { ...notification, read: !notification.read } : notification));
  }

  function markAllRead() {
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
    setNotice('All notifications marked as read.');
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        action={<Button size="md" variant="outline" onClick={markAllRead}><AdminIcon className="h-4 w-4" name="check" /> Mark all read</Button>}
        description="Stay informed about new applications, document queues, scheme changes and payment processing activity."
        eyebrow="Attention centre"
        title="Notifications"
      />

      {notice ? <div aria-live="polite" className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</div> : null}

      <Card className="p-4 sm:p-5" accentClass="">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-slate-800">Notification centre</p><p className="mt-1 text-xs text-slate-500">{unreadCount} unread notification{unreadCount === 1 ? '' : 's'}</p></div><div className="flex flex-wrap gap-1 rounded-md bg-slate-100 p-1">{(['All', 'Unread', 'Read'] as NotificationFilter[]).map((item) => <button className={`rounded px-3 py-1.5 text-xs font-bold transition ${filter === item ? 'bg-white text-gov-blue shadow-sm' : 'text-slate-500 hover:text-slate-800'}`} key={item} type="button" onClick={() => setFilter(item)}>{item}{item === 'Unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}</button>)}</div></div>
      </Card>

      <Card className="overflow-hidden" accentClass="">
        <div className="divide-y divide-slate-100">
          {filteredNotifications.length === 0 ? <div className="p-12 text-center text-sm text-slate-500">No notifications match this filter.</div> : filteredNotifications.map((notification) => <div className={`flex gap-4 p-5 transition hover:bg-slate-50 ${notification.read ? '' : 'bg-blue-50/30'}`} key={notification.id}><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${notification.read ? 'bg-slate-100 text-slate-500' : 'bg-blue-100 text-gov-blue'}`}><AdminIcon className="h-5 w-5" name={iconByType[notification.type]} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className={`text-sm ${notification.read ? 'font-semibold text-slate-700' : 'font-bold text-slate-900'}`}>{notification.title}</h2><p className="mt-1 text-xs text-slate-500">{notification.timestamp}</p></div>{!notification.read ? <span className="rounded-full bg-gov-saffron px-2 py-0.5 text-[10px] font-bold text-white">New</span> : <span className="text-[10px] font-semibold text-slate-400">Read</span>}</div><p className="mt-3 text-sm leading-relaxed text-slate-600">{notification.message}</p><div className="mt-4 flex flex-wrap gap-2"><Link className="text-xs font-semibold text-gov-blue hover:text-gov-saffron-dark" to={notification.href}>Open related item <span aria-hidden="true">→</span></Link><button className="text-xs font-semibold text-slate-500 hover:text-gov-blue" type="button" onClick={() => toggleRead(notification.id)}>{notification.read ? 'Mark unread' : 'Mark read'}</button></div></div></div>)}
        </div>
      </Card>
    </div>
  );
}
