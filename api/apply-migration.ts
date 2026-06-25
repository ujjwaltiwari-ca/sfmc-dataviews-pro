import pg from 'pg';
import type { IncomingMessage, ServerResponse } from 'node:http';

type NodeApiRequest = IncomingMessage & { body?: unknown };

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

const MIGRATION_SQL = `
CREATE OR REPLACE FUNCTION public.reserve_copilot_slot(p_user_id uuid, p_limit int)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int;
  v_row_id bigint;
BEGIN
  SELECT count(*)::int
  INTO v_count
  FROM user_usage
  WHERE user_id = p_user_id
    AND created_at >= date_trunc('day', (now() AT TIME ZONE 'utc'));

  IF v_count >= p_limit THEN
    RETURN NULL;
  END IF;

  INSERT INTO user_usage (user_id)
  VALUES (p_user_id)
  RETURNING id INTO v_row_id;

  RETURN v_row_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_copilot_slot(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_copilot_slot(uuid, int) TO service_role;
`.trim();

async function rpcExists(databaseUrl: string): Promise<boolean> {
  const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const result = await client.query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1
        FROM pg_proc
        WHERE proname = 'reserve_copilot_slot'
      ) AS exists`,
    );
    return result.rows[0]?.exists === true;
  } finally {
    await client.end();
  }
}

function extractBearerToken(request: NodeApiRequest): string | null {
  const raw = request.headers.authorization ?? request.headers['authorization'];
  const authHeader = Array.isArray(raw) ? raw[0] : raw;
  if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice('Bearer '.length).trim() || null;
}

export async function handleApplyMigrationRequest(
  req: NodeApiRequest,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const migrationSecret = process.env.MIGRATION_SECRET?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const databaseUrl = process.env.SUPABASE_DB_URL?.trim() || process.env.DATABASE_URL?.trim();
  const bearer = extractBearerToken(req);

  const authorized =
    (migrationSecret && bearer === migrationSecret) ||
    (serviceRoleKey && bearer === serviceRoleKey);

  if (!authorized) {
    sendJson(res, 401, { error: 'Unauthorized' });
    return;
  }

  if (!databaseUrl) {
    sendJson(res, 503, {
      error:
        'SUPABASE_DB_URL is not configured on the server. Add the Postgres connection string in Vercel env, then retry.',
    });
    return;
  }

  try {
    if (await rpcExists(databaseUrl)) {
      sendJson(res, 200, { applied: false, message: 'reserve_copilot_slot already exists' });
      return;
    }

    const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
    await client.connect();
    try {
      await client.query(MIGRATION_SQL);
    } finally {
      await client.end();
    }

    sendJson(res, 200, { applied: true, message: 'reserve_copilot_slot created' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Migration failed';
    console.error('[api/apply-migration]', message);
    sendJson(res, 500, { error: 'Migration failed' });
  }
}

export default handleApplyMigrationRequest;
