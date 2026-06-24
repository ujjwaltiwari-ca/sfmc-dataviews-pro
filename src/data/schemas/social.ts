import type { DataViewTable } from './types.js';
import {
  ENGAGEMENT_JOB,
  ENGAGEMENT_LIST,
  ENGAGEMENT_SUBSCRIBER_ID,
  ENGAGEMENT_SUBSCRIBER_KEY,
  field,
} from './helpers.js';

export const socialDataViews: DataViewTable[] = [
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
    description: 'Social Forward tracking events with subscriber-level engagement keys. Six-month retention.',
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
];
