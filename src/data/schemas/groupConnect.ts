import type { DataViewTable } from './types';
import { field, rel } from './helpers';

export const groupConnectDataViews: DataViewTable[] = [
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
];
