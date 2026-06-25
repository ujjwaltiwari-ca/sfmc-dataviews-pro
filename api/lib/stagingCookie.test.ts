import { afterEach, describe, expect, it } from 'vitest';
import { isStagingCookieExpired } from './stagingCookieShared.js';
import { isUnlockCookieValid, signUnlockPayload } from './stagingCookieNode.js';

describe('isStagingCookieExpired', () => {
  it('rejects cookies older than max age', () => {
    const issuedAt = String(Date.now() - 13 * 60 * 60 * 1000);
    expect(isStagingCookieExpired(issuedAt)).toBe(true);
  });

  it('accepts cookies within max age', () => {
    const issuedAt = String(Date.now() - 60 * 60 * 1000);
    expect(isStagingCookieExpired(issuedAt)).toBe(false);
  });
});

describe('isUnlockCookieValid', () => {
  const envSnapshot = { ...process.env };

  afterEach(() => {
    process.env = { ...envSnapshot };
  });

  it('validates a freshly signed cookie', () => {
    process.env.STAGING_COOKIE_SECRET = 'test-cookie-secret';
    process.env.NODE_ENV = 'development';

    const now = 1_700_000_000_000;
    const cookie = signUnlockPayload(now);
    expect(isUnlockCookieValid(cookie, now + 1000)).toBe(true);
  });

  it('rejects expired cookies even when signature matches', () => {
    process.env.STAGING_COOKIE_SECRET = 'test-cookie-secret';
    process.env.NODE_ENV = 'development';

    const issuedAt = 1_700_000_000_000;
    const cookie = signUnlockPayload(issuedAt);
    const expiredNow = issuedAt + 13 * 60 * 60 * 1000;
    expect(isUnlockCookieValid(cookie, expiredNow)).toBe(false);
  });
});
