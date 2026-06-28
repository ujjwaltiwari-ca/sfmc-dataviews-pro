import { describe, expect, it } from 'vitest';
import { assessSqlCopyReadiness, sqlHasOrderByWithoutTop } from './sqlCopyValidation';

describe('sqlHasOrderByWithoutTop', () => {
  it('returns false when ORDER BY is absent', () => {
    expect(sqlHasOrderByWithoutTop('SELECT JobID FROM _Sent')).toBe(false);
  });

  it('returns false when SELECT TOP precedes ORDER BY', () => {
    expect(
      sqlHasOrderByWithoutTop('SELECT TOP 200 JobID FROM _Sent ORDER BY EventDate DESC'),
    ).toBe(false);
  });

  it('returns true for standalone ORDER BY without TOP', () => {
    expect(sqlHasOrderByWithoutTop('SELECT JobID FROM _Sent ORDER BY EventDate DESC')).toBe(true);
  });
});

describe('assessSqlCopyReadiness', () => {
  it('warns when ORDER BY lacks SELECT TOP', () => {
    const items = assessSqlCopyReadiness({
      sql: 'SELECT JobID FROM _Sent ORDER BY EventDate DESC',
      selectedTableNames: ['_Sent'],
      preferences: { limitPast30Days: true, excludeTestSends: true },
      disconnectedTables: [],
    });
    expect(items.find((item) => item.id === 'order-by-top')?.status).toBe('warn');
  });
});
