import { startOfUtcDayIso } from '../constants/copilotQuota';
import { supabase } from './supabaseClient';

type UsageApiPayload = {
  count?: number;
  limit?: number;
  isAtLimit?: boolean;
};

async function fetchUsageFromApi(accessToken: string): Promise<number> {
  const response = await fetch('/api/usage', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    let detail = `Usage API failed (${response.status})`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) {
        detail = body.error;
      }
    } catch {
      /* keep default */
    }
    throw new Error(detail);
  }

  const payload = (await response.json()) as UsageApiPayload;
  if (typeof payload.count !== 'number' || Number.isNaN(payload.count)) {
    throw new Error('Usage API returned an invalid count payload');
  }

  return payload.count;
}

async function fetchUsageFromClient(userId: string): Promise<number> {
  const dayStartUtc = startOfUtcDayIso();

  const { count, error } = await supabase
    .from('user_usage')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', dayStartUtc);

  if (error) {
    console.error('[copilotUsage] Supabase client user_usage query failed:', {
      userId,
      dayStartUtc,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(error.message);
  }

  const resolved = count ?? 0;

  if (count === null) {
    console.warn(
      '[copilotUsage] user_usage count was null for authenticated user — check RLS SELECT policy or use /api/usage with SUPABASE_SERVICE_ROLE_KEY.',
      { userId, dayStartUtc },
    );
  }

  return resolved;
}

/**
 * Returns today's copilot request count for a user (UTC day boundary).
 * Prefers the authenticated /api/usage route (service role) over direct client reads.
 */
export async function fetchTodayCopilotUsageCount(
  userId: string,
  accessToken?: string | null,
): Promise<number> {
  const token = accessToken?.trim();
  if (token) {
    try {
      return await fetchUsageFromApi(token);
    } catch (apiError) {
      console.warn(
        '[copilotUsage] /api/usage fetch failed; falling back to direct Supabase client query.',
        apiError instanceof Error ? apiError.message : apiError,
      );
    }
  }

  return fetchUsageFromClient(userId);
}

/** Removes Supabase auth keys from localStorage after sign-out. */
export function purgeSupabaseAuthStorage(): void {
  try {
    const keysToRemove: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && (key.startsWith('sb-') || key.includes('supabase.auth'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch {
    /* ignore storage errors */
  }
}
