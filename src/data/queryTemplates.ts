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
SELECT
  sub.SubscriberKey,
  sub.EmailAddress,
  b.BounceCategory,
  b.SMTPCode,
  b.EventDate
FROM _Subscribers sub
JOIN _Bounce b ON sub.SubscriberKey = b.SubscriberKey
WHERE b.BounceCategory = 'Hard Bounce'
  AND b.EventDate >= DATEADD(day, -30, GETDATE())`,
  },
  {
    id: 'unengaged-ghost-subscribers',
    category: 'Engagement',
    title: "Unengaged 'Ghost' Subscribers",
    description:
      'Identify users sent 10+ emails in the last 90 days with zero recorded opens.',
    sql: `-- Child BU: use Ent._Subscribers instead of _Subscribers
SELECT
  sub.SubscriberKey,
  sub.EmailAddress
FROM _Subscribers sub
WHERE sub.SubscriberKey IN (
    SELECT s.SubscriberKey
    FROM _Sent s
    WHERE s.EventDate >= DATEADD(day, -90, GETDATE())
    GROUP BY s.SubscriberKey
    HAVING COUNT(s.JobID) >= 10
  )
  AND sub.SubscriberKey NOT IN (
    SELECT o.SubscriberKey
    FROM _Open o
    WHERE o.EventDate >= DATEADD(day, -90, GETDATE())
  )`,
  },
  {
    id: 'recent-automation-failures',
    category: 'Automation',
    title: 'Recent Automation Failures',
    description:
      'Identify all Automation Studio tasks that failed or skipped in the last 24 hours.',
    sql: `SELECT
  AutomationName,
  AutomationCustomerKey,
  AutomationInstanceStartTime_UTC,
  AutomationInstanceEndTime_UTC,
  AutomationInstanceStatus
FROM _AutomationInstance
WHERE AutomationInstanceStatus IN ('Error', 'Skipped')
  AND AutomationInstanceStartTime_UTC >= DATEADD(hour, -24, GETDATE())
ORDER BY AutomationInstanceStartTime_UTC DESC`,
  },
  {
    id: 'high-friction-unsubscribes',
    category: 'Deliverability',
    title: 'High-Friction Unsubscribes',
    description:
      'Track subscribers who opted out within 24 hours of receiving a specific email job.',
    sql: `SELECT
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
WHERE u.EventDate <= DATEADD(hour, 24, s.EventDate)
  AND u.EventDate >= DATEADD(day, -30, GETDATE())`,
  },
  {
    id: 'held-status-audit',
    category: 'List Hygiene',
    title: 'Held Status Audit',
    description:
      "Find 'Held' subscribers along with their last recorded bounce reason to clear delivery blocks.",
    sql: `-- Child BU: use Ent._Subscribers instead of _Subscribers
SELECT
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
  )`,
  },
  {
    id: 'spam-complaint-surge',
    category: 'Deliverability',
    title: 'Spam Complaint Surge',
    description:
      'Audit spam complaints received in the last 7 days grouped by email campaign details.',
    sql: `SELECT
  c.JobID,
  COUNT(c.SubscriberID) AS TotalComplaints,
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
    sql: `SELECT
  Mobile,
  MessageID,
  CodeID,
  SMSStandardStatusCodeId,
  Description,
  SendJobID,
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
SELECT
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
  AND o.SubscriberID IS NULL`,
  },
  {
    id: 'campaign-non-converters',
    category: 'Campaign',
    title: 'Campaign Non-Converters',
    description:
      "Isolate subscribers who clicked a link in a specific email Job ID but didn't open or take action elsewhere.",
    sql: `SELECT
  c.SubscriberKey,
  c.LinkName,
  c.LinkContent,
  c.EventDate AS ClickDate
FROM _Click c
WHERE c.JobID = 'YOUR_JOB_ID_HERE'
  AND c.EventDate >= DATEADD(day, -30, GETDATE())
  AND c.SubscriberID NOT IN (
    SELECT u.SubscriberID
    FROM _Unsubscribe u
    WHERE u.JobID = c.JobID
  )`,
  },
  {
    id: 'journey-email-performance-audit',
    category: 'Journey',
    title: 'Journey Email Performance Audit',
    description:
      'Identify which specific email activities within Journeys are triggering the highest unsubscribe volumes.',
    sql: `SELECT
  jny.JourneyName,
  ja.ActivityName AS EmailActivityName,
  COUNT(u.SubscriberID) AS TotalUnsubscribes
FROM _Journey jny
JOIN _JourneyActivity ja ON jny.VersionID = ja.VersionID
JOIN _Unsubscribe u ON ja.JourneyActivityObjectID = u.TriggererSendDefinitionObjectID
WHERE u.EventDate >= DATEADD(day, -30, GETDATE())
GROUP BY jny.JourneyName, ja.ActivityName
ORDER BY TotalUnsubscribes DESC`,
  },
];

export const sfmcQueryTemplates: QueryTemplate[] = [
  ...CORE_TEMPLATES,
  ...sfmcQueryTemplatesExtended,
];
