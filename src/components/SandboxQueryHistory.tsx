import { useCallback, useEffect, useState } from 'react';
import { Clock, RotateCcw, Trash2 } from 'lucide-react';
import {
  deleteSandboxQuerySnapshot,
  formatHistoryPreview,
  formatHistoryTimestamp,
  readSandboxQueryHistory,
  type SandboxQuerySnapshot,
} from '../utils/sandboxQueryHistory';

type SandboxQueryHistoryProps = {
  onRestore: (snapshot: SandboxQuerySnapshot) => void;
  refreshNonce?: number;
};

export function SandboxQueryHistory({ onRestore, refreshNonce = 0 }: SandboxQueryHistoryProps) {
  const [entries, setEntries] = useState<SandboxQuerySnapshot[]>(() => readSandboxQueryHistory());
  const [previewId, setPreviewId] = useState<string | null>(null);

  const reload = useCallback(() => {
    setEntries(readSandboxQueryHistory());
  }, []);

  useEffect(() => {
    reload();
  }, [reload, refreshNonce]);

  const previewEntry = entries.find((entry) => entry.id === previewId) ?? null;

  const handleDelete = (id: string) => {
    deleteSandboxQuerySnapshot(id);
    if (previewId === id) {
      setPreviewId(null);
    }
    reload();
  };

  if (entries.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
        <Clock className="h-8 w-8 text-slate-500" aria-hidden />
        <p className="mt-3 text-sm font-medium text-slate-300">No query history yet</p>
        <p className="mt-1 max-w-sm text-xs text-slate-500">
          Snapshots are saved automatically when you pause editing in the Live Query tab.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-slate-800/80 px-4 py-3">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
          {entries.length} saved snapshot{entries.length === 1 ? '' : 's'}
        </p>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-0 overflow-hidden lg:grid-cols-2">
        <ul className="scrollbar-sql-editor min-h-0 overflow-y-auto border-b border-slate-800/80 lg:border-b-0 lg:border-r">
          {entries.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => setPreviewId(entry.id)}
                className={`flex w-full flex-col gap-1 border-b border-slate-800/50 px-4 py-3 text-left transition-colors hover:bg-slate-900/60 ${
                  previewId === entry.id ? 'bg-slate-900/80' : ''
                }`}
              >
                <span className="text-[10px] font-medium text-slate-500">
                  {formatHistoryTimestamp(entry.timestamp)}
                </span>
                <span className="font-mono text-xs text-slate-300">
                  {formatHistoryPreview(entry.sql)}
                </span>
                <span className="text-[10px] text-slate-500">
                  {entry.tableNames.length > 0
                    ? entry.tableNames.join(', ')
                    : 'No tables recorded'}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="flex min-h-0 flex-col">
          {previewEntry ? (
            <>
              <pre className="scrollbar-sql-editor min-h-0 flex-1 overflow-auto p-4 font-mono text-[11px] leading-relaxed text-slate-300">
                {previewEntry.sql}
              </pre>
              <div className="flex shrink-0 gap-2 border-t border-slate-800/80 p-3">
                <button
                  type="button"
                  onClick={() => onRestore(previewEntry)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-sky-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-sky-500"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                  Restore this version
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(previewEntry.id)}
                  className="inline-flex items-center justify-center rounded-md border border-slate-700 px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:border-red-500/50 hover:text-red-300"
                  aria-label="Delete snapshot"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center px-4 text-xs text-slate-500">
              Select a snapshot to preview
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
