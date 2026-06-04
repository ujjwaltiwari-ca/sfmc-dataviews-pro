import { describe, expect, it } from 'vitest';
import {
  buildArchitectDeepLink,
  buildExampleSelectSql,
  getSeoSchemaTables,
  resolveTableBySlug,
  tableNameToSlug,
} from './seoStatic';

describe('seoStatic', () => {
  it('maps table names to stable URL slugs', () => {
    expect(tableNameToSlug('_Subscribers')).toBe('subscribers');
    expect(tableNameToSlug('_SMSMessageTracking')).toBe('smsmessagetracking');
    expect(tableNameToSlug('Account_Salesforce')).toBe('account-salesforce');
    expect(tableNameToSlug('SendLog')).toBe('sendlog');
  });

  it('round-trips slugs for every SEO table', () => {
    for (const table of getSeoSchemaTables()) {
      const slug = tableNameToSlug(table.name);
      expect(resolveTableBySlug(slug)?.name).toBe(table.name);
    }
  });

  it('builds workspace deep links without new path routes', () => {
    expect(buildArchitectDeepLink('_Sent')).toBe('/?t=_Sent&sb=1');
    expect(buildArchitectDeepLink('SendLog')).toBe('/?seg=sendlog&t=SendLog&sb=1');
    expect(buildArchitectDeepLink('Contact_Salesforce')).toBe(
      '/?seg=synchronized&t=Contact_Salesforce&sb=1',
    );
  });

  it('builds SFMC-safe example SQL for _Sent without GROUP BY', () => {
    const sent = resolveTableBySlug('sent');
    expect(sent).toBeDefined();
    const sql = buildExampleSelectSql(sent!);
    expect(sql).toContain('SELECT TOP 100');
    expect(sql).toContain('FROM _Sent');
    expect(sql).toContain('WHERE EventDate >= DATEADD(day, -30, GETDATE())');
    expect(sql).toContain('ORDER BY EventDate DESC');
    expect(sql).not.toContain('GROUP BY');
  });
});
