import type { DataViewTable } from './types';
import { ENGAGEMENT_LIST, field, rel } from './helpers';

export const subscriberDataViews: DataViewTable[] = [
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
];
