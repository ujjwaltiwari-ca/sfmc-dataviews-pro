import type { DataViewTable } from './types.js';
import { field, rel } from './helpers.js';

/** Corporate SendLog data extension template (triggered / journey sends). */
export const sendLogDataViews: DataViewTable[] = [
  {
    name: 'SendLog',
    description:
      'Standard corporate SendLog layout for triggered and journey email sends. Composite key: JobID, ListID, BatchID, and SubscriberKey (SubKey).',
    category: 'SendLog',
    fields: [
      field('JobID', 'Number', 'Email send job identifier from _Job.', {
        isPrimaryKey: true,
        relatesTo: [rel('_Job', 'JobID')],
      }),
      field('ListID', 'Number', 'Audience list ID used for the deployment.', {
        isPrimaryKey: true,
      }),
      field('BatchID', 'Number', 'Batch sequence for multi-wave or throttled sends.', {
        isPrimaryKey: true,
      }),
      field('SubscriberKey', 'Text', 'Subscriber key (SubKey) — unique recipient identifier.', {
        length: 254,
        isPrimaryKey: true,
        relatesTo: [rel('_Subscribers', 'SubscriberKey')],
      }),
      field('SubscriberID', 'Number', 'Numeric subscriber ID when populated by the send pipeline.', {
        isNullable: true,
      }),
      field('EmailAddress', 'Text', 'Recipient email at send time.', { length: 254, isNullable: true }),
      field('EventDate', 'Date', 'Timestamp the message was accepted for delivery.'),
      field('Domain', 'Text', 'Sending domain recorded on the event.', { length: 128, isNullable: true }),
      field('TriggererSendDefinitionObjectID', 'Text', 'Triggered Send / Journey email activity object ID.', {
        length: 36,
        isNullable: true,
        relatesTo: [rel('_Sent', 'TriggererSendDefinitionObjectID')],
      }),
      field('TriggeredSendCustomerKey', 'Text', 'Customer key of the triggered send definition.', {
        length: 36,
        isNullable: true,
      }),
      field('TriggerSendDefinitionName', 'Text', 'Friendly name of the triggered send definition.', {
        length: 200,
        isNullable: true,
      }),
      field('JourneyName', 'Text', 'Journey Builder journey name when sent from a journey.', {
        length: 200,
        isNullable: true,
        relatesTo: [rel('_Journey', 'JourneyName')],
      }),
      field('JourneyVersionID', 'Text', 'Journey version GUID for attribution.', {
        length: 36,
        isNullable: true,
        relatesTo: [rel('_Journey', 'VersionID')],
      }),
      field('EmailName', 'Text', 'Email asset name from the send job.', { length: 200, isNullable: true }),
      field('EmailSubject', 'Text', 'Subject line snapshot at send time.', { length: 500, isNullable: true }),
      field('SendClassification', 'Text', 'Send classification applied to the deployment.', {
        length: 200,
        isNullable: true,
      }),
      field('BusinessUnitMID', 'Number', 'Business unit MID that originated the send.', { isNullable: true }),
      field('IsTestSend', 'Boolean', 'Whether the row originated from a test send.'),
    ],
  },
];
