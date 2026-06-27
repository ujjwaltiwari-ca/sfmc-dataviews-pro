import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { IncomingMessage, ServerResponse } from 'node:http';

let supabaseServerClient: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient | null {
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

export type NodeApiRequest = IncomingMessage & { body?: unknown };

export function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

export function sendJsonError(res: ServerResponse, message: string, status: number): void {
  sendJson(res, status, { error: message });
}

export function extractBearerToken(request: NodeApiRequest): string | null {
  const raw = request.headers['authorization'] ?? request.headers.authorization;
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

export async function resolveAuthenticatedUser(
  supabase: SupabaseClient,
  accessToken: string,
  res: ServerResponse,
): Promise<User | null> {
  if (!isPlausibleJwt(accessToken)) {
    sendJsonError(res, 'Unauthorized: invalid or expired session', 401);
    return null;
  }

  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      sendJsonError(res, 'Unauthorized: invalid or expired session', 401);
      return null;
    }

    return user;
  } catch {
    sendJsonError(res, 'Unauthorized: invalid or expired session', 401);
    return null;
  }
}

export function readRequestBody(req: NodeApiRequest): Promise<string> {
  if (req.body !== undefined && req.body !== null) {
    return Promise.resolve(typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
