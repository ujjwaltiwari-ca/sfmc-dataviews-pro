import { HEAVY_TRACKING_VIEW_NAMES } from './sqlGenerator';
import {
  DEFAULT_SANDBOX_PREFERENCES,
  type SandboxPreferences,
} from './workspacePersistence';

const TRACKING_TABLES = new Set<string>(HEAVY_TRACKING_VIEW_NAMES);

/** Bumped when default sandbox safety toggles change — migrates stored prefs once. */
export const SANDBOX_PREFS_VERSION = 2;

export function selectionIncludesTrackingViews(tableNames: readonly string[]): boolean {
  return tableNames.some((name) => TRACKING_TABLES.has(name));
}

export function selectionIncludesSent(tableNames: readonly string[]): boolean {
  return tableNames.includes('_Sent');
}

/**
 * Applies safe-by-default sandbox utilities when generating SQL for tracking stacks.
 * Only fills in toggles that are still at legacy defaults — never overrides explicit user choice.
 */
export function buildSafeSqlPreferencePatch(
  tableNames: readonly string[],
  current: SandboxPreferences,
): Partial<SandboxPreferences> {
  const patch: Partial<SandboxPreferences> = {};
  const hasTracking = selectionIncludesTrackingViews(tableNames);

  if (hasTracking && !current.limitPast30Days) {
    patch.limitPast30Days = true;
  }

  if (selectionIncludesSent(tableNames) && !current.excludeTestSends) {
    patch.excludeTestSends = true;
  }

  if (hasTracking && !current.filterUniqueEvents) {
    patch.filterUniqueEvents = true;
  }

  return patch;
}

export function migrateSandboxPreferences(
  stored: SandboxPreferences,
  storedVersion: number | null,
): SandboxPreferences {
  if (storedVersion === SANDBOX_PREFS_VERSION) {
    return stored;
  }

  return {
    ...stored,
    limitPast30Days: true,
    filterUniqueEvents: stored.filterUniqueEvents ?? DEFAULT_SANDBOX_PREFERENCES.filterUniqueEvents,
    excludeTestSends: true,
  };
}
