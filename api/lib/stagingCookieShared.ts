export const STAGING_COOKIE_NAME = 'sfmc_staging_unlock';
export const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 12;
export const COOKIE_VERSION = 'v1';

/** Paths that remain public while the staging gate is active (SEO + legal + gate page). */
export const STAGING_PUBLIC_PATH_PREFIXES = [
  '/views',
  '/guides',
  '/privacy',
  '/terms',
  '/robots.txt',
  '/sitemap.xml',
  '/llms',
  '/favicon',
  '/og-preview',
  '/staging-gate.html',
] as const;

export function isStagingPublicPath(pathname: string): boolean {
  if (pathname.startsWith('/assets/')) {
    return true;
  }
  return STAGING_PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function isStagingCookieExpired(issuedAt: string, nowMs = Date.now()): boolean {
  const issuedAtMs = Number(issuedAt);
  if (!Number.isFinite(issuedAtMs)) {
    return true;
  }

  const ageMs = nowMs - issuedAtMs;
  return ageMs < 0 || ageMs > COOKIE_MAX_AGE_SECONDS * 1000;
}

export function parseCookieHeader(header: string | undefined): Record<string, string> {
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
