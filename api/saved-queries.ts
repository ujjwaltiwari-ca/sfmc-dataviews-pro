import type { ServerResponse } from 'node:http';
import { assertStagingUnlocked } from './lib/stagingCookieNode.js';
import {
  extractBearerToken,
  getSupabaseServerClient,
  readRequestBody,
  resolveAuthenticatedUser,
  sendJson,
  sendJsonError,
  type NodeApiRequest,
} from './lib/supabaseServer.js';

const MAX_SAVED_QUERIES = 10;
const MAX_TITLE_LENGTH = 120;
const MAX_SQL_LENGTH = 32_000;

type SavedQueryRow = {
  id: string;
  user_id: string;
  title: string;
  sql_text: string;
  table_selection: string[];
  segment: string;
  filter_state: unknown;
  created_at: string;
  updated_at: string;
};

type CreateBody = {
  title?: unknown;
  sqlText?: unknown;
  tableSelection?: unknown;
  segment?: unknown;
  filterState?: unknown;
};

type UpdateBody = CreateBody & {
  id?: unknown;
};

function normalizeTitle(raw: unknown): string {
  if (typeof raw !== 'string') {
    return 'Untitled Query';
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return 'Untitled Query';
  }
  return trimmed.slice(0, MAX_TITLE_LENGTH);
}

function normalizeSql(raw: unknown): string | null {
  if (typeof raw !== 'string') {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.slice(0, MAX_SQL_LENGTH);
}

function normalizeTableSelection(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'string') {
      continue;
    }
    const name = entry.trim();
    if (!name || seen.has(name)) {
      continue;
    }
    seen.add(name);
    result.push(name);
  }
  return result;
}

function normalizeSegment(raw: unknown): string {
  if (raw === 'sendlog' || raw === 'synchronized') {
    return raw;
  }
  return 'core';
}

function serializeRow(row: SavedQueryRow) {
  return {
    id: row.id,
    title: row.title,
    sqlText: row.sql_text,
    tableSelection: row.table_selection ?? [],
    segment: row.segment,
    filterState: row.filter_state ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function handleSavedQueriesRequest(
  req: NodeApiRequest,
  res: ServerResponse,
): Promise<void> {
  if (!assertStagingUnlocked(req.headers.cookie)) {
    sendJsonError(res, 'Staging gate locked', 401);
    return;
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    sendJsonError(res, 'Supabase is not configured on the server', 500);
    return;
  }

  const accessToken = extractBearerToken(req);
  if (!accessToken) {
    sendJsonError(res, 'Unauthorized: valid Bearer token required', 401);
    return;
  }

  const user = await resolveAuthenticatedUser(supabase, accessToken, res);
  if (!user) {
    return;
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('saved_queries')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(MAX_SAVED_QUERIES);

    if (error) {
      console.error('[api/saved-queries] list failed', error.message);
      sendJsonError(res, 'Failed to load saved queries', 503);
      return;
    }

    sendJson(res, 200, {
      queries: (data as SavedQueryRow[]).map(serializeRow),
      limit: MAX_SAVED_QUERIES,
    });
    return;
  }

  if (req.method === 'POST') {
    let body: CreateBody;
    try {
      const raw = await readRequestBody(req);
      body = raw ? (JSON.parse(raw) as CreateBody) : {};
    } catch {
      sendJsonError(res, 'Invalid JSON body', 400);
      return;
    }

    const sqlText = normalizeSql(body.sqlText);
    if (!sqlText) {
      sendJsonError(res, 'sqlText is required', 400);
      return;
    }

    const { count, error: countError } = await supabase
      .from('saved_queries')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError) {
      sendJsonError(res, 'Failed to verify saved query limit', 503);
      return;
    }

    // TODO: enforce limit when paid tiers launch
    if ((count ?? 0) >= MAX_SAVED_QUERIES) {
      sendJsonError(res, `Saved query limit reached (${MAX_SAVED_QUERIES}). Delete one to save another.`, 403);
      return;
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('saved_queries')
      .insert({
        user_id: user.id,
        title: normalizeTitle(body.title),
        sql_text: sqlText,
        table_selection: normalizeTableSelection(body.tableSelection),
        segment: normalizeSegment(body.segment),
        filter_state: body.filterState ?? null,
        updated_at: now,
      })
      .select('*')
      .single();

    if (error) {
      console.error('[api/saved-queries] insert failed', error.message);
      sendJsonError(res, 'Failed to save query', 503);
      return;
    }

    sendJson(res, 201, { query: serializeRow(data as SavedQueryRow) });
    return;
  }

  if (req.method === 'PUT') {
    let body: UpdateBody;
    try {
      const raw = await readRequestBody(req);
      body = raw ? (JSON.parse(raw) as UpdateBody) : {};
    } catch {
      sendJsonError(res, 'Invalid JSON body', 400);
      return;
    }

    const id = typeof body.id === 'string' ? body.id.trim() : '';
    if (!id) {
      sendJsonError(res, 'id is required', 400);
      return;
    }

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.title !== undefined) {
      patch.title = normalizeTitle(body.title);
    }
    if (body.sqlText !== undefined) {
      const sqlText = normalizeSql(body.sqlText);
      if (!sqlText) {
        sendJsonError(res, 'sqlText cannot be empty', 400);
        return;
      }
      patch.sql_text = sqlText;
    }
    if (body.tableSelection !== undefined) {
      patch.table_selection = normalizeTableSelection(body.tableSelection);
    }
    if (body.segment !== undefined) {
      patch.segment = normalizeSegment(body.segment);
    }
    if (body.filterState !== undefined) {
      patch.filter_state = body.filterState;
    }

    const { data, error } = await supabase
      .from('saved_queries')
      .update(patch)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single();

    if (error) {
      console.error('[api/saved-queries] update failed', error.message);
      sendJsonError(res, 'Failed to update saved query', 503);
      return;
    }

    sendJson(res, 200, { query: serializeRow(data as SavedQueryRow) });
    return;
  }

  if (req.method === 'DELETE') {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const id = url.searchParams.get('id')?.trim();
    if (!id) {
      sendJsonError(res, 'id query parameter is required', 400);
      return;
    }

    const { error } = await supabase
      .from('saved_queries')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('[api/saved-queries] delete failed', error.message);
      sendJsonError(res, 'Failed to delete saved query', 503);
      return;
    }

    sendJson(res, 200, { ok: true });
    return;
  }

  sendJsonError(res, 'Method not allowed', 405);
}

export default handleSavedQueriesRequest;
