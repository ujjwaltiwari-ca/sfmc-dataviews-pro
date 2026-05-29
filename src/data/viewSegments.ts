import { sfmcDataViews } from './schemas';
import { sendLogDataViews } from './schemas/sendLog';
import { synchronizedDeDataViews } from './schemas/synchronizedDe';
import type { DataViewTable } from './schemas/types';

export type ViewSegmentId = 'core' | 'sendlog' | 'synchronized';

export type ViewSegment = {
  id: ViewSegmentId;
  label: string;
  shortLabel: string;
  description: string;
  tableCount: number;
};

export const VIEW_SEGMENTS: ViewSegment[] = [
  {
    id: 'core',
    label: 'Core System Data Views',
    shortLabel: 'Core Data Views',
    description: 'Full modular schema — all 27 SFMC system data views across subscribers, sending, tracking, journeys, and more.',
    tableCount: sfmcDataViews.length,
  },
  {
    id: 'sendlog',
    label: 'SendLog Template View',
    shortLabel: 'SendLog',
    description:
      'Corporate SendLog DE layout with JobID, ListID, BatchID, SubKey, and standard triggered-send attribution fields.',
    tableCount: sendLogDataViews.length,
  },
  {
    id: 'synchronized',
    label: 'Synchronized Data Extensions',
    shortLabel: 'Sync DEs',
    description:
      'Salesforce CRM synchronized objects — Account, Contact, and Lead — with standard Id keys and replication flags.',
    tableCount: synchronizedDeDataViews.length,
  },
];

const segmentTables: Record<ViewSegmentId, DataViewTable[]> = {
  core: sfmcDataViews,
  sendlog: sendLogDataViews,
  synchronized: synchronizedDeDataViews,
};

export function getTablesForSegment(segment: ViewSegmentId): DataViewTable[] {
  return segmentTables[segment];
}

export function isViewSegmentId(value: string): value is ViewSegmentId {
  return value === 'core' || value === 'sendlog' || value === 'synchronized';
}

export const VIEW_SEGMENT_STORAGE_KEY = 'sfmc-view-segment';

export function readViewSegmentPreference(): ViewSegmentId {
  try {
    const stored = localStorage.getItem(VIEW_SEGMENT_STORAGE_KEY);
    if (stored && isViewSegmentId(stored)) {
      return stored;
    }
  } catch {
    /* ignore */
  }
  return 'core';
}
