import { describe, expect, it } from 'vitest';
import { decodeShareSql, encodeShareSql } from './workspaceShareSql.js';

describe('workspaceShareSql', () => {
  it('round-trips SQL through base64url encoding', () => {
    const sql = `SELECT TOP 200 s.SubscriberKey
FROM _Sent s
WHERE s.EventDate >= DATEADD(day, -30, GETDATE())`;

    const encoded = encodeShareSql(sql);
    expect(encoded).toBeTruthy();
    expect(decodeShareSql(encoded)).toBe(sql);
  });

  it('returns null for empty or oversized SQL', () => {
    expect(encodeShareSql('')).toBeNull();
    expect(encodeShareSql('   ')).toBeNull();
    expect(encodeShareSql('x'.repeat(6_001))).toBeNull();
    expect(decodeShareSql('')).toBeNull();
    expect(decodeShareSql('not-valid-base64!!!')).toBeNull();
  });
});
