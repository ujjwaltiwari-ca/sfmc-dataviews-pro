import type { QueryTemplate } from './queryTemplateTypes.js';

export const sfmcQueryTemplatesExtended: QueryTemplate[] = [
  {
    id: 'soft-bounce-monitor',
    category: 'Deliverability',
    title: 'Soft Bounce Monitor (30 Days)',
    description: 'Subscribers with recent soft bounces for deliverability triage before they become held.',
    sql: `SELECT TOP 200
  sub.SubscriberKey,
  sub.EmailAddress,
  b.BounceCategory,
  b.SMTPCode,
  b.EventDate
FROM _Subscribers sub
JOIN _Bounce b ON sub.SubscriberKey = b.SubscriberKey
WHERE LOWER(b.BounceCategory) = 'soft bounce'
  AND b.EventDate >= DATEADD(day, -30, GETDATE())
ORDER BY b.EventDate DESC`,
  },
  {
    id: 'click-to-open-rate-by-job',
    category: 'Engagement',
    title: 'Click-to-Open Rate by Job',
    description: 'Unique clicks divided by unique opens per JobID for the last 30 days.',
    sql: `SELECT TOP 200
  rates.JobID,
  rates.UniqueOpens,
  rates.UniqueClicks,
  CAST(rates.UniqueClicks AS FLOAT) / NULLIF(rates.UniqueOpens, 0) * 100 AS CTORate_Pct
FROM (
  SELECT
    s.JobID,
    COUNT(DISTINCT CASE WHEN o.IsUnique = 1 THEN o.SubscriberID END) AS UniqueOpens,
    COUNT(DISTINCT CASE WHEN c.IsUnique = 1 THEN c.SubscriberID END) AS UniqueClicks
  FROM _Sent s
  LEFT JOIN _Open o
    ON s.JobID = o.JobID
    AND s.ListID = o.ListID
    AND s.BatchID = o.BatchID
    AND s.SubscriberID = o.SubscriberID
  LEFT JOIN _Click c
    ON s.JobID = c.JobID
    AND s.ListID = c.ListID
    AND s.BatchID = c.BatchID
    AND s.SubscriberID = c.SubscriberID
  WHERE s.EventDate >= DATEADD(day, -30, GETDATE())
    AND s.TestStormObjID IS NULL
  GROUP BY s.JobID
  HAVING COUNT(DISTINCT CASE WHEN o.IsUnique = 1 THEN o.SubscriberID END) > 0
) rates
ORDER BY CTORate_Pct DESC`,
  },
  {
    id: 'inactive-subscribers-180-days',
    category: 'List Hygiene',
    title: 'Inactive Subscribers (180 Days)',
    description: 'Active subscribers with sends in 180 days but zero opens — sunset candidates.',
    sql: `-- Child BU: use Ent._Subscribers instead of _Subscribers
SELECT TOP 1000
  sub.SubscriberKey,
  sub.EmailAddress,
  sub.Status
FROM _Subscribers sub
WHERE sub.Status = 'active'
  AND EXISTS (
    SELECT 1
    FROM _Sent s
    WHERE s.SubscriberKey = sub.SubscriberKey
      AND s.EventDate >= DATEADD(day, -180, GETDATE())
      AND s.TestStormObjID IS NULL
    GROUP BY s.SubscriberKey
    HAVING COUNT(DISTINCT s.JobID) >= 5
  )
  AND NOT EXISTS (
    SELECT 1
    FROM _Open o
    WHERE o.SubscriberKey = sub.SubscriberKey
      AND o.EventDate >= DATEADD(day, -180, GETDATE())
  )`,
  },
  {
    id: 'list-subscribers-unsubscribed',
    category: 'List Hygiene',
    title: 'List Subscribers Marked Unsubscribed',
    description: 'Audit _ListSubscribers with unsubscribed status for a specific list context.',
    sql: `SELECT TOP 200
  ls.ListID,
  ls.SubscriberID,
  ls.SubscriberKey,
  ls.Status,
  ls.DateJoined,
  ls.DateUnsubscribed
FROM _ListSubscribers ls
WHERE ls.Status = 'unsubscribed'
  AND ls.DateUnsubscribed >= DATEADD(day, -30, GETDATE())
ORDER BY ls.DateUnsubscribed DESC`,
  },
  {
    id: 'job-performance-summary',
    category: 'Campaign',
    title: 'Job Performance Summary',
    description: 'Sent, unique open, and unique click counts by JobID with _Job email names.',
    sql: `SELECT TOP 200
  j.JobID,
  j.EmailName,
  COUNT(DISTINCT s.SubscriberID) AS Sent,
  COUNT(DISTINCT CASE WHEN o.IsUnique = 1 THEN o.SubscriberID END) AS UniqueOpens,
  COUNT(DISTINCT CASE WHEN c.IsUnique = 1 THEN c.SubscriberID END) AS UniqueClicks
FROM _Job j
JOIN _Sent s ON j.JobID = s.JobID
LEFT JOIN _Open o
  ON s.JobID = o.JobID
  AND s.ListID = o.ListID
  AND s.BatchID = o.BatchID
  AND s.SubscriberID = o.SubscriberID
LEFT JOIN _Click c
  ON s.JobID = c.JobID
  AND s.ListID = c.ListID
  AND s.BatchID = c.BatchID
  AND s.SubscriberID = c.SubscriberID
WHERE s.EventDate >= DATEADD(day, -30, GETDATE())
  AND s.TestStormObjID IS NULL
GROUP BY j.JobID, j.EmailName
ORDER BY Sent DESC`,
  },
  {
    id: 'sent-no-bounce-7-days',
    category: 'Deliverability',
    title: 'Sends Without Bounce (7 Days)',
    description: 'Recent sends with no matching bounce event — quick deliverability spot check.',
    sql: `SELECT TOP 1000
  s.SubscriberKey,
  s.JobID,
  s.EventDate
FROM _Sent s
LEFT JOIN _Bounce b
  ON s.JobID = b.JobID
  AND s.ListID = b.ListID
  AND s.BatchID = b.BatchID
  AND s.SubscriberID = b.SubscriberID
WHERE s.EventDate >= DATEADD(day, -7, GETDATE())
  AND s.TestStormObjID IS NULL
  AND b.SubscriberID IS NULL
ORDER BY s.EventDate DESC`,
  },
  {
    id: 're-engagement-no-clicks-60-days',
    category: 'Engagement',
    title: 'Re-engagement: Opens but No Clicks (60 Days)',
    description:
      'Recent openers (60-day window) who never clicked — short-term re-engagement campaign seed.',
    sql: `SELECT DISTINCT TOP 1000
  sub.SubscriberKey,
  sub.EmailAddress
FROM _Open o
JOIN _Subscribers sub ON o.SubscriberKey = sub.SubscriberKey
WHERE o.EventDate >= DATEADD(day, -60, GETDATE())
  AND o.IsUnique = 1
  AND NOT EXISTS (
    SELECT 1
    FROM _Click c
    WHERE c.SubscriberKey = o.SubscriberKey
      AND c.EventDate >= DATEADD(day, -60, GETDATE())
  )
ORDER BY sub.SubscriberKey`,
  },
  {
    id: 'complaint-rate-by-job',
    category: 'Deliverability',
    title: 'Complaint Rate by Job',
    description: 'Spam complaints grouped by JobID against total send volume with complaint rate %.',
    sql: `SELECT TOP 200
  c.JobID,
  COUNT(DISTINCT c.SubscriberID) AS Complaints,
  (
    SELECT COUNT(DISTINCT s.SubscriberID)
    FROM _Sent s
    WHERE s.JobID = c.JobID
  ) AS Sends,
  CAST(COUNT(DISTINCT c.SubscriberID) AS FLOAT)
    / NULLIF((
      SELECT COUNT(DISTINCT s2.SubscriberID)
      FROM _Sent s2
      WHERE s2.JobID = c.JobID
    ), 0) * 100 AS ComplaintRate_Pct
FROM _Complaint c
WHERE c.EventDate >= DATEADD(day, -14, GETDATE())
GROUP BY c.JobID
ORDER BY ComplaintRate_Pct DESC`,
  },
  {
    id: 'automation-success-rate',
    category: 'Automation',
    title: 'Automation Success Rate (7 Days)',
    description: 'Completed vs failed automation instances with status share per automation.',
    sql: `SELECT TOP 200
  counts.AutomationName,
  counts.AutomationCustomerKey,
  counts.AutomationInstanceStatus,
  counts.InstanceCount,
  CAST(counts.InstanceCount AS FLOAT) * 100.0
    / SUM(counts.InstanceCount) OVER (PARTITION BY counts.AutomationName) AS StatusPct
FROM (
  SELECT
    AutomationName,
    AutomationCustomerKey,
    AutomationInstanceStatus,
    COUNT(*) AS InstanceCount
  FROM _AutomationInstance
  WHERE AutomationInstanceStartTime_UTC >= DATEADD(day, -7, GETDATE())
  GROUP BY AutomationName, AutomationCustomerKey, AutomationInstanceStatus
) counts
ORDER BY counts.AutomationName, counts.AutomationInstanceStatus`,
  },
  {
    id: 'journey-entry-audit',
    category: 'Journey',
    title: 'Active Journeys List',
    description: 'Running and draft journeys with version metadata for governance and cleanup reviews.',
    sql: `SELECT TOP 200
  JourneyName,
  VersionID,
  JourneyStatus,
  CreatedDate,
  ModifiedDate
FROM _Journey
WHERE JourneyStatus IN ('Running', 'Draft')
ORDER BY ModifiedDate DESC`,
  },
  {
    id: 'journey-wait-activity-breakdown',
    category: 'Journey',
    title: 'Journey Activity Type Breakdown',
    description: 'Count journey canvas activities by type for a running journey version.',
    sql: `SELECT TOP 200
  j.JourneyName,
  ja.ActivityType,
  COUNT(*) AS ActivityCount
FROM _Journey j
JOIN _JourneyActivity ja ON j.VersionID = ja.VersionID
WHERE j.JourneyStatus = 'Running'
GROUP BY j.JourneyName, ja.ActivityType
ORDER BY j.JourneyName, ActivityCount DESC`,
  },
  {
    id: 'sms-opt-in-status-audit',
    category: 'SMS',
    title: 'SMS Subscription Log Audit',
    description: 'Recent SMS opt-in and opt-out events from _SMSSubscriptionLog.',
    sql: `SELECT TOP 200
  MobileNumber,
  OptInStatusID,
  OptInMethodID,
  OptInDate,
  OptOutStatusID,
  OptOutMethodID,
  OptOutDate
FROM _SMSSubscriptionLog
WHERE OptInDate >= DATEADD(day, -30, GETDATE())
   OR OptOutDate >= DATEADD(day, -30, GETDATE())
ORDER BY OptInDate DESC`,
  },
  {
    id: 'sms-failure-by-status-code',
    category: 'SMS',
    title: 'SMS Failures by Status Code',
    description: 'Undelivered SMS grouped by standard status code for carrier troubleshooting.',
    sql: `SELECT TOP 200
  SMSStandardStatusCodeId,
  MAX(Description) AS StatusDescription,
  COUNT(*) AS FailureCount
FROM _SMSMessageTracking
WHERE Delivered = 0
  AND ActionDateTime >= DATEADD(day, -14, GETDATE())
GROUP BY SMSStandardStatusCodeId
ORDER BY FailureCount DESC`,
  },
  {
    id: 'business-unit-unsubscribes-trend',
    category: 'Deliverability',
    title: 'Business Unit Unsubscribes (30 Days)',
    description: 'BU-level unsubscribe events for compliance and frequency analysis.',
    sql: `SELECT TOP 200
  BusinessUnitID,
  COUNT(*) AS UnsubscribeCount,
  MAX(EventDate) AS LatestUnsubscribe
FROM _BusinessUnitUnsubscribes
WHERE EventDate >= DATEADD(day, -30, GETDATE())
GROUP BY BusinessUnitID
ORDER BY UnsubscribeCount DESC`,
  },
  {
    id: 'open-no-click-lurkers',
    category: 'Engagement',
    title: 'Open but Never Click (90 Days)',
    description:
      'Long-term lurkers (90-day window) with opens but zero clicks — content or CTA friction signal.',
    sql: `SELECT DISTINCT TOP 1000
  sub.SubscriberKey,
  sub.EmailAddress
FROM _Open o
JOIN _Subscribers sub ON o.SubscriberKey = sub.SubscriberKey
WHERE o.EventDate >= DATEADD(day, -90, GETDATE())
  AND o.IsUnique = 1
  AND NOT EXISTS (
    SELECT 1
    FROM _Click c
    WHERE c.SubscriberKey = o.SubscriberKey
      AND c.EventDate >= DATEADD(day, -90, GETDATE())
  )
ORDER BY sub.SubscriberKey`,
  },
  {
    id: 'sent-with-job-email-name',
    category: 'Campaign',
    title: 'Sent with Job Email Name',
    description: 'Correct pattern: never select EmailName from _Sent — join _Job on JobID.',
    sql: `SELECT TOP 1000
  s.SubscriberKey,
  s.EventDate AS SentDate,
  j.EmailName,
  j.EmailSubject
FROM _Sent s
JOIN _Job j ON s.JobID = j.JobID
WHERE s.EventDate >= DATEADD(day, -30, GETDATE())
  AND s.TestStormObjID IS NULL
ORDER BY s.EventDate DESC`,
  },
  {
    id: 'global-unsubscribe-audit',
    category: 'List Hygiene',
    title: 'Global Unsubscribe Audit (30 Days)',
    description: 'Recent global unsubscribes (All Subscribers list) for friction analysis.',
    sql: `SELECT TOP 200
  u.SubscriberKey,
  u.EventDate AS UnsubscribeDate,
  u.JobID,
  u.ListID
FROM _Unsubscribe u
WHERE u.ListID = 2
  AND u.EventDate >= DATEADD(day, -30, GETDATE())
ORDER BY u.EventDate DESC`,
  },
  {
    id: 'multi-send-fatigue-check',
    category: 'Engagement',
    title: 'Multi-Send Fatigue Check',
    description: 'Subscribers receiving 15+ sends in 14 days — frequency cap audit.',
    sql: `SELECT TOP 200
  sub.SubscriberKey,
  sub.EmailAddress,
  sendCounts.SendCount
FROM (
  SELECT
    s.SubscriberKey,
    COUNT(DISTINCT s.JobID) AS SendCount
  FROM _Sent s
  WHERE s.EventDate >= DATEADD(day, -14, GETDATE())
    AND s.TestStormObjID IS NULL
  GROUP BY s.SubscriberKey
  HAVING COUNT(DISTINCT s.JobID) >= 15
) sendCounts
JOIN _Subscribers sub ON sendCounts.SubscriberKey = sub.SubscriberKey
ORDER BY sendCounts.SendCount DESC`,
  },
];
