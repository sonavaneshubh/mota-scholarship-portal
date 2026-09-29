/**
 * The "Delete draft" control for a single application, shared by the application
 * form and its Stage 1 view.
 *
 * Both places needed the same three things — a draft-only guard, a confirmation,
 * and a redirect once the row is gone — so they live here rather than being
 * written twice. The button renders nothing for a non-draft application, which is
 * also enforced by the database; this keeps the affordance and the permission in
 * agreement instead of offering a control that fails when pressed.
 *
 * After a successful delete it returns the applicant to My Applications, because
 * the page they are on is the thing that was deleted: leaving them on a dead URL
 * would render "Application not found" for a deletion they just asked for, which
 * reads like a failure rather than a success.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteDraftApplication } from '../../services/applicantRecords';
import { ROUTES } from '../../lib/constants';
import { Button } from '../ui/Button';
import { ConfirmDialog } from './ConfirmDialog';

interface DeleteDraftApplicationButtonProps {
  applicationId: string;
  schemeName: string;
  referenceNumber?: string | null;
  /** Status straight from the applications table, in the snake_case the database
   *  uses. Comparing the raw value rather than the UI status keeps the check in
   *  step with the `status = 'draft'` predicate the delete policy enforces. */
  status: string;
  onDeleted?: () => void;
}

export function DeleteDraftApplicationButton({
  applicationId,
  schemeName,
  referenceNumber,
  status,
  onDeleted,
}: DeleteDraftApplicationButtonProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status !== 'draft') return null;

  async function confirmDelete() {
    setBusy(true);
    setError(null);

    const result = await deleteDraftApplication(applicationId);

    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    if (!result.deleted) {
      setError(
        'Only a draft application can be deleted. Submitted applications are kept on record and cannot be removed here.',
      );
      return;
    }

    setOpen(false);
    onDeleted?.();
    navigate(ROUTES.applicant.applications, { replace: true });
  }

  return (
    <>
      <Button
        className="text-red-700 hover:border-red-300 hover:bg-red-50"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        size="md"
        type="button"
        variant="outline"
      >
        Delete draft
      </Button>

      <ConfirmDialog
        busy={busy}
        cancelLabel="Keep draft"
        confirmLabel="Delete draft"
        onCancel={() => setOpen(false)}
        onConfirm={() => void confirmDelete()}
        open={open}
        title="Delete this draft application?"
      >
        <p>
          This permanently deletes your draft application for{' '}
          <span className="font-semibold text-slate-900">{schemeName}</span>
          {referenceNumber ? (
            <> (reference <span className="font-semibold">{referenceNumber}</span>)</>
          ) : null}
          . This cannot be undone.
        </p>
        <p>
          Any documents you uploaded stay in your document library, so you would not need to upload them
          again if you apply later.
        </p>
        {error ? (
          <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-red-900" role="alert">
            {error}
          </p>
        ) : null}
      </ConfirmDialog>
    </>
  );
}
