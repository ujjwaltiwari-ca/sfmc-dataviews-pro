import { createHmac, timingSafeEqual, createHash } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

const STAGING_COOKIE_NAME = 'sfmc_staging_unlock';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 12;
const COOKIE_VERSION = 'v1';

type NodeApiRequest = IncomingMessage & { body?: unknown };

function getStagingPassword(): string | null {
  const password = process.env.STAGING_PASSWORD?.trim();
  return password || null;
}

function getCookieSigningSecret(): string {
  return (
    process.env.STAGING_COOKIE_SECRET?.trim() ||
    process.env.STAGING_PASSWORD?.trim() ||
    'sfmc-staging-fallback-secret'
  );
}

function signUnlockPayload(): string {
  const issuedAt = String(Date.now());
  const hmac = createHmac('sha256', getCookieSigningSecret())
    .update(`${COOKIE_VERSION}:${issuedAt}`)
    .digest('base64url');
  return `${COOKIE_VERSION}.${issuedAt}.${hmac}`;
}

function isUnlockCookieValid(cookieValue: string | undefined): boolean {
  if (!cookieValue) {
    return false;
  }

  const parts = cookieValue.split('.');
  if (parts.length !== 3 || parts[0] !== COOKIE_VERSION) {
    return false;
  }

  const [, issuedAt, signature] = parts;
  if (!issuedAt || !signature) {
    return false;
  }

  const expected = createHmac('sha256', getCookieSigningSecret())
    .update(`${COOKIE_VERSION}:${issuedAt}`)
    .digest('base64url');

  const received = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (received.length !== expectedBuf.length) {
    return false;
  }

  return timingSafeEqual(received, expectedBuf);
}

function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) {
    return {};
  }

  const cookies: Record<string, string> = {};
  for (const part of header.split(';')) {
    const [rawName, ...rest] = part.trim().split('=');
    if (!rawName || rest.length === 0) {
      continue;
    }
    cookies[rawName] = decodeURIComponent(rest.join('='));
  }
  return cookies;
}

function passwordsMatch(attempt: string, expected: string): boolean {
  const attemptHash = createHash('sha256').update(attempt).digest();
  const expectedHash = createHash('sha256').update(expected).digest();
  return timingSafeEqual(attemptHash, expectedHash);
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

function setUnlockCookie(res: ServerResponse): void {
  const value = signUnlockPayload();
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${STAGING_COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${COOKIE_MAX_AGE_SECONDS}${secure}`,
  );
}

async function readJsonBody(req: NodeApiRequest): Promise<{ password?: unknown }> {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      return JSON.parse(req.body) as { password?: unknown };
    }
    return req.body as { password?: unknown };
  }

  const raw = await new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });

  return raw ? (JSON.parse(raw) as { password?: unknown }) : {};
}

export async function handleStagingRequest(
  req: NodeApiRequest,
  res: ServerResponse,
): Promise<void> {
  const stagingPassword = getStagingPassword();

  if (!stagingPassword) {
    sendJson(res, 200, { enabled: false, unlocked: true });
    return;
  }

  if (req.method === 'GET') {
    const cookies = parseCookies(req.headers.cookie);
    const unlocked = isUnlockCookieValid(cookies[STAGING_COOKIE_NAME]);
    sendJson(res, 200, { enabled: true, unlocked });
    return;
  }

  if (req.method === 'POST') {
    let body: { password?: unknown };
    try {
      body = await readJsonBody(req);
    } catch {
      sendJson(res, 400, { error: 'Invalid JSON body' });
      return;
    }

    const attempt = typeof body.password === 'string' ? body.password : '';
    if (!attempt || !passwordsMatch(attempt, stagingPassword)) {
      sendJson(res, 401, { error: 'Incorrect password' });
      return;
    }

    setUnlockCookie(res);
    sendJson(res, 200, { unlocked: true });
    return;
  }

  res.statusCode = 405;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Method not allowed' }));
}

export default handleStagingRequest;
