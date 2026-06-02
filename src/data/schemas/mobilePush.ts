import type { DataViewTable } from './types.js';
import { ENGAGEMENT_SUBSCRIBER_ID, field, rel } from './helpers.js';

const PUSH_DEVICE = [rel('_PushAddress', 'DeviceID'), rel('_PushTag', 'DeviceID')];

/** MobilePush channel — device registration and opt-in state per application. */
export const mobilePushDataViews: DataViewTable[] = [
  {
    name: '_PushAddress',
    description:
      'MobilePush device registrations: system tokens, opt-in status, and application binding per subscriber device.',
    category: 'Mobile',
    fields: [
      field('DeviceID', 'Text', 'Unique device identifier for the MobilePush endpoint.', {
        length: 200,
        isPrimaryKey: true,
        relatesTo: PUSH_DEVICE,
      }),
      field('SubscriberID', 'Number', 'Subscriber linked to the device.', {
        relatesTo: ENGAGEMENT_SUBSCRIBER_ID,
      }),
      field('SubscriberKey', 'Text', 'Subscriber key for the device owner.', {
        length: 254,
        isNullable: true,
        relatesTo: [rel('_Subscribers', 'SubscriberKey')],
      }),
      field('DeviceType', 'Text', 'Platform type (e.g., iOS, Android).', { length: 50, isNullable: true }),
      field('SystemToken', 'Text', 'Push notification system token from the OS.', {
        length: 500,
        isNullable: true,
      }),
      field('OptInStatus', 'Text', 'Opt-in state for push on this device.', { length: 50 }),
      field('OptInDate', 'Date', 'When the subscriber opted in to push.', { isNullable: true }),
      field('OptOutDate', 'Date', 'When the subscriber opted out of push.', { isNullable: true }),
      field('CreatedDate', 'Date', 'Record created in MobilePush.'),
      field('ModifiedDate', 'Date', 'Last update to the device registration.'),
      field('ApplicationID', 'Text', 'MobilePush application GUID.', { length: 36, isNullable: true }),
      field('ContactID', 'Number', 'Contact ID when synchronized from Contact Builder.', { isNullable: true }),
      field('Platform', 'Text', 'OS platform version string.', { length: 100, isNullable: true }),
      field('PlatformVersion', 'Text', 'Detailed platform version.', { length: 50, isNullable: true }),
      field('HardwareId', 'Text', 'Hardware identifier when provided by the SDK.', {
        length: 200,
        isNullable: true,
      }),
      field('Badge', 'Number', 'Last known badge count.', { isNullable: true }),
      field('LocationEnabled', 'Boolean', 'Whether location services are enabled for the app.'),
      field('TimeZone', 'Text', 'Device timezone offset or name.', { length: 50, isNullable: true }),
      field('Source', 'Text', 'Registration source (SDK, API, Journey).', { length: 100, isNullable: true }),
      field('Status', 'Text', 'Device registration status.', { length: 50, isNullable: true }),
    ],
  },
  {
    name: '_PushTag',
    description:
      'Tags assigned to MobilePush devices for audience segmentation and triggered sends.',
    category: 'Mobile',
    fields: [
      field('DeviceID', 'Text', 'Device the tag is applied to.', {
        length: 200,
        isPrimaryKey: true,
        relatesTo: PUSH_DEVICE,
      }),
      field('TagName', 'Text', 'Tag label used in MobilePush audiences.', {
        length: 128,
        isPrimaryKey: true,
      }),
      field('CreatedDate', 'Date', 'When the tag was assigned to the device.'),
      field('ModifiedDate', 'Date', 'Last modification of the tag assignment.'),
      field('Source', 'Text', 'How the tag was applied (API, Journey, Import).', {
        length: 100,
        isNullable: true,
      }),
      field('Active', 'Boolean', 'Whether the tag assignment is currently active.'),
    ],
  },
];
