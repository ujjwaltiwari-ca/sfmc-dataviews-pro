import {
  COOKIE_VERSION,
  isStagingCookieExpired,
  isStagingPublicPath,
  parseCookieHeader,
  STAGING_COOKIE_NAME,
} from './api/lib/stagingCookieShared.js';

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function hmacSha256Base64Url(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return bytesToBase64Url(new Uint8Array(signature));
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return mismatch === 0;
}

async function isUnlockCookieValidEdge(
  cookieValue: string | undefined,
  secret: string,
  nowMs = Date.now(),
): Promise<boolean> {
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

  if (isStagingCookieExpired(issuedAt, nowMs)) {
    return false;
  }

  const expected = await hmacSha256Base64Url(secret, `${COOKIE_VERSION}:${issuedAt}`);
  return timingSafeEqualStrings(signature, expected);
}

function resolveCookieSigningSecret(stagingPassword: string): string | null {
  const cookieSecret = process.env.STAGING_COOKIE_SECRET?.trim();
  if (cookieSecret) {
    return cookieSecret;
  }

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return stagingPassword;
}

export default async function middleware(request: Request): Promise<Response | undefined> {
  const stagingPassword = process.env.STAGING_PASSWORD?.trim();
  if (!stagingPassword) {
    return undefined;
  }

  const url = new URL(request.url);
  const { pathname } = url;

  if (isStagingPublicPath(pathname) || pathname === '/api/staging') {
    return undefined;
  }

  const signingSecret = resolveCookieSigningSecret(stagingPassword);
  if (!signingSecret) {
    return new Response('Staging gate misconfigured', { status: 503 });
  }

  const cookies = parseCookieHeader(request.headers.get('cookie') ?? undefined);
  const unlocked = await isUnlockCookieValidEdge(
    cookies[STAGING_COOKIE_NAME],
    signingSecret,
  );

  if (unlocked) {
    return undefined;
  }

  if (pathname.startsWith('/api/')) {
    return Response.json({ error: 'Staging gate locked' }, { status: 401 });
  }

  const gateUrl = new URL('/staging-gate.html', request.url);
  gateUrl.searchParams.set('next', `${pathname}${url.search}`);
  return Response.redirect(gateUrl, 307);
}

export const config = {
  matcher: [
    '/((?!assets/|_next/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?|map|txt|xml)$).*)',
  ],
};
