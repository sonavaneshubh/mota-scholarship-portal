/**
 * A confirmation dialog for actions the applicant cannot undo.
 *
 * Built for the applicant side rather than reusing AdminDialog: that one carries
 * admin-specific ids, styling and copy, and a dialog that asks a scholarship
 * applicant to confirm deleting their own work should not look like an officer's
 * tool. It exists because the alternative already in the codebase,
 * `window.confirm`, cannot be styled, cannot be translated, and — the reason it
 * matters here — is suppressed entirely by some in-app browsers, which would
 * leave a destructive action with no confirmation step at all.
 *
 * The confirm button is deliberately not the dialog's default action: it is not
 * `type="submit"`, Enter does not activate it, and focus goes to Cancel. A dialog
 * that deletes a draft on Enter is a dialog that deletes a draft by accident.
 */

import { useEffect } from 'react';
import { Button } from '../ui/Button';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'danger',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Escape cancels.
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) onCancel();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4">
      <div
        aria-labelledby="confirm-dialog-title"
        aria-modal="true"
        className="w-full max-w-md rounded-t-lg bg-white p-5 shadow-xl sm:rounded-lg"
        role="dialog"
      >
        <h2 className="text-lg font-bold text-gov-blue-dark" id="confirm-dialog-title">
          {title}
        </h2>
        <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-700">{children}</div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            autoFocus
            disabled={busy}
            onClick={onCancel}
            size="md"
            variant="outline"
          >
            {cancelLabel}
          </Button>
          <Button
            disabled={busy}
            onClick={onConfirm}
            size="md"
            variant={tone === 'danger' ? 'danger' : 'primary'}
          >
            {busy ? 'Working…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
