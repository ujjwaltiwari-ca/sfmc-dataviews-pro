import type { DataViewTable } from './types.js';
import { field, JOURNEY_ACTIVITY, JOURNEY_TRIGGER_SEND, JOURNEY_VERSION } from './helpers.js';

export const journeyDataViews: DataViewTable[] = [
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
];
