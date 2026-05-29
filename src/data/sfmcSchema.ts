export interface DataViewField {
  name: string;
  type: 'Text' | 'Number' | 'Date' | 'Boolean' | 'Decimal';
  length?: number;
  isPrimaryKey: boolean;
  isNullable: boolean;
  description: string;
  relatesTo?: { table: string; field: string }[];
}

export type DataViewCategory =
  | 'Subscribers'
  | 'Sending'
  | 'Tracking'
  | 'Subscription'
  | 'Journey'
  | 'Automation'
  | 'Mobile'
  | 'GroupConnect'
  | 'Social'
  | 'Other';

export interface DataViewTable {
  name: string;
  description: string;
  category: DataViewCategory;
  fields: DataViewField[];
}

type FieldRelation = NonNullable<DataViewField['relatesTo']>[number];

type FieldOptions = {
  length?: number;
  isPrimaryKey?: boolean;
  isNullable?: boolean;
  relatesTo?: FieldRelation[];
};

const rel = (table: string, field: string): FieldRelation => ({ table, field });

/** Standard email engagement join keys (Job + Sent). */
const ENGAGEMENT_JOB: FieldRelation[] = [rel('_Job', 'JobID'), rel('_Sent', 'JobID')];

/** Subscriber ID joins for engagement and subscriber tables. */
const ENGAGEMENT_SUBSCRIBER_ID: FieldRelation[] = [
  rel('_Subscribers', 'SubscriberID'),
  rel('_Sent', 'SubscriberID'),
];

/** SubscriberKey joins for engagement and subscriber tables. */
const ENGAGEMENT_SUBSCRIBER_KEY: FieldRelation[] = [
  rel('_Subscribers', 'SubscriberKey'),
  rel('_Sent', 'SubscriberKey'),
];

/** List context for sends and list membership. */
const ENGAGEMENT_LIST: FieldRelation[] = [rel('_ListSubscribers', 'ListID')];

/** Journey version lineage. */
const JOURNEY_VERSION: FieldRelation[] = [rel('_Journey', 'VersionID')];

/** Journey canvas activity node. */
const JOURNEY_ACTIVITY: FieldRelation[] = [rel('_JourneyActivity', 'ActivityID')];

/** Triggered send definition bridge from Journey Builder email activities. */
const JOURNEY_TRIGGER_SEND: FieldRelation[] = [
  rel('_Sent', 'TriggererSendDefinitionObjectID'),
  rel('_Open', 'TriggererSendDefinitionObjectID'),
  rel('_Click', 'TriggererSendDefinitionObjectID'),
  rel('_Bounce', 'TriggererSendDefinitionObjectID'),
  rel('_Unsubscribe', 'TriggererSendDefinitionObjectID'),
  rel('_Complaint', 'TriggererSendDefinitionObjectID'),
  rel('_FTAF', 'TriggererSendDefinitionObjectID'),
  rel('_SurveyResponse', 'TriggererSendDefinitionObjectID'),
];

/** Automation run instance. */
const AUTOMATION_INSTANCE: FieldRelation[] = [
  rel('_AutomationInstance', 'AutomationInstanceID'),
];

function field(
  name: string,
  type: DataViewField['type'],
  description: string,
  options: FieldOptions = {},
): DataViewField {
  return {
    name,
    type,
    description,
    isPrimaryKey: options.isPrimaryKey ?? false,
    isNullable: options.isNullable ?? false,
    ...(options.length !== undefined ? { length: options.length } : {}),
    ...(options.relatesTo !== undefined ? { relatesTo: options.relatesTo } : {}),
  };
}

/** Composite engagement event keys shared by Sent, Open, Click, Bounce, etc. */
function engagementEventFields(eventDateField: string, eventDateDescription: string): DataViewField[] {
  return [
    field('AccountID', 'Number', 'Parent account ID (MID).'),
    field('OYBAccountID', 'Number', 'Child Business Unit MID that owns the row; null on parent BU queries.', {
      isNullable: true,
    }),
    field('JobID', 'Number', 'Email send job ID.', { isPrimaryKey: true, relatesTo: ENGAGEMENT_JOB }),
    field('ListID', 'Number', 'List ID used in the send.', {
      isPrimaryKey: true,
      relatesTo: ENGAGEMENT_LIST,
    }),
    field('BatchID', 'Number', 'Batch ID for multi-wave sends.', { isPrimaryKey: true }),
    field('SubscriberID', 'Number', 'Subscriber record ID.', {
      isPrimaryKey: true,
      relatesTo: ENGAGEMENT_SUBSCRIBER_ID,
    }),
    field('SubscriberKey', 'Text', 'Subscriber key identifier.', {
      length: 254,
      relatesTo: ENGAGEMENT_SUBSCRIBER_KEY,
    }),
    field(eventDateField, 'Date', eventDateDescription),
    field('Domain', 'Text', 'Domain associated with the event.', { length: 128 }),
    field('TriggererSendDefinitionObjectID', 'Text', 'Triggered send definition object ID.', {
      length: 36,
      isNullable: true,
      relatesTo: JOURNEY_TRIGGER_SEND,
    }),
    field('TriggeredSendCustomerKey', 'Text', 'Triggered send customer key.', {
      length: 36,
      isNullable: true,
    }),
  ];
}

export const sfmcDataViews: DataViewTable[] = [
  // ─── Subscribers ───────────────────────────────────────────────────────────
  {
    name: '_Subscribers',
    description:
      'All Subscribers list: status, email, and lifecycle dates. Enterprise-level; use Ent._Subscribers from child BUs. No six-month retention limit.',
    category: 'Subscribers',
    fields: [
      field('SubscriberID', 'Number', 'Unique subscriber record ID.', { isPrimaryKey: true }),
      field('DateUndeliverable', 'Date', 'Date email was returned undeliverable.', { isNullable: true }),
      field('DateJoined', 'Date', 'Date the subscriber joined.', { isNullable: true }),
      field('DateUnsubscribed', 'Date', 'Date the subscriber unsubscribed.', { isNullable: true }),
      field('Domain', 'Text', 'Email domain of the subscriber.', { length: 254, isNullable: true }),
      field('EmailAddress', 'Text', 'Subscriber email address.', { length: 254 }),
      field('BounceCount', 'Number', 'Total bounces accrued by the subscriber.'),
      field('SubscriberKey', 'Text', 'Alternate subscriber identifier; defaults to email.', { length: 254 }),
      field('SubscriberType', 'Text', 'Subscriber type (e.g. ExactTarget, Salesforce Contact).', {
        length: 100,
      }),
      field('Status', 'Text', 'Subscription status: active, held, unsubscribed, or bounced.', {
        length: 12,
        isNullable: true,
      }),
      field('Locale', 'Number', 'Locale code for the subscriber.', { isNullable: true }),
    ],
  },
  {
    name: '_EnterpriseAttribute',
    description:
      'Enterprise 2.0 profile attributes from Email Studio. Parent BU only (Ent. prefix). Dynamic profile columns are added when attributes are created; only _SubscriberID is fixed.',
    category: 'Subscribers',
    fields: [
      field('_SubscriberID', 'Number', 'Subscriber ID; underscore prefix is required in queries.', {
        isPrimaryKey: true,
        relatesTo: [rel('_Subscribers', 'SubscriberID')],
      }),
    ],
  },
  {
    name: '_ListSubscribers',
    description:
      'Current list and publication list membership and status for subscribers. No six-month retention limit.',
    category: 'Subscribers',
    fields: [
      field('AddedBy', 'Number', 'User or process ID that added the subscriber.'),
      field('AddMethod', 'Text', 'How the subscriber was added (Import, API, WebCollect, etc.).', {
        length: 17,
      }),
      field('CreatedDate', 'Date', 'Date added to the list.', { isNullable: true }),
      field('DateUnsubscribed', 'Date', 'Date unsubscribed from the list.', { isNullable: true }),
      field('EmailAddress', 'Text', 'Subscriber email address.', { length: 254, isNullable: true }),
      field('ListID', 'Number', 'List ID.', {
        isPrimaryKey: true,
        relatesTo: ENGAGEMENT_LIST,
      }),
      field('ListName', 'Text', 'List name.', { length: 50, isNullable: true }),
      field('ListType', 'Text', 'List type: List, Group, Publication list, Suppression list, etc.', {
        length: 16,
      }),
      field('Status', 'Text', 'Subscriber status on this list.', { length: 12, isNullable: true }),
      field('SubscriberID', 'Number', 'Subscriber record ID.', {
        isPrimaryKey: true,
        relatesTo: [rel('_Subscribers', 'SubscriberID')],
      }),
      field('SubscriberKey', 'Text', 'Subscriber key.', {
        length: 254,
        isNullable: true,
        relatesTo: [rel('_Subscribers', 'SubscriberKey')],
      }),
      field('SubscriberType', 'Text', 'Subscriber type.', { length: 100, isNullable: true }),
    ],
  },
  {
    name: '_BusinessUnitUnsubscribes',
    description:
      'Contacts currently unsubscribed at the Business Unit level (snapshot, not event log). Parent account queries only for enterprise BU-unsubscribe mode.',
    category: 'Subscription',
    fields: [
      field('BusinessUnitID', 'Number', 'Business Unit account ID (MID).', { isPrimaryKey: true }),
      field('SubscriberID', 'Number', 'Subscriber record ID.', {
        isPrimaryKey: true,
        relatesTo: [rel('_Subscribers', 'SubscriberID')],
      }),
      field('SubscriberKey', 'Text', 'Subscriber key.', {
        length: 254,
        relatesTo: [rel('_Subscribers', 'SubscriberKey')],
      }),
      field('UnsubDateUTC', 'Date', 'BU unsubscribe timestamp in UTC.', { isNullable: true }),
      field('UnsubReason', 'Text', 'Administrator-configured unsubscribe reason.', {
        length: 100,
        isNullable: true,
      }),
    ],
  },

  // ─── Sending ─────────────────────────────────────────────────────────────
  {
    name: '_Job',
    description:
      'Email send job metadata (subject, from, classification). Scoped to the BU where the query runs. Six-month retention.',
    category: 'Sending',
    fields: [
      field('JobID', 'Number', 'Unique email send job ID.', { isPrimaryKey: true }),
      field('EmailID', 'Number', 'Email asset ID.', { isNullable: true }),
      field('AccountID', 'Number', 'Account MID that performed the job.', { isNullable: true }),
      field('AccountUserID', 'Number', 'User ID that performed the job.', { isNullable: true }),
      field('FromName', 'Text', 'From name in the send.', { length: 130, isNullable: true }),
      field('FromEmail', 'Text', 'From email address.', { length: 100, isNullable: true }),
      field('SchedTime', 'Date', 'Scheduled send time.', { isNullable: true }),
      field('PickupTime', 'Date', 'Time Marketing Cloud started processing the job.', { isNullable: true }),
      field('DeliveredTime', 'Date', 'Time the send completed.', { isNullable: true }),
      field('EventID', 'Text', 'Job event ID.', { length: 50, isNullable: true }),
      field('IsMultipart', 'Boolean', 'Whether the job was sent as multipart MIME.'),
      field('JobType', 'Text', 'Job type.', { length: 50, isNullable: true }),
      field('JobStatus', 'Text', 'Job status.', { length: 50, isNullable: true }),
      field('ModifiedBy', 'Number', 'User who modified the job.', { isNullable: true }),
      field('ModifiedDate', 'Date', 'Job modification date.', { isNullable: true }),
      field('EmailName', 'Text', 'Email name.', { length: 100, isNullable: true }),
      field('EmailSubject', 'Text', 'Email subject line.', { length: 200, isNullable: true }),
      field('IsWrapped', 'Boolean', 'Whether links were wrapped for tracking.'),
      field('TestEmailAddr', 'Text', 'Test email address used.', { length: 100, isNullable: true }),
      field('Category', 'Text', 'Job category.', { length: 100 }),
      field('BccEmail', 'Text', 'BCC email address.', { length: 100, isNullable: true }),
      field('OriginalSchedTime', 'Date', 'Originally scheduled time.', { isNullable: true }),
      field('CreatedDate', 'Date', 'Job creation date.'),
      field('CharacterSet', 'Text', 'Character set used in the job.', { length: 50, isNullable: true }),
      field('IPAddress', 'Text', 'Legacy field; always null.', { length: 50, isNullable: true }),
      field('SalesForceTotalSubscriberCount', 'Number', 'Total Salesforce subscribers in the job.'),
      field('SalesForceErrorSubscriberCount', 'Number', 'Salesforce subscribers that errored.'),
      field('SendType', 'Text', 'Send type.', { length: 50 }),
      field('DynamicEmailSubject', 'Text', 'Dynamic subject if used.', { length: 200, isNullable: true }),
      field('SuppressTracking', 'Boolean', 'Whether tracking was suppressed.'),
      field('SendClassificationType', 'Text', 'Send classification type.', { length: 50, isNullable: true }),
      field('SendClassification', 'Text', 'Send classification name.', { length: 200, isNullable: true }),
      field('ResolveLinksWithCurrentData', 'Boolean', 'Whether links resolved with current data.'),
      field('EmailSendDefinition', 'Text', 'Email send definition name.', { length: 200, isNullable: true }),
      field('DeduplicateByEmail', 'Boolean', 'Whether deduplication used email addresses.'),
      field('TriggererSendDefinitionObjectID', 'Text', 'Triggered send definition object ID.', {
        length: 36,
        isNullable: true,
        relatesTo: JOURNEY_TRIGGER_SEND,
      }),
      field('TriggeredSendCustomerKey', 'Text', 'Triggered send customer key.', {
        length: 36,
        isNullable: true,
      }),
    ],
  },
  {
    name: '_Sent',
    description:
      'Per-subscriber email send events. Parent BU sees all child BU sends. Six-month retention; updates asynchronously.',
    category: 'Sending',
    fields: engagementEventFields('EventDate', 'Timestamp when the send occurred.'),
  },
  {
    name: '_ReconcilableDispositionView',
    description:
      'Final delivery disposition for transactional sends using Sendable Reconcilable Data Extension template. Requires transactional reconciliation configuration.',
    category: 'Sending',
    fields: [
      field('JobId', 'Number', 'Email or SMS job ID.', {
        isPrimaryKey: true,
        relatesTo: ENGAGEMENT_JOB,
      }),
      field('Channel', 'Number', 'Channel identifier (Email or SMS).'),
      field('Disposition', 'Number', 'Final delivery disposition status.'),
      field('MessageKey', 'Text', 'Unique transactional message key.', {
        isPrimaryKey: true,
        length: 255,
      }),
      field('SubscriberKey', 'Text', 'Subscriber key.', {
        length: 254,
        relatesTo: ENGAGEMENT_SUBSCRIBER_KEY,
      }),
      field('SubscriberID', 'Number', 'Subscriber record ID.', {
        isNullable: true,
        relatesTo: ENGAGEMENT_SUBSCRIBER_ID,
      }),
      field('ErrorCodeID', 'Number', 'Error code ID when not delivered.', { isNullable: true }),
      field('ErrorName', 'Text', 'Error name.', { length: 255, isNullable: true }),
      field('ErrorDescription', 'Text', 'Error description.', { length: 500, isNullable: true }),
      field('StartTime', 'Date', 'Transactional message trigger datetime.'),
    ],
  },

  // ─── Tracking ────────────────────────────────────────────────────────────
  {
    name: '_Open',
    description:
      'Email open events (image pixel). Seven-day retention in SFMC; six months in standard documentation. IsUnique flags first open per job.',
    category: 'Tracking',
    fields: [
      ...engagementEventFields('EventDate', 'Timestamp when the open was recorded.'),
      field('IsUnique', 'Boolean', 'Whether this is the first open for the subscriber on this job.', {
        isNullable: true,
      }),
    ],
  },
  {
    name: '_Click',
    description: 'Email link click events with URL, link name, and resolved link content.',
    category: 'Tracking',
    fields: [
      ...engagementEventFields('EventDate', 'Timestamp when the click occurred.'),
      field('URL', 'Text', 'Tracked URL with AMPscript placeholders.', { length: 900, isNullable: true }),
      field('LinkName', 'Text', 'Link alias from the email.', { length: 1024, isNullable: true }),
      field('LinkContent', 'Text', 'Resolved link URL after personalization.', { isNullable: true }),
      field('IsUnique', 'Boolean', 'Whether this is the first click for the subscriber on this job.'),
    ],
  },
  {
    name: '_Bounce',
    description:
      'Hard and soft bounce events with SMTP diagnostics. Monitor with _Complaint for deliverability health.',
    category: 'Tracking',
    fields: [
      ...engagementEventFields('EventDate', 'Timestamp when the bounce occurred.'),
      field('IsUnique', 'Boolean', 'First bounce occurrence for the subscriber on this job (1 = unique).'),
      field('BounceCategoryID', 'Number', 'Bounce category ID.'),
      field('BounceCategory', 'Text', 'Bounce category label.', { length: 50, isNullable: true }),
      field('BounceSubcategoryID', 'Number', 'Bounce subcategory ID.', { isNullable: true }),
      field('BounceSubcategory', 'Text', 'Bounce subcategory label.', { length: 50, isNullable: true }),
      field('BounceTypeID', 'Number', 'Bounce type ID.'),
      field('BounceType', 'Text', 'Bounce type label.', { length: 50, isNullable: true }),
      field('SMTPBounceReason', 'Text', 'SMTP reason from the receiving server.', { isNullable: true }),
      field('SMTPMessage', 'Text', 'SMTP message from the mail system.', { isNullable: true }),
      field('SMTPCode', 'Number', 'SMTP error code (watch 541 and 554).', { isNullable: true }),
      field('IsFalseBounce', 'Boolean', 'True if delivery receipt arrived after a bounce.', {
        isNullable: true,
      }),
    ],
  },
  {
    name: '_Complaint',
    description:
      'ISP feedback loop spam complaint events. Results in unsubscribe; pairs with _Unsubscribe for consent analysis.',
    category: 'Tracking',
    fields: [
      ...engagementEventFields('EventDate', 'Timestamp when the complaint was recorded.'),
      field('IsUnique', 'Boolean', 'First complaint occurrence for the subscriber on this job.'),
    ],
  },
  {
    name: '_FTAF',
    description: 'Forward To A Friend behavioral events. Six-month retention.',
    category: 'Tracking',
    fields: [
      field('AccountID', 'Number', 'Parent account ID (MID).'),
      field('OYBAccountID', 'Number', 'Child Business Unit MID.', { isNullable: true }),
      field('JobID', 'Number', 'Email send job ID.', {
        isPrimaryKey: true,
        relatesTo: ENGAGEMENT_JOB,
      }),
      field('ListID', 'Number', 'List ID used in the send.', {
        isPrimaryKey: true,
        relatesTo: ENGAGEMENT_LIST,
      }),
      field('BatchID', 'Number', 'Batch ID.', { isPrimaryKey: true }),
      field('SubscriberID', 'Number', 'Subscriber who forwarded.', {
        isPrimaryKey: true,
        relatesTo: ENGAGEMENT_SUBSCRIBER_ID,
      }),
      field('SubscriberKey', 'Text', 'Subscriber key.', {
        length: 254,
        relatesTo: ENGAGEMENT_SUBSCRIBER_KEY,
      }),
      field('TransactionTime', 'Date', 'Timestamp of the forward event.'),
      field('Domain', 'Text', 'Domain of the forward event.', { length: 128 }),
      field('IsUnique', 'Boolean', 'Whether this is the first forward for the job.'),
      field('TriggererSendDefinitionObjectID', 'Text', 'Triggered send definition object ID.', {
        length: 36,
        isNullable: true,
        relatesTo: JOURNEY_TRIGGER_SEND,
      }),
      field('TriggeredSendCustomerKey', 'Text', 'Triggered send customer key.', {
        length: 36,
        isNullable: true,
      }),
    ],
  },
  {
    name: '_SurveyResponse',
    description: 'Survey question and answer events from email sends. Six-month retention.',
    category: 'Tracking',
    fields: [
      ...engagementEventFields('EventDate', 'Timestamp when the survey response was recorded.'),
      field('SurveyID', 'Number', 'Survey ID.'),
      field('SurveyName', 'Text', 'Survey name.', { length: 100 }),
      field('IsUnique', 'Number', 'Whether the response is unique.'),
      field('QuestionID', 'Number', 'Survey question ID.'),
      field('QuestionName', 'Text', 'Question name.', { length: 50 }),
      field('Question', 'Text', 'Question text.', { length: 4000 }),
      field('AnswerID', 'Number', 'Answer option ID.'),
      field('AnswerName', 'Text', 'Answer name.', { length: 4000, isNullable: true }),
      field('Answer', 'Text', 'Boolean-style answer value.', { length: 4000, isNullable: true }),
      field('AnswerData', 'Text', 'Free-text answer content.', { isNullable: true }),
    ],
  },

  // ─── Subscription events ─────────────────────────────────────────────────
  {
    name: '_Unsubscribe',
    description:
      'Unsubscribe events tied to sends (preference center, complaints, list-unsubscribe header). For current status see _Subscribers or _ListSubscribers.',
    category: 'Subscription',
    fields: [
      ...engagementEventFields('EventDate', 'Timestamp when the unsubscribe occurred.'),
      field('IsUnique', 'Boolean', 'First unsubscribe occurrence for the subscriber on this job.'),
    ],
  },

  // ─── Journey ───────────────────────────────────────────────────────────────
  {
    name: '_Journey',
    description:
      'Journey Builder journey versions, status, and dates. BU-scoped to where the journey was created.',
    category: 'Journey',
    fields: [
      field('VersionID', 'Text', 'Journey version GUID.', { length: 36, isPrimaryKey: true }),
      field('JourneyID', 'Text', 'Root journey GUID across versions.', { length: 36 }),
      field('JourneyName', 'Text', 'Journey name.', { length: 200 }),
      field('VersionNumber', 'Number', 'Version number.'),
      field('CreatedDate', 'Date', 'Version creation date.'),
      field('LastPublishedDate', 'Date', 'Last published date.', { isNullable: true }),
      field('ModifiedDate', 'Date', 'Last modified date.'),
      field('JourneyStatus', 'Text', 'Running mode: Draft, Running, Finishing, Stopped.', {
        length: 100,
      }),
    ],
  },
  {
    name: '_JourneyActivity',
    description:
      'Activities on the Journey canvas. Join JourneyActivityObjectID to TriggererSendDefinitionObjectID on email tracking views.',
    category: 'Journey',
    fields: [
      field('VersionID', 'Text', 'Journey version GUID.', {
        length: 36,
        isPrimaryKey: true,
        relatesTo: JOURNEY_VERSION,
      }),
      field('ActivityID', 'Text', 'Activity GUID on the canvas.', {
        length: 36,
        isPrimaryKey: true,
        relatesTo: JOURNEY_ACTIVITY,
      }),
      field('ActivityName', 'Text', 'Activity display name.', { length: 200, isNullable: true }),
      field('ActivityExternalKey', 'Text', 'External key for API and integrations.', { length: 200 }),
      field('JourneyActivityObjectID', 'Text', 'Triggered Send Definition ID for email activities.', {
        length: 36,
        isNullable: true,
        relatesTo: JOURNEY_TRIGGER_SEND,
      }),
      field('ActivityType', 'Text', 'Activity type (EMAIL, WAIT, SMS, etc.).', {
        length: 512,
        isNullable: true,
      }),
    ],
  },

  // ─── Automation ────────────────────────────────────────────────────────────
  {
    name: '_AutomationInstance',
    description:
      'Automation Studio run history (1–31 days, real-time, UTC timestamps). One row per automation execution.',
    category: 'Automation',
    fields: [
      field('MemberID', 'Number', 'Business Unit MID.'),
      field('AutomationName', 'Text', 'Automation name.', { length: 400 }),
      field('AutomationDescription', 'Text', 'Automation description.', { length: 400, isNullable: true }),
      field('AutomationCustomerKey', 'Text', 'Automation external key.', {
        length: 400,
        relatesTo: [rel('_AutomationActivityInstance', 'AutomationCustomerKey')],
      }),
      field('AutomationInstanceID', 'Text', 'Unique automation run ID.', {
        length: 36,
        isPrimaryKey: true,
        relatesTo: AUTOMATION_INSTANCE,
      }),
      field('AutomationType', 'Text', 'Starting source: Schedule, File Drop, or Trigger.', { length: 9 }),
      field('AutomationNotificationRecipient_Complete', 'Text', 'Completion notification emails.', {
        length: 500,
        isNullable: true,
      }),
      field('AutomationNotificationRecipient_Error', 'Text', 'Error notification emails.', {
        length: 500,
        isNullable: true,
      }),
      field('AutomationNotificationRecipient_Skip', 'Text', 'Skipped-run notification emails.', {
        length: 500,
        isNullable: true,
      }),
      field('AutomationStepCount', 'Number', 'Number of steps in the automation.'),
      field('AutomationInstanceIsRunOnce', 'Boolean', 'Run-once flag for file drop or triggered runs.'),
      field('FilenameFromTrigger', 'Text', 'File that triggered the run.', {
        length: 4000,
        isNullable: true,
      }),
      field('AutomationInstanceScheduledTime_UTC', 'Date', 'Scheduled start time (UTC).', {
        isNullable: true,
      }),
      field('AutomationInstanceStartTime_UTC', 'Date', 'Actual start time (UTC).', { isNullable: true }),
      field('AutomationInstanceEndTime_UTC', 'Date', 'End time (UTC).', { isNullable: true }),
      field('AutomationInstanceStatus', 'Text', 'Run status at query time.', { length: 400 }),
      field('AutomationInstanceActivityErrorDetails', 'Text', 'First error message from the run.', {
        length: 4000,
        isNullable: true,
      }),
    ],
  },
  {
    name: '_AutomationActivityInstance',
    description:
      'Per-activity execution within an automation run (1–31 days, UTC). Join JobID to _Job for send activities.',
    category: 'Automation',
    fields: [
      field('MemberID', 'Number', 'Business Unit MID.'),
      field('JobID', 'Number', 'Email job ID when activity is a send.', {
        isNullable: true,
        relatesTo: ENGAGEMENT_JOB,
      }),
      field('AutomationName', 'Text', 'Automation name.', { length: 400 }),
      field('AutomationCustomerKey', 'Text', 'Automation external key.', {
        length: 400,
        relatesTo: [rel('_AutomationInstance', 'AutomationCustomerKey')],
      }),
      field('AutomationInstanceID', 'Text', 'Parent automation run ID.', {
        length: 36,
        relatesTo: AUTOMATION_INSTANCE,
      }),
      field('ActivityCustomerKey', 'Text', 'Activity external key.', { length: 400 }),
      field('ActivityInstanceID', 'Text', 'Unique activity run ID.', {
        length: 36,
        isPrimaryKey: true,
      }),
      field('ActivityType', 'Number', 'Activity type numeric ID (e.g. 300 = SQL Query).'),
      field('ActivityName', 'Text', 'Activity name.', { length: 400 }),
      field('ActivityDescription', 'Text', 'Activity description.', { length: 400, isNullable: true }),
      field('ActivityInstanceStep', 'Text', 'Step position (e.g. 3.2).', { length: 25 }),
      field('ActivityInstanceStartTime_UTC', 'Date', 'Activity start time (UTC).', {
        isNullable: true,
      }),
      field('ActivityInstanceEndTime_UTC', 'Date', 'Activity end time (UTC).', { isNullable: true }),
      field('ActivityInstanceStatus', 'Text', 'Activity run status.', { length: 256 }),
      field('ActivityInstanceStatusDetails', 'Text', 'Error details when status is Error.', {
        length: 4000,
        isNullable: true,
      }),
    ],
  },

  // ─── Mobile Connect ────────────────────────────────────────────────────────
  {
    name: '_SMSMessageTracking',
    description:
      'MobileConnect SMS send and MO/MT tracking. Retained indefinitely; use WHERE for performance. Join JB fields to Journey views.',
    category: 'Mobile',
    fields: [
      field('MobileMessageTrackingID', 'Number', 'Unique tracking ID per message.', { isPrimaryKey: true }),
      field('EID', 'Number', 'Enterprise ID.', { isNullable: true }),
      field('MID', 'Number', 'Business Unit MID.', { isNullable: true }),
      field('Mobile', 'Text', 'Subscriber mobile number.', { length: 15 }),
      field('MessageID', 'Number', 'Mobile message ID.'),
      field('KeywordID', 'Text', 'Keyword GUID.', { length: 36, isNullable: true }),
      field('CodeID', 'Text', 'SMS code GUID.', { length: 36, isNullable: true }),
      field('ConversationID', 'Text', 'Legacy conversation ID; usually null.', {
        length: 36,
        isNullable: true,
      }),
      field('ConversationStateID', 'Text', 'MO/MT conversation correlation ID.', {
        length: 36,
        isNullable: true,
      }),
      field('CampaignID', 'Number', 'SMS campaign ID when applicable.', { isNullable: true }),
      field('Sent', 'Boolean', 'Whether the message was sent.'),
      field('Delivered', 'Boolean', 'Whether the message was delivered.', { isNullable: true }),
      field('Undelivered', 'Boolean', 'Delivery failure flag.', { isNullable: true }),
      field('Outbound', 'Boolean', 'Outgoing message flag.', { isNullable: true }),
      field('Inbound', 'Boolean', 'Incoming message flag.', { isNullable: true }),
      field('CreateDateTime', 'Date', 'Record creation timestamp.'),
      field('ModifiedDateTime', 'Date', 'Record modification timestamp.'),
      field('ActionDateTime', 'Date', 'Delivery or non-delivery event timestamp.'),
      field('MessageText', 'Text', 'Message body text.', { length: 160, isNullable: true }),
      field('IsTest', 'Boolean', 'Test message flag.'),
      field('MobileMessageRecurrenceID', 'Number', 'Recurrence schedule ID.', { isNullable: true }),
      field('ResponseToMobileMessageTrackingID', 'Number', 'Parent message tracking ID.', {
        isNullable: true,
        relatesTo: [rel('_SMSMessageTracking', 'MobileMessageTrackingID')],
      }),
      field('IsValid', 'Boolean', 'Validity flag.', { isNullable: true }),
      field('InvalidationCode', 'Number', 'Invalidation code.', { isNullable: true }),
      field('SendID', 'Number', 'SMS send ID.', { isNullable: true }),
      field('SendSplitID', 'Number', 'Send split ID.', { isNullable: true }),
      field('SendSegmentID', 'Number', 'Send segment ID.', { isNullable: true }),
      field('SendJobID', 'Number', 'SMS send job ID.', { isNullable: true }),
      field('SendGroupID', 'Number', 'Send group ID.', { isNullable: true }),
      field('SendPersonID', 'Number', 'Send person ID.', { isNullable: true }),
      field('SubscriberID', 'Number', 'Subscriber ID when available.', {
        isNullable: true,
        relatesTo: ENGAGEMENT_SUBSCRIBER_ID,
      }),
      field('SubscriberKey', 'Text', 'Subscriber key when available.', {
        length: 254,
        isNullable: true,
        relatesTo: ENGAGEMENT_SUBSCRIBER_KEY,
      }),
      field('SMSStandardStatusCodeId', 'Number', 'SFMC delivery status code.', { isNullable: true }),
      field('Description', 'Text', 'Status code description.', { isNullable: true }),
      field('Name', 'Text', 'Message or Journey activity name.', { isNullable: true }),
      field('ShortCode', 'Text', 'Short or long code used to send.', { isNullable: true }),
      field('SharedKeyword', 'Text', 'Keyword used in the message.', { isNullable: true }),
      field('Ordinal', 'Number', 'Multi-part message part index.', { isNullable: true }),
      field('FromName', 'Text', 'From name on the message (max 11 chars).', { length: 11, isNullable: true }),
      field('JBDefinitionID', 'Text', 'Journey version ID for Journey SMS sends.', {
        length: 36,
        isNullable: true,
        relatesTo: JOURNEY_VERSION,
      }),
      field('JBActivityID', 'Text', 'Journey activity ID for Journey SMS sends.', {
        length: 36,
        isNullable: true,
        relatesTo: JOURNEY_ACTIVITY,
      }),
      field('SMSJobID', 'Text', 'SMS Send Log job GUID (Spring 2023+).', { length: 36, isNullable: true }),
      field('SMSBatchID', 'Number', 'SMS Send Log batch ID.', { isNullable: true }),
    ],
  },
  {
    name: '_SMSSubscriptionLog',
    description:
      'MobileConnect keyword subscription history per mobile number. Replaces legacy _MobileSubscription. Retention beyond six months.',
    category: 'Mobile',
    fields: [
      field('LogDate', 'Date', 'Date the subscription event was logged.', { isNullable: true }),
      field('SubscriberKey', 'Text', 'Subscriber key when matched in All Contacts.', {
        length: 254,
        relatesTo: ENGAGEMENT_SUBSCRIBER_KEY,
      }),
      field('MobileSubscriptionID', 'Number', 'Subscription record ID.', { isPrimaryKey: true }),
      field('SubscriptionDefinitionID', 'Text', 'Keyword GUID; join to _SMSMessageTracking.KeywordID.', {
        length: 36,
        relatesTo: [rel('_SMSMessageTracking', 'KeywordID')],
      }),
      field('MobileNumber', 'Text', 'Mobile number.', { length: 15 }),
      field('OptOutStatusID', 'Number', 'Opt-out status code.', { isNullable: true }),
      field('OptOutMethodID', 'Number', 'Opt-out method code.', { isNullable: true }),
      field('OptOutDate', 'Date', 'Opt-out date.', { isNullable: true }),
      field('OptInStatusID', 'Number', 'Opt-in status code.'),
      field('OptInMethodID', 'Number', 'Opt-in method code.', { isNullable: true }),
      field('OptInDate', 'Date', 'Opt-in date.', { isNullable: true }),
      field('Source', 'Number', 'Subscription source code.', { isNullable: true }),
      field('CreatedDate', 'Date', 'Record created date.'),
      field('ModifiedDate', 'Date', 'Record modified date.'),
    ],
  },
  {
    name: '_UndeliverableSMS',
    description:
      'Mobile numbers held after repeated SMS delivery failures. Pair with _SMSMessageTracking for send diagnostics.',
    category: 'Mobile',
    fields: [
      field('MobileNumber', 'Text', 'Held mobile number.', {
        length: 15,
        isPrimaryKey: true,
        relatesTo: [rel('_SMSMessageTracking', 'Mobile'), rel('_SMSSubscriptionLog', 'MobileNumber')],
      }),
      field('Undeliverable', 'Boolean', 'Whether the number is held from sends.'),
      field('BounceCount', 'Number', 'Count of undelivered messages.'),
      field('FirstBounceDate', 'Date', 'First failed delivery date.'),
      field('HoldDate', 'Date', 'Date the hold expires or was applied.', { isNullable: true }),
    ],
  },
  {
    name: '_MobileAddress',
    description:
      'MobileConnect contact demographics (unsupported but still populated). BU-scoped; underscore-prefixed column names required.',
    category: 'Mobile',
    fields: [
      field('_MobileID', 'Number', 'MobileConnect contact ID.', { isPrimaryKey: true, isNullable: true }),
      field('_ContactID', 'Number', 'Global Contact ID.'),
      field('_MobileNumber', 'Text', 'Mobile number with country dial code, no + prefix.', { length: 15 }),
      field('_Status', 'Number', 'Contact status code.', { isNullable: true }),
      field('_Source', 'Number', 'Contact source code.', { isNullable: true }),
      field('_SourceObjectId', 'Text', 'Source object ID when _Source = 10.', { length: 255, isNullable: true }),
      field('_Priority', 'Number', 'Priority among multiple numbers (1 = primary).', { isNullable: true }),
      field('_Channel', 'Text', 'Legacy channel field.', { length: 50, isNullable: true }),
      field('_CarrierID', 'Number', 'Mobile carrier code.'),
      field('_CountryCode', 'Text', 'Two-letter country code.', { length: 2 }),
      field('_CreatedDate', 'Date', 'Contact created date.'),
      field('_CreatedBy', 'Date', 'Created-by metadata (legacy type).'),
      field('_ModifiedBy', 'Text', 'Last modifier.', { length: 255, isNullable: true }),
      field('_City', 'Text', 'City.', { length: 100, isNullable: true }),
      field('_State', 'Text', 'State.', { length: 100, isNullable: true }),
      field('_ZipCode', 'Text', 'Postal code.', { length: 20, isNullable: true }),
      field('_FirstName', 'Text', 'First name.', { length: 100, isNullable: true }),
      field('_LastName', 'Text', 'Last name.', { length: 100, isNullable: true }),
      field('_UTCOffset', 'Number', 'Hours offset from UTC.', { isNullable: true }),
      field('_IsHonorDST', 'Boolean', 'Whether the timezone observes DST.', { isNullable: true }),
    ],
  },

  // ─── GroupConnect (LINE) ───────────────────────────────────────────────────
  {
    name: '_MobileLineAddressContactSubscriptionView',
    description:
      'GroupConnect LINE follower subscriptions (active and blocked). Requires SYSTEM_DATA_VIEWS business rule and GroupConnect app visit to provision.',
    category: 'GroupConnect',
    fields: [
      field('ChannelID', 'Text', 'LINE channel ID.', { length: 255, isPrimaryKey: true }),
      field('ContactID', 'Number', 'Marketing Cloud Contact ID linked to LINE UID.', {
        isPrimaryKey: true,
        relatesTo: [rel('_MobileAddress', '_ContactID')],
      }),
      field('ContactKey', 'Text', 'Contact key linked to LINE UID.', {
        length: 255,
        relatesTo: [rel('_Subscribers', 'SubscriberKey')],
      }),
      field('AddressID', 'Text', 'LINE user ID (UID).', { length: 255, isPrimaryKey: true }),
      field('IsActive', 'Number', 'Active follower flag (1 = true, 0 = false).'),
      field('CreatedDate', 'Date', 'Follow / record creation timestamp (CST).'),
      field('ModifiedDate', 'Date', 'Last modification timestamp (CST).', { isNullable: true }),
    ],
  },
  {
    name: '_MobileLineOrphanContactView',
    description:
      'Orphaned ContactKeys from GroupConnect imports when multiple contacts share the same LINE Address ID.',
    category: 'GroupConnect',
    fields: [
      field('ContactID', 'Number', 'Marketing Cloud Contact ID.', {
        isPrimaryKey: true,
        relatesTo: [rel('_MobileLineAddressContactSubscriptionView', 'ContactID')],
      }),
      field('ContactKey', 'Text', 'Orphaned contact key.', {
        length: 255,
        isPrimaryKey: true,
        relatesTo: [rel('_Subscribers', 'SubscriberKey')],
      }),
      field('AddressID', 'Text', 'LINE UID shared with the retained contact.', {
        length: 255,
        isPrimaryKey: true,
        relatesTo: [rel('_MobileLineAddressContactSubscriptionView', 'AddressID')],
      }),
      field('CreatedDate', 'Date', 'Record creation timestamp (CST).'),
    ],
  },

  // ─── Social Forward ────────────────────────────────────────────────────────
  {
    name: '_SocialNetworkImpressions',
    description: 'Social Forward impression events from email content regions. Six-month retention.',
    category: 'Social',
    fields: [
      field('JobID', 'Number', 'Email send job ID.', {
        isPrimaryKey: true,
        relatesTo: ENGAGEMENT_JOB,
      }),
      field('ListID', 'Number', 'List ID used in the send.', {
        isPrimaryKey: true,
        relatesTo: ENGAGEMENT_LIST,
      }),
      field('RegionTitle', 'Text', 'Social Forward region title.'),
      field('RegionDescription', 'Text', 'Region description.', { isNullable: true }),
      field('RegionHTML', 'Text', 'Region HTML content.'),
      field('ContentRegionID', 'Number', 'Shared content region ID.'),
      field('SocialSharingSiteID', 'Number', 'Social network ID.'),
      field('SiteName', 'Text', 'Social network name.'),
      field('CountryCode', 'Text', 'Social network country code.', { length: 10 }),
      field('ReferringURL', 'Text', 'Referring URL for the share.', { isNullable: true }),
      field('IPAddress', 'Text', 'IP address of the share.', { length: 50, isNullable: true }),
      field('TransactionTime', 'Date', 'Time the region was shared.'),
      field('PublishedSocialContentStatusID', 'Text', 'Published content status ID.'),
      field('ShortCode', 'Text', 'Published content short code.'),
      field('PublishTime', 'Date', 'Time the social content was published.'),
    ],
  },
  {
    name: '_SocialNetworkTracking',
    description: 'Social Forward tracking events with subscriber-level engagement keys.',
    category: 'Social',
    fields: [
      field('SubscriberID', 'Number', 'Subscriber record ID.', {
        isPrimaryKey: true,
        relatesTo: ENGAGEMENT_SUBSCRIBER_ID,
      }),
      field('SubscriberKey', 'Text', 'Subscriber key.', {
        length: 254,
        relatesTo: ENGAGEMENT_SUBSCRIBER_KEY,
      }),
      field('ListID', 'Number', 'List ID used in the send.', {
        isPrimaryKey: true,
        relatesTo: ENGAGEMENT_LIST,
      }),
      field('BatchID', 'Number', 'Batch ID.', { isPrimaryKey: true }),
      field('SocialSharingSiteID', 'Number', 'Social network ID.'),
      field('SiteName', 'Text', 'Social network name.'),
      field('CountryCode', 'Text', 'Social network country code.', { length: 10 }),
      field('PublishedSocialContentID', 'Text', 'Published content area ID.'),
      field('RegionTitle', 'Text', 'Social Forward region title.'),
      field('RegionDescription', 'Text', 'Region description.', { isNullable: true }),
      field('RegionHTML', 'Text', 'Region HTML.', { isNullable: true }),
      field('ContentRegionID', 'Text', 'Content region ID.', { isNullable: true }),
      field('OYBMemberID', 'Number', 'On-Your-Behalf account ID.', { isNullable: true }),
      field('TransactionTime', 'Date', 'Time the content was shared.'),
      field('IsUnique', 'Boolean', 'Whether the event is unique.'),
      field('Domain', 'Text', 'Domain from which content was shared.'),
      field('PublishedSocialContentStatusID', 'Text', 'Published content status ID.'),
      field('ShortCode', 'Text', 'Published content short code.'),
      field('PublishTime', 'Date', 'Time the social content was published.'),
    ],
  },

  // ─── Other ─────────────────────────────────────────────────────────────────
  {
    name: '_Coupon',
    description:
      'Coupon definitions for Content Builder Block SDK live content. Requires Block SDK coupons.',
    category: 'Other',
    fields: [
      field('Name', 'Text', 'Coupon name.', { length: 128, isPrimaryKey: true }),
      field('ExternalKey', 'Text', 'API external key.', { length: 36, isPrimaryKey: true }),
      field('Description', 'Text', 'Coupon description.', { isNullable: true }),
      field('BeginDate', 'Date', 'Coupon valid-from date.'),
      field('ExpirationDate', 'Date', 'Coupon expiration date.'),
    ],
  },
];
