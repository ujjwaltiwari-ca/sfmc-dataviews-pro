import { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Info } from 'lucide-react';

type TrackingQueryWarningDialogProps = {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  /** Shown when the host can enable the 30-day EventDate utility (SQL sandbox only). */
  onEnableDateFilter?: () => void;
};

export function TrackingQueryWarningDialog({
  isOpen,
  onCancel,
  onConfirm,
  confirmLabel,
  onEnableDateFilter,
}: TrackingQueryWarningDialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/20 dark:bg-slate-950/30"
        aria-label="Dismiss"
        onClick={onCancel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="relative w-full max-w-sm overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-lg dark:border-slate-700/60 dark:bg-slate-900"
      >
        <div className="flex gap-3 px-4 py-4">
          <span
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400"
            aria-hidden
          >
            <Info className="h-4 w-4" />
          </span>
          <div className="min-w-0 space-y-1.5">
            <h2 id={titleId} className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              No EventDate filter yet
            </h2>
            <p
              id={descriptionId}
              className="text-xs leading-relaxed text-slate-600 dark:text-slate-400"
            >
              Queries on tracking views such as <span className="font-mono">_Sent</span> or{' '}
              <span className="font-mono">_Click</span> can run slowly in high-volume accounts
              without a date lookback. Consider adding one before you run this in Query Studio.
            </p>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-4 py-3 sm:flex-row sm:justify-end dark:border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            Not now
          </button>
          {onEnableDateFilter ? (
            <button
              type="button"
              onClick={onEnableDateFilter}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs font-medium text-sky-700 transition-colors hover:bg-sky-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 dark:text-sky-300"
            >
              <Calendar className="h-3.5 w-3.5" aria-hidden />
              Add 30-day filter
            </button>
          ) : null}
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
