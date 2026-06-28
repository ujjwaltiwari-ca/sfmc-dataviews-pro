import type { ServerResponse } from 'node:http';
import { assertStagingUnlocked } from './lib/stagingCookieNode.js';
import {
  extractBearerToken,
  getSupabaseServerClient,
  getSupabaseServerConfigError,
  sendJson,
  sendJsonError,
  type NodeApiRequest,
} from './lib/supabaseServer.js';

const DAILY_COPILOT_QUERY_LIMIT = 5;

function startOfUtcDayIso(): string {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0),
  );
  return start.toISOString();
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

  if (!assertStagingUnlocked(req.headers.cookie)) {
    sendJsonError(res, 'Staging gate locked', 401);
    return;
  }

  const supabase = getSupabaseServerClient();
  const configError = getSupabaseServerConfigError();
  if (!supabase || configError) {
    sendJsonError(res, configError ?? 'Supabase is not configured on the server', 500);
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
    sendJsonError(res, 'Usage verification failed. Please try again later.', 503);
  }
}

export default handleUsageRequest;
