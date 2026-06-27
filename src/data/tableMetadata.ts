/** Retention windows and practitioner warnings per SFMC system data view. */

export const TABLE_RETENTION: Readonly<Record<string, string>> = {
  _Sent: '6 months',
  _Open: '6 months',
  _Click: '6 months',
  _Bounce: '6 months',
  _Complaint: '6 months',
  _FTAF: '6 months',
  _SurveyResponse: '6 months',
  _Job: '6 months',
  _Unsubscribe: 'Indefinite',
  _Subscribers: 'Indefinite',
  _ListSubscribers: 'Indefinite',
  _BusinessUnitUnsubscribes: 'Indefinite',
  _EnterpriseAttribute: 'Indefinite',
  _Journey: 'Indefinite',
  _JourneyActivity: 'Indefinite',
  _AutomationInstance: '60 days',
  _AutomationActivityInstance: '60 days',
  _SMSMessageTracking: '6 months',
  _SMSSubscriptionLog: '6 months',
  _UndeliverableSMS: '6 months',
  _MobileAddress: 'Indefinite',
};

export const TABLE_KNOWN_LIMITATIONS: Readonly<Record<string, readonly string[]>> = {
  _Sent: [
    'EmailName is always null — JOIN _Job on JobID to get the email name.',
    'Preview and test sends are included — use TestStormObjID IS NULL to exclude them from production metrics.',
    'Data is retained for approximately 6 months.',
  ],
  _Open: [
    'Includes automated image prefetches from email clients. Use IsUnique = 1 to count unique human opens.',
    'Apple MPP (Mail Privacy Protection) inflates open counts significantly since iOS 15.',
  ],
  _Click: [
    'Use IsUnique = 1 to count unique clicks per subscriber per send, not total raw clicks.',
    'Data is retained for approximately 6 months.',
  ],
  _Bounce: [
    'Join to _Sent on all four engagement keys (JobID, ListID, BatchID, SubscriberID) for send-level bounce analysis.',
    'BounceCategory values include Hard bounce and Soft bounce — filter explicitly for list hygiene.',
    'IsFalseBounce = 1 means a delivery receipt arrived after a bounce was recorded.',
    'Data is retained for approximately 6 months.',
  ],
  _Complaint: [
    'Spam complaints arrive via ISP feedback loops and typically trigger an automatic unsubscribe.',
    'Use the four-key join to _Sent when attributing complaints to a specific deployment.',
    'Pair with _Unsubscribe and _Subscribers.Status for full consent and deliverability analysis.',
    'Data is retained for approximately 6 months.',
  ],
  _Unsubscribe: [
    'Records unsubscribe events, not current subscription status — use _Subscribers or _ListSubscribers for current state.',
    'Join to _Sent on all four engagement keys to identify which send preceded the opt-out.',
    'Data is retained for approximately 6 months.',
  ],
  _BusinessUnitUnsubscribes: [
    'Snapshot of BU-level unsubscribes — not an event log. No EventDate column.',
    'Queryable from the parent account only when enterprise BU-unsubscribe mode is enabled.',
  ],
  _ListSubscribers: [
    'Status reflects current list membership, not status at the time of a historical send.',
    'ListID is part of the primary key — always filter by list when reporting on a specific audience.',
    'Join _Subscribers on SubscriberID for global lifecycle dates and email address.',
  ],
  _JourneyActivity: [
    'Only email activities populate JourneyActivityObjectID — WAIT and DECISION nodes will not join to _Sent.',
    'Filter ActivityType when building send attribution queries to avoid null join rows.',
    'JourneyActivityObjectID maps to TriggererSendDefinitionObjectID on _Sent and _Job.',
  ],
  _AutomationActivityInstance: [
    'JobID is populated only for send-type activities — null for Query, Script, and Import steps.',
    'ActivityType 300 indicates a SQL Query activity; check ActivityInstanceStatusDetails for errors.',
    'Data is retained for approximately 31 days.',
  ],
  _SMSSubscriptionLog: [
    'SubscriptionDefinitionID joins to KeywordID on _SMSMessageTracking for keyword-level opt-in history.',
    'MobileNumber is stored without a + prefix — normalize before comparing to external lists.',
  ],
  _UndeliverableSMS: [
    'Numbers on this view are held from SMS sends after repeated delivery failures.',
    'Join MobileNumber to _SMSMessageTracking.Mobile for send-level failure diagnostics.',
  ],
  _MobileAddress: [
    'MobileConnect contact view — column names require underscore prefixes (e.g. _MobileNumber).',
    'Feature is unsupported by Salesforce but the view may still populate in some accounts.',
  ],
  _PushAddress: [
    'MobilePush device registration records — DeviceID is the primary join key to _PushTag.',
    'Not all accounts have MobilePush enabled; the view may return zero rows.',
  ],
  _PushTag: [
    'Tag assignments for push devices — join to _PushAddress on DeviceID.',
    'Tags are account-specific strings configured in MobilePush administration.',
  ],
  _FTAF: [
    'Forward To A Friend events use TransactionTime instead of EventDate for the event timestamp.',
    'Uses the standard four-key engagement grain (JobID, ListID, BatchID, SubscriberID).',
    'Data is retained for approximately 6 months.',
  ],
  _SurveyResponse: [
    'One row per answer option — pivot or aggregate when reporting at the respondent level.',
    'IsUnique is a Number field on this view, not Boolean — verify before filtering.',
    'Data is retained for approximately 6 months.',
  ],
  _Coupon: [
    'Legacy coupon redemption tracking — many accounts have no rows in this view.',
    'Check row count before building production automations that depend on it.',
  ],
  _SocialNetworkTracking: [
    'Legacy Social Forward tracking — deprecated for most modern SFMC accounts.',
    'Prefer Journey and standard email tracking views for current social attribution.',
  ],
  _SocialNetworkImpressions: [
    'Legacy social impression counts — limited to older Social Forward implementations.',
    'May return zero rows if Social Forward was never enabled in the account.',
  ],
  _ReconcilableDispositionView: [
    'Internal reconciliation view for send disposition — rarely used in practitioner reporting.',
    'Not a substitute for _Sent or SendLog when building campaign metrics.',
  ],
  _MobileLineAddressContactSubscriptionView: [
    'GroupConnect LINE messaging view — only populated when LINE is configured in the account.',
    'Field availability varies by GroupConnect deployment region.',
  ],
  _MobileLineOrphanContactView: [
    'GroupConnect orphan contacts without a linked subscriber — LINE channel only.',
    'Use for hygiene when LINE contacts fail to match All Subscribers.',
  ],
  SendLog: [
    'SendLog is a Data Extension template, not a system Data View — structure must exist in your account.',
    'Composite key is JobID + ListID + BatchID + SubscriberKey — not SubscriberID.',
    'IsTestSend flags test/preview rows on SendLog — use this field here, not on _Sent (which uses TestStormObjID IS NULL).',
    'Preferred for triggered and Journey sends where _Sent lacks journey attribution fields.',
  ],
  _Subscribers: [
    'The Status field reflects current status, not the status at the time of a send.',
    'Use Ent._Subscribers in a parent BU to query across all child BUs.',
  ],
  _Job: [
    'EmailName may differ from what subscribers received if the email was modified after the send.',
    'TriggeredSendExternalKey is null for standard sends — only populated for triggered sends.',
    'Data is retained for approximately 6 months.',
  ],
  _Journey: [
    'Does not reflect Interaction Studio (now Marketing Cloud Personalization) journeys.',
    'Filter on JourneyStatus and VersionID — republished journeys create new version rows.',
  ],
  _AutomationInstance: [
    'Data is retained for approximately 31 days only.',
    'Does not record automations that have never run — only instances of execution.',
  ],
  _EnterpriseAttribute: [
    'Columns are dynamic per tenant. Only the _SubscriberID field is universal — all profile attribute columns vary by account configuration.',
    'Queryable from the parent BU only — use the Ent. prefix in child BU Query Studio.',
  ],
  _SMSMessageTracking: [
    'Mobile numbers are stored in the Mobile column without a + prefix — normalize before comparing to external lists.',
    'Filter CreateDateTime or ActionDateTime early — the view retains data indefinitely and unbounded scans time out.',
    'JBDefinitionID and JBActivityID join to _Journey and _JourneyActivity for Journey SMS attribution.',
  ],
};

export function getTableRetention(tableName: string): string | undefined {
  return TABLE_RETENTION[tableName];
}

export function getKnownLimitations(tableName: string): readonly string[] {
  return TABLE_KNOWN_LIMITATIONS[tableName] ?? [];
}
