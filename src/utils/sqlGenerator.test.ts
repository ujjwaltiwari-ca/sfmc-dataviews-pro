import { describe, expect, it } from 'vitest';
import { generateSfmcSql } from './sqlGenerator.js';

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

  it('joins tracking and _Subscribers on SubscriberKey only', () => {
    const { sql } = generateSfmcSql(['_Sent', '_Subscribers']);
    expect(sql).toContain('s.SubscriberKey = sub.SubscriberKey');
    expect(sql).not.toMatch(/sub\.SubscriberID/);
  });

  it('joins _ListSubscribers and _Subscribers on SubscriberKey only', () => {
    const { sql } = generateSfmcSql(['_ListSubscribers', '_Subscribers']);
    expect(sql).toContain('lsb.SubscriberKey = sub.SubscriberKey');
    expect(sql).not.toMatch(/sub\.SubscriberID/);
  });

  it('joins tracking and _ListSubscribers on SubscriberID and ListID', () => {
    const { sql } = generateSfmcSql(['_Sent', '_ListSubscribers']);
    expect(sql).toContain('s.SubscriberID = lsb.SubscriberID');
    expect(sql).toContain('s.ListID = lsb.ListID');
  });
});
