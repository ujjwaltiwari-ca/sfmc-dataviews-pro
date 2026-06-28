import { RotateCcw, X } from 'lucide-react';

type SessionRestoredBannerProps = {
  tableCount: number;
  hasSql: boolean;
  onDismiss: () => void;
};

export function SessionRestoredBanner({
  tableCount,
  hasSql,
  onDismiss,
}: SessionRestoredBannerProps) {
  const parts: string[] = [];
  if (tableCount > 0) {
    parts.push(`${tableCount} table${tableCount === 1 ? '' : 's'}`);
  }
  if (hasSql) {
    parts.push('your last query');
  }

  const summary = parts.length > 0 ? parts.join(' and ') : 'your last workspace';

  return (
    <div
      className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-emerald-200/70 bg-emerald-50/90 px-3 py-2.5 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-100 sm:px-4"
      role="status"
    >
      <div className="flex min-w-0 items-center gap-2">
        <RotateCcw className="h-4 w-4 shrink-0" aria-hidden />
        <p className="min-w-0">
          Restored {summary} from your last session.
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded-md p-1 text-emerald-700 transition-colors hover:bg-emerald-100/80 dark:text-emerald-200 dark:hover:bg-emerald-900/50"
        aria-label="Dismiss restored session notice"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
