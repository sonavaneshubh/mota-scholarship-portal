import { useCallback, useRef, useState } from 'react';
import { useApplicantApplications } from '../hooks/useApplicantRecords';
import { deleteDraftApplication } from '../services/applicantRecords';
import type { ApplicantApplication } from '../types';
import { ApplicantPageHeader } from '../components/applicant/ApplicantPageHeader';
import { ApplicationTable } from '../components/applicant/ApplicationTable';
import { ConfirmDialog } from '../components/applicant/ConfirmDialog';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ROUTES } from '../lib/constants';

type Notice =
  | { tone: 'success'; text: string }
  | { tone: 'error'; text: string };

export function ApplicantApplicationsPage() {
  const { items, status, error, reload } = useApplicantApplications();
  const [pendingDelete, setPendingDelete] = useState<ApplicantApplication | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  // The confirm dialog is the only thing that moves focus on this page, and it is
  // unmounted on cancel, so focus would otherwise be left on a button that no
  // longer exists. Sending it back to the page heading keeps keyboard users
  // oriented instead of dropped at the top of the document.
  const headingRef = useRef<HTMLHeadingElement>(null);

  const closeDialog = useCallback(() => {
    if (deletingId) return;
    setPendingDelete(null);
    // The dialog unmounts on close, taking the focused element with it, which
    // would silently drop keyboard focus onto <body>. Returning it to the list
    // heading keeps the applicant where they were.
    headingRef.current?.focus();
  }, [deletingId]);

  const confirmDelete = useCallback(async () => {
    const target = pendingDelete;
    if (!target?.id || deletingId) return;

    setDeletingId(target.id);
    setNotice(null);

    const result = await deleteDraftApplication(target.id);

    setDeletingId(null);
    setPendingDelete(null);

    if (!result.ok) {
      setNotice({ tone: 'error', text: result.message });
      return;
    }

    // A delete that RLS filtered out reports success with nothing removed. Saying
    // so is the whole point of checking `deleted` — otherwise the applicant is
    // told their draft is gone while it is still sitting in the list.
    if (!result.deleted) {
      setNotice({
        tone: 'error',
        text: 'Only a draft application can be deleted. Submitted applications are kept on record and cannot be removed here.',
      });
      reload();
      return;
    }

    setNotice({
      tone: 'success',
      text: `Your draft application for ${target.schemeName} was deleted. Your uploaded documents are still in your document library.`,
    });
    reload();
  }, [pendingDelete, deletingId, reload]);

  // Opening a new dialog clears the previous result. Done here rather than in an
  // effect on `status`: reload() flips the hook to 'loading', so an effect keyed
  // on status would wipe the success message the reload was supposed to confirm.
  const openDeleteDialog = useCallback((application: ApplicantApplication) => {
    setNotice(null);
    setPendingDelete(application);
  }, []);

  // Split out because the difference decides what the applicant can do next: a
  // draft can be continued or deleted, a submitted one can only be watched.
  const draftCount = items.filter((application) => application.status === 'draft').length;

  return (
    <div className="space-y-6 py-2 sm:py-4">
      <ApplicantPageHeader
        action={<Button size="md" to={ROUTES.applicant.schemes} variant="primary">Explore schemes</Button>}
        description="Start a new application, keep track of the ones you have submitted, and remove drafts you no longer want."
        eyebrow="Applicant workspace"
        title="My applications"
      />

      {notice ? (
        <div
          aria-live="polite"
          className={`rounded border px-4 py-3 text-sm ${
            notice.tone === 'success'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
              : 'border-red-300 bg-red-50 text-red-900'
          }`}
          role="status"
        >
          {notice.text}
        </div>
      ) : null}

      <Card className="min-w-0 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            {/* This card lists drafts alongside submitted applications, so the
                heading named only the latter while the list underneath showed
                both. The count splits them because the difference decides what
                the applicant can do next: a draft can be continued or deleted, a
                submitted one can only be watched. */}
            <h2
              className="text-lg font-bold text-gov-blue-dark outline-none"
              ref={headingRef}
              tabIndex={-1}
            >
              Your applications
            </h2>
            {status === 'ready' ? (
              <p className="mt-1 text-sm text-slate-600">
                {items.length} application{items.length === 1 ? '' : 's'} on record
                {draftCount > 0
                  ? ` — ${draftCount} draft${draftCount === 1 ? '' : 's'} you can still edit or delete`
                  : ''}
              </p>
            ) : null}
          </div>
          <Button size="sm" to={ROUTES.applicant.history} variant="outline">View history</Button>
        </div>

        {status === 'loading' ? (
          <div aria-busy="true" className="space-y-2 p-5" role="status">
            {Array.from({ length: 3 }, (_, index) => (
              <div className="h-10 animate-pulse rounded bg-slate-100" key={index} />
            ))}
            <span className="sr-only">Loading your applications</span>
          </div>
        ) : null}

        {status === 'error' ? (
          <div className="px-5 py-8 text-center">
            <h3 className="text-base font-bold text-gov-blue-dark">Applications could not be loaded</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
              {error ?? 'Please try again later.'}
            </p>
          </div>
        ) : null}

        {status === 'unavailable' ? (
          <div className="px-5 py-10 text-center">
            <h3 className="text-lg font-bold text-gov-blue-dark">No applications yet</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
              You have not applied for anything yet. Browse the published schemes to find one you are
              eligible for.
            </p>
            <Button className="mt-5 rounded" size="md" to={ROUTES.applicant.schemes} variant="primary">
              Explore schemes
            </Button>
          </div>
        ) : null}

        {status === 'ready' && items.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <h3 className="text-lg font-bold text-gov-blue-dark">No applications yet</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
              You have not applied for anything yet. Browse the published schemes to find one you are
              eligible for.
            </p>
            <Button className="mt-5 rounded" size="md" to={ROUTES.applicant.schemes} variant="primary">
              Explore schemes
            </Button>
          </div>
        ) : null}

        {status === 'ready' && items.length > 0 ? (
          <ApplicationTable
            applications={items}
            caption="Your scholarship and fellowship applications, including drafts"
            deletingId={deletingId}
            onDeleteDraft={openDeleteDialog}
          />
        ) : null}
      </Card>

      <ConfirmDialog
        busy={deletingId !== null}
        cancelLabel="Keep draft"
        confirmLabel="Delete draft"
        onCancel={closeDialog}
        onConfirm={() => void confirmDelete()}
        open={pendingDelete !== null}
        title="Delete this draft application?"
      >
        <p>
          This permanently deletes your draft application for{' '}
          <span className="font-semibold text-slate-900">{pendingDelete?.schemeName}</span>
          {pendingDelete?.referenceNumber ? (
            <> (reference <span className="font-semibold">{pendingDelete.referenceNumber}</span>)</>
          ) : null}
          . This cannot be undone.
        </p>
        <p>
          Any documents you uploaded stay in your document library, so you would not need to
          upload them again if you apply later.
        </p>
        {pendingDelete && pendingDelete.status !== 'draft' ? (
          <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900">
            This application is not a draft, so the portal will not delete it.
          </p>
        ) : null}
      </ConfirmDialog>
    </div>
  );
}
