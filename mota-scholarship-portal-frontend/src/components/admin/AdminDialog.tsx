import type { ReactNode } from 'react';
import { AdminIcon } from './AdminIcon';

interface AdminDialogProps {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses: Record<NonNullable<AdminDialogProps['size']>, string> = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
};

export function AdminDialog({ open, title, description, children, onClose, size = 'md' }: AdminDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      aria-labelledby="admin-dialog-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className={`max-h-[92vh] w-full overflow-y-auto rounded-t-xl border border-slate-200 bg-white shadow-xl sm:rounded-xl ${sizeClasses[size]}`}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-gov-blue-dark" id="admin-dialog-title">{title}</h2>
            {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
          </div>
          <button
            aria-label="Close dialog"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            type="button"
            onClick={onClose}
          >
            <AdminIcon className="h-5 w-5" name="close" />
          </button>
        </div>
        <div className="px-5 py-5 sm:px-6">{children}</div>
      </div>
    </div>
  );
}
