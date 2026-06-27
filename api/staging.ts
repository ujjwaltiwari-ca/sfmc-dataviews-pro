import { createHash, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { getClientIp } from './lib/clientIp.js';
import { checkRateLimit, STAGING_POST_LIMIT } from './lib/rateLimit.js';
import {
  COOKIE_MAX_AGE_SECONDS,
  getCookieSigningSecret,
  getStagingPassword,
  isUnlockCookieValid,
  signUnlockPayload,
  STAGING_COOKIE_NAME,
} from './lib/stagingCookieNode.js';

type NodeApiRequest = IncomingMessage & { body?: unknown };

const MAX_REQUEST_BODY_BYTES = 256 * 1024;

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

async function readJsonBody(req: NodeApiRequest): Promise<{ password?: unknown }> {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      if (Buffer.byteLength(req.body, 'utf8') > MAX_REQUEST_BODY_BYTES) {
        throw new Error('Request body too large');
      }
      return JSON.parse(req.body) as { password?: unknown };
    }
    const serialized = JSON.stringify(req.body);
    if (Buffer.byteLength(serialized, 'utf8') > MAX_REQUEST_BODY_BYTES) {
      throw new Error('Request body too large');
    }
    return req.body as { password?: unknown };
  }

  const raw = await new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;

    req.on('data', (chunk: Buffer) => {
      totalBytes += chunk.length;
      if (totalBytes > MAX_REQUEST_BODY_BYTES) {
        reject(new Error('Request body too large'));
        return;
      }
      chunks.push(chunk);
    });
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

  // Validate signing secret is configured before accepting gate traffic.
  try {
    getCookieSigningSecret();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Staging gate misconfigured';
    console.error('[api/staging]', message);
    sendJson(res, 503, { error: 'Staging gate is misconfigured on the server' });
    return;
  }

  if (req.method === 'GET') {
    const cookies = parseCookies(req.headers.cookie);
    const unlocked = isUnlockCookieValid(cookies[STAGING_COOKIE_NAME]);
    sendJson(res, 200, { enabled: true, unlocked });
    return;
  }

  if (req.method === 'POST') {
    const clientIp = getClientIp(req);
    const rateLimit = await checkRateLimit(
      `staging-post:${clientIp}`,
      STAGING_POST_LIMIT.max,
      STAGING_POST_LIMIT.windowMs,
    );
    if (!rateLimit.ok) {
      res.setHeader('Retry-After', String(rateLimit.retryAfterSeconds ?? 60));
      sendJson(res, 429, { error: 'Too many password attempts. Please try again later.' });
      return;
    }

    let body: { password?: unknown };
    try {
      body = await readJsonBody(req);
    } catch (readError) {
      const message =
        readError instanceof Error && readError.message === 'Request body too large'
          ? 'Request body too large'
          : 'Invalid JSON body';
      sendJson(res, message.includes('large') ? 413 : 400, { error: message });
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
