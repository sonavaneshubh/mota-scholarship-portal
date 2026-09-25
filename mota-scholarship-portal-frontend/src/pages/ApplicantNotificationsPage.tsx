import { APPLICANT_NOTIFICATIONS } from '../data/applicantData';
import { ApplicantPageHeader } from '../components/applicant/ApplicantPageHeader';
import { NotificationItem } from '../components/applicant/NotificationItem';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ROUTES } from '../lib/constants';

export function ApplicantNotificationsPage() {
  const unreadCount = APPLICANT_NOTIFICATIONS.filter((notification) => notification.unread).length;

  return (
    <div className="space-y-6 py-1 sm:py-2">
      <ApplicantPageHeader
        action={<Button size="md" to={ROUTES.applicant.dashboard} variant="outline">Back to dashboard</Button>}
        description="Stay informed about application activity, document requests, and profile reminders."
        eyebrow="Applicant workspace"
        title="Notifications"
      />
      <Card className="p-4 sm:p-5" accentClass="">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-slate-800">Recent updates</p>
          <span className="text-xs font-semibold text-slate-500">{unreadCount} unread</span>
        </div>
        <div aria-label="Notification list">
          {APPLICANT_NOTIFICATIONS.map((notification) => <NotificationItem key={notification.id} notification={notification} />)}
        </div>
      </Card>
    </div>
  );
}
