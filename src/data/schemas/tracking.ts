import type { DataViewTable } from './types.js';
import {
  ENGAGEMENT_JOB,
  ENGAGEMENT_LIST,
  ENGAGEMENT_SUBSCRIBER_ID,
  ENGAGEMENT_SUBSCRIBER_KEY,
  engagementEventFields,
  field,
  JOURNEY_TRIGGER_SEND,
} from './helpers.js';

export const trackingDataViews: DataViewTable[] = [
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
];
