import { HEAVY_TRACKING_VIEW_NAMES, sqlMatchesExcludeTestSendsFilter } from './sqlGenerator';
import { selectionIncludesSent } from './safeSqlDefaults';
import type { SandboxPreferences } from './workspacePersistence';

export type CopyValidationStatus = 'pass' | 'warn' | 'fail' | 'na';

export type CopyValidationItem = {
  id: string;
  label: string;
  status: CopyValidationStatus;
  detail?: string;
};

const ENGAGEMENT_KEYS = ['JobID', 'ListID', 'BatchID', 'SubscriberID'] as const;
const TRACKING_VIEWS = new Set<string>(HEAVY_TRACKING_VIEW_NAMES);

function sqlHasDateLookback(sql: string): boolean {
  return /EventDate\s*>=\s*DATEADD\s*\(\s*day\s*,\s*-/i.test(sql);
}

function sqlExcludesTestSends(sql: string): boolean {
  return sqlMatchesExcludeTestSendsFilter(sql);
}

function joinUsesFourKeys(sql: string, left: string, right: string): boolean {
  const pattern = new RegExp(
    `JOIN\\s+(?:Ent\\.)?${right}\\s+\\w+\\s+ON[\\s\\S]*?${left}\\.JobID\\s*=\\s*\\w+\\.JobID[\\s\\S]*?ListID[\\s\\S]*?BatchID[\\s\\S]*?SubscriberID`,
    'i',
  );
  return pattern.test(sql);
}

function hasTrackingInSelection(tableNames: readonly string[]): boolean {
  return tableNames.some((name) => TRACKING_VIEWS.has(name));
}

/** SFMC Query Studio requires SELECT TOP N when using ORDER BY. */
export function sqlHasOrderByWithoutTop(sql: string): boolean {
  if (!/\bORDER\s+BY\b/i.test(sql)) {
    return false;
  }
  const withoutLineComments = sql.replace(/--[^\n\r]*/g, '');
  const selectMatch = withoutLineComments.match(/\bSELECT\b([\s\S]*?)\bFROM\b/i);
  if (!selectMatch) {
    return true;
  }
  return !/\bTOP\s+\d+\b/i.test(selectMatch[1]);
}

export function assessSqlCopyReadiness(input: {
  sql: string;
  selectedTableNames: readonly string[];
  preferences: Pick<SandboxPreferences, 'limitPast30Days' | 'excludeTestSends'>;
  disconnectedTables: readonly string[];
}): CopyValidationItem[] {
  const { sql, selectedTableNames, preferences, disconnectedTables } = input;
  const items: CopyValidationItem[] = [];

  if (disconnectedTables.length > 0) {
    items.push({
      id: 'connected-graph',
      label: 'All selected tables join on one path',
      status: 'fail',
      detail: `Unreachable: ${disconnectedTables.join(', ')}`,
    });
  } else if (selectedTableNames.length > 1) {
    items.push({
      id: 'connected-graph',
      label: 'All selected tables join on one path',
      status: 'pass',
    });
  } else {
    items.push({
      id: 'connected-graph',
      label: 'All selected tables join on one path',
      status: 'na',
      detail: 'Single-table query',
    });
  }

  const needsDateFilter = hasTrackingInSelection(selectedTableNames);
  const dateOk =
    preferences.limitPast30Days || sqlHasDateLookback(sql) || !needsDateFilter;
  items.push({
    id: 'date-lookback',
    label: 'Date filter on tracking views',
    status: needsDateFilter ? (dateOk ? 'pass' : 'warn') : 'na',
    detail: needsDateFilter && !dateOk ? 'Enable “Limit past 30 days” or add EventDate filter' : undefined,
  });

  const needsTestFilter = selectionIncludesSent(selectedTableNames);
  const testOk =
    preferences.excludeTestSends || sqlExcludesTestSends(sql) || !needsTestFilter;
  items.push({
    id: 'test-sends',
    label: 'Test sends excluded',
    status: needsTestFilter ? (testOk ? 'pass' : 'warn') : 'na',
    detail:
      needsTestFilter && !testOk
        ? 'Enable “Exclude test sends” or join _Job and filter Category != \'Test Send Emails\''
        : undefined,
  });

  const hasSent = selectedTableNames.includes('_Sent');
  const hasOpen = selectedTableNames.includes('_Open');
  const hasClick = selectedTableNames.includes('_Click');
  const needsFourKey =
    (hasSent && hasOpen) || (hasSent && hasClick) || (hasOpen && hasClick);

  if (needsFourKey) {
    const fourKeyOk =
      (hasSent && hasOpen && joinUsesFourKeys(sql, 's', '_Open')) ||
      (hasSent && hasClick && joinUsesFourKeys(sql, 's', '_Click')) ||
      sql.includes('ListID') && sql.includes('BatchID') && sql.includes('SubscriberID');
    items.push({
      id: 'four-key',
      label: 'Engagement joins use four keys',
      status: fourKeyOk ? 'pass' : 'warn',
      detail: fourKeyOk
        ? undefined
        : 'Include JobID, ListID, BatchID, and SubscriberID together',
    });
  } else {
    items.push({
      id: 'four-key',
      label: 'Engagement joins use four keys',
      status: 'na',
    });
  }

  if (!sql.trim()) {
    items.push({
      id: 'sql-present',
      label: 'SQL is ready to copy',
      status: 'fail',
      detail: 'Query is empty',
    });
  }

  if (sqlHasOrderByWithoutTop(sql)) {
    items.push({
      id: 'order-by-top',
      label: 'ORDER BY uses SELECT TOP',
      status: 'warn',
      detail: 'Query Studio requires SELECT TOP N when using ORDER BY (e.g. SELECT TOP 200)',
    });
  }

  return items;
}

export function copyValidationSummary(items: CopyValidationItem[]): {
  hasFail: boolean;
  hasWarn: boolean;
  allPass: boolean;
} {
  const actionable = items.filter((item) => item.status !== 'na');
  return {
    hasFail: actionable.some((item) => item.status === 'fail'),
    hasWarn: actionable.some((item) => item.status === 'warn'),
    allPass: actionable.length > 0 && actionable.every((item) => item.status === 'pass'),
  };
}

export { ENGAGEMENT_KEYS };
