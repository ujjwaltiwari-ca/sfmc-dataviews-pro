import { sfmcDataViews } from './schemas/index.js';
import { sendLogDataViews } from './schemas/sendLog.js';
import { synchronizedDeDataViews } from './schemas/synchronizedDe.js';
import type { DataViewTable } from './schemas/types.js';

export type ViewSegmentId = 'core' | 'sendlog' | 'synchronized';

export type ViewSegment = {
  id: ViewSegmentId;
  label: string;
  shortLabel: string;
  toolbarLabel: string;
  description: string;
  tableCount: number;
};

export const VIEW_SEGMENTS: ViewSegment[] = [
  {
    id: 'core',
    label: 'Core System Data Views',
    shortLabel: 'Core Data Views',
    toolbarLabel: `Core (${sfmcDataViews.length})`,
    description: `Full modular schema — all ${sfmcDataViews.length} SFMC system data views across subscribers, sending, tracking, journeys, mobile push, and more.`,
    tableCount: sfmcDataViews.length,
  },
  {
    id: 'sendlog',
    label: 'SendLog Template View',
    shortLabel: 'SendLog',
    toolbarLabel: 'SendLog',
    description:
      'Corporate SendLog DE layout with JobID, ListID, BatchID, SubKey, and standard triggered-send attribution fields.',
    tableCount: sendLogDataViews.length,
  },
  {
    id: 'synchronized',
    label: 'Synchronized Data Extensions',
    shortLabel: 'Sync DEs',
    toolbarLabel: 'Sync CRM',
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

/** Keep one card per table name — first occurrence wins (display order preserved). */
export function dedupeTablesByName(tables: DataViewTable[]): DataViewTable[] {
  const seen = new Set<string>();
  return tables.filter((table) => {
    if (seen.has(table.name)) {
      return false;
    }
    seen.add(table.name);
    return true;
  });
}

export function getTablesForSegment(segment: ViewSegmentId): DataViewTable[] {
  return dedupeTablesByName(segmentTables[segment]);
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
