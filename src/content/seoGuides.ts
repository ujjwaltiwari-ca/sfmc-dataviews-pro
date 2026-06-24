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
  category: 'Joins' | 'Journey' | 'Performance' | 'Subscribers' | 'Tracking';
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
];

export function getGuideBySlug(slug: string): SeoGuide | undefined {
  return SEO_GUIDES.find((guide) => guide.slug === slug);
}
