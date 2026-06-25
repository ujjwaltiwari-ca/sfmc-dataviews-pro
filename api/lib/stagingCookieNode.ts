import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  COOKIE_MAX_AGE_SECONDS,
  COOKIE_VERSION,
  isStagingCookieExpired,
  STAGING_COOKIE_NAME,
} from './stagingCookieShared.js';

export { COOKIE_MAX_AGE_SECONDS, COOKIE_VERSION, STAGING_COOKIE_NAME };

export function getStagingPassword(): string | null {
  const password = process.env.STAGING_PASSWORD?.trim();
  return password || null;
}

export function isStagingGateEnabled(): boolean {
  return Boolean(getStagingPassword());
}

export function getCookieSigningSecret(): string {
  const cookieSecret = process.env.STAGING_COOKIE_SECRET?.trim();
  if (cookieSecret) {
    return cookieSecret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'STAGING_COOKIE_SECRET must be set in production when STAGING_PASSWORD is enabled.',
    );
  }

  const stagingPassword = process.env.STAGING_PASSWORD?.trim();
  if (stagingPassword) {
    return stagingPassword;
  }

  throw new Error('STAGING_COOKIE_SECRET or STAGING_PASSWORD must be set when staging gate is enabled.');
}

export function signUnlockPayload(nowMs = Date.now()): string {
  const issuedAt = String(nowMs);
  const hmac = createHmac('sha256', getCookieSigningSecret())
    .update(`${COOKIE_VERSION}:${issuedAt}`)
    .digest('base64url');
  return `${COOKIE_VERSION}.${issuedAt}.${hmac}`;
}

export function isUnlockCookieValid(cookieValue: string | undefined, nowMs = Date.now()): boolean {
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

  let expected: string;
  try {
    expected = createHmac('sha256', getCookieSigningSecret())
      .update(`${COOKIE_VERSION}:${issuedAt}`)
      .digest('base64url');
  } catch {
    return false;
  }

  const received = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (received.length !== expectedBuf.length) {
    return false;
  }

  return timingSafeEqual(received, expectedBuf);
}

export function assertStagingUnlocked(cookieHeader: string | undefined): boolean {
  if (!isStagingGateEnabled()) {
    return true;
  }

  const cookies = parseCookieHeader(cookieHeader);
  return isUnlockCookieValid(cookies[STAGING_COOKIE_NAME]);
}

function parseCookieHeader(header: string | undefined): Record<string, string> {
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
