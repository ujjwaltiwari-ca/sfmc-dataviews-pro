import { getSupabase } from './supabaseClient';
import type { BuContextMode } from '../constants/buContext';
import type { SandboxPreferences } from './workspacePersistence';
import type { ViewSegmentId } from '../data/viewSegments';

export type SavedQueryFilterState = {
  sandboxPreferences?: Partial<SandboxPreferences>;
  buContext?: BuContextMode;
};

export type SavedQuery = {
  id: string;
  title: string;
  sqlText: string;
  tableSelection: string[];
  segment: ViewSegmentId;
  filterState: SavedQueryFilterState | null;
  createdAt: string;
  updatedAt: string;
};

type SavedQueriesResponse = {
  queries: SavedQuery[];
  limit: number;
};

async function getAccessToken(): Promise<string | null> {
  const { data, error } = await getSupabase().auth.getSession();
  if (error) {
    return null;
  }
  return data.session?.access_token?.trim() ?? null;
}

async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('Sign in required to manage saved queries.');
  }

  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(init.headers ?? {}),
    },
  });

  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed (${response.status})`);
  }
  return payload;
}

export async function fetchSavedQueries(): Promise<SavedQueriesResponse> {
  return apiFetch<SavedQueriesResponse>('/api/saved-queries');
}

export async function createSavedQuery(input: {
  title: string;
  sqlText: string;
  tableSelection: string[];
  segment: ViewSegmentId;
  filterState: SavedQueryFilterState | null;
}): Promise<SavedQuery> {
  const payload = await apiFetch<{ query: SavedQuery }>('/api/saved-queries', {
    method: 'POST',
    body: JSON.stringify({
      title: input.title,
      sqlText: input.sqlText,
      tableSelection: input.tableSelection,
      segment: input.segment,
      filterState: input.filterState,
    }),
  });
  return payload.query;
}

export async function updateSavedQuery(
  id: string,
  patch: Partial<{
    title: string;
    sqlText: string;
    tableSelection: string[];
    segment: ViewSegmentId;
    filterState: SavedQueryFilterState | null;
  }>,
): Promise<SavedQuery> {
  const payload = await apiFetch<{ query: SavedQuery }>('/api/saved-queries', {
    method: 'PUT',
    body: JSON.stringify({ id, ...patch }),
  });
  return payload.query;
}

export async function deleteSavedQuery(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/api/saved-queries?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
