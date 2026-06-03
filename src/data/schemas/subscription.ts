import type { DataViewTable } from './types.js';
import { engagementEventFields, field, rel } from './helpers.js';

export const subscriptionDataViews: DataViewTable[] = [
  {
    name: '_BusinessUnitUnsubscribes',
    description:
      'Contacts currently unsubscribed at the Business Unit level (snapshot, not event log). Parent account queries only for enterprise BU-unsubscribe mode.',
    category: 'Subscription',
    fields: [
      field('BusinessUnitID', 'Number', 'Business Unit account ID (MID).', { isPrimaryKey: true }),
      field('SubscriberID', 'Number', 'Subscriber record ID.', {
        isPrimaryKey: true,
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
];
