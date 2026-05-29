# AGENTS.md — Full Stack Blueprint: SFMC Dataviews Clone

> **Tech Stack**: Vite + React (TypeScript) + Tailwind CSS
> **Architecture**: Pure Client-Side State, No Database Required
> **Goal**: Build a high-fidelity, interactive clone of dataviews.io for Salesforce Marketing Cloud Data Views.

---

## 1. Environment Initialization & Tasks

The AI Agent should execute these environment setup steps in sequence before building application code:

1. Initialize a Vite + React + TypeScript project in the current directory if not already present.
2. Install Tailwind CSS and its required dependencies (`tailwindcss`, `postcss`, `autoprefixer`).
3. Initialize the Tailwind configuration file and update `src/index.css` with the standard `@tailwind` directives.
4. Install `lucide-react` for clean user interface iconography.

---

## 2. Centralized Static Schema Data

Create the file `src/data/sfmcSchema.ts`. This file serves as the single source of truth for the application. It contains the complete schemas, field definitions, and relational mappings for the 14 core Salesforce Marketing Cloud System Data Views.

```typescript
export interface DataViewField {
  name: string;
  type: 'Text' | 'Number' | 'Date' | 'Boolean' | 'Decimal';
  length?: number;
  isPrimaryKey: boolean;
  isNullable: boolean;
  description: string;
  relatesTo?: { table: string; field: string }[];
}

export interface DataViewTable {
  name: string;
  description: string;
  category: 'Sending' | 'Tracking' | 'Journey' | 'Subscribers';
  fields: DataViewField[];
}

export const sfmcDataViews: DataViewTable[] = [
  {
    name: '_Subscribers',
    description: 'Contains active subscriber data, status, and tracking attributes.',
    category: 'Subscribers',
    fields: [
      { name: 'SubscriberID', type: 'Number', isPrimaryKey: true, isNullable: false, description: 'The unique system identifier for a subscriber.' },
      { name: 'SubscriberKey', type: 'Text', length: 255, isPrimaryKey: false, isNullable: false, description: 'The user-defined unique identifier for a subscriber.' },
      { name: 'EmailAddress', type: 'Text', length: 254, isPrimaryKey: false, isNullable: false, description: 'The email address associated with the subscriber.' },
      { name: 'DateJoined', type: 'Date', isPrimaryKey: false, isNullable: false, description: 'The date the subscriber joined the system.' },
      { name: 'Status', type: 'Text', length: 100, isPrimaryKey: false, isNullable: false, description: 'Current status: Active, Held, Unsubscribed, or Bounced.' }
    ]
  },
  {
    name: '_Job',
    description: 'Data on email send jobs, including tracking IDs and scheduling timestamps.',
    category: 'Sending',
    fields: [
      { name: 'JobID', type: 'Number', isPrimaryKey: true, isNullable: false, description: 'The system ID for the specific email send job.' },
      { name: 'EmailID', type: 'Number', isPrimaryKey: false, isNullable: true, description: 'The internal ID of the email asset sent.' },
      { name: 'AccountID', type: 'Number', isPrimaryKey: false, isNullable: true, description: 'The MID of the business unit that initiated the send.' },
      { name: 'FromName', type: 'Text', length: 130, isPrimaryKey: false, isNullable: true, description: 'The friendly From Name utilized in the send configuration.' },
      { name: 'FromEmail', type: 'Text', length: 100, isPrimaryKey: false, isNullable: true, description: 'The From Email address utilized in the send configuration.' },
      { name: 'SchedTime', type: 'Date', isPrimaryKey: false, isNullable: true, description: 'The date and time the job was scheduled to deploy.' },
      { name: 'PickupTime', type: 'Date', isPrimaryKey: false, isNullable: true, description: 'The date and time the system processed the job queue.' },
      { name: 'DeliveredTime', type: 'Date', isPrimaryKey: false, isNullable: true, description: 'The date and time the system completed the send deployment.' }
    ]
  },
  {
    name: '_Sent',
    description: 'Tracks every individual subscriber deployment execution.',
    category: 'Sending',
    fields: [
      { name: 'JobID', type: 'Number', isPrimaryKey: true, isNullable: false, description: 'The send Job ID linking to the _Job data view.', relatesTo: [{ table: '_Job', field: 'JobID' }] },
      { name: 'ListID', type: 'Number', isPrimaryKey: true, isNullable: false, description: 'The ID of the list used in the send.' },
      { name: 'BatchID', type: 'Number', isPrimaryKey: true, isNullable: false, description: 'The internal system batch ID for tracking multi-wave sends.' },
      { name: 'SubscriberID', type: 'Number', isPrimaryKey: true, isNullable: false, description: 'The subscriber ID linking to the _Subscribers data view.', relatesTo: [{ table: '_Subscribers', field: 'SubscriberID' }] },
      { name: 'SubscriberKey', type: 'Text', length: 255, isPrimaryKey: false, isNullable: false, description: 'The unique subscriber identifier key.', relatesTo: [{ table: '_Subscribers', field: 'SubscriberKey' }] },
      { name: 'EventDate', type: 'Date', isPrimaryKey: false, isNullable: false, description: 'The timestamp showing when the send occurred.' }
    ]
  },
  {
    name: '_Open',
    description: 'Records message opens tracked via image pixels.',
    category: 'Tracking',
    fields: [
      { name: 'JobID', type: 'Number', isPrimaryKey: true, isNullable: false, description: 'The send Job ID linking to the _Job data view.', relatesTo: [{ table: '_Job', field: 'JobID' }, { table: '_Sent', field: 'JobID' }] },
      { name: 'ListID', type: 'Number', isPrimaryKey: true, isNullable: false, description: 'The target destination List ID.' },
      { name: 'BatchID', type: 'Number', isPrimaryKey: true, isNullable: false, description: 'The deployment batch sequence identifier.' },
      { name: 'SubscriberID', type: 'Number', isPrimaryKey: true, isNullable: false, description: 'The recipient subscriber record ID.', relatesTo: [{ table: '_Subscribers', field: 'SubscriberID' }, { table: '_Sent', field: 'SubscriberID' }] },
      { name: 'SubscriberKey', type: 'Text', length: 255, isPrimaryKey: false, isNullable: false, description: 'The unique subscriber key identifier.', relatesTo: [{ table: '_Subscribers', field: 'SubscriberKey' }, { table: '_Sent', field: 'SubscriberKey' }] },
      { name: 'EventDate', type: 'Date', isPrimaryKey: false, isNullable: false, description: 'The precise timestamp of the recorded open.' },
      { name: 'IsUnique', type: 'Boolean', isPrimaryKey: false, isNullable: false, description: 'Flags whether this event represents the subscriber’s first open for the job.' }
    ]
  },
  {
    name: '_Click',
    description: 'Tracks every individual link click event inside sent emails.',
    category: 'Tracking',
    fields: [
      { name: 'JobID', type: 'Number', isPrimaryKey: true, isNullable: false, description: 'The send Job ID linking back to the _Job tracking view.', relatesTo: [{ table: '_Job', field: 'JobID' }, { table: '_Sent', field: 'JobID' }] },
      { name: 'ListID', type: 'Number', isPrimaryKey: true, isNullable: false, description: 'The target List ID.' },
      { name: 'BatchID', type: 'Number', isPrimaryKey: true, isNullable: false, description: 'The deployment batch sequence identifier.' },
      { name: 'SubscriberID', type: 'Number', isPrimaryKey: true, isNullable: false, description: 'The recipient subscriber record ID.', relatesTo: [{ table: '_Subscribers', field: 'SubscriberID' }, { table: '_Sent', field: 'SubscriberID' }] },
      { name: 'SubscriberKey', type: 'Text', length: 255, isPrimaryKey: false, isNullable: false, description: 'The unique subscriber key identifier.', relatesTo: [{ table: '_Subscribers', field: 'SubscriberKey' }, { table: '_Sent', field: 'SubscriberKey' }] },
      { name: 'EventDate', type: 'Date', isPrimaryKey: false, isNullable: false, description: 'The precise timestamp of the tracked link click.' },
      { name: 'URL', type: 'Text', length: 900, isPrimaryKey: false, isNullable: true, description: 'The destination URL address chosen by the user.' },
      { name: 'LinkName', type: 'Text', length: 100, isPrimaryKey: false, isNullable: true, description: 'The alias or tracking name assigned to the hyperlink.' },
      { name: 'IsUnique', type: 'Boolean', isPrimaryKey: false, isNullable: false, description: 'Flags whether this event represents the subscriber’s first click for the job.' }
    ]
  },
  {
    name: '_Bounce',
    description: 'Aggregates hard and soft bounce responses from target ISPs.',
    category: 'Tracking',
    fields: [
      { name: 'JobID', type: 'Number', isPrimaryKey: true, isNullable: false, description: 'The send Job ID linking back to the _Job tracking view.', relatesTo: [{ table: '_Job', field: 'JobID' }, { table: '_Sent', field: 'JobID' }] },
      { name: 'ListID', type: 'Number', isPrimaryKey: true, isNullable: false, description: 'The target List ID.' },
      { name: 'BatchID', type: 'Number', isPrimaryKey: true, isNullable: false, description: 'The deployment batch sequence identifier.' },
      { name: 'SubscriberID', type: 'Number', isPrimaryKey: true, isNullable: false, description: 'The recipient subscriber record ID.', relatesTo: [{ table: '_Subscribers', field: 'SubscriberID' }, { table: '_Sent', field: 'SubscriberID' }] },
      { name: 'SubscriberKey', type: 'Text', length: 255, isPrimaryKey: false, isNullable: false, description: 'The unique subscriber key identifier.', relatesTo: [{ table: '_Subscribers', field: 'SubscriberKey' }, { table: '_Sent', field: 'SubscriberKey' }] },
      { name: 'EventDate', type: 'Date', isPrimaryKey: false, isNullable: false, description: 'The precise timestamp of the bounce event.' },
      { name: 'BounceCategory', type: 'Text', length: 50, isPrimaryKey: false, isNullable: true, description: 'Classification of the bounce (e.g., Hard Bounce, Soft Bounce, Block Bounce).' },
      { name: 'SMTPCode', type: 'Number', isPrimaryKey: false, isNullable: true, description: 'The numeric SMTP response protocol code returned by the receiving mail server.' }
    ]
  },
  {
    name: '_Journey',
    description: 'High-level metadata outlining Journey Builder names, configurations, and statuses.',
    category: 'Journey',
    fields: [
      { name: 'VersionID', type: 'Text', length: 36, isPrimaryKey: true, isNullable: false, description: 'The unique GUID for a specific journey version configuration.' },
      { name: 'JourneyID', type: 'Text', length: 36, isPrimaryKey: false, isNullable: false, description: 'The absolute root structural tracking GUID for a journey across all its versions.' },
      { name: 'JourneyName', type: 'Text', length: 200, isPrimaryKey: false, isNullable: false, description: 'The clear text marketing name assigned to the Journey Builder project.' },
      { name: 'JourneyStatus', type: 'Text', length: 50, isPrimaryKey: false, isNullable: false, description: 'The operational mode of the journey version (Draft, Running, Paused, Stopped).' },
      { name: 'CreatedDate', type: 'Date', isPrimaryKey: false, isNullable: false, description: 'The execution timestamp logging when the version record was initialized.' }
    ]
  },
  {
    name: '_JourneyActivity',
    description: 'Tracks individual processing nodes and component canvas shapes within a Journey.',
    category: 'Journey',
    fields: [
      { name: 'VersionID', type: 'Text', length: 36, isPrimaryKey: true, isNullable: false, description: 'The specific version GUID mapping back to the _Journey schema configuration.', relatesTo: [{ table: '_Journey', field: 'VersionID' }] },
      { name: 'ActivityID', type: 'Text', length: 36, isPrimaryKey: true, isNullable: false, description: 'The unique tracking GUID mapped to an explicit journey canvas processing node.' },
      { name: 'ActivityName', type: 'Text', length: 128, isPrimaryKey: false, isNullable: true, description: 'The custom text name given to a specific step configuration.' },
      { name: 'ActivityExternalKey', type: 'Text', length: 128, isPrimaryKey: false, isNullable: true, description: 'The developer-assigned customer key for programmatic interactions.' },
      { name: 'ActivityType', type: 'Text', length: 50, isPrimaryKey: false, isNullable: true, description: 'The type of node activity (e.g., EMAIL, WAIT, SMS, DECISION).' }
    ]
  }
];

## Current Status & Roadmap
- [x] Environment Initialization, React + Tailwind context loaded.
- [x] Schema structure and foundational component cards established.
- [x] Graph Search (BFS) multi-hop auto-join routing implemented inside `SqlGenerator.tsx`.
- [ ] Task Phase: System-wide expansion of data view array to comprehensive global coverage.

## Progress Checkpoint
- [x] Expanded schema to 27+ Data Views including MobilePush.
- [x] Resolved global viewport scrolling layout and fixed bottom-docked SQL Sandbox.
- [ ] Next Task: Implement Advanced SQL Utility Enhancements (Case toggles, Subscriber filters, and Target DE headers).