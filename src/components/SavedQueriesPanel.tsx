import { useCallback, useEffect, useState } from 'react';
import { Loader2, Pencil, Save, Trash2 } from 'lucide-react';
import { useAuth } from '../context/authContext.shared';
import type { SavedQuery } from '../utils/savedQueriesApi';
import {
  createSavedQuery,
  deleteSavedQuery,
  fetchSavedQueries,
  updateSavedQuery,
} from '../utils/savedQueriesApi';

type SavedQueriesPanelProps = {
  onRestore: (query: SavedQuery) => void;
  onSignInRequired?: () => void;
  refreshNonce?: number;
};

function formatRelativeTime(iso: string): string {
  const deltaMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(deltaMs / 60_000);
  if (minutes < 1) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 48) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function SavedQueriesPanel({
  onRestore,
  onSignInRequired,
  refreshNonce = 0,
}: SavedQueriesPanelProps) {
  const { user } = useAuth();
  const [queries, setQueries] = useState<SavedQuery[]>([]);
  const [limit, setLimit] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const loadQueries = useCallback(async () => {
    if (!user) {
      setQueries([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchSavedQueries();
      setQueries(response.queries);
      setLimit(response.limit);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load saved queries');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadQueries();
  }, [loadQueries, refreshNonce]);

  const handleDelete = async (id: string) => {
    try {
      await deleteSavedQuery(id);
      setQueries((previous) => previous.filter((query) => query.id !== id));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Delete failed');
    }
  };

  const commitRename = async (query: SavedQuery) => {
    const nextTitle = editTitle.trim() || query.title;
    setEditingId(null);
    if (nextTitle === query.title) {
      return;
    }

    try {
      const updated = await updateSavedQuery(query.id, { title: nextTitle });
      setQueries((previous) =>
        previous.map((entry) => (entry.id === updated.id ? updated : entry)),
      );
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : 'Rename failed');
    }
  };

  if (!user) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
        <Save className="h-8 w-8 text-slate-500" aria-hidden />
        <p className="mt-3 text-sm font-medium text-slate-300">Sign in to save queries</p>
        <p className="mt-1 max-w-sm text-xs text-slate-500">
          Saved queries store your SQL, table selection, and sandbox settings in the cloud.
        </p>
        {onSignInRequired ? (
          <button
            type="button"
            onClick={onSignInRequired}
            className="mt-4 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500"
          >
            Sign in
          </button>
        ) : null}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      </div>
    );
  }

  if (queries.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
        <Save className="h-8 w-8 text-slate-500" aria-hidden />
        <p className="mt-3 text-sm font-medium text-slate-300">No saved queries yet</p>
        <p className="mt-1 max-w-sm text-xs text-slate-500">
          Use Save query in the toolbar to store your current sandbox (up to {limit}).
        </p>
        {error ? <p className="mt-3 text-xs text-red-400">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-slate-800/80 px-4 py-3">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
          {queries.length} of {limit} saved
        </p>
      </div>
      {error ? (
        <p className="shrink-0 border-b border-red-900/40 bg-red-950/30 px-4 py-2 text-xs text-red-300">
          {error}
        </p>
      ) : null}
      <ul className="scrollbar-sql-editor min-h-0 flex-1 overflow-y-auto">
        {queries.map((query) => (
          <li
            key={query.id}
            className="border-b border-slate-800/50 px-4 py-3 hover:bg-slate-900/50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                {editingId === query.id ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(event) => setEditTitle(event.target.value)}
                    onBlur={() => void commitRename(query)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        void commitRename(query);
                      }
                      if (event.key === 'Escape') {
                        setEditingId(null);
                      }
                    }}
                    className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 font-mono text-sm text-slate-100"
                    autoFocus
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => onRestore(query)}
                    className="text-left"
                  >
                    <span className="font-mono text-sm font-semibold text-slate-100 hover:text-sky-300">
                      {query.title}
                    </span>
                  </button>
                )}
                <p className="mt-1 text-[10px] text-slate-500">
                  {query.tableSelection.length} table{query.tableSelection.length === 1 ? '' : 's'}{' '}
                  · {formatRelativeTime(query.updatedAt)}
                </p>
                <p className="mt-1 line-clamp-2 font-mono text-[10px] text-slate-400">
                  {query.sqlText.replace(/\s+/g, ' ').slice(0, 120)}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(query.id);
                    setEditTitle(query.title);
                  }}
                  className="rounded p-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-200"
                  aria-label={`Rename ${query.title}`}
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(query.id)}
                  className="rounded p-1.5 text-slate-500 hover:bg-red-950 hover:text-red-300"
                  aria-label={`Delete ${query.title}`}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export { createSavedQuery };
