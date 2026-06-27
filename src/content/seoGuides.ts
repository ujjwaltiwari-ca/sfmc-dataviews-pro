export type GuideSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  sql?: string;
};

export type SeoGuide = {
  slug: string;
  title: string;
  metaDescription: string;
  category: 'Joins' | 'Journey' | 'Performance' | 'Subscribers' | 'Tracking' | 'Deliverability' | 'Automation' | 'Engagement';
  readMinutes: number;
  sections: GuideSection[];
  relatedViews?: { slug: string; name: string }[];
  workspaceDeepLink?: string;
};

export const SEO_GUIDES: SeoGuide[] = [
  {
    slug: 'join-sent-to-open',
    title: 'How to Join _Sent to _Open in SFMC SQL',
    metaDescription:
      'Learn the correct join grain between _Sent and _Open in Salesforce Marketing Cloud Query Studio — JobID, ListID, BatchID, and SubscriberID.',
    category: 'Joins',
    readMinutes: 6,
    relatedViews: [
      { slug: 'sent', name: '_Sent' },
      { slug: 'open', name: '_Open' },
      { slug: 'job', name: '_Job' },
    ],
    workspaceDeepLink: '/?t=_Sent,_Open&sb=1',
    sections: [
      {
        heading: 'Why this join matters',
        paragraphs: [
          '_Sent records every email deployment to a subscriber. _Open records pixel-tracked opens. Analysts join them constantly to calculate open rates, time-to-open, and engagement after send.',
          'Both views share the same engagement event grain — four columns that must match together.',
        ],
      },
      {
        heading: 'The engagement quadrinity',
        bullets: [
          'JobID — the send job',
          'ListID — the list or publication list used',
          'BatchID — the deployment batch',
          'SubscriberID — the recipient subscriber record',
        ],
        paragraphs: [
          'Never join on JobID alone. SFMC allows multiple batches and list contexts within a job; omitting ListID or BatchID can duplicate or drop rows.',
        ],
      },
      {
        heading: 'Example query',
        sql: `SELECT TOP 1000
  s.SubscriberKey,
  s.EventDate AS SentDate,
  o.EventDate AS OpenDate,
  o.IsUnique
FROM _Sent s
INNER JOIN _Open o
  ON s.JobID = o.JobID
  AND s.ListID = o.ListID
  AND s.BatchID = o.BatchID
  AND s.SubscriberID = o.SubscriberID
WHERE s.EventDate >= DATEADD(day, -30, GETDATE())
  AND o.EventDate >= DATEADD(day, -30, GETDATE())
ORDER BY s.EventDate DESC`,
      },
      {
        heading: 'Practitioner tips',
        bullets: [
          'Filter EventDate on both tables early — _Open is high-volume and unbounded scans time out.',
          'Use IsUnique = 1 on _Open when you need first-open metrics per job.',
          'Parent BU queries see child sends; child BU scope may require Ent._Subscribers for profile attributes.',
        ],
      },
    ],
  },
  {
    slug: 'journey-builder-sql-patterns',
    title: 'Journey Builder SQL Patterns with Data Views',
    metaDescription:
      'SQL patterns for _Journey, _JourneyActivity, and email tracking views using TriggererSendDefinitionObjectID in Salesforce Marketing Cloud.',
    category: 'Journey',
    readMinutes: 7,
    relatedViews: [
      { slug: 'journey', name: '_Journey' },
      { slug: 'journeyactivity', name: '_JourneyActivity' },
      { slug: 'sent', name: '_Sent' },
    ],
    workspaceDeepLink: '/?t=_Journey,_JourneyActivity,_Sent&sb=1',
    sections: [
      {
        heading: 'Journey metadata vs. send tracking',
        paragraphs: [
          '_Journey stores version-level journey metadata (name, status, version GUID). _JourneyActivity maps canvas nodes — email steps expose JourneyActivityObjectID, which ties to triggered send definitions on tracking views.',
          'Email sends from Journey Builder appear in _Sent and _Job with TriggererSendDefinitionObjectID populated.',
        ],
      },
      {
        heading: 'Join journey activities to sends',
        sql: `SELECT
  j.JourneyName,
  ja.ActivityName,
  ja.ActivityType,
  COUNT(DISTINCT s.SubscriberKey) AS Sends
FROM _Journey j
INNER JOIN _JourneyActivity ja ON j.VersionID = ja.VersionID
INNER JOIN _Sent s
  ON ja.JourneyActivityObjectID = s.TriggererSendDefinitionObjectID
WHERE j.JourneyStatus = 'Running'
  AND s.EventDate >= DATEADD(day, -14, GETDATE())
GROUP BY j.JourneyName, ja.ActivityName, ja.ActivityType
ORDER BY Sends DESC`,
      },
      {
        heading: 'Common pitfalls',
        bullets: [
          'Journey versions rotate — filter on the active VersionID or recent CreatedDate when journeys are re-published.',
          'Non-email activities (WAIT, DECISION) will not join to _Sent — filter ActivityType or expect null send rows.',
          'Journey data is BU-scoped to where the journey was built.',
        ],
      },
    ],
  },
  {
    slug: 'tracking-view-query-timeouts',
    title: 'Avoiding Query Studio Timeouts on _Open and _Click',
    metaDescription:
      'Practical SFMC SQL patterns to prevent Query Studio timeouts when querying _Open, _Click, and other high-volume tracking Data Views.',
    category: 'Performance',
    readMinutes: 5,
    relatedViews: [
      { slug: 'open', name: '_Open' },
      { slug: 'click', name: '_Click' },
      { slug: 'sent', name: '_Sent' },
    ],
    workspaceDeepLink: '/?t=_Open&sb=1',
    sections: [
      {
        heading: 'Why tracking views are expensive',
        paragraphs: [
          '_Open and _Click are among the highest-row-count Data Views in most accounts. Query Studio and Automation Studio Query Activities have execution limits; unbounded scans on EventDate are the most common timeout cause.',
          '_Open retains six months of data but is among the highest-row-count Data Views — still treat it as a hot table for query performance.',
        ],
      },
      {
        heading: 'Always anchor on EventDate',
        sql: `SELECT TOP 50000
  SubscriberKey, JobID, EventDate, IsUnique
FROM _Open
WHERE EventDate >= DATEADD(day, -7, GETDATE())
  AND JobID = 123456`,
        paragraphs: [
          'Combine a relative date window with JobID or SubscriberKey when possible. The DataViews.pro SQL Sandbox includes a “Limit past 30 days” utility for quick guardrails.',
        ],
      },
      {
        heading: 'Performance checklist',
        bullets: [
          'Push filters into the earliest subquery or JOIN leg — avoid SELECT * from _Open in a nested view.',
          'Prefer TOP with ORDER BY only when sampling; omit ORDER BY on full exports when not required.',
          'Stage results into a Data Extension via Query Activity for downstream joins instead of chaining massive inline joins.',
          'Use IsUnique = 1 to collapse repeat opens when unique metrics are the goal.',
        ],
      },
    ],
  },
  {
    slug: 'subscribers-ent-prefix-child-bu',
    title: '_Subscribers vs Ent._Subscribers in Child Business Units',
    metaDescription:
      'When to query _Subscribers versus Ent._Subscribers in Salesforce Marketing Cloud child business unit SQL.',
    category: 'Subscribers',
    readMinutes: 4,
    relatedViews: [
      { slug: 'subscribers', name: '_Subscribers' },
      { slug: 'listsubscribers', name: '_ListSubscribers' },
    ],
    workspaceDeepLink: '/?t=_Subscribers&sb=1',
    sections: [
      {
        heading: 'Enterprise subscriber scope',
        paragraphs: [
          '_Subscribers reflects the All Subscribers list at the enterprise level. In a child business unit, profile sends and automations often need Ent._Subscribers (enterprise prefix) to resolve subscriber attributes visible from the parent context.',
          'If your query runs in a child BU and returns unexpected subscriber counts, check whether Ent. prefix is required.',
        ],
      },
      {
        heading: 'Child BU hygiene query',
        sql: `-- Run in child BU Query Studio
SELECT TOP 100
  sub.SubscriberKey,
  sub.EmailAddress,
  sub.Status,
  sub.DateJoined
FROM Ent._Subscribers sub
WHERE sub.Status = 'active'
  AND sub.DateJoined >= DATEADD(day, -30, GETDATE())`,
      },
      {
        heading: 'Pair with list membership',
        paragraphs: [
          'Use _ListSubscribers for list-level status; use _Subscribers or Ent._Subscribers for global subscriber status and lifecycle dates. Join on SubscriberID or SubscriberKey depending on grain.',
        ],
      },
    ],
  },
  {
    slug: 'unique-opens-and-clicks',
    title: 'Using IsUnique on _Open and _Click',
    metaDescription:
      'Understand the IsUnique flag on SFMC _Open and _Click Data Views for first-event metrics versus total event counts.',
    category: 'Tracking',
    readMinutes: 4,
    relatedViews: [
      { slug: 'open', name: '_Open' },
      { slug: 'click', name: '_Click' },
    ],
    workspaceDeepLink: '/?t=_Open,_Click&sb=1',
    sections: [
      {
        heading: 'What IsUnique means',
        paragraphs: [
          'IsUnique = 1 indicates the first open or first click a subscriber recorded for that send job (at the engagement grain). Total opens/clicks include repeats — critical distinction for rate denominators.',
        ],
      },
      {
        heading: 'Unique open rate example',
        sql: `SELECT
  s.JobID,
  COUNT(DISTINCT s.SubscriberKey) AS Sent,
  SUM(CASE WHEN o.IsUnique = 1 THEN 1 ELSE 0 END) AS UniqueOpens
FROM _Sent s
LEFT JOIN _Open o
  ON s.JobID = o.JobID
  AND s.ListID = o.ListID
  AND s.BatchID = o.BatchID
  AND s.SubscriberID = o.SubscriberID
WHERE s.EventDate >= DATEADD(day, -30, GETDATE())
GROUP BY s.JobID`,
      },
      {
        heading: 'Reporting guidance',
        bullets: [
          'Use IsUnique for standard campaign open/click rates.',
          'Omit IsUnique when analyzing repeat engagement or time-between-opens.',
          'The SQL Sandbox can inject unique-event predicates when selected tables support them.',
        ],
      },
    ],
  },
  {
    slug: 'join-sent-to-click',
    title: 'How to Join _Sent to _Click in SFMC SQL',
    metaDescription:
      'Correct four-key join between _Sent and _Click in Salesforce Marketing Cloud Query Studio — JobID, ListID, BatchID, and SubscriberID with date filters.',
    category: 'Joins',
    readMinutes: 6,
    relatedViews: [
      { slug: 'sent', name: '_Sent' },
      { slug: 'click', name: '_Click' },
      { slug: 'job', name: '_Job' },
    ],
    workspaceDeepLink: '/?t=_Sent,_Click&sb=1',
    sections: [
      {
        heading: 'Click tracking grain',
        paragraphs: [
          '_Click records link clicks in email sends. Like _Open, each row sits at the engagement event grain — the same four keys that tie a subscriber to a specific deployment batch within a job.',
          'Analysts join _Sent to _Click to measure click-through rate, time-to-click, and link-level engagement after send.',
        ],
      },
      {
        heading: 'Four-key join pattern',
        sql: `SELECT TOP 1000
  s.SubscriberKey,
  s.EventDate AS SentDate,
  c.EventDate AS ClickDate,
  c.URL,
  c.IsUnique
FROM _Sent s
INNER JOIN _Click c
  ON s.JobID = c.JobID
  AND s.ListID = c.ListID
  AND s.BatchID = c.BatchID
  AND s.SubscriberID = c.SubscriberID
WHERE s.EventDate >= DATEADD(day, -30, GETDATE())
  AND c.EventDate >= DATEADD(day, -30, GETDATE())
ORDER BY c.EventDate DESC`,
      },
      {
        heading: 'Practitioner tips',
        bullets: [
          'Filter EventDate on both legs — _Click volume rivals _Open in many accounts.',
          'Use IsUnique = 1 when reporting first-click metrics per send job.',
          'Join _Job when you need email name or subject alongside click URLs.',
        ],
      },
    ],
  },
  {
    slug: 'join-sent-to-bounce',
    title: 'How to Join _Sent to _Bounce for Deliverability Audits',
    metaDescription:
      'Join _Sent to _Bounce in SFMC SQL using SubscriberKey or the four engagement keys — patterns for hard bounce and soft bounce deliverability analysis.',
    category: 'Deliverability',
    readMinutes: 5,
    relatedViews: [
      { slug: 'sent', name: '_Sent' },
      { slug: 'bounce', name: '_Bounce' },
      { slug: 'subscribers', name: '_Subscribers' },
    ],
    workspaceDeepLink: '/?t=_Sent,_Bounce&sb=1',
    sections: [
      {
        heading: 'Two valid join paths',
        paragraphs: [
          '_Bounce can join to _Sent on the four engagement keys (JobID, ListID, BatchID, SubscriberID) when you need bounces tied to a specific deployment.',
          'For subscriber-level bounce history independent of a single send, join on SubscriberKey instead.',
        ],
      },
      {
        heading: 'Send-level bounce audit',
        sql: `SELECT
  s.JobID,
  s.SubscriberKey,
  s.EventDate AS SentDate,
  b.EventDate AS BounceDate,
  b.BounceCategory,
  b.SMTPCode
FROM _Sent s
INNER JOIN _Bounce b
  ON s.JobID = b.JobID
  AND s.ListID = b.ListID
  AND s.BatchID = b.BatchID
  AND s.SubscriberID = b.SubscriberID
WHERE b.BounceCategory = 'Hard bounce'
  AND b.EventDate >= DATEADD(day, -30, GETDATE())`,
      },
      {
        heading: 'Deliverability checklist',
        bullets: [
          'Separate hard vs. soft bounces — hard bounces often trigger auto-unsubscribe.',
          'Cross-check _Subscribers.Status after hard bounces to confirm list hygiene.',
          'In child BUs, profile attributes may require Ent._Subscribers.',
        ],
      },
    ],
  },
  {
    slug: 'engagement-four-key-grain',
    title: 'The Four-Key Engagement Grain in SFMC Tracking Views',
    metaDescription:
      'Understand JobID, ListID, BatchID, and SubscriberID — the engagement quadrinity required for correct joins between _Sent, _Open, _Click, and _Bounce.',
    category: 'Joins',
    readMinutes: 5,
    relatedViews: [
      { slug: 'sent', name: '_Sent' },
      { slug: 'open', name: '_Open' },
      { slug: 'click', name: '_Click' },
    ],
    workspaceDeepLink: '/?t=_Sent,_Open,_Click&sb=1',
    sections: [
      {
        heading: 'Why four keys, not one',
        paragraphs: [
          'SFMC tracking views share a common event grain. JobID alone is insufficient — a single job can deploy across multiple lists and batches. Omitting ListID or BatchID produces duplicate rows or dropped matches.',
          'SubscriberID identifies the recipient within that deployment context. Together, the four keys uniquely identify a send event and its downstream opens, clicks, and bounces.',
        ],
      },
      {
        heading: 'All four keys in every tracking join',
        bullets: [
          'JobID — the send job identifier from _Job',
          'ListID — the list or publication list used in deployment',
          'BatchID — the batch within the job run',
          'SubscriberID — the subscriber record receiving the send',
        ],
      },
      {
        heading: 'Template join block',
        sql: `FROM _Sent s
INNER JOIN _Open o
  ON s.JobID = o.JobID
  AND s.ListID = o.ListID
  AND s.BatchID = o.BatchID
  AND s.SubscriberID = o.SubscriberID`,
        paragraphs: [
          'Reuse this ON clause pattern for _Click and _Bounce when joining back to _Sent. DataViews.pro Pathfinder generates these joins automatically when you select related tracking views.',
        ],
      },
    ],
  },
  {
    slug: 're-engagement-non-openers',
    title: 'Re-Engagement SQL: Finding Non-Openers After Send',
    metaDescription:
      'SFMC SQL pattern to identify subscribers who received an email but did not open — re-engagement and win-back campaign audience building.',
    category: 'Engagement',
    readMinutes: 5,
    relatedViews: [
      { slug: 'sent', name: '_Sent' },
      { slug: 'open', name: '_Open' },
      { slug: 'subscribers', name: '_Subscribers' },
    ],
    workspaceDeepLink: '/?t=_Sent,_Open,_Subscribers&sb=1',
    sections: [
      {
        heading: 'The non-opener pattern',
        paragraphs: [
          'Re-engagement journeys often target subscribers who received a send but never opened. Use a LEFT JOIN from _Sent to _Open on the four keys, then filter where no open exists.',
          'Add _Subscribers to exclude unsubscribed or bounced profiles before export to a Data Extension.',
        ],
      },
      {
        heading: 'Non-openers for a recent job',
        sql: `SELECT DISTINCT
  s.SubscriberKey,
  sub.EmailAddress,
  s.JobID,
  s.EventDate AS SentDate
FROM _Sent s
INNER JOIN _Subscribers sub ON s.SubscriberKey = sub.SubscriberKey
LEFT JOIN _Open o
  ON s.JobID = o.JobID
  AND s.ListID = o.ListID
  AND s.BatchID = o.BatchID
  AND s.SubscriberID = o.SubscriberID
WHERE s.EventDate >= DATEADD(day, -14, GETDATE())
  AND o.SubscriberID IS NULL
  AND sub.Status = 'active'`,
      },
      {
        heading: 'Operational notes',
        bullets: [
          'Replace the date window with your re-engagement lookback policy.',
          'Consider IsUnique on _Open if you only care about first-open absence.',
          'Stage results to a DE before triggering a Journey entry event.',
        ],
      },
    ],
  },
  {
    slug: 'exclude-test-sends-filter',
    title: 'Excluding Test Sends from _Sent Queries',
    metaDescription:
      'Filter test and preview sends out of SFMC _Sent reporting using Category or test-send patterns — keep production metrics clean.',
    category: 'Tracking',
    readMinutes: 4,
    relatedViews: [
      { slug: 'sent', name: '_Sent' },
      { slug: 'job', name: '_Job' },
    ],
    workspaceDeepLink: '/?t=_Sent,_Job&sb=1',
    sections: [
      {
        heading: 'Why test sends pollute metrics',
        paragraphs: [
          'Preview and test sends appear in _Sent alongside production deployments. Including them inflates send counts and distorts open and click rates.',
          'Join _Job to access send classification metadata, or filter known test subscriber keys used by your team.',
        ],
      },
      {
        heading: 'Production sends only',
        sql: `SELECT
  s.JobID,
  COUNT(DISTINCT s.SubscriberKey) AS ProductionSends
FROM _Sent s
INNER JOIN _Job j ON s.JobID = j.JobID
WHERE s.EventDate >= DATEADD(day, -30, GETDATE())
  AND j.EmailName NOT LIKE '%test%'
  AND j.EmailName NOT LIKE '%preview%'
GROUP BY s.JobID`,
      },
      {
        heading: 'Sandbox utility',
        paragraphs: [
          'DataViews.pro includes an "Exclude test sends" utility toggle that injects common test-send predicates when _Sent is in your selection.',
        ],
      },
    ],
  },
  {
    slug: 'automation-studio-query-patterns',
    title: 'Automation Studio Query Activity Patterns',
    metaDescription:
      'SQL patterns for _AutomationInstance, _AutomationActivityInstance, and _AutomationTaskInstance — monitoring automations with SFMC Data Views.',
    category: 'Automation',
    readMinutes: 6,
    relatedViews: [
      { slug: 'automationinstance', name: '_AutomationInstance' },
      { slug: 'automationactivityinstance', name: '_AutomationActivityInstance' },
    ],
    workspaceDeepLink: '/?t=_AutomationInstance,_AutomationActivityInstance&sb=1',
    sections: [
      {
        heading: 'Automation audit hierarchy',
        paragraphs: [
          '_AutomationInstance tracks each automation run. _AutomationActivityInstance drills into individual activities (Query, Script, Email). _AutomationTaskInstance covers task-level detail within an activity.',
          'Use these views to diagnose failed query activities, long-running automations, and SLA breaches.',
        ],
      },
      {
        heading: 'Recent automation failures',
        sql: `SELECT TOP 100
  ai.AutomationName,
  ai.StartTime,
  ai.Status,
  aai.ActivityName,
  aai.Status AS ActivityStatus
FROM _AutomationInstance ai
INNER JOIN _AutomationActivityInstance aai
  ON ai.MemberID = aai.MemberID
WHERE ai.StartTime >= DATEADD(day, -7, GETDATE())
  AND (ai.Status <> 'Complete' OR aai.Status <> 'Complete')
ORDER BY ai.StartTime DESC`,
      },
      {
        heading: 'Practitioner tips',
        bullets: [
          'Filter StartTime early — automation instance tables grow with every scheduled run.',
          'Pair with _Sent or DE row counts to validate query activity output volume.',
          'MemberID links instances within the same automation execution.',
        ],
      },
    ],
  },
  {
    slug: 'list-subscriber-status-audit',
    title: 'List Membership and Status Audit with _ListSubscribers',
    metaDescription:
      'Audit active, unsubscribed, and bounced list members using _ListSubscribers joined to _Subscribers in SFMC SQL.',
    category: 'Subscribers',
    readMinutes: 5,
    relatedViews: [
      { slug: 'listsubscribers', name: '_ListSubscribers' },
      { slug: 'subscribers', name: '_Subscribers' },
      { slug: 'list', name: '_List' },
    ],
    workspaceDeepLink: '/?t=_ListSubscribers,_Subscribers,_List&sb=1',
    sections: [
      {
        heading: 'List vs. global subscriber status',
        paragraphs: [
          '_ListSubscribers holds list-level membership and status. _Subscribers reflects the All Subscribers list at enterprise scope. A subscriber can be active globally but unsubscribed on a specific list.',
          'Join both when building hygiene reports that respect list context.',
        ],
      },
      {
        heading: 'Active members on a list',
        sql: `SELECT
  l.ListName,
  ls.SubscriberKey,
  ls.Status AS ListStatus,
  sub.Status AS GlobalStatus,
  ls.DateJoined
FROM _ListSubscribers ls
INNER JOIN _List l ON ls.ListID = l.ID
INNER JOIN _Subscribers sub ON ls.SubscriberID = sub.SubscriberID
WHERE ls.Status = 'active'
  AND sub.Status = 'active'
  AND ls.DateJoined >= DATEADD(day, -30, GETDATE())`,
      },
      {
        heading: 'Hygiene use cases',
        bullets: [
          'Find globally active subscribers unsubscribed on a marketing list.',
          'Identify stale list members who have not received a send recently.',
          'In child BUs, use Ent._Subscribers when global status is required.',
        ],
      },
    ],
  },
  {
    slug: 'join-sent-to-unsubscribe',
    title: 'Joining _Sent to _Unsubscribe for Opt-Out Analysis',
    metaDescription:
      'SFMC SQL to correlate email sends with unsubscribe events — four-key join pattern and post-send opt-out reporting.',
    category: 'Tracking',
    readMinutes: 5,
    relatedViews: [
      { slug: 'sent', name: '_Sent' },
      { slug: 'unsubscribe', name: '_Unsubscribe' },
      { slug: 'job', name: '_Job' },
    ],
    workspaceDeepLink: '/?t=_Sent,_Unsubscribe&sb=1',
    sections: [
      {
        heading: 'Post-send unsubscribe analysis',
        paragraphs: [
          '_Unsubscribe records list-level opt-out events. Join to _Sent on the four engagement keys to identify which deployment preceded an unsubscribe — critical for deliverability and content audits.',
        ],
      },
      {
        heading: 'Unsubscribes within 24 hours of send',
        sql: `SELECT
  s.JobID,
  j.EmailName,
  s.SubscriberKey,
  s.EventDate AS SentDate,
  u.EventDate AS UnsubscribeDate
FROM _Sent s
INNER JOIN _Unsubscribe u
  ON s.JobID = u.JobID
  AND s.ListID = u.ListID
  AND s.BatchID = u.BatchID
  AND s.SubscriberID = u.SubscriberID
INNER JOIN _Job j ON s.JobID = j.JobID
WHERE u.EventDate >= DATEADD(day, -30, GETDATE())
  AND DATEDIFF(hour, s.EventDate, u.EventDate) <= 24
ORDER BY u.EventDate DESC`,
      },
      {
        heading: 'Reporting guidance',
        bullets: [
          'High same-day unsubscribes may signal frequency or relevance issues.',
          'Filter by JobID when auditing a specific campaign deployment.',
          'Combine with _Complaint for full deliverability friction picture.',
        ],
      },
    ],
  },
];

export function getGuideBySlug(slug: string): SeoGuide | undefined {
  return SEO_GUIDES.find((guide) => guide.slug === slug);
}
