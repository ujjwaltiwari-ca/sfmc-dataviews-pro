import { sfmcQueryTemplatesExtended } from './queryTemplatesExtended.js';
import type { QueryTemplate } from './queryTemplateTypes.js';

export type { QueryTemplate, QueryTemplateCategory } from './queryTemplateTypes.js';
export { QUERY_TEMPLATE_CATEGORIES } from './queryTemplateTypes.js';

const CORE_TEMPLATES: QueryTemplate[] = [
  {
    id: 'recent-hard-bounces',
    category: 'List Hygiene',
    title: 'Recent Hard Bounces',
    description:
      'Find subscribers who hit a hard bounce in the last 30 days for list hygiene.',
    sql: `-- Child BU: use Ent._Subscribers instead of _Subscribers
SELECT TOP 200
  sub.SubscriberKey,
  sub.EmailAddress,
  b.BounceCategory,
  b.SMTPCode,
  b.EventDate
FROM _Subscribers sub
JOIN _Bounce b ON sub.SubscriberKey = b.SubscriberKey
WHERE LOWER(b.BounceCategory) = 'hard bounce'
  AND b.EventDate >= DATEADD(day, -30, GETDATE())
ORDER BY b.EventDate DESC`,
  },
  {
    id: 'unengaged-ghost-subscribers',
    category: 'Engagement',
    title: "Unengaged 'Ghost' Subscribers",
    description:
      'Identify users sent 10+ emails in the last 90 days with zero recorded opens.',
    sql: `-- Child BU: use Ent._Subscribers instead of _Subscribers
SELECT TOP 500
  sub.SubscriberKey,
  sub.EmailAddress
FROM _Subscribers sub
WHERE EXISTS (
    SELECT 1
    FROM _Sent s
    WHERE s.SubscriberKey = sub.SubscriberKey
      AND s.EventDate >= DATEADD(day, -90, GETDATE())
      AND s.TestStormObjID IS NULL
    GROUP BY s.SubscriberKey
    HAVING COUNT(DISTINCT s.JobID) >= 10
  )
  AND NOT EXISTS (
    SELECT 1
    FROM _Open o
    WHERE o.SubscriberKey = sub.SubscriberKey
      AND o.EventDate >= DATEADD(day, -90, GETDATE())
  )`,
  },
  {
    id: 'recent-automation-failures',
    category: 'Automation',
    title: 'Recent Automation Failures',
    description:
      'Identify Automation Studio tasks that failed in the last 24 hours.',
    sql: `SELECT TOP 200
  AutomationName,
  AutomationCustomerKey,
  AutomationInstanceStartTime_UTC,
  AutomationInstanceEndTime_UTC,
  AutomationInstanceStatus
FROM _AutomationInstance
WHERE AutomationInstanceStatus = 'Error'
  AND AutomationInstanceStartTime_UTC >= DATEADD(hour, -24, GETDATE())
ORDER BY AutomationInstanceStartTime_UTC DESC`,
  },
  {
    id: 'high-friction-unsubscribes',
    category: 'Deliverability',
    title: 'High-Friction Unsubscribes',
    description:
      'Track subscribers who opted out within 24 hours of receiving a specific email job.',
    sql: `SELECT TOP 200
  u.SubscriberKey,
  u.EventDate AS UnsubscribeDate,
  s.EventDate AS SentDate,
  u.JobID
FROM _Unsubscribe u
JOIN _Sent s
  ON u.JobID = s.JobID
  AND u.ListID = s.ListID
  AND u.BatchID = s.BatchID
  AND u.SubscriberID = s.SubscriberID
WHERE u.EventDate >= s.EventDate
  AND u.EventDate <= DATEADD(hour, 24, s.EventDate)
  AND u.EventDate >= DATEADD(day, -30, GETDATE())
ORDER BY u.EventDate DESC`,
  },
  {
    id: 'held-status-audit',
    category: 'List Hygiene',
    title: 'Held Status Audit',
    description:
      "Find 'Held' subscribers along with their last recorded bounce reason to clear delivery blocks.",
    sql: `-- Child BU: use Ent._Subscribers instead of _Subscribers
SELECT TOP 200
  sub.SubscriberKey,
  sub.Status,
  b.SMTPBounceReason,
  b.EventDate AS LastBounceDate
FROM _Subscribers sub
JOIN _Bounce b ON sub.SubscriberKey = b.SubscriberKey
WHERE sub.Status = 'held'
  AND b.EventDate = (
    SELECT MAX(InternalB.EventDate)
    FROM _Bounce InternalB
    WHERE InternalB.SubscriberKey = sub.SubscriberKey
  )
ORDER BY b.EventDate DESC`,
  },
  {
    id: 'spam-complaint-surge',
    category: 'Deliverability',
    title: 'Spam Complaint Surge',
    description:
      'Audit spam complaints received in the last 7 days grouped by email campaign details.',
    sql: `SELECT TOP 200
  c.JobID,
  COUNT(DISTINCT c.SubscriberID) AS TotalComplaints,
  MAX(c.EventDate) AS LatestComplaint
FROM _Complaint c
WHERE c.EventDate >= DATEADD(day, -7, GETDATE())
GROUP BY c.JobID
ORDER BY TotalComplaints DESC`,
  },
  {
    id: 'sms-outbound-failures',
    category: 'SMS',
    title: 'SMS Outbound Failures',
    description:
      'Isolate text messages that returned an undelivered or error state from the gateway.',
    sql: `SELECT TOP 200
  Mobile,
  MessageID,
  CodeID,
  SMSStandardStatusCodeId,
  Description,
  SMSJobID,
  ActionDateTime
FROM _SMSMessageTracking
WHERE Delivered = 0
  AND ActionDateTime >= DATEADD(day, -7, GETDATE())
ORDER BY ActionDateTime DESC`,
  },
  {
    id: 'targeted-campaign-non-openers',
    category: 'Campaign',
    title: 'Targeted Campaign Non-Openers',
    description:
      'Find all subscribers who were sent a specific email Job ID but never recorded an Open event.',
    sql: `-- Child BU: use Ent._Subscribers instead of _Subscribers
SELECT TOP 1000
  sub.SubscriberKey,
  sub.EmailAddress,
  s.JobID,
  s.EventDate AS SentDate
FROM _Sent s
JOIN _Subscribers sub ON s.SubscriberKey = sub.SubscriberKey
LEFT JOIN _Open o
  ON s.JobID = o.JobID
  AND s.ListID = o.ListID
  AND s.BatchID = o.BatchID
  AND s.SubscriberID = o.SubscriberID
WHERE s.JobID = 'YOUR_JOB_ID_HERE'
  AND s.EventDate >= DATEADD(day, -90, GETDATE())
  AND s.TestStormObjID IS NULL
  AND o.SubscriberID IS NULL
ORDER BY s.EventDate DESC`,
  },
  {
    id: 'campaign-non-converters',
    category: 'Campaign',
    title: 'Clickers Who Stayed Subscribed',
    description:
      'Subscribers who clicked a specific Job ID and did not unsubscribe — engaged recipients still on the list.',
    sql: `SELECT TOP 200
  c.SubscriberKey,
  c.LinkName,
  c.LinkContent,
  c.EventDate AS ClickDate
FROM _Click c
WHERE c.JobID = 'YOUR_JOB_ID_HERE'
  AND c.EventDate >= DATEADD(day, -30, GETDATE())
  AND c.IsUnique = 1
  AND NOT EXISTS (
    SELECT 1
    FROM _Unsubscribe u
    WHERE u.JobID = c.JobID
      AND u.ListID = c.ListID
      AND u.BatchID = c.BatchID
      AND u.SubscriberID = c.SubscriberID
  )
ORDER BY c.EventDate DESC`,
  },
  {
    id: 'journey-email-performance-audit',
    category: 'Journey',
    title: 'Journey Activity Unsubscribe Audit',
    description:
      'Rank Journey email activities by unsubscribe volume over the last 30 days (unsubs only — not a full sends/opens/clicks audit).',
    sql: `SELECT TOP 200
  jny.JourneyName,
  ja.ActivityName AS EmailActivityName,
  COUNT(DISTINCT u.SubscriberID) AS TotalUnsubscribes
FROM _Journey jny
JOIN _JourneyActivity ja ON jny.VersionID = ja.VersionID
JOIN _Sent s ON ja.JourneyActivityObjectID = s.TriggererSendDefinitionObjectID
JOIN _Unsubscribe u
  ON s.JobID = u.JobID
  AND s.ListID = u.ListID
  AND s.BatchID = u.BatchID
  AND s.SubscriberID = u.SubscriberID
WHERE ja.JourneyActivityObjectID IS NOT NULL
  AND u.EventDate >= DATEADD(day, -30, GETDATE())
GROUP BY jny.JourneyName, ja.ActivityName
ORDER BY TotalUnsubscribes DESC`,
  },
];

export const sfmcQueryTemplates: QueryTemplate[] = [
  ...CORE_TEMPLATES,
  ...sfmcQueryTemplatesExtended,
];
