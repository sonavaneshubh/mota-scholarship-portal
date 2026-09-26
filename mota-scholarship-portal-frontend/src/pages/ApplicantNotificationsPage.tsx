import { ApplicantPageHeader } from '../components/applicant/ApplicantPageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ROUTES } from '../lib/constants';

export function ApplicantNotificationsPage() {
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
          <span className="text-xs font-semibold text-slate-500">0 unread</span>
        </div>

        {/*
          There is no notifications table in the database, so there is nothing
          truthful to render here. Showing sample rows was worse than showing
          nothing: an applicant cannot tell a fabricated "officer scrutiny"
          message from a real one. When the table and its RLS policies are
          deployed, this empty state is replaced by the real feed.
        */}
        <div className="px-2 py-10 text-center">
          <h2 className="text-base font-bold text-gov-blue-dark">No notifications</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
            You have no notifications. Updates about your applications, document requests, and profile
            will appear here.
          </p>
          <Button className="mt-5 rounded" size="md" to={ROUTES.applicant.applications} variant="outline">
            View my applications
          </Button>
        </div>
      </Card>
    </div>
  );
}
