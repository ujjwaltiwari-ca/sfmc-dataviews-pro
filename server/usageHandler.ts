import { DAILY_COPILOT_QUERY_LIMIT } from '../src/constants/copilotQuota';
import { getTodayCopilotUsageCount } from './copilotUsage';
import { getSupabaseServerClient } from './supabaseClient';

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
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

export async function handleUsageRequest(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return jsonError('Method not allowed', 405);
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return jsonError('Supabase is not configured on the server', 500);
  }

  const accessToken = extractBearerToken(request);
  if (!accessToken) {
    return jsonError('Unauthorized: valid Bearer token required', 401);
  }

  if (!isPlausibleJwt(accessToken)) {
    return jsonError('Unauthorized: invalid or expired session', 401);
  }

  let user: { id: string };
  try {
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (authError || !authUser) {
      console.error(
        '[usageHandler] Rejected request: invalid session token',
        authError?.message ?? 'no user',
      );
      return jsonError('Unauthorized: invalid or expired session', 401);
    }

    user = authUser;
  } catch (authFailure) {
    const message =
      authFailure instanceof Error ? authFailure.message : 'Token verification failed';
    console.error('[usageHandler] Auth verification threw unexpectedly', message);
    return jsonError('Unauthorized: invalid or expired session', 401);
  }

  try {
    const count = await getTodayCopilotUsageCount(user.id);
    return new Response(
      JSON.stringify({
        count,
        limit: DAILY_COPILOT_QUERY_LIMIT,
        isAtLimit: count >= DAILY_COPILOT_QUERY_LIMIT,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (usageError) {
    const message =
      usageError instanceof Error ? usageError.message : 'Failed to load usage count';
    console.error('[usageHandler] Usage lookup failed for user', user.id, message);
    return jsonError(`Usage verification failed: ${message}`, 503);
  }
}
