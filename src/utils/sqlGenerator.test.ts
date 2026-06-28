import { describe, expect, it } from 'vitest';
import { applySqlUtilityFilters, generateSfmcSql } from './sqlGenerator.js';

describe('generateSfmcSql join rules', () => {
  it('joins tracking views on JobID, ListID, BatchID, and SubscriberID', () => {
    const { sql } = generateSfmcSql(['_Sent', '_Open']);
    expect(sql).toContain('s.JobID = o.JobID');
    expect(sql).toContain('s.ListID = o.ListID');
    expect(sql).toContain('s.BatchID = o.BatchID');
    expect(sql).toContain('s.SubscriberID = o.SubscriberID');
  });

  it('joins _Sent and _Job on JobID only', () => {
    const { sql } = generateSfmcSql(['_Sent', '_Job']);
    expect(sql).toContain('s.JobID = j.JobID');
    expect(sql).not.toContain('j.ListID');
    expect(sql).not.toContain('j.SubscriberID');
  });

  it('joins tracking and _Subscribers on SubscriberID', () => {
    const { sql } = generateSfmcSql(['_Sent', '_Subscribers'], undefined, {
      filterUniqueEvents: false,
    });
    expect(sql).toContain('s.SubscriberID = sub.SubscriberID');
    expect(sql).not.toContain('s.SubscriberKey = sub.SubscriberKey');
    expect(sql).toContain('s.EventDate AS SentEventDate');
    expect(sql).toContain('sub.DateUnsubscribed AS SubscribersDateUnsubscribed');
    expect(sql).toContain('sub.Status AS SubscribersStatus');
  });

  it('joins _Sent and _ListSubscribers on SubscriberID and ListID', () => {
    const { sql } = generateSfmcSql(['_Sent', '_ListSubscribers'], undefined, {
      filterUniqueEvents: false,
    });
    expect(sql).toContain('s.SubscriberID = lsb.SubscriberID');
    expect(sql).toContain('s.ListID = lsb.ListID');
    expect(sql).toContain('s.EventDate AS SentEventDate');
    expect(sql).toContain('lsb.Status AS ListSubscribersStatus');
    expect(sql).toContain('lsb.CreatedDate AS ListSubscribersCreatedDate');
  });

  it('joins _Job + _Open + _Click with Click before Job and IsUnique only on Click', () => {
    const { sql } = generateSfmcSql(['_Job', '_Open', '_Click'], undefined, {
      filterUniqueEvents: true,
    });
    const clickJoinIndex = sql.indexOf('_Click AS c');
    const jobJoinIndex = sql.indexOf('_Job AS j');
    expect(clickJoinIndex).toBeGreaterThan(-1);
    expect(jobJoinIndex).toBeGreaterThan(-1);
    expect(clickJoinIndex).toBeLessThan(jobJoinIndex);
    expect(sql).toContain('c.IsUnique = 1');
    expect(sql).not.toMatch(/\bWHERE\b[\s\S]*o\.IsUnique = 1/);
    expect(sql).toContain('o.EventDate AS OpenEventDate');
    expect(sql).toContain('c.EventDate AS ClickEventDate');
    expect(sql).toContain('j.CreatedDate AS JobCreatedDate');
  });

  it('joins _ListSubscribers and _Subscribers on SubscriberID with _Subscribers as root', () => {
    const { sql } = generateSfmcSql(['_ListSubscribers', '_Subscribers']);
    expect(sql).toContain('FROM');
    expect(sql).toContain('_Subscribers AS sub');
    expect(sql).toContain('lsb.SubscriberID = sub.SubscriberID');
    expect(sql).not.toContain('lsb.SubscriberKey = sub.SubscriberKey');
  });

  it('aliases duplicate EventDate columns across tracking views', () => {
    const { sql } = generateSfmcSql(['_Sent', '_Click'], undefined, {
      filterUniqueEvents: false,
    });
    expect(sql).toContain('s.EventDate AS SentEventDate');
    expect(sql).toContain('c.EventDate AS ClickEventDate');
  });

  it('compact SELECT omits non-curated columns', () => {
    const full = generateSfmcSql(['_Sent', '_Click'], undefined, {
      compactSelect: false,
      filterUniqueEvents: false,
    });
    const compact = generateSfmcSql(['_Sent', '_Click'], undefined, {
      compactSelect: true,
      filterUniqueEvents: false,
    });
    expect(full.sql).toContain('c.IsUnique');
    expect(compact.sql).not.toContain('c.IsUnique');
    expect(compact.sql).toContain('c.URL');
    expect(compact.sql).toContain('s.EventDate AS SentEventDate');
  });

  it('joins SMS views on mobile number, not keyword GUID', () => {
    const { sql } = generateSfmcSql([
      '_SMSMessageTracking',
      '_SMSSubscriptionLog',
      '_UndeliverableSMS',
    ]);
    expect(sql).toContain('FROM');
    expect(sql).toContain('_SMSMessageTracking AS smt');
    expect(sql).toContain('smt.Mobile = ssl.MobileNumber');
    expect(sql).toContain('smt.Mobile = usms.MobileNumber');
    expect(sql).not.toContain('SubscriptionDefinitionID = smt.KeywordID');
  });

  it('applies _Job.Category when excluding test sends with _Job in the graph', () => {
    const { sql } = generateSfmcSql(['_Sent', '_Job'], undefined, {
      filterUniqueEvents: false,
    });
    const withFilters = applySqlUtilityFilters(
      sql,
      {
        limitPast30Days: false,
        excludeTestSends: true,
        filterActiveSubscribersOnly: false,
        filterByCampaignJobId: false,
        campaignJobId: '',
        jobIdFilterAlias: null,
        joinTables: ['_Sent', '_Job'],
      },
      's',
      'upper',
    );
    expect(withFilters).toContain("j.Category != 'Test Send Emails'");
    expect(withFilters).not.toContain('TestStormObjID');
  });

  it('uses EXISTS on _Job when excluding test sends without _Job in the graph', () => {
    const { sql, joinTables } = generateSfmcSql(['_Sent'], undefined, {
      filterUniqueEvents: false,
    });
    const withFilters = applySqlUtilityFilters(
      sql,
      {
        limitPast30Days: false,
        excludeTestSends: true,
        filterActiveSubscribersOnly: false,
        filterByCampaignJobId: false,
        campaignJobId: '',
        jobIdFilterAlias: null,
        joinTables,
      },
      's',
      'upper',
    );
    expect(withFilters).toContain('EXISTS (SELECT 1 FROM _Job j');
    expect(withFilters).toContain("j.Category != 'Test Send Emails'");
  });

});
