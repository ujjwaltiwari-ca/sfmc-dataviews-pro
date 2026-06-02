import type { DataViewTable } from './types.js';
import { AUTOMATION_INSTANCE, ENGAGEMENT_JOB, field, rel } from './helpers.js';

export const automationDataViews: DataViewTable[] = [
  {
    name: '_AutomationInstance',
    description:
      'Automation Studio run history (1–31 days, real-time, UTC timestamps). One row per automation execution.',
    category: 'Automation',
    fields: [
      field('MemberID', 'Number', 'Business Unit MID.'),
      field('AutomationName', 'Text', 'Automation name.', { length: 400 }),
      field('AutomationDescription', 'Text', 'Automation description.', { length: 400, isNullable: true }),
      field('AutomationCustomerKey', 'Text', 'Automation external key.', {
        length: 400,
        relatesTo: [rel('_AutomationActivityInstance', 'AutomationCustomerKey')],
      }),
      field('AutomationInstanceID', 'Text', 'Unique automation run ID.', {
        length: 36,
        isPrimaryKey: true,
        relatesTo: AUTOMATION_INSTANCE,
      }),
      field('AutomationType', 'Text', 'Starting source: Schedule, File Drop, or Trigger.', { length: 9 }),
      field('AutomationNotificationRecipient_Complete', 'Text', 'Completion notification emails.', {
        length: 500,
        isNullable: true,
      }),
      field('AutomationNotificationRecipient_Error', 'Text', 'Error notification emails.', {
        length: 500,
        isNullable: true,
      }),
      field('AutomationNotificationRecipient_Skip', 'Text', 'Skipped-run notification emails.', {
        length: 500,
        isNullable: true,
      }),
      field('AutomationStepCount', 'Number', 'Number of steps in the automation.'),
      field('AutomationInstanceIsRunOnce', 'Boolean', 'Run-once flag for file drop or triggered runs.'),
      field('FilenameFromTrigger', 'Text', 'File that triggered the run.', {
        length: 4000,
        isNullable: true,
      }),
      field('AutomationInstanceScheduledTime_UTC', 'Date', 'Scheduled start time (UTC).', {
        isNullable: true,
      }),
      field('AutomationInstanceStartTime_UTC', 'Date', 'Actual start time (UTC).', { isNullable: true }),
      field('AutomationInstanceEndTime_UTC', 'Date', 'End time (UTC).', { isNullable: true }),
      field('AutomationInstanceStatus', 'Text', 'Run status at query time.', { length: 400 }),
      field('AutomationInstanceActivityErrorDetails', 'Text', 'First error message from the run.', {
        length: 4000,
        isNullable: true,
      }),
    ],
  },
  {
    name: '_AutomationActivityInstance',
    description:
      'Per-activity execution within an automation run (1–31 days, UTC). Join JobID to _Job for send activities.',
    category: 'Automation',
    fields: [
      field('MemberID', 'Number', 'Business Unit MID.'),
      field('JobID', 'Number', 'Email job ID when activity is a send.', {
        isNullable: true,
        relatesTo: ENGAGEMENT_JOB,
      }),
      field('AutomationName', 'Text', 'Automation name.', { length: 400 }),
      field('AutomationCustomerKey', 'Text', 'Automation external key.', {
        length: 400,
        relatesTo: [rel('_AutomationInstance', 'AutomationCustomerKey')],
      }),
      field('AutomationInstanceID', 'Text', 'Parent automation run ID.', {
        length: 36,
        relatesTo: AUTOMATION_INSTANCE,
      }),
      field('ActivityCustomerKey', 'Text', 'Activity external key.', { length: 400 }),
      field('ActivityInstanceID', 'Text', 'Unique activity run ID.', {
        length: 36,
        isPrimaryKey: true,
      }),
      field('ActivityType', 'Number', 'Activity type numeric ID (e.g. 300 = SQL Query).'),
      field('ActivityName', 'Text', 'Activity name.', { length: 400 }),
      field('ActivityDescription', 'Text', 'Activity description.', { length: 400, isNullable: true }),
      field('ActivityInstanceStep', 'Text', 'Step position (e.g. 3.2).', { length: 25 }),
      field('ActivityInstanceStartTime_UTC', 'Date', 'Activity start time (UTC).', {
        isNullable: true,
      }),
      field('ActivityInstanceEndTime_UTC', 'Date', 'Activity end time (UTC).', { isNullable: true }),
      field('ActivityInstanceStatus', 'Text', 'Activity run status.', { length: 256 }),
      field('ActivityInstanceStatusDetails', 'Text', 'Error details when status is Error.', {
        length: 4000,
        isNullable: true,
      }),
    ],
  },
];
