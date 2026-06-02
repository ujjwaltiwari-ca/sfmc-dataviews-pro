export interface QueryTemplate {
  id: string;
  title: string;
  description: string;
  sql: string;
}

export const sfmcQueryTemplates: QueryTemplate[] = [
  {
    id: 'recent-hard-bounces',
    title: 'Recent Hard Bounces',
    description:
      'Find subscribers who hit a hard bounce in the last 30 days for list hygiene.',
    sql: `SELECT
  s.SubscriberKey,
  s.EmailAddress,
  b.BounceCategory,
  b.SMTPCode,
  b.EventDate
FROM _Subscribers s
JOIN _Bounce b ON s.SubscriberID = b.SubscriberID
WHERE b.BounceCategory = 'Hard Bounce'
  AND b.EventDate >= DATEADD(day, -30, GETDATE())`,
  },
  {
    id: 'unengaged-ghost-subscribers',
    title: "Unengaged 'Ghost' Subscribers",
    description:
      'Identify users sent 10+ emails in the last 90 days with zero recorded opens.',
    sql: `SELECT
  s.SubscriberKey,
  s.EmailAddress
FROM _Subscribers s
WHERE s.SubscriberID IN (
    SELECT Sent.SubscriberID
    FROM _Sent Sent
    WHERE Sent.EventDate >= DATEADD(day, -90, GETDATE())
    GROUP BY Sent.SubscriberID
    HAVING COUNT(Sent.JobID) >= 10
  )
  AND s.SubscriberID NOT IN (
    SELECT O.SubscriberID
    FROM _Open O
    WHERE O.EventDate >= DATEADD(day, -90, GETDATE())
  )`,
  },
  {
    id: 'recent-automation-failures',
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
    title: 'High-Friction Unsubscribes',
    description:
      'Track subscribers who opted out within 24 hours of receiving a specific email job.',
    sql: `SELECT
  u.SubscriberKey,
  u.EventDate AS UnsubscribeDate,
  s.EventDate AS SentDate,
  u.JobID
FROM _Unsubscribe u
JOIN _Sent s ON u.SubscriberID = s.SubscriberID AND u.JobID = s.JobID
WHERE u.EventDate <= DATEADD(hour, 24, s.EventDate)
  AND u.EventDate >= DATEADD(day, -30, GETDATE())`,
  },
  {
    id: 'held-status-audit',
    title: 'Held Status Audit',
    description:
      "Find 'Held' subscribers along with their last recorded bounce reason to clear delivery blocks.",
    sql: `SELECT
  s.SubscriberKey,
  s.Status,
  b.SMTPBounceReason,
  b.EventDate AS LastBounceDate
FROM _Subscribers s
JOIN _Bounce b ON s.SubscriberID = b.SubscriberID
WHERE s.Status = 'held'
  AND b.EventDate = (
    SELECT MAX(InternalB.EventDate)
    FROM _Bounce InternalB
    WHERE InternalB.SubscriberID = s.SubscriberID
  )`,
  },
  {
    id: 'spam-complaint-surge',
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
    title: 'SMS Outbound Failures',
    description:
      'Isolate text messages that returned an undelivered or error state from the gateway.',
    sql: `SELECT
  Mobile,
  MessageID,
  SMSStandardStatusCodeId,
  SendJobID,
  ActionDateTime
FROM _SMSMessageTracking
WHERE Delivered = 0
  AND ActionDateTime >= DATEADD(day, -7, GETDATE())
ORDER BY ActionDateTime DESC`,
  },
  {
    id: 'targeted-campaign-non-openers',
    title: 'Targeted Campaign Non-Openers',
    description:
      'Find all subscribers who were sent a specific email Job ID but never recorded an Open event.',
    sql: `SELECT
  s.SubscriberKey,
  s.EmailAddress,
  sent.JobID,
  sent.EventDate AS SentDate
FROM _Sent sent
JOIN _Subscribers s ON sent.SubscriberID = s.SubscriberID
LEFT JOIN _Open o ON sent.JobID = o.JobID AND sent.SubscriberID = o.SubscriberID
WHERE sent.JobID = 'YOUR_JOB_ID_HERE'
  AND o.SubscriberID IS NULL`,
  },
  {
    id: 'campaign-non-converters',
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
  AND c.SubscriberID NOT IN (
    -- Exclude based on custom confirmation data extension if applicable
    -- Replace with specific exclusion logic as needed
    SELECT SubscriberID FROM _Unsubscribe WHERE JobID = c.JobID
  )`,
  },
  {
    id: 'journey-email-performance-audit',
    title: 'Journey Email Performance Audit',
    description:
      'Identify which specific email activities within Journeys are triggering the highest unsubscribe volumes.',
    sql: `SELECT
  j.JourneyName,
  ja.ActivityName AS EmailActivityName,
  COUNT(u.SubscriberID) AS TotalUnsubscribes
FROM _Journey j
JOIN _JourneyActivity ja ON j.VersionID = ja.VersionID
JOIN _Unsubscribe u ON ja.JourneyActivityObjectID = u.TriggererSendDefinitionObjectID
GROUP BY j.JourneyName, ja.ActivityName
ORDER BY TotalUnsubscribes DESC`,
  },
];
