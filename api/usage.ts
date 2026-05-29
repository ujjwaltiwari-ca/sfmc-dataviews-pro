import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { IncomingMessage, ServerResponse } from 'node:http';

const DAILY_COPILOT_QUERY_LIMIT = 5;

function startOfUtcDayIso(): string {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
  );
  return start.toISOString();
}

let supabaseServerClient: SupabaseClient | null = null;

function getSupabaseServerClient(): SupabaseClient | null {
  if (supabaseServerClient) {
    return supabaseServerClient;
  }

  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    return null;
  }

  supabaseServerClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseServerClient;
}

async function getTodayCopilotUsageCount(userId: string): Promise<number> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    throw new Error('Supabase is not configured on the server');
  }

  const dayStartUtc = startOfUtcDayIso();

  const { count, error } = await supabase
    .from('user_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', dayStartUtc);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

type NodeApiRequest = IncomingMessage & { body?: unknown };

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function sendJsonError(res: ServerResponse, message: string, status: number): void {
  sendJson(res, status, { error: message });
}

function extractBearerToken(request: NodeApiRequest): string | null {
  const raw =
    request.headers['authorization'] ?? request.headers.authorization;
  const authHeader = Array.isArray(raw) ? raw[0] : raw;

  if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  return token || null;
}

function isPlausibleJwt(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }

  return parts.every((part) => part.length > 0 && /^[A-Za-z0-9_-]+$/.test(part));
}

export async function handleUsageRequest(
  req: NodeApiRequest,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== 'GET') {
    sendJsonError(res, 'Method not allowed', 405);
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

  if (!isPlausibleJwt(accessToken)) {
    sendJsonError(res, 'Unauthorized: invalid or expired session', 401);
    return;
  }

  let user: { id: string };
  try {
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (authError || !authUser) {
      console.error(
        '[api/usage] Rejected request: invalid session token',
        authError?.message ?? 'no user',
      );
      sendJsonError(res, 'Unauthorized: invalid or expired session', 401);
      return;
    }

    user = authUser;
  } catch (authFailure) {
    const message =
      authFailure instanceof Error ? authFailure.message : 'Token verification failed';
    console.error('[api/usage] Auth verification threw unexpectedly', message);
    sendJsonError(res, 'Unauthorized: invalid or expired session', 401);
    return;
  }

  try {
    const count = await getTodayCopilotUsageCount(user.id);
    sendJson(res, 200, {
      count,
      limit: DAILY_COPILOT_QUERY_LIMIT,
      isAtLimit: count >= DAILY_COPILOT_QUERY_LIMIT,
    });
  } catch (usageError) {
    const message =
      usageError instanceof Error ? usageError.message : 'Failed to load usage count';
    console.error('[api/usage] Usage lookup failed for user', user.id, message);
    sendJsonError(res, `Usage verification failed: ${message}`, 503);
  }
}

export default handleUsageRequest;
