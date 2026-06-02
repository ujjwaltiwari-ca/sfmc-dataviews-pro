import type { DataViewTable } from './types.js';
import {
  appendDynamicProfileAttributeField,
  ENGAGEMENT_JOB,
  ENGAGEMENT_SUBSCRIBER_ID,
  ENGAGEMENT_SUBSCRIBER_KEY,
  engagementEventFields,
  field,
  JOURNEY_TRIGGER_SEND,
} from './helpers.js';

export const sendingDataViews: DataViewTable[] = [
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
    fields: appendDynamicProfileAttributeField(
      engagementEventFields('EventDate', 'Timestamp when the send occurred.'),
    ),
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
];
