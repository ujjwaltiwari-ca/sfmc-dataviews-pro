import { sendLogDataViews } from '../data/schemas/sendLog.js';
import { synchronizedDeDataViews } from '../data/schemas/synchronizedDe.js';
import { sfmcDataViews } from '../data/schemas/index.js';
import type { DataViewField, DataViewTable } from '../data/schemas/types.js';
import { dedupeTablesByName } from '../data/viewSegments.js';
import type { ViewSegmentId } from '../data/viewSegments.js';

/** Mirrors `WORKSPACE_URL_KEYS` in workspacePersistence (kept local for build-time SEO scripts). */
const DEEP_LINK_QUERY_KEYS = {
  segment: 'seg',
  tables: 't',
  sandboxOpen: 'sb',
} as const;

export const SITE_ORIGIN = 'https://dataviews.pro';

/** All schema tables exposed as crawlable reference pages. */
export function getSeoSchemaTables(): DataViewTable[] {
  return dedupeTablesByName([
    ...sfmcDataViews,
    ...sendLogDataViews,
    ...synchronizedDeDataViews,
  ]);
}

/** URL slug for `/views/{slug}/` (e.g. `_Subscribers` → `subscribers`). */
export function tableNameToSlug(tableName: string): string {
  const base = tableName.startsWith('_') ? tableName.slice(1) : tableName;
  return base.toLowerCase().replace(/_/g, '-');
}

export function resolveTableBySlug(
  slug: string,
  tables: DataViewTable[] = getSeoSchemaTables(),
): DataViewTable | undefined {
  return tables.find((table) => tableNameToSlug(table.name) === slug);
}

export function viewPagePath(slug: string): string {
  return `/views/${slug}/`;
}

export function viewPageUrl(slug: string): string {
  return `${SITE_ORIGIN}${viewPagePath(slug)}`;
}

export function segmentForTable(tableName: string): ViewSegmentId {
  if (sendLogDataViews.some((table) => table.name === tableName)) {
    return 'sendlog';
  }
  if (synchronizedDeDataViews.some((table) => table.name === tableName)) {
    return 'synchronized';
  }
  return 'core';
}

/** Deep link into the interactive app without conflicting with existing query params. */
export function buildArchitectDeepLink(
  tableName: string,
  options?: { openSandbox?: boolean },
): string {
  const segment = segmentForTable(tableName);
  const params = new URLSearchParams();
  if (segment !== 'core') {
    params.set(DEEP_LINK_QUERY_KEYS.segment, segment);
  }
  params.set(DEEP_LINK_QUERY_KEYS.tables, tableName);
  if (options?.openSandbox !== false) {
    params.set(DEEP_LINK_QUERY_KEYS.sandboxOpen, '1');
  }
  return `/?${params.toString()}`;
}

export function formatFieldType(field: DataViewField): string {
  if (field.length != null) {
    return `${field.type}(${field.length})`;
  }
  return field.type;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildPageTitle(table: DataViewTable): string {
  return `SFMC ${table.name} Data View Schema & Fields | DataViews.pro`;
}

export function buildMetaDescription(table: DataViewTable): string {
  const fieldCount = table.fields.length;
  const pkNames = table.fields
    .filter((field) => field.isPrimaryKey)
    .map((field) => field.name)
    .join(', ');
  const pkPart = pkNames ? ` Primary keys: ${pkNames}.` : '';
  const trimmed = table.description.trim();
  const base = trimmed.length > 120 ? `${trimmed.slice(0, 117)}…` : trimmed;
  return `${base} Browse ${fieldCount} fields, types, and join paths for ${table.name} in Salesforce Marketing Cloud.${pkPart}`;
}

const EXAMPLE_COLUMN_PRIORITY = [
  'JobID',
  'SubscriberKey',
  'SubscriberID',
  'EventDate',
  'EmailAddress',
  'ListID',
  'BatchID',
  'Id',
] as const;

/** Date fields commonly used for SFMC performance filters (first match wins). */
const EXAMPLE_DATE_FILTER_FIELDS = [
  'EventDate',
  'CreatedDate',
  'LastModifiedDate',
  'LogDate',
  'SchedTime',
  'DateJoined',
  'OpenDate',
  'ActionDateTime',
] as const;

function pickExampleColumns(table: DataViewTable): string[] {
  const available = new Set(table.fields.map((field) => field.name));
  const picked: string[] = [];

  for (const name of EXAMPLE_COLUMN_PRIORITY) {
    if (available.has(name)) {
      picked.push(name);
    }
    if (picked.length >= 6) {
      return picked;
    }
  }

  for (const field of table.fields) {
    if (picked.length >= 6) {
      break;
    }
    if (!picked.includes(field.name)) {
      picked.push(field.name);
    }
  }

  return picked;
}

function findExampleDateFilterField(table: DataViewTable): string | null {
  for (const candidate of EXAMPLE_DATE_FILTER_FIELDS) {
    const field = table.fields.find((entry) => entry.name === candidate);
    if (field?.type === 'Date') {
      return candidate;
    }
  }
  return null;
}

/**
 * Illustrative Query Studio / Automation Studio SQL.
 * GROUP BY is not required for row-level SELECTs; ORDER BY is optional but
 * paired with TOP when a date column exists (SFMC best practice).
 */
export function buildExampleSelectSql(table: DataViewTable): string {
  const columns = pickExampleColumns(table);
  const dateField = findExampleDateFilterField(table);
  const lines = [
    'SELECT TOP 100',
    `  ${columns.join(', ')}`,
    `FROM ${table.name}`,
  ];

  if (dateField) {
    lines.push(`WHERE ${dateField} >= DATEADD(day, -30, GETDATE())`);
    lines.push(`ORDER BY ${dateField} DESC`);
  }

  return lines.join('\n');
}
