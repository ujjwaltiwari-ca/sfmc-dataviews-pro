import { describe, expect, it } from 'vitest';
import { sanitizeNumericSqlLiteral } from './sqlSanitize.js';
import { applySqlUtilityFilters } from './sqlGenerator.js';

describe('sanitizeNumericSqlLiteral', () => {
  it('strips non-digit characters from job id values', () => {
    expect(sanitizeNumericSqlLiteral("123'; DROP TABLE--")).toBe('123');
  });
});

describe('applySqlUtilityFilters job id', () => {
  it('ignores malicious job id fragments in generated predicates', () => {
    const baseSql = 'SELECT JobID FROM _Sent AS s';
    const result = applySqlUtilityFilters(
      baseSql,
      {
        limitPast30Days: false,
        excludeTestSends: false,
        filterActiveSubscribersOnly: false,
        filterByCampaignJobId: true,
        campaignJobId: "99'; DROP TABLE _Sent; --",
        jobIdFilterAlias: 's',
      },
      's',
    );

    expect(result).toContain("JobID = '99'");
    expect(result).not.toContain('DROP TABLE');
  });
});
