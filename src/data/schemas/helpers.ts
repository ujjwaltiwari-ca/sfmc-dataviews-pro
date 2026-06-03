import type { DataViewField } from './types.js';

export type FieldRelation = NonNullable<DataViewField['relatesTo']>[number];

export type FieldOptions = {
  length?: number;
  isPrimaryKey?: boolean;
  isNullable?: boolean;
  isIndexed?: boolean;
  relatesTo?: FieldRelation[];
};

export const rel = (table: string, field: string): FieldRelation => ({ table, field });

/** Standard email engagement join keys (Job + Sent). */
export const ENGAGEMENT_JOB: FieldRelation[] = [rel('_Job', 'JobID'), rel('_Sent', 'JobID')];

/** Subscriber ID joins for engagement and subscriber tables. */
export const ENGAGEMENT_SUBSCRIBER_ID: FieldRelation[] = [
  rel('_Subscribers', 'SubscriberID'),
  rel('_Sent', 'SubscriberID'),
];

/** SubscriberKey joins for engagement and subscriber tables. */
export const ENGAGEMENT_SUBSCRIBER_KEY: FieldRelation[] = [
  rel('_Subscribers', 'SubscriberKey'),
  rel('_Sent', 'SubscriberKey'),
];

/** List context for sends and list membership. */
export const ENGAGEMENT_LIST: FieldRelation[] = [rel('_ListSubscribers', 'ListID')];

/** Journey version lineage. */
export const JOURNEY_VERSION: FieldRelation[] = [rel('_Journey', 'VersionID')];

/** Journey canvas activity node. */
export const JOURNEY_ACTIVITY: FieldRelation[] = [rel('_JourneyActivity', 'ActivityID')];

/** Triggered send definition bridge from Journey Builder email activities. */
export const JOURNEY_TRIGGER_SEND: FieldRelation[] = [
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
export const AUTOMATION_INSTANCE: FieldRelation[] = [
  rel('_AutomationInstance', 'AutomationInstanceID'),
];

export function field(
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
    ...(options.isIndexed === true ? { isIndexed: true } : {}),
  };
}

/** Composite engagement event keys shared by Sent, Open, Click, Bounce, etc. */
export function engagementEventFields(
  eventDateField: string,
  eventDateDescription: string,
): DataViewField[] {
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
    field(eventDateField, 'Date', eventDateDescription, { isIndexed: true }),
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
