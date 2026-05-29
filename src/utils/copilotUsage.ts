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

/**
 * Returns today's copilot request count for a user (UTC day boundary).
 * Uses the authenticated /api/usage route so counts are aggregated with the service role.
 */
export async function fetchTodayCopilotUsageCount(
  _userId: string,
  accessToken?: string | null,
): Promise<number> {
  const token = accessToken?.trim();
  if (!token) {
    throw new Error('Missing access token for usage lookup');
  }

  return fetchUsageFromApi(token);
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
